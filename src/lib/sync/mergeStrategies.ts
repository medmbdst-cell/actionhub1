/**
 * Stratégies de merge pour résoudre les conflits de synchronisation
 * Applique des règles métier champ par champ lors de conflits Drive vs Local
 *
 * Phase 3 - Update Incrémental
 */

import type { MappedAction } from '@/lib/import/mappingUtils';

export type MergeStrategy = 'drive_wins' | 'local_wins' | 'manual';

export interface ConflictResolution {
  field: string;
  driveValue: any;
  localValue: any;
  resolvedValue: any;
  strategy: MergeStrategy;
}

export interface ExistingAction {
  id: string;
  description: string;
  event_description?: string | null;
  responsable_txt?: string | null;
  echeance?: string | null;
  statut: string;
  priorite?: string | null;
  commentaire?: string | null;
  updated_at: string; // ISO timestamp
}

/**
 * Règles de merge par champ
 * Définit quelle source est prioritaire en cas de conflit
 *
 * **Logique métier :**
 * - Champs "structure du plan" (description, responsable, échéance, priorité) → Drive prioritaire
 *   Raison : Ces champs sont définis par le planificateur et rarement modifiés manuellement
 *
 * - Champs "travail quotidien" (statut, commentaire) → Local prioritaire
 *   Raison : Ces champs sont mis à jour régulièrement par les utilisateurs dans l'outil
 */
const FIELD_MERGE_RULES: Record<string, MergeStrategy> = {
  // Vérité source = Drive (structure du plan)
  description: 'drive_wins',
  event_description: 'drive_wins',
  responsable_txt: 'drive_wins',
  echeance: 'drive_wins',
  priorite: 'drive_wins',

  // Travail quotidien = Local (modifications des utilisateurs)
  statut: 'local_wins',
  commentaire: 'local_wins',
};

/**
 * Merge une action provenant de Drive avec une action existante en base
 * Applique les règles de priorité champ par champ et détecte les conflits
 *
 * **Algorithme :**
 * 1. Pour chaque champ, comparer valeur Drive vs valeur Locale
 * 2. Si identiques → pas de conflit, skip
 * 3. Si différentes :
 *    - Vérifier si l'action a été modifiée localement (updated_at > last_synced_at)
 *    - Appliquer la règle de merge du champ (drive_wins ou local_wins)
 *    - Logger le conflit si nécessaire
 *
 * @param driveAction - Action telle qu'elle apparaît dans le fichier Drive (nouvelles valeurs)
 * @param existingAction - Action telle qu'elle existe actuellement en base
 * @param lastSyncedAt - Date de la dernière sync du fichier (pour détecter modif locale)
 * @returns Objet avec les valeurs mergées et la liste des conflits détectés
 *
 * @example
 * const { mergedAction, conflicts } = mergeAction(
 *   driveAction, // { statut: "done", echeance: "2026-04-15" }
 *   existingAction, // { statut: "wip", echeance: "2026-03-20", updated_at: "2026-03-16T10:00:00Z" }
 *   new Date("2026-03-15T00:00:00Z") // dernière sync
 * );
 * // mergedAction: { statut: "wip" (local wins), echeance: "2026-04-15" (drive wins) }
 * // conflicts: [{ field: "statut", ... }, { field: "echeance", ... }]
 */
