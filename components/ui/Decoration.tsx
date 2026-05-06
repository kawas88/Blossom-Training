// Editorial decorative blobs — used in hero/auth pages.
export function Decoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-sage/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-terracotta/20 blur-3xl" />
    </div>
  )
}
