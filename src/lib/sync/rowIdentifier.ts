/**
 * Utilitaires pour générer des identifiants uniques pour les lignes Excel
 * et détecter les changements de contenu lors de la synchronisation
 *
 * Phase 3 - Update Incrémental
 */

import crypto from 'crypto';
import type { ExcelRow, ColumnMapping, MappedAction } from '@/lib/import/mappingUtils';

/**
 * Génère un identifiant stable pour une ligne Excel
 * Basé sur le numéro de ligne + hash des champs immutables (description, event_description)
 *
 * Cet ID est utilisé pour matcher les actions Drive vs Base de données lors des syncs.
 *
 * @param row - Ligne Excel brute (objet clé-valeur)
 * @param rowIndex - Index de la ligne dans le fichier (0-based)
 * @param mapping - Mapping des colonnes (description, event_description, etc.)
 * @returns Hash SHA-256 unique pour cette ligne
 *
 * @example
 * const rowId = generateRowIdentifier(
 *   { "Description": "Faire un rapport", "Contexte": "Q1 2026" },
 *   0,
 *   { description: "Description", event_description: "Contexte" }
 * );
 * // => "a3f5b8c9d2e1f4g7h6i5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8"
 */
export function generateRowIdentifier(
  row: ExcelRow,
  rowIndex: number,
  mapping: ColumnMapping
): string {
  // Champs utilisés pour l'identification
  // Important : NE PAS inclure des champs qui changent souvent (statut, commentaire, echeance)
  // car sinon l'action serait considérée comme "nouvelle" au lieu de "modifiée"
  const keyFields = [
    `row:${rowIndex}`, // Position dans le fichier
    String(row[mapping.description || ''] || '').trim(),
    String(row[mapping.event_description || ''] || '').trim(),
  ];

  const concatenated = keyFields.join('|');
  return crypto.createHash('sha256').update(concatenated, 'utf-8').digest('hex');
}

/**
 * Génère un hash du contenu COMPLET d'une ligne Excel
 * Utilisé pour détecter les changements dans le fichier Drive
 *
 * Contrairement à generateRowIdentifier(), ce hash inclut TOUS les champs
 * (y compris statut, commentaire, echeance) pour détecter n'importe quel changement.
 *
 * @param row - Ligne Excel brute
 * @param mapping - Mapping des colonnes
 * @returns Hash SHA-256 du contenu complet
 *
 * @example
 * const hash1 = generateContentHash(row, mapping); // "abc123..."
 * // Modifier le statut dans le fichier Excel
 * const hash2 = generateContentHash(row, mapping); // "def456..." (différent!)
 */
export function generateContentHash(
  row: ExcelRow,
  mapping: ColumnMapping
): string {
  const allFields = [
    String(row[mapping.description || ''] || '').trim(),
    String(row[mapping.event_description || ''] || '').trim(),
    String(row[mapping.responsable_txt || ''] || '').trim(),
    String(row[mapping.echeance || ''] || '').trim(),
    String(row[mapping.statut || ''] || '').trim(),
    String(row[mapping.priorite || ''] || '').trim(),
    String(row[mapping.commentaire || ''] || '').trim(),
  ];

  const concatenated = allFields.join('|');
  return crypto.createHash('sha256').update(concatenated, 'utf-8').digest('hex');
}

/**
 * Génère un hash de l'état ACTUEL d'une action en base de données
 * Utilisé pour comparer avec drive_content_hash et détecter les modifications locales
 *
 * Important : La signature du hash doit être IDENTIQUE à generateContentHash()
 * pour permettre la comparaison entre Drive et Base.
 *
 * @param action - Action telle qu'elle existe en base (champs individuels)
 * @returns Hash SHA-256 de l'action
 *
 * @example
 * const action = await supabase.from('actions').select('*').eq('id', actionId).single();
 * const currentHash = generateActionHash(action.data);
 * const wasModifiedLocally = currentHash !== action.data.drive_content_hash;
 */
export function generateActionHash(action: {
  description: string;
  event_description?: string | null;
  responsable_txt?: string | null;
  echeance?: string | null;
  statut: string;
  priorite?: string | null;
  commentaire?: string | null;
}): string {
  const fields = [
    (action.description || '').trim(),
    (action.event_description || '').trim(),
    (action.responsable_txt || '').trim(),
    (action.echeance || '').trim(),
    (action.statut || '').trim(),
    (action.priorite || '').trim(),
    (action.commentaire || '').trim(),
  ];

  const concatenated = fields.join('|');
  return crypto.createHash('sha256').update(concatenated, 'utf-8').digest('hex');
}

/**
 * Génère les identifiants complets pour une ligne Excel
 * Combine row_id et content_hash en un seul appel
 *
 * @param row - Ligne Excel
 * @param rowIndex - Index de la ligne
 * @param mapping - Mapping des colonnes
 * @returns Objet avec rowId et contentHash
 */
export function generateRowIdentifiers(
  row: ExcelRow,
  rowIndex: number,
  mapping: ColumnMapping
): { rowId: string; contentHash: string } {
  return {
    rowId: generateRowIdentifier(row, rowIndex, mapping),
    contentHash: generateContentHash(row, mapping),
  };
}

/**
 * Vérifie si deux hash sont identiques (comparaison sécurisée)
 *
 * @param hash1 - Premier hash
 * @param hash2 - Second hash
 * @returns true si identiques, false sinon
 */
export function areHashesEqual(hash1: string | null | undefined, hash2: string | null | undefined): boolean {
  if (!hash1 || !hash2) return false;
  return hash1 === hash2;
}
