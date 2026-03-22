import { NextRequest, NextResponse } from 'next/server';
import { syncAllFiles } from '@/app/actions/drive-sync';

/**
 * API Endpoint pour la synchronisation automatique Google Drive
 *
 * Sécurité : Protégé par CRON_SECRET
 * Fréquence : Appelé toutes les heures par le cron job
 *
 * Usage:
 * POST /api/cron/sync-drive
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'autorisation (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('❌ Tentative d\'accès non autorisé au cron sync-drive');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Démarrage de la synchronisation automatique...');

    // Utiliser SERVICE_ROLE pour bypasser RLS (pas d'utilisateur authentifié dans un cron)
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Récupérer tous les tenants ayant au moins un fichier synchronisé actif
    const { data: tenants, error: tenantsError } = await supabase
      .from('google_drive_synced_files')
      .select('tenant_id')
      .eq('sync_enabled', true)
      .order('tenant_id');

    if (tenantsError) {
      console.error('Erreur récupération tenants:', tenantsError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Obtenir les IDs uniques de tenants
    const uniqueTenantIds = [...new Set(tenants?.map(t => t.tenant_id) || [])];

    console.log(`📊 ${uniqueTenantIds.length} tenant(s) avec syncs actifs`);

    // 3. Synchroniser chaque tenant
    const results = [];

    for (const tenantId of uniqueTenantIds) {
      console.log(`\n🔄 Synchronisation tenant: ${tenantId}`);

      const syncResult = await syncAllFiles(tenantId, supabase);

      results.push({
        tenantId,
        ...syncResult,
      });

      if (syncResult.success) {
        console.log(`✅ ${syncResult.summary}`);
      } else {
        console.error(`❌ Erreur: ${syncResult.error}`);
      }
    }

    // 4. Calculer les statistiques globales
    const totalFiles = results.reduce((acc, r) => acc + (r.results?.length || 0), 0);
    const totalSynced = results.reduce(
      (acc, r) => acc + (r.results?.filter((f: any) => f.changed).length || 0),
      0
    );

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      tenantsProcessed: uniqueTenantIds.length,
      totalFiles,
      totalSynced,
      results,
    };

    console.log(`\n✅ Synchronisation terminée : ${totalSynced}/${totalFiles} fichier(s) synchronisé(s)`);

    return NextResponse.json(summary, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erreur globale sync-drive:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET : Retourne le statut du dernier sync (optionnel, pour debug)
 */
export async function GET(request: NextRequest) {
  // Vérifier l'autorisation
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Utiliser SERVICE_ROLE pour bypasser RLS
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer les stats des syncs
  const { data: syncedFiles } = await supabase
    .from('google_drive_synced_files')
    .select(`
      id,
      drive_file_name,
      sync_enabled,
      last_synced_at,
      drive_modified_time,
      tenant_id
    `)
    .order('last_synced_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    recentSyncs: syncedFiles || [],
  });
}
