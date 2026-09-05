import { CalendarClock, PlayCircle, CheckCircle2, Sparkles } from "lucide-react"

const STEPS = [
  { icon: CalendarClock, label: "Scheduled", body: "Tutor picks a student, date, and topic. No clashes allowed." },
  { icon: PlayCircle, label: "In progress", body: "Notes autosave as the lesson runs. Nothing gets lost." },
  { icon: CheckCircle2, label: "Completed", body: "The session locks. Only the AI review can happen next." },
  { icon: Sparkles, label: "AI reviewed", body: "Summary, homework, and a suggestion for next time." },
]

export function Lifecycle() {
  return (
    <section id="lifecycle" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">The session lifecycle</p>
        <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Every session moves through four states, in order.
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          No skipping ahead. A session can&apos;t jump from Scheduled to AI reviewed — the flow is enforced so your
          records always match reality.
        </p>
      </div>
      <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.label} className="relative rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-semibold text-muted-foreground">0{i + 1}</span>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{step.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}