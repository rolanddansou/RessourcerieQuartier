# Ressourcerie Quartier

Backend Django 5.2 LTS (Python 3.12+) et frontend React 19 / TypeScript / Vite (Node.js 22.12+). SQLite pour le développement local.

## Installation (PowerShell, depuis la racine)

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
Push-Location frontend
npm.cmd ci
Pop-Location
.\.venv\Scripts\python backend/manage.py migrate
```

## Démarrer

Dans un premier terminal à la racine :

```powershell
.\.venv\Scripts\python backend/manage.py runserver
```

Dans un deuxième terminal à la racine :

```powershell
Set-Location frontend
npm.cmd run dev
```

Ouvrir http://127.0.0.1:5173. La page vérifie la connexion à Django via `/api/health/`. Vite transmet les requêtes `/api` au backend sur le port 8000.

Administration : http://127.0.0.1:8000/admin/ ; créer un compte avec `.\.venv\Scripts\python backend/manage.py createsuperuser`.

## Gestion des ateliers

Dans l’administration Django, ouvrir **Ateliers** pour créer, modifier ou supprimer un atelier. La liste affiche la capacité, le nombre d’inscrits actifs et les places restantes ; ouvrir un atelier affiche le détail des inscriptions. Ces informations sont accessibles après connexion à un compte administrateur autorisé. Pour une annulation, sélectionner un ou plusieurs ateliers et utiliser l’action **Annuler les ateliers sélectionnés** : ils restent enregistrés dans l’administration mais ne sont plus renvoyés par l’API publique `/api/ateliers/`. Les ateliers actifs apparaissent sur la page d’accueil du frontend.

Le public peut s’inscrire à un atelier avec son nom et son courriel. Une confirmation contenant un lien unique permet de consulter puis confirmer la désinscription ; la place est alors libérée. Les inscriptions sont consultables dans l’administration. En local, les courriels sont affichés dans le terminal Django. Pour envoyer de vrais courriels, configurer `DJANGO_EMAIL_BACKEND` sur `django.core.mail.backends.smtp.EmailBackend`, ainsi que `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` et `DEFAULT_FROM_EMAIL`. `FRONTEND_URL` définit le domaine du lien d’annulation (par défaut `http://127.0.0.1:5173`).

## Vérification

```powershell
.\.venv\Scripts\python backend/manage.py check
.\.venv\Scripts\python backend/manage.py test config ateliers
Push-Location frontend
npm.cmd run build
Pop-Location
```

## Configuration

Les paramètres Django lisent les variables d'environnement `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` et `DJANGO_ALLOWED_HOSTS` (hôtes séparés par des virgules). En local, les valeurs par défaut suffisent. Les fichiers `.env` ne sont pas chargés automatiquement.

Cette base est configurée pour le développement. Avant un déploiement, définir une clé secrète privée, désactiver DEBUG, renseigner les hôtes et configurer le serveur, HTTPS et la distribution du frontend compilé.
