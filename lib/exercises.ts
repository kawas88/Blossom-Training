import { createAdminClient } from './supabase/admin'

// ---------------------------------------------------------------------
// Exercise types — the unified replacement for the legacy
// icebreaker/survey split (surveys still live on their own tables for
// the moment; that migration is later).
// ---------------------------------------------------------------------

export type ExerciseType =
  | 'matching'
  | 'quiz'
  | 'reflection'
  | 'word_cloud'
  | 'ranking'
  | 'annotation'
  | 'scenario'

export type AgeGroup = {
  id: string
  label: string
  position: number
}

export type Milestone = {
  id: string
  text: string
  tagLabel: string | null
  tagColor: string | null
  position: number
}

export interface MatchingConfig {
  ageGroups: AgeGroup[]
  milestones: Milestone[]
  correctPlacements: Record<string, string>
  instructions?: string | null
  showLiveWall?: boolean
  legacyIcebreakerId?: string
}

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
}

export interface QuizConfig {
  questions: QuizQuestion[]
  shuffleQuestions: boolean
  showCorrectAfterEach: boolean
}

export interface ReflectionConfig {
  prompt: string
  minLength: number
  aiAnalysis: boolean
}

// Placeholder shapes for types coming in 3C — keeps the union safe
// to extend without breaking the type system.
export interface WordCloudConfig {
  prompt: string
  maxLength: number
  allowMultiple: boolean
  caseSensitive: boolean
  stopWords: string[]
  maxWordsPerParticipant?: number
}
export type RankingConfig = Record<string, never>
export type AnnotationConfig = Record<string, never>
export type ScenarioConfig = Record<string, never>

export type ExerciseConfig =
  | MatchingConfig
  | QuizConfig
  | ReflectionConfig
  | WordCloudConfig
  | RankingConfig
  | AnnotationConfig
  | ScenarioConfig

export type Exercise = {
  id: string
  workspace_id: string
  type: ExerciseType
  title: string
  description: string | null
  config: ExerciseConfig
  created_at: string
  updated_at: string
}

export type PacingMode = 'self' | 'trainer'

export type TrainingExerciseRow = {
  id: string
  training_id: string
  exercise_id: string
  position: number
  required: boolean
  pacing: PacingMode
  created_at: string
}

export type TrainingExerciseWithDef = Exercise & {
  link_id: string
  position: number
  required: boolean
  pacing: PacingMode
}

export type MatchingResponseShape = {
  placements: Record<string, string | null>
  firstAttempts: Record<string, string>
  attempts: Record<string, number>
}

export type QuizResponseShape = {
  answers: Record<string, number>
}

export type ReflectionResponseShape = {
  text: string
  aiAnalysis?: {
    sentiment: 'positive' | 'mixed' | 'negative'
    summary: string
    themes: { title: string; description: string; frequency: 'common' | 'some' | 'few' }[]
  } | null
}

export type WordCloudResponseShape = {
  words: string[]
}

export type ExerciseResponse = {
  id: string
  training_id: string
  exercise_id: string
  participant_id: string
  response: MatchingResponseShape | QuizResponseShape | ReflectionResponseShape | Record<string, unknown>
  score: number | null
  completed_at: string
}

// ---------------------------------------------------------------------
// Type guards — the config jsonb comes back loose; narrow it here.
// ---------------------------------------------------------------------

export function isMatchingExercise(
  ex: Exercise,
): ex is Exercise & { config: MatchingConfig } {
  return ex.type === 'matching'
}

export function isQuizExercise(
  ex: Exercise,
): ex is Exercise & { config: QuizConfig } {
  return ex.type === 'quiz'
}

export function isReflectionExercise(
  ex: Exercise,
): ex is Exercise & { config: ReflectionConfig } {
  return ex.type === 'reflection'
}

export function isWordCloudExercise(
  ex: Exercise,
): ex is Exercise & { config: WordCloudConfig } {
  return ex.type === 'word_cloud'
}

