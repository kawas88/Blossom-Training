'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
  IcebreakerFormat,
  PromptAnswerType,
} from '@/lib/types'

type Props = {
  initial?: {
    icebreaker: Icebreaker
    categories: IcebreakerCategory[]
    items: IcebreakerItem[]
    prompts: IcebreakerPrompt[]
  } | null
}

type LocalCategory = {
  key: string
  id?: string
  label: string
}
type LocalItem = {
  key: string
  id?: string
  text: string
  correct_category_key: string
  tag_label: string
  tag_color: string
}
type LocalPrompt = {
  key: string
  id?: string
  prompt: string
  answer_type: PromptAnswerType
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function IcebreakerForm({ initial }: Props) {
  const router = useRouter()
  const editing = !!initial
  const [title, setTitle] = useState(initial?.icebreaker.title || '')
  const [format, setFormat] = useState<IcebreakerFormat>(initial?.icebreaker.format || 'matching')
  const [instructions, setInstructions] = useState(initial?.icebreaker.instructions || '')
  const [showWall, setShowWall] = useState(initial?.icebreaker.show_live_wall ?? true)

  const initialCategories: LocalCategory[] =
    initial?.categories.map((c) => ({ key: c.id, id: c.id, label: c.label })) ?? [
      { key: uid(), label: 'Group A' },
      { key: uid(), label: 'Group B' },
    ]

  const idToKey = new Map<string, string>()
  initialCategories.forEach((c) => {
    if (c.id) idToKey.set(c.id, c.key)
  })

  const initialItems: LocalItem[] =
    initial?.items.map((i) => ({
      key: i.id,
      id: i.id,
      text: i.text,
      correct_category_key: i.correct_category_id
        ? idToKey.get(i.correct_category_id) || ''
        : '',
      tag_label: i.tag_label || '',
      tag_color: i.tag_color || '#1D6E52',
    })) ?? []

  const initialPrompts: LocalPrompt[] =
    initial?.prompts.map((p) => ({
      key: p.id,
      id: p.id,
      prompt: p.prompt,
      answer_type: p.answer_type,
    })) ?? []

  const [categories, setCategories] = useState<LocalCategory[]>(initialCategories)
  const [items, setItems] = useState<LocalItem[]>(initialItems)
  const [prompts, setPrompts] = useState<LocalPrompt[]>(initialPrompts)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // Build payload
      const keyToIndex = new Map<string, number>()
      categories.forEach((c, i) => keyToIndex.set(c.key, i))

      const payload = {
        title,
        format,
        instructions: instructions || null,
        show_live_wall: showWall,
        categories:
          format === 'matching'
            ? categories.map((c, i) => ({
                position: i,
                label: c.label,
                key: c.key,
              }))
            : [],
        items:
          format === 'matching'
            ? items.map((it, i) => ({
                position: i,
                text: it.text,
                correct_category_key: it.correct_category_key,
                tag_label: it.tag_label || null,
                tag_color: it.tag_color || null,
              }))
            : [],
        prompts:
          format === 'prompts'
            ? prompts.map((p, i) => ({
                position: i,
                prompt: p.prompt,
                answer_type: p.answer_type,
              }))
            : [],
      }

      const url = editing ? `/api/admin/icebreakers/${initial!.icebreaker.id}` : '/api/admin/icebreakers'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      router.push('/admin/icebreakers')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function deleteIcebreaker() {
    if (!editing) return
    const ok = confirm('Delete this icebreaker? This cannot be undone.')
    if (!ok) return
    const res = await fetch(`/api/admin/icebreakers/${initial!.icebreaker.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      router.push('/admin/icebreakers')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Could not delete')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-5">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid sm:grid-cols-2 gap-5">
          <Select
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as IcebreakerFormat)}
          >
            <option value="matching">Matching (drag-to-place)</option>
            <option value="prompts">Prompts (open answers)</option>
          </Select>
          <label className="flex items-center gap-3 mt-7">
            <input
              type="checkbox"
              checked={showWall}
              onChange={(e) => setShowWall(e.target.checked)}
              className="h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
            />
            <span className="text-sm text-ink">Show live wall to participants</span>
          </label>
        </div>
        <Textarea
          label="Instructions"
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      {format === 'matching' && (
        <>
          <div className="rounded-2xl bg-white border border-ink/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg tracking-tightish text-ink">Categories</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCategories([...categories, { key: uid(), label: 'New group' }])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <ul className="space-y-2">
              {categories.map((c, i) => (
                <li key={c.key} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink/40 w-6">{i + 1}.</span>
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) =>
                      setCategories(
                        categories.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCategories(categories.filter((x) => x.key !== c.key))
                    }
                    className="p-1.5 text-ink/40 hover:text-error"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white border border-ink/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg tracking-tightish text-ink">Milestone items</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      key: uid(),
                      text: '',
                      correct_category_key: categories[0]?.key || '',
                      tag_label: '',
                      tag_color: '#1D6E52',
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </div>
            <ul className="space-y-3">
              {items.map((it, i) => (
                <li
                  key={it.key}
                  className="rounded-xl border border-ink/10 p-3 grid gap-2 md:grid-cols-[2fr_1.2fr_1fr_60px_36px]"
                >
                  <input
                    type="text"
                    placeholder="Milestone text"
                    value={it.text}
                    onChange={(e) =>
                      setItems(items.map((x) => (x.key === it.key ? { ...x, text: e.target.value } : x)))
                    }
                    className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                  />
                  <select
                    value={it.correct_category_key}
                    onChange={(e) =>
                      setItems(
                        items.map((x) =>
                          x.key === it.key ? { ...x, correct_category_key: e.target.value } : x,
                        ),
                      )
                    }
                    className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                  >
                    <option value="">Correct group…</option>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Tag (e.g. Communication)"
                    value={it.tag_label}
                    onChange={(e) =>
                      setItems(items.map((x) => (x.key === it.key ? { ...x, tag_label: e.target.value } : x)))
                    }
                    className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                  />
                  <input
                    type="color"
                    value={it.tag_color}
                    onChange={(e) =>
                      setItems(items.map((x) => (x.key === it.key ? { ...x, tag_color: e.target.value } : x)))
                    }
                    className="h-9 w-full rounded-lg border border-ink/15 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((x) => x.key !== it.key))}
                    className="p-1.5 text-ink/40 hover:text-error self-center justify-self-center"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-ink/60">No items yet — add one above.</li>
              )}
            </ul>
          </div>
        </>
      )}

      {format === 'prompts' && (
        <div className="rounded-2xl bg-white border border-ink/10 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg tracking-tightish text-ink">Prompts</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setPrompts([
                  ...prompts,
                  { key: uid(), prompt: '', answer_type: 'short_text' },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add prompt
            </Button>
          </div>
          <ul className="space-y-3">
            {prompts.map((p, i) => (
              <li
                key={p.key}
                className="rounded-xl border border-ink/10 p-3 grid gap-2 md:grid-cols-[3fr_1.2fr_36px]"
              >
                <input
                  type="text"
                  placeholder="Prompt text"
                  value={p.prompt}
                  onChange={(e) =>
                    setPrompts(prompts.map((x) => (x.key === p.key ? { ...x, prompt: e.target.value } : x)))
                  }
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                />
                <select
                  value={p.answer_type}
                  onChange={(e) =>
                    setPrompts(
                      prompts.map((x) =>
                        x.key === p.key
                          ? { ...x, answer_type: e.target.value as PromptAnswerType }
                          : x,
                      ),
                    )
                  }
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                >
                  <option value="short_text">Short text</option>
                  <option value="long_text">Long text</option>
                  <option value="word">Single word</option>
                </select>
                <button
                  type="button"
                  onClick={() => setPrompts(prompts.filter((x) => x.key !== p.key))}
                  className="p-1.5 text-ink/40 hover:text-error self-center justify-self-center"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {prompts.length === 0 && (
              <li className="text-sm text-ink/60">No prompts yet — add one above.</li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create icebreaker'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/icebreakers')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
        {editing && (
          <Button type="button" variant="danger" onClick={deleteIcebreaker} disabled={submitting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
