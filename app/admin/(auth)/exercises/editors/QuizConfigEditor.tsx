'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { QuizConfig, QuizQuestion } from '@/lib/exercises'

type Props = {
  config: QuizConfig
  onChange: (next: QuizConfig) => void
}

function uid() {
  return 'q_' + Math.random().toString(36).slice(2, 10)
}

export function QuizConfigEditor({ config, onChange }: Props) {
  const questions = config.questions ?? []

  function setQuestions(next: QuizQuestion[]) {
    onChange({ ...config, questions: next })
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      { id: uid(), prompt: '', options: ['', ''], correctIndex: 0 },
    ])
  }

  function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  function removeQuestion(id: string) {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  function addOption(qid: string) {
    const q = questions.find((x) => x.id === qid)
    if (!q || q.options.length >= 6) return
    updateQuestion(qid, { options: [...q.options, ''] })
  }

  function updateOption(qid: string, idx: number, value: string) {
    const q = questions.find((x) => x.id === qid)
    if (!q) return
    const next = [...q.options]
    next[idx] = value
    updateQuestion(qid, { options: next })
  }

  function removeOption(qid: string, idx: number) {
    const q = questions.find((x) => x.id === qid)
    if (!q || q.options.length <= 2) return
    const nextOptions = q.options.filter((_, i) => i !== idx)
    const nextCorrect =
      q.correctIndex === idx
        ? 0
        : q.correctIndex > idx
        ? q.correctIndex - 1
        : q.correctIndex
    updateQuestion(qid, { options: nextOptions, correctIndex: nextCorrect })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4">
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          Quiz options
        </h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.shuffleQuestions}
            onChange={(e) =>
              onChange({ ...config, shuffleQuestions: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              Shuffle question order for each participant
            </span>
            <span className="block text-xs text-ink/60">
              Useful when the room can see each other&rsquo;s screens.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.showCorrectAfterEach}
            onChange={(e) =>
              onChange({ ...config, showCorrectAfterEach: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              Reveal the correct answer after each question
            </span>
            <span className="block text-xs text-ink/60">
              Turn off if you want to discuss answers as a group at the end.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Questions
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            <Plus className="h-3.5 w-3.5" />
            Add question
          </Button>
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-ink/60">
            No questions yet — add one to get started.
          </p>
        ) : (
          <ul className="space-y-4">
            {questions.map((q, qi) => (
              <li key={q.id} className="rounded-xl border border-ink/10 p-4">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs text-ink/50 mt-2.5">
                    {String.fromCharCode(65 + qi)}.
                  </span>
                  <Textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                    placeholder="Question prompt"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="p-1.5 text-ink/40 hover:text-error mt-1"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 pl-6 space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctIndex === oi}
                        onChange={() => updateQuestion(q.id, { correctIndex: oi })}
                        className="h-4 w-4 text-sage focus:ring-sage"
                        aria-label="Correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, oi)}
                          className="p-1 text-ink/40 hover:text-error"
                          aria-label="Remove option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addOption(q.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add option
                    </Button>
                  )}
                  <p className="text-xs text-ink/50">
                    Select the radio button next to the correct answer.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
