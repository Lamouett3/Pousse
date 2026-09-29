# Jardin — journal de symptômes

Prototype React d'une application mobile de suivi de symptômes pour pathologies
chroniques. Saisie rapide d'épisodes, historique visuel, et rapport exportable
pour le médecin.

> **Pour reprendre le travail avec Claude Code** : ouvre ce dossier dans VS Code.
> Le fichier [`CLAUDE.md`](./CLAUDE.md) contient tout le contexte du projet
> (raisonnement de conception, décisions de design, architecture, conventions
> et pistes à venir). Claude Code le lit automatiquement.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:5173

## Écrans

- **Historique** — vue semaine / mois / année de ses épisodes (DA jardin)
- **Noter** — saisie modulaire d'un épisode (silhouette, intensité, déclencheurs…)
- **Rapport** — synthèse clinique exportable pour le médecin (registre sobre)
- **Profil** — genre, cycle menstruel, options

## Structure

Voir la section 5 de [`CLAUDE.md`](./CLAUDE.md). En bref :
`src/theme/tokens.js` centralise la direction artistique,
`src/data/conditions.js` définit les pathologies (logique modulaire),
`src/screens/` contient les quatre écrans, `src/components/` les briques partagées.

## Stack

React 18 + Vite. Aucune autre dépendance lourde, pour rester simple à reprendre.
