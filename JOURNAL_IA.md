# Journal d'utilisation de l'IA

Conformément aux règles du projet fil rouge, chaque utilisation d'un outil d'IA est tracée ci-dessous.

| Date | Outil | Prompt résumé | Ce qui a été gardé / intégré |
| :--- | :--- | :--- | :--- |
| 27/10/2026 | Antigravity AI | Prototype interactif (vitrine, ateliers, dons, planning) | Maquette et flux fonctionnel dans le prototype HTML |
| 27/10/2026 | Antigravity AI | Mise en place de l'application Django `core` et déploiement localhost | Modèles (`Benevole`, `Atelier`, `InscriptionAtelier`, `CreneauPermanence`, `DonObjet`), configuration de l'admin Django et endpoints REST API JSON |
| 27/10/2026 | Antigravity AI | Implémentation Solution 1 : Espace Martine et Bénévoles sur React connecté à Django | Composant React (`App.tsx`) avec Tailwind CSS, branché sur l'API Django (`/api/`), routage mobile-first et proxy Vite |
| 28/10/2026 | Claude Sonnet 4.6 | Issue #2 — Refactoring formulaire d'enregistrement de don : rendre le formulaire toujours visible, ajouter le champ `notes`, aligner les 6 catégories avec le modèle Django, réinitialiser le formulaire après soumission | Formulaire permanent dans `App.tsx` (section `benevoleView === 'dons'`), `handleCreateDon` mis à jour avec `notes` et `form.reset()` |
