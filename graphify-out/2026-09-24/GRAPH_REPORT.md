# Graph Report - Garden-v2  (2026-09-24)

## Corpus Check
- 29 files · ~41,415 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 347 nodes · 743 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a913da92`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- GrowingGarden.jsx
- package.json
- MedicalReport.jsx
- storage.js
- CLAUDE.md — Contexte du projet « Pousse »
- auth.js
- PlanetaryWidget.jsx
- fetchWeather
- 5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)
- Déploiement de Pousse
- Home.jsx

## God Nodes (most connected - your core abstractions)
1. `MedicalReport()` - 23 edges
2. `Home()` - 20 edges
3. `dayKey()` - 19 edges
4. `Dashboard()` - 16 edges
5. `CLAUDE.md — Contexte du projet « Pousse »` - 14 edges
6. `react` - 14 edges
7. `StoreProvider()` - 13 edges
8. `useStore()` - 13 edges
9. `getMoonPhase()` - 11 edges
10. `getCyclePhase()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `CelestialSun()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `8. Pistes de travail à venir (non encore faites)` --references--> `EpisodeList()`  [INFERRED]
  CLAUDE.md → src/screens/Dashboard.jsx
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `fetchWeather()`  [INFERRED]
  CLAUDE.md → src/data/weather.js
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `getTimeOfDay()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx
- `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)` --references--> `CelestialMoon()`  [INFERRED]
  CLAUDE.md → src/components/GrowingGarden.jsx

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (48): 0. État actuel, react, AppInner(), AppWithStore(), Onboarding(), ONBOARDING_STEPS, TABS, ZONES (+40 more)

### Community 1 - "GrowingGarden.jsx"
Cohesion: 0.04
Nodes (8): C, EXTRA_POLLEN_CFG, GRASS_POS, HILL_COLORS, POLLEN_CFG, SKY_GRADIENTS, VARIANTS, WIND

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (40): dependencies, @fontsource-variable/fraunces, @fontsource-variable/nunito, react, react-dom, @tabler/icons-webfont, description, devDependencies (+32 more)

### Community 3 - "MedicalReport.jsx"
Cohesion: 0.08
Nodes (36): 8. Pistes de travail à venir (non encore faites), AnimatedNumber(), buildCalendarGrid(), buildDaySeries(), buildSeries(), computeStats(), filterByPeriod(), fmt1() (+28 more)

### Community 4 - "storage.js"
Cohesion: 0.24
Nodes (23): 4bis. Raccourcis rapides, ConfirmDialog(), cycleLogKey(), DEFAULT_PROFILE, deleteEpisode(), episodesKey(), loadCycleLogs(), loadEpisodes() (+15 more)

### Community 5 - "CLAUDE.md — Contexte du projet « Pousse »"
Cohesion: 0.12
Nodes (15): 1. Le projet en une phrase, 2. Origine et raisonnement (résumé de la conversation de conception), 3. Décisions de design importantes (à ne pas casser), 4. Architecture modulaire (le cœur technique), 5. Structure des fichiers, 6. Conventions de code, 7. Lancer le projet, 9. Garde-fous produit (santé) (+7 more)

### Community 6 - "auth.js"
Cohesion: 0.27
Nodes (18): App(), clearSession(), currentAccountId(), currentAccountName(), dayKeyForSeed(), getSession(), hashPassword(), loadAccounts() (+10 more)

### Community 7 - "PlanetaryWidget.jsx"
Cohesion: 0.13
Nodes (15): compute(), MOON, PHASE_ICONS, PlanetaryWidget(), getMoonPhase(), getMoonPhaseIndex(), getMoonPhaseName(), J2000 (+7 more)

### Community 8 - "fetchWeather"
Cohesion: 0.70
Nodes (4): classifyWeather(), fetchWeather(), getCache(), setCache()

### Community 9 - "5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)"
Cohesion: 0.40
Nodes (6): 5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil), CelestialMoon(), CelestialSun(), getPlantMaturity(), getTimeOfDay(), GrowingGarden()

### Community 10 - "Déploiement de Pousse"
Cohesion: 0.29
Nodes (6): Déploiement de Pousse, Important — données, Option 1 — Netlify (le plus simple, glisser-déposer), Option 2 — Vercel, Option 3 — GitHub Pages, Vérifier en local avant de déployer

### Community 11 - "Home.jsx"
Cohesion: 0.11
Nodes (16): PrimaryButton(), CYCLE_PHASES, gardenLoggedDays(), getCyclePhase(), getEffectivePhaseDurations(), getPillPhase(), getUpcomingPhases(), logPeriodStart() (+8 more)

## Knowledge Gaps
- **75 isolated node(s):** `TABS`, `ONBOARDING_STEPS`, `C`, `WIND`, `GRASS_POS` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 165 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `GrowingGarden.jsx`, `package.json`, `MedicalReport.jsx`, `storage.js`, `auth.js`, `PlanetaryWidget.jsx`, `Home.jsx`?**
  _High betweenness centrality (0.273) - this node is a cross-community bridge._
- **Why does `CLAUDE.md — Contexte du projet « Pousse »` connect `CLAUDE.md — Contexte du projet « Pousse »` to `App.jsx`, `5bis. Le jardin qui pousse (fonctionnalité signature de l'accueil)`, `MedicalReport.jsx`, `storage.js`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `TABS`, `ONBOARDING_STEPS`, `C` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05046948356807512 - nodes in this community are weakly interconnected._
- **Should `GrowingGarden.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0392156862745098 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0507399577167019 - nodes in this community are weakly interconnected._
- **Should `MedicalReport.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0803633822501747 - nodes in this community are weakly interconnected._