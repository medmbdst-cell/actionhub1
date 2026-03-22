/**
 * Utilities pour le mapping et la normalisation des données Excel
 * Transforme les valeurs brutes en valeurs compatibles avec la DB
 */

import { convertExcelDate, type ExcelRow } from './excelParser';

export type ActionStatut = 'todo' | 'wip' | 'blocked' | 'done';
export type ActionPriorite = 'haute' | 'moyen' | 'faible';

export interface ColumnMapping {
  description?: string;
  event_description?: string;
  responsable_txt?: string;
  echeance?: string;
  statut?: string;
  priorite?: string;
  commentaire?: string;
}

export interface MappedAction {
  description: string;
  event_description?: string;
  responsable_txt?: string;
  echeance?: string;
  statut: ActionStatut | string; // Accepte aussi les pourcentages (ex: "0%", "50%", "100%")
  priorite?: ActionPriorite;
  commentaire?: string;
}

/**
 * Normalise une valeur de statut en type ActionStatut
 * Accepte :
 * - Pourcentages de 0% à 100% (arrondi au multiple de 10 le plus proche)
 * - Nombres décimaux Excel (0.0 à 1.0) convertis en pourcentages
 * - Nombres (1-4), strings français/anglais
 */
export function normalizeStatut(value: any): ActionStatut | string {
  if (!value) return 'todo';

  const str = String(value).toLowerCase().trim();

  // Gérer les pourcentages
  if (str.includes('%') || !isNaN(Number(str))) {
    let num: number;

    // Si c'est une chaîne avec %, extraire le nombre
    if (str.includes('%')) {
      num = parseFloat(str.replace('%', '').trim());
    } else {
      num = parseFloat(str);

      // BUGFIX: Excel stocke les pourcentages comme décimales (0.0 à 1.0)
      // Si le nombre est entre 0 et 1, le multiplier par 100
      if (num > 0 && num <= 1) {
        num = num * 100;
      }
    }

    if (!isNaN(num)) {
      // Arrondir au multiple de 10 le plus proche
      const rounded = Math.round(num / 10) * 10;
      const clamped = Math.max(0, Math.min(100, rounded)); // Entre 0 et 100

      // Retourner le pourcentage formaté
      return `${clamped}%`;
    }
  }

  // Mapping des valeurs classiques
  const statusMap: Record<string, ActionStatut> = {
    '1': 'todo',
    '2': 'wip',
    '3': 'blocked',
    '4': 'done',
    'todo': 'todo',
    'à faire': 'todo',
    'a faire': 'todo',
    'wip': 'wip',
    'en cours': 'wip',
    'encours': 'wip',
    'avancement': 'wip',
    'blocked': 'blocked',
    'bloqué': 'blocked',
    'bloque': 'blocked',
    'bloquee': 'blocked',
    'done': 'done',
    'terminé': 'done',
    'termine': 'done',
    'fait': 'done',
    'réalisé': 'done',
    'realise': 'done',
  };

  return statusMap[str] || 'todo';
}

/**
 * Normalise une valeur de priorité en type ActionPriorite
 * Accepte :
 * - nombres (1-4)
 * - strings français/anglais
 * - formats complexes comme "2 - I R D" (extrait le chiffre)
 */
export function normalizePriorite(value: any): ActionPriorite | undefined {
  if (!value) return undefined;

  const str = String(value).toLowerCase().trim();

  // NOUVEAU: Extraire le premier chiffre des formats "1 - I R F", "2-I R D", etc.
  const numberMatch = str.match(/^(\d+)/);
  if (numberMatch) {
    const num = numberMatch[1];
    // 1 = haute, 2 = moyen, 3 = faible, 4 = faible aussi
    if (num === '1') return 'haute';
    if (num === '2') return 'moyen';
    if (num === '3' || num === '4') return 'faible';
  }

  // Mapping des valeurs possibles (ancienne logique conservée)
  const priorityMap: Record<string, ActionPriorite> = {
    '1': 'haute',
    '2': 'moyen',
    '3': 'faible',
    '4': 'faible',
    'haute': 'haute',
    'high': 'haute',
    'élevée': 'haute',
    'elevee': 'haute',
    'moyen': 'moyen',
    'moyenne': 'moyen',
    'medium': 'moyen',
    'faible': 'faible',
    'low': 'faible',
    'basse': 'faible',
  };

  return priorityMap[str];
}

