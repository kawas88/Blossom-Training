import { createAdminClient } from './supabase/admin'
import type { TrainingExerciseWithDef } from './exercises'

export type SessionStatus = 'idle' | 'live' | 'wrapped'

export type TrainingSession = {
  id: string
  training_id: string
  status: SessionStatus
  current_exercise_id: string | null
  started_at: string | null
  wrapped_at: string | null
  updated_at: string
}

export async function getTrainingSession(
  trainingId: string,
): Promise<TrainingSession | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('training_id', trainingId)
    .maybeSingle()
  return (data ?? null) as TrainingSession | null
}

export async function ensureTrainingSession(
  trainingId: string,
): Promise<TrainingSession> {
  const existing = await getTrainingSession(trainingId)
  if (existing) return existing
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({ training_id: trainingId, status: 'idle' })
    .select('*')
    .single()
  if (error) throw error
  return data as TrainingSession
}

// ---------------------------------------------------------------------
// Pick the next/previous trainer-paced exercise relative to a current id.
// Self-paced exercises are skipped — trainer pacing doesn't drive those.
// ---------------------------------------------------------------------
export function trainerPacedExercises(
  exercises: TrainingExerciseWithDef[],
): TrainingExerciseWithDef[] {
  return exercises
    .filter((e) => e.pacing === 'trainer')
    .sort((a, b) => a.position - b.position)
}

export function pickNextExerciseId(
  exercises: TrainingExerciseWithDef[],
  currentId: string | null,
): string | null {
  const driven = trainerPacedExercises(exercises)
  if (driven.length === 0) return null
  if (!currentId) return driven[0].id
  const idx = driven.findIndex((e) => e.id === currentId)
  if (idx < 0) return driven[0].id
  return idx + 1 < driven.length ? driven[idx + 1].id : null
}

export function pickPreviousExerciseId(
  exercises: TrainingExerciseWithDef[],
  currentId: string | null,
): string | null {
  const driven = trainerPacedExercises(exercises)
  if (driven.length === 0 || !currentId) return null
  const idx = driven.findIndex((e) => e.id === currentId)
  if (idx <= 0) return null
  return driven[idx - 1].id
}

export function hasAnyTrainerPaced(
  exercises: TrainingExerciseWithDef[],
): boolean {
  return exercises.some((e) => e.pacing === 'trainer')
}
