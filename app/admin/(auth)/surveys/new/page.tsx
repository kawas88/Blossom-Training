import { SurveyEditorForm } from '../SurveyForm'

export const dynamic = 'force-dynamic'

export default function NewSurveyPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          New survey
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          Build a <span className="italic-sage">survey.</span>
        </h1>
      </div>
      <SurveyEditorForm />
    </div>
  )
}