// ---------------------------------------------------------------------
// Type-aware default config — used by the new-exercise builder.
// ---------------------------------------------------------------------

export const DEFAULT_STOP_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'i', 'me', 'my', 'we', 'us', 'our',
  'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from',
  'this', 'that', 'these', 'those', 'so', 'just',
]

export function defaultConfigFor(type: ExerciseType): ExerciseConfig {
  switch (type) {
    case 'matching':
      return { ageGroups: [], milestones: [], correctPlacements: {} }
    case 'quiz':
      return { questions: [], shuffleQuestions: false, showCorrectAfterEach: true }
    case 'reflection':
      return { prompt: '', minLength: 20, aiAnalysis: true }
    case 'word_cloud':
      return {
        prompt: '',
        maxLength: 30,
        allowMultiple: true,
        maxWordsPerParticipant: 3,
        caseSensitive: false,
        stopWords: [...DEFAULT_STOP_WORDS],
      }
    default:
      return {}
  }
}

// ---------------------------------------------------------------------
// Friendly type labels for UI.
// ---------------------------------------------------------------------

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  matching: 'Matching',
  quiz: 'Quiz',
  reflection: 'Reflection',
  word_cloud: 'Word Cloud',
  ranking: 'Ranking',
  annotation: 'Image Annotation',
  scenario: 'Branching Scenario',
}

export const EXERCISE_TYPE_BLURBS: Record<ExerciseType, string> = {
  matching: 'Drag items into the right buckets.',
  quiz: 'Multiple-choice questions, one at a time.',
  reflection: 'An open-ended written prompt, optionally summarised by AI.',
  word_cloud: 'Live word cloud — coming soon.',
  ranking: 'Drag items into a preferred order — coming soon.',
  annotation: 'Tap regions of an image — coming soon.',
  scenario: 'Branching narrative — coming soon.',
}

export const ENABLED_EXERCISE_TYPES: ExerciseType[] = [
  'matching',
  'quiz',
  'reflection',
  'word_cloud',
]

// ---------------------------------------------------------------------
// Read helpers — service-role clients only. (Admin route handlers and
// server components do their own workspace-access checks before calling.)
// ---------------------------------------------------------------------

export async function getExercise(id: string): Promise<Exercise | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data ?? null) as Exercise | null
}

export async function listExercisesForWorkspace(
  workspaceId: string,
): Promise<Exercise[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Exercise[]
}

export async function listTrainingExercises(
  trainingId: string,
): Promise<TrainingExerciseWithDef[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('training_exercises')
    .select('id, training_id, exercise_id, position, required, pacing, created_at, exercises(*)')
    .eq('training_id', trainingId)
    .order('position', { ascending: true })
  if (!data) return []
  return data
    .map((row) => {
      const linkRow = row as unknown as TrainingExerciseRow & {
        exercises: Exercise | Exercise[] | null
      }
      const ex = Array.isArray(linkRow.exercises)
        ? linkRow.exercises[0]
        : linkRow.exercises
      if (!ex) return null
      return {
        ...(ex as Exercise),
        link_id: linkRow.id,
        position: linkRow.position,
        required: linkRow.required,
        pacing: (linkRow.pacing as PacingMode) ?? 'self',
      } satisfies TrainingExerciseWithDef
    })
    .filter((x): x is TrainingExerciseWithDef => x !== null)
}

export async function getMatchingExerciseForTraining(
  trainingId: string,
): Promise<Exercise | null> {
  const exercises = await listTrainingExercises(trainingId)
  return exercises.find((e) => e.type === 'matching') ?? null
}

export async function getExerciseResponses(
  exerciseId: string,
): Promise<ExerciseResponse[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exercise_responses')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: true })
  return (data ?? []) as ExerciseResponse[]
}

export async function countTrainingsUsingExercise(exerciseId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('training_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', exerciseId)
  return count ?? 0
}
