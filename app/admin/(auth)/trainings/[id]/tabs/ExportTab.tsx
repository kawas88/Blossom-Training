'use client'

import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Training } from '@/lib/types'

type Props = {
  training: Training
}

export function ExportTab({ training }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 flex flex-col">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Raw data
        </p>
        <h3 className="mt-1 font-serif text-2xl tracking-tightish text-ink">
          CSV export
        </h3>
        <p className="mt-2 text-sm text-ink/70 flex-1">
          One row per response, ready to load into Sheets or Excel. Includes
          participant names, icebreaker placements, and survey answers.
        </p>
        <div className="mt-5">
          <a
            href={`/api/admin/trainings/${training.id}/export/csv`}
            download
          >
            <Button>
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="rounded-2xl bg-ink text-cream p-6 flex flex-col">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
          Branded report
        </p>
        <h3 className="mt-1 font-serif text-2xl tracking-tightish">
          PDF report
        </h3>
        <p className="mt-2 text-sm opacity-80 flex-1">
          A multi-page summary of this training — participation, icebreaker
          accuracy, survey breakdowns and an AI summary of the open-ended
          feedback.
        </p>
        <div className="mt-5">
          <a
            href={`/api/admin/trainings/${training.id}/export/pdf`}
            download
          >
            <Button variant="secondary" className="bg-cream text-ink">
              <FileText className="h-4 w-4" />
              Generate PDF
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
