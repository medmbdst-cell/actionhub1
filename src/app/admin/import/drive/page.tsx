'use client';

import { useEffect, useState } from 'react';
import { checkDriveConnection, listDriveFiles, type DriveFile } from '@/app/actions/drive';
import { parseDriveFileToPreview, importFromDrive } from '@/app/actions/drive-import';
import { detectColumnMapping, type ColumnMapping } from '@/lib/import/mappingUtils';
import type { ParsedExcelData } from '@/lib/import/excelParser';
import { FileSpreadsheet, Link as LinkIcon, Calendar, HardDrive, Loader2, AlertCircle, Check, ArrowLeft, CheckCircle } from 'lucide-react';

type ImportStep = 'file-list' | 'sheet-select' | 'preview' | 'mapping' | 'importing' | 'complete';

/**
 * Page : Import depuis Google Drive
 * Permet de :
 * - Connecter son compte Google Drive
 * - Lister les fichiers Excel disponibles
 * - Importer un fichier dans ActionHub
 */
export default function ImportDrivePage() {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    email?: string;
    connectedAt?: string;
    lastSync?: string;
  } | null>(null);

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Import flow state
  const [step, setStep] = useState<ImportStep>('file-list');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [sheets, setSheets] = useState<Map<string, ParsedExcelData>>(new Map());
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<ParsedExcelData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [planName, setPlanName] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    planId: string;
    planName: string;
    actionsCount: number;
  } | null>(null);

  // Charger le statut de connexion au montage
  useEffect(() => {
    loadConnectionStatus();
  }, []);

  async function loadConnectionStatus() {
    setLoading(true);
    setError(null);

    const result = await checkDriveConnection();

    if (result.success && result.connected && result.connection) {
      setConnectionStatus({
        connected: true,
        email: result.connection.email,
        connectedAt: result.connection.connectedAt,
        lastSync: result.connection.lastSync,
      });

      // Si connecté, charger les fichiers
      await loadDriveFiles();
    } else {
      setConnectionStatus({ connected: false });
      setLoading(false);
    }
  }

  async function loadDriveFiles() {
    setLoading(true);
    setError(null);

    const result = await listDriveFiles();

    if (result.success && result.files) {
      setFiles(result.files);
    } else {
      setError(result.error || 'Erreur lors du chargement des fichiers');
    }

    setLoading(false);
  }

  function handleConnectDrive() {
    // Rediriger vers l'endpoint OAuth
    window.location.href = '/api/auth/google/authorize';
  }

  async function handleDisconnect() {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter Google Drive ? Tous les syncs automatiques seront désactivés.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Google Drive déconnecté avec succès');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error || 'Erreur lors de la déconnexion');
      }
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function formatFileSize(bytes?: string) {
    if (!bytes) return 'N/A';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ============================================================
  // Import Flow Handlers
  // ============================================================

  async function handleStartImport(file: DriveFile) {
    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const result = await parseDriveFileToPreview(file.id);

      if (!result.success || !result.sheets) {
        setError(result.error || 'Erreur lors du parsing');
        setLoading(false);
        return;
      }

      setSheets(result.sheets);

      // Si une seule feuille, la sélectionner automatiquement
      if (result.sheets.size === 1) {
        const [sheetName, data] = Array.from(result.sheets.entries())[0];
        setSelectedSheet(sheetName);
        setSheetData(data);

        // Détecter automatiquement le mapping
        const detectedMapping = detectColumnMapping(data.columns);
        setMapping(detectedMapping);

        setStep('preview');
      } else {
        setStep('sheet-select');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du parsing');
    } finally {
      setLoading(false);
    }
  }

  function handleSheetSelect() {
    if (!selectedSheet) {
      setError('Veuillez sélectionner une feuille');
      return;
    }

    const data = sheets.get(selectedSheet);
    if (!data) {
      setError('Feuille introuvable');
      return;
    }

    setSheetData(data);

    // Détecter automatiquement le mapping
    const detectedMapping = detectColumnMapping(data.columns);
    setMapping(detectedMapping);

    setStep('preview');
  }

  function handleBackToFiles() {
    setStep('file-list');
    setSelectedFile(null);
    setSheets(new Map());
    setSelectedSheet('');
    setSheetData(null);
    setMapping({});
    setPlanName('');
    setAutoSync(false);
    setError(null);
  }

  function handleMapping(field: keyof ColumnMapping, column: string) {
    setMapping((prev) => ({ ...prev, [field]: column }));
  }

  async function handleImport() {
    if (!planName.trim()) {
      setError('Veuillez donner un nom au plan d\'action');
      return;
    }

    if (!mapping.description) {
      setError('La colonne "Description" est obligatoire');
      return;
    }

    if (!selectedFile || !selectedSheet) {
      setError('Fichier ou feuille non sélectionné');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('importing');

    try {
      const result = await importFromDrive({
        fileId: selectedFile.id,
        sheetName: selectedSheet,
        mapping,
        planName: planName.trim(),
        autoSync,
      });

      if (result.success && result.data) {
        setImportResult(result.data);
        setSuccess(`Import réussi ! ${result.data.actionsCount} action(s) importée(s).`);
        setStep('complete');
      } else {
        setError(result.error || 'Erreur lors de l\'import');
        setStep('mapping');
      }
    } catch (err: any) {
      console.error('Erreur import:', err);
      setError(err.message || 'Erreur lors de l\'import');
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Import depuis Google Drive</h1>
          <p className="text-gray-600">
            Importez vos plans d'action directement depuis vos fichiers Excel stockés sur Google Drive
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Erreur</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Succès</p>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Connection Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <HardDrive className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Connexion Google Drive</h2>
                {loading && !connectionStatus ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Vérification...</span>
                  </div>
                ) : connectionStatus?.connected ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Check size={16} />
                      <span>Connecté</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Compte : <span className="font-medium">{connectionStatus.email}</span>
                    </p>
                    {connectionStatus.connectedAt && (
                      <p className="text-xs text-gray-500">
                        Connecté le {formatDate(connectionStatus.connectedAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">Connectez votre compte Google pour accéder à vos fichiers</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {connectionStatus?.connected ? (
                <>
                  <button
                    onClick={loadDriveFiles}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={16} />
                        Actualiser
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Déconnecter
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectDrive}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <LinkIcon size={16} />
                  Connecter Google Drive
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Files List */}
        {connectionStatus?.connected && step === 'file-list' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Fichiers Excel disponibles</h2>
              <p className="text-sm text-gray-600 mt-1">
                {files.length} fichier{files.length > 1 ? 's' : ''} trouvé{files.length > 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={32} />
                <p className="text-gray-600">Chargement des fichiers...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-600 font-medium mb-1">Aucun fichier Excel trouvé</p>
                <p className="text-sm text-gray-500">
                  Assurez-vous d'avoir des fichiers .xlsx ou .xls dans votre Google Drive
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <FileSpreadsheet className="text-green-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{file.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            Modifié le {formatDate(file.modifiedTime)}
                          </span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Ouvrir
                        </a>
                      )}
                      <button
                        onClick={() => handleStartImport(file)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Importer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Sheet Selection */}
        {step === 'sheet-select' && selectedFile && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleBackToFiles}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
              >
                <ArrowLeft size={20} />
                Retour aux fichiers
              </button>

              <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
                Sélectionner une feuille
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Le fichier "{selectedFile.name}" contient {sheets.size} feuille(s). Sélectionnez celle qui contient vos actions.
              </p>

              <div className="space-y-3">
                {Array.from(sheets.keys()).map((sheetName) => (
                  <label
                    key={sheetName}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedSheet === sheetName
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sheet"
                      value={sheetName}
                      checked={selectedSheet === sheetName}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-900 font-medium">{sheetName}</span>
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleBackToFiles}
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
        {step === 'preview' && sheetData && selectedFile && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Prévisualisation
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Fichier : {selectedFile.name} · Feuille : {selectedSheet}
                  </p>
                  <p className="text-sm text-gray-600">
                    {sheetData.rows.length} ligne(s) · {sheetData.columns.length} colonne(s)
                  </p>
                </div>
                <button
                  onClick={handleBackToFiles}
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
                    {sheetData.columns.map((col) => (
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
                  {sheetData.rows.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {sheetData.columns.map((col) => (
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
              {sheetData.rows.length > 10 && (
                <p className="text-sm text-gray-500 text-center mt-4">
                  ... et {sheetData.rows.length - 10} autre(s) ligne(s)
                </p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={handleBackToFiles}
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
        {step === 'mapping' && sheetData && selectedFile && (
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
                    {sheetData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Event Description */}
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
                    {sheetData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
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
                    {sheetData.columns.map((col) => (
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
                    {sheetData.columns.map((col) => (
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
                    {sheetData.columns.map((col) => (
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
                    {sheetData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Valeurs acceptées: haute, moyen, faible
                  </p>
                </div>

                {/* Commentaire */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire
                  </label>
                  <select
                    value={mapping.commentaire || ''}
                    onChange={(e) => handleMapping('commentaire', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">-- Optionnel --</option>
                    {sheetData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto-Sync Checkbox */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-blue-900">
                      Activer la synchronisation automatique
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Le plan sera automatiquement mis à jour quand le fichier Google Drive change (vérification toutes les heures)
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview mapped data */}
              {mapping.description && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Aperçu du mapping
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• {sheetData.rows.length} ligne(s) seront importées</p>
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
                disabled={!mapping.description || !planName.trim() || loading}
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
            <Loader2 className="animate-spin rounded-full h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Import en cours...
            </h2>
            <p className="text-gray-600">
              Téléchargement depuis Drive et import des données en cours
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
              {autoSync && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Synchronisation automatique activée
                </p>
              )}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBackToFiles}
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
    </div>
  );
}
