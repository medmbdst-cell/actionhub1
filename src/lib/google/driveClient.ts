import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

/**
 * Wrapper pour l'API Google Drive
 * Gère automatiquement le refresh des tokens expirés
 */

export interface DriveConnection {
  id: string;
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  connected_email: string;
  actif: boolean;
}

/**
 * Récupère la connexion Google Drive active pour un tenant
 */
export async function getActiveDriveConnection(tenantId: string, supabaseClient?: any): Promise<DriveConnection | null> {
  const supabase = supabaseClient || await createClient();

  const { data, error } = await supabase
    .from('google_drive_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('actif', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DriveConnection;
}

/**
 * Crée un client OAuth2 configuré avec les tokens d'une connexion
 * Gère automatiquement le refresh si le token est expiré
 */
export async function createDriveClient(connection: DriveConnection) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
  );

  // Configurer les credentials
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  // Hook pour sauvegarder automatiquement les nouveaux tokens après refresh
  oauth2Client.on('tokens', async (tokens) => {
    console.log('🔄 Tokens refreshed, saving to database...');

    const supabase = await createClient();

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1h par défaut

    await supabase
      .from('google_drive_connections')
      .update({
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        last_error: null, // Clear errors on successful refresh
      })
      .eq('id', connection.id);

    console.log('✅ New tokens saved to database');
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Marque une connexion comme inactive (en cas d'erreur irrécupérable)
 */
export async function markConnectionInactive(connectionId: string, errorMessage: string) {
  const supabase = await createClient();

  await supabase
    .from('google_drive_connections')
    .update({
      actif: false,
      last_error: errorMessage,
    })
    .eq('id', connectionId);

  console.error(`❌ Connection ${connectionId} marked as inactive: ${errorMessage}`);
}

/**
 * Helper : Vérifie si une connexion existe et est valide pour un tenant
 */
export async function hasValidDriveConnection(tenantId: string): Promise<boolean> {
  const connection = await getActiveDriveConnection(tenantId);
  return connection !== null;
}

/**
 * Helper : Récupère le client Drive prêt à l'emploi pour un tenant
 * Retourne null si pas de connexion active
 */
export async function getDriveClientForTenant(tenantId: string, supabaseClient?: any) {
  const connection = await getActiveDriveConnection(tenantId, supabaseClient);

  if (!connection) {
    return null;
  }

  try {
    const drive = await createDriveClient(connection);
    return { drive, connection };
  } catch (error) {
    console.error('Erreur création Drive client:', error);
    await markConnectionInactive(connection.id, `Failed to create client: ${error}`);
    return null;
  }
}
