// Configuration lue dans les variables d'environnement (voir .env.example)
const env = process.env

export const config = {
  port: Number(env.PORT || 3000),
  host: env.HOST || '0.0.0.0',
  databaseUrl: env.DATABASE_URL || 'postgres://pousse:pousse-dev@localhost:5432/pousse',
  // Cookie de session « Secure » (HTTPS obligatoire) : à laisser à true en production
  cookieSecure: env.COOKIE_SECURE !== 'false',
  sessionDays: Number(env.SESSION_DAYS || 30),
  // Tentatives de connexion / inscription autorisées par minute et par IP
  authMaxPerMinute: Number(env.AUTH_MAX_PER_MINUTE || 10),
  // Origine de l'application si elle est servie depuis un autre domaine que l'API
  // (laisser vide si l'API est servie sur le même domaine, sous /api — recommandé)
  appOrigin: env.APP_ORIGIN || '',
  // Dossier du site compilé (npm run build) à servir par ce même serveur (facultatif)
  staticDir: env.STATIC_DIR || '',
  logLevel: env.LOG_LEVEL || 'info',
  // Adresse publique de l'application (liens envoyés par e-mail)
  appUrl: (env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Envoi d'e-mails : SMTP_URL vide = messages écrits dans le journal (développement)
  smtpUrl: env.SMTP_URL || '',
  mailFrom: env.MAIL_FROM || 'Pousse <no-reply@localhost>',
  // Rappel du soir (notifications push) : `npx web-push generate-vapid-keys`.
  // Sans ces clés, le rappel en ligne est indisponible.
  vapidPublicKey: env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: env.VAPID_PRIVATE_KEY || '',
  vapidSubject: env.VAPID_SUBJECT || '',   // ex. mailto:contact@ton-domaine.fr
  // Services de push autorisés (vide = liste par défaut, voir reminders.js)
  pushHosts: (env.PUSH_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
}
