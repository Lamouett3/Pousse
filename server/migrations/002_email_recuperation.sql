-- =============================================================
-- Adresse e-mail et récupération du mot de passe
-- L'adresse est obligatoire pour les nouveaux comptes (contrôle dans l'API) ;
-- les comptes existants peuvent l'ajouter depuis le profil.
-- =============================================================
ALTER TABLE users ADD COLUMN email text CHECK (email IS NULL OR char_length(email) <= 254);
ALTER TABLE users ADD COLUMN email_key text UNIQUE;   -- adresse normalisée (minuscules)

-- Liens de réinitialisation : jeton stocké haché, valable 30 minutes, à usage unique
CREATE TABLE password_resets (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE INDEX password_resets_user_idx ON password_resets(user_id);
