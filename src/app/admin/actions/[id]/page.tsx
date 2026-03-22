'use client';

/**
 * Page de détail et édition d'une action
 * Permet de modifier le statut et le commentaire (champs local_wins)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAction } from '@/app/actions/update-action';
import { ArrowLeft, Save, Loader2, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';

interface Action {
  id: string;
  description: string;
  event_description?: string;
  responsable_txt?: string;
  echeance?: string;
  statut: string;
  priorite?: string;
  commentaire?: string;
  plan?: {
    nom: string;
    source_type: string;
    auto_sync: boolean;
  };
}

export default function ActionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    statut: '',
    commentaire: '',
  });

  useEffect(() => {
    loadAction();
  }, [params.id]);

  async function loadAction() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setAction(data.action);
        setFormData({
          statut: data.action.statut || '',
          commentaire: data.action.commentaire || '',
        });
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateAction({
        id: params.id,
        statut: formData.statut,
        commentaire: formData.commentaire,
      });

      if (result.success) {
        setSuccess('Action mise à jour avec succès');
        setTimeout(() => {
          router.push('/admin/actions');
        }, 1500);
      } else {
        setError(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  const getStatutBadge = (statut: string) => {
    if (statut && statut.includes('%')) {
      const percentage = parseInt(statut);
      if (percentage === 0) return { style: 'bg-gray-100 text-gray-800', label: 'À faire' };
      if (percentage === 100) return { style: 'bg-green-100 text-green-800', label: '100%' };
      let style = 'bg-blue-100 text-blue-800';
      if (percentage >= 70) style = 'bg-blue-200 text-blue-900';
      return { style, label: `${percentage}%` };
    }

    const styles = {
      todo: 'bg-gray-100 text-gray-800',
      wip: 'bg-blue-100 text-blue-800',
      blocked: 'bg-orange-100 text-orange-800',
      done: 'bg-green-100 text-green-800',
    };
    const labels = {
      todo: 'À faire',
      wip: 'En cours',
      blocked: 'Bloqué',
      done: 'Terminé',
    };
    return {
      style: styles[statut as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[statut as keyof typeof labels] || statut,
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Action non trouvée</h2>
            <p className="text-red-700 mb-4">{error || 'Cette action n\'existe pas ou vous n\'avez pas accès.'}</p>
            <Link
              href="/admin/actions"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <ArrowLeft className="mr-2" size={16} />
              Retour aux actions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badge = getStatutBadge(action.statut);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin/actions"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="mr-2" size={16} />
              Retour aux actions
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Détails de l'action</h1>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${badge.style}`}>
            {badge.label}
          </span>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Erreur</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
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

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations en lecture seule */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informations (gérées par Google Drive)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Ces champs sont synchronisés depuis Google Drive et ne peuvent pas être modifiés ici
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {action.description}
                </p>
              </div>

              {action.event_description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contexte / Événement
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {action.event_description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {action.responsable_txt || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Échéance
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {action.echeance
                      ? new Date(action.echeance).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 capitalize">
                    {action.priorite || '-'}
                  </p>
                </div>
              </div>

              {action.plan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan d'action
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 flex-1">
                      {action.plan.nom}
                    </p>
                    {action.plan.auto_sync && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Auto-sync
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Champs modifiables */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Modifications locales (préservées lors de la sync)
            </h2>
            <p className="text-xs text-green-600 mb-4 flex items-center gap-1">
              <Check size={14} />
              Ces modifications seront conservées même si le fichier Drive change
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todo">À faire</option>
                  <option value="0%">0%</option>
                  <option value="10%">10%</option>
                  <option value="20%">20%</option>
                  <option value="30%">30%</option>
                  <option value="40%">40%</option>
                  <option value="50%">50%</option>
                  <option value="60%">60%</option>
                  <option value="70%">70%</option>
                  <option value="80%">80%</option>
                  <option value="90%">90%</option>
                  <option value="100%">100%</option>
                  <option value="wip">En cours</option>
                  <option value="blocked">Bloqué</option>
                  <option value="done">Terminé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire
                </label>
                <textarea
                  value={formData.commentaire}
                  onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                  rows={4}
                  placeholder="Ajoutez vos notes et commentaires ici..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/admin/actions"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
