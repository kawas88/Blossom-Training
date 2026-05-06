'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import {
  QUESTION_TYPE_LABELS,
  type QuestionType,
  type Survey,
  type SurveyQuestion,
} from '@/lib/types'

type Props = {
  initial?: {
    survey: Survey
    questions: SurveyQuestion[]
  } | null
}

type LocalQuestion = {
  key: string
  id?: string
  question: string
  question_type: QuestionType
  options: string[] | null
  required: boolean
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function SurveyEditorForm({ initial }: Props) {
  const router = useRouter()
  const editing = !!initial
  const [title, setTitle] = useState(initial?.survey.title || '')
  const [description, setDescription] = useState(initial?.survey.description || '')
  const [questions, setQuestions] = useState<LocalQuestion[]>(
    initial?.questions.map((q) => ({
      key: q.id,
      id: q.id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      required: q.required,
    })) ?? [],
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateQuestion(key: string, patch: Partial<LocalQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        title,
        description: description || null,
        questions: questions.map((q, i) => ({
          position: i,
          question: q.question,
          question_type: q.question_type,
          options: q.question_type === 'multiple_choice' ? (q.options ?? []) : null,
          required: q.required,
        })),
      }
      const url = editing ? `/api/admin/surveys/${initial!.survey.id}` : '/api/admin/surveys'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      router.push('/admin/surveys')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function deleteSurvey() {
    if (!editing) return
    const ok = confirm('Delete this survey? This cannot be undone.')
    if (!ok) return
    const res = await fetch(`/api/admin/surveys/${initial!.survey.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/surveys')
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
        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg tracking-tightish text-ink">Questions</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setQuestions([
                ...questions,
                {
                  key: uid(),
                  question: '',
                  question_type: 'yes_no',
                  options: null,
                  required: true,
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add question
          </Button>
        </div>
        <ul className="space-y-3">
          {questions.map((q, i) => (
            <li key={q.key} className="rounded-xl border border-ink/10 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-ink/50 mt-2.5">
                  {String.fromCharCode(65 + i)}.
                </span>
                <input
                  type="text"
                  placeholder="Question text"
                  value={q.question}
                  onChange={(e) => updateQuestion(q.key, { question: e.target.value })}
                  className="flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                />
                <button
                  type="button"
                  onClick={() => setQuestions(questions.filter((x) => x.key !== q.key))}
                  className="p-1.5 text-ink/40 hover:text-error mt-1"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-[1.4fr_auto] gap-3 items-center pl-6">
                <select
                  value={q.question_type}
                  onChange={(e) =>
                    updateQuestion(q.key, {
                      question_type: e.target.value as QuestionType,
                      options:
                        e.target.value === 'multiple_choice'
                          ? q.options ?? ['Option 1', 'Option 2']
                          : null,
                    })
                  }
                  className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
                  />
                  Required
                </label>
              </div>
              {q.question_type === 'multiple_choice' && (
                <div className="pl-6">
                  <p className="text-xs text-ink/60 mb-1.5">Options</p>
                  <div className="space-y-2">
                    {(q.options ?? []).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...(q.options ?? [])]
                            next[idx] = e.target.value
                            updateQuestion(q.key, { options: next })
                          }}
                          className="flex-1 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (q.options ?? []).filter((_, j) => j !== idx)
                            updateQuestion(q.key, { options: next })
                          }}
                          className="p-1 text-ink/40 hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateQuestion(q.key, { options: [...(q.options ?? []), 'New option'] })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add option
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {questions.length === 0 && (
            <li className="text-sm text-ink/60">No questions yet — add one above.</li>
          )}
        </ul>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create survey'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/surveys')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
        {editing && (
          <Button type="button" variant="danger" onClick={deleteSurvey} disabled={submitting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
