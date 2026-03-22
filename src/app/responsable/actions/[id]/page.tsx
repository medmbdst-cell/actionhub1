/**
 * Page de détails d'une action (Responsable d'équipe)
 * Affichage complet + formulaire de mise à jour du statut
 */

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ActionStatusForm } from './ActionStatusForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ActionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Récupérer le profil du responsable
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, equipe_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'responsable') {
    redirect('/dashboard');
  }

  // Récupérer l'action avec sécurité : doit appartenir à SON équipe
  const { data: action, error } = await supabase
    .from('actions')
    .select(`
      *,
      responsable:profiles!actions_responsable_id_fkey(id, nom, prenom, email)
    `)
    .eq('id', id)
    .eq('equipe_id', profile.equipe_id!)
    .eq('tenant_id', profile.tenant_id!)
    .maybeSingle();

  if (error || !action) {
    notFound();
  }

  const getStatutBadge = (statut: string) => {
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

  const badge = getStatutBadge(action.statut);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/responsable"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux actions
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {action.description}
            </h1>
            {action.event_description && (
              <p className="text-gray-600 mb-4">{action.event_description}</p>
            )}
          </div>
          <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${badge.style}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Détails */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Responsable
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {action.responsable_txt ||
                    (action.responsable
                      ? `${action.responsable.prenom} ${action.responsable.nom}`
                      : 'Non assigné')}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Échéance
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {action.echeance
                    ? new Date(action.echeance).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Non définie'}
                </dd>
              </div>

              {action.priorite && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Priorité
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {action.priorite}
                  </dd>
                </div>
              )}

              {action.commentaire && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Commentaire</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {action.commentaire}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Source de l'action */}
          {(action.plan_action_nom || action.source_file) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Source</h2>
              <dl className="space-y-4">
                {action.plan_action_nom && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Plan d'action</dt>
                    <dd className="mt-1 text-sm text-gray-900">{action.plan_action_nom}</dd>
                  </div>
                )}
                {action.source_file && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Fichier source</dt>
                    <dd className="mt-1 text-sm text-gray-900">{action.source_file}</dd>
                  </div>
                )}
                {action.source_sheet && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Onglet</dt>
                    <dd className="mt-1 text-sm text-gray-900">{action.source_sheet}</dd>
                  </div>
                )}
                {action.import_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date d'import</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(action.import_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar : Mise à jour du statut */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mettre à jour le statut
            </h2>
            <ActionStatusForm actionId={action.id} currentStatut={action.statut} />
          </div>
        </div>
      </div>
    </div>
  );
}
