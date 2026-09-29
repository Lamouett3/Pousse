# Graph Report - Garden-v2  (2026-09-27)

## Corpus Check
- 54 files · ~73,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 720 nodes · 1787 edges · 41 communities (38 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e79aadc0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LogEpisode.jsx
- GrowingGarden.jsx
- package.json
- MedicalReport.jsx
- App.jsx
- CLAUDE.md — Contexte du projet « Pousse »
- useStore
- PlanetaryWidget.jsx
- fetchWeather
- GrowingGarden
- Déploiement de Pousse
- HealthProfile.jsx
- main.jsx
- react
- server/package.json
- storage.js
- 001_init.sql
- app.js
- security.js
- Plant
- migrate.js
- LogEpisode
- Profile.jsx
- ui.jsx
- Pousse — serveur et base de données
- Dashboard
- Dashboard.jsx
- dependencies
- Home
- api.test.js
- CycleTracking.jsx
- getCyclePhase
- QuickLog.jsx
- Home.jsx
- generate-icons.mjs
- dependencies
- devDependencies
- scripts
- overrides
- ErrorBoundary
- conditions.js

## God Nodes (most connected - your core abstractions)
1. `MedicalReport()` - 33 edges
2. `Home()` - 27 edges
3. `Dashboard()` - 25 edges
4. `LogEpisode()` - 23 edges
5. `normalizePeriods()` - 22 edges
6. `react` - 21 edges
7. `dayKey()` - 20 edges
8. `buildApp()` - 19 edges
9. `api()` - 17 edges
10. `CloudBackup()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `3. Décisions de design importantes (à ne pas casser)` --references--> `startleInsects()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `8. Pistes de travail à venir (non encore faites)` --references--> `LogEpisode()`  [INFERRED]
  CLAUDE.md → src/screens/LogEpisode.jsx
- `3. Décisions de design importantes (à ne pas casser)` --references--> `SplashScreen()`  [INFERRED]
  CLAUDE.md → src/App.jsx
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `CelestialSun()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `3. Décisions de design importantes (à ne pas casser)` --references--> `ForagingBee()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx

## Import Cycles
- None detected.

## Communities (41 total, 3 thin omitted)

### Community 0 - "LogEpisode.jsx"
Cohesion: 0.14
Nodes (17): BodySilhouette(), ZONES, zoneLabels, CELEB_PARTICLES, COND_PALETTE, condPal(), fieldLabel, formatWhen() (+9 more)

### Community 1 - "GrowingGarden.jsx"
Cohesion: 0.04
Nodes (9): C, EXTRA_POLLEN_CFG, GRASS_POS, GROUND_COLORS, HILL_COLORS, POLLEN_CFG, SKY_GRADIENTS, VARIANTS (+1 more)

### Community 2 - "package.json"
Cohesion: 0.24
Nodes (8): description, name, private, type, version, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 3 - "MedicalReport.jsx"
Cohesion: 0.11
Nodes (21): bmi(), formatKg(), latestWeight(), lifestyleForReport(), sortedWeights(), treatmentsForReport(), computeAvgPerDay(), computeCompleteness() (+13 more)

### Community 4 - "App.jsx"
Cohesion: 0.07
Nodes (74): App(), AppWithStore(), isOnboarded(), markOnboarded(), Onboarding(), handleNext(), handleSkip(), ONBOARDING_STEPS (+66 more)

### Community 5 - "CLAUDE.md — Contexte du projet « Pousse »"
Cohesion: 0.11
Nodes (16): 0. État actuel, 1. Le projet en une phrase, 2. Origine et raisonnement (résumé de la conversation de conception), 4. Architecture modulaire (le cœur technique), 5. Structure des fichiers, 6. Conventions de code, 7. Lancer le projet, 8. Pistes de travail à venir (non encore faites) (+8 more)

### Community 6 - "useStore"
Cohesion: 0.29
Nodes (7): AppInner(), useToast(), needsEfficacyFollowUp(), useStore(), AstroSection(), Profile(), alpha()

### Community 7 - "PlanetaryWidget.jsx"
Cohesion: 0.12
Nodes (23): compute(), dateIn(), daysUntil(), illuminationOf(), inDaysLabel(), litPath(), MiniMoon(), MOON (+15 more)

### Community 8 - "fetchWeather"
Cohesion: 0.70
Nodes (4): classifyWeather(), fetchWeather(), getCache(), setCache()

### Community 9 - "GrowingGarden"
Cohesion: 0.33
Nodes (7): 5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil), CelestialMoon(), CelestialSun(), getPlantMaturity(), getTimeOfDay(), GrowingGarden(), startleInsects()

### Community 10 - "Déploiement de Pousse"
Cohesion: 0.29
Nodes (6): Déploiement de Pousse, Important — données, Option 1 — Netlify (le plus simple, glisser-déposer), Option 2 — Vercel, Option 3 — GitHub Pages, Vérifier en local avant de déployer

### Community 11 - "HealthProfile.jsx"
Cohesion: 0.10
Nodes (33): BodySection(), addWeight(), card(), fieldLabel, input, LifestyleSection(), MyTreatmentsBlock(), add() (+25 more)

### Community 12 - "main.jsx"
Cohesion: 0.18
Nodes (13): @fontsource-variable/fraunces, @fontsource-variable/nunito, react-dom, @tabler/icons-webfont, themeStyle, src_theme_global, palette, applyTheme() (+5 more)

### Community 14 - "server/package.json"
Cohesion: 0.11
Nodes (17): fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, description, engines, node (+9 more)

### Community 15 - "storage.js"
Cohesion: 0.21
Nodes (28): 4bis. Raccourcis rapides, registerCustomConditions(), hasPhases(), track(), cycleLogKey(), DEFAULT_PROFILE, deleteEpisode(), episodesKey() (+20 more)

