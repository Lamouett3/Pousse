# CLAUDE.md — Contexte du projet « Pousse »

> Ce fichier est lu automatiquement par Claude Code au démarrage. Il résume
> l'origine du projet, les décisions de design, et les conventions à respecter
> pour que le travail reste cohérent. Mets-le à jour quand une décision change.

## 0. État actuel

Application web **fonctionnelle, responsive et déployable** (pas une maquette) :
- **Responsive** : un seul code s'adapte à trois formats via `useBreakpoint`
  (`src/theme/useBreakpoint.jsx`). mobile < 640px, tablette 640–1023px,
  desktop ≥ 1024px. Sur mobile/tablette la navigation est une barre en bas ;
  sur desktop c'est une barre latérale (sidebar) et le contenu passe sur deux
  colonnes là où c'est pertinent (dashboard, saisie). Chaque écran reçoit la
  prop `bp` et l'utilise pour ajuster largeur, colonnes et tailles.
- Les épisodes, le profil et les **raccourcis** sont **persistés en
  `localStorage`** (voir `src/data/`).
- Les 5 écrans marchent pour de vrai : accueil (jardin évolutif + raccourcis),
  saisie, historique, rapport, profil. Le dashboard et le rapport sont calculés
  à partir des épisodes réellement saisis.
- L'export PDF du rapport utilise l'impression navigateur (`window.print()` +
  styles `@media print`).
- **Nom retenu** : « Pousse » (signature « jour après jour »). Logo dans
  `public/logo.svg`, icône dans `public/icon.svg`. Pour changer de nom (ex.
  Vivace, Flora), chercher « Pousse » dans `index.html` et `src/App.jsx`.
- **Authentification** simple (nom + mot de passe, stockage local, multi-comptes)
  via `src/data/auth.js` et `src/screens/Auth.jsx`.

**Mise à jour (v11)** : ce qui précède décrit le mode 100 % local, qui reste
disponible pour le développement. Il existe désormais un **serveur** (`server/`,
Fastify + PostgreSQL, voir `server/README.md`) : comptes avec e-mail, sessions,
synchronisation hors ligne d'abord, export et suppression RGPD. La version
publiée doit être le mode en ligne (`VITE_API_URL=/api`). Depuis la v11 :
consentement aux données de santé et âge minimum obligatoires à l'inscription
(`src/components/HealthConsent.jsx`, écran `src/screens/Consent.jsx` pour les
comptes plus anciens), CSP stricte et `no-store` sur l'API. Le suivi des points
de l'audit avant déploiement est dans `SUIVI-AUDIT.md`.

Ce n'est PAS encore une app de production santé complète : pas de pages
légales, pas d'hébergement HDS choisi (§9).

## 1. Le projet en une phrase

Application mobile de **journal de symptômes modulaire** : l'utilisateur note ses
épisodes (douleur, crise) pour une ou plusieurs pathologies chroniques, visualise
son historique, et exporte un **rapport pour son médecin**. Visée startup, domaine
santé / bien-être.

## 2. Origine et raisonnement (résumé de la conversation de conception)

Le concept a été affiné par étapes. Les décisions clés et leur justification :

- **Domaine retenu** : santé / bien-être, avec une visée produit/startup.
- **Concept de base** : un journal de symptômes qui détecte des tendances et
  génère un rapport médecin. La valeur tient à deux choses : une **saisie
  ultra-rapide** (≤ 15 s, sinon les gens abandonnent) et le **rapport médecin**
  comme fonctionnalité signature qui distingue l'app d'un simple carnet.
- **Approche modulaire** (choisie plutôt qu'une app mono-pathologie) : un seul
  moteur d'épisode, des « modules » par pathologie. Voir section 4.
- **Pathologies du MVP** : migraine (tête), SII (digestif), fibromyalgie
  (multi-zones). Choisies pour valider que le moteur gère des zones et des
  mécaniques différentes. Extensions prévues : endométriose, eczéma, asthme,
  arthrose, etc.
- **Stockage local d'abord** (pas de serveur au MVP) : évite la complexité
  réglementaire HDS/RGPD et permet de valider l'usage avant d'investir.
- **Direction artistique « Jardin »** : palette végétale chaleureuse, métaphore
  de croissance (« chaque jour suivi fait pousser une fleur ») comme moteur
  d'engagement respectueux. Issue d'un mix de 3 directions explorées ; on a
  retenu la chaleur du jardin + la visualisation de semaine claire, sans
  mascotte (jugée risquée car potentiellement infantilisante un jour de crise).

## 3. Décisions de design importantes (à ne pas casser)

- **Deux registres visuels distincts et assumés** :
  - Écrans utilisateur (dashboard, saisie, profil) = **DA jardin**, chaleureuse,
    encourageante, motivante.
  - Rapport médecin = **registre clinique sobre**, crédible pour un soignant.
    Pas de métaphore, pas de ton motivant : chiffres, corrélations, efficacité
    des traitements. C'est volontaire — ne pas « jardiniser » le rapport.
- **Saisie en deux modes** : l'essentiel visible (zone, intensité, durée,
  déclencheurs) + un bloc « Plus de détails » replié pour le reste. Objectif :
  valider un épisode en 3 gestes si pressé.
