import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary px-6 py-14 text-center md:px-12 md:py-20">
        <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
          Spend your time teaching, not organising.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-lg leading-relaxed text-primary-foreground/85">
          Set up your first student and schedule a session in minutes. Free for one tutor, with AI plans and reviews
          included.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" className="group h-12 bg-primary-foreground px-6 text-base font-medium text-primary hover:bg-primary-foreground/90" asChild>
            <Link href="/login">
              Start teaching free
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 border-primary-foreground/40 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            Talk to us
          </Button>
        </div>
      </div>
    </section>
  )
}