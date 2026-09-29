-- =============================================================
-- Consentement explicite au traitement des données de santé (RGPD art. 9)
-- et déclaration d'âge, horodatés par le serveur.
--
-- health_consent_version : version du texte accepté (constante CONSENT_VERSION
-- dans src/app.js). Si le texte change, on augmente la version : les comptes
-- ayant accepté une version antérieure sont invités à accepter la nouvelle.
-- Les comptes créés avant cette migration n'ont pas de consentement : ils le
-- donnent à leur prochaine ouverture de l'app (la synchronisation est bloquée
-- d'ici là, leurs données restent sur l'appareil).
-- =============================================================
ALTER TABLE users ADD COLUMN health_consent_at      timestamptz;
ALTER TABLE users ADD COLUMN health_consent_version text CHECK (health_consent_version IS NULL OR char_length(health_consent_version) <= 40);
ALTER TABLE users ADD COLUMN age_confirmed_at       timestamptz;
