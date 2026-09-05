from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from sessions.models import Session, SessionReview
from students.models import StudentProfile


class Command(BaseCommand):
    help = "Creates demo tutor/student logins and sample sessions for the reviewer to log in immediately."

    def handle(self, *args, **options):
        tutor, created = User.objects.get_or_create(
            username="tutor1", defaults={"role": User.Role.TUTOR}
        )
        if created:
            tutor.set_password("tutorpass123")
            tutor.save()
            self.stdout.write(self.style.SUCCESS("Created tutor1 / tutorpass123"))
        else:
            self.stdout.write("tutor1 already exists")

        student_user, created = User.objects.get_or_create(
            username="student1", defaults={"role": User.Role.STUDENT}
        )
        if created:
            student_user.set_password("studentpass123")
            student_user.save()
            self.stdout.write(self.style.SUCCESS("Created student1 / studentpass123"))
        else:
            self.stdout.write("student1 already exists")

        profile, _ = StudentProfile.objects.get_or_create(
            user=student_user,
            defaults=dict(
                tutor=tutor,
                name="Alex Rivera",
                subject="Algebra 1",
                current_level="Grade 9, mid-level",
                learning_goals="Get comfortable with linear equations before the midterm.",
                weak_areas=(
                    "Mixes up when to divide vs. multiply both sides. "
                    "Struggles with word problems involving rates."
                ),
            ),
        )

        now = timezone.now()

        past_session, created = Session.objects.get_or_create(
            tutor=tutor,
            student=profile,
            topic="Solving one-step linear equations",
            defaults=dict(
                scheduled_at=now - timedelta(days=7),
                duration_minutes=45,
                status=Session.Status.AI_REVIEWED,
                notes=(
                    "Alex got the hang of addition/subtraction equations quickly. "
                    "Still flipping the operation on division equations. Word "
                    "problems slowed him down a lot -- needed help translating "
                    "'twice a number plus 5' into an equation."
                ),
            ),
        )
        if created:
            SessionReview.objects.create(
                session=past_session,
                summary=(
                    "Alex handled addition/subtraction equations confidently but "
                    "still inverts the operation on division equations, and word "
                    "problems remain the main friction point."
                ),
                homework=(
                    "Solve 10 division-based one-step equations\n"
                    "Translate 5 word problems into equations without solving them"
                ),
                next_session_suggestion=(
                    "Spend the first 10 minutes specifically on division equations "
                    "before moving to two-step equations."
                ),
            )
            self.stdout.write(self.style.SUCCESS("Created a demo AI-reviewed session"))

        Session.objects.get_or_create(
            tutor=tutor,
            student=profile,
            topic="Two-step equations and word problems",
            defaults=dict(
                scheduled_at=now + timedelta(days=2, hours=3),
                duration_minutes=45,
                status=Session.Status.SCHEDULED,
            ),
        )

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write("Tutor login:   tutor1 / tutorpass123")
        self.stdout.write("Student login: student1 / studentpass123")