### Community 16 - "001_init.sql"
Cohesion: 0.21
Nodes (14): feelings, episodes, episodes_rev_idx, episodes_time_idx, feelings_rev_idx, profiles, profiles_rev_idx, sessions (+6 more)

### Community 17 - "app.js"
Cohesion: 0.17
Nodes (18): nodemailer, buildApp(), openSession(), requireUser(), checkNewPassword(), checkSize(), cleanEmail(), cleanName() (+10 more)

### Community 18 - "security.js"
Cohesion: 0.39
Nodes (7): ref_node_crypto, ref_node_util, dummyVerify(), hashPassword(), nameKey(), scryptAsync, verifyPassword()

### Community 20 - "migrate.js"
Cohesion: 0.20
Nodes (11): ref_node_fs, ref_node_path, ref_node_url, pg, startSessionCleanup(), config, createPool(), withTransaction() (+3 more)

### Community 21 - "LogEpisode"
Cohesion: 0.25
Nodes (9): isCustomCondition(), intensityWord(), LogEpisode(), canLeave(), chooseCondition(), doSwitchCond(), goNext(), handleSave() (+1 more)

### Community 22 - "Profile.jsx"
Cohesion: 0.11
Nodes (15): 3. Décisions de design importantes (à ne pas casser), SplashScreen(), CycleModePicker(), ForagingBee(), Screen(), ScreenHeader(), Segmented(), Toggle() (+7 more)

### Community 23 - "ui.jsx"
Cohesion: 0.12
Nodes (19): Chip(), ConfirmDialog(), PrimaryButton(), StreakBadge(), ThemeToggle(), TOAST_STYLES, ToastContext, ToastItem() (+11 more)

### Community 24 - "Pousse — serveur et base de données"
Cohesion: 0.17
Nodes (11): API, Contenu, Données de santé : points de vigilance, E-mails, Lancer en local, Limites connues et pistes, Mettre en production, Pousse — serveur et base de données (+3 more)

### Community 25 - "Dashboard"
Cohesion: 0.17
Nodes (16): feelingForDay(), feelingsInPeriod(), isEmptyFeeling(), buildDaySeries(), buildSeries(), computeStats(), EFFICACY_SNOOZE_MS, EFFICACY_WINDOW_MS (+8 more)

### Community 26 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (13): AnimatedNumber(), step(), buildCalendarGrid(), formatHour(), CYCLE_PHASES, BAR_COLOR, CYCLE_BAR_COLORS, EpisodeList() (+5 more)

### Community 27 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, nodemailer, pg

### Community 28 - "Home"
Cohesion: 0.15
Nodes (13): durationCategory(), endEpisodePatch(), formatDuration(), pad(), currentStreak(), dayKey(), gardenLoggedDays(), loggedDays() (+5 more)

### Community 29 - "api.test.js"
Cohesion: 0.22
Nodes (6): ref_node_assert, ref_node_test, H, mailer, pool, sent

### Community 30 - "CycleTracking.jsx"
Cohesion: 0.15
Nodes (39): chip(), flowLabel(), fmt(), input, linkBtn, note, PeriodRow(), remove() (+31 more)

### Community 31 - "getCyclePhase"
Cohesion: 0.67
Nodes (4): getCyclePhase(), getEffectivePhaseDurations(), getUpcomingPhases(), CycleCorrelation()

### Community 32 - "QuickLog.jsx"
Cohesion: 0.16
Nodes (11): Portal(), conditionKeys, isSelectableCondition(), DEFAULT_CONDITIONS, INTENSITY_WORDS, intensityWord(), MAX_FAVORITES, pickConditions() (+3 more)

### Community 33 - "Home.jsx"
Cohesion: 0.17
Nodes (16): dayLabel(), energyLabel(), FEELING_ENERGY, FEELING_MOODS, FEELING_SYMPTOMS, feelingParts(), genderKey(), moodLabel() (+8 more)

### Community 34 - "generate-icons.mjs"
Cohesion: 0.20
Nodes (9): ref_fs, ref_path, sharp, ref_url, __dirname, outDir, sizes, svg (+1 more)

### Community 35 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, @fontsource-variable/fraunces, @fontsource-variable/nunito, react, react-dom, @tabler/icons-webfont

### Community 36 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, sharp, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 37 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 38 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, path-scurry, lru-cache

### Community 40 - "conditions.js"
Cohesion: 0.12
Nodes (23): CustomConditionForm(), submit(), CustomConditionsSection(), inputStyle, linkBtn, removeCustomCondition(), activeCustomConditions(), addCustomConditionPatch() (+15 more)

## Knowledge Gaps
- **151 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 264 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `LogEpisode.jsx`, `GrowingGarden.jsx`, `package.json`, `Home.jsx`, `App.jsx`, `MedicalReport.jsx`, `QuickLog.jsx`, `PlanetaryWidget.jsx`, `conditions.js`, `HealthProfile.jsx`, `main.jsx`, `storage.js`, `Profile.jsx`, `ui.jsx`, `Dashboard.jsx`, `CycleTracking.jsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `CLAUDE.md — Contexte du projet « Pousse »` connect `CLAUDE.md — Contexte du projet « Pousse »` to `GrowingGarden`, `Profile.jsx`, `storage.js`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `3. Décisions de design importantes (à ne pas casser)` connect `Profile.jsx` to `QuickLog.jsx`, `Home.jsx`, `MedicalReport.jsx`, `CLAUDE.md — Contexte du projet « Pousse »`, `useStore`, `PlanetaryWidget.jsx`, `GrowingGarden`, `storage.js`, `ui.jsx`, `Home`, `CycleTracking.jsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LogEpisode.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `GrowingGarden.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._
- **Should `MedicalReport.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._