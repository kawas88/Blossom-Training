'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { WordCloudConfig } from '@/lib/exercises'

type Props = {
  config: WordCloudConfig
  onChange: (next: WordCloudConfig) => void
}

export function WordCloudConfigEditor({ config, onChange }: Props) {
  const [stopWordDraft, setStopWordDraft] = useState('')

  function addStopWord() {
    const w = stopWordDraft.trim()
    if (!w) return
    const cased = config.caseSensitive ? w : w.toLowerCase()
    if (config.stopWords.includes(cased)) {
      setStopWordDraft('')
      return
    }
    onChange({ ...config, stopWords: [...config.stopWords, cased] })
    setStopWordDraft('')
  }

  function removeStopWord(word: string) {
    onChange({ ...config, stopWords: config.stopWords.filter((w) => w !== word) })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-5">
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          Word cloud prompt
        </h3>
        <Textarea
          label="Prompt"
          value={config.prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          maxLength={200}
          rows={3}
          placeholder="e.g. What's one word that describes today's session?"
          required
        />
        <Input
          label="Max characters per word"
          type="number"
          min={5}
          max={100}
          value={config.maxLength}
          onChange={(e) =>
            onChange({
              ...config,
              maxLength: Math.max(5, Math.min(100, Number(e.target.value) || 30)),
            })
          }
          hint="Keeps the cloud readable — longer entries get truncated."
        />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowMultiple}
            onChange={(e) =>
              onChange({ ...config, allowMultiple: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              Allow participants to submit multiple words
            </span>
            <span className="block text-xs text-ink/60">
              Letting people share a few quick words usually surfaces richer themes than a single word per person.
            </span>
          </span>
        </label>
        {config.allowMultiple && (
          <Input
            label="Maximum words per participant"
            type="number"
            min={1}
            max={10}
            value={config.maxWordsPerParticipant ?? 3}
            onChange={(e) =>
              onChange({
                ...config,
                maxWordsPerParticipant: Math.max(
                  1,
                  Math.min(10, Number(e.target.value) || 3),
                ),
              })
            }
            hint="Each participant can submit up to this many words across one or more turns."
          />
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.caseSensitive}
            onChange={(e) =>
              onChange({ ...config, caseSensitive: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">Case sensitive</span>
            <span className="block text-xs text-ink/60">
              Off by default — &ldquo;Joy&rdquo; and &ldquo;joy&rdquo; merge into one entry.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <h3 className="font-serif text-lg tracking-tightish text-ink">Stop words</h3>
        <p className="mt-1 text-sm text-ink/60">
          Words to ignore — common fillers like &ldquo;the&rdquo;, &ldquo;and&rdquo;, &ldquo;is&rdquo;.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {config.stopWords.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded-full bg-sand/60 px-3 py-1 text-xs text-ink"
            >
              {w}
              <button
                type="button"
                onClick={() => removeStopWord(w)}
                className="text-ink/40 hover:text-error"
                aria-label={`Remove ${w}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {config.stopWords.length === 0 && (
            <span className="text-xs text-ink/50">No stop words yet.</span>
          )}
        </div>
        <div className="mt-4 flex items-end gap-2">
          <Input
            label="Add a stop word"
            value={stopWordDraft}
            onChange={(e) => setStopWordDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addStopWord()
              }
            }}
            maxLength={40}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addStopWord}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
