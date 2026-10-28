from django.contrib import admin
from .models import InfosRessourcerie, Fermeture, CritereDon


@admin.register(InfosRessourcerie)
class InfosRessourcerieAdmin(admin.ModelAdmin):
    list_display = ('adresse', 'telephone', 'email', 'updated_at')


@admin.register(Fermeture)
class FermetureAdmin(admin.ModelAdmin):
    list_display = ('date', 'motif')


@admin.register(CritereDon)
class CritereDonAdmin(admin.ModelAdmin):
    list_display = ('kind', 'label', 'ordre')
    list_filter = ('kind',)
