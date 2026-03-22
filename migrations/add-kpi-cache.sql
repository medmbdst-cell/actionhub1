-- ============================================
-- Migration: Cache KPIs avec Materialized Views
-- Date: 2026-03-17
-- Description: Amélioration performances dashboards avec vues matérialisées
-- ============================================

-- 1. Créer la vue matérialisée pour les KPIs par tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_kpis AS
SELECT
  tenant_id,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE statut IN ('done', '100%')) as completed_actions,
  COUNT(*) FILTER (WHERE statut NOT IN ('done', '100%')) as in_progress_actions,
  COUNT(*) FILTER (
    WHERE echeance < CURRENT_DATE
    AND statut NOT IN ('done', '100%')
  ) as late_actions,
  COUNT(*) FILTER (
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND statut IN ('done', '100%')
  ) as completed_this_month,
  -- Moyenne par statut
  COUNT(*) FILTER (WHERE statut = 'todo' OR statut = '0%') as todo_count,
  COUNT(*) FILTER (WHERE statut = 'wip' OR (statut LIKE '%\%%' AND statut NOT IN ('0%', '100%'))) as wip_count,
  COUNT(*) FILTER (WHERE statut = 'blocked') as blocked_count,
  -- Moyenne par priorité
  COUNT(*) FILTER (WHERE priorite ILIKE '%haute%' OR priorite ILIKE '%high%') as high_priority_count,
  COUNT(*) FILTER (WHERE priorite ILIKE '%moyenne%' OR priorite ILIKE '%medium%') as medium_priority_count,
  COUNT(*) FILTER (WHERE priorite ILIKE '%basse%' OR priorite ILIKE '%low%') as low_priority_count,
  -- Métadonnées
  NOW() as last_refreshed
FROM actions
WHERE deleted_from_source = FALSE OR deleted_from_source IS NULL
GROUP BY tenant_id;

-- 2. Index unique sur tenant_id pour refresh rapide
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_kpis_tenant_id_idx
ON mv_tenant_kpis(tenant_id);

-- 3. Fonction pour refresh automatique
CREATE OR REPLACE FUNCTION refresh_tenant_kpis()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh seulement la vue pour le tenant concerné (si possible)
  -- Sinon refresh complet (CONCURRENTLY pour éviter lock)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_kpis;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger pour refresh automatique sur INSERT/UPDATE/DELETE actions
DROP TRIGGER IF EXISTS trg_actions_kpi_refresh ON actions;
CREATE TRIGGER trg_actions_kpi_refresh
AFTER INSERT OR UPDATE OR DELETE ON actions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_tenant_kpis();

-- 5. Fonction helper pour récupérer les KPIs d'un tenant (avec fallback)
CREATE OR REPLACE FUNCTION get_tenant_kpis(p_tenant_id UUID)
RETURNS TABLE (
  total_actions BIGINT,
  completed_actions BIGINT,
  in_progress_actions BIGINT,
  late_actions BIGINT,
  completed_this_month BIGINT,
  todo_count BIGINT,
  wip_count BIGINT,
  blocked_count BIGINT,
  high_priority_count BIGINT,
  medium_priority_count BIGINT,
  low_priority_count BIGINT,
  completion_rate INTEGER,
  last_refreshed TIMESTAMPTZ
) AS $$
BEGIN
  -- Essayer de lire depuis la vue matérialisée
  RETURN QUERY
  SELECT
    kpis.total_actions,
    kpis.completed_actions,
    kpis.in_progress_actions,
    kpis.late_actions,
    kpis.completed_this_month,
    kpis.todo_count,
    kpis.wip_count,
    kpis.blocked_count,
    kpis.high_priority_count,
    kpis.medium_priority_count,
    kpis.low_priority_count,
    CASE
      WHEN kpis.total_actions > 0
      THEN ROUND((kpis.completed_actions::DECIMAL / kpis.total_actions) * 100)::INTEGER
      ELSE 0
    END as completion_rate,
    kpis.last_refreshed
  FROM mv_tenant_kpis kpis
  WHERE kpis.tenant_id = p_tenant_id;

  -- Si pas de données, calculer en direct (fallback)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      COUNT(*)::BIGINT as total_actions,
      COUNT(*) FILTER (WHERE statut IN ('done', '100%'))::BIGINT as completed_actions,
      COUNT(*) FILTER (WHERE statut NOT IN ('done', '100%'))::BIGINT as in_progress_actions,
      COUNT(*) FILTER (
        WHERE echeance < CURRENT_DATE
        AND statut NOT IN ('done', '100%')
      )::BIGINT as late_actions,
      COUNT(*) FILTER (
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        AND statut IN ('done', '100%')
      )::BIGINT as completed_this_month,
      COUNT(*) FILTER (WHERE statut = 'todo' OR statut = '0%')::BIGINT as todo_count,
      COUNT(*) FILTER (WHERE statut = 'wip' OR (statut LIKE '%\%%' AND statut NOT IN ('0%', '100%')))::BIGINT as wip_count,
      COUNT(*) FILTER (WHERE statut = 'blocked')::BIGINT as blocked_count,
      COUNT(*) FILTER (WHERE priorite ILIKE '%haute%' OR priorite ILIKE '%high%')::BIGINT as high_priority_count,
      COUNT(*) FILTER (WHERE priorite ILIKE '%moyenne%' OR priorite ILIKE '%medium%')::BIGINT as medium_priority_count,
      COUNT(*) FILTER (WHERE priorite ILIKE '%basse%' OR priorite ILIKE '%low%')::BIGINT as low_priority_count,
      CASE
        WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE statut IN ('done', '100%'))::DECIMAL / COUNT(*)) * 100)::INTEGER
        ELSE 0
      END as completion_rate,
      NOW() as last_refreshed
    FROM actions
    WHERE tenant_id = p_tenant_id
    AND (deleted_from_source = FALSE OR deleted_from_source IS NULL);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Commentaires pour documentation
COMMENT ON MATERIALIZED VIEW mv_tenant_kpis IS
'Vue matérialisée pour les KPIs des dashboards. Refreshed automatiquement via trigger sur actions. Améliore les performances en évitant les calculs répétés.';

COMMENT ON FUNCTION get_tenant_kpis IS
'Fonction helper pour récupérer les KPIs d''un tenant avec fallback sur calcul direct si la vue matérialisée n''a pas de données.';

COMMENT ON FUNCTION refresh_tenant_kpis IS
'Fonction trigger pour refresh automatique de mv_tenant_kpis après modification de la table actions.';

-- 7. Initialiser la vue avec les données existantes
REFRESH MATERIALIZED VIEW mv_tenant_kpis;

-- 8. Vue matérialisée secondaire pour les KPIs par plan (optionnel, pour /admin/analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_plan_kpis AS
SELECT
  plan_id,
  tenant_id,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE statut IN ('done', '100%')) as completed_actions,
  COUNT(*) FILTER (WHERE echeance < CURRENT_DATE AND statut NOT IN ('done', '100%')) as late_actions,
  NOW() as last_refreshed
FROM actions
WHERE deleted_from_source = FALSE OR deleted_from_source IS NULL
GROUP BY plan_id, tenant_id;

-- Index unique pour mv_plan_kpis
CREATE UNIQUE INDEX IF NOT EXISTS mv_plan_kpis_plan_id_idx
ON mv_plan_kpis(plan_id);

-- Refresh initial
REFRESH MATERIALIZED VIEW mv_plan_kpis;

-- 9. Optionnel : Cron job pour refresh périodique (toutes les 5 minutes)
-- Note: Le trigger refresh à chaque modification, mais un cron peut être utile pour fiabilité
-- Exemple avec pg_cron (nécessite extension):
-- SELECT cron.schedule('refresh-kpis', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_kpis');
