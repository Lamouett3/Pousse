# =============================================================
# Pousse — image de production : application compilée + API sur le même serveur
# (même domaine : pas de CORS, cookie de session simple et sûr)
# =============================================================

# 1) Compilation de l'application, en mode « sauvegarde en ligne »
FROM node:22-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
ENV VITE_API_URL=/api
RUN npm run build

# 2) API
FROM node:22-alpine
WORKDIR /srv/pousse
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY server/migrations ./migrations
COPY --from=web /app/dist ./public
ENV STATIC_DIR=/srv/pousse/public PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "src/server.js"]
