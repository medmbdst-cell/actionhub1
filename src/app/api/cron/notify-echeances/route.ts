/**
 * Cron job quotidien pour notifier les actions en retard ou à échéance proche
 * Endpoint: POST /api/cron/notify-echeances
 * Fréquence: Quotidien (configuré dans vercel.json)
 * Protection: CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifierEtNotifierTousLesTenants } from '@/lib/notifications/echeanceNotifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 secondes max

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification via CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET non configuré');
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Tentative d\'accès non autorisée au cron notify-echeances');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // 2. Créer un client Supabase avec SERVICE_ROLE (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase non configuré');
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Exécuter la vérification et l'envoi des notifications
    console.log(`[CRON notify-echeances] Démarrage à ${new Date().toISOString()}`);

    await verifierEtNotifierTousLesTenants(supabase);

    console.log(`[CRON notify-echeances] Terminé à ${new Date().toISOString()}`);

    // 4. Retourner le résultat
    return NextResponse.json({
      success: true,
      message: 'Notifications des échéances traitées avec succès',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur cron notify-echeances:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erreur inconnue',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Endpoint GET pour tester manuellement (dev uniquement)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint disponible uniquement en dev' },
      { status: 403 }
    );
  }

  // En dev, pas besoin de CRON_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[DEV] Test manuel des notifications échéances');
  await verifierEtNotifierTousLesTenants(supabase);

  return NextResponse.json({
    success: true,
    message: 'Test terminé - vérifiez la console',
  });
}
