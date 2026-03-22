import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google/callback
 *
 * Reçoit le code d'autorisation de Google
 * Échange le code contre des tokens (access_token + refresh_token)
 * Stocke les tokens en base de données
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?error=auth_required', request.url)
      );
    }

    // 2. Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/admin?error=forbidden', request.url)
      );
    }

    // 3. Vérifier le state token (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    const receivedState = searchParams.get('state');

    if (!storedState || storedState !== receivedState) {
      console.error('State token mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/admin/import?error=invalid_state', request.url)
      );
    }

    // 4. Supprimer le state cookie (usage unique)
    cookieStore.delete('google_oauth_state');

    // 5. Vérifier si on a reçu un code ou une erreur
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/admin/import?error=oauth_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/import?error=no_code', request.url)
      );
    }

    // 6. Créer le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
    );

    // 7. Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('Missing tokens:', tokens);
      return NextResponse.redirect(
        new URL('/admin/import?error=missing_tokens', request.url)
      );
    }

    // 8. Récupérer l'email de l'utilisateur Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      return NextResponse.redirect(
        new URL('/admin/import?error=no_email', request.url)
      );
    }

    // 9. Calculer la date d'expiration du token
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Par défaut 1h

    // 10. Désactiver l'ancienne connexion active (si elle existe)
    await supabase
      .from('google_drive_connections')
      .update({ actif: false })
      .eq('tenant_id', profile.tenant_id!)
      .eq('actif', true);

    // 11. Créer la nouvelle connexion
    const { error: insertError } = await supabase
      .from('google_drive_connections')
      .insert({
        tenant_id: profile.tenant_id!,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_by: user.id,
        connected_email: userInfo.email,
        actif: true,
      });

    if (insertError) {
      console.error('Erreur insertion connexion:', insertError);
      return NextResponse.redirect(
        new URL('/admin/import?error=db_error', request.url)
      );
    }

    // 12. Succès ! Rediriger vers la page d'import Drive
    console.log(`✅ Google Drive connecté avec succès pour ${userInfo.email}`);
    return NextResponse.redirect(
      new URL('/admin/import/drive?success=connected', request.url)
    );

  } catch (error) {
    console.error('Erreur OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/import?error=callback_failed', request.url)
    );
  }
}
