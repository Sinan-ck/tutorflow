# TutorFlow

A session platform for online tutors. Tutors manage students, schedule and run sessions,
and use AI to plan sessions before they start and review them afterwards. Students log in
to see their own upcoming sessions, past notes, and AI-generated homework.

## What works / what doesn't (read this first)

**Working, end to end — tested manually via curl and in-browser:**
- Login with two roles (tutor / student), JWT-based, roles enforced server-side on every
  endpoint (`IsTutor`/`IsStudent` permission classes, not just hidden UI)
- Tutors create student accounts (no public signup)
- Student profiles (name, subject, level, goals, weak areas)
- Scheduling sessions with clash detection (checks overlapping time ranges per tutor,
  using `duration_minutes` and a computed `ends_at`)
- The 4-state session lifecycle (`SCHEDULED → IN_PROGRESS → COMPLETED → AI_REVIEWED`),
  enforced by `Session.transition_to()` on the model itself, so no view can skip a state
- AI session plan generation (learning objectives, lesson outline, practice questions),
  built from the student's profile *and* their past session history
- Session notes with debounced autosave (900ms), locked once a session leaves
  `SCHEDULED`/`IN_PROGRESS`
- AI session review (summary, homework, suggestion for next time), triggered on a
  completed session, which also performs the `COMPLETED → AI_REVIEWED` transition
- Progress view: all of a student's sessions in order, plus an AI-generated progress
  summary across every past AI review
- Student view: upcoming sessions, read-only notes from past sessions, homework
- Email notification when a tutor schedules a session (Django console backend — prints
  the email to the server terminal; confirmed firing correctly on session creation)
- Graceful AI failure handling: a failed/invalid-key Gemini call returns a clean error
  message to the frontend instead of a 500, and never leaves a session half-updated

**Not built:**
- Real outbound email (Resend/SMTP) — currently uses Django's console backend, which
  satisfies the feature functionally for local testing but doesn't send real email
- Automated tests (`tests.py` files are present but empty; everything was verified
  manually — see the AI features and session-state sections above)
- Password reset / account recovery
- Real-time updates (a student's screen doesn't auto-refresh if a tutor is mid-session;
  a page reload picks up changes)

**What I'd do with another day:** I'd wire up Resend for real email delivery, since the
console-backend version already proves the trigger logic works and swapping the backend
is a five-minute change. I'd add a handful of Django `APITestCase` tests specifically for
the state machine and the clash-detection logic, since those are the two places a silent
regression would be most damaging. I'd add optimistic UI updates on the notes autosave so
the textarea never feels laggy on a slow connection. I'd paginate the tutor's session list
once a tutor has more than a handful of students. Finally, I'd add rate-limiting around
the AI endpoints so a tutor can't accidentally exhaust the Gemini quota by repeatedly
clicking "regenerate plan."

## Test logins

| Role    | Username  | Password       |
|---------|-----------|----------------|
| Tutor   | `tutor1`  | `tutorpass123` |
| Student | `student1`| `studentpass123` |

Created by `python manage.py seed_demo`, which also adds an AI-reviewed session with real
notes and homework, and one upcoming scheduled session, so there's something to look at
immediately.

## Stack

