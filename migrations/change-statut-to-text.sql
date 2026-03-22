-- Migration : Changer le type de la colonne statut pour accepter les pourcentages
-- Date : 2026-03-15
-- Description : Permet de stocker des pourcentages (0%, 10%, 20%, ..., 100%) en plus des statuts classiques

-- Étape 1 : Ajouter une nouvelle colonne temporaire de type TEXT
ALTER TABLE actions
ADD COLUMN statut_new TEXT;

-- Étape 2 : Copier les valeurs existantes (convertir l'enum en text)
UPDATE actions
SET statut_new = statut::text;

-- Étape 3 : Supprimer l'ancienne colonne avec CASCADE pour supprimer automatiquement toutes les vues dépendantes
ALTER TABLE actions
DROP COLUMN statut CASCADE;

-- Étape 4 : Renommer la nouvelle colonne
ALTER TABLE actions
RENAME COLUMN statut_new TO statut;

-- Étape 5 : Ajouter une contrainte pour valider les valeurs
-- Accepte : todo, wip, blocked, done, ou pourcentages de 0% à 100%
ALTER TABLE actions
ADD CONSTRAINT check_statut_valid CHECK (
  statut IN ('todo', 'wip', 'blocked', 'done')
  OR statut ~ '^(0|10|20|30|40|50|60|70|80|90|100)%$'
);

-- Étape 6 : Définir une valeur par défaut
ALTER TABLE actions
ALTER COLUMN statut SET DEFAULT 'todo';

-- Étape 7 : Rendre la colonne NOT NULL
ALTER TABLE actions
ALTER COLUMN statut SET NOT NULL;

-- Note : Cette migration permet de stocker :
-- - Les statuts classiques : todo, wip, blocked, done
-- - Les pourcentages de 10 en 10 : 0%, 10%, 20%, ..., 100%
--
-- IMPORTANT : Toutes les vues dépendantes de la colonne statut ont été supprimées automatiquement (CASCADE).
-- Elles seront recréées par l'application si nécessaire.
