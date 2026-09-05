from datetime import timedelta

from rest_framework import serializers

from .models import Session, SessionPlan, SessionReview


class SessionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionPlan
        fields = ["objectives", "lesson_outline", "practice_questions", "created_at"]


class SessionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionReview
        fields = ["summary", "homework", "next_session_suggestion", "created_at"]


class SessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    ends_at = serializers.DateTimeField(read_only=True)
    ai_plan = serializers.SerializerMethodField()
    ai_review = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id", "student", "student_name", "scheduled_at", "duration_minutes",
            "ends_at", "topic", "status", "notes", "ai_plan", "ai_review",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_ai_plan(self, obj):
        # ai_plan is a reverse OneToOne -- accessing it when none exists
        # raises RelatedObjectDoesNotExist, so guard with hasattr.
        if hasattr(obj, "ai_plan"):
            return SessionPlanSerializer(obj.ai_plan).data
        return None

    def get_ai_review(self, obj):
        if hasattr(obj, "ai_review"):
            return SessionReviewSerializer(obj.ai_review).data
        return None

    def validate(self, attrs):
        # Clash check: this tutor cannot have two overlapping sessions.
        tutor = self.context["request"].user
        scheduled_at = attrs.get("scheduled_at")
        duration = attrs.get("duration_minutes", 60)
        if scheduled_at is None:
            return attrs

        new_start = scheduled_at
        new_end = scheduled_at + timedelta(minutes=duration)

        clashing = Session.objects.filter(tutor=tutor).exclude(
            status=Session.Status.AI_REVIEWED
        )
        for other in clashing:
            if new_start < other.ends_at and other.scheduled_at < new_end:
                raise serializers.ValidationError(
                    {
                        "scheduled_at": (
                            f"This clashes with an existing session for "
                            f"{other.student.name} at {other.scheduled_at} "
                            f"(topic: {other.topic})."
                        )
                    }
                )
        return attrs

    def validate_student(self, student):
        tutor = self.context["request"].user
        if student.tutor_id != tutor.id:
            raise serializers.ValidationError("You can only schedule sessions for your own students.")
        return student


class NotesUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["notes"]
