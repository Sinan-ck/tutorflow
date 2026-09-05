import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            AI plans and reviews every session
          </span>
          <h1 className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Run better tutoring sessions, <span className="text-primary">start to finish.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            TutorFlow gives online tutors one place to manage students, schedule sessions, and let AI prepare the plan
            and summarise the homework. Students just log in and see what&apos;s next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/login">
                Start teaching free
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full bg-transparent sm:w-auto" asChild>
              <Link href="/login">See a sample session</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card. One tutor, unlimited students on the free plan.
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
            </div>
            <div className="grid gap-6 p-8 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  Alex Rivera
                </div>
                <div className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Ben T.</div>
                <div className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Chloe M.</div>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  AI-generated lesson plan
                </p>
                <p className="font-display text-lg font-semibold">Two-step equations and word problems</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>• Understand two-step equations</li>
                  <li>• Translate word problems into equations</li>
                  <li>• Practice with rate-based problems</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}