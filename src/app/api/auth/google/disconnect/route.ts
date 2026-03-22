import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/google/disconnect
 *
 * Déconnecte le compte Google Drive :
 * - Révoque les tokens Google
 * - Désactive la connexion en base de données
 * - Désactive tous les syncs associés
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les admins peuvent déconnecter Google Drive' },
        { status: 403 }
      );
    }

    // 3. Récupérer la connexion active
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('*')
      .eq('tenant_id', profile.tenant_id!)
      .eq('actif', true)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Aucune connexion Google Drive active' },
        { status: 404 }
      );
    }

    // 4. Révoquer les tokens Google (best effort - si ça échoue, on continue quand même)
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      await oauth2Client.revokeToken(connection.access_token);
      console.log('✅ Tokens Google révoqués avec succès');
    } catch (revokeError) {
      console.warn('⚠️ Erreur lors de la révocation des tokens (on continue):', revokeError);
      // On continue quand même, ce n'est pas bloquant
    }

    // 5. Désactiver la connexion en base
    const { error: updateConnError } = await supabase
      .from('google_drive_connections')
      .update({
        actif: false,
        last_error: 'Déconnecté manuellement par l\'administrateur',
      })
      .eq('id', connection.id);

    if (updateConnError) {
      console.error('Erreur désactivation connexion:', updateConnError);
      return NextResponse.json(
        { error: 'Erreur lors de la déconnexion' },
        { status: 500 }
      );
    }

    // 6. Désactiver tous les syncs associés
    const { error: updateSyncsError } = await supabase
      .from('google_drive_synced_files')
      .update({ sync_enabled: false })
      .eq('connection_id', connection.id);

    if (updateSyncsError) {
      console.warn('⚠️ Erreur désactivation syncs:', updateSyncsError);
      // Non bloquant, on continue
    }

    // 7. Désactiver auto_sync sur les plans
    const { error: updatePlansError } = await supabase
      .from('plans_action')
      .update({ auto_sync: false })
      .eq('tenant_id', profile.tenant_id!)
      .eq('auto_sync', true);

    if (updatePlansError) {
      console.warn('⚠️ Erreur désactivation auto_sync plans:', updatePlansError);
    }

    console.log(`✅ Google Drive déconnecté pour tenant ${profile.tenant_id}`);

    return NextResponse.json({
      success: true,
      message: 'Google Drive déconnecté avec succès',
    });

  } catch (error) {
    console.error('Erreur disconnect:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
