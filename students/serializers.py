from django.db import transaction
from rest_framework import serializers

from accounts.models import User

from .models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "name", "subject", "current_level",
            "learning_goals", "weak_areas", "username", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StudentProfileCreateSerializer(serializers.ModelSerializer):
    """
    Tutors create student accounts -- there is no public signup. Creates
    the User (role=STUDENT) and the StudentProfile in one atomic step.
    Email is optional; if provided, it's used to notify the student when
    a tutor schedules a session.
    """
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "name", "subject", "current_level",
            "learning_goals", "weak_areas", "username", "password", "email",
        ]
        read_only_fields = ["id"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop("username")
        password = validated_data.pop("password")
        email = validated_data.pop("email", "")
        tutor = self.context["request"].user

        student_user = User.objects.create_user(
            username=username, password=password, email=email, role=User.Role.STUDENT
        )
        return StudentProfile.objects.create(
            tutor=tutor, user=student_user, **validated_data
        )
