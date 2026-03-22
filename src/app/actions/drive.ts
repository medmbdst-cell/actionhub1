'use server';

/**
 * Server actions pour interagir avec Google Drive
 * Liste fichiers, télécharge fichiers, récupère métadonnées
 */

import { createClient } from '@/lib/supabase/server';
import { getDriveClientForTenant, hasValidDriveConnection } from '@/lib/google/driveClient';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

/**
 * Vérifie si le tenant a une connexion Google Drive active
 */
export async function checkDriveConnection() {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    // Vérifier la connexion
    const hasConnection = await hasValidDriveConnection(profile.tenant_id!);

    if (!hasConnection) {
      return { success: false, connected: false };
    }

    // Récupérer les infos de connexion
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('connected_email, created_at, last_sync_at')
      .eq('tenant_id', profile.tenant_id!)
      .eq('actif', true)
      .single();

    return {
      success: true,
      connected: true,
      connection: {
        email: connection?.connected_email,
        connectedAt: connection?.created_at,
        lastSync: connection?.last_sync_at,
      },
    };

  } catch (error) {
    console.error('Erreur check connection:', error);
    return { success: false, error: 'Erreur lors de la vérification' };
  }
}

/**
 * Liste les fichiers Excel disponibles dans Google Drive
 * Filtre : .xlsx et .xls uniquement
 */
export async function listDriveFiles() {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'responsable'].includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Récupérer le client Drive
    const driveData = await getDriveClientForTenant(profile.tenant_id!);

    if (!driveData) {
      return { success: false, error: 'Aucune connexion Google Drive active' };
    }

    const { drive } = driveData;

    // Lister les fichiers Excel (xlsx et xls)
    const response = await drive.files.list({
      q: "(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel') and trashed=false",
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100, // Limiter à 100 fichiers
    });

    const files: DriveFile[] = (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      modifiedTime: file.modifiedTime!,
      size: file.size,
      webViewLink: file.webViewLink,
    }));

    return {
      success: true,
      files,
      count: files.length,
    };

  } catch (error: any) {
    console.error('Erreur listDriveFiles:', error);

    // Gérer erreurs spécifiques Google API
    if (error.code === 401) {
      return { success: false, error: 'Token expiré, veuillez reconnecter votre compte' };
    }

    return { success: false, error: 'Erreur lors de la récupération des fichiers' };
  }
}

/**
 * Télécharge un fichier depuis Google Drive (retourne un buffer)
 * @param fileId - ID du fichier dans Google Drive
 * @param tenantId - (optionnel) ID du tenant, utilisé pour les cron jobs
 * @param supabaseClient - (optionnel) Client Supabase SERVICE_ROLE pour les cron jobs
 */
export async function fetchDriveFile(fileId: string, tenantId?: string, supabaseClient?: any) {
  try {
    const supabase = supabaseClient || await createClient();

    // Si tenantId est fourni (mode cron), on skip l'authentification utilisateur
    let targetTenantId: string;

    if (tenantId) {
      // Mode cron : utiliser directement le tenantId fourni
      targetTenantId = tenantId;
    } else {
      // Mode interactif : vérifier l'authentification utilisateur
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Non authentifié' };
      }

      // Récupérer le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'responsable'].includes(profile.role)) {
        return { success: false, error: 'Permissions insuffisantes' };
      }

      targetTenantId = profile.tenant_id!;
    }

    // Récupérer le client Drive
    const driveData = await getDriveClientForTenant(targetTenantId, supabase);

    if (!driveData) {
      return { success: false, error: 'Aucune connexion Google Drive active' };
    }

    const { drive } = driveData;

    // Récupérer les métadonnées du fichier
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, modifiedTime, size',
    });

    // Télécharger le contenu du fichier
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
      }
    );

    // Convertir en Buffer
    const buffer = Buffer.from(response.data as ArrayBuffer);

    return {
      success: true,
      file: {
        id: metadata.data.id!,
        name: metadata.data.name!,
        mimeType: metadata.data.mimeType!,
        modifiedTime: metadata.data.modifiedTime!,
        size: metadata.data.size,
      },
      buffer: buffer.toString('base64'), // Convertir en base64 pour transfert JSON
    };

  } catch (error: any) {
    console.error('Erreur fetchDriveFile:', error);

    if (error.code === 404) {
      return { success: false, error: 'Fichier non trouvé' };
    }

    if (error.code === 401) {
      return { success: false, error: 'Token expiré, veuillez reconnecter votre compte' };
    }

    return { success: false, error: 'Erreur lors du téléchargement du fichier' };
  }
}

/**
 * Récupère les métadonnées d'un fichier Drive (sans télécharger le contenu)
 */
export async function getDriveFileMetadata(fileId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    const driveData = await getDriveClientForTenant(profile.tenant_id!);

    if (!driveData) {
      return { success: false, error: 'Aucune connexion Google Drive active' };
    }

    const { drive } = driveData;

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, modifiedTime, size, webViewLink',
    });

    return {
      success: true,
      file: {
        id: response.data.id!,
        name: response.data.name!,
        mimeType: response.data.mimeType!,
        modifiedTime: response.data.modifiedTime!,
        size: response.data.size,
        webViewLink: response.data.webViewLink,
      },
    };

  } catch (error: any) {
    console.error('Erreur getDriveFileMetadata:', error);
    return { success: false, error: 'Erreur lors de la récupération des métadonnées' };
  }
}
