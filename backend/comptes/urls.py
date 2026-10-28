from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views
from .gestion import BenevoleViewSet

router = SimpleRouter()
router.register("benevoles", BenevoleViewSet, basename="benevole")

urlpatterns = [
    path("login/", views.login),
    path("logout/", views.logout),
    path("me/", views.me),
] + router.urls