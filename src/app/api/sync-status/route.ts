import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Endpoint pour récupérer les fichiers synchronisés du tenant actuel
 * Utilisé par la page /admin/sync-status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Récupérer le profil pour obtenir le tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    // 3. Récupérer les fichiers synchronisés pour ce tenant
    const { data: files, error: filesError } = await supabase
      .from('google_drive_synced_files')
      .select(`
        id,
        drive_file_name,
        drive_file_id,
        sync_enabled,
        sync_mode,
        last_synced_at,
        drive_modified_time,
        sheet_name,
        plan:plans_action!inner(id, nom)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('last_synced_at', { ascending: false });

    if (filesError) {
      console.error('Erreur récupération fichiers synchronisés:', filesError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors du chargement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || [],
    });
  } catch (error: any) {
    console.error('Erreur API sync-status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}