/**
 * Mappe une ligne Excel en action selon le mapping défini
 * @param row - Ligne Excel brute
 * @param mapping - Mapping des colonnes
 */
export function mapRowToAction(row: ExcelRow, mapping: ColumnMapping): MappedAction | null {
  // Description obligatoire
  if (!mapping.description) {
    return null;
  }

  const description = String(row[mapping.description] || '').trim();

  // Ignorer les lignes sans description
  if (!description) {
    return null;
  }

  return {
    description,
    event_description: mapping.event_description
      ? String(row[mapping.event_description] || '').trim() || undefined
      : undefined,
    responsable_txt: mapping.responsable_txt
      ? String(row[mapping.responsable_txt] || '').trim() || undefined
      : undefined,
    echeance: mapping.echeance ? convertExcelDate(row[mapping.echeance]) : undefined,
    statut: mapping.statut ? normalizeStatut(row[mapping.statut]) : 'todo',
    priorite: mapping.priorite ? normalizePriorite(row[mapping.priorite]) : undefined,
    commentaire: mapping.commentaire
      ? String(row[mapping.commentaire] || '').trim() || undefined
      : undefined,
  };
}

/**
 * Mappe toutes les lignes Excel en actions
 * Filtre automatiquement les lignes invalides (sans description)
 */
export function mapRowsToActions(rows: ExcelRow[], mapping: ColumnMapping): MappedAction[] {
  const actions: MappedAction[] = [];

  for (const row of rows) {
    const action = mapRowToAction(row, mapping);
    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Détecte automatiquement le mapping des colonnes (best effort)
 * Utilisé pour pré-remplir le mapping dans l'UI
 */
export function detectColumnMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // Convertir en minuscules en gérant les valeurs vides/undefined
  const lowerColumns = columns.map((c) => (c && typeof c === 'string' ? c.toLowerCase() : ''));

  // Description (rechercher "description", "action", "libellé", etc.)
  const descriptionIdx = lowerColumns.findIndex(
    (c) =>
      c && (c.includes('description') ||
      c.includes('action') ||
      c.includes('libellé') ||
      c.includes('libelle') ||
      c.includes('intitulé') ||
      c.includes('intitule'))
  );
  if (descriptionIdx !== -1) {
    mapping.description = columns[descriptionIdx];
  }

  // Event description
  const eventIdx = lowerColumns.findIndex(
    (c) =>
      c && (c.includes('événement') ||
      c.includes('evenement') ||
      c.includes('contexte') ||
      c.includes('justification'))
  );
  if (eventIdx !== -1) {
    mapping.event_description = columns[eventIdx];
  }

  // Responsable
  const responsableIdx = lowerColumns.findIndex(
    (c) =>
      c && (c.includes('responsable') ||
      c.includes('pilote') ||
      c.includes('assigné') ||
      c.includes('assigne'))
  );
  if (responsableIdx !== -1) {
    mapping.responsable_txt = columns[responsableIdx];
  }

  // Échéance
  const echeanceIdx = lowerColumns.findIndex(
    (c) =>
      c && (c.includes('échéance') ||
      c.includes('echeance') ||
      c.includes('date') ||
      c.includes('deadline'))
  );
  if (echeanceIdx !== -1) {
    mapping.echeance = columns[echeanceIdx];
  }

  // Statut
  const statutIdx = lowerColumns.findIndex(
    (c) => c && (c.includes('statut') || c.includes('état') || c.includes('etat') || c.includes('status'))
  );
  if (statutIdx !== -1) {
    mapping.statut = columns[statutIdx];
  }

  // Priorité (supporte aussi "priorisation")
  const prioriteIdx = lowerColumns.findIndex(
    (c) => c && (c.includes('priorité') || c.includes('priorite') || c.includes('priority') || c.includes('priorisation'))
  );
  if (prioriteIdx !== -1) {
    mapping.priorite = columns[prioriteIdx];
  }

  // Commentaire
  const commentaireIdx = lowerColumns.findIndex(
    (c) =>
      c && (c.includes('commentaire') ||
      c.includes('note') ||
      c.includes('remarque') ||
      c.includes('comment'))
  );
  if (commentaireIdx !== -1) {
    mapping.commentaire = columns[commentaireIdx];
  }

  return mapping;
}
