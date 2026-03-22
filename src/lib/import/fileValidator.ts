/**
 * Module de validation des fichiers Excel/Sheets importés
 * Vérifie la présence des colonnes requises et la qualité des données
 */

import { ParsedExcelData } from './excelParser';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: {
    totalRows: number;
    validRows: number;
    emptyRows: number;
    missingData: {
      description: number;
      responsable: number;
      echeance: number;
    };
  };
}

/**
 * Colonnes requises pour un import valide
 */
const REQUIRED_COLUMNS = ['description'];

/**
 * Colonnes recommandées (génèrent un warning si absentes)
 */
const RECOMMENDED_COLUMNS = ['responsable', 'echeance', 'statut'];

/**
 * Valide un fichier Excel/Sheets avant import
 *
 * @param data Données parsées du fichier
 * @param sheetName Nom de la feuille à valider
 * @returns Résultat de validation avec erreurs et warnings
 */
export function validateImportFile(
  data: ParsedExcelData,
  sheetName?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Vérifier qu'il y a des headers
  if (!data.headers || data.headers.length === 0) {
    errors.push('Le fichier ne contient aucune colonne (headers manquants)');
    return { valid: false, errors, warnings };
  }

  // 2. Vérifier la présence des colonnes requises
  const normalizedHeaders = data.headers.map(h =>
    h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const missingRequired = REQUIRED_COLUMNS.filter(required => {
    const normalized = required.toLowerCase();
    return !normalizedHeaders.some(h => h.includes(normalized));
  });

  if (missingRequired.length > 0) {
    errors.push(
      `Colonnes requises manquantes: ${missingRequired.join(', ')}. ` +
      `Colonnes trouvées: ${data.headers.join(', ')}`
    );
  }

  // 3. Vérifier les colonnes recommandées
  const missingRecommended = RECOMMENDED_COLUMNS.filter(recommended => {
    const normalized = recommended.toLowerCase();
    return !normalizedHeaders.some(h => h.includes(normalized));
  });

  if (missingRecommended.length > 0) {
    warnings.push(
      `Colonnes recommandées manquantes: ${missingRecommended.join(', ')}. ` +
      `L'import fonctionnera mais certaines données seront vides.`
    );
  }

  // 4. Vérifier qu'il y a des données
  if (!data.rows || data.rows.length === 0) {
    errors.push('Le fichier ne contient aucune ligne de données');
    return { valid: false, errors, warnings };
  }

  // 5. Analyser la qualité des données
  let validRows = 0;
  let emptyRows = 0;
  const missingData = {
    description: 0,
    responsable: 0,
    echeance: 0,
  };

  data.rows.forEach((row, index) => {
    // Ligne complètement vide
    const allEmpty = Object.values(row).every(val =>
      !val || val.toString().trim() === ''
    );

    if (allEmpty) {
      emptyRows++;
      return;
    }

    // Vérifier les champs critiques
    if (!row.description || row.description.toString().trim() === '') {
      missingData.description++;
    } else {
      validRows++;
    }

    if (!row.responsable || row.responsable.toString().trim() === '') {
      missingData.responsable++;
    }

    if (!row.echeance) {
      missingData.echeance++;
    }
  });

  // 6. Warnings sur la qualité des données
  if (emptyRows > 0) {
    warnings.push(
      `${emptyRows} ligne(s) vide(s) seront ignorées`
    );
  }

  if (missingData.description > 0) {
    warnings.push(
      `${missingData.description} ligne(s) sans description seront ignorées`
    );
  }

  if (missingData.responsable > data.rows.length * 0.5) {
    warnings.push(
      `${missingData.responsable} ligne(s) sans responsable - les actions ne seront pas assignées`
    );
  }

  if (missingData.echeance > data.rows.length * 0.3) {
    warnings.push(
      `${missingData.echeance} ligne(s) sans échéance - difficile de suivre les retards`
    );
  }

  if (validRows === 0) {
    errors.push(
      'Aucune ligne valide trouvée. Toutes les lignes ont une description vide.'
    );
  }

  // 7. Résultat final
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: data.rows.length,
      validRows,
      emptyRows,
      missingData,
    },
  };
}

/**
 * Valide que les statuts sont conformes aux valeurs attendues
 *
 * @param data Données parsées
 * @returns Liste des statuts invalides trouvés
 */
export function validateStatuts(data: ParsedExcelData): string[] {
  const validStatuts = ['todo', 'wip', 'blocked', 'done', 'à faire', 'en cours', 'bloqué', 'bloquée', 'terminé', 'terminée'];
  const invalidStatuts: string[] = [];

  data.rows.forEach((row) => {
    const statut = row.statut?.toString().toLowerCase().trim();

    if (!statut) return; // Pas de statut = OK (défaut à 'todo')

    // Vérifier si c'est un pourcentage (0%, 10%, ..., 100%)
    if (/^\d{1,3}%?$/.test(statut)) {
      const percent = parseInt(statut);
      if (percent >= 0 && percent <= 100) return; // Pourcentage valide
    }

    // Vérifier si c'est un statut textuel valide
    if (!validStatuts.includes(statut)) {
      if (!invalidStatuts.includes(statut)) {
        invalidStatuts.push(statut);
      }
    }
  });

  return invalidStatuts;
}

/**
 * Valide que les priorités sont conformes aux valeurs attendues
 *
 * @param data Données parsées
 * @returns Liste des priorités invalides trouvées
 */
export function validatePriorites(data: ParsedExcelData): string[] {
  const validPriorites = ['haute', 'high', 'moyen', 'moyenne', 'medium', 'faible', 'low', 'basse'];
  const invalidPriorites: string[] = [];

  data.rows.forEach((row) => {
    const priorite = row.priorite?.toString().toLowerCase().trim();

    if (!priorite) return; // Pas de priorité = OK

    if (!validPriorites.includes(priorite)) {
      if (!invalidPriorites.includes(priorite)) {
        invalidPriorites.push(priorite);
      }
    }
  });

  return invalidPriorites;
}

/**
 * Valide un fichier de manière complète (structure + données)
 *
 * @param data Données parsées
 * @param sheetName Nom de la feuille
 * @returns Résultat de validation complet
 */
export function validateFileComplete(
  data: ParsedExcelData,
  sheetName?: string
): ValidationResult {
  const result = validateImportFile(data, sheetName);

  // Valider les statuts
  const invalidStatuts = validateStatuts(data);
  if (invalidStatuts.length > 0) {
    result.warnings.push(
      `Statuts non reconnus trouvés: ${invalidStatuts.join(', ')}. ` +
      `Valeurs attendues: todo, wip, blocked, done, ou pourcentages (0% à 100%)`
    );
  }

  // Valider les priorités
  const invalidPriorites = validatePriorites(data);
  if (invalidPriorites.length > 0) {
    result.warnings.push(
      `Priorités non reconnues trouvées: ${invalidPriorites.join(', ')}. ` +
      `Valeurs attendues: haute, moyen, faible`
    );
  }

  return result;
}
