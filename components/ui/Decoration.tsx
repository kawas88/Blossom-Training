import { BrandShape } from '@/components/BrandShape'

// Background decoration for auth-adjacent pages (login, signup, join, invite,
// pricing). The new brand replaces the soft blurred blobs with off-axis
// mascot shapes — playful, off-grid, never crowding the composition. Hidden
// on small screens so the form stays the focus.
export function Decoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      <BrandShape
        kind="flower"
        color="sunglow"
        size="lg"
        rotate={-12}
        className="hidden md:block absolute top-24 left-8 animate-float opacity-90"
      />
      <BrandShape
        kind="star"
        color="pink"
        size="md"
        rotate={20}
        className="hidden md:block absolute top-44 right-12 animate-wiggle opacity-90"
      />
      <BrandShape
        kind="blob"
        color="mint"
        size="md"
        rotate={-8}
        className="hidden lg:block absolute bottom-40 left-16 animate-float opacity-90"
      />
      <BrandShape
        kind="cross"
        color="wisteria"
        size="sm"
        rotate={15}
        className="hidden lg:block absolute bottom-24 right-16 animate-wiggle opacity-90"
      />
    </div>
  )
}
