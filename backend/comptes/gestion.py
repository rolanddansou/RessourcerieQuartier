from rest_framework import viewsets

from .models import Utilisateur
from .permissions import EstAdmin
from .serializers import BenevoleSerializer


class BenevoleViewSet(viewsets.ModelViewSet):
    """Martine voit, ajoute, modifie et retire des bénévoles."""

    serializer_class = BenevoleSerializer
    permission_classes = [EstAdmin]
    queryset = (
        Utilisateur.objects.filter(role="benevole", is_superuser=False)
        .order_by("last_name", "first_name")
    )

    def perform_destroy(self, instance):
        # On désactive au lieu d'effacer : rien n'est perdu par erreur.
        instance.is_active = False
        instance.save()