- **Raccourcis rapides** : après saisie, l'utilisateur peut enregistrer un
  raccourci. En accueil, un tap sur le raccourci ouvre un mini-modal intensité
  → épisode créé en ~3 s. Voir §4bis.
- **Efficacité du traitement en deux temps** : au moment de la crise on ne sait
  pas encore si le médicament agit. L'app propose donc de revenir plus tard
  (notification douce) pour dire s'il a soulagé. Donnée à forte valeur médicale.
- **Cycle menstruel** : proposé uniquement pour le profil « femme ». Lien
  règles/symptômes cliniquement reconnu → va dans le rapport médecin.
- **Repères lunaires** : option pour tous les genres, **DÉSACTIVÉE PAR DÉFAUT**
  et présentée comme repère personnel **sans valeur médicale**. Le rapport
  médecin ne les inclut **jamais par défaut** : elles n'apparaissent que dans
  une annexe explicitement **opt-in** (« Annexe — Repères astronomiques »,
  bouton « Inclure au PDF » dans `MedicalReport.jsx`), toujours accompagnée
  d'un avertissement (« sans valeur médicale », lecture statistique et non
  clinique). La corrélation lunaire est séparée par pathologie, avec un seuil
  minimum de 15 épisodes et un test chi-deux (p < 0.05). Les repères
  planétaires ont été retirés (orbites trop lentes pour une corrélation
  significative sur une période de suivi courte). Ne pas rendre les repères
  lunaires visibles par défaut ni retirer l'avertissement sans raison
  explicite — la crédibilité clinique du rapport repose sur ce garde-fou
  opt-in.
- **Transitions douces entre contenu et navigation** : header et nav bar en bas
  utilisent `backdrop-filter: blur(20px)` sans `borderTop`/`borderBottom`, avec
  un `box-shadow` très subtil. Un `div` gradient fixe de 28px fait la transition
  entre le contenu scrollable et la nav. L'espacement entre la carte Screen et
  la nav est `navH + 32`.

- **Thèmes jour / « jardin de nuit »** : toutes les couleurs d'interface sont
  des variables CSS générées depuis `src/theme/tokens.js` (`palette.jour`,
  `palette.nuit`, injectées par `themeCss()` dans `main.jsx`). Les écrans
  écrivent toujours `colors.green.primary` : ne pas remettre d'hexadécimal
  en dur dans les écrans, et ne pas concaténer d'alpha à une couleur
  (`${couleur}33` casse avec `var()`) — utiliser `alpha(couleur, pourcent)`.
  Dans le SVG, passer les couleurs par `style={{ fill }}` plutôt que par
  l'attribut `fill`. Texte posé sur `green.primary` : `colors.onPrimary`.
  Le rapport médecin suit le thème **à l'écran** (couleurs `colors.clinical`
  thémées), mais s'imprime et s'exporte en PDF **toujours en clair** : bloc
  `@media print` généré par `themeCss()`. Le choix du thème est mémorisé par appareil
  (`pousse.theme`, `src/theme/useTheme.jsx`).
- **Lisibilité** : échelle `type` à 7 niveaux (12/13/15/17/20/26/34),
  **12 px minimum**, contrastes texte ≥ 4,5:1, cibles tactiles ≥ 44 px
  (`TOUCH_MIN`). 3 rayons seulement (12 / 20 / 28).
- **Suivi d'efficacité** : une seule règle, `needsEfficacyFollowUp` dans
  `src/data/stats.js`, utilisée par la carte de l'accueil et le badge de
  navigation. « Pas encore » compte comme « pas de réponse » (comme dans les
  stats du rapport) et repousse la question de 3 h (`efficacyAskedAt`), dans
  la fenêtre de 48 h après la prise.
