-- ========================================
-- TABLE DE TRACKING DES PROBLÈMES DE MATCHING
-- Permet de tracer les actions dont le pilote n'a pas pu être identifié automatiquement
-- ========================================

-- Table pour stocker les problèmes de matching
CREATE TABLE IF NOT EXISTS action_matching_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,

  -- Données du problème
  responsable_txt TEXT NOT NULL,           -- Texte original du fichier Excel (ex: "P MORANDINI", "MORANDINI")
  raison TEXT NOT NULL CHECK (raison IN ('ambiguite', 'inexistant', 'format_invalide')),

  -- Candidats possibles (stocké en JSON pour les cas d'ambiguïté)
  candidats JSONB,                         -- [{"id": "uuid", "nom": "MORANDINI", "prenom": "Pierre"}, ...]

  -- Résolution
  resolu BOOLEAN NOT NULL DEFAULT FALSE,
  resolu_par UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolu_le TIMESTAMPTZ,
  responsable_assigne_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Traçabilité
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_matching_issues_tenant ON action_matching_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matching_issues_action ON action_matching_issues(action_id);
CREATE INDEX IF NOT EXISTS idx_matching_issues_resolu ON action_matching_issues(tenant_id, resolu);

-- Commentaires
COMMENT ON TABLE action_matching_issues IS 'Trace les problèmes de matching automatique entre responsable_txt et profiles';
COMMENT ON COLUMN action_matching_issues.raison IS 'Type de problème: ambiguite (plusieurs candidats), inexistant (aucun candidat), format_invalide';
COMMENT ON COLUMN action_matching_issues.candidats IS 'Liste JSON des candidats possibles en cas d''ambiguïté';

-- RLS : même logique que les actions
ALTER TABLE action_matching_issues ENABLE ROW LEVEL SECURITY;

-- Super admin : tout voir
CREATE POLICY matching_issues_super_admin ON action_matching_issues
  FOR ALL USING (is_super_admin());

-- Admin : voit les problèmes de son tenant
CREATE POLICY matching_issues_admin ON action_matching_issues
  FOR ALL USING (
    current_user_role() = 'admin'
    AND tenant_id = current_tenant_id()
  );

-- Vue pour faciliter les requêtes
CREATE OR REPLACE VIEW v_matching_issues_details AS
SELECT
  mi.id,
  mi.tenant_id,
  mi.action_id,
  mi.responsable_txt,
  mi.raison,
  mi.candidats,
  mi.resolu,
  mi.resolu_le,
  mi.created_at,

  -- Détails de l'action
  a.description AS action_description,
  a.plan_id,
  pa.nom AS plan_nom,
  a.source_file,

  -- Qui a résolu
  resolver.nom AS resolu_par_nom,
  resolver.prenom AS resolu_par_prenom,

  -- Responsable assigné
  resp.nom AS responsable_nom,
  resp.prenom AS responsable_prenom

FROM action_matching_issues mi
LEFT JOIN actions a ON a.id = mi.action_id
LEFT JOIN plans_action pa ON pa.id = a.plan_id
LEFT JOIN profiles resolver ON resolver.id = mi.resolu_par
LEFT JOIN profiles resp ON resp.id = mi.responsable_assigne_id;

-- Notification pour Supabase
NOTIFY pgrst, 'reload schema';