- **Backend:** Django + Django REST Framework, JWT auth (`djangorestframework-simplejwt`),
  split into three apps — `accounts` (custom User + roles), `students` (StudentProfile),
  `sessions` (Session/SessionPlan/SessionReview, internally labeled `tutor_sessions` to
  avoid colliding with Django's built-in `django.contrib.sessions` app)
- **Database:** SQLite for local dev; swaps to Postgres via `DATABASE_URL` for production
- **Frontend:** Next.js (App Router) + Tailwind v4, plain fetch calls to the Django API
- **AI:** Google Gemini (`gemini-2.0-flash`), called only from the backend — the API key
  never reaches the browser
- **Email:** Django's console email backend for local/demo use (see "what's not built")

## Database schema
User (accounts.User, extends Django's AbstractUser)
├── id
├── username, password (hashed), email, etc. — standard Django auth fields
└── role: "TUTOR" | "STUDENT" | "ADMIN" (ADMIN reserved, unused by the app currently)

StudentProfile (students.StudentProfile)
├── id
├── tutor_id → FK to User (role=TUTOR) — which tutor owns this student
├── user_id → OneToOne to User (role=STUDENT) — the student's own login
├── name, subject, current_level
├── learning_goals (text)
├── weak_areas (text, free-form — this is what the AI reads)
└── created_at

Session (sessions.Session, app label "tutor_sessions")
├── id
├── tutor_id → FK to User (role=TUTOR)
├── student_id → FK to StudentProfile
├── scheduled_at, duration_minutes (default 60)
├── topic
├── status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "AI_REVIEWED"
├── notes (text, autosaved)
├── created_at, updated_at
├── UniqueConstraint(tutor, scheduled_at) — exact-timestamp safety net
└── ends_at — computed property (scheduled_at + duration_minutes), used for real
overlap-based clash detection in the serializer, not just exact-time matching

SessionPlan (OneToOne → Session, related_name "ai_plan")
├── objectives, lesson_outline, practice_questions (each a newline-joined TextField)
└── created_at

SessionReview (OneToOne → Session, related_name "ai_review")
├── summary, homework, next_session_suggestion (TextFields; homework is newline-joined)
└── created_at


**Relationships:** one tutor `User` has many `StudentProfile`s and many `Session`s. Each
`StudentProfile` has exactly one student `User` login (`OneToOneField`) and many
`Session`s. Each `Session` optionally has one `SessionPlan` and one `SessionReview`
(`OneToOneField`s) — accessing `session.ai_plan`/`session.ai_review` when none exists
raises `RelatedObjectDoesNotExist`, so the API layer always guards with `hasattr()`
before serializing.

**Why `SessionPlan`/`SessionReview` are separate models instead of JSON fields on
`Session`:** keeps `Session` itself lean, and makes the AI-generated content easy to
query/inspect independently (e.g. in Django admin) without parsing JSON blobs. The
tradeoff is that list-shaped AI output (objectives, homework items) is stored as
newline-joined text rather than a real array, so the frontend does a `.split("\n")`
when rendering — a deliberate simplicity/normalization tradeoff, not an oversight.

**Why `Session.transition_to()` lives on the model rather than in a separate state
module:** it keeps the state machine and the data it protects in the same place, and
`clean()` + `full_clean()` in `save()` means an invalid session (e.g. a student that
doesn't belong to the assigned tutor) can never be persisted, transition or no
transition.

## AI prompts, and why they're written this way

All prompt-building lives in `sessions/ai.py`. The rubric line that mattered most while
writing these: *"A prompt that only says 'generate a lesson plan' will score low, because
it ignores everything you know about the student."* Every prompt below is built from the
specific student's row in the database and their session history, never just a topic
string.

**1. Session plan** (`build_plan_prompt`) — sent before a session starts:

Plan the upcoming tutoring session below for this specific student.

STUDENT PROFILE
Name: Alex Rivera
Subject: Algebra 1
Current level: Grade 9, mid-level
Learning goals: Get comfortable with linear equations before the midterm.
Known weak areas: Mixes up when to divide vs. multiply both sides. Struggles
with word problems involving rates.

RECENT SESSION HISTORY (oldest to newest)

2026-08-28 | topic: Solving one-step linear equations | status: AI_REVIEWED
tutor notes: Alex got the hang of addition/subtraction equations quickly...
previous review summary: ...
previous suggestion: ...

UPCOMING SESSION
Topic: Two-step equations and word problems
Scheduled for: 2026-09-06 09:09:10+00:00

INSTRUCTIONS

Base the plan on this student's actual weak areas and goals, and build on
what past sessions covered -- do not write a generic lesson plan for the
topic in isolation.
If a weak area is directly relevant to today's topic, address it explicitly.

Respond with ONLY this JSON shape: { objectives, lesson_outline, practice_questions }


Why: without the weak-areas line and the past-session history, the model would happily
generate a generic "two-step equations" lesson. With them, it's pushed to specifically
address the division-vs-multiplication mix-up and the word-problem translation gap that
actually showed up in the last session — the instructions paragraph exists to make that
non-optional rather than something the model might skip.

**2. Session review** (`build_review_prompt`) — sent after a session is marked completed,
reads the tutor's raw notes and the plan that was made beforehand:

A tutoring session just ended. Turn the tutor's raw notes into a structured
review for this specific student.

STUDENT PROFILE
Name: Alex Rivera ...

SESSION TOPIC: Two-step equations and word problems

THE PLAN GOING INTO THIS SESSION
Objectives: Understand two-step equations...
Outline: Warm-up with one-step review...

TUTOR'S RAW NOTES FROM THE SESSION
Alex got two-step equations quickly, still slips on distributing a negative...

INSTRUCTIONS

Base homework directly on what the notes say the student struggled with,
not generically on the topic.
The suggestion for next time should follow from this session, not repeat
the student's general weak areas verbatim.

Respond with ONLY this JSON shape: { summary, homework, next_session_suggestion }


Why: feeding the original plan back in lets the model notice when the session diverged
from what was intended, and the explicit instruction to derive homework from *the notes*
rather than the topic exists because "generate homework for two-step equations" is
exactly the kind of generic output the brief warns against.

**3. Progress summary** (`build_progress_prompt`) — sent on demand from the student
detail page, aggregates every past AI-reviewed session:

Write a short progress summary for this student, based on the full history
of their AI-reviewed sessions below.

STUDENT PROFILE
...

HISTORY OF AI-REVIEWED SESSIONS (oldest to newest)

2026-08-28 | topic: Solving one-step linear equations
summary: ...
homework given: ...
suggestion at the time: ...

INSTRUCTIONS

Identify a real trend across sessions (improving, plateauing, or
struggling with something specific) rather than restating the profile.
Be concrete: name the skill or topic, not just "doing well."

Respond with ONLY this JSON shape: { progress_summary }


Why: the instruction to find a *trend* (not just restate the profile) exists because the
naive version of this prompt tends to produce "Alex is doing well in Algebra 1 and has
weak areas in X" — which is just the profile read back, not an actual progress signal.
In testing, this prompt correctly identified that Alex's friction was specifically with
division-based equations and word-problem translation, not a generic "needs more
practice" statement.

All three calls request `response_mime_type="application/json"` from Gemini so the model
is constrained to valid JSON at the API level, plus a defensive parse in `_call()` for
edge cases (stray markdown fences). If the Gemini call throws for any reason (bad key,
network issue, rate limit), `AIError` is caught at the view layer and returned as an HTTP
502 with a readable message — the session row itself is never partially updated (e.g. the
`COMPLETED → AI_REVIEWED` transition only happens *after* a successful review is saved).

## Local setup

### Backend

```bash
cd tutorflow  # project root, where manage.py lives
python3 -m venv tenv
source tenv/bin/activate
pip install -r requirements.txt

# create .env in the project root:
cat > .env << 'EOF'
DJANGO_SECRET_KEY=change-me-to-a-long-random-string
DJANGO_DEBUG=True
GEMINI_API_KEY=your-real-gemini-key-here
GEMINI_MODEL=gemini-2.0-flash
CORS_ALLOWED_ORIGINS=http://localhost:3000
EOF

python manage.py migrate
python manage.py seed_demo   # creates tutor1 / student1 test logins + demo data
python manage.py runserver
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

Frontend runs at `http://localhost:3000`.

**You need both servers running at the same time**, in separate terminal tabs.

## Deployment

**Backend → Render (or Railway):**
1. Push this repo to GitHub (already done).
2. New Web Service on Render, root directory set to the project root (where `manage.py`
   lives — not a `backend/` subfolder, since this project keeps `manage.py` at the top
   level alongside the `accounts`/`students`/`sessions`/`backend` apps).
3. Build command:
   `pip install -r requirements.txt && python manage.py migrate && python manage.py seed_demo && python manage.py collectstatic --noinput`
4. Start command: `gunicorn backend.wsgi:application`
5. Environment variables: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`,
   `DJANGO_ALLOWED_HOSTS=<your-render-domain>`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
   `CORS_ALLOWED_ORIGINS=<your-vercel-frontend-url>`.
6. Add a free Postgres instance on Render and set `DATABASE_URL` — otherwise SQLite runs
   on Render's ephemeral disk and resets on every redeploy.

**Frontend → Vercel:**
1. New Project, root directory `frontend`. Framework preset: Next.js (auto-detected).
2. Environment variable: `NEXT_PUBLIC_API_URL=https://<your-render-backend-domain>/api`.
3. Deploy. Once live, go back to Render and set `CORS_ALLOWED_ORIGINS` to this exact
   Vercel URL, then redeploy the backend so CORS actually allows the real frontend origin.

Total: two deploys, one shared URL passed between them via env vars, one CORS setting to
update once the frontend's final URL is known.