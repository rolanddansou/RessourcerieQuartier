from django.contrib import admin
from .models import Atelier, Inscription


@admin.action(description="Annuler les ateliers sélectionnés")
def annuler_ateliers(modeladmin, request, queryset):
    queryset.update(annule=True)


@admin.register(Atelier)
class AtelierAdmin(admin.ModelAdmin):
    list_display = (
        "nom",
        "date",
        "lieu",
        "places_disponible",
        "places_reservees",
        "annule",
    )
    list_filter = ("annule", "date")
    search_fields = ("nom", "description", "lieu")
    ordering = ("date",)
    actions = (annuler_ateliers,)


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