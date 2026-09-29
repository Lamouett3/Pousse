-- =============================================================
-- Pousse — schéma initial
--
-- Toutes les données de santé sont rattachées à un compte (user_id) et
-- supprimées avec lui (ON DELETE CASCADE : droit à l'effacement, RGPD art. 17).
--
-- Synchronisation : chaque écriture reçoit une révision croissante (sync_rev).
-- Un appareil demande « tout ce qui a changé depuis la révision N ».
-- Les suppressions sont conservées comme pierres tombales (deleted = true)
-- pour se propager aux autres appareils.
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS sync_rev;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  name_key      text NOT NULL UNIQUE,              -- nom normalisé (minuscules) pour l'unicité
  password_hash text NOT NULL,                     -- scrypt, jamais le mot de passe
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash    text PRIMARY KEY,                  -- SHA-256 du jeton ; le jeton brut n'est jamais stocké
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  user_agent    text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

-- Profil (sexe, cycle, jardin, repères lunaires…) : un document par compte
CREATE TABLE profiles (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL,
  rev         bigint NOT NULL
);
CREATE INDEX profiles_rev_idx ON profiles(user_id, rev);

-- Épisodes : identifiant créé par l'application (saisie possible hors ligne)
CREATE TABLE episodes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id          text NOT NULL CHECK (char_length(id) BETWEEN 1 AND 100),
  data        jsonb NOT NULL,
  occurred_at timestamptz,                         -- copie indexée de data.createdAt
  condition   text,                                -- copie indexée de data.condition
  intensity   smallint CHECK (intensity BETWEEN 0 AND 10),
  updated_at  timestamptz NOT NULL,
  deleted     boolean NOT NULL DEFAULT false,
  rev         bigint NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX episodes_rev_idx ON episodes(user_id, rev);
CREATE INDEX episodes_time_idx ON episodes(user_id, occurred_at) WHERE NOT deleted;

-- Raccourcis de saisie
CREATE TABLE shortcuts (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id          text NOT NULL CHECK (char_length(id) BETWEEN 1 AND 100),
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL,
  deleted     boolean NOT NULL DEFAULT false,
  rev         bigint NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX shortcuts_rev_idx ON shortcuts(user_id, rev);

-- Ressentis du jour (« Comment te sens-tu aujourd'hui ? ») : un par jour
CREATE TABLE feelings (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL,
  deleted     boolean NOT NULL DEFAULT false,
  rev         bigint NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX feelings_rev_idx ON feelings(user_id, rev);
