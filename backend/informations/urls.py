from django.urls import path
from . import views

urlpatterns = [
    path('infos/', views.api_infos, name='infos'),
    path('fermetures/', views.api_fermetures, name='fermetures'),
    path('fermetures/<int:pk>/', views.api_fermeture_detail, name='fermeture_detail'),
    path('criteres/', views.api_criteres, name='criteres'),
    path('criteres/<int:pk>/', views.api_critere_detail, name='critere_detail'),
]
