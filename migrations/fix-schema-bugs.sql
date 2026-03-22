-- ============================================
-- Migration: Corrections Bugs Critiques
-- Date: 2026-03-17
-- Description: Ajout colonne equipe_id manquante + indexes performance
-- ============================================

-- 1. Ajouter equipe_id dans profiles (référencé mais absent)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

-- Index pour jointures profiles <-> equipes
CREATE INDEX IF NOT EXISTS idx_profiles_equipe_id
ON profiles(equipe_id);

-- 2. Indexes performance pour actions
-- Index composite pour filtres par tenant + statut
CREATE INDEX IF NOT EXISTS idx_actions_statut
ON actions(tenant_id, statut);

-- Index partiel pour filtres par échéance (NULL exclus pour gain espace)
CREATE INDEX IF NOT EXISTS idx_actions_echeance
ON actions(tenant_id, echeance)
WHERE echeance IS NOT NULL;

-- Index pour recherche full-text sur description
CREATE INDEX IF NOT EXISTS idx_actions_description_trgm
ON actions USING gin(description gin_trgm_ops);

-- Index pour recherche full-text sur event_description
CREATE INDEX IF NOT EXISTS idx_actions_event_description_trgm
ON actions USING gin(event_description gin_trgm_ops);

-- Activer extension pg_trgm si pas déjà fait (pour fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Index pour priorité (souvent filtré)
CREATE INDEX IF NOT EXISTS idx_actions_priorite
ON actions(tenant_id, priorite)
WHERE priorite IS NOT NULL;

-- 4. Index pour responsable (souvent recherché)
CREATE INDEX IF NOT EXISTS idx_actions_responsable
ON actions(tenant_id, responsable_txt);

-- Commentaires pour documentation
COMMENT ON COLUMN profiles.equipe_id IS
'Équipe à laquelle appartient l''utilisateur. NULL si aucune équipe.';

COMMENT ON INDEX idx_actions_statut IS
'Optimise les requêtes de filtrage par statut (dashboard, listes).';

COMMENT ON INDEX idx_actions_echeance IS
'Optimise les requêtes pour actions en retard ou avec échéance spécifique.';

COMMENT ON INDEX idx_actions_description_trgm IS
'Permet la recherche full-text fuzzy sur la description des actions.';
