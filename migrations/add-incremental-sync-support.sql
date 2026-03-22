-- ============================================================
-- Migration Phase 3: Update Incrémental avec Préservation
-- Date: 2026-03-16
-- Description: Ajoute support pour sync incrémentale avec
--              détection des modifications et merge intelligent
-- ============================================================

-- ============================================================
-- 1. Nouvelles colonnes sur la table actions
-- ============================================================

-- Ajouter colonnes de tracking pour sync incrémentale
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS drive_row_id TEXT,
ADD COLUMN IF NOT EXISTS drive_content_hash TEXT,
ADD COLUMN IF NOT EXISTS deleted_from_source BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index pour performance du matching Drive vs Base
CREATE INDEX IF NOT EXISTS idx_actions_drive_row_id
  ON actions(plan_id, drive_row_id)
  WHERE drive_row_id IS NOT NULL;

-- Index pour filtrer actions supprimées
CREATE INDEX IF NOT EXISTS idx_actions_deleted_from_source
  ON actions(plan_id, deleted_from_source)
  WHERE deleted_from_source = TRUE;

-- ============================================================
-- 2. Table de tracking des conflits de synchronisation
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  synced_file_id UUID NOT NULL REFERENCES google_drive_synced_files(id) ON DELETE CASCADE,

  -- Détails du conflit
  field_name TEXT NOT NULL,          -- Champ en conflit (ex: "statut", "echeance")
  drive_value TEXT,                  -- Valeur dans le fichier Drive
  local_value TEXT,                  -- Valeur modifiée localement
  resolved_value TEXT,               -- Valeur finale choisie après merge
  resolution_strategy TEXT NOT NULL CHECK (resolution_strategy IN ('drive_wins', 'local_wins', 'manual')),

  -- Contexte et audit
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_action
  ON sync_conflicts(action_id);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_tenant
  ON sync_conflicts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_synced_file
  ON sync_conflicts(synced_file_id);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved
  ON sync_conflicts(tenant_id, detected_at DESC)
  WHERE resolved_at IS NULL;

-- ============================================================
-- 3. RLS (Row Level Security) pour sync_conflicts
-- ============================================================

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy pour super admin (accès total)
CREATE POLICY sync_conflicts_super_admin ON sync_conflicts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy pour admin tenant (accès aux conflits de son tenant)
CREATE POLICY sync_conflicts_admin ON sync_conflicts
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 4. Nouvelle colonne pour mode de synchronisation
-- ============================================================

-- Ajouter colonne sync_mode sur google_drive_synced_files
ALTER TABLE google_drive_synced_files
ADD COLUMN IF NOT EXISTS sync_mode TEXT DEFAULT 'full_replace'
  CHECK (sync_mode IN ('full_replace', 'incremental'));

COMMENT ON COLUMN google_drive_synced_files.sync_mode IS
  'Mode de synchronisation: full_replace (Phase 2 - supprime et re-crée tout) ou incremental (Phase 3 - merge intelligent)';

-- Migrer les données existantes (tous en mode full_replace par défaut)
UPDATE google_drive_synced_files
SET sync_mode = 'full_replace'
WHERE sync_mode IS NULL;

-- ============================================================
-- 5. Vue pour afficher les conflits actifs (non résolus)
-- ============================================================

CREATE OR REPLACE VIEW v_active_sync_conflicts AS
SELECT
  c.id,
  c.tenant_id,
  t.nom AS tenant_name,
  c.action_id,
  a.description AS action_description,
  a.statut AS action_statut,
  c.field_name,
  c.drive_value,
  c.local_value,
  c.resolved_value,
  c.resolution_strategy,
  c.detected_at,
  c.resolved_by,
  c.resolved_at,
  sf.drive_file_name,
  p.nom AS plan_name
FROM sync_conflicts c
JOIN actions a ON c.action_id = a.id
JOIN google_drive_synced_files sf ON c.synced_file_id = sf.id
JOIN plans_action p ON a.plan_id = p.id
JOIN tenants t ON c.tenant_id = t.id
WHERE c.resolved_at IS NULL
ORDER BY c.detected_at DESC;

COMMENT ON VIEW v_active_sync_conflicts IS
  'Affiche tous les conflits de synchronisation non résolus avec contexte complet';

-- ============================================================
-- 6. Vue étendue pour historique complet des conflits
-- ============================================================

CREATE OR REPLACE VIEW v_sync_conflicts_history AS
SELECT
  c.id,
  c.tenant_id,
  t.nom AS tenant_name,
  c.action_id,
  a.description AS action_description,
  a.statut AS action_statut,
  c.field_name,
  c.drive_value,
  c.local_value,
  c.resolved_value,
  c.resolution_strategy,
  c.detected_at,
  c.resolved_at,
  c.resolved_by,
  p_resolver.nom AS resolved_by_name,
  sf.drive_file_name,
  pl.nom AS plan_name,
  -- Durée de résolution (en minutes)
  CASE
    WHEN c.resolved_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (c.resolved_at - c.detected_at)) / 60
    ELSE NULL
  END AS resolution_time_minutes,
  -- Statut du conflit
  CASE
    WHEN c.resolved_at IS NULL THEN 'Actif'
    ELSE 'Résolu'
  END AS conflict_status
FROM sync_conflicts c
JOIN actions a ON c.action_id = a.id
JOIN google_drive_synced_files sf ON c.synced_file_id = sf.id
JOIN plans_action pl ON a.plan_id = pl.id
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN profiles p_resolver ON c.resolved_by = p_resolver.id
ORDER BY c.detected_at DESC;

COMMENT ON VIEW v_sync_conflicts_history IS
  'Historique complet des conflits de synchronisation (actifs et résolus) avec statistiques';

-- ============================================================
-- 7. Commentaires sur les nouvelles colonnes (documentation)
-- ============================================================

COMMENT ON COLUMN actions.drive_row_id IS
  'Identifiant unique de la ligne Excel (hash basé sur position + contenu immutable). Utilisé pour matcher actions Drive vs Base.';

COMMENT ON COLUMN actions.drive_content_hash IS
  'Hash SHA-256 du contenu complet de la ligne lors du dernier import. Permet de détecter les changements dans Drive.';

COMMENT ON COLUMN actions.deleted_from_source IS
  'TRUE si l''action a été supprimée du fichier Drive mais conservée en base (soft delete). FALSE par défaut.';

COMMENT ON COLUMN actions.last_synced_at IS
  'Timestamp de la dernière synchronisation de cette action spécifique. Utilisé pour détecter modifications locales.';

-- ============================================================
-- 8. Fonction helper pour nettoyer les conflits résolus anciens
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_sync_conflicts(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les conflits résolus depuis plus de X jours
  DELETE FROM sync_conflicts
  WHERE resolved_at IS NOT NULL
    AND resolved_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_sync_conflicts IS
  'Nettoie les conflits résolus depuis plus de X jours (par défaut 90). Retourne le nombre de conflits supprimés.';

-- ============================================================
-- 9. Statistiques de sync (optionnel - utile pour monitoring)
-- ============================================================

CREATE OR REPLACE VIEW v_sync_statistics AS
SELECT
  sf.tenant_id,
  t.nom AS tenant_name,
  sf.drive_file_name,
  p.nom AS plan_name,
  sf.sync_mode,
  sf.sync_enabled,
  sf.last_synced_at,
  sf.drive_modified_time,
  -- Nombre total d'actions dans le plan
  COUNT(a.id) AS total_actions,
  -- Nombre d'actions avec drive_row_id (trackées pour sync incrémentale)
  COUNT(a.drive_row_id) AS tracked_actions,
  -- Nombre d'actions supprimées du Drive
  SUM(CASE WHEN a.deleted_from_source THEN 1 ELSE 0 END) AS deleted_from_drive_count,
  -- Nombre de conflits actifs
  (SELECT COUNT(*) FROM sync_conflicts c
   WHERE c.synced_file_id = sf.id AND c.resolved_at IS NULL) AS active_conflicts_count,
  -- Nombre total de conflits résolus
  (SELECT COUNT(*) FROM sync_conflicts c
   WHERE c.synced_file_id = sf.id AND c.resolved_at IS NOT NULL) AS resolved_conflicts_count,
  -- Statut de sync
  CASE
    WHEN NOT sf.sync_enabled THEN 'Sync désactivée'
    WHEN sf.sync_mode = 'full_replace' THEN 'Phase 2 (Remplacement complet)'
    WHEN sf.sync_mode = 'incremental' THEN 'Phase 3 (Incrémental)'
    ELSE 'Inconnu'
  END AS sync_status
FROM google_drive_synced_files sf
JOIN tenants t ON sf.tenant_id = t.id
JOIN plans_action p ON sf.plan_id = p.id
LEFT JOIN actions a ON a.plan_id = sf.plan_id
GROUP BY sf.id, sf.tenant_id, t.nom, sf.drive_file_name, p.nom, sf.sync_mode, sf.sync_enabled, sf.last_synced_at, sf.drive_modified_time
ORDER BY sf.tenant_id, sf.drive_file_name;

COMMENT ON VIEW v_sync_statistics IS
  'Statistiques détaillées sur chaque fichier synchronisé : nombre d''actions, conflits, mode de sync, etc.';

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================

-- Vérification finale
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Phase 3 appliquée avec succès!';
  RAISE NOTICE '   - Colonnes ajoutées sur actions: drive_row_id, drive_content_hash, deleted_from_source, last_synced_at';
  RAISE NOTICE '   - Table sync_conflicts créée avec RLS';
  RAISE NOTICE '   - Colonne sync_mode ajoutée sur google_drive_synced_files';
  RAISE NOTICE '   - 3 vues créées: v_active_sync_conflicts, v_sync_conflicts_history, v_sync_statistics';
  RAISE NOTICE '   - Fonction cleanup_old_sync_conflicts() disponible';
END $$;
