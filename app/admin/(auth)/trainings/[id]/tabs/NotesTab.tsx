'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StickyNote } from 'lucide-react'
import type {
  Training,
  Participant,
  IcebreakerItem,
  TrainerNote,
} from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Textarea, Select } from '@/components/ui/Input'
import { formatDateTime } from '@/lib/utils'

type Props = {
  training: Training
  participants: Participant[]
  items: IcebreakerItem[]
  notes: TrainerNote[]
}

export function NotesTab({ training, participants, items, notes }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [itemId, setItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantMap = new Map(participants.map((p) => [p.id, p]))
  const itemMap = new Map(items.map((i) => [i.id, i]))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/trainings/${training.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          participant_id: participantId || null,
          item_id: itemId || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not save note')
      }
      setBody('')
      setParticipantId('')
      setItemId('')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <form
        onSubmit={submit}
        className="rounded-2xl bg-white border border-ink/10 p-5 space-y-4 h-fit"
      >
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            New note
          </p>
          <h3 className="mt-1 font-serif text-lg tracking-tightish text-ink">
            Capture an observation
          </h3>
        </div>
        <Textarea
          label="Note"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A quick thought from the room…"
        />
        <div className="grid grid-cols-1 gap-3">
          <Select
            label="Link to participant (optional)"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
          >
            <option value="">— None —</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name || 'Anonymous'}
              </option>
            ))}
          </Select>
          {items.length > 0 && (
            <Select
              label="Link to icebreaker item (optional)"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">— None —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.text.length > 60 ? i.text.slice(0, 60) + '…' : i.text}
                </option>
              ))}
            </Select>
          )}
        </div>
        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
        <Button type="submit" disabled={submitting || !body.trim()}>
          {submitting ? 'Saving…' : 'Add note'}
        </Button>
      </form>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/40 p-10 text-center">
            <StickyNote className="h-8 w-8 mx-auto text-ink/30" strokeWidth={1.5} />
            <p className="mt-3 font-serif text-xl text-ink">No notes yet</p>
            <p className="mt-1 text-sm text-ink/60">
              Capture observations to share with the room or save for later.
            </p>
          </div>
        ) : (
          notes.map((n) => {
            const part = n.participant_id ? participantMap.get(n.participant_id) : null
            const item = n.item_id ? itemMap.get(n.item_id) : null
            return (
              <div key={n.id} className="rounded-2xl bg-white border border-ink/10 p-4">
                <div className="flex items-center gap-2 text-xs text-ink/50">
                  <span>{formatDateTime(n.created_at)}</span>
                  {part && (
                    <>
                      <span>·</span>
                      <span>{part.display_name || 'Anonymous'}</span>
                    </>
                  )}
                  {item && (
                    <>
                      <span>·</span>
                      <span className="truncate">
                        Item: {item.text.length > 40 ? item.text.slice(0, 40) + '…' : item.text}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink whitespace-pre-line">{n.body}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
