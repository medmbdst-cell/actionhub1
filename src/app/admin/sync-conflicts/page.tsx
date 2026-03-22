/**
 * Page de gestion des conflits de synchronisation Google Drive
 * Affiche les conflits détectés et résolus automatiquement (Phase 3)
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, ArrowRight, Info } from 'lucide-react';

export default async function SyncConflictsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;

  // Récupérer les conflits actifs (normalement vide en Phase 3 car auto-résolution)
  const { data: activeConflicts } = await supabase
    .from('v_active_sync_conflicts')
    .select('*')
    .eq('tenant_id', tenantId!);

  // Récupérer les derniers conflits résolus (7 derniers jours)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: resolvedConflicts } = await supabase
    .from('sync_conflicts')
    .select(`
      *,
      action:actions!inner(description, statut),
      synced_file:google_drive_synced_files!inner(drive_file_name)
    `)
    .eq('tenant_id', tenantId!)
    .not('resolved_at', 'is', null)
    .gte('resolved_at', sevenDaysAgo)
    .order('resolved_at', { ascending: false })
    .limit(50);

  const conflictsCount = resolvedConflicts?.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conflits de Synchronisation</h1>
        <p className="text-gray-600 mt-2">
          Historique des conflits détectés et résolus automatiquement lors des synchronisations
        </p>
      </div>

      {/* Conflits actifs (Phase 3: tous auto-résolus) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">Conflits Actifs</h2>
        </div>

        {!activeConflicts || activeConflicts.length === 0 ? (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium flex items-center gap-2">
              <CheckCircle size={18} />
              Aucun conflit actif
            </p>
            <p className="text-sm text-green-700 mt-1">
              Tous les conflits sont résolus automatiquement selon les règles de merge.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {activeConflicts.length} conflit(s) en attente de résolution manuelle.
          </p>
        )}
      </div>

      {/* Historique des conflits résolus */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Historique (7 derniers jours)
            </h2>
          </div>
          <span className="text-sm text-gray-500">
            {conflictsCount} conflit{conflictsCount > 1 ? 's' : ''} résolu{conflictsCount > 1 ? 's' : ''}
          </span>
        </div>

        {!resolvedConflicts || resolvedConflicts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Aucun conflit résolu récemment.</p>
            <p className="text-sm text-gray-500 mt-1">
              Les conflits apparaîtront ici lorsqu'une action sera modifiée à la fois dans Drive et localement.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedConflicts.map((conflict: any) => {
              const strategyColor = conflict.resolution_strategy === 'drive_wins'
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-green-100 text-green-800 border-green-200';

              const strategyLabel = conflict.resolution_strategy === 'drive_wins'
                ? 'Drive prioritaire'
                : 'Local prioritaire';

              return (
                <div
                  key={conflict.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Action description */}
                      <p className="font-medium text-sm text-gray-900 mb-1">
                        {conflict.action.description}
                      </p>

                      {/* File name */}
                      <p className="text-xs text-gray-500 mb-3">
                        Fichier: {conflict.synced_file.drive_file_name}
                      </p>

                      {/* Conflict details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Champ</p>
                          <p className="text-sm text-gray-900">{conflict.field_name}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Valeur Drive</p>
                          <p className="text-sm text-gray-600 font-mono">
                            {conflict.drive_value || '(vide)'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Valeur Locale</p>
                          <p className="text-sm text-gray-600 font-mono">
                            {conflict.local_value || '(vide)'}
                          </p>
                        </div>
                      </div>

                      {/* Resolution */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${strategyColor}`}>
                          {strategyLabel}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <ArrowRight size={14} />
                          <span>Valeur finale:</span>
                          <span className="font-mono font-medium text-gray-900">
                            {conflict.resolved_value || '(vide)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-gray-400 ml-4">
                      {new Date(conflict.resolved_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Documentation des règles */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Règles de Résolution Automatique (Phase 3)
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div>
                <strong className="text-blue-900">Drive prioritaire :</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Description, Contexte/Événement</li>
                  <li>Responsable</li>
                  <li>Échéance</li>
                  <li>Priorité</li>
                </ul>
                <p className="text-xs text-blue-700 mt-1 ml-4">
                  Ces champs définissent la structure du plan et sont rarement modifiés manuellement
                </p>
              </div>

              <div className="pt-2">
                <strong className="text-blue-900">Local prioritaire :</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Statut (avancement)</li>
                  <li>Commentaire</li>
                </ul>
                <p className="text-xs text-blue-700 mt-1 ml-4">
                  Ces champs reflètent le travail quotidien et sont mis à jour régulièrement par les utilisateurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center gap-4">
        <Link
          href="/admin/sync-status"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Retour aux synchronisations
        </Link>
      </div>
    </div>
  );
}
