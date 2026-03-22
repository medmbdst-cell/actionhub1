/**
 * Dashboard du collaborateur
 * Vue d'ensemble de MES actions personnelles
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Target, Users, User } from 'lucide-react';

export default async function CollaborateurDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, equipe_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;

  // Récupérer MES actions (assignées à moi)
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('tenant_id', tenantId!)
    .eq('responsable_id', user.id)
    .order('created_at', { ascending: false });

  // Récupérer mon équipe (si assigné)
  let equipe = null;
  if (profile?.equipe_id) {
    const { data: equipeData } = await supabase
      .from('equipes')
      .select(`
        id,
        nom,
        description,
        responsable:profiles!equipes_responsable_id_fkey(id, nom, prenom, email)
      `)
      .eq('id', profile.equipe_id)
      .eq('tenant_id', tenantId!)
      .single();
    equipe = equipeData;
  }

  // Date du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Début du mois en cours
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Calculer les statistiques
  const stats = {
    total: actions?.length || 0,
    todo: actions?.filter((a) => a.statut === 'todo').length || 0,
    wip: actions?.filter((a) => a.statut === 'wip').length || 0,
    blocked: actions?.filter((a) => a.statut === 'blocked').length || 0,
    done: actions?.filter((a) => a.statut === 'done').length || 0,
    // 🆕 Indicateurs métier
    enRetard: actions?.filter((a) => {
      if (!a.echeance || a.statut === 'done') return false;
      const echeance = new Date(a.echeance);
      return echeance < today;
    }).length || 0,
    faitesDansMois: actions?.filter((a) => {
      if (a.statut !== 'done' || !a.updated_at) return false;
      const updatedAt = new Date(a.updated_at);
      return updatedAt >= startOfMonth;
    }).length || 0,
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes actions</h1>
        <p className="mt-2 text-gray-600">
          Gérez et suivez vos actions personnelles
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">À faire</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">{stats.todo}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">En cours</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.wip}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Bloqué</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{stats.blocked}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Terminé</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.done}</p>
        </div>
      </div>

      {/* 🆕 Indicateurs métier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-lg shadow p-6 ${stats.enRetard > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-white'}`}>
          <p className="text-sm font-medium text-gray-600">⚠️ En retard</p>
          <p className={`mt-2 text-3xl font-bold ${stats.enRetard > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {stats.enRetard}
          </p>
          <p className="mt-1 text-xs text-gray-500">Actions dépassant leur échéance</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">✅ Faites ce mois-ci</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.faitesDansMois}</p>
          <p className="mt-1 text-xs text-gray-500">Actions terminées depuis le {startOfMonth.toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Mon équipe (si assigné) */}
      {equipe && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <Users className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{equipe.nom}</h2>
              {equipe.description && (
                <p className="text-gray-600 mt-1">{equipe.description}</p>
              )}
              {equipe.responsable && (
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>
                    Responsable : {equipe.responsable.prenom} {equipe.responsable.nom}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Mes actions ({stats.total})
          </h2>
        </div>

        {!actions || actions.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune action assignée
            </h3>
            <p className="text-gray-600">
              Les actions qui vous sont assignées apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actions.map((action) => {
                  const badge = getStatutBadge(action.statut);
                  return (
                    <tr key={action.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {action.description}
                        </div>
                        {action.event_description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {action.event_description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {action.echeance
                          ? new Date(action.echeance).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/collaborateur/actions/${action.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
