'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AgeGroup, MatchingConfig, Milestone } from '@/lib/exercises'

type Props = {
  config: MatchingConfig
  onChange: (next: MatchingConfig) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 12)
}

export function MatchingConfigEditor({ config, onChange }: Props) {
  const ageGroups: AgeGroup[] = config.ageGroups ?? []
  const milestones: Milestone[] = config.milestones ?? []
  const correctPlacements: Record<string, string> = config.correctPlacements ?? {}

  function setAgeGroups(next: AgeGroup[]) {
    onChange({ ...config, ageGroups: next })
  }

  function setMilestones(next: Milestone[]) {
    onChange({ ...config, milestones: next })
  }

  function setCorrect(milestoneId: string, ageGroupId: string) {
    onChange({
      ...config,
      correctPlacements: { ...correctPlacements, [milestoneId]: ageGroupId },
    })
  }

  function addAgeGroup() {
    setAgeGroups([
      ...ageGroups,
      { id: uid(), label: 'New group', position: ageGroups.length },
    ])
  }

  function updateAgeGroup(id: string, label: string) {
    setAgeGroups(
      ageGroups.map((g) => (g.id === id ? { ...g, label } : g)),
    )
  }

  function removeAgeGroup(id: string) {
    setAgeGroups(ageGroups.filter((g) => g.id !== id))
    // Clear correctPlacements pointing at the removed group.
    const next: Record<string, string> = {}
    for (const [mid, gid] of Object.entries(correctPlacements)) {
      if (gid !== id) next[mid] = gid
    }
    onChange({
      ...config,
      ageGroups: ageGroups.filter((g) => g.id !== id),
      correctPlacements: next,
    })
  }

  function addMilestone() {
    setMilestones([
      ...milestones,
      {
        id: uid(),
        text: '',
        tagLabel: '',
        tagColor: '#1D6E52',
        position: milestones.length,
      },
    ])
  }

  function updateMilestone(id: string, patch: Partial<Milestone>) {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function removeMilestone(id: string) {
    const nextMilestones = milestones.filter((m) => m.id !== id)
    const nextPlacements: Record<string, string> = {}
    for (const [mid, gid] of Object.entries(correctPlacements)) {
      if (mid !== id) nextPlacements[mid] = gid
    }
    onChange({
      ...config,
      milestones: nextMilestones,
      correctPlacements: nextPlacements,
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Age groups
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={addAgeGroup}>
            <Plus className="h-3.5 w-3.5" />
            Add group
          </Button>
        </div>
        {ageGroups.length === 0 ? (
          <p className="text-sm text-ink/60">No groups yet — add one to start.</p>
        ) : (
          <ul className="space-y-2">
            {ageGroups.map((g, i) => (
              <li key={g.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink/40 w-6">{i + 1}.</span>
                <input
                  type="text"
                  value={g.label}
                  onChange={(e) => updateAgeGroup(g.id, e.target.value)}
                  className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                />
                <button
                  type="button"
                  onClick={() => removeAgeGroup(g.id)}
                  className="p-1.5 text-ink/40 hover:text-error"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Milestone items
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addMilestone}
            disabled={ageGroups.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </Button>
        </div>
        {milestones.length === 0 ? (
          <p className="text-sm text-ink/60">
            {ageGroups.length === 0
              ? 'Add an age group first, then create milestones to place into it.'
              : 'No milestones yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {milestones.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-ink/10 p-3 grid gap-2 md:grid-cols-[2fr_1.2fr_1fr_60px_36px]"
              >
                <input
                  type="text"
                  placeholder="Milestone text"
                  value={m.text}
                  onChange={(e) => updateMilestone(m.id, { text: e.target.value })}
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                />
                <select
                  value={correctPlacements[m.id] || ''}
                  onChange={(e) => setCorrect(m.id, e.target.value)}
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                >
                  <option value="">Correct group…</option>
                  {ageGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Tag (e.g. Communication)"
                  value={m.tagLabel ?? ''}
                  onChange={(e) =>
                    updateMilestone(m.id, { tagLabel: e.target.value || null })
                  }
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                />
                <input
                  type="color"
                  value={m.tagColor ?? '#1D6E52'}
                  onChange={(e) =>
                    updateMilestone(m.id, { tagColor: e.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-ink/15 bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  className="p-1.5 text-ink/40 hover:text-error self-center justify-self-center"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
