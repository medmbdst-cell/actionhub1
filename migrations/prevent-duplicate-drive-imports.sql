-- ============================================
-- Migration: Prévention des doublons d'import Drive
-- Date: 2026-03-20
-- Description: Empêche l'import multiple du même fichier Drive
-- ============================================

-- 1. Nettoyer les doublons existants (garder le plus récent)
-- Identifier les doublons (même google_drive_file_id + tenant_id)
WITH doublons AS (
  SELECT
    id,
    google_drive_file_id,
    tenant_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY google_drive_file_id, tenant_id
      ORDER BY created_at DESC
    ) AS rn
  FROM plans_action
  WHERE google_drive_file_id IS NOT NULL
)
DELETE FROM plans_action
WHERE id IN (
  SELECT id FROM doublons WHERE rn > 1
);

-- 2. Ajouter une contrainte unique partielle
-- Empêche l'import 2x du même fichier Drive par tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_action_unique_drive_file
ON plans_action(google_drive_file_id, tenant_id)
WHERE google_drive_file_id IS NOT NULL;

-- 3. Commentaire pour documentation
COMMENT ON INDEX idx_plans_action_unique_drive_file IS
'Empêche l''import multiple du même fichier Google Drive par tenant. NULL autorisé pour imports Excel manuels.';

-- 4. Vérification
SELECT
  'Plans d''action avec google_drive_file_id' AS description,
  COUNT(DISTINCT google_drive_file_id) AS fichiers_uniques,
  COUNT(*) AS total_plans
FROM plans_action
WHERE google_drive_file_id IS NOT NULL;
