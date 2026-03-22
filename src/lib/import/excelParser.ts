/**
 * Utilities pour le parsing de fichiers Excel
 * Utilisé par import manuel (upload) et import Google Drive
 */

import * as XLSX from 'xlsx';

export interface ExcelRow {
  [key: string]: string | number | null;
}

export interface ParsedExcelData {
  columns: string[];
  rows: ExcelRow[];
}

/**
 * Parse un buffer Excel en workbook XLSX
 * @param buffer - Buffer du fichier Excel (ArrayBuffer ou Buffer)
 */
export function parseExcelWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer);
}

/**
 * Récupère les noms de toutes les feuilles d'un workbook
 */
export function getSheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames;
}

/**
 * Convertit une feuille Excel en tableau de lignes (rows)
 * @param workbook - Workbook XLSX
 * @param sheetName - Nom de la feuille à lire
 * @returns Colonnes et lignes parsées
 */
export function sheetToRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedExcelData {
  const worksheet = workbook.Sheets[sheetName];

  // Convertir en JSON (array de arrays)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (jsonData.length === 0) {
    return { columns: [], rows: [] };
  }

  // Extraire les colonnes (première ligne)
  const columns = jsonData[0].map((h) => String(h || ''));

  // Extraire les données (reste des lignes)
  const rows = jsonData.slice(1).map((row) => {
    const obj: ExcelRow = {};
    columns.forEach((header, index) => {
      obj[header] = row[index] ?? null;
    });
    return obj;
  });

  // Filtrer les lignes vides (toutes les valeurs sont null ou '')
  const filteredRows = rows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== '')
  );

  return {
    columns,
    rows: filteredRows,
  };
}

/**
 * Parse un buffer Excel et retourne toutes les feuilles avec leurs données
 * @param buffer - Buffer du fichier Excel
 * @returns Map des feuilles avec leurs données
 */
export function parseExcelFile(buffer: ArrayBuffer): Map<string, ParsedExcelData> {
  const workbook = parseExcelWorkbook(buffer);
  const sheets = new Map<string, ParsedExcelData>();

  workbook.SheetNames.forEach((sheetName) => {
    const data = sheetToRows(workbook, sheetName);
    sheets.set(sheetName, data);
  });

  return sheets;
}

/**
 * Convertit une date Excel en string YYYY-MM-DD
 * Gère les formats : nombre Excel, string ISO, valeurs vides
 */
export function convertExcelDate(excelDate: any): string | undefined {
  if (!excelDate) return undefined;

  // Convertir en string pour vérifier
  const strValue = String(excelDate).trim();

  // Ignorer les valeurs vides, "-", "N/A", etc.
  if (
    !strValue ||
    strValue === '-' ||
    strValue.toLowerCase() === 'n/a' ||
    strValue.toLowerCase() === 'na'
  ) {
    return undefined;
  }

  // Si c'est déjà une chaîne de date (YYYY-MM-DD), la retourner
  if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return excelDate;
  }

  // Si c'est un nombre (format Excel)
  if (typeof excelDate === 'number') {
    // Excel stocke les dates comme nombre de jours depuis 1900-01-01
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Si on arrive ici et que ce n'est pas un format valide, retourner undefined
  return undefined;
}
