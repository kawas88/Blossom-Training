import { IcebreakerForm } from '../IcebreakerForm'

export const dynamic = 'force-dynamic'

export default function NewIcebreakerPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          New icebreaker
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          Build a <span className="italic-sage">warm-up.</span>
        </h1>
      </div>
      <IcebreakerForm />
    </div>
  )
}
