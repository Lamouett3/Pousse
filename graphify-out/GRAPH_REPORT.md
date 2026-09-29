# Graph Report - Garden-v2  (2026-09-28)

## Corpus Check
- 66 files · ~87,902 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 828 nodes · 2081 edges · 45 communities (40 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0303f4db`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LogEpisode.jsx
- GrowingGarden.jsx
- package.json
- MedicalReport.jsx
- auth.js
- CLAUDE.md — Contexte du projet « Pousse »
- Suivi de l'audit avant déploiement
- PlanetaryWidget.jsx
- fetchWeather
- GrowingGarden
- Déploiement de Pousse
- HealthProfile.jsx
- main.jsx
- data/reminders.js
- server/package.json
- storage.js
- 001_init.sql
- app.js
- security.js
- Plant
- server.js
- api.test.js
- 3. Décisions de design importantes (à ne pas casser)
- Home.jsx
- Pousse — serveur et base de données
- feelings.js
- dayKey
- dependencies
- App.jsx
- CycleTracking.jsx
- Profile.jsx
- QuickLog.jsx
- FeelingCard
- generate-icons.mjs
- dependencies
- devDependencies
- scripts
- overrides
- ErrorBoundary
- Dashboard.jsx
- astro.js
- colors
- tokens.js

## God Nodes (most connected - your core abstractions)
1. `MedicalReport()` - 33 edges
2. `Home()` - 27 edges
3. `buildApp()` - 25 edges
4. `dayKey()` - 25 edges
5. `Dashboard()` - 25 edges
6. `react` - 24 edges
7. `api()` - 24 edges
8. `LogEpisode()` - 23 edges
9. `normalizePeriods()` - 22 edges
10. `isRemoteMode()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `3. Décisions de design importantes (à ne pas casser)` --references--> `knockInsects()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `8. Pistes de travail à venir (non encore faites)` --references--> `LogEpisode()`  [INFERRED]
  CLAUDE.md → src/screens/LogEpisode.jsx
- `3. Décisions de design importantes (à ne pas casser)` --references--> `SplashScreen()`  [INFERRED]
  CLAUDE.md → src/App.jsx
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `CelestialSun()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `3. Décisions de design importantes (à ne pas casser)` --references--> `Plant()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx

## Import Cycles
- None detected.

## Communities (45 total, 5 thin omitted)

### Community 0 - "LogEpisode.jsx"
Cohesion: 0.06
Nodes (51): BodySilhouette(), ZONES, CustomConditionForm(), submit(), CustomConditionsSection(), inputStyle, linkBtn, removeCustomCondition() (+43 more)

### Community 1 - "GrowingGarden.jsx"
Cohesion: 0.04
Nodes (9): C, EXTRA_POLLEN_CFG, GRASS_POS, GROUND_COLORS, HILL_COLORS, POLLEN_CFG, SKY_GRADIENTS, VARIANTS (+1 more)

### Community 2 - "package.json"
Cohesion: 0.24
Nodes (8): description, name, private, type, version, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 3 - "MedicalReport.jsx"
Cohesion: 0.12
Nodes (19): bmi(), lifestyleForReport(), treatmentsForReport(), useStore(), computeAvgPerDay(), computeCompleteness(), computeConditionBreakdown(), computeDurationBreakdown() (+11 more)

### Community 4 - "auth.js"
Cohesion: 0.12
Nodes (40): App(), ago(), btn(), CloudBackup(), handleDelete(), handleExport(), handleImport(), saveEmail() (+32 more)

### Community 5 - "CLAUDE.md — Contexte du projet « Pousse »"
Cohesion: 0.11
Nodes (16): 0. État actuel, 1. Le projet en une phrase, 2. Origine et raisonnement (résumé de la conversation de conception), 4. Architecture modulaire (le cœur technique), 5. Structure des fichiers, 6. Conventions de code, 7. Lancer le projet, 8. Pistes de travail à venir (non encore faites) (+8 more)

### Community 6 - "Suivi de l'audit avant déploiement"
Cohesion: 0.25
Nodes (7): Nouveautés hors plan, P0 — bloquant pour toute mise en ligne, P1 — avant le lancement public, P2 — après le lancement, Petits correctifs hors plan, Points relevés à l'analyse de la v10 (non traités), Suivi de l'audit avant déploiement

### Community 7 - "PlanetaryWidget.jsx"
Cohesion: 0.23
Nodes (13): dateIn(), daysUntil(), illuminationOf(), inDaysLabel(), litPath(), MiniMoon(), MOON, MoonIcon() (+5 more)

### Community 8 - "fetchWeather"
Cohesion: 0.70
Nodes (4): classifyWeather(), fetchWeather(), getCache(), setCache()

### Community 9 - "GrowingGarden"
Cohesion: 0.33
Nodes (7): 5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil), CelestialMoon(), CelestialSun(), getPlantMaturity(), getTimeOfDay(), GrowingGarden(), knockInsects()

### Community 10 - "Déploiement de Pousse"
Cohesion: 0.29
Nodes (6): Déploiement de Pousse, Important — données, Option 1 — Netlify (le plus simple, glisser-déposer), Option 2 — Vercel, Option 3 — GitHub Pages, Vérifier en local avant de déployer

### Community 11 - "HealthProfile.jsx"
Cohesion: 0.08
Nodes (38): BodySection(), addWeight(), card(), fieldLabel, input, LifestyleSection(), MyTreatmentsBlock(), add() (+30 more)

### Community 12 - "main.jsx"
Cohesion: 0.18
Nodes (13): @fontsource-variable/fraunces, @fontsource-variable/nunito, react-dom, @tabler/icons-webfont, themeStyle, src_theme_global, palette, applyTheme() (+5 more)

### Community 13 - "data/reminders.js"
Cohesion: 0.17
Nodes (28): EveningReminder(), changeTime(), toggle(), tryIt(), alreadyPastToday(), b64urlToBytes(), DEFAULT_PREFS, DEFAULT_TIME (+20 more)

### Community 14 - "server/package.json"
Cohesion: 0.11
Nodes (17): fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, description, engines, node (+9 more)

### Community 15 - "storage.js"
Cohesion: 0.07
Nodes (66): 4bis. Raccourcis rapides, registerCustomConditions(), hasPhases(), endEpisodePatch(), clearSent(), cursorKey(), empty(), getCursor() (+58 more)

### Community 16 - "001_init.sql"
Cohesion: 0.17
Nodes (16): feelings, episodes, episodes_rev_idx, episodes_time_idx, feelings_rev_idx, profiles, profiles_rev_idx, sessions (+8 more)

### Community 17 - "app.js"
Cohesion: 0.15
Nodes (21): nodemailer, buildApp(), openSession(), requireUser(), checkConsent(), checkNewPassword(), checkSize(), cleanEmail() (+13 more)

### Community 18 - "security.js"
Cohesion: 0.39
Nodes (7): ref_node_crypto, ref_node_util, dummyVerify(), hashPassword(), nameKey(), scryptAsync, verifyPassword()

### Community 20 - "server.js"
Cohesion: 0.17
Nodes (13): ref_node_fs, ref_node_path, ref_node_url, pg, startSessionCleanup(), config, createPool(), withTransaction() (+5 more)

### Community 21 - "api.test.js"
Cohesion: 0.11
Nodes (17): ref_node_os, web-push, DEFAULT_PUSH_HOSTS, isAllowedEndpoint(), isValidTimeZone(), REMINDER_MESSAGES, reminderPayload(), runReminders() (+9 more)

### Community 22 - "3. Décisions de design importantes (à ne pas casser)"
Cohesion: 0.10
Nodes (33): 3. Décisions de design importantes (à ne pas casser), ref_node_assert, ref_node_test, SplashScreen(), between(), clamp(), createFauna(), decide() (+25 more)

### Community 23 - "Home.jsx"
Cohesion: 0.14
Nodes (14): ConfirmDialog(), PrimaryButton(), Screen(), StreakBadge(), ThemeToggle(), TOAST_STYLES, ToastContext, ToastItem() (+6 more)

### Community 24 - "Pousse — serveur et base de données"
Cohesion: 0.15
Nodes (12): API, Contenu, Données de santé : points de vigilance, E-mails, Lancer en local, Limites connues et pistes, Mettre en production, Pousse — serveur et base de données (+4 more)

### Community 25 - "feelings.js"
Cohesion: 0.20
Nodes (17): dayLabel(), energyLabel(), FEELING_ENERGY, FEELING_MOODS, FEELING_SYMPTOMS, feelingForDay(), feelingParts(), feelingsInPeriod() (+9 more)

### Community 26 - "dayKey"
Cohesion: 0.19
Nodes (16): buildCalendarGrid(), buildDaySeries(), buildSeries(), computeStats(), EFFICACY_SNOOZE_MS, EFFICACY_WINDOW_MS, fmt1(), formatHour() (+8 more)

### Community 27 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, nodemailer, pg (+1 more)

### Community 28 - "App.jsx"
Cohesion: 0.14
Nodes (16): react, AppInner(), isOnboarded(), markOnboarded(), Onboarding(), handleNext(), handleSkip(), ONBOARDING_STEPS (+8 more)

### Community 30 - "CycleTracking.jsx"
Cohesion: 0.15
Nodes (39): chip(), flowLabel(), fmt(), input, linkBtn, note, PeriodRow(), remove() (+31 more)

### Community 31 - "Profile.jsx"
Cohesion: 0.12
Nodes (14): AppWithStore(), CycleModePicker(), ScreenHeader(), Segmented(), Toggle(), useToast(), CYCLE_LENGTH_RANGE, PHASE_RANGES (+6 more)

### Community 32 - "QuickLog.jsx"
Cohesion: 0.28
Nodes (6): Portal(), DEFAULT_CONDITIONS, INTENSITY_WORDS, MAX_FAVORITES, TOUCH_MIN, type

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
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 38 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, path-scurry, lru-cache

### Community 40 - "Dashboard.jsx"
Cohesion: 0.14
Nodes (11): AnimatedNumber(), step(), formatDuration(), pad(), BAR_COLOR, CYCLE_BAR_COLORS, EpisodeList(), HEAT_LEVELS (+3 more)

### Community 41 - "astro.js"
Cohesion: 0.19
Nodes (11): compute(), getMoonPhase(), getMoonPhaseIndex(), getMoonPhaseName(), J2000, KNOWN_NEW_MOON, MOON_PHASES_8, PHASE_NAMES (+3 more)

### Community 42 - "colors"
Cohesion: 0.38
Nodes (6): HealthConsent(), MIN_AGE, colors, font, radius, shadow

### Community 43 - "tokens.js"
Cohesion: 0.28
Nodes (7): CONTAINER, cssVarName(), NAV_HEIGHT, SCREEN_PADDING, spacing, themeCss(), v()

## Knowledge Gaps
- **172 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 290 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `LogEpisode.jsx`, `GrowingGarden.jsx`, `package.json`, `QuickLog.jsx`, `auth.js`, `MedicalReport.jsx`, `PlanetaryWidget.jsx`, `Dashboard.jsx`, `colors`, `HealthProfile.jsx`, `main.jsx`, `data/reminders.js`, `storage.js`, `3. Décisions de design importantes (à ne pas casser)`, `Home.jsx`, `CycleTracking.jsx`, `Profile.jsx`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `3. Décisions de design importantes (à ne pas casser)` connect `3. Décisions de design importantes (à ne pas casser)` to `LogEpisode.jsx`, `FeelingCard`, `MedicalReport.jsx`, `CLAUDE.md — Contexte du projet « Pousse »`, `PlanetaryWidget.jsx`, `GrowingGarden`, `tokens.js`, `storage.js`, `Plant`, `App.jsx`, `CycleTracking.jsx`, `Profile.jsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LogEpisode.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06110102843315184 - nodes in this community are weakly interconnected._
- **Should `GrowingGarden.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `MedicalReport.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1226215644820296 - nodes in this community are weakly interconnected._