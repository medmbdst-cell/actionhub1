-- Migration: Ajouter le champ event_description à la table actions
-- Date: 2026-03-14

-- Ajouter la colonne event_description
ALTER TABLE actions
ADD COLUMN event_description TEXT;

COMMENT ON COLUMN actions.event_description IS 'Description de l\'événement ou contexte qui justifie cette action';

-- Exemple de mise à jour pour les actions existantes (optionnel)
-- UPDATE actions SET event_description = 'À définir' WHERE event_description IS NULL;
