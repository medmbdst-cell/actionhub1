'use client';

/**
 * Page de gestion des synchronisations Google Drive
 * Permet de voir les fichiers synchronisés et de gérer les syncs
 */

import { useEffect, useState } from 'react';
import { getSyncedFiles, syncFile, toggleSync, changeSyncMode, deletePlan } from '@/app/actions/drive-sync';
import { RefreshCw, Check, X, Loader2, AlertCircle, Clock, FileSpreadsheet, Sparkles, Trash2 } from 'lucide-react';

interface SyncedFile {
  id: string;
  drive_file_name: string;
  drive_file_id: string;
  sync_enabled: boolean;
  sync_mode: 'full_replace' | 'incremental';
  last_synced_at: string;
  drive_modified_time: string;
  sheet_name: string;
  plan: {
    id: string;
    nom: string;
  };
}

export default function SyncStatusPage() {
  const [files, setFiles] = useState<SyncedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    setError(null);

    try {
      // Note: getSyncedFiles nécessite le tenantId, mais on va le récupérer côté serveur
      // Pour simplifier, on va créer une version qui récupère automatiquement le tenant
      const response = await fetch('/api/sync-status');
      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(fileId: string) {
    setSyncing(fileId);
    setError(null);
    setSuccess(null);

    try {
      const result = await syncFile(fileId);

      if (result.success) {
        setSuccess(result.message || 'Synchronisation réussie');
        await loadFiles(); // Recharger la liste
      } else {
        setError(result.error || 'Erreur lors de la synchronisation');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(null);
    }
  }

  async function handleToggle(fileId: string, currentState: boolean) {
    setError(null);
    setSuccess(null);

    try {
      const result = await toggleSync(fileId, !currentState);

      if (result.success) {
        setSuccess(result.message);
        await loadFiles();
      } else {
        setError(result.error || 'Erreur');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  }

  async function handleChangeSyncMode(fileId: string, newMode: 'full_replace' | 'incremental') {
    setError(null);
    setSuccess(null);

    try {
      const result = await changeSyncMode(fileId, newMode);

      if (result.success) {
        setSuccess(result.message);
        await loadFiles();
      } else {
        setError(result.error || 'Erreur');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  }

  async function handleDelete(fileId: string, planName: string) {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer le plan "${planName}" ?\n\nCette action supprimera :\n- Le plan d'action\n- Toutes les actions associées\n- La configuration de synchronisation\n\nCette action est IRRÉVERSIBLE.`
    );

    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await deletePlan(fileId);

      if (result.success) {
        setSuccess(result.message);
        await loadFiles();
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
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

  function getTimeSince(dateString: string) {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `il y a ${diffDays} jour(s)`;
    if (diffHours > 0) return `il y a ${diffHours} heure(s)`;
    if (diffMins > 0) return `il y a ${diffMins} minute(s)`;
    return `à l'instant`;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Synchronisations Google Drive</h1>
          <p className="text-gray-600 mt-2">
            Gérez les fichiers synchronisés automatiquement depuis Google Drive
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
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fichiers synchronisés</h2>
              <p className="text-sm text-gray-600 mt-1">
                {files.length} fichier{files.length > 1 ? 's' : ''} configuré{files.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={loadFiles}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              Actualiser
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={32} />
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-600 font-medium mb-1">Aucun fichier synchronisé</p>
              <p className="text-sm text-gray-500">
                Importez un fichier depuis Google Drive avec l'option "Auto-sync" activée
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {file.plan.nom}
                        </h3>
                        {file.sync_enabled ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                            Actif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                            Désactivé
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        Fichier : <span className="font-medium">{file.drive_file_name}</span>
                        {file.sheet_name && (
                          <> · Feuille : <span className="font-medium">{file.sheet_name}</span></>
                        )}
                      </p>

                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 block mb-1">
                          Mode de synchronisation
                        </label>
                        <select
                          value={file.sync_mode || 'full_replace'}
                          onChange={(e) => handleChangeSyncMode(file.id, e.target.value as any)}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="full_replace">Remplacement Complet (Phase 2)</option>
                          <option value="incremental">
                            Incrémental (Phase 3) ✨ - Recommandé
                          </option>
                        </select>
                        {file.sync_mode === 'incremental' && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Sparkles size={12} />
                            Préserve les modifications manuelles
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Dernier sync : {formatDate(file.last_synced_at)} ({getTimeSince(file.last_synced_at)})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(file.id)}
                        disabled={syncing === file.id || !file.sync_enabled}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      >
                        {syncing === file.id ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Sync...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Sync Now
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggle(file.id, file.sync_enabled)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          file.sync_enabled
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {file.sync_enabled ? (
                          <>
                            <X size={16} className="inline mr-1" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <Check size={16} className="inline mr-1" />
                            Activer
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(file.id, file.plan.nom)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                        title="Supprimer le plan et toutes ses actions"
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Information :</strong> La synchronisation automatique vérifie toutes les heures
            si les fichiers Google Drive ont changé. Si oui, les actions sont automatiquement mises à jour.
          </p>
        </div>
      </div>
    </div>
  );
}
