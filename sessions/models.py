from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Session(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        AI_REVIEWED = "AI_REVIEWED", "AI Reviewed"

    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_sessions"
    )
    student = models.ForeignKey(
        "students.StudentProfile",
        on_delete=models.CASCADE,
        related_name="sessions"
    )
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    topic = models.CharField(max_length=200)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tutor", "scheduled_at"],
                name="unique_tutor_session_time"
            )
        ]
        indexes = [
            models.Index(fields=["tutor", "status"]),
        ]
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"{self.student.name} - {self.topic}"

    @property
    def ends_at(self):
        from datetime import timedelta
        return self.scheduled_at + timedelta(minutes=self.duration_minutes)

    def clean(self):
        if self.student.tutor_id != self.tutor_id:
            raise ValidationError(
                "This student does not belong to this tutor."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def transition_to(self, new_status):
        allowed_transitions = {
            self.Status.SCHEDULED: self.Status.IN_PROGRESS,
            self.Status.IN_PROGRESS: self.Status.COMPLETED,
            self.Status.COMPLETED: self.Status.AI_REVIEWED,
        }
        if allowed_transitions.get(self.status) != new_status:
            raise ValidationError(
                f"Invalid status transition: "
                f"{self.status} → {new_status}"
            )
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])
class SessionPlan(models.Model):
    session = models.OneToOneField(
        Session,
        on_delete=models.CASCADE,
        related_name="ai_plan"
    )

    objectives = models.TextField()
    lesson_outline = models.TextField()
    practice_questions = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Plan - {self.session.topic}"


class SessionReview(models.Model):
    session = models.OneToOneField(
        Session,
        on_delete=models.CASCADE,
        related_name="ai_review"
    )

    summary = models.TextField()
    homework = models.TextField()
    next_session_suggestion = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Review - {self.session.topic}"        