from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStudent, IsTutor
from students.models import StudentProfile

from . import ai
from .models import Session, SessionPlan, SessionReview
from .serializers import NotesUpdateSerializer, SessionSerializer

NOTES_EDITABLE_STATUSES = {Session.Status.SCHEDULED, Session.Status.IN_PROGRESS}
AI_PLAN_ALLOWED_STATUSES = {Session.Status.SCHEDULED, Session.Status.IN_PROGRESS}


class SessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsTutor]
    serializer_class = SessionSerializer

    def get_queryset(self):
        qs = Session.objects.filter(tutor=self.request.user).select_related("student")
        student_id = self.request.query_params.get("student")
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
        session = serializer.save(tutor=self.request.user)
        self._notify_student(session)

    def _notify_student(self, session):
        """Email the student when a tutor schedules a session. Best-effort --
        a failed/missing email should never break scheduling itself."""
        from django.core.mail import send_mail

        student_email = session.student.user.email
        if not student_email:
            return
        try:
            send_mail(
                subject=f"New session scheduled: {session.topic}",
                message=(
                    f"Hi {session.student.name},\n\n"
                    f"Your tutor has scheduled a new session:\n\n"
                    f"Topic: {session.topic}\n"
                    f"When: {session.scheduled_at}\n"
                    f"Duration: {session.duration_minutes} minutes\n\n"
                    f"Log in to TutorFlow to see more details.\n"
                ),
                from_email=None,
                recipient_list=[student_email],
                fail_silently=True,
            )
        except Exception:
            pass


class SessionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsTutor]
    serializer_class = SessionSerializer

    def get_queryset(self):
        return Session.objects.filter(tutor=self.request.user).select_related("student")


class SessionNotesView(APIView):
    """PATCH -> autosaved notes. Blocked once the session is completed/reviewed."""
    permission_classes = [IsTutor]

    def patch(self, request, pk):
        session = get_object_or_404(Session, pk=pk, tutor=request.user)
        if session.status not in NOTES_EDITABLE_STATUSES:
            raise ValidationError({"notes": f"Notes cannot be edited once a session is '{session.status}'."})
        serializer = NotesUpdateSerializer(session, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SessionSerializer(session).data)


class SessionTransitionView(APIView):
    """
    Thin wrapper around Session.transition_to(), which already enforces the
    allowed-next-state map and raises on illegal jumps.
    """
    permission_classes = [IsTutor]
    target_status = None

    def post(self, request, pk):
        session = get_object_or_404(Session, pk=pk, tutor=request.user)
        try:
            session.transition_to(self.target_status)
        except DjangoValidationError as exc:
            raise ValidationError({"status": exc.messages})
        return Response(SessionSerializer(session).data)


class StartSessionView(SessionTransitionView):
    target_status = Session.Status.IN_PROGRESS


class CompleteSessionView(SessionTransitionView):
    target_status = Session.Status.COMPLETED


class SessionAIPlanView(APIView):
    """POST -> generate (or regenerate) the AI plan for an upcoming/ongoing session."""
    permission_classes = [IsTutor]

    def post(self, request, pk):
        session = get_object_or_404(Session, pk=pk, tutor=request.user)
        if session.status not in AI_PLAN_ALLOWED_STATUSES:
            raise ValidationError({"status": f"An AI plan cannot be generated once a session is '{session.status}'."})

        past_sessions = list(
            session.student.sessions.exclude(pk=session.pk)
            .filter(scheduled_at__lt=session.scheduled_at)
            .order_by("scheduled_at")
        )
        try:
            plan_data = ai.generate_session_plan(session.student, past_sessions, session)
        except ai.AIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        SessionPlan.objects.update_or_create(session=session, defaults=plan_data)
        return Response(SessionSerializer(session).data)


class SessionAIReviewView(APIView):
    """
    POST -> reads the notes, generates the review, and (only on success)
    transitions COMPLETED -> AI_REVIEWED. If the AI call fails, the session
    stays COMPLETED so the tutor can just retry.
    """
    permission_classes = [IsTutor]

    def post(self, request, pk):
        session = get_object_or_404(Session, pk=pk, tutor=request.user)
        if session.status != Session.Status.COMPLETED:
            raise ValidationError({"status": "AI review is only available once a session is completed."})

        try:
            review_data = ai.generate_session_review(session.student, session)
        except ai.AIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        SessionReview.objects.update_or_create(session=session, defaults=review_data)
        session.transition_to(Session.Status.AI_REVIEWED)
        return Response(SessionSerializer(session).data)


class ProgressSummaryView(APIView):
    """POST -> sends every AI-reviewed session for this student to the AI, returns a paragraph."""
    permission_classes = [IsTutor]

    def post(self, request, student_id):
        student = get_object_or_404(StudentProfile, pk=student_id, tutor=request.user)
        reviewed = [
            s for s in student.sessions.filter(status=Session.Status.AI_REVIEWED).order_by("scheduled_at")
            if hasattr(s, "ai_review")
        ]
        try:
            summary = ai.generate_progress_summary(student, reviewed)
        except ai.AIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"progress_summary": summary})


class MySessionsView(APIView):
    """A student sees only their own sessions -- never another student's."""
    permission_classes = [IsStudent]

    def get(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)
        sessions = profile.sessions.all().order_by("scheduled_at")
        return Response(SessionSerializer(sessions, many=True).data)
