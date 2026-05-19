'use client'

import { useMemo } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import type {
  ScenarioChoice,
  ScenarioConfig,
  ScenarioNode,
  ScenarioNodeType,
  ScenarioOutcome,
} from '@/lib/exercises'
import { cn } from '@/lib/utils'

type Props = {
  config: ScenarioConfig
  onChange: (next: ScenarioConfig) => void
}

function uid() {
  return 'n_' + Math.random().toString(36).slice(2, 10)
}

function newNode(type: ScenarioNodeType): ScenarioNode {
  if (type === 'narrative') {
    return {
      id: uid(),
      type,
      content: '',
      choices: [{ label: 'Continue', nextNodeId: '' }],
    }
  }
  if (type === 'choice') {
    return {
      id: uid(),
      type,
      content: '',
      choices: [
        { label: '', nextNodeId: '' },
        { label: '', nextNodeId: '' },
      ],
    }
  }
  return {
    id: uid(),
    type: 'ending',
    content: '',
    outcome: 'neutral',
  }
}

export function ScenarioConfigEditor({ config, onChange }: Props) {
  const nodes = config.nodes ?? []

  const validation = useMemo(() => validate(config), [config])

  function updateNodes(next: ScenarioNode[]) {
    onChange({ ...config, nodes: next })
  }

  function addNode(type: ScenarioNodeType) {
    const node = newNode(type)
    const startNodeId =
      config.startNodeId || (nodes.length === 0 ? node.id : config.startNodeId)
    onChange({ ...config, nodes: [...nodes, node], startNodeId })
  }

  function removeNode(id: string) {
    let nextStart = config.startNodeId
    const remaining = nodes.filter((n) => n.id !== id)
    if (nextStart === id) nextStart = remaining[0]?.id ?? ''
    // Clear references pointing at the deleted node
    const cleaned = remaining.map((n) => {
      if (!n.choices) return n
      return {
        ...n,
        choices: n.choices.map((c) =>
          c.nextNodeId === id ? { ...c, nextNodeId: '' } : c,
        ),
      }
    })
    onChange({ ...config, nodes: cleaned, startNodeId: nextStart })
  }

  function patchNode(id: string, patch: Partial<ScenarioNode>) {
    updateNodes(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4">
        <div>
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Where does the scenario start?
          </h3>
          <p className="mt-1 text-sm text-ink/60">
            Pick the entry node — the very first thing participants will read.
          </p>
          <div className="mt-3 max-w-md">
            <Select
              value={config.startNodeId}
              onChange={(e) => onChange({ ...config, startNodeId: e.target.value })}
            >
              <option value="">—</option>
              {nodes.map((n, i) => (
                <option key={n.id} value={n.id}>
                  {`#${i + 1} · ${n.type} · ${(n.content || '').slice(0, 40) || '(empty)'}`}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-serif text-lg tracking-tightish text-ink">Nodes</h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addNode('narrative')}
            >
              <Plus className="h-3.5 w-3.5" /> Narrative
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addNode('choice')}
            >
              <Plus className="h-3.5 w-3.5" /> Choice
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addNode('ending')}
            >
              <Plus className="h-3.5 w-3.5" /> Ending
            </Button>
          </div>
        </div>

        {nodes.length === 0 ? (
          <p className="text-sm text-ink/60">
            No nodes yet. Add a narrative or choice to get the story started.
          </p>
        ) : (
          <ul className="space-y-3">
            {nodes.map((n, i) => (
              <ScenarioNodeRow
                key={n.id}
                index={i}
                node={n}
                allNodes={nodes}
                isStart={config.startNodeId === n.id}
                warnings={validation.byNode[n.id] ?? []}
                onPatch={(patch) => patchNode(n.id, patch)}
                onRemove={() => removeNode(n.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {validation.globalWarnings.length > 0 && (
        <div className="rounded-2xl bg-warn/10 border border-warn/30 p-4">
          <p className="font-medium text-ink mb-1.5">
            A few things to look at before publishing:
          </p>
          <ul className="space-y-0.5 text-sm text-ink/80 list-disc list-inside">
            {validation.globalWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Per-node row
// =====================================================================
function ScenarioNodeRow({
  index,
  node,
  allNodes,
  isStart,
  warnings,
  onPatch,
  onRemove,
}: {
  index: number
  node: ScenarioNode
  allNodes: ScenarioNode[]
  isStart: boolean
  warnings: string[]
  onPatch: (patch: Partial<ScenarioNode>) => void
  onRemove: () => void
}) {
  function updateChoice(idx: number, patch: Partial<ScenarioChoice>) {
    const next = (node.choices ?? []).map((c, i) =>
      i === idx ? { ...c, ...patch } : c,
    )
    onPatch({ choices: next })
  }
  function addChoice() {
    onPatch({
      choices: [...(node.choices ?? []), { label: '', nextNodeId: '' }],
    })
  }
  function removeChoice(idx: number) {
    onPatch({
      choices: (node.choices ?? []).filter((_, i) => i !== idx),
    })
  }

  const typeTone =
    node.type === 'narrative'
      ? 'bg-ink/10 text-ink/70'
      : node.type === 'choice'
      ? 'bg-domain-problem/15 text-domain-problem'
      : 'bg-sage/15 text-sage'

  return (
    <li className="rounded-2xl border border-ink/10 p-4 space-y-3 bg-cream/30">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="font-mono text-xs text-ink/50 mt-2">#{index + 1}</span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider mt-1.5',
            typeTone,
          )}
        >
          {node.type}
        </span>
        {isStart && (
          <span className="rounded-full bg-sage text-cream px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider mt-1.5">
            Start
          </span>
        )}
        <div className="flex-1 min-w-0">
          <Textarea
            value={node.content}
            onChange={(e) => onPatch({ content: e.target.value })}
            placeholder={
              node.type === 'ending'
                ? 'The closing message participants see.'
                : 'What participants read at this point in the story.'
            }
            rows={2}
            maxLength={1500}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-ink/40 hover:text-error mt-2"
          aria-label="Remove node"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {node.type === 'narrative' && (
        <div className="pl-2 sm:pl-12">
          <label className="block text-xs font-mono uppercase tracking-wider text-ink/60 mb-1">
            Then advances to
          </label>
          <Select
            value={node.choices?.[0]?.nextNodeId ?? ''}
            onChange={(e) =>
              onPatch({
                choices: [
                  {
                    label: 'Continue',
                    nextNodeId: e.target.value,
                  },
                ],
              })
            }
          >
            <option value="">—</option>
            {allNodes
              .filter((n) => n.id !== node.id)
              .map((n, i) => (
                <option key={n.id} value={n.id}>
                  {`#${allNodes.indexOf(n) + 1} · ${n.type} · ${(n.content || '').slice(0, 36) || '(empty)'}`}
                </option>
              ))}
          </Select>
        </div>
      )}

      {node.type === 'choice' && (
        <div className="pl-2 sm:pl-12 space-y-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-ink/60">
            Choices
          </label>
          {(node.choices ?? []).map((c, ci) => (
            <div
              key={ci}
              className="grid sm:grid-cols-[1fr_1fr_36px] gap-2 items-start"
            >
              <Input
                value={c.label}
                onChange={(e) => updateChoice(ci, { label: e.target.value })}
                placeholder="What the participant sees"
              />
              <Select
                value={c.nextNodeId}
                onChange={(e) => updateChoice(ci, { nextNodeId: e.target.value })}
              >
                <option value="">→ Advances to…</option>
                {allNodes
                  .filter((n) => n.id !== node.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {`#${allNodes.indexOf(n) + 1} · ${n.type} · ${(n.content || '').slice(0, 30) || '(empty)'}`}
                    </option>
                  ))}
              </Select>
              <button
                type="button"
                onClick={() => removeChoice(ci)}
                className="p-1.5 text-ink/40 hover:text-error self-center justify-self-center"
                aria-label="Remove choice"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addChoice}>
            <Plus className="h-3.5 w-3.5" /> Add choice
          </Button>
        </div>
      )}

      {node.type === 'ending' && (
        <div className="pl-2 sm:pl-12">
          <label className="block text-xs font-mono uppercase tracking-wider text-ink/60 mb-1">
            Outcome
          </label>
          <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 text-xs font-medium">
            {(['positive', 'neutral', 'negative'] as ScenarioOutcome[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onPatch({ outcome: o })}
                className={cn(
                  'rounded-full px-3 py-1.5 transition-colors capitalize',
                  node.outcome === o
                    ? 'bg-ink text-cream'
                    : 'text-ink/70 hover:text-ink',
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="pl-2 sm:pl-12 flex items-start gap-2 text-xs text-warn">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <ul className="space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

// =====================================================================
// Validation — surfaces problems but does NOT block save (trainers
// iterate; we warn but don't get in the way).
// =====================================================================
function validate(config: ScenarioConfig): {
  byNode: Record<string, string[]>
  globalWarnings: string[]
} {
  const byNode: Record<string, string[]> = {}
  const globalWarnings: string[] = []
  const nodeIds = new Set(config.nodes.map((n) => n.id))
  const referenced = new Set<string>()
  let hasEnding = false

  for (const n of config.nodes) {
    byNode[n.id] = []
    if (!n.content.trim()) {
      byNode[n.id].push('No content yet — participants will see an empty card.')
    }
    if (n.type === 'narrative' || n.type === 'choice') {
      const choices = n.choices ?? []
      if (n.type === 'narrative' && !choices[0]?.nextNodeId) {
        byNode[n.id].push('Pick the next node so the story can advance.')
      }
      for (const c of choices) {
        if (n.type === 'choice' && !c.label.trim()) {
          byNode[n.id].push('A choice has no label.')
        }
        if (!c.nextNodeId) {
          if (n.type === 'choice') byNode[n.id].push('A choice has no target node.')
        } else if (!nodeIds.has(c.nextNodeId)) {
          byNode[n.id].push('A target node was deleted — pick another.')
        } else {
          referenced.add(c.nextNodeId)
        }
      }
    }
    if (n.type === 'ending') hasEnding = true
  }

  if (!config.startNodeId) {
    globalWarnings.push('No start node selected.')
  } else if (!nodeIds.has(config.startNodeId)) {
    globalWarnings.push('The start node was deleted — pick another.')
  } else {
    referenced.add(config.startNodeId)
  }

  if (!hasEnding) {
    globalWarnings.push('No ending node yet — the story has nowhere to land.')
  }
  // Unreachable check (very simple: did any node appear in referenced?)
  for (const n of config.nodes) {
    if (n.id !== config.startNodeId && !referenced.has(n.id)) {
      byNode[n.id].push('Unreachable — no other node advances to this one.')
    }
  }

  return { byNode, globalWarnings }
}
