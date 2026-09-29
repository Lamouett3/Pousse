// Envoi des e-mails (réinitialisation du mot de passe).
// Avec SMTP_URL (ex. smtps://utilisateur:motdepasse@smtp.exemple.fr:465) : envoi réel.
// Sans SMTP_URL : le message est écrit dans le journal du serveur (développement uniquement).
import nodemailer from 'nodemailer'

export function createMailer(config, log = console) {
  if (!config.smtpUrl) {
    return {
      async send({ to, subject, text }) {
        log.warn?.(`[e-mail non envoyé : SMTP_URL absent] à ${to} — ${subject}\n${text}`)
      },
    }
  }
  const transport = nodemailer.createTransport(config.smtpUrl)
  return {
    async send({ to, subject, text, html }) {
      await transport.sendMail({ from: config.mailFrom, to, subject, text, html })
    },
  }
}
