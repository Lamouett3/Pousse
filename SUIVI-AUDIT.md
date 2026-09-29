# Suivi de l'audit avant déploiement

Référence : `Pousse-audit-avant-deploiement.pdf` (26 septembre 2026, réalisé sur la v9).
Mettre ce fichier à jour à chaque point traité.

Légende : ✅ fait · 🟡 en partie · ⬜ à faire

## P0 — bloquant pour toute mise en ligne

| | Action | Version | Remarques |
|---|---|---|---|
| ✅ | Mettre à jour `@fastify/static` en version 10 | v11 | 10.1.5. Traversée de répertoire retestée (test automatique). 0 vulnérabilité serveur |
| ✅ | `Cache-Control: no-store` sur les réponses de `/api` | v11 | Erreurs comprises, test automatique |
| ⬜ | Politique de confidentialité, CGU, mentions légales dans l'app | | Rédaction juridique. Ajouter ensuite le lien dans `src/components/HealthConsent.jsx` |
| ✅ | Consentement explicite aux données de santé et déclaration d'âge, horodatés côté serveur | v11 | Migration `003_consentement.sql`, texte versionné (`CONSENT_VERSION`). Comptes plus anciens : écran d'accord, synchronisation bloquée d'ici là. Âge minimum 15 ans, à confirmer par le juriste |
| ⬜ | Hébergement (HDS si requis), HTTPS, sauvegardes chiffrées testées | | |
| 🟡 | Avertissement « ne remplace pas un avis médical » et qualification réglementaire | v11 | Avertissement dans l'inscription, l'écran d'accord, le tutoriel (dernière étape, impossible à sauter) et le rapport. Restent : les fiches des stores et l'avis réglementaire (ANSM, avocat) |
| ⬜ | Structure juridique et numéro D-U-N-S | | Administratif |

## P1 — avant le lancement public

| | Action | Version | Remarques |
|---|---|---|---|
| ⬜ | Corriger les 6 règles d'accessibilité (axe-core) | | |
| ⬜ | Alléger les icônes (SVG utilisés uniquement) | | |
| ✅ | Content-Security-Policy stricte | v11 | `script-src 'self'`, aucune violation dans Chromium. À redéclarer si l'app est servie ailleurs que par le serveur Node |
| ⬜ | Vite 8 et outils de développement | | |
| 🟡 | Tests de parcours dans le dépôt, intégration continue, ESLint | v12 | Premier pas : `npm test` côté application (8 tests du moteur des insectes). Restent les parcours, la CI et ESLint |
| ⬜ | Suivi des erreurs respectueux de la vie privée | | Penser à l'ajouter à `connect-src` |
| ⬜ | Application native Capacitor | | |
| ✅ | Adresse e-mail pour la récupération du compte | v10 | Obligatoire à l'inscription |

## P2 — après le lancement

| | Action | Version | Remarques |
|---|---|---|---|
| 🟡 | Découper MedicalReport, GrowingGarden et Home | v12 | GrowingGarden : faune sortie dans `src/components/garden/` (1 410 → 1 172 lignes) |
| ⬜ | Purge des pierres tombales et des comptes inactifs | | |
| ⬜ | Consentement dédié et base pseudonymisée pour les statistiques | | Le mécanisme de consentement de la v11 peut servir de modèle |
| 🟡 | Notifications natives, traduction en anglais | v12 | Rappel du soir en push Web (désactivé par défaut). Restent le push natif (Capacitor) et la traduction |

## Petits correctifs hors plan

| | Point | Version |
|---|---|---|
| ✅ | `theme_color` du manifeste aligné sur `#4F7757` (et `index.html`) | v11 |
| ✅ | `nodemailer` 6 → 10 (2 vulnérabilités hautes) | v11 |

## Nouveautés hors plan

| | Point | Version |
|---|---|---|
| ✅ | Rappel du soir « Moment d'écoute » (push Web + repli local) | v12 |
| ✅ | Faune du jardin : comportements imprévisibles, bousculade au toucher | v12 |
| ✅ | `/api/sync` : lectures en parallèle sur un même client de transaction (déconseillé par `pg`, erreur en `pg` 9) | v12 |

## Points relevés à l'analyse de la v10 (non traités)

- L'inscription révèle si une adresse e-mail a déjà un compte (409).
- `/api/auth/forgot` : légère différence de temps de réponse selon que l'adresse existe.
- `APP_URL` et `SMTP_URL` : pas d'erreur au démarrage si absents en production.
- Pas de notification à l'ancienne adresse lors d'un changement d'e-mail.