export function mergeAction(
  driveAction: MappedAction,
  existingAction: ExistingAction,
  lastSyncedAt: Date
): {
  mergedAction: Partial<ExistingAction>;
  conflicts: ConflictResolution[];
} {
  const conflicts: ConflictResolution[] = [];
  const mergedAction: Partial<ExistingAction> = { id: existingAction.id };

  // Helper : détecter si l'action a été modifiée localement depuis la dernière sync
  const wasModifiedLocally = new Date(existingAction.updated_at) > lastSyncedAt;

  // Liste des champs à comparer
  const fieldsToCheck: Array<keyof MappedAction> = [
    'description',
    'event_description',
    'responsable_txt',
    'echeance',
    'statut',
    'priorite',
    'commentaire',
  ];

  for (const field of fieldsToCheck) {
    const driveValue = driveAction[field];
    const localValue = existingAction[field];

    // Normaliser pour comparaison (null vs undefined vs '')
    const normalizedDrive = driveValue === undefined || driveValue === '' ? null : driveValue;
    const normalizedLocal = localValue === undefined || localValue === '' ? null : localValue;

    // Si les valeurs sont identiques, pas de conflit
    if (normalizedDrive === normalizedLocal) {
      continue;
    }

    // Il y a une différence entre Drive et Local
    const strategy = FIELD_MERGE_RULES[field] || 'drive_wins';
    let resolvedValue: any;
    let isConflict = false;

    if (wasModifiedLocally && strategy === 'local_wins') {
      // Cas 1 : Modifié localement + règle "local_wins" → GARDER LOCAL (pas de conflit)
      resolvedValue = normalizedLocal;
    } else if (!wasModifiedLocally && strategy === 'drive_wins') {
      // Cas 2 : Pas modifié localement + règle "drive_wins" → APPLIQUER DRIVE (pas de conflit)
      resolvedValue = normalizedDrive;
    } else if (wasModifiedLocally && strategy === 'drive_wins') {
      // Cas 3 : CONFLIT - Modifié localement mais règle dit "drive_wins"
      // Phase 3 : on applique Drive (comportement conservateur)
      // Phase 4 : UI permettra à l'utilisateur de choisir
      resolvedValue = normalizedDrive;
      isConflict = true;
    } else {
      // Cas 4 : Pas modifié localement + règle "local_wins" → GARDER LOCAL (rare)
      resolvedValue = normalizedLocal;
    }

    // Ajouter au merged action seulement si la valeur change
    if (resolvedValue !== normalizedLocal) {
      mergedAction[field as keyof ExistingAction] = resolvedValue;
    }

    // Logger le conflit si détecté
    if (isConflict || (wasModifiedLocally && normalizedDrive !== normalizedLocal)) {
      conflicts.push({
        field,
        driveValue: normalizedDrive,
        localValue: normalizedLocal,
        resolvedValue,
        strategy,
      });
    }
  }

  return { mergedAction, conflicts };
}

/**
 * Détermine si une action a été modifiée localement depuis la dernière sync
 *
 * @param action - Action en base avec updated_at
 * @param lastSyncedAt - Date de la dernière sync du fichier
 * @returns true si modifiée localement, false sinon
 */
export function wasActionModifiedLocally(
  action: { updated_at: string },
  lastSyncedAt: Date
): boolean {
  return new Date(action.updated_at) > lastSyncedAt;
}

/**
 * Formatte un conflit pour l'affichage dans l'UI
 *
 * @param conflict - Conflit brut
 * @returns Conflit formaté avec labels français
 */
export function formatConflictForUI(conflict: ConflictResolution): {
  fieldLabel: string;
  driveValueLabel: string;
  localValueLabel: string;
  resolvedValueLabel: string;
  strategyLabel: string;
  strategyColor: 'blue' | 'green' | 'orange';
} {
  const fieldLabels: Record<string, string> = {
    description: 'Description',
    event_description: 'Contexte/Événement',
    responsable_txt: 'Responsable',
    echeance: 'Échéance',
    statut: 'Statut',
    priorite: 'Priorité',
    commentaire: 'Commentaire',
  };

  const strategyLabels: Record<MergeStrategy, string> = {
    drive_wins: 'Drive prioritaire',
    local_wins: 'Local prioritaire',
    manual: 'Résolution manuelle',
  };

  const strategyColors: Record<MergeStrategy, 'blue' | 'green' | 'orange'> = {
    drive_wins: 'blue',
    local_wins: 'green',
    manual: 'orange',
  };

  return {
    fieldLabel: fieldLabels[conflict.field] || conflict.field,
    driveValueLabel: String(conflict.driveValue || '(vide)'),
    localValueLabel: String(conflict.localValue || '(vide)'),
    resolvedValueLabel: String(conflict.resolvedValue || '(vide)'),
    strategyLabel: strategyLabels[conflict.strategy],
    strategyColor: strategyColors[conflict.strategy],
  };
}