- **« Comment te sens-tu aujourd'hui ? »** (`FeelingCard` dans `Home.jsx`) :
  carte visible pour tous les profils, une question à la fois (humeur,
  énergie, symptômes), libellés accordés au genre. Stockage inchangé
  (`addCycleLog`, un ressenti par jour, mêmes clés qu'avant). Libellés et
  calculs partagés dans `src/data/feelings.js`. Les ressentis apparaissent
  dans l'historique (vue Jour, synthèse « Mes ressentis » sur les autres
  périodes, point sur le calendrier du mois) et dans le rapport (section
  « 6. Ressenti déclaré par le patient », mentionnée comme auto-évaluation).
- **Rapport** : périodes Jour / Semaine / Mois / Année.
- **Saisie d'un épisode en étapes guidées** (`LogEpisode.jsx`) : 1 Quoi,
  2 Quand, 3 Où, 4 Intensité, 5 Déclencheurs, 6 Traitement, 7 Détails et
  note, 8 Récapitulatif (chaque ligne modifiable). Étapes 3, 5, 6 et 7
  facultatives ; « Terminer et enregistrer » dès l'étape 2 ; en
  modification, ouverture sur le récapitulatif. Champs ajoutés à l'épisode
  (facultatifs, rétrocompatibles) : `createdAt` = début réel (peut être
  passé), `ongoing`, `endedAt`, `durationMinutes`, `treatmentDose`,
  `treatmentAt`, `note` (1000 caractères). `duration` reste renseigné avec
  la catégorie historique ('<1h', '2-4h', '½ jour', '+1j') déduite de la
  durée réelle (`src/data/episodeTime.js`), pour les stats et le rapport.
  Un ancien épisode sans `endedAt` garde sa durée tant que l'étape
  « Quand » n'est pas modifiée.
- **Crise en cours** : carte sur l'accueil (« Migraine en cours depuis… »,
  bouton « C'est terminé » → `endEpisodePatch`, durée calculée). Les
  épisodes créés par la saisie complète, « Noter vite » et les raccourcis
  demandent « Encore en cours / Déjà terminée » (en cours présélectionné).
- **Fenêtres et superpositions** : toute fenêtre en `position: fixed`
  (dialogue, feuille du bas, célébration…) doit être rendue dans
  `<Portal>` (`components/ui.jsx`). Sinon, dessinée dans un écran animé,
  elle reste prisonnière de la couche de cet écran et passe derrière la
  barre de navigation.
- **Suivi du cycle** (`src/data/cycle.js`, `components/CycleTracking.jsx`) :
  situations `cycleMode` : naturel, endométriose, pilule (plaquette 21+7,
  24+4 ou en continu ; `pillBreakDays` peut valoir 0 → utiliser `??`),
  sans règles régulières, ménopause, grossesse. Règles notées dans
  `profile.periods` ({ start, end, flow par jour }) ; `lastPeriod` et
  `periodHistory` restent tenus à jour pour la compatibilité (un ancien
  profil est repris par `normalizePeriods`). Durée du cycle **calculée**
  dès 2 cycles connus (6 derniers, écarts de 15 à 60 j), sinon durée
  déclarée ; « irrégulier » si écart > 7 j (message neutre, pas de
  diagnostic). Calendrier du mois : règles notées, prévues, fenêtre de
  fertilité **facultative et indicative** (`fertileWindowOn`, jamais une
  méthode de contraception). Rapport : section « 7. Cycle menstruel »,
  épisodes dans la fenêtre J-2 à J+3 et critère de migraine menstruelle
  (ICHD-3 A1.1.1), présenté comme repère à interpréter par le médecin.
  Pas de rappels (choix produit).
- **Compte en ligne avec e-mail** : adresse obligatoire à la création
  (unique, normalisée en minuscules), connexion par nom **ou** e-mail.
  « Mot de passe oublié » : `POST /api/auth/forgot` répond toujours la même
  chose (pas d'énumération), l'e-mail part en arrière-plan avec un lien
  `APP_URL/?reset=…` valable 30 min, à usage unique (jeton haché en base,
  table `password_resets`) ; `POST /api/auth/reset` change le mot de passe
  et déconnecte tous les appareils. `POST /api/account/email` ajoute ou
  modifie l'adresse (mot de passe exigé) ; le Profil avertit si un ancien
  compte n'a pas d'adresse. Envoi via `SMTP_URL` (nodemailer) ; sans
  `SMTP_URL`, les e-mails sont écrits dans le journal (développement).
- **Pathologies personnelles** (`profile.customConditions`, clés
  `perso-…`) : enregistrées dans le registre partagé `conditions` /
  `conditionKeys` par `registerCustomConditions` (appelé dans
  `StoreProvider` à chaque rendu), donc reconnues partout (historique,
  stats, rapport). Création depuis la saisie (tuile « Créer une
  pathologie », qui remplace l'ancienne « Autre ») ou le Profil (« Mes
  pathologies ») ; suppression avec annulation : **archivée** si des
  épisodes l'utilisent (nom conservé dans l'historique), retirée sinon ;
  recréer le même nom la réactive. Utiliser `isSelectableCondition` pour
  les listes de choix.
