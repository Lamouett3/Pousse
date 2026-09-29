# Graph Report - Garden-v2  (2026-09-26)

## Corpus Check
- 49 files · ~64,808 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 2, .css 1)

## Summary
- 641 nodes · 1517 edges · 40 communities (37 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c116aaa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LogEpisode.jsx
- GrowingGarden.jsx
- package.json
- MedicalReport.jsx
- storage.js
- CLAUDE.md — Contexte du projet « Pousse »
- 3. Décisions de design importantes (à ne pas casser)
- PlanetaryWidget.jsx
- fetchWeather
- GrowingGarden
- Déploiement de Pousse
- HealthProfile.jsx
- main.jsx
- App.jsx
- server/package.json
- app.js
- 001_init.sql
- buildApp
- security.js
- Plant
- migrate.js
- scripts
- Profile.jsx
- ui.jsx
- Pousse — serveur et base de données
- stats.js
- Dashboard.jsx
- dependencies
- Home.jsx
- feelings.js
- LogEpisode
- astro.js
- tokens.js
- FeelingCard
- generate-icons.mjs
- dependencies
- devDependencies
- scripts
- overrides
- ErrorBoundary

## God Nodes (most connected - your core abstractions)
1. `MedicalReport()` - 32 edges
2. `Home()` - 27 edges
3. `Dashboard()` - 21 edges
4. `dayKey()` - 20 edges
5. `react` - 19 edges
6. `LogEpisode()` - 19 edges
7. `buildApp()` - 17 edges
8. `syncNow()` - 16 edges
9. `CloudBackup()` - 15 edges
10. `track()` - 15 edges

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

## Communities (40 total, 3 thin omitted)

### Community 0 - "LogEpisode.jsx"
Cohesion: 0.12
Nodes (21): BodySilhouette(), ZONES, COND_ICONS, conditionKeys, conditions, durations, efficacyLevels, genderFilteredTriggers (+13 more)

### Community 1 - "GrowingGarden.jsx"
Cohesion: 0.04
Nodes (9): C, EXTRA_POLLEN_CFG, GRASS_POS, GROUND_COLORS, HILL_COLORS, POLLEN_CFG, SKY_GRADIENTS, VARIANTS (+1 more)

### Community 2 - "package.json"
Cohesion: 0.24
Nodes (8): description, name, private, type, version, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 3 - "MedicalReport.jsx"
Cohesion: 0.13
Nodes (17): bmi(), lifestyleForReport(), treatmentsForReport(), computeAvgPerDay(), computeConditionBreakdown(), computeDurationBreakdown(), computeEvolution(), computeIntensityDistribution() (+9 more)

### Community 4 - "storage.js"
Cohesion: 0.12
Nodes (52): 4bis. Raccourcis rapides, currentAccountId(), clearSent(), cursorKey(), empty(), getCursor(), key(), listeners (+44 more)

### Community 5 - "CLAUDE.md — Contexte du projet « Pousse »"
Cohesion: 0.12
Nodes (15): 1. Le projet en une phrase, 2. Origine et raisonnement (résumé de la conversation de conception), 4. Architecture modulaire (le cœur technique), 5. Structure des fichiers, 6. Conventions de code, 7. Lancer le projet, 8. Pistes de travail à venir (non encore faites), 9. Garde-fous produit (santé) (+7 more)

### Community 6 - "3. Décisions de design importantes (à ne pas casser)"
Cohesion: 0.50
Nodes (4): 3. Décisions de design importantes (à ne pas casser), SplashScreen(), ForagingBee(), Toggle()

### Community 7 - "PlanetaryWidget.jsx"
Cohesion: 0.22
Nodes (14): compute(), dateIn(), daysUntil(), illuminationOf(), inDaysLabel(), litPath(), MiniMoon(), MOON (+6 more)

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
Cohesion: 0.07
Nodes (48): BodySection(), addWeight(), card(), fieldLabel, input, LifestyleSection(), MyTreatmentsBlock(), add() (+40 more)

### Community 12 - "main.jsx"
Cohesion: 0.18
Nodes (13): @fontsource-variable/fraunces, @fontsource-variable/nunito, react-dom, @tabler/icons-webfont, themeStyle, src_theme_global, palette, applyTheme() (+5 more)

### Community 13 - "App.jsx"
Cohesion: 0.09
Nodes (49): 0. État actuel, react, App(), AppInner(), AppWithStore(), isOnboarded(), markOnboarded(), Onboarding() (+41 more)

### Community 14 - "server/package.json"
Cohesion: 0.14
Nodes (13): fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, pg, description, engines (+5 more)

### Community 15 - "app.js"
Cohesion: 0.20
Nodes (8): ref_node_path, credentials, DAY, ID, ISO, startSessionCleanup(), syncSchema, validDate()

### Community 16 - "001_init.sql"
Cohesion: 0.27
Nodes (12): feelings, episodes, episodes_rev_idx, episodes_time_idx, feelings_rev_idx, profiles, profiles_rev_idx, sessions (+4 more)

### Community 17 - "buildApp"
Cohesion: 0.36
Nodes (9): buildApp(), openSession(), requireUser(), checkNewPassword(), checkSize(), cleanName(), HttpError, hashToken() (+1 more)

### Community 18 - "security.js"
Cohesion: 0.39
Nodes (7): ref_node_crypto, ref_node_util, dummyVerify(), hashPassword(), nameKey(), scryptAsync, verifyPassword()

### Community 20 - "migrate.js"
Cohesion: 0.16
Nodes (12): ref_node_assert, ref_node_fs, ref_node_test, ref_node_url, config, createPool(), withTransaction(), migrate() (+4 more)

### Community 21 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, migrate, start, test

### Community 22 - "Profile.jsx"
Cohesion: 0.14
Nodes (13): Screen(), ScreenHeader(), Segmented(), useToast(), CYCLE_LENGTH_RANGE, PHASE_RANGES, useStore(), BirthYearField() (+5 more)

### Community 23 - "ui.jsx"
Cohesion: 0.16
Nodes (12): Chip(), ConfirmDialog(), PrimaryButton(), StreakBadge(), ThemeToggle(), TOAST_STYLES, ToastContext, ToastItem() (+4 more)

### Community 24 - "Pousse — serveur et base de données"
Cohesion: 0.18
Nodes (10): API, Contenu, Données de santé : points de vigilance, Lancer en local, Limites connues et pistes, Mettre en production, Pousse — serveur et base de données, Principe : hors ligne d'abord (+2 more)

### Community 25 - "stats.js"
Cohesion: 0.20
Nodes (16): buildDaySeries(), buildSeries(), computeStats(), EFFICACY_SNOOZE_MS, EFFICACY_WINDOW_MS, filterByPeriod(), fmt1(), getRefDate() (+8 more)

### Community 26 - "Dashboard.jsx"
Cohesion: 0.15
Nodes (12): AnimatedNumber(), step(), getMoonPhaseName(), buildCalendarGrid(), formatHour(), BAR_COLOR, CYCLE_BAR_COLORS, EpisodeList() (+4 more)

### Community 27 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit, @fastify/static, pg

### Community 28 - "Home.jsx"
Cohesion: 0.11
Nodes (18): endEpisodePatch(), formatDuration(), pad(), CYCLE_PHASES, gardenLoggedDays(), getCyclePhase(), getEffectivePhaseDurations(), getPillPhase() (+10 more)

### Community 29 - "feelings.js"
Cohesion: 0.21
Nodes (16): dayLabel(), energyLabel(), FEELING_ENERGY, FEELING_MOODS, FEELING_SYMPTOMS, feelingForDay(), feelingParts(), feelingsInPeriod() (+8 more)

### Community 30 - "LogEpisode"
Cohesion: 0.27
Nodes (9): durationCategory(), intensityWord(), LogEpisode(), canLeave(), chooseCondition(), doSwitchCond(), goNext(), handleSave() (+1 more)

### Community 31 - "astro.js"
Cohesion: 0.20
Nodes (9): getMoonPhase(), getMoonPhaseIndex(), J2000, KNOWN_NEW_MOON, MOON_PHASES_8, PHASE_NAMES, SYNODIC_MONTH, YearHeatmap() (+1 more)

### Community 32 - "tokens.js"
Cohesion: 0.24
Nodes (8): CONTAINER, cssVarName(), NAV_HEIGHT, SCREEN_PADDING, shadow, spacing, themeCss(), v()

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

## Knowledge Gaps
- **137 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `LogEpisode.jsx`, `GrowingGarden.jsx`, `package.json`, `MedicalReport.jsx`, `storage.js`, `PlanetaryWidget.jsx`, `HealthProfile.jsx`, `main.jsx`, `Profile.jsx`, `ui.jsx`, `Dashboard.jsx`, `Home.jsx`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `CLAUDE.md — Contexte du projet « Pousse »` connect `CLAUDE.md — Contexte du projet « Pousse »` to `GrowingGarden`, `storage.js`, `App.jsx`, `3. Décisions de design importantes (à ne pas casser)`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `LogEpisode()` connect `LogEpisode` to `LogEpisode.jsx`, `CLAUDE.md — Contexte du projet « Pousse »`, `App.jsx`, `Profile.jsx`, `ui.jsx`, `Home.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LogEpisode.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._
- **Should `GrowingGarden.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._
- **Should `MedicalReport.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._