'use client';

/**
 * Page d'import Excel des actions
 * Permet aux admins d'importer des actions depuis un fichier Excel
 */

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importActions } from '@/app/actions/import';

type ImportStep = 'upload' | 'sheet-select' | 'preview' | 'mapping' | 'importing' | 'complete';
type ActionStatut = 'todo' | 'wip' | 'blocked' | 'done';
type ActionPriorite = 'haute' | 'moyen' | 'faible';

interface ExcelRow {
  [key: string]: string | number | null;
}

interface ColumnMapping {
  description?: string;
  event_description?: string;
  responsable_txt?: string;
  echeance?: string;
  statut?: string;
  priorite?: string;
  commentaire?: string;
}

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [data, setData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [planName, setPlanName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    planId: string;
    planName: string;
    actionsCount: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Vérifier le type de fichier
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setError(null);
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // Si une seule feuille, l'utiliser directement
      if (wb.SheetNames.length === 1) {
        setSelectedSheet(wb.SheetNames[0]);
        loadSheetData(wb, wb.SheetNames[0]);
      } else {
        // Sinon, demander à l'utilisateur de choisir
        setStep('sheet-select');
      }
    } catch (err) {
      setError('Erreur lors de la lecture du fichier Excel');
      console.error(err);
    }
  };

  const loadSheetData = (wb: any, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];

      // Convertir en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) {
        setError('La feuille sélectionnée est vide');
        return;
      }

      // Extraire les colonnes (première ligne)
      const headers = jsonData[0].map((h) => String(h || ''));
      setColumns(headers);

      // Extraire les données (reste des lignes)
      const rows = jsonData.slice(1).map((row) => {
        const obj: ExcelRow = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] ?? null;
        });
        return obj;
      });

      setData(rows.filter((row) => Object.values(row).some((v) => v !== null && v !== '')));
      setStep('preview');
    } catch (err) {
      setError('Erreur lors de la lecture de la feuille');
      console.error(err);
    }
  };

  const handleSheetSelect = () => {
    if (!selectedSheet || !workbook) {
      setError('Veuillez sélectionner une feuille');
      return;
    }
    loadSheetData(workbook, selectedSheet);
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setData([]);
    setColumns([]);
    setError(null);
    setMapping({});
    setPlanName('');
    setImportResult(null);
  };

  const handleMapping = (field: keyof ColumnMapping, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const convertExcelDate = (excelDate: any): string | undefined => {
    if (!excelDate) return undefined;

    // Convertir en string pour vérifier
    const strValue = String(excelDate).trim();

    // Ignorer les valeurs vides, "-", "N/A", etc.
    if (!strValue || strValue === '-' || strValue.toLowerCase() === 'n/a' || strValue.toLowerCase() === 'na') {
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
  };

  const normalizeStatut = (value: any): ActionStatut => {
    if (!value) return 'todo';

    const str = String(value).toLowerCase().trim();

    // Mapping des valeurs possibles
    const statusMap: Record<string, ActionStatut> = {
      '1': 'todo',
      '2': 'wip',
      '3': 'blocked',
      '4': 'done',
      'todo': 'todo',
      'à faire': 'todo',
      'wip': 'wip',
      'en cours': 'wip',
      'encours': 'wip',
      'avancement': 'wip',
      'blocked': 'blocked',
      'bloqué': 'blocked',
      'bloquee': 'blocked',
      'done': 'done',
      'terminé': 'done',
      'termine': 'done',
      'fait': 'done',
    };

    return statusMap[str] || 'todo';
  };

  const normalizePriorite = (value: any): ActionPriorite | undefined => {
    if (!value) return undefined;

    const str = String(value).toLowerCase().trim();

    // Mapping des valeurs possibles
    const priorityMap: Record<string, ActionPriorite> = {
      '1': 'haute',
      '2': 'moyen',
      '3': 'faible',
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
  };

  const handleImport = async () => {
    if (!planName.trim()) {
      setError('Veuillez donner un nom au plan d\'action');
      return;
    }

    if (!mapping.description) {
      setError('La colonne "Description" est obligatoire');
      return;
    }

    setIsImporting(true);
    setError(null);
    setStep('importing');

    try {
      // Mapper les données selon le mapping défini
      const actions = data.map((row) => ({
        description: String(row[mapping.description!] || ''),
        event_description: mapping.event_description ? String(row[mapping.event_description] || '') : undefined,
        responsable_txt: mapping.responsable_txt ? String(row[mapping.responsable_txt] || '') : undefined,
        echeance: mapping.echeance ? convertExcelDate(row[mapping.echeance]) : undefined,
        statut: mapping.statut ? normalizeStatut(row[mapping.statut]) : 'todo',
        priorite: mapping.priorite ? normalizePriorite(row[mapping.priorite]) : undefined,
        commentaire: mapping.commentaire ? String(row[mapping.commentaire] || '') : undefined,
      })).filter(action => action.description.trim() !== '');

      const result = await importActions({
        planName: planName.trim(),
        actions,
        sourceFile: file?.name || 'unknown.xlsx',
        sourceSheet: selectedSheet || 'Sheet1',
      });

      if (result.success && result.data) {
        setImportResult(result.data);
        setStep('complete');
      } else {
        setError(result.error || 'Erreur lors de l\'import');
        setStep('mapping');
      }
    } catch (err) {
      console.error('Erreur import:', err);
      setError('Erreur lors de l\'import');
      setStep('mapping');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Excel</h1>
        <p className="mt-2 text-gray-600">
          Importez vos actions depuis un fichier Excel
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          {[
            { id: 'upload', label: '1. Upload' },
            { id: 'sheet-select', label: '2. Feuille' },
            { id: 'preview', label: '3. Prévisualisation' },
            { id: 'mapping', label: '4. Mapping' },
            { id: 'complete', label: '5. Terminé' },
          ].map((s, index) => {
            const isActive = step === s.id || (s.id === 'sheet-select' && step === 'preview' && sheetNames.length === 1);
            const isCompleted =
              (s.id === 'upload' && (step === 'sheet-select' || step === 'preview' || step === 'mapping' || step === 'complete' || step === 'importing')) ||
              (s.id === 'sheet-select' && (step === 'preview' || step === 'mapping' || step === 'complete' || step === 'importing')) ||
              (s.id === 'preview' && (step === 'mapping' || step === 'complete' || step === 'importing')) ||
              (s.id === 'mapping' && (step === 'complete' || step === 'importing'));

            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 whitespace-nowrap">
                  {s.label}
                </span>
                {index < 4 && (
                  <div className="w-12 h-0.5 bg-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Sélectionnez un fichier Excel
            </h2>
            <p className="text-gray-600 mb-8">
              Formats acceptés: .xlsx, .xls
            </p>

            <div className="max-w-md mx-auto">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Cliquez pour sélectionner un fichier'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  ou glissez-déposez un fichier ici
                </span>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <button
                  onClick={handleUpload}
                  className="mt-6 w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Analyser le fichier
                </button>
              )}
            </div>

            {/* Template Download */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Vous n'avez pas de fichier Excel ?
              </p>
              <a
                href="/template-import-actions.xlsx"
                download
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle Excel
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Sheet Selection */}
      {step === 'sheet-select' && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="max-w-2xl mx-auto">
            <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
              Sélectionner une feuille
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Votre fichier contient {sheetNames.length} feuille(s). Sélectionnez celle qui contient vos actions.
            </p>

            <div className="space-y-3">
              {sheetNames.map((name) => (
                <label
                  key={name}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedSheet === name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sheet"
                    value={name}
                    checked={selectedSheet === name}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-900 font-medium">{name}</span>
                </label>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={resetImport}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSheetSelect}
                disabled={!selectedSheet}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Prévisualisation
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {data.length} ligne(s) détectée(s) · {columns.length} colonne(s)
                </p>
              </div>
              <button
                onClick={resetImport}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Changer de fichier
              </button>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                ... et {data.length - 10} autre(s) ligne(s)
              </p>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={resetImport}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={() => setStep('mapping')}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Mapping */}
      {step === 'mapping' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Mapping des colonnes
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Associez les colonnes de votre fichier aux champs du système
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Plan Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du plan d'action <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Plan d'action Q2 2026"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Column Mapping */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Description (required) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.description || ''}
                    onChange={(e) => handleMapping('description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Sélectionner une colonne --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Description de l'événement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description de l'événement
                  </label>
                  <select
                    value={mapping.event_description || ''}
                    onChange={(e) => handleMapping('event_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Contexte ou justification de l'action
                  </p>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable
                  </label>
                  <select
                    value={mapping.responsable_txt || ''}
                    onChange={(e) => handleMapping('responsable_txt', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Échéance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Échéance
                  </label>
                  <select
                    value={mapping.echeance || ''}
                    onChange={(e) => handleMapping('echeance', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={mapping.statut || ''}
                    onChange={(e) => handleMapping('statut', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Valeurs acceptées: todo, wip, blocked, done
                  </p>
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité
                  </label>
                  <select
                    value={mapping.priorite || ''}
                    onChange={(e) => handleMapping('priorite', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Valeurs acceptées: haute, moyen, faible
                  </p>
                </div>

                {/* Commentaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire
                  </label>
                  <select
                    value={mapping.commentaire || ''}
                    onChange={(e) => handleMapping('commentaire', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview mapped data */}
            {mapping.description && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Aperçu du mapping
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• {data.length} ligne(s) seront importées</p>
                  <p>• Description: {mapping.description}</p>
                  {mapping.event_description && <p>• Description de l'événement: {mapping.event_description}</p>}
                  {mapping.responsable_txt && <p>• Responsable: {mapping.responsable_txt}</p>}
                  {mapping.echeance && <p>• Échéance: {mapping.echeance}</p>}
                  {mapping.statut && <p>• Statut: {mapping.statut}</p>}
                  {mapping.priorite && <p>• Priorité: {mapping.priorite}</p>}
                  {mapping.commentaire && <p>• Commentaire: {mapping.commentaire}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setStep('preview')}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Retour
            </button>
            <button
              onClick={handleImport}
              disabled={!mapping.description || !planName.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Lancer l'import
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Import en cours...
          </h2>
          <p className="text-gray-600">
            Veuillez patienter pendant l'import des données
          </p>
        </div>
      )}

      {/* Step 6: Complete */}
      {step === 'complete' && importResult && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Import réussi !
          </h2>
          <div className="text-gray-600 space-y-2 mb-6">
            <p>Le plan "{importResult.planName}" a été créé avec succès</p>
            <p className="text-lg font-medium text-blue-600">
              {importResult.actionsCount} action(s) importée(s)
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetImport}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Nouvel import
            </button>
            <a
              href="/admin/actions"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Voir les actions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
