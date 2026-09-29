# Déploiement de Pousse

L'app est une SPA statique (React + Vite). Une fois `npm run build` lancé, le
dossier `dist/` contient tout le site : tu peux l'héberger gratuitement sur
n'importe quel hébergeur statique. Voici les options les plus simples.

## Option 1 — Netlify (le plus simple, glisser-déposer)

1. `npm run build`
2. Va sur https://app.netlify.com/drop
3. Glisse le dossier `dist/` dans la page. C'est en ligne.

Pour un déploiement continu : connecte ton dépôt Git à Netlify avec
- Build command : `npm run build`
- Publish directory : `dist`

## Option 2 — Vercel

```bash
npm i -g vercel
npm run build
vercel deploy --prod
```
Ou connecte le dépôt Git sur https://vercel.com (détecte Vite automatiquement).

## Option 3 — GitHub Pages

```bash
npm run build
# pousser le contenu de dist/ sur la branche gh-pages
```
Note : sur Pages, si l'app n'est pas à la racine du domaine, ajoute
`base: '/nom-du-repo/'` dans `vite.config.js`.

## Vérifier en local avant de déployer

```bash
npm run build
npm run preview   # sert le build de prod sur http://localhost:4173
```

## Important — données

Deux modes de fonctionnement :

- **Local (par défaut)** : sans `VITE_API_URL` au moment du build, toutes les
  données restent dans le navigateur (`localStorage`). C'est le comportement
  historique : les données ne suivent pas l'utilisateur d'un appareil à l'autre.
- **Sauvegarde en ligne** : avec `VITE_API_URL=/api` et le serveur du dossier
  `server/` (API + PostgreSQL), chaque donnée est rattachée au compte et
  sauvegardée sur le serveur, tout en restant utilisable hors ligne.
  Déploiement complet : `docker compose up -d --build` (voir `server/README.md`,
  qui détaille aussi les obligations RGPD / HDS liées aux données de santé).
