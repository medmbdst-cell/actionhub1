-- ========================================
-- AJOUT DES COLONNES DE TRAÇABILITÉ
-- Priorité 2 : Traçabilité de la source
-- ========================================

-- Ajouter les colonnes de traçabilité à la table actions
ALTER TABLE public.actions
ADD COLUMN IF NOT EXISTS source_file TEXT,
ADD COLUMN IF NOT EXISTS source_sheet TEXT,
ADD COLUMN IF NOT EXISTS plan_action_nom TEXT,
ADD COLUMN IF NOT EXISTS import_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Créer des index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_actions_source_file
ON public.actions(source_file);

CREATE INDEX IF NOT EXISTS idx_actions_plan_action
ON public.actions(plan_action_nom);

CREATE INDEX IF NOT EXISTS idx_actions_import_batch
ON public.actions(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_actions_import_date
ON public.actions(import_date);

-- Rafraîchir le cache du schéma pour Supabase
NOTIFY pgrst, 'reload schema';

-- Vérification : afficher les colonnes de la table actions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'actions'
  AND column_name IN ('source_file', 'source_sheet', 'plan_action_nom', 'import_date', 'import_batch_id')
ORDER BY column_name;
