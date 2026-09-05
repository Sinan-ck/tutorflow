import { Check } from "lucide-react"

const ROLES = [
  { tag: "For tutors", title: "Manage every student from one place", points: [
    "Create student accounts and profiles — no public sign-up",
    "Schedule sessions with built-in double-booking checks",
    "Plan and review each lesson with AI, then send homework",
    "See a full progress history for every student you teach",
  ]},
  { tag: "For students", title: "Log in and know exactly what's next", points: [
    "See upcoming sessions with topic, date, and time",
    "Read notes from completed sessions, read-only",
    "Find AI-generated homework in one tidy list",
    "Get an email the moment a new session is scheduled",
  ]},
]

export function Roles() {
  return (
    <section id="roles" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Two roles, one platform</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for both sides of the session.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role.tag} className="rounded-2xl border border-border bg-card p-8">
              <p className="text-sm font-semibold text-primary">{role.tag}</p>
              <h3 className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight">{role.title}</h3>
              <ul className="mt-6 space-y-3">
                {role.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}