from django.contrib import admin
from django.db.models import Count, Q

from .models import Atelier, Inscription


@admin.action(description="Annuler les ateliers sélectionnés")
def annuler_ateliers(modeladmin, request, queryset):
    queryset.update(annule=True)


class InscriptionInline(admin.TabularInline):
    model = Inscription
    fields = ("nom", "email", "active", "creee_le")
    readonly_fields = fields
    extra = 0
    can_delete = False
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Atelier)
class AtelierAdmin(admin.ModelAdmin):
    list_display = (
        "nom",
        "date",
        "lieu",
        "places_disponible",
        "inscrits_actifs",
        "places_restantes",
        "annule",
    )
    list_filter = ("annule", "date")
    search_fields = ("nom", "description", "lieu")
    ordering = ("date",)
    actions = (annuler_ateliers,)
    inlines = (InscriptionInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _inscrits_actifs=Count(
                "inscriptions",
                filter=Q(inscriptions__active=True),
            )
        )

    @admin.display(description="Inscrits actifs", ordering="_inscrits_actifs")
    def inscrits_actifs(self, obj):
        return obj._inscrits_actifs

    @admin.display(description="Places restantes")
    def places_restantes(self, obj):
        return max(0, obj.places_disponible - obj._inscrits_actifs)


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ("nom", "email", "atelier", "active", "creee_le")
    list_filter = ("active", "atelier")
    search_fields = ("nom", "email", "atelier__nom")
    readonly_fields = ("atelier", "nom", "email", "token", "active", "creee_le")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False