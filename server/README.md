# Pousse — serveur et base de données

Ce dossier contient l'API de sauvegarde en ligne de Pousse. Chaque donnée (épisodes, ressentis, raccourcis, profil) est rattachée au compte de l'utilisateur et stockée dans PostgreSQL. L'utilisateur retrouve tout en se connectant depuis n'importe quel appareil : il n'a plus besoin d'exporter un fichier JSON pour ne pas perdre ses données.

## Principe : hors ligne d'abord

L'application continue de lire et d'écrire sur l'appareil. Elle reste donc instantanée, et utilisable dans le métro ou en pleine crise sans réseau.

Chaque modification est notée dans une boîte d'envoi locale (`src/data/outbox.js`). Le module `src/data/sync.js` l'envoie au serveur et récupère en retour ce qui a changé sur les autres appareils. En cas de conflit, la modification la plus récente l'emporte. Les suppressions sont conservées comme « pierres tombales » pour se propager d'un appareil à l'autre.

La synchronisation se déclenche :
- 1,5 seconde après chaque modification ;
- au retour du réseau ;
- au retour dans l'application ;
- toutes les minutes tant que l'application est affichée.

Une modification faite hors ligne, ou juste avant de fermer l'application, reste dans la boîte d'envoi et part à la connexion suivante.

**Sans configuration, rien ne change.** Si `VITE_API_URL` n'est pas défini au moment du build, l'application reste 100 % locale, exactement comme avant.

## Contenu

| Fichier | Rôle |
|---|---|
| `migrations/001_init.sql` | Schéma : comptes, sessions, profils, épisodes, raccourcis, ressentis |
| `src/app.js` | Routes de l'API, règles de sécurité |
| `src/security.js` | Hachage des mots de passe (scrypt), jetons de session |
| `src/migrate.js` | Application des migrations SQL, une seule fois et dans l'ordre |
| `src/server.js` | Démarrage (migrations puis écoute) |
| `test/api.test.js` | 16 tests contre une vraie base PostgreSQL |

## API

| Méthode et chemin | Rôle |
|---|---|
| `POST /api/auth/register` | Création de compte (adresse e-mail obligatoire, mot de passe de 8 caractères minimum, `healthConsent` et `ageConfirmed` à `true`) |
| `POST /api/auth/login` | Connexion : ouvre une session (cookie `pousse_session`) |
| `POST /api/auth/logout` | Déconnexion : révoque la session côté serveur |
| `GET /api/auth/me` | Compte connecté |
| `POST /api/auth/forgot` | Mot de passe oublié : envoie un lien de réinitialisation (réponse identique que l’adresse existe ou non) |
| `POST /api/auth/reset` | Nouveau mot de passe à partir du lien (valable 30 min, usage unique ; déconnecte tous les appareils) |
| `GET /api/push/key` | Clé publique VAPID du rappel du soir (`null` si non configuré) |
| `POST /api/push/subscription` | Active ou met à jour le rappel de cet appareil (abonnement push, heure `HH:MM`, fuseau horaire) |
| `DELETE /api/push/subscription` | Désactive le rappel de cet appareil |
| `POST /api/push/test` | Envoie tout de suite un rappel d’essai à cet appareil |
| `POST /api/account/consent` | Accord sur les données de santé et âge minimum, pour un compte qui ne l’a pas encore donné |
| `POST /api/account/email` | Ajout ou modification de l’adresse e-mail (mot de passe exigé) |
| `POST /api/auth/password` | Changement de mot de passe (déconnecte les autres appareils) |
| `POST /api/sync` | Envoi des modifications et réception de celles des autres appareils |
| `GET /api/account/export` | Export complet des données du compte (RGPD, portabilité) |
| `DELETE /api/account` | Suppression définitive du compte et de toutes ses données (RGPD, effacement) |
| `GET /api/health` | État du service et de la base |

