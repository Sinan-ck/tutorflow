from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTutor
from sessions.models import Session
from sessions.serializers import SessionSerializer

from .models import StudentProfile
from .serializers import StudentProfileCreateSerializer, StudentProfileSerializer


class StudentListCreateView(generics.ListCreateAPIView):
    """GET: this tutor's students only. POST: create a new student login + profile."""
    permission_classes = [IsTutor]

    def get_queryset(self):
        return StudentProfile.objects.filter(tutor=self.request.user).order_by("name")

    def get_serializer_class(self):
        return StudentProfileCreateSerializer if self.request.method == "POST" else StudentProfileSerializer


class StudentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsTutor]
    serializer_class = StudentProfileSerializer

    def get_queryset(self):
        # Scoping by tutor is what stops one tutor reading another tutor's student.
        return StudentProfile.objects.filter(tutor=self.request.user)


class StudentSessionsView(generics.ListAPIView):
    """All sessions for one of this tutor's students, in order -- the Progress view."""
    permission_classes = [IsTutor]
    serializer_class = SessionSerializer

    def get_queryset(self):
        student = get_object_or_404(
            StudentProfile, pk=self.kwargs["student_id"], tutor=self.request.user
        )
        return student.sessions.all()


from accounts.permissions import IsStudent


class MyProfileView(APIView):
    """A student's own profile -- read-only, scoped to request.user."""
    permission_classes = [IsStudent]

    def get(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)
        return Response(StudentProfileSerializer(profile).data)
