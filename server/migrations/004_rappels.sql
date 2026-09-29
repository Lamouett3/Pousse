-- =============================================================
-- Rappel du soir (« moment d'écoute ») : notifications push Web.
-- Un abonnement = un appareil (navigateur) d'un compte. Le réglage (heure,
-- fuseau horaire) est propre à l'appareil : on peut être rappelé sur son
-- téléphone et pas sur son ordinateur.
-- Aucune donnée de santé ici. L'adresse de l'abonnement (endpoint) désigne un
-- service de push (Google, Mozilla, Apple…), jamais un serveur quelconque :
-- elle est contrôlée par l'API avant enregistrement.
-- =============================================================
CREATE TABLE push_subscriptions (
  endpoint       text PRIMARY KEY CHECK (char_length(endpoint) <= 1000),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh         text NOT NULL CHECK (char_length(p256dh) <= 200),
  auth           text NOT NULL CHECK (char_length(auth) <= 100),
  reminder_time  time NOT NULL,
  timezone       text NOT NULL CHECK (char_length(timezone) <= 64),
  last_sent_day  date,           -- jour local du dernier rappel traité (envoyé ou inutile)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_id);
