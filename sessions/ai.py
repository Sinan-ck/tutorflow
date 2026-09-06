"""
All AI calls for TutorFlow go through this module. Every prompt is built
from the specific student's profile and session history -- never a bare
"generate a lesson plan" prompt -- and every call site is wrapped so a
failed/slow AI call returns a clean error instead of a 500, and never
leaves a session half-updated.
"""
import json
import logging
import time

from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)


class AIError(Exception):
    """Raised whenever the AI call fails or returns something we can't use."""


def _client():
    if not settings.GROQ_API_KEY:
        raise AIError(
            "GROQ_API_KEY is not set on the server. Add it to your .env "
            "to enable AI features."
        )
    return Groq(api_key=settings.GROQ_API_KEY)


def _call(system_prompt: str, user_prompt: str) -> dict:
    client = _client()
    max_retries = 3
    last_exc = None

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                max_tokens=1500,
            )
            raw_text = (response.choices[0].message.content or "").strip()
            break
        except Exception as exc:
            last_exc = exc
            is_retryable = "429" in str(exc) or "503" in str(exc) or "rate" in str(exc).lower()
            if is_retryable and attempt < max_retries - 1:
                wait = 2 ** attempt
                logger.warning(
                    "Groq API rate/availability issue, retrying in %ss (attempt %s/%s)",
                    wait, attempt + 1, max_retries,
                )
                time.sleep(wait)
                continue
            logger.exception("Groq API call failed")
            raise AIError(f"The AI request failed: {exc}") from exc
    else:
        raise AIError(f"The AI request failed after {max_retries} attempts: {last_exc}")

    cleaned = raw_text.strip("`")
    if cleaned.startswith("json"):
        cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Could not parse AI response as JSON: %s", raw_text)
        raise AIError("The AI returned a response we couldn't parse. Please try again.") from exc


def _lines(items):
    """Join a list of strings into the newline-separated text our TextFields store."""
    if isinstance(items, list):
        return "\n".join(str(i) for i in items)
    return str(items)


PLAN_SYSTEM_PROMPT = (
    "You are an expert 1-on-1 tutor's planning assistant. You write concrete, "
    "specific session plans -- never generic advice. You always respond with "
    "ONLY a single valid JSON object and nothing else."
)

REVIEW_SYSTEM_PROMPT = (
    "You are an expert 1-on-1 tutor's assistant reviewing a session that just "
    "happened, based on the tutor's raw notes. You extract what actually "
    "happened and turn it into useful next steps for the student. You always "
    "respond with ONLY a single valid JSON object and nothing else."
)

PROGRESS_SYSTEM_PROMPT = (
    "You are an expert tutoring coordinator writing a short progress summary "
    "for a student, based on the history of past session reviews. You always "
    "respond with ONLY a single valid JSON object and nothing else."
)


def _format_past_sessions(past_sessions):
    if not past_sessions:
        return "No past sessions yet -- this is the student's first session."
    lines = []
    for s in past_sessions:
        lines.append(f"- {s.scheduled_at.date()} | topic: {s.topic} | status: {s.status}")
        if s.notes:
            lines.append(f"  tutor notes: {s.notes[:600]}")
        if hasattr(s, "ai_review"):
            lines.append(f"  previous review summary: {s.ai_review.summary}")
            lines.append(f"  previous suggestion: {s.ai_review.next_session_suggestion}")
    return "\n".join(lines)


def build_plan_prompt(student, past_sessions, session):
    student_block = (
        f"Name: {student.name}\n"
        f"Subject: {student.subject}\n"
        f"Current level: {student.current_level}\n"
        f"Learning goals: {student.learning_goals or 'Not specified'}\n"
        f"Known weak areas: {student.weak_areas or 'Not specified'}"
    )
    return f"""Plan the upcoming tutoring session below for this specific student.

STUDENT PROFILE
{student_block}

RECENT SESSION HISTORY (oldest to newest)
{_format_past_sessions(past_sessions)}

UPCOMING SESSION
Topic: {session.topic}
Scheduled for: {session.scheduled_at}

INSTRUCTIONS
- Base the plan on this student's actual weak areas and goals, and build on
  what past sessions covered -- do not write a generic lesson plan for the
  topic in isolation.
- If a weak area is directly relevant to today's topic, address it explicitly.

Respond with ONLY this JSON shape:
{{
  "objectives": ["objective 1", "objective 2", ...],
  "lesson_outline": ["point 1", "point 2", "point 3", "point 4"],
  "practice_questions": ["question 1", "question 2", "question 3"]
}}
"""


