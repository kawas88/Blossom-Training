'use client'

import { Textarea, Input } from '@/components/ui/Input'
import type { ReflectionConfig } from '@/lib/exercises'

type Props = {
  config: ReflectionConfig
  onChange: (next: ReflectionConfig) => void
}

export function ReflectionConfigEditor({ config, onChange }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-5">
      <h3 className="font-serif text-lg tracking-tightish text-ink">
        Reflection prompt
      </h3>
      <Textarea
        label="Prompt"
        value={config.prompt}
        onChange={(e) => onChange({ ...config, prompt: e.target.value })}
        rows={3}
        placeholder="e.g. What was your biggest takeaway from today's session?"
        required
      />
      <Input
        label="Minimum response length (characters)"
        type="number"
        min={0}
        max={500}
        value={config.minLength}
        onChange={(e) =>
          onChange({
            ...config,
            minLength: Math.max(0, Math.min(500, Number(e.target.value) || 0)),
          })
        }
        hint="Participants can't submit until they reach this length. Set to 0 to allow any length."
      />
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.aiAnalysis}
          onChange={(e) =>
            onChange({ ...config, aiAnalysis: e.target.checked })
          }
          className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
        />
        <span>
          <span className="block text-sm font-medium text-ink">
            Run AI sentiment + theme analysis
          </span>
          <span className="block text-xs text-ink/60">
            We&rsquo;ll send each response through Claude to surface themes and
            tone. Results appear in your dashboard alongside the raw text.
          </span>
        </span>
      </label>
    </div>
  )
}
