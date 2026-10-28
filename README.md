# Ressourcerie Quartier

Backend Django 5.2 LTS (Python 3.12+) et frontend React 19 / TypeScript / Vite (Node.js 22.12+). SQLite pour le développement local.

## Installation (PowerShell, depuis la racine)

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend/requirements.txt
Push-Location frontend
npm.cmd ci
npm.cmd run build
Pop-Location
.\.venv\Scripts\python backend/manage.py migrate
.\.venv\Scripts\python backend/manage.py collectstatic --noinput
```

## Démarrer

Un seul serveur est nécessaire. Depuis la racine :

```powershell
.\.venv\Scripts\python backend/manage.py runserver
```

Ouvrir http://127.0.0.1:8000/admin/planning/ (la racine http://127.0.0.1:8000/ y redirige). Le planning React, les API et l'administration Django partagent la même adresse et la même session. Aucun serveur Node/Vite ne doit rester lancé.

Après une modification du frontend, recompiler puis redémarrer Django :

```powershell
Push-Location frontend
npm.cmd run build
Pop-Location
.\.venv\Scripts\python backend/manage.py collectstatic --noinput
```

Les fichiers compilés se trouvent dans `frontend/dist/` et sont servis sous `/static/planning/`. WhiteNoise assure la distribution des fichiers statiques, y compris lorsque `DJANGO_DEBUG=false` après `collectstatic`. Si le frontend n'a pas été compilé, `/admin/planning/` indique la commande à exécuter avec une réponse HTTP 503. Ne pas mettre en cache la page HTML d'entrée, afin de charger les nouveaux fichiers après une compilation.

Pour travailler sur React avec actualisation à chaud, le mode Vite reste disponible en option : lancer Django puis `npm.cmd run dev` depuis `frontend/` et ouvrir http://127.0.0.1:5173. Ce mode utilise deux serveurs uniquement pendant le développement frontend ; les API sont transmises à Django sur le port 8000. Le point de contrôle `/api/health/` reste disponible.

Administration : http://127.0.0.1:8000/admin/ ; créer un compte avec `.\.venv\Scripts\python backend/manage.py createsuperuser`.

## Vérification

```powershell
.\.venv\Scripts\python backend/manage.py check
.\.venv\Scripts\python backend/manage.py test planning config
Push-Location frontend
npm.cmd run build
Pop-Location
```

Les parcours frontend sont testés avec Playwright et une API simulée, sans toucher à la base locale :

```powershell
Push-Location frontend
npm.cmd run test:e2e
Pop-Location
```

Sur Windows, les tests utilisent Microsoft Edge installé. Sur les autres systèmes, installer le navigateur de test avec `npx playwright install chromium`. On peut aussi choisir un canal avec `PLAYWRIGHT_CHANNEL`. Le serveur de test Vite utilise le port 5184, indépendant du serveur de développement. Les scénarios couvrent notamment les erreurs de chargement, la session expirée, la conservation des saisies, la validation des horaires, la publication, la confirmation de suppression et l’édition sur mobile à 320 px.

## Configuration

Les paramètres Django lisent les variables d'environnement `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` et `DJANGO_ALLOWED_HOSTS` (hôtes séparés par des virgules). En local, les valeurs par défaut suffisent. Les fichiers `.env` ne sont pas chargés automatiquement.

Cette base est configurée pour le développement. Avant un déploiement, définir une clé secrète privée, désactiver DEBUG, renseigner les hôtes, compiler le frontend puis exécuter `collectstatic`. Utiliser un serveur WSGI/ASGI adapté et configurer HTTPS ; `runserver` reste réservé au développement. WhiteNoise est configuré suivant sa [documentation Django](https://whitenoise.readthedocs.io/en/stable/django.html).

## Planning : comptes et utilisation

Après les migrations, créer le groupe et des comptes locaux de démonstration. Les identifiants ci-dessous sont des exemples : choisir ses propres noms. Chaque création demande un mot de passe et sa confirmation, sans valeur par défaut ; un compte existant n'est jamais remplacé.

```powershell
.\.venv\Scripts\python backend/manage.py setup_planning
.\.venv\Scripts\python backend/manage.py create_planning_demo --username mon-admin --role admin
.\.venv\Scripts\python backend/manage.py create_planning_demo --username mon-benevole --role benevole
```

L'adaptateur provisoire reconnaît les superutilisateurs comme administrateurs et les membres du groupe `benevole` comme bénévoles. Un compte peut posséder les deux rôles. Le statut `is_staff` seul ne donne pas accès à la gestion du planning.

1. Le bénévole se connecte et ajoute ses dates, plages horaires et détails dans « Mes disponibilités ».
2. L'administrateur ouvre « Gestion du planning », choisit la semaine et crée son brouillon.
3. Il prépare les affectations depuis les disponibilités ou saisit des horaires couverts par une disponibilité.
4. Il publie le planning : tous les bénévoles voient les noms, horaires et notes. Les détails des disponibilités restent privés au bénévole et aux administrateurs.

Une disponibilité utilisée ne peut plus être supprimée ou modifiée de façon incompatible ; l'administrateur doit d'abord ajuster ou supprimer les affectations. Les changements d'un planning publié sont visibles à la prochaine consultation ou actualisation, sans notification. Dépublier masque le planning aux bénévoles.

Semaines du lundi au dimanche, horaires locaux de Paris, pas de plage traversant minuit. Pour une plage nocturne, saisir deux disponibilités et affectations sur les deux jours. Les plages adjacentes sont autorisées. Les notes et détails sont limités à 2 000 caractères.

## Contrat d'intégration avec le module User

Le planning ne définit aucun modèle User et n'a aucune clé étrangère vers les utilisateurs. `Availability.user_ref` et `Assignment.user_ref` sont des identifiants opaques de 255 caractères maximum.

Le port `UserDirectory` dans `backend/planning/users.py` expose :

- `current(request) -> Identity | None` : identité issue d'une authentification serveur fiable, jamais d'un rôle ou identifiant envoyé librement par le navigateur.
- `volunteers() -> list[Identity]` : annuaire des bénévoles, y compris les inactifs pour conserver les noms des affectations historiques.
- `Identity(id: str, name: str, roles: tuple[str, ...], active: bool)` : identifiant stable, nom affiché, rôles `admin` et/ou `benevole`, statut actif.

Configurer `PLANNING_USER_DIRECTORY` dans les paramètres Django avec le chemin Python de la classe adaptatrice, instanciable sans argument. L'adaptateur Django initial utilise `str(user.pk)` ; préserver ces références ou exécuter une migration explicite des deux champs lors du branchement du module User. Un identifiant ne doit jamais être réattribué à une autre personne. Une identité supprimée de l'annuaire apparaît comme « Bénévole indisponible » dans les anciennes affectations. Les nouvelles affectations nécessitent un bénévole actif.

La connexion commune utilise le formulaire Django sur `/admin/login/`. Le frontend redirige vers ce formulaire sans demander lui-même les mots de passe. `session/` retourne l'identité du port et un jeton CSRF ; `logout/` termine la session partagée. L'ancienne API JSON `login/` reste disponible pour compatibilité, mais n'est plus utilisée par l'interface. Le futur module User pourra remplacer l'adaptateur ; le frontend n'envoie aucun rôle. Le test avec `FakeDirectory` démontre l'usage de références externes sans compte Django.

### API JSON (`/api/planning/`)

| Route | Méthodes | Accès / contenu |
| --- | --- | --- |
| `session/` | GET | Public : `{user, csrf}` |
| `login/` | POST | Public + CSRF : `{username, password}` ; retourne `{user, csrf}` renouvelé |
| `logout/` | POST | Connecté + CSRF |
| `availabilities/?week=YYYY-MM-DD` | GET | Bénévole : ses plages, réponse `{items: [...]}` |
| `availabilities/` | POST | Bénévole : `{date, start, end, details?}` |
| `availabilities/<id>/` | PUT, DELETE | Bénévole propriétaire ; PUT remplace tous les champs |
| `volunteers/` | GET | Admin : `{items: Identity[]}` actifs |
| `team-availabilities/?week=YYYY-MM-DD` | GET | Admin : toutes les disponibilités de la semaine |
| `weeks/?week=YYYY-MM-DD` | GET | Connecté : `{items: [...]}` ; brouillons réservés aux admins |
| `weeks/` | POST | Admin : `{week}` (lundi) ; création idempotente |
| `weeks/<id>/publication/` | POST | Admin : `{published: boolean}` |
| `weeks/<id>/assignments/` | POST | Admin : `{user_ref, date, start, end, note?}` |
| `weeks/<id>/assignments/<id>/` | PUT, DELETE | Admin ; PUT remplace tous les champs |

Dates ISO `YYYY-MM-DD`, heures `HH:MM`. Un planning contient `{id, week, published, assignments}`. Les disponibilités contiennent `{id, user_ref, date, start, end, details}` ; les affectations utilisent `note` à la place de `details`, et les réponses de planning ajoutent `name`.

Les erreurs métier retournent `{errors: {champ: [messages]}}` avec HTTP 400 ; authentification 401, permission 403, ressource absente 404, conflit d'intégrité 409. Une erreur CSRF est un HTTP 403 standard Django. Toutes les mutations exigent le jeton CSRF obtenu via `session/` et transmis dans `X-CSRFToken`. L'adaptateur et la session sont vérifiés à chaque requête.

Les écritures du planning sont sérialisées par un verrou en base (`PlanningWriteLock`) à l'intérieur des transactions : les contrôles de chevauchement et de couverture restent cohérents lors de modifications concurrentes. En cas de contention SQLite, l'API renvoie 409 et demande de réessayer. Cette sérialisation globale privilégie la simplicité pour cette première version ; elle peut être affinée si le volume augmente.

## Connexion commune et contrôle d'accès

- Connexion de tous les profils : http://127.0.0.1:8000/admin/login/ (formulaire Django).
- Bénévoles : redirection vers `/admin/planning/`, sans `is_staff` ni accès aux modèles d'administration.
- Comptes staff : accès à `/admin/` selon les permissions Django existantes. La gestion du planning reste réservée au rôle `admin` fourni par le port utilisateurs (superutilisateur dans l'adaptateur provisoire).
- Un compte actif sans rôle planning et sans accès staff est refusé par le formulaire commun. L'accès au planning est revérifié à chaque page et à chaque API.
- Les visiteurs non connectés sont redirigés vers la connexion. Une session expirée dans React renvoie au même formulaire. La déconnexion termine la session pour le planning et pour l'administration.
- Les paramètres `next` externes sont refusés ; un bénévole ne peut être redirigé que vers le planning. L'ancienne adresse `/planning/` redirige vers `/admin/planning/`.

Un lien « Planning » est disponible dans l'en-tête de l'administration pour les comptes staff. Les données et les rôles existants ne sont pas modifiés.