`POST /api/sync` reçoit `{ cursor, changes: { profile, episodes, shortcuts, feelings } }` et renvoie tout ce qui a changé depuis `cursor`, ainsi qu'un nouveau curseur. Chaque écriture reçoit une révision croissante. Les synchronisations d'un même compte sont sérialisées par un verrou, si bien qu'aucune modification ne peut être manquée entre deux appareils.

## Sécurité

- **Mots de passe** : hachés avec scrypt (sel aléatoire, environ 64 Mo de mémoire par calcul). Le mot de passe n'est jamais stocké. En cas de nom inconnu, le serveur calcule quand même un hachage, pour que le temps de réponse ne révèle pas quels noms sont inscrits.
- **Sessions** : jeton aléatoire de 256 bits dans un cookie `httpOnly` (inaccessible au JavaScript), `SameSite=Lax` et `Secure` en production. Seule son empreinte SHA-256 est stockée en base. Une session expire après 30 jours d'inactivité et peut être révoquée.
- **Isolation** : chaque requête sur des données est filtrée par le compte de la session, et un test vérifie qu'un compte ne peut ni lire ni modifier les données d'un autre.
- **Anti-CSRF** : toute requête d'écriture exige l'en-tête `X-Pousse-Client`, qu'un site tiers ne peut pas poser.
- **Limitation de débit** : 10 tentatives de connexion ou d'inscription par minute et par adresse IP, et 300 requêtes par minute au total.
- **Validation** : chaque entrée est vérifiée par un schéma. Un enregistrement est limité à 20 Ko, et une synchronisation à 5 000 éléments par type.
- **En-têtes de sécurité** : ajoutés par `@fastify/helmet`, dont une **Content-Security-Policy** stricte : seuls les scripts du site lui-même s'exécutent, les connexions sont limitées à l'API et à Open-Meteo, l'app ne peut pas être affichée dans un cadre. `upgrade-insecure-requests` n'est ajouté qu'avec `COOKIE_SECURE=true` (HTTPS). Si tu ajoutes un service externe (suivi d'erreurs, autre API), il faut l'autoriser dans `connect-src` (`src/app.js`). La CSP ne s'applique que si l'app est servie par ce serveur : sur Netlify ou Vercel, il faut la redéclarer dans leur configuration.
- **Pas de cache** : toutes les réponses de `/api`, erreurs comprises, portent `Cache-Control: no-store`, pour qu'aucune donnée de santé ne reste dans un cache du navigateur ou d'un intermédiaire.
- **Consentement** : l'inscription exige l'accord explicite sur les données de santé et la déclaration d'âge minimum, horodatés par le serveur avec la version du texte (`CONSENT_VERSION`). Un compte sans accord valide (créé avant la v11, ou texte mis à jour) ne peut plus synchroniser (403, `code: consent_required`) : l'app affiche alors un écran d'accord. Retirer son accord revient à supprimer son compte. La preuve de l'accord figure dans l'export.
- **Fichiers statiques** : avec `STATIC_DIR`, les fichiers sont indexés au démarrage. Après un nouveau build, redémarre le serveur (c'est automatique avec Docker).

## Lancer en local

Prérequis : Node.js 20 ou plus, et PostgreSQL 14 ou plus.

```bash
# 1. Base de données
createuser -P pousse            # mot de passe : pousse-dev (ou autre, à reporter ci-dessous)
createdb -O pousse pousse

# 2. API (migrations appliquées automatiquement au démarrage)
cd server
npm install
COOKIE_SECURE=false DATABASE_URL=postgres://pousse:pousse-dev@localhost:5432/pousse npm run dev

# 3. Application, dans un autre terminal, à la racine du projet
VITE_API_URL=/api npm run dev    # Vite relaie /api vers le port 3000
```

Pour lancer les tests, créer d'abord une base `pousse_test` (qui sera vidée à chaque lancement), puis :

```bash
cd server && TEST_DATABASE_URL=postgres://pousse:pousse-dev@localhost:5432/pousse_test npm test
```

## E-mails

La récupération du mot de passe envoie un e-mail. En production, renseigne `SMTP_URL` (par exemple `smtps://utilisateur:motdepasse@smtp.exemple.fr:465`, auprès d’un service d’envoi comme Brevo, Mailjet ou celui de ton hébergeur), `MAIL_FROM` et `APP_URL` (l’adresse publique de l’application, utilisée dans le lien). Sans `SMTP_URL`, les e-mails sont seulement écrits dans le journal du serveur : pratique en développement, inutilisable en production.

### Rappel du soir (notifications push)

Chaque utilisateur peut activer, depuis son profil, une notification douce en fin de journée qui l’invite à noter son ressenti. Elle est désactivée par défaut et se règle appareil par appareil. Pour que le serveur puisse l’envoyer, génère **une seule fois** une paire de clés :

```bash
npx web-push generate-vapid-keys
```

puis renseigne `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` (`mailto:` suivi d’une adresse de contact) dans `.env`. Ne change plus jamais la clé privée ensuite : les rappels déjà activés cesseraient de fonctionner. Sans ces clés, l’app propose seulement un rappel qui s’affiche quand Pousse est ouvert.

Le planificateur tourne chaque minute (`src/reminders.js`). Il envoie le rappel à l’heure locale de l’appareil, au plus une fois par jour, dans une fenêtre de 2 heures, et **pas** si le ressenti du jour est déjà noté. Le message est générique : aucune donnée de santé ne passe par les services de push. Le serveur n’envoie de requêtes qu’aux services de push connus (Google, Mozilla, Apple, Microsoft) ; `PUSH_HOSTS` permet de remplacer cette liste. Avec plusieurs instances de l’API, chaque rappel n’est envoyé qu’une fois. Un abonnement révoqué par le navigateur est supprimé automatiquement.

## Mettre en production

**Avec Docker (recommandé).** À la racine du projet :

```bash
cp server/.env.example .env      # renseigner POSTGRES_PASSWORD (openssl rand -base64 32)
docker compose up -d --build
```

L'image compile l'application en mode en ligne, puis la sert avec l'API sur un même serveur (port 3000). Le même domaine pour l'application et l'API évite toute configuration CORS, et le cookie de session reste simple et sûr.

Place devant un reverse proxy HTTPS (Caddy, Nginx ou Traefik). **HTTPS est obligatoire** : le cookie de session est marqué `Secure`.

**En gardant Netlify pour l'application.** Déploie l'API seule (sans `STATIC_DIR`) sur ton serveur, puis ajoute cette ligne **en tête** de `public/_redirects`, avant la règle existante :

```
/api/*  https://api.ton-domaine.fr/api/:splat  200
```

Netlify relaie alors les appels : l'application et l'API restent sur le même domaine du point de vue du navigateur. Compile l'application avec `VITE_API_URL=/api`.

## Données de santé : points de vigilance

Je ne suis pas juriste : ce qui suit est une liste de points à vérifier, pas un avis juridique.

- **Hébergement HDS.** En France, l'hébergement de données de santé à caractère personnel peut exiger un hébergeur certifié HDS (article L.1111-8 du Code de la santé publique). C'est le cas notamment quand les données sont recueillies à l'occasion d'activités de prévention, de diagnostic ou de soins. Pour une application de suivi personnel, l'obligation dépend de l'usage exact : à faire confirmer. Ce serveur étant autonome, il peut être déployé chez un hébergeur certifié HDS (OVHcloud, Scaleway, Outscale et d'autres proposent des offres HDS), sans changer le code.
- **RGPD.** Ce sont des données sensibles (article 9), qui demandent en pratique :
  - un consentement explicite à la création du compte (**en place depuis la v11**) ;
  - une politique de confidentialité (le lien sera à ajouter dans `src/components/HealthConsent.jsx`) ;
  - une tenue du registre des traitements ;
  - probablement une analyse d'impact (AIPD).

  L'export (portabilité) et la suppression du compte (effacement) sont déjà disponibles, dans le Profil comme dans l'API.
- **Sauvegardes.** Planifie une sauvegarde chiffrée et régulière de la base, par exemple `pg_dump` chaque nuit vers un stockage distinct, et teste la restauration. Sans sauvegarde de la base, le risque de perte n'est que déplacé.
- **Chiffrement.** Les données sont chiffrées en transit (HTTPS). Le chiffrement au repos dépend de l'hébergeur (disque chiffré) : à vérifier dans son offre.

## Préparer une base de statistiques (géographie, sexe, âge, pathologies)

L'objectif à moyen terme est d'analyser les pathologies selon les symptômes, le sexe, l'âge et la zone géographique. La base s'y prête déjà : les épisodes ont des colonnes indexées (`condition`, `intensity`, `occurred_at`), et le profil contient le sexe et l'année de naissance. Cet usage secondaire de données de santé est toutefois très encadré, et mieux vaut le prévoir dès la conception. Je ne suis pas juriste : ce sont des pistes à valider avec un spécialiste ou la CNIL.

- **Un consentement distinct.** Utiliser les données pour des statistiques est une finalité différente du service rendu à l'utilisateur. Elle demande un consentement explicite et séparé, facultatif, révocable, et recueilli à part des conditions d'utilisation. Seules les données des personnes qui ont accepté entrent dans les analyses. Une simple case « J'accepte que mes données, rendues anonymes, servent à des statistiques sur les pathologies », horodatée côté serveur, est le point de départ.
- **Une géographie grossière.** Demande le département ou la région, jamais l'adresse ni la position GPS. C'est suffisant pour une carte et beaucoup moins identifiant.
- **Des tranches d'âge dans les analyses.** L'année de naissance est déjà stockée. Dans les statistiques, regroupe par tranches (18-24, 25-34…) plutôt que par âge exact.
- **Des résultats agrégés avec un seuil minimal.** N'affiche jamais un groupe de moins de 10 personnes environ. Une combinaison rare (pathologie, âge, département) peut suffire à reconnaître quelqu'un.
- **Les données de cycle aussi.** Règles, abondance, situation (grossesse, ménopause, contraception) et fenêtre de fertilité sont des données intimes : à n'intégrer aux statistiques qu'avec le consentement dédié, et en agrégats.
- **Le mode de vie mérite une prudence particulière.** Le profil contient aussi la taille, l'historique du poids et le mode de vie (tabac, alcool, caféine, cannabis, autres drogues). Les réponses sur les drogues sont les plus sensibles, car elles portent sur des consommations illégales. N'intègre ces champs aux statistiques qu'avec le consentement dédié, en tranches, et envisage de les exclure de la base d'analyse tant que le cadre n'est pas validé.
- **Une base d'analyse séparée.** Alimente-la régulièrement avec des données pseudonymisées (sans nom ni identifiant de compte, sans dates précises), plutôt que d'interroger directement la base de production.
- **Le cadre réglementaire.** Selon l'usage (recherche, publication, partage avec des partenaires), les traitements de données de santé à des fins de recherche ou d'études relèvent de formalités CNIL spécifiques (méthodologies de référence ou autorisation). Une analyse d'impact (AIPD) sera nécessaire.

Techniquement, le consentement et la zone géographique s'ajouteront au profil (synchronisé comme le reste), avec une migration SQL qui les copiera dans des colonnes indexées pour les requêtes statistiques.

## Limites connues et pistes

- **Règle de conflit.** La règle « la plus récente l'emporte » s'appuie sur l'horloge de l'appareil. Une horloge très décalée peut faire perdre une modification concurrente sur un même épisode, ce qui reste rare pour un usage personnel.
- **Pierres tombales.** Les suppressions sont conservées sans limite de durée : une purge périodique, par exemple au-delà de 6 mois, pourra être ajoutée.
- **Tutoriel.** Le fait d'avoir vu le tutoriel est mémorisé par appareil : un nouvel appareil le propose à nouveau.
- **Vérification de l'adresse e-mail.** L'adresse n'est pas confirmée par un lien à l'inscription : une faute de frappe empêcherait la récupération. Une confirmation par e-mail est une amélioration possible.
