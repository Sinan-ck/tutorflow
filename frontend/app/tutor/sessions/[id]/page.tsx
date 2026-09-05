"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { GraduationCap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const DEBOUNCE_MS = 900

type AIPlan = { objectives: string; lesson_outline: string; practice_questions: string }
type AIReview = { summary: string; homework: string; next_session_suggestion: string }

type Session = {
  id: number
  student: number
  student_name: string
  topic: string
  scheduled_at: string
  duration_minutes: number
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "AI_REVIEWED"
  notes: string
  ai_plan: AIPlan | null
  ai_review: AIReview | null
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  AI_REVIEWED: "AI reviewed",
}
const NOTES_EDITABLE = new Set(["SCHEDULED", "IN_PROGRESS"])
const AI_PLAN_ALLOWED = new Set(["SCHEDULED", "IN_PROGRESS"])

function authHeaders() {
  const token = localStorage.getItem("access")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

// Backend stores lists as newline-joined text; split back into bullet points.
function lines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
}

export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState("")

  const [notes, setNotes] = useState("")
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [actionError, setActionError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem("role")) {
      router.replace("/login")
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function load() {
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSession(data)
      setNotes(data.notes || "")
    } catch {
      setError("Could not load this session.")
    }
  }

  const flushNotes = useCallback(
    async (value: string) => {
      setSaveState("saving")
      try {
        const res = await fetch(`${API_URL}/sessions/${sessionId}/notes/`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ notes: value }),
        })
        if (!res.ok) throw new Error()
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    },
    [sessionId]
  )

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setNotes(value)
    setSaveState("pending")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => flushNotes(value), DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function runAction(name: string, path: string) {
    setActionError("")
    setActionLoading(name)
    try {
      const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.detail || data.status || "Something went wrong.")
        return
      }
      setSession(data)
      setNotes(data.notes || "")
    } catch {
      setActionError("Could not reach the server.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleLogout() {
    localStorage.clear()
    router.push("/login")
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar onLogout={handleLogout} />
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar onLogout={handleLogout} />
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    )
  }

  const notesEditable = NOTES_EDITABLE.has(session.status)
  const canGeneratePlan = AI_PLAN_ALLOWED.has(session.status)

  return (
    <div className="min-h-screen bg-background">
      <Topbar onLogout={handleLogout} />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href={`/tutor/students/${session.student}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {session.student_name}
        </Link>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">{session.topic}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes} min
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
              {STATUS_LABEL[session.status]}
            </span>
          </div>

          {actionError && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            {session.status === "SCHEDULED" && (
              <Button onClick={() => runAction("start", `/sessions/${sessionId}/start/`)} disabled={!!actionLoading}>
                {actionLoading === "start" ? "Starting…" : "Start session"}
              </Button>
            )}
            {session.status === "IN_PROGRESS" && (
              <Button onClick={() => runAction("complete", `/sessions/${sessionId}/complete/`)} disabled={!!actionLoading}>
                {actionLoading === "complete" ? "Completing…" : "Mark completed"}
              </Button>
            )}
            {session.status === "COMPLETED" && (
              <Button onClick={() => runAction("review", `/sessions/${sessionId}/ai-review/`)} disabled={!!actionLoading}>
                {actionLoading === "review" ? "Reviewing with AI…" : "Run AI review"}
              </Button>
            )}
            {session.status === "AI_REVIEWED" && (
              <span className="text-sm text-muted-foreground">This session is complete and reviewed.</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">AI session plan</h2>
            {canGeneratePlan && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction("plan", `/sessions/${sessionId}/ai-plan/`)}
                disabled={!!actionLoading}
              >
                {actionLoading === "plan" ? "Generating…" : session.ai_plan ? "Regenerate plan" : "Generate plan"}
              </Button>
            )}
          </div>

          {!session.ai_plan && (
            <p className="mt-3 text-sm text-muted-foreground">
              {canGeneratePlan
                ? "Uses this student's profile and past sessions to build a plan targeted at them."
                : "No plan was generated before this session."}
            </p>
          )}

          {session.ai_plan && (
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Learning objectives
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {lines(session.ai_plan.objectives).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lesson outline</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {lines(session.ai_plan.lesson_outline).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Practice questions
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {lines(session.ai_plan.practice_questions).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Session notes</h2>
            <span className="text-xs text-muted-foreground">
              {saveState === "pending" && "Typing…"}
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </span>
          </div>
          <textarea
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-ring focus:ring-1 disabled:opacity-60"
            rows={8}
            value={notes}
            onChange={handleNotesChange}
            disabled={!notesEditable}
            placeholder={
              notesEditable ? "Type notes during the session — they save automatically." : "Notes are locked once a session is completed."
            }
          />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-semibold">AI session review</h2>
          {!session.ai_review && (
            <p className="mt-3 text-sm text-muted-foreground">
              Available once the session is marked completed. Reads the notes above and returns a summary, homework,
              and a suggestion for next time.
            </p>
          )}
          {session.ai_review && (
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
                <p className="mt-1 text-sm">{session.ai_review.summary}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Homework</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {lines(session.ai_review.homework).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestion for next time
                </h3>
                <p className="mt-1 text-sm">{session.ai_review.next_session_suggestion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Topbar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TutorFlow</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </header>
  )
}