import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * GET /api/auth/google/authorize
 *
 * Génère l'URL OAuth Google et redirige l'utilisateur
 * Protège contre les attaques CSRF avec un state token
 */
export async function GET(request: NextRequest) {
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

    // 2. Vérifier que l'utilisateur est admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les admins peuvent connecter Google Drive' },
        { status: 403 }
      );
    }

    // 3. Générer un state token pour CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // 4. Stocker le state token dans un cookie sécurisé (expiration 10 min)
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // 5. Créer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
    );

    // 6. Générer l'URL d'autorisation
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Pour obtenir un refresh_token
      scope: scopes,
      state: state,
      prompt: 'consent', // Force l'affichage du consent screen pour obtenir refresh_token
    });

    // 7. Rediriger vers Google
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Erreur OAuth authorize:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'URL OAuth' },
      { status: 500 }
    );
  }
}
