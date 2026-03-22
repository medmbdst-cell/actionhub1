/**
 * Module de notification pour les échéances d'actions
 * Identifie les actions en retard ou à échéance proche et notifie les responsables
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resendClient';
import { generateEcheanceEmail, generateEcheanceSubject } from '@/lib/email/templates/echeanceTemplate';

export interface ActionEnAlerte {
  id: string;
  description: string;
  echeance: string;
  statut: string;
  joursRestants: number;
  responsable: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  plan: {
    nom: string;
  };
}

export interface NotificationSummary {
  tenantId: string;
  tenantNom: string;
  enRetard: ActionEnAlerte[];
  echeanceProche: ActionEnAlerte[]; // 7 jours ou moins
  responsables: Map<string, {
    nom: string;
    prenom: string;
    email: string;
    actionsEnRetard: number;
    actionsProches: number;
  }>;
}

/**
 * Récupère toutes les actions nécessitant une notification pour un tenant
 *
 * @param supabase Client Supabase (avec SERVICE_ROLE pour bypasser RLS)
 * @param tenantId ID du tenant
 * @returns Résumé des notifications à envoyer
 */
export async function getActionsEnAlerte(
  supabase: SupabaseClient,
  tenantId: string
): Promise<NotificationSummary | null> {
  try {
    // Récupérer le tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('nom')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      console.error(`Tenant ${tenantId} non trouvé`);
      return null;
    }

    // Date du jour et limite pour "échéance proche" (7 jours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Récupérer toutes les actions non terminées avec échéance
    const { data: actions, error } = await supabase
      .from('actions')
      .select(`
        id,
        description,
        echeance,
        statut,
        responsable:profiles!actions_responsable_id_fkey(id, nom, prenom, email),
        plan:plans_action(nom)
      `)
      .eq('tenant_id', tenantId)
      .neq('statut', 'done')
      .not('echeance', 'is', null)
      .not('responsable_id', 'is', null); // Seulement les actions assignées

    if (error) {
      console.error('Erreur récupération actions:', error);
      return null;
    }

    if (!actions || actions.length === 0) {
      return {
        tenantId,
        tenantNom: tenant.nom,
        enRetard: [],
        echeanceProche: [],
        responsables: new Map(),
      };
    }

    // Classer les actions
    const enRetard: ActionEnAlerte[] = [];
    const echeanceProche: ActionEnAlerte[] = [];
    const responsablesMap = new Map<string, {
      nom: string;
      prenom: string;
      email: string;
      actionsEnRetard: number;
      actionsProches: number;
    }>();

    actions.forEach((action: any) => {
      const echeance = new Date(action.echeance);
      const joursRestants = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const actionAlerte: ActionEnAlerte = {
        id: action.id,
        description: action.description,
        echeance: action.echeance,
        statut: action.statut,
        joursRestants,
        responsable: action.responsable,
        plan: action.plan,
      };

      // Initialiser le responsable si pas déjà fait
      if (!responsablesMap.has(action.responsable.id)) {
        responsablesMap.set(action.responsable.id, {
          nom: action.responsable.nom,
          prenom: action.responsable.prenom,
          email: action.responsable.email,
          actionsEnRetard: 0,
          actionsProches: 0,
        });
      }

      const respStats = responsablesMap.get(action.responsable.id)!;

      // Action en retard
      if (echeance < today) {
        enRetard.push(actionAlerte);
        respStats.actionsEnRetard++;
      }
      // Action avec échéance proche (dans les 7 jours)
      else if (echeance <= in7Days) {
        echeanceProche.push(actionAlerte);
        respStats.actionsProches++;
      }
    });

    return {
      tenantId,
      tenantNom: tenant.nom,
      enRetard,
      echeanceProche,
      responsables: responsablesMap,
    };
  } catch (error) {
    console.error('Erreur getActionsEnAlerte:', error);
    return null;
  }
}

/**
 * Envoie les notifications pour un tenant
 * Envoie un email à chaque responsable concerné
 *
 * @param summary Résumé des notifications
 */
export async function envoyerNotifications(summary: NotificationSummary): Promise<void> {
  if (summary.enRetard.length === 0 && summary.echeanceProche.length === 0) {
    console.log(`[${summary.tenantNom}] Aucune action en alerte`);
    return;
  }

  console.log(`\n========== NOTIFICATIONS ÉCHÉANCES - ${summary.tenantNom} ==========`);

  let emailsSent = 0;
  let emailsFailed = 0;

  // Envoyer un email par responsable
  for (const [responsableId, stats] of summary.responsables.entries()) {
    if (stats.actionsEnRetard === 0 && stats.actionsProches === 0) continue;

    console.log(`\n📧 Envoi email à ${stats.prenom} ${stats.nom} (${stats.email}):`);
    console.log(`   ⚠️  ${stats.actionsEnRetard} action(s) en retard`);
    console.log(`   ⏰ ${stats.actionsProches} action(s) à échéance proche`);

    // Filtrer les actions de ce responsable
    const actionsEnRetard = summary.enRetard.filter(
      a => a.responsable.id === responsableId
    );
    const actionsProches = summary.echeanceProche.filter(
      a => a.responsable.id === responsableId
    );

    // Générer l'email
    const html = generateEcheanceEmail({
      prenom: stats.prenom,
      nom: stats.nom,
      actionsEnRetard,
      actionsProches,
      tenantNom: summary.tenantNom,
    });

    const subject = generateEcheanceSubject(
      actionsEnRetard.length,
      actionsProches.length
    );

    // Envoyer l'email
    const result = await sendEmail({
      to: stats.email,
      subject,
      html,
    });

    if (result.success) {
      console.log(`   ✅ Email envoyé (ID: ${result.messageId})`);
      emailsSent++;
    } else {
      console.error(`   ❌ Échec envoi: ${result.error}`);
      emailsFailed++;
    }
  }

  // Résumé
  console.log(`\n📊 Résumé:`);
  console.log(`   - ${emailsSent} email(s) envoyé(s)`);
  if (emailsFailed > 0) {
    console.log(`   - ${emailsFailed} échec(s)`);
  }
  console.log('==========================================================\n');
}

/**
 * Vérifie toutes les tenants actifs et envoie les notifications
 *
 * @param supabase Client Supabase (SERVICE_ROLE)
 */
export async function verifierEtNotifierTousLesTenants(
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Récupérer tous les tenants actifs
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, nom')
      .eq('actif', true);

    if (error) {
      console.error('Erreur récupération tenants:', error);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('Aucun tenant actif');
      return;
    }

    console.log(`\n🔔 Vérification des échéances pour ${tenants.length} tenant(s)...\n`);

    // Traiter chaque tenant
    for (const tenant of tenants) {
      const summary = await getActionsEnAlerte(supabase, tenant.id);

      if (summary) {
        await envoyerNotifications(summary);
      }
    }

    console.log('✅ Vérification des échéances terminée\n');
  } catch (error) {
    console.error('Erreur verifierEtNotifierTousLesTenants:', error);
  }
}
