from django.urls import path

from .views import liste_ateliers

urlpatterns = [
    path("", liste_ateliers, name="liste_ateliers"),
]
