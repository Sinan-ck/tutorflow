from django.urls import path

from . import views

urlpatterns = [
    path("sessions/", views.SessionListCreateView.as_view(), name="session-list-create"),
    path("sessions/<int:pk>/", views.SessionDetailView.as_view(), name="session-detail"),
    path("sessions/<int:pk>/notes/", views.SessionNotesView.as_view(), name="session-notes"),
    path("sessions/<int:pk>/start/", views.StartSessionView.as_view(), name="session-start"),
    path("sessions/<int:pk>/complete/", views.CompleteSessionView.as_view(), name="session-complete"),
    path("sessions/<int:pk>/ai-plan/", views.SessionAIPlanView.as_view(), name="session-ai-plan"),
    path("sessions/<int:pk>/ai-review/", views.SessionAIReviewView.as_view(), name="session-ai-review"),
    path(
        "students/<int:student_id>/progress-summary/",
        views.ProgressSummaryView.as_view(),
        name="progress-summary",
    ),
    path("student/me/sessions/", views.MySessionsView.as_view(), name="my-sessions"),
]
