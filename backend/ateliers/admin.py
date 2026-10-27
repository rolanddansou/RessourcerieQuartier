from django.contrib import admin
from .models import Atelier


@admin.action(description="Annuler les ateliers sélectionnés")
def annuler_ateliers(modeladmin, request, queryset):
    queryset.update(annule=True)


@admin.register(Atelier)
class AtelierAdmin(admin.ModelAdmin):
    list_display = ("nom", "date", "lieu", "places_disponible", "annule")
    list_filter = ("annule", "date")
    search_fields = ("nom", "description", "lieu")
    ordering = ("date",)
    actions = (annuler_ateliers,)