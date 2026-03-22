-- Migration : Ajout du support Google Drive
-- Date : 2026-03-15
-- Phase 2 : Intégration Google Drive OAuth + Auto-Sync

-- ============================================================
-- 1. Table : google_drive_connections
-- Stocke les tokens OAuth 2.0 pour chaque tenant
-- ============================================================

CREATE TABLE IF NOT EXISTS google_drive_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- OAuth credentials (chiffrés au repos par Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Informations de l'utilisateur Google connecté (audit)
  connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  connected_email TEXT NOT NULL,  -- Email du compte Google

  -- Statut et monitoring
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_gdrive_connections_tenant
  ON google_drive_connections(tenant_id);

-- Index unique partiel : garantit un seul connexion active par tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_gdrive_connections_active
  ON google_drive_connections(tenant_id)
  WHERE actif = TRUE;

-- RLS : Activer Row Level Security
ALTER TABLE google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Policy : Super admin voit tout
DROP POLICY IF EXISTS gdrive_super_admin ON google_drive_connections;
CREATE POLICY gdrive_super_admin ON google_drive_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy : Admin voit seulement son tenant
DROP POLICY IF EXISTS gdrive_admin ON google_drive_connections;
CREATE POLICY gdrive_admin ON google_drive_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND tenant_id = google_drive_connections.tenant_id
    )
  );

-- Trigger : Auto-update du timestamp
DROP TRIGGER IF EXISTS trg_gdrive_connections_updated_at ON google_drive_connections;
CREATE TRIGGER trg_gdrive_connections_updated_at
  BEFORE UPDATE ON google_drive_connections
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. Table : google_drive_synced_files
-- Track les fichiers Drive synchronisés avec les plans d'action
-- ============================================================

CREATE TABLE IF NOT EXISTS google_drive_synced_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_drive_connections(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans_action(id) ON DELETE CASCADE,

  -- Informations du fichier Google Drive
  drive_file_id TEXT NOT NULL,      -- ID unique du fichier dans Drive
  drive_file_name TEXT NOT NULL,     -- Nom du fichier (pour affichage)
  drive_modified_time TIMESTAMPTZ,   -- Dernière modification dans Drive

  -- Configuration de la synchronisation
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Configuration de l'import (stockée pour re-import automatique)
  sheet_name TEXT,                   -- Nom de la feuille Excel sélectionnée
  column_mapping JSONB,              -- Mapping des colonnes (format: {description: "Colonne A", ...})

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte : un fichier Drive ne peut être lié qu'à un seul plan
  CONSTRAINT unique_plan_file UNIQUE (plan_id, drive_file_id)
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_gdrive_files_tenant
  ON google_drive_synced_files(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gdrive_files_connection
  ON google_drive_synced_files(connection_id);

CREATE INDEX IF NOT EXISTS idx_gdrive_files_plan
  ON google_drive_synced_files(plan_id);

CREATE INDEX IF NOT EXISTS idx_gdrive_files_sync_enabled
  ON google_drive_synced_files(tenant_id, sync_enabled)
  WHERE sync_enabled = TRUE;

-- RLS : Activer Row Level Security
ALTER TABLE google_drive_synced_files ENABLE ROW LEVEL SECURITY;

-- Policy : Super admin voit tout
DROP POLICY IF EXISTS gdrive_files_super_admin ON google_drive_synced_files;
CREATE POLICY gdrive_files_super_admin ON google_drive_synced_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy : Admin voit seulement son tenant
DROP POLICY IF EXISTS gdrive_files_admin ON google_drive_synced_files;
CREATE POLICY gdrive_files_admin ON google_drive_synced_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND tenant_id = google_drive_synced_files.tenant_id
    )
  );

-- Trigger : Auto-update du timestamp
DROP TRIGGER IF EXISTS trg_gdrive_files_updated_at ON google_drive_synced_files;
CREATE TRIGGER trg_gdrive_files_updated_at
  BEFORE UPDATE ON google_drive_synced_files
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. Modification table plans_action
-- Ajout de colonnes pour tracker la source Google Drive
-- ============================================================

-- Ajouter colonnes si elles n'existent pas déjà
DO $$
BEGIN
  -- Colonne : ID du fichier Google Drive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans_action'
    AND column_name = 'google_drive_file_id'
  ) THEN
    ALTER TABLE plans_action ADD COLUMN google_drive_file_id TEXT;
  END IF;

  -- Colonne : Flag auto-sync activé
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans_action'
    AND column_name = 'auto_sync'
  ) THEN
    ALTER TABLE plans_action ADD COLUMN auto_sync BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Index pour rechercher plans synchronisés
CREATE INDEX IF NOT EXISTS idx_plans_gdrive_file
  ON plans_action(google_drive_file_id)
  WHERE google_drive_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plans_auto_sync
  ON plans_action(tenant_id, auto_sync)
  WHERE auto_sync = TRUE;

-- ============================================================
-- 4. Vue : v_google_drive_sync_status
-- Vue pour afficher facilement le statut de synchronisation
-- ============================================================

DROP VIEW IF EXISTS v_google_drive_sync_status;
CREATE VIEW v_google_drive_sync_status AS
SELECT
  sf.id AS sync_id,
  sf.tenant_id,
  t.nom AS tenant_name,
  sf.drive_file_id,
  sf.drive_file_name,
  sf.drive_modified_time,
  sf.last_synced_at,
  sf.sync_enabled,
  pa.id AS plan_id,
  pa.nom AS plan_name,
  pa.auto_sync,
  c.connected_email,
  c.actif AS connection_active,
  -- Statut calculé
  CASE
    WHEN NOT c.actif THEN 'Connection inactive'
    WHEN NOT sf.sync_enabled THEN 'Sync disabled'
    WHEN sf.drive_modified_time > sf.last_synced_at THEN 'Outdated - needs sync'
    ELSE 'Up to date'
  END AS sync_status,
  -- Nombre d'actions dans le plan
  (SELECT COUNT(*) FROM actions WHERE plan_id = pa.id) AS actions_count
FROM google_drive_synced_files sf
JOIN google_drive_connections c ON sf.connection_id = c.id
JOIN plans_action pa ON sf.plan_id = pa.id
JOIN tenants t ON sf.tenant_id = t.id
ORDER BY sf.last_synced_at DESC;

-- ============================================================
-- 5. Fonction : Cleanup des connexions inactives
-- Supprime les connexions marquées comme inactives depuis > 30 jours
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_inactive_gdrive_connections()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les connexions inactives depuis plus de 30 jours
  DELETE FROM google_drive_connections
  WHERE actif = FALSE
  AND updated_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Fin de la migration
-- ============================================================

-- Afficher un résumé
DO $$
DECLARE
  conn_count INTEGER;
  files_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conn_count FROM google_drive_connections;
  SELECT COUNT(*) INTO files_count FROM google_drive_synced_files;

  RAISE NOTICE '✅ Migration Google Drive terminée avec succès !';
  RAISE NOTICE '📊 Connexions existantes : %', conn_count;
  RAISE NOTICE '📁 Fichiers synchronisés : %', files_count;
  RAISE NOTICE '';
  RAISE NOTICE '⏭️  Prochaines étapes :';
  RAISE NOTICE '1. Créer projet Google Cloud Console';
  RAISE NOTICE '2. Configurer OAuth consent screen';
  RAISE NOTICE '3. Ajouter GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env.local';
  RAISE NOTICE '4. Installer : npm install googleapis';
END $$;
