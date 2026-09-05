"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

type Student = {
  id: number
  name: string
  subject: string
  current_level: string
  username: string
}

function authHeaders() {
  const token = localStorage.getItem("access")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export default function TutorDashboard() {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[] | null>(null)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) {
      router.replace("/login")
      return
    }
    if (role !== "TUTOR") {
      router.replace("/student")
      return
    }
    setUsername(localStorage.getItem("username"))
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStudents() {
    try {
      const res = await fetch(`${API_URL}/students/`, { headers: authHeaders() })
      if (!res.ok) throw new Error("Failed to load students")
      setStudents(await res.json())
    } catch (err) {
      setError("Could not load students.")
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
          <div className="flex items-center gap-3">
            {username && <span className="text-sm text-muted-foreground">{username}</span>}
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Tutor</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Your students</h1>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add student"}</Button>
        </div>

        {showForm && (
          <AddStudentForm
            onCreated={() => {
              setShowForm(false)
              loadStudents()
            }}
          />
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {students === null && !error && <p className="mt-6 text-sm text-muted-foreground">Loading students…</p>}

        {students && students.length === 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No students yet. Click "+ Add student" to create your first student account.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {students &&
            students.map((s) => (
              <Link
                key={s.id}
                href={`/tutor/students/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div>
                  <p className="font-display font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.subject} · level: {s.current_level} · login: {s.username}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">View →</span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}

function AddStudentForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    current_level: "",
    learning_goals: "",
    weak_areas: "",
    username: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/students/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        const firstKey = Object.keys(data)[0]
        setError(firstKey ? String(data[firstKey]) : "Could not create student.")
        setSaving(false)
        return
      }
      onCreated()
    } catch (err) {
      setError("Could not reach the server.")
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-ring focus:ring-1"
  const labelClass = "mb-1 mt-3 block text-sm font-medium text-muted-foreground"

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display font-semibold">New student</h2>
      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Student name</label>
            <input className={inputClass} value={form.name} onChange={set("name")} required />
            <label className={labelClass}>Subject</label>
            <input className={inputClass} value={form.subject} onChange={set("subject")} required />
            <label className={labelClass}>Current level</label>
            <input className={inputClass} value={form.current_level} onChange={set("current_level")} required />
          </div>
          <div>
            <label className={labelClass}>Login username</label>
            <input className={inputClass} value={form.username} onChange={set("username")} required />
            <label className={labelClass}>Login password</label>
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={set("password")}
              minLength={6}
              required
            />
          </div>
        </div>
        <label className={labelClass}>Learning goals</label>
        <textarea className={inputClass} rows={2} value={form.learning_goals} onChange={set("learning_goals")} required />
        <label className={labelClass}>Weak areas (free text — this is what the AI reads)</label>
        <textarea className={inputClass} rows={2} value={form.weak_areas} onChange={set("weak_areas")} />
        <Button type="submit" className="mt-4" disabled={saving}>
          {saving ? "Creating…" : "Create student"}
        </Button>
      </form>
    </div>
  )
}