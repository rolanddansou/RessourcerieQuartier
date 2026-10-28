from django.urls import path
from . import views

urlpatterns = [
    path('session/', views.session),
    path('login/', views.sign_in),
    path('logout/', views.sign_out),
    path('availabilities/', views.availabilities),
    path('availabilities/<int:pk>/', views.availability_detail),
    path('volunteers/', views.volunteers),
    path('team-availabilities/', views.team_availabilities),
    path('weeks/', views.weeks),
    path('weeks/<int:pk>/publication/', views.publication),
    path('weeks/<int:pk>/assignments/', views.assignments),
    path('weeks/<int:pk>/assignments/<int:assignment_id>/', views.assignment_detail),
]
