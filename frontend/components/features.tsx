import { CalendarClock, Sparkles, NotebookPen, ClipboardCheck, LineChart, Users } from "lucide-react"

const FEATURES = [
  { icon: Sparkles, title: "AI session plans", body: "Before a lesson, get learning objectives, a four-point outline, and three practice questions — built from the student's profile and past sessions.", span: "md:col-span-2" },
  { icon: NotebookPen, title: "Notes with autosave", body: "Type during the session and it saves itself, debounced. Close the tab and everything is still there when you return.", span: "" },
  { icon: ClipboardCheck, title: "AI session review", body: "After a session, AI reads your notes and returns a summary, two or three homework tasks, and what to cover next time.", span: "" },
  { icon: CalendarClock, title: "Clash-free scheduling", body: "Pick a student, date, and topic. TutorFlow blocks double-bookings and validates the form before anything is saved.", span: "md:col-span-2" },
  { icon: LineChart, title: "Progress view", body: "Open a student to see every session in order, plus an AI paragraph on where they're improving and where they still struggle.", span: "md:col-span-2" },
  { icon: Users, title: "Student profiles", body: "Subject, current level, goals, and weak areas — the context the AI reads to make every plan fit the individual.", span: "" },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Features</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a one-to-one tutor actually needs.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Six focused tools that carry a session from the moment you schedule it to the homework that lands in your
            student&apos;s inbox.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50 ${f.span}`}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}