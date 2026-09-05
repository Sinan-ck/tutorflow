from rest_framework.permissions import BasePermission


class IsTutor(BasePermission):
    """
    Server-side role check -- this is what actually stops a student from
    hitting a tutor endpoint directly, not just the frontend hiding a button.
    """
    message = "This action is only available to tutor accounts."

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == "TUTOR")


class IsStudent(BasePermission):
    message = "This action is only available to student accounts."

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == "STUDENT")