- **Mes traitements** (`profile.myTreatments` : `{ id, name, dose,
  frequency, inReport }`, 30 au plus) : rubrique « Traitements » en tête de
  « Mode de vie » (fréquence, dose, affichage au rapport, suppression avec
  annulation). Même liste en boutons dans la saisie et « Noter vite »
  (`components/TreatmentPicker.jsx`) : « Aucun », mes traitements, puis les
  suggestions de la pathologie ; « + Ajouter un médicament » ; « Gérer »
  pour supprimer. Plus de bouton « Autre ». Rapport : carte « Traitements
  habituels » (`treatmentsForReport`).
- **Noter vite, favorites** : `profile.quickFavorites` (4 au plus, dans
  l'ordre) ; la première est présélectionnée. Sans favorites : les
  pathologies les plus notées, puis migraine / SII / fibromyalgie.
- **Sauvegarde en ligne** (optionnelle, `server/` + `VITE_API_URL`) : API
  Fastify + PostgreSQL, comptes et sessions côté serveur (cookie httpOnly),
  données rattachées au compte. Côté app, principe « hors ligne d'abord » :
  on écrit toujours en local via `storage.js`, qui note chaque modification
  dans la boîte d'envoi (`outbox.js`) ; `sync.js` envoie / reçoit
  (`POST /api/sync`, curseur de révision, la modification la plus récente
  l'emporte, suppressions en pierres tombales) puis émet `pousse:data-synced`
  (le store relit le stockage). **Toute nouvelle écriture de données doit
  passer par `storage.js`** (qui date et note la modification) ; les écritures
  venant du serveur utilisent les fonctions `write*Raw`. Sans `VITE_API_URL`,
  l'app reste 100 % locale. Détails, sécurité et RGPD/HDS : `server/README.md`.
- **Plus d'import / export JSON** dans le Profil : les données vivent sur le
  serveur. Seul reste « Télécharger toutes mes données » (section Sauvegarde
  en ligne, `GET /api/account/export`), obligatoire au titre du RGPD
  (portabilité). Ne pas réintroduire d'import qui remplace les données : avec
  la synchronisation, les éléments absents du fichier seraient supprimés
  sur tous les appareils.
- **Année de naissance** (`profile.birthYear`, facultative, 1920 → année en
  cours) : on stocke l'année plutôt qu'un âge (qui deviendrait faux) ou
  qu'une date complète (plus identifiante). Âge affiché dans le Profil et
  dans le rapport médecin. Synchronisée avec le profil.
- **Mesures et mode de vie** (`src/data/lifestyle.js`,
  `src/components/HealthProfile.jsx`) : taille (`heightCm`), historique daté
  du poids (`weightHistory`, une mesure par jour), et section « Mode de vie »
  (`lifestyle` : tabac, vapotage, alcool, caféine, cannabis, autres drogues),
  réponses par tranches, toutes facultatives avec « Je préfère ne pas
  répondre ». Chaque réponse a une case « Afficher dans mon rapport
  médecin » (`lifestyle.inReport`), décochée par défaut pour les drogues.
  **Pas d'IMC ni d'objectif de poids dans le profil** (sujet sensible) :
  l'IMC n'apparaît que dans le rapport médecin, en chiffre seul, sans
  étiquette de catégorie.
- **Jardin, effets ajoutés** (animations existantes inchangées) : rafales
  toutes les 18 s (`.pg-gust` sur plantes et herbe, traînées `.pg-streak`,
  en CSS donc coupées par « réduire les animations »).
- **Faune du jardin (v12)** : plus aucun trajet SMIL fixe. Moteur de
  comportement pur dans `src/components/garden/fauna.js` (testé par
  `npm test`, `fauna.test.js`), rendu et boucle `requestAnimationFrame` dans
  `garden/GardenFauna.jsx` (attributs SVG écrits directement, aucun rendu
  React par image ; boucle arrêtée hors écran). Chaque insecte est un agent :
  bruit lissé à fréquences aléatoires, décisions et durées tirées au sort,
  personnalité (`mood`) retirée après chaque bousculade. Répertoire par
  espèce (`SPECIES`) : papillons (vol par à-coups, se posent, ailes lentes),
  abeilles (zigzag, fouillent les pétales, vol stationnaire), libellule
  (stationnaire puis sprint), coccinelle (marche, arrêts, petit envol, monte
  sur une fleur), oiseau (va et vient). Les insectes posés suivent le
  balancement SMIL de la fleur (`flowerHead`, horloge `svg.getCurrentTime()`,
  mêmes valeurs `WIND` que `Plant`). Toucher (`knockInsects` → `knock`) :
  projeté à l'opposé du doigt, tournoie, rebondit, étourdi, puis repart
  (fleur, herbe, ciel) ; hors cadre → revient plus tard par un bord ;
  l'oiseau s'enfuit sans tournoyer. Seuils d'apparition inchangés (jours 2 à
  7). « Réduire les animations » : `settle()`, tous posés, toucher inactif.
  Sprites : vus de dessus tête vers -y (papillons, libellule), de profil tête
  vers -x (abeilles, coccinelle, oiseau).
- **Notifications** (toasts) : trois à l'écran au plus.
- **Rappel du soir « Moment d'écoute » (v12)** : désactivé par défaut, réglé
  par appareil dans le Profil (`components/EveningReminder.jsx`, logique
  `data/reminders.js`, préférences `pousse.<compte>.reminder.v1`, jamais
  synchronisées). En ligne avec clés VAPID : push envoyé par le serveur
  (`server/src/reminders.js`, table `push_subscriptions`), sinon mode local
  (seulement app ouverte, annoncé à l'écran). Pas de rappel si le ressenti du
  jour est noté ; fenêtre de 2 h ; une fois par jour ; message générique sans
  donnée de santé. Le service worker charge `public/push-sw.js`
  (`workbox.importScripts`). La notification ouvre `/?ecoute=1` (ou envoie
  `pousse:ecoute` à l'app déjà ouverte) : accueil, carte du ressenti
  réaffichée et ciblée. Ton : doux, jamais culpabilisant, pas de série à
  préserver. Déconnexion → abonnement retiré.
- **Compte** : à la création, le mot de passe est saisi deux fois (contrôle
  en direct + blocage si différent). Le tutoriel de premier lancement est
  mémorisé **par compte** (`pousse.<compte>.onboarding.done`) : un nouveau
  compte le voit toujours. Les comptes qui avaient déjà des épisodes sous
  l'ancienne clé globale (`pousse.onboarding.done`) ne le revoient pas.
- **Animation de chargement** (`SplashScreen`) : à chaque ouverture ou
  actualisation de la page, et à chaque connexion.
- **Jardin interactif** : toucher une plante la fait réagir (fleur : balancement
  + pollen ; pousse ou bouton : rebond), avec une zone de toucher invisible
  élargie. Avec « réduire les animations », un halo fixe s'affiche 0,7 s
  (global.css coupe toutes les animations CSS dans ce mode).
- **Interrupteurs** (`Toggle`) : piste grise `colors.toggleOff` quand
  désactivé, coche quand activé, et état écrit (« Activé » / « Désactivé »).
- **Repères lunaires** (`PlanetaryWidget.jsx`) : carte « ciel de nuit »
  toujours sombre, prochaines pleine / nouvelle lunes, frise des 8 phases.
  Le dessin des phases passe par `litPath()` (lumière à droite en phase
  croissante, à gauche en décroissante). Mention « sans valeur médicale »
  obligatoire.
- **Saisie express** (`src/screens/QuickLog.jsx`) : plein écran, dans le
  thème en cours (jour ou nuit), 3 gestes (pathologie, intensité, traitement). Durée et
  déclencheurs se complètent ensuite via Modifier.

## 4. Architecture modulaire (le cœur technique)

Toute pathologie réutilise le même **squelette d'épisode** :
`quand → où → intensité → durée → déclencheurs → traitement (+ efficacité différée)`.

Seuls changent le vocabulaire et les « briques » spécifiques. Tout est piloté
par les données dans `src/data/conditions.js`.

**Pour ajouter une pathologie** : ajouter une entrée dans `conditions` avec
`label`, `zones` (suggérées sur la silhouette), `triggers`, `treatment`, et un
`extra` optionnel (brique spécifique : échelle de Bristol pour le SII, aura /
nausée pour la migraine…). Aucun autre fichier à toucher.

## 4bis. Raccourcis rapides

Permettent de sauvegarder un épisode type (pathologie + zones + traitement +
extras) et de le rejouer depuis l'accueil en ne demandant que l'intensité.

**Structure d'un raccourci** :
```js
{ id, label, condition, zones, treatment, extra, customLabel? }
```

**Stockage** : clé `${ns()}.shortcuts.v1` dans localStorage.
- `storage.js` : `loadShortcuts()`, `saveShortcut()`, `removeShortcut()`
- `store.jsx` : expose `shortcuts`, `addShortcut`, `removeShortcut` via contexte

**Flux** :
1. `LogEpisode.jsx` : après sauvegarde, bandeau « Enregistrer comme raccourci ? »
   (Oui/Non). Le label est auto-généré : `Pathologie — Traitement`.
2. `Home.jsx` : chips horizontaux scrollables sous le jardin. Tap → mini-modal
   avec slider intensité (0–10, défaut 5) → `addEpisode()`. Appui long →
   `ConfirmDialog` de suppression.

## 5. Structure des fichiers

```
src/
  theme/
    tokens.js        → SOURCE DE VÉRITÉ des couleurs, rayons, espacements.
                       Toute couleur de l'app vient d'ici. Ne pas hardcoder
                       de hex ailleurs.
    useBreakpoint.jsx → hook responsive : renvoie { bp, isMobile, isTablet,
                       isDesktop }. App.jsx s'en sert pour choisir la mise en
                       page ; chaque écran reçoit `bp` en prop.
    global.css       → reset, focus visible, prefers-reduced-motion, @media
                       print, animations (fadeIn, fadeInUp, scaleIn, slideDown,
                       slideUp, popIn, barGrow, barFillX, logo-*), règles
                       responsive de base (overflow-x, champs)
  data/
    auth.js          → authentification locale (multi-comptes, session)
    conditions.js    → modules de pathologies (voir section 4)
    storage.js       → lecture/écriture localStorage : épisodes, profil,
                       raccourcis + helpers de dates (dayKey, loggedDays,
                       currentStreak, gardenLoggedDays, getCyclePhase)
    store.jsx        → contexte React (StoreProvider/useStore) partageant
                       épisodes, profil, raccourcis + méthodes de mutation
    stats.js         → agrégations (computeStats, buildSeries) à partir des
                       épisodes réels, pour dashboard et rapport
    remote.js        → client de l'API (mode en ligne si VITE_API_URL)
    outbox.js        → boîte d'envoi des modifications à synchroniser
    sync.js          → synchronisation avec le serveur, transfert d'un compte local
    cycle.js         → cycle : situations, règles, cycle calculé, prévisions, fertilité, analyse
    episodeTime.js   → durée d'un épisode (catégorie, affichage, clôture)
    lifestyle.js     → mesures (taille, poids) et mode de vie : définitions, rapport
    feelings.js      → ressentis du jour : libellés (accordés au genre),
                       ressentis d'une période, synthèse
    weather.js       → météo via géolocalisation + Open-Meteo API (cache 5 min)
  components/
    CycleTracking.jsx → cycle : situation, « Mes règles », commandes de l'accueil
    CustomConditions.jsx → pathologies personnelles (création, « Mes pathologies »)
    TreatmentPicker.jsx → choix du traitement (mes traitements + suggestions)
    HealthProfile.jsx → Profil : sections « Mesures » et « Mode de vie »
    CloudBackup.jsx  → Profil : sauvegarde en ligne (état, transfert, export, suppression)
    BodySilhouette.jsx → silhouette organique sélectionnable (paths SVG)
    GrowingGarden.jsx  → jardin animé SVG : plantes, ciel dynamique (heure),
                         météo réelle, faune, soleil/lune avec cycle lunaire
                         réel. Palette alignée sur tokens.js (voir §5bis).
    PlanetaryWidget.jsx → widget repères lunaires (optionnel)
    ui.jsx             → Screen, ScreenHeader, Chip, Segmented, Toggle,
                         PrimaryButton, StreakBadge, AnimatedNumber,
                         ConfirmDialog, ErrorBoundary, ToastProvider/useToast,
                         ThemeToggle (bascule jour / nuit)
  screens/
    Auth.jsx          → écran de connexion / inscription
    Home.jsx          → accueil : jardin, raccourcis, cycle, efficacité,
                         boutons d'action, mini-modal intensité raccourci
    Dashboard.jsx     → historique jour / semaine / mois (calendrier de
                         chaleur, un jour touché ouvre la vue Jour) / année
    LogEpisode.jsx    → saisie d'un épisode en 8 étapes guidées + proposition de raccourci
    QuickLog.jsx      → saisie express « mode crise » (plein écran)
    Profile.jsx       → genre, cycle, option planétaire (→ updateProfile)
    MedicalReport.jsx → rapport clinique, export PDF via window.print()
  App.jsx             → StoreProvider + navigation par onglets + logo inline
                         + gradient de transition contenu/nav
  main.jsx            → point d'entrée : injecte les variables CSS des thèmes
  theme/useTheme.jsx  → ThemeProvider / useTheme (jour | nuit, mémorisé)
public/
  logo.svg            → logo complet (symbole + nom)
  icon.svg            → icône d'app / favicon
```

## 5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)

`GrowingGarden` reçoit le nombre de jours distincts signalés et affiche une
plante par jour (cap visuel à 7, cycle de 7 jours). La maturité progresse :
bourgeon (< 3 j), bouton (3–4 j), fleur (≥ 5 j), toutes en fleurs (≥ 7 j).
C'est le moteur d'engagement émotionnel voulu. Ne pas le remplacer par un
simple compteur.

**Palette du jardin** : toutes les couleurs dérivent des tokens DA
(`src/theme/tokens.js`). L'objet `C` en haut de `GrowingGarden.jsx` mappe :
- Tiges/feuilles → `green.primary`, `green.leaf`, `green.leafLight`
- Sol/herbe → `green.bg`, `green.leafFaint`, `green.leafLight`
- Fleurs → `pink.bg`, `amber.border`, `coral.barStrong`, `green.surface`,
  `sand.bg` + lavande chaude assourdié
- Pollen/sparkle/abeille → `amber.border`, `amber.bg`, `green.surface`
- Ciel → gradients chauds sauge/vert (jour), terre/ambre (crépuscule),
  vert profond (nuit) — **pas de bleu froid**
- Collines/nuages/brouillard → `green.leafFaint`, `green.bg`

**Ne pas** réintroduire de hex froids/bleutés dans le jardin.

**Astres** :
- `CelestialSun` : toujours visible à l'aube/jour, opacité réduite si couvert.
  L'ancien `WeatherSun` a été supprimé.
- `CelestialMoon` : visible au crépuscule/nuit, phase lunaire **réelle**
  calculée via le cycle synodique de 29.53 jours (référence : nouvelle lune du
  6 jan 2000). Rendu SVG avec deux arcs (semicercle + terminateur à courbure
  variable) : nouvelle lune → croissant → quartier → gibbeuse → pleine lune.

**Météo** : `fetchWeather()` (`src/data/weather.js`) utilise la géolocalisation
du navigateur + l'API Open-Meteo (cache 5 min). Types : clear, cloudy, fog,
drizzle, rain, snow, storm. Le champ `isDay` sert à `getTimeOfDay()`.

## 6. Conventions de code

- **Couleurs** : toujours via `import { colors } from '../theme/tokens'`.
  Jamais de hex en dur dans les composants. Exception : `GrowingGarden.jsx`
  utilise un objet `C` local dont les valeurs sont dérivées des tokens
  (documenté en §5bis).
- **Icônes** : Tabler webfont, `<i className="ti ti-nom" aria-hidden="true" />`.
  Les icônes décoratives ont `aria-hidden`, les boutons icône-seule ont un
  `aria-label`.
- **Langue** : toute l'UI est en français.
- **Données** : persistées en `localStorage` via `src/data/storage.js`. Le store
  React (`src/data/store.jsx`) synchronise état mémoire et persistence.
- **Accessibilité** : focus visible et `prefers-reduced-motion` déjà gérés dans
  `global.css`. Garder les `aria-label` sur les SVG interactifs.
- **Animations** : définies dans `global.css` avec classes `.anim-*`. Délais
  via `.anim-d1` à `.anim-d8`. Le jardin SVG a ses propres keyframes inline
  (`pg-plant`, `pg-bloom`, `pg-fadein`).

## 7. Lancer le projet

```bash
npm install
npm run dev      # serveur de dev (Vite), http://localhost:5173
npm run build    # build de production
npm run preview  # prévisualiser le build
```

## 8. Pistes de travail à venir (non encore faites)

Déjà fait : persistance localStorage, page d'accueil avec jardin évolutif,
calcul réel des stats, export PDF par impression, nom + logo, authentification
locale, raccourcis rapides de saisie, jardin avec météo réelle + cycle lunaire,
palette jardin alignée sur la DA, édition d'un épisode (vue Jour de
l'historique → Modifier), refonte UI « un cran plus loin » (voir §3 :
thème jour / jardin de nuit, échelle typographique, contrastes AA, saisie
express, calendrier de chaleur mensuel).

Par ordre de valeur estimée :

1. ~~Brancher l'édition d'un épisode~~ : fait (App.jsx `openEditEpisode`,
   `LogEpisode` en mode édition, accessible depuis la vue Jour et le
   calendrier du mois).
2. **Notification de second temps** pour l'efficacité du traitement : aujourd'hui
   l'efficacité se saisit seulement au moment de l'épisode. Ajouter une vraie
   relance (les épisodes avec `treatment ≠ Aucun` et `efficacy = null` sont à
   relancer). Sur web : Notifications API ; sur mobile : push natif.
   **Depuis la v12**, l'infrastructure existe (push Web, `server/src/reminders.js`,
   `public/push-sw.js`) : il suffirait d'un second type de rappel.
3. **Onboarding** : premier lancement, choix des pathologies suivies et du profil.
   Sans lui, la métaphore du jardin et les raccourcis ne sont expliqués nulle
   part à un nouvel utilisateur qui atterrit sur un jardin vide.
4. ~~Carte de chaleur~~ : fait pour le mois (historique, vue Mois) ; la vue
   Année avait déjà sa heatmap.
5. **Intégration du cycle dans les stats/rapport** : corréler épisodes et phase
   du cycle (les données de cycle sont déjà dans le profil).
6. **PWA** : ajouter un manifest + service worker pour installation sur mobile
   et usage hors-ligne (cohérent avec le stockage local).
7. **Modules supplémentaires** : endométriose, eczéma (brique photo), asthme.
8. **Passage en prod santé réelle** (gros chantier) : comptes, backend chiffré,
   hébergement HDS, RGPD, déploiement stores. Voir §9.

**Nettoyage repéré (audit du 6 juillet 2026)**, indépendant et rapide :
- `#d9e3da` (fond de page général) est hardcodé dans `App.jsx` (x2),
  `ui.jsx` (ErrorBoundary) et `global.css`, alors qu'il n'existe dans aucune
  entrée de `tokens.js`. À déplacer vers un token (ex. `colors.green.pageBg`).
- `PHONE_WIDTH` (`tokens.js`) est exporté mais n'a plus aucun usage — reste de
  l'ancienne maquette phone-frame statique, avant le passage au responsive réel.
- Le bouton de sauvegarde de `LogEpisode.jsx` passe l'icône à `ti-loader-2`
  pendant l'enregistrement, mais `global.css` ne définit aucune animation de
  rotation pour cette classe : le loader reste visuellement figé.
- Les zones de `BodySilhouette.jsx` sont des `<path>` cliquables sans
  `role="button"`/`tabIndex`/gestion clavier — seule interaction majeure de
  l'app à échapper à la discipline d'accessibilité appliquée partout ailleurs.

## 9. Garde-fous produit (santé)

- Rester sur du **suivi / restitution de données**, pas de **diagnostic** ni de
  recommandation de traitement → reste dans le « bien-être », évite le statut de
  dispositif médical (marquage CE), bien plus lourd.
- Données de santé = sensibles. Si passage au cloud : hébergement HDS (France),
  consentement clair, chiffrement.
- La confiance est l'actif central : contenu validé médicalement, transparence
  sur les données. C'est aussi pourquoi l'option planétaire est cloisonnée.
- **Avertissement médical** (`MEDICAL_DISCLAIMER`, `HealthConsent.jsx`) : affiché
  à l'inscription, dans l'écran d'accord et en dernière étape du tutoriel (que
  « Passer » ne permet pas d'éviter), plus l'avertissement du rapport médecin.
  Ne pas le retirer.
- **Consentement** : ne jamais précocher les cases. Tout changement du texte
  impose d'augmenter `CONSENT_VERSION` (`server/src/app.js`).
- **CSP** : aucun script inline ni externe. Un nouveau service externe doit être
  ajouté à `connect-src` dans `server/src/app.js`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- The database schema (`server/migrations/*.sql`) is only included if graphify's SQL support is installed: `pip install "graphifyy[sql]"` (or `uv tool install "graphifyy[sql]"`). Without it, graphify warns that the .sql files contributed nothing.
