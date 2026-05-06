import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { summarizeTraining } from '@/lib/ai'
import { formatDate, truncate } from '@/lib/utils'
import type { QuestionType, SurveyQuestion } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const INK: [number, number, number] = [15, 20, 25]
const SAGE: [number, number, number] = [29, 110, 82]
const MUTED: [number, number, number] = [100, 100, 100]
const CREAM: [number, number, number] = [250, 247, 242]

function staticOptionsFor(type: QuestionType, custom: string[] | null): string[] {
  switch (type) {
    case 'yes_no':
      return ['Yes', 'No']
    case 'yes_no_notreally':
      return ['Yes', 'No', 'Not really']
    case 'yes_no_sometimes':
      return ['Yes', 'No', 'Sometimes']
    case 'rating_5':
      return ['1', '2', '3', '4', '5']
    case 'rating_10':
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    case 'multiple_choice':
      return custom ?? []
    default:
      return []
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const [
      { data: training },
      { data: participants },
      { data: matching },
      { data: surveyResp },
      { data: items },
      { data: cats },
      { data: questions },
      { data: icebreaker },
    ] = await Promise.all([
      supabase.from('trainings').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('participants').select('*').eq('training_id', params.id),
      supabase.from('icebreaker_matching_responses').select('*').eq('training_id', params.id),
      supabase.from('survey_responses').select('*').eq('training_id', params.id),
      supabase.from('icebreaker_items').select('*'),
      supabase.from('icebreaker_categories').select('*'),
      supabase.from('survey_questions').select('*').order('position'),
      supabase.from('icebreakers').select('*'),
    ])

    if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const itemMap = new Map((items || []).map((i: { id: string; text: string; correct_category_id: string | null }) => [i.id, i]))
    const catMap = new Map((cats || []).map((c: { id: string; label: string }) => [c.id, c]))

    // Per-item stats
    const trainingIcebreakerId = training.icebreaker_id
    const trainingItems = (items || []).filter(
      (i: { icebreaker_id: string }) => i.icebreaker_id === trainingIcebreakerId,
    )
    const perItem = trainingItems.map((item) => {
      const r4item = (matching || []).filter((r) => r.item_id === item.id)
      const total = r4item.length
      const correctFirst = r4item.filter((r) => r.first_attempt_category_id === item.correct_category_id).length
      const accuracy = total === 0 ? 0 : Math.round((correctFirst / total) * 100)
      const wrong = new Map<string, number>()
      for (const r of r4item) {
        if (r.first_attempt_category_id && r.first_attempt_category_id !== item.correct_category_id) {
          wrong.set(r.first_attempt_category_id, (wrong.get(r.first_attempt_category_id) || 0) + 1)
        }
      }
      let topWrong: { id: string; count: number } | null = null
      for (const [k, v] of wrong) {
        if (!topWrong || v > topWrong.count) topWrong = { id: k, count: v }
      }
      return { item, total, correctFirst, accuracy, topWrong }
    })

    const trainingQuestions = (questions || []).filter(
      (q: SurveyQuestion) => q.survey_id === training.survey_id,
    )

    // Compute survey highlights for AI
    const surveyHighlights: { question: string; topAnswer: string; count: number; total: number }[] = []
    const longTextAnswers: { question: string; answers: string[] }[] = []
    for (const q of trainingQuestions as SurveyQuestion[]) {
      const rs = (surveyResp || []).filter(
        (r) => r.question_id === q.id && (r.answer ?? '').toString().trim().length > 0,
      )
      const total = rs.length
      if (total === 0) continue
      if (q.question_type === 'long_text') {
        longTextAnswers.push({
          question: q.question,
          answers: rs.map((r) => r.answer || ''),
        })
      } else if (q.question_type !== 'short_text') {
        const counts = new Map<string, number>()
        for (const r of rs) {
          const a = (r.answer || '').trim()
          if (a) counts.set(a, (counts.get(a) || 0) + 1)
        }
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
        if (top) {
          surveyHighlights.push({
            question: q.question,
            topAnswer: top[0],
            count: top[1],
            total,
          })
        }
      }
    }

    const iceCompleted = (participants || []).filter((p) => !!p.icebreaker_completed_at).length
    const surveyCompleted = (participants || []).filter((p) => !!p.survey_completed_at).length

    // AI summary (best-effort)
    let aiSummary: { summary: string; takeaways: string[] } | null = null
    try {
      const topMistakes = perItem
        .filter((r) => r.topWrong)
        .slice(0, 5)
        .map((r) => ({
          item: (r.item as { text: string }).text,
          correct: (catMap.get((r.item as { correct_category_id: string }).correct_category_id) as { label: string } | undefined)?.label || '',
          wrong: (catMap.get(r.topWrong!.id) as { label: string } | undefined)?.label || '',
          count: r.topWrong!.count,
        }))
      aiSummary = await summarizeTraining({
        trainingTitle: training.title,
        participantCount: (participants || []).length,
        iceCompleted,
        surveyCompleted,
        topMistakes,
        surveyHighlights,
        longTextAnswers,
      })
    } catch (e) {
      console.warn('AI summary failed; continuing without', e)
    }

    // ---------- Build PDF ----------
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 48

    // Cover page
    doc.setFillColor(...CREAM)
    doc.rect(0, 0, pageW, pageH, 'F')

    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('NURSERY TRAINER HUB', margin, margin + 10)

    doc.setTextColor(...INK)
    doc.setFont('times', 'normal')
    doc.setFontSize(34)
    const titleLines = doc.splitTextToSize(training.title, pageW - margin * 2)
    doc.text(titleLines, margin, margin + 80)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    const subtitle = [training.nursery_name, training.trainer_name].filter(Boolean).join(' · ')
    if (subtitle) doc.text(subtitle, margin, margin + 80 + titleLines.length * 36 + 12)

    // Stat strip
    const statY = pageH - margin - 200
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, statY - 20, pageW - margin, statY - 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('PARTICIPANTS', margin, statY)
    doc.text('ICEBREAKER DONE', margin + 160, statY)
    doc.text('SURVEY DONE', margin + 320, statY)

    doc.setFont('times', 'normal')
    doc.setFontSize(28)
    doc.setTextColor(...INK)
    doc.text(String((participants || []).length), margin, statY + 32)
    doc.text(String(iceCompleted), margin + 160, statY + 32)
    doc.text(String(surveyCompleted), margin + 320, statY + 32)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(`Generated ${formatDate(new Date())}`, margin, pageH - margin)
    doc.text(`Code: ${training.join_code}`, pageW - margin, pageH - margin, { align: 'right' })

    // ---- Page 2: Participation ----
    doc.addPage()
    drawHeader(doc, 'Participation', margin)
    autoTable(doc, {
      startY: margin + 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total joined', String((participants || []).length)],
        ['Completed icebreaker', `${iceCompleted}`],
        ['Completed survey', `${surveyCompleted}`],
        [
          'Anonymous participants',
          String((participants || []).filter((p) => !p.display_name).length),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: INK, textColor: CREAM, font: 'helvetica' },
      bodyStyles: { font: 'helvetica', fontSize: 10, textColor: INK },
      margin: { left: margin, right: margin },
    })

    // ---- Page 3: Icebreaker results ----
    if (icebreaker && perItem.length > 0) {
      doc.addPage()
      drawHeader(doc, 'Icebreaker results', margin)

      const rows = perItem
        .sort((a, b) => a.accuracy - b.accuracy)
        .map((r) => [
          truncate((r.item as { text: string }).text, 70),
          r.total === 0 ? '—' : `${r.accuracy}%`,
          r.topWrong
            ? `${(catMap.get(r.topWrong.id) as { label: string } | undefined)?.label || ''} (×${r.topWrong.count})`
            : '—',
        ])
      autoTable(doc, {
        startY: margin + 50,
        head: [['Milestone', 'First-try accuracy', 'Most-common wrong']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: SAGE, textColor: CREAM, font: 'helvetica' },
        bodyStyles: { font: 'helvetica', fontSize: 9, textColor: INK },
        alternateRowStyles: { fillColor: [248, 245, 240] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 280 },
          1: { cellWidth: 100, halign: 'right' },
        },
      })
    }

    // ---- Survey results pages ----
    for (const q of trainingQuestions as SurveyQuestion[]) {
      const rs = (surveyResp || []).filter(
        (r) => r.question_id === q.id && (r.answer ?? '').toString().trim().length > 0,
      )
      if (rs.length === 0) continue

      doc.addPage()
      drawHeader(doc, 'Survey response', margin)
      doc.setFont('times', 'normal')
      doc.setFontSize(16)
      doc.setTextColor(...INK)
      const qLines = doc.splitTextToSize(q.question, pageW - margin * 2)
      doc.text(qLines, margin, margin + 80)

      const startY = margin + 80 + qLines.length * 18 + 10

      if (q.question_type === 'short_text' || q.question_type === 'long_text') {
        autoTable(doc, {
          startY,
          head: [['Answer']],
          body: rs.map((r) => [r.answer || '']),
          theme: 'plain',
          headStyles: { fillColor: SAGE, textColor: CREAM, font: 'helvetica' },
          bodyStyles: { font: 'helvetica', fontSize: 10, textColor: INK },
          margin: { left: margin, right: margin },
        })
      } else {
        const opts = staticOptionsFor(q.question_type, q.options)
        const counts = new Map<string, number>()
        for (const r of rs) {
          const a = (r.answer || '').trim()
          if (a) counts.set(a, (counts.get(a) || 0) + 1)
        }
        const total = rs.length
        const body = opts.map((o) => {
          const c = counts.get(o) || 0
          const pct = total === 0 ? 0 : Math.round((c / total) * 100)
          return [o, String(c), `${pct}%`]
        })
        autoTable(doc, {
          startY,
          head: [['Option', 'Responses', 'Share']],
          body,
          theme: 'grid',
          headStyles: { fillColor: SAGE, textColor: CREAM, font: 'helvetica' },
          bodyStyles: { font: 'helvetica', fontSize: 10, textColor: INK },
          margin: { left: margin, right: margin },
          columnStyles: {
            1: { halign: 'right', cellWidth: 80 },
            2: { halign: 'right', cellWidth: 80 },
          },
        })
      }
    }

    // ---- Final page: AI summary ----
    if (aiSummary) {
      doc.addPage()
      drawHeader(doc, 'Summary', margin)
      doc.setFont('times', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(...INK)
      const summaryLines = doc.splitTextToSize(aiSummary.summary || '', pageW - margin * 2)
      doc.text(summaryLines, margin, margin + 80)

      let y = margin + 80 + summaryLines.length * 16 + 20
      if (aiSummary.takeaways.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...SAGE)
        doc.text('KEY TAKEAWAYS', margin, y)
        y += 16
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(...INK)
        for (const t of aiSummary.takeaways) {
          const lines = doc.splitTextToSize(`• ${t}`, pageW - margin * 2)
          doc.text(lines, margin, y)
          y += lines.length * 14 + 4
          if (y > pageH - margin - 40) {
            doc.addPage()
            drawHeader(doc, 'Summary (cont.)', margin)
            y = margin + 60
          }
        }
      }
    }

    // ---- Footers ----
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(
        `Nursery Trainer Hub · Page ${i} of ${pageCount}`,
        pageW / 2,
        pageH - 20,
        { align: 'center' },
      )
    }

    const ab = doc.output('arraybuffer')
    const filename = `${training.slug || 'training'}-report.pdf`
    return new NextResponse(Buffer.from(ab), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    console.error('pdf export error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function drawHeader(doc: jsPDF, title: string, margin: number) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('NURSERY TRAINER HUB', margin, margin)
  doc.setFont('times', 'normal')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text(title, margin, margin + 30)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, margin + 42, pageW - margin, margin + 42)
}
