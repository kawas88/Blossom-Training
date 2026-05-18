'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { roleAtLeast, type Workspace, type WorkspaceRole } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const FOCUS_OPTIONS = [
  'Early childhood / Nursery',
  'Education / Teaching',
  'Corporate / Professional',
  'Healthcare',
  'Wellbeing / Coaching',
  'Other',
]

export function GeneralTab({
  workspace,
  role,
}: {
  workspace: Workspace
  role: WorkspaceRole
}) {
  const router = useRouter()
  const canEdit = roleAtLeast(role, 'admin')
  const canDelete = role === 'owner'

  const [name, setName] = useState(workspace.name)
  const [focus, setFocus] = useState<string[]>(workspace.training_focus ?? [])
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [confirmName, setConfirmName] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/workspace/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          name: name.trim(),
          training_focus: focus,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setSuccess('Saved')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function deleteWorkspace() {
    if (confirmName !== workspace.name || deleting) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not delete workspace')
      }
      router.push('/admin')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-5">
        <Input
          label="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          disabled={!canEdit}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Workspace slug
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-cream border border-ink/15 px-3 py-2 font-mono text-sm text-ink/70">
              {workspace.slug}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(workspace.slug)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-ink/15 px-3 py-2 text-xs text-ink/70 hover:bg-sand/40"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Training focus
          </label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((opt) => {
              const selected = focus.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    setFocus((f) =>
                      selected ? f.filter((x) => x !== opt) : [...f, opt],
                    )
                  }
                  className={
                    'rounded-full px-3 py-1.5 text-sm font-medium border transition-all ' +
                    (selected
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-cream text-ink border-ink/15 hover:bg-sand/40 disabled:opacity-60')
                  }
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-ink/50">
          Created {formatDate(workspace.created_at)}
        </p>

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-2.5 text-sm text-success">
            {success}
          </div>
        )}

        {canEdit && (
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </div>

      {canDelete && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 space-y-3">
          <div>
            <h3 className="font-serif text-xl tracking-tightish text-error">
              Danger zone
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              Delete this workspace and everything inside it. This cannot be undone.
            </p>
          </div>
          {!showDelete ? (
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete workspace
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                label={`Type "${workspace.name}" to confirm`}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={deleteWorkspace}
                  disabled={confirmName !== workspace.name || deleting}
                >
                  {deleting ? 'Deleting…' : 'I understand — delete it'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDelete(false)
                    setConfirmName('')
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