def build_review_prompt(student, session):
    plan_block = "No AI plan was generated for this session."
    if hasattr(session, "ai_plan"):
        plan_block = (
            f"Objectives: {session.ai_plan.objectives}\n"
            f"Outline: {session.ai_plan.lesson_outline}"
        )
    return f"""A tutoring session just ended. Turn the tutor's raw notes into a
structured review for this specific student.

STUDENT PROFILE
Name: {student.name}
Subject: {student.subject}
Current level: {student.current_level}
Known weak areas: {student.weak_areas or 'Not specified'}

SESSION TOPIC: {session.topic}

THE PLAN GOING INTO THIS SESSION
{plan_block}

TUTOR'S RAW NOTES FROM THE SESSION
{session.notes or '(the tutor did not leave any notes)'}

INSTRUCTIONS
- Base homework directly on what the notes say the student struggled with,
  not generically on the topic.
- The suggestion for next time should follow from this session, not repeat
  the student's general weak areas verbatim.

Respond with ONLY this JSON shape:
{{
  "summary": "2-4 sentence summary of what happened in the session",
  "homework": ["task 1", "task 2", "task 3 (optional)"],
  "next_session_suggestion": "one specific suggestion for what to cover next"
}}
"""


def build_progress_prompt(student, reviewed_sessions):
    lines = []
    for s in reviewed_sessions:
        lines.append(
            f"- {s.scheduled_at.date()} | topic: {s.topic}\n"
            f"  summary: {s.ai_review.summary}\n"
            f"  homework given: {s.ai_review.homework}\n"
            f"  suggestion at the time: {s.ai_review.next_session_suggestion}"
        )
    history = "\n".join(lines) if lines else "No AI-reviewed sessions yet."
    return f"""Write a short progress summary for this student, based on the full
history of their AI-reviewed sessions below.

STUDENT PROFILE
Name: {student.name}
Subject: {student.subject}
Current level: {student.current_level}
Learning goals: {student.learning_goals or 'Not specified'}
Known weak areas: {student.weak_areas or 'Not specified'}

HISTORY OF AI-REVIEWED SESSIONS (oldest to newest)
{history}

INSTRUCTIONS
- Identify a real trend across sessions (improving, plateauing, or
  struggling with something specific) rather than restating the profile.
- Be concrete: name the skill or topic, not just "doing well."

Respond with ONLY this JSON shape:
{{ "progress_summary": "one short paragraph, 3-5 sentences" }}
"""


def generate_session_plan(student, past_sessions, session):
    """Returns dict with objectives/lesson_outline/practice_questions as newline-joined text,
    ready to pass straight into SessionPlan.objects.create(session=..., **result)."""
    data = _call(PLAN_SYSTEM_PROMPT, build_plan_prompt(student, past_sessions, session))
    return {
        "objectives": _lines(data.get("objectives", [])),
        "lesson_outline": _lines(data.get("lesson_outline", [])),
        "practice_questions": _lines(data.get("practice_questions", [])),
    }


def generate_session_review(student, session):
    data = _call(REVIEW_SYSTEM_PROMPT, build_review_prompt(student, session))
    return {
        "summary": data.get("summary", ""),
        "homework": _lines(data.get("homework", [])),
        "next_session_suggestion": data.get("next_session_suggestion", ""),
    }


def generate_progress_summary(student, reviewed_sessions):
    data = _call(PROGRESS_SYSTEM_PROMPT, build_progress_prompt(student, reviewed_sessions))
    return data.get("progress_summary", "")