# Graph Report - Garden-v2  (2026-09-27)

## Corpus Check
- 58 files · ~77,394 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 742 nodes · 1839 edges · 41 communities (38 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fc19693`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LogEpisode.jsx
- GrowingGarden.jsx
- package.json
- MedicalReport.jsx
- App.jsx
- CLAUDE.md — Contexte du projet « Pousse »
- Suivi de l'audit avant déploiement
- PlanetaryWidget.jsx
- fetchWeather
- GrowingGarden
- Déploiement de Pousse
- HealthProfile.jsx
- main.jsx
- scripts
- server/package.json
- storage.js
- 001_init.sql
- app.js
- security.js
- Plant
- api.test.js
- LogEpisode
- 3. Décisions de design importantes (à ne pas casser)
- ui.jsx
- Pousse — serveur et base de données
- feelings.js
- Dashboard.jsx
- dependencies
- Home
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
5. `react` - 22 edges
6. `normalizePeriods()` - 22 edges
7. `buildApp()` - 21 edges
8. `api()` - 20 edges
9. `dayKey()` - 20 edges
10. `colors` - 18 edges

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
Cohesion: 0.12
Nodes (18): BodySilhouette(), ZONES, durations, efficacyLevels, genderFilteredTriggers, zoneLabels, CELEB_PARTICLES, COND_PALETTE (+10 more)

### Community 1 - "GrowingGarden.jsx"
Cohesion: 0.04
Nodes (9): C, EXTRA_POLLEN_CFG, GRASS_POS, GROUND_COLORS, HILL_COLORS, POLLEN_CFG, SKY_GRADIENTS, VARIANTS (+1 more)

### Community 2 - "package.json"
Cohesion: 0.24
Nodes (8): description, name, private, type, version, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 3 - "MedicalReport.jsx"
Cohesion: 0.13
Nodes (17): bmi(), treatmentsForReport(), computeAvgPerDay(), computeCompleteness(), computeConditionBreakdown(), computeDurationBreakdown(), computeEvolution(), computeIntensityDistribution() (+9 more)

### Community 4 - "App.jsx"
Cohesion: 0.06
Nodes (71): react, App(), AppWithStore(), isOnboarded(), markOnboarded(), Onboarding(), handleNext(), handleSkip() (+63 more)

### Community 5 - "CLAUDE.md — Contexte du projet « Pousse »"
Cohesion: 0.11
Nodes (16): 0. État actuel, 1. Le projet en une phrase, 2. Origine et raisonnement (résumé de la conversation de conception), 4. Architecture modulaire (le cœur technique), 5. Structure des fichiers, 6. Conventions de code, 7. Lancer le projet, 8. Pistes de travail à venir (non encore faites) (+8 more)

### Community 6 - "Suivi de l'audit avant déploiement"
Cohesion: 0.29
Nodes (6): P0 — bloquant pour toute mise en ligne, P1 — avant le lancement public, P2 — après le lancement, Petits correctifs hors plan, Points relevés à l'analyse de la v10 (non traités), Suivi de l'audit avant déploiement

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
Cohesion: 0.09
Nodes (37): BodySection(), addWeight(), card(), fieldLabel, input, LifestyleSection(), MyTreatmentsBlock(), add() (+29 more)

### Community 12 - "main.jsx"
Cohesion: 0.18
Nodes (13): @fontsource-variable/fraunces, @fontsource-variable/nunito, react-dom, @tabler/icons-webfont, themeStyle, src_theme_global, palette, applyTheme() (+5 more)

### Community 13 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, migrate, start, test

### Community 14 - "server/package.json"
Cohesion: 0.12
Nodes (14): fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, nodemailer, description, engines (+6 more)

### Community 15 - "storage.js"
Cohesion: 0.12
Nodes (52): 4bis. Raccourcis rapides, handleImport(), clearSent(), cursorKey(), empty(), getCursor(), key(), listeners (+44 more)

### Community 16 - "001_init.sql"
Cohesion: 0.21
Nodes (14): feelings, episodes, episodes_rev_idx, episodes_time_idx, feelings_rev_idx, profiles, profiles_rev_idx, sessions (+6 more)

### Community 17 - "app.js"
Cohesion: 0.17
Nodes (19): buildApp(), openSession(), requireUser(), checkConsent(), checkNewPassword(), checkSize(), cleanEmail(), cleanName() (+11 more)

### Community 18 - "security.js"
Cohesion: 0.39
Nodes (7): ref_node_crypto, ref_node_util, dummyVerify(), hashPassword(), nameKey(), scryptAsync, verifyPassword()

### Community 20 - "api.test.js"
Cohesion: 0.11
Nodes (19): ref_node_assert, ref_node_fs, ref_node_os, ref_node_path, ref_node_test, ref_node_url, pg, startSessionCleanup() (+11 more)

### Community 21 - "LogEpisode"
Cohesion: 0.27
Nodes (9): durationCategory(), intensityWord(), LogEpisode(), canLeave(), chooseCondition(), doSwitchCond(), goNext(), handleSave() (+1 more)

### Community 22 - "3. Décisions de design importantes (à ne pas casser)"
Cohesion: 0.33
Nodes (6): 3. Décisions de design importantes (à ne pas casser), SplashScreen(), ForagingBee(), Toggle(), isCustomCondition(), registerCustomConditions()

### Community 23 - "ui.jsx"
Cohesion: 0.12
Nodes (20): Chip(), ConfirmDialog(), PrimaryButton(), StreakBadge(), ThemeToggle(), TOAST_STYLES, ToastContext, ToastItem() (+12 more)

### Community 24 - "Pousse — serveur et base de données"
Cohesion: 0.17
Nodes (11): API, Contenu, Données de santé : points de vigilance, E-mails, Lancer en local, Limites connues et pistes, Mettre en production, Pousse — serveur et base de données (+3 more)

### Community 25 - "feelings.js"
Cohesion: 0.27
Nodes (14): dayLabel(), energyLabel(), feelingForDay(), feelingParts(), feelingsInPeriod(), isEmptyFeeling(), moodLabel(), summarizeFeelings() (+6 more)

### Community 26 - "Dashboard.jsx"
Cohesion: 0.11
Nodes (21): AnimatedNumber(), step(), buildCalendarGrid(), buildDaySeries(), buildSeries(), computeStats(), EFFICACY_SNOOZE_MS, EFFICACY_WINDOW_MS (+13 more)

### Community 27 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, nodemailer, pg

### Community 28 - "Home"
Cohesion: 0.15
Nodes (12): AppInner(), needsEfficacyFollowUp(), currentStreak(), dayKey(), gardenLoggedDays(), loggedDays(), logPeriodStart(), useStore() (+4 more)

### Community 30 - "CycleTracking.jsx"
Cohesion: 0.15
Nodes (39): chip(), flowLabel(), fmt(), input, linkBtn, note, PeriodRow(), remove() (+31 more)

### Community 31 - "getCyclePhase"
Cohesion: 0.40
Nodes (6): hasPhases(), getCyclePhase(), getEffectivePhaseDurations(), getPillPhase(), getUpcomingPhases(), CycleCorrelation()

### Community 32 - "QuickLog.jsx"
Cohesion: 0.16
Nodes (12): Portal(), conditionKeys, isSelectableCondition(), withoutBienetre(), DEFAULT_CONDITIONS, INTENSITY_WORDS, intensityWord(), MAX_FAVORITES (+4 more)

### Community 33 - "Home.jsx"
Cohesion: 0.13
Nodes (13): endEpisodePatch(), formatDuration(), pad(), FEELING_ENERGY, FEELING_MOODS, FEELING_SYMPTOMS, genderKey(), CYCLE_PHASES (+5 more)

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
Cohesion: 0.15
Nodes (19): CustomConditionForm(), submit(), CustomConditionsSection(), inputStyle, linkBtn, removeCustomCondition(), activeCustomConditions(), addCustomConditionPatch() (+11 more)

## Knowledge Gaps
- **159 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 275 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `QuickLog.jsx`, `GrowingGarden.jsx`, `package.json`, `Home.jsx`, `LogEpisode.jsx`, `MedicalReport.jsx`, `PlanetaryWidget.jsx`, `conditions.js`, `HealthProfile.jsx`, `main.jsx`, `storage.js`, `ui.jsx`, `Dashboard.jsx`, `CycleTracking.jsx`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `CLAUDE.md — Contexte du projet « Pousse »` connect `CLAUDE.md — Contexte du projet « Pousse »` to `GrowingGarden`, `3. Décisions de design importantes (à ne pas casser)`, `storage.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `3. Décisions de design importantes (à ne pas casser)` connect `3. Décisions de design importantes (à ne pas casser)` to `QuickLog.jsx`, `Home.jsx`, `MedicalReport.jsx`, `CLAUDE.md — Contexte du projet « Pousse »`, `PlanetaryWidget.jsx`, `GrowingGarden`, `storage.js`, `ui.jsx`, `Home`, `CycleTracking.jsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LogEpisode.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `GrowingGarden.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._
- **Should `MedicalReport.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._