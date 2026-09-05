import { GraduationCap } from "lucide-react"

const COLUMNS = [
  { heading: "Product", links: ["Features", "Session lifecycle", "For students", "Pricing"] },
  { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { heading: "Resources", links: ["Docs", "Help center", "Status", "Changelog"] },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">TutorFlow</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A calmer way for online tutors to plan, run, and review one-to-one sessions — with AI doing the busywork.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TutorFlow. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}