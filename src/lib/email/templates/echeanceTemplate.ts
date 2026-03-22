/**
 * Template HTML pour les emails de notification d'échéances
 */

import { ActionEnAlerte } from '@/lib/notifications/echeanceNotifier';

interface EcheanceEmailData {
  prenom: string;
  nom: string;
  actionsEnRetard: ActionEnAlerte[];
  actionsProches: ActionEnAlerte[];
  tenantNom: string;
}

/**
 * Génère le HTML de l'email de notification d'échéances
 */
export function generateEcheanceEmail(data: EcheanceEmailData): string {
  const { prenom, nom, actionsEnRetard, actionsProches, tenantNom } = data;

  const totalAlerts = actionsEnRetard.length + actionsProches.length;

  if (totalAlerts === 0) {
    return ''; // Pas d'email si pas d'alertes
  }

  const enRetardSection = actionsEnRetard.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
        ⚠️ Actions en retard (${actionsEnRetard.length})
      </h2>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px;">
        ${actionsEnRetard.slice(0, 10).map(action => `
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #fecaca;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              ${action.description}
            </div>
            <div style="font-size: 13px; color: #6b7280;">
              Plan: ${action.plan.nom} | Retard: ${Math.abs(action.joursRestants)} jour(s)
            </div>
          </div>
        `).join('')}
        ${actionsEnRetard.length > 10 ? `
          <div style="color: #6b7280; font-size: 13px; font-style: italic;">
            ... et ${actionsEnRetard.length - 10} autre(s) action(s) en retard
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const prochesSection = actionsProches.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #f59e0b; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
        ⏰ Échéances proches (${actionsProches.length})
      </h2>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
        ${actionsProches.slice(0, 10).map(action => `
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #fde68a;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              ${action.description}
            </div>
            <div style="font-size: 13px; color: #6b7280;">
              Plan: ${action.plan.nom} | Dans ${action.joursRestants} jour(s)
            </div>
          </div>
        `).join('')}
        ${actionsProches.length > 10 ? `
          <div style="color: #6b7280; font-size: 13px; font-style: italic;">
            ... et ${actionsProches.length - 10} autre(s) action(s) à échéance proche
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ActionHub - Alertes Échéances</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
        ActionHub
      </h1>
      <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px;">
        ${tenantNom}
      </p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 25px;">
        <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">
          Bonjour ${prenom},
        </h2>
        <p style="color: #6b7280; margin: 0; line-height: 1.6;">
          Vous avez <strong>${totalAlerts} action(s)</strong> nécessitant votre attention.
        </p>
      </div>

      ${enRetardSection}
      ${prochesSection}

      <!-- CTA -->
      <div style="margin-top: 30px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/collaborateur"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Voir mes actions
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Cet email a été envoyé automatiquement par ActionHub
      </p>
      <p style="margin: 0;">
        © ${new Date().getFullYear()} ActionHub. Tous droits réservés.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Génère le sujet de l'email en fonction du nombre d'alertes
 */
export function generateEcheanceSubject(
  actionsEnRetardCount: number,
  actionsPrόchesCount: number
): string {
  if (actionsEnRetardCount > 0 && actionsPrόchesCount > 0) {
    return `⚠️ ${actionsEnRetardCount} action(s) en retard et ${actionsPrόchesCount} à échéance proche`;
  } else if (actionsEnRetardCount > 0) {
    return `⚠️ ${actionsEnRetardCount} action(s) en retard`;
  } else {
    return `⏰ ${actionsPrόchesCount} action(s) à échéance proche`;
  }
}
