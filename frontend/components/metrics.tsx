const STATS = [
  { value: "4", label: "Enforced session states" },
  { value: "0", label: "Double-bookings allowed" },
  { value: "2x", label: "AI touchpoints per session" },
  { value: "1", label: "Login for every student" },
]

export function Metrics() {
  return (
    <section id="metrics" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card p-6 md:p-8">
            <div className="font-display text-4xl font-semibold tracking-tight text-primary md:text-5xl">{s.value}</div>
            <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
