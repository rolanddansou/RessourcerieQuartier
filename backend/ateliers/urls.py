from django.urls import path

from .views import desinscrire, inscrire, liste_ateliers

urlpatterns = [
    path("", liste_ateliers, name="liste_ateliers"),
    path("<int:atelier_id>/inscriptions/", inscrire, name="inscrire"),
    path("desinscription/<uuid:token>/", desinscrire, name="desinscrire"),
]
