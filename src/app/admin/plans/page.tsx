'use client';

/**
 * Page de gestion des plans d'action
 * Permet de voir tous les plans et de les supprimer
 */

import { useEffect, useState } from 'react';
import { getPlans, deletePlanById } from '@/app/actions/plans';
import { Layers, Trash2, Loader2, AlertCircle, Check, FileSpreadsheet, HardDrive, Calendar } from 'lucide-react';

interface Plan {
  id: string;
  nom: string;
  source_type: string;
  google_drive_file_id: string | null;
  auto_sync: boolean;
  actif: boolean;
  created_at: string;
  actionsCount: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    const result = await getPlans();
    if (result.success && result.plans) {
      setPlans(result.plans);
    } else {
      setError(result.error || 'Erreur chargement');
    }
    setLoading(false);
  }

  async function handleDelete(planId: string, planName: string, actionsCount: number) {
    const confirmed = confirm(
      `Supprimer le plan "${planName}" ?\n\n` +
      `${actionsCount} action(s) seront supprimées définitivement.\n\n` +
      `Cette action est irréversible.`
    );

    if (!confirmed) return;

    setDeleting(planId);
    setError(null);
    setSuccess(null);

    const result = await deletePlanById(planId);

    if (result.success) {
      setSuccess(result.message || 'Plan supprimé');
      setPlans(prev => prev.filter(p => p.id !== planId));
    } else {
      setError(result.error || 'Erreur suppression');
    }

    setDeleting(null);
  }

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  }

  const totalActions = plans.reduce((acc, p) => acc + p.actionsCount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Plans</h1>
        <p className="mt-2 text-gray-600">
          {plans.length} plan(s) - {totalActions} action(s) au total
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 ml-auto">✕</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={32} />
          <p className="text-gray-600">Chargement des plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Layers className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-600 font-medium">Aucun plan d'action</p>
          <p className="text-sm text-gray-500 mt-1">
            Importez des actions depuis Excel ou Google Drive
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-2.5 rounded-lg ${plan.google_drive_file_id ? 'bg-blue-50' : 'bg-green-50'}`}>
                  {plan.google_drive_file_id ? (
                    <HardDrive className="text-blue-600" size={20} />
                  ) : (
                    <FileSpreadsheet className="text-green-600" size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{plan.nom}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">
                      {plan.actionsCount} action{plan.actionsCount > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(plan.created_at)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.google_drive_file_id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.google_drive_file_id ? 'Google Drive' : 'Excel Upload'}
                    </span>
                    {plan.auto_sync && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Auto-sync
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(plan.id, plan.nom, plan.actionsCount)}
                disabled={deleting === plan.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium ml-4"
                title="Supprimer le plan et toutes ses actions"
              >
                {deleting === plan.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
