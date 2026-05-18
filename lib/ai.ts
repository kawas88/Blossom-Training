import Anthropic from '@anthropic-ai/sdk'
import type { SentimentResult, TrainingSummaryResult } from './types'

const MODEL = 'claude-sonnet-4-5'

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey: key })
}

function stripFences(s: string): string {
  let t = s.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '')
    t = t.replace(/\s*```\s*$/i, '')
  }
  return t.trim()
}

const SENTIMENT_SYSTEM = `You are analyzing open-ended feedback that participants left after a training session. Your goal is to surface actionable themes for the trainer. Be honest, balanced, and specific. Use plain, warm language — no jargon. Always reply with valid JSON only — no markdown, no commentary.`

export async function analyzeSentiment(
  questionText: string,
  answers: string[],
): Promise<SentimentResult> {
  const client = getClient()
  const numbered = answers.map((a, i) => `${i + 1}. ${a}`).join('\n')
  const userPrompt = `Question: ${questionText}\n\nAnswers from educators (${answers.length} total):\n${numbered}\n\nReturn a JSON object with this exact shape:\n{\n  "sentiment": "positive" | "mixed" | "negative",\n  "summary": "2-3 sentence plain-English summary",\n  "themes": [{ "title": "Short theme name", "description": "1-2 sentences", "frequency": "common" | "some" | "few" }],\n  "notable_quotes": ["quote 1", "quote 2"],\n  "suggestions_for_trainer": ["actionable suggestion 1"]\n}\n\nReturn ONLY the JSON object — no markdown fences, no surrounding text.`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SENTIMENT_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const text = message.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
  const parsed = JSON.parse(stripFences(text)) as SentimentResult
  // Light validation/normalization
  return {
    sentiment: ['positive', 'mixed', 'negative'].includes(parsed.sentiment)
      ? parsed.sentiment
      : 'mixed',
    summary: parsed.summary || '',
    themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 6) : [],
    notable_quotes: Array.isArray(parsed.notable_quotes)
      ? parsed.notable_quotes.slice(0, 5)
      : [],
    suggestions_for_trainer: Array.isArray(parsed.suggestions_for_trainer)
      ? parsed.suggestions_for_trainer.slice(0, 6)
      : [],
  }
}

const SUMMARY_SYSTEM = `You are summarizing the results of a training session for a printed report. Be concise, warm, and honest — celebrate what's working, name what isn't, and suggest next steps. Reply with valid JSON only.`

export async function summarizeTraining(input: {
  trainingTitle: string
  participantCount: number
  iceCompleted: number
  surveyCompleted: number
  topMistakes: { item: string; correct: string; wrong: string; count: number }[]
  surveyHighlights: { question: string; topAnswer: string; count: number; total: number }[]
  longTextAnswers: { question: string; answers: string[] }[]
}): Promise<TrainingSummaryResult> {
  const client = getClient()
  const lines: string[] = []
  lines.push(`Training: ${input.trainingTitle}`)
  lines.push(`Participants: ${input.participantCount}`)
  lines.push(`Icebreaker completed: ${input.iceCompleted}`)
  lines.push(`Survey completed: ${input.surveyCompleted}`)
  if (input.topMistakes.length > 0) {
    lines.push('\nMost-confused milestones (correct → most-common wrong):')
    for (const m of input.topMistakes) {
      lines.push(`- "${m.item}" — correct: ${m.correct}; ${m.count} chose ${m.wrong}`)
    }
  }
  if (input.surveyHighlights.length > 0) {
    lines.push('\nSurvey highlights:')
    for (const h of input.surveyHighlights) {
      lines.push(`- "${h.question}" — top: ${h.topAnswer} (${h.count}/${h.total})`)
    }
  }
  if (input.longTextAnswers.length > 0) {
    lines.push('\nLong-form answers:')
    for (const block of input.longTextAnswers) {
      lines.push(`Question: ${block.question}`)
      block.answers.slice(0, 30).forEach((a, i) => lines.push(`  ${i + 1}. ${a}`))
    }
  }

  const userPrompt = `${lines.join('\n')}\n\nReturn JSON: { "summary": "one paragraph", "takeaways": ["takeaway 1", "takeaway 2", ...] }`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const text = message.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
  const parsed = JSON.parse(stripFences(text)) as TrainingSummaryResult
  return {
    summary: parsed.summary || '',
    takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways.slice(0, 6) : [],
  }
}
