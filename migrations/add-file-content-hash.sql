-- Migration: Ajouter colonne file_content_hash pour détecter les changements de contenu
-- Date: 2026-03-17
-- Contexte: Les fichiers Excel édités via Google Sheets ne mettent pas à jour modifiedTime
--           On utilise donc un hash du contenu pour détecter les changements

-- Ajouter colonne file_content_hash à google_drive_synced_files
ALTER TABLE google_drive_synced_files
ADD COLUMN IF NOT EXISTS file_content_hash TEXT;

COMMENT ON COLUMN google_drive_synced_files.file_content_hash IS
'Hash SHA-256 du contenu complet du fichier (toutes les lignes). Utilisé pour détecter les changements de contenu même si modifiedTime ne change pas (cas Excel édité via Google Sheets).';

-- Note: On ne backfill pas cette colonne car elle sera remplie au prochain sync
-- Si NULL, le sync sera forcé une fois pour calculer le hash initial
