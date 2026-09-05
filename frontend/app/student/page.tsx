"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

type Profile = {
  name: string
  subject: string
  current_level: string
}

type Session = {
  id: number
  topic: string
  scheduled_at: string
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "AI_REVIEWED"
  notes: string
  ai_review: { homework: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  AI_REVIEWED: "Reviewed",
}

function authHeaders() {
  const token = localStorage.getItem("access")
  return { Authorization: `Bearer ${token}` }
}

function lines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
}

export default function StudentView() {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) {
      router.replace("/login")
      return
    }
    if (role !== "STUDENT") {
      router.replace("/tutor")
      return
    }
    setUsername(localStorage.getItem("username"))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      const [profileRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/student/me/profile/`, { headers: authHeaders() }),
        fetch(`${API_URL}/student/me/sessions/`, { headers: authHeaders() }),
      ])
      if (!profileRes.ok || !sessionsRes.ok) throw new Error()
      setProfile(await profileRes.json())
      setSessions(await sessionsRes.json())
    } catch {
      setError("Could not load your sessions.")
    }
  }

  function handleLogout() {
    localStorage.clear()
    router.push("/login")
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar username={username} onLogout={handleLogout} />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!sessions) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar username={username} onLogout={handleLogout} />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  const upcoming = sessions.filter((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS")
  const past = sessions.filter((s) => s.status === "COMPLETED" || s.status === "AI_REVIEWED")

  return (
    <div className="min-h-screen bg-background">
      <Topbar username={username} onLogout={handleLogout} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {profile && (
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Hi, {profile.name.split(" ")[0]}
          </h1>
        )}

        <h2 className="mt-8 font-display text-lg font-semibold">Upcoming sessions</h2>
        {upcoming.length === 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No upcoming sessions.
          </div>
        )}
        <div className="mt-3 space-y-3">
          {upcoming.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold">{s.topic}</p>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 font-display text-lg font-semibold">Past sessions</h2>
        {past.length === 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No past sessions yet.
          </div>
        )}
        <div className="mt-3 space-y-3">
          {past.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold">{s.topic}</p>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()}</p>

              {s.notes && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Session notes
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{s.notes}</p>
                </div>
              )}

              {s.ai_review?.homework && lines(s.ai_review.homework).length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your homework
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {lines(s.ai_review.homework).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!s.notes && !s.ai_review && (
                <p className="mt-3 text-sm text-muted-foreground">No notes recorded for this session.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Topbar({ username, onLogout }: { username: string | null; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TutorFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          {username && <span className="text-sm text-muted-foreground">{username}</span>}
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}