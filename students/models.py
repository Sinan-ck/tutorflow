from django.conf import settings
from django.db import models


class StudentProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile"
    )

    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="students"
    )

    name = models.CharField(max_length=100)

    subject = models.CharField(max_length=100)

    current_level = models.CharField(max_length=100)

    learning_goals = models.TextField(blank=True)

    weak_areas = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.subject}"