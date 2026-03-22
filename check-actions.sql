-- Compter les actions par tenant et par plan
SELECT 
  tenant_id,
  plan_id,
  COUNT(*) as count,
  COUNT(DISTINCT drive_row_id) as unique_drive_rows
FROM actions
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
GROUP BY tenant_id, plan_id
ORDER BY count DESC;
