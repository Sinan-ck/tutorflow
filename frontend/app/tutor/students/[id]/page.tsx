"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { GraduationCap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

type Student = {
  id: number
  name: string
  subject: string
  current_level: string
  learning_goals: string
  weak_areas: string
  username: string
}

type Session = {
  id: number
  topic: string
  scheduled_at: string
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "AI_REVIEWED"
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  AI_REVIEWED: "AI reviewed",
}

function authHeaders() {
  const token = localStorage.getItem("access")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()

  const [student, setStudent] = useState<Student | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  const [progress, setProgress] = useState<string | null>(null)
  const [progressError, setProgressError] = useState("")
  const [progressLoading, setProgressLoading] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) {
      router.replace("/login")
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function load() {
    try {
      const [studentRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/students/${studentId}/`, { headers: authHeaders() }),
        fetch(`${API_URL}/students/${studentId}/sessions/`, { headers: authHeaders() }),
      ])
      if (!studentRes.ok || !sessionsRes.ok) throw new Error()
      setStudent(await studentRes.json())
      setSessions(await sessionsRes.json())
    } catch {
      setError("Could not load this student.")
    }
  }

  async function handleProgressSummary() {
    setProgressError("")
    setProgress(null)
    setProgressLoading(true)
    try {
      const res = await fetch(`${API_URL}/students/${studentId}/progress-summary/`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setProgressError(data.detail || "Could not generate a progress summary.")
        return
      }
      setProgress(data.progress_summary)
    } catch {
      setProgressError("Could not reach the server.")
    } finally {
      setProgressLoading(false)
    }
  }

  function handleLogout() {
    localStorage.clear()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">TutorFlow</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/tutor" className="text-sm text-muted-foreground hover:text-foreground">
          ← All students
        </Link>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!student && !error && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {student && (
          <>
            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{student.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {student.subject} · Level: {student.current_level} · Login: {student.username}
              </p>
              {student.learning_goals && (
                <p className="mt-3 text-sm">
                  <strong>Goals:</strong> {student.learning_goals}
                </p>
              )}
              {student.weak_areas && (
                <p className="mt-1 text-sm">
                  <strong>Weak areas:</strong> {student.weak_areas}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold">Progress summary</h2>
                <Button size="sm" onClick={handleProgressSummary} disabled={progressLoading}>
                  {progressLoading ? "Analyzing…" : "Generate progress summary"}
                </Button>
              </div>
              {progressError && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {progressError}
                </div>
              )}
              {progress && <p className="mt-3 text-sm leading-relaxed">{progress}</p>}
              {!progress && !progressError && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Sends every AI-reviewed session for this student to the AI and summarizes where they're improving
                  and where they still struggle.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Sessions</h2>
              <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Schedule session"}</Button>
            </div>

            {showForm && (
              <ScheduleForm
                studentId={studentId}
                onCreated={() => {
                  setShowForm(false)
                  load()
                }}
              />
            )}

            {sessions === null && <p className="mt-4 text-sm text-muted-foreground">Loading sessions…</p>}
            {sessions && sessions.length === 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No sessions scheduled yet.
              </div>
            )}

            <div className="mt-4 space-y-3">
              {sessions &&
                sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tutor/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                  >
                    <div>
                      <p className="font-display font-semibold">{s.topic}</p>
                      <p className="text-sm text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                      {STATUS_LABEL[s.status]}
                    </span>
                  </Link>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ScheduleForm({ studentId, onCreated }: { studentId: string; onCreated: () => void }) {
  const [topic, setTopic] = useState("")
  const [date, setDate] = useState("")
  const [duration, setDuration] = useState(60)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!topic.trim() || !date) {
      setError("Please fill in a topic and a date/time.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/sessions/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          student: Number(studentId),
          topic,
          scheduled_at: new Date(date).toISOString(),
          duration_minutes: Number(duration),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const firstKey = Object.keys(data)[0]
        setError(firstKey ? String(data[firstKey]) : "Could not schedule session.")
        setSaving(false)
        return
      }
      onCreated()
    } catch {
      setError("Could not reach the server.")
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-ring focus:ring-1"
  const labelClass = "mb-1 mt-3 block text-sm font-medium text-muted-foreground"

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display font-semibold">Schedule a session</h2>
      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label className={labelClass}>Topic</label>
        <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Date &amp; time</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Duration (minutes)</label>
            <input
              type="number"
              min={15}
              step={15}
              className={inputClass}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={saving}>
          {saving ? "Scheduling…" : "Schedule session"}
        </Button>
      </form>
    </div>
  )
}