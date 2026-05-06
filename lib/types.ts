// =====================================================================
// Database types — kept in sync with migrations 001/002.
// =====================================================================

export type AdminRole = 'admin' | 'trainer'

export type AdminUser = {
  id: string
  email: string
  password_hash: string
  name: string
  role: AdminRole
  created_at: string
}

export type IcebreakerFormat = 'matching' | 'prompts'

export type Icebreaker = {
  id: string
  title: string
  format: IcebreakerFormat
  instructions: string | null
  show_live_wall: boolean
  created_at: string
}

export type IcebreakerCategory = {
  id: string
  icebreaker_id: string
  label: string
  position: number
  created_at: string
}

export type IcebreakerItem = {
  id: string
  icebreaker_id: string
  text: string
  correct_category_id: string | null
  tag_label: string | null
  tag_color: string | null
  position: number
  created_at: string
}

export type PromptAnswerType = 'short_text' | 'long_text' | 'word'

export type IcebreakerPrompt = {
  id: string
  icebreaker_id: string
  prompt: string
  answer_type: PromptAnswerType
  position: number
  created_at: string
}

export type Survey = {
  id: string
  title: string
  description: string | null
  created_at: string
}

export type QuestionType =
  | 'yes_no'
  | 'yes_no_notreally'
  | 'yes_no_sometimes'
  | 'multiple_choice'
  | 'rating_5'
  | 'rating_10'
  | 'short_text'
  | 'long_text'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  yes_no: 'Yes / No',
  yes_no_notreally: 'Yes / No / Not really',
  yes_no_sometimes: 'Yes / No / Sometimes',
  multiple_choice: 'Multiple choice',
  rating_5: 'Rating (1–5 stars)',
  rating_10: 'Rating (1–10)',
  short_text: 'Short text',
  long_text: 'Long text',
}

export const QUESTION_TYPE_OPTIONS: Record<QuestionType, string[] | null> = {
  yes_no: ['Yes', 'No'],
  yes_no_notreally: ['Yes', 'No', 'Not really'],
  yes_no_sometimes: ['Yes', 'No', 'Sometimes'],
  multiple_choice: null,
  rating_5: ['1', '2', '3', '4', '5'],
  rating_10: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  short_text: null,
  long_text: null,
}

export type SurveyQuestion = {
  id: string
  survey_id: string
  question: string
  question_type: QuestionType
  options: string[] | null
  required: boolean
  position: number
  created_at: string
}

export type TrainingStatus = 'draft' | 'live' | 'closed'

export type Training = {
  id: string
  title: string
  nursery_name: string | null
  trainer_name: string | null
  description: string | null
  join_code: string
  slug: string
  status: TrainingStatus
  icebreaker_id: string | null
  survey_id: string | null
  scheduled_at: string | null
  closed_at: string | null
  created_at: string
}

export type Participant = {
  id: string
  training_id: string
  display_name: string | null
  session_token: string
  joined_at: string | null
  icebreaker_completed_at: string | null
  survey_completed_at: string | null
  created_at: string
}

export type IcebreakerMatchingResponse = {
  id: string
  participant_id: string
  training_id: string
  item_id: string
  first_attempt_category_id: string | null
  was_correct: boolean
  attempts: number
  created_at: string
}

export type IcebreakerPromptResponse = {
  id: string
  participant_id: string
  training_id: string
  prompt_id: string
  answer: string | null
  created_at: string
}

export type SurveyResponse = {
  id: string
  participant_id: string
  training_id: string
  question_id: string
  answer: string | null
  created_at: string
}

export type TrainerNote = {
  id: string
  training_id: string
  participant_id: string | null
  item_id: string | null
  body: string
  created_at: string
}

export type AIAnalysisType = 'sentiment' | 'training_summary'

export type SentimentResult = {
  sentiment: 'positive' | 'mixed' | 'negative'
  summary: string
  themes: { title: string; description: string; frequency: 'common' | 'some' | 'few' }[]
  notable_quotes: string[]
  suggestions_for_trainer: string[]
}

export type TrainingSummaryResult = {
  summary: string
  takeaways: string[]
}

export type AIAnalysis = {
  id: string
  training_id: string
  question_id: string | null
  analysis_type: AIAnalysisType
  result: SentimentResult | TrainingSummaryResult | unknown
  created_at: string
}

// Admin session payload (JWT)
export type AdminSession = {
  user_id: string
  email: string
  name: string
  role: AdminRole
}
