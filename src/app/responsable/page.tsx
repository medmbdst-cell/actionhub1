/**
 * Dashboard du responsable d'équipe
 * Vue d'ensemble des actions de l'équipe
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Target, AlertCircle } from 'lucide-react';
import { ActionFilterClient } from './ActionFilterClient';

export default async function ResponsableDashboard() {
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
  const equipeId = profile?.equipe_id;

  // Récupérer toutes les actions de l'équipe
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('tenant_id', tenantId!)
    .eq('equipe_id', equipeId!)
    .order('created_at', { ascending: false });

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
        <h1 className="text-3xl font-bold text-gray-900">Actions de l'équipe</h1>
        <p className="mt-2 text-gray-600">
          Gérez et suivez les actions de votre équipe
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
          <p className="text-sm font-medium text-gray-600">⚠️ En retard (équipe)</p>
          <p className={`mt-2 text-3xl font-bold ${stats.enRetard > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {stats.enRetard}
          </p>
          <p className="mt-1 text-xs text-gray-500">Actions de l'équipe dépassant leur échéance</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">✅ Faites ce mois-ci (équipe)</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.faitesDansMois}</p>
          <p className="mt-1 text-xs text-gray-500">Actions de l'équipe terminées depuis le {startOfMonth.toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Actions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Liste des actions ({stats.total})
          </h2>
        </div>

        {!actions || actions.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune action assignée
            </h3>
            <p className="text-gray-600">
              Les actions assignées à votre équipe apparaîtront ici
            </p>
          </div>
        ) : (
          <ActionFilterClient actions={actions} getStatutBadge={getStatutBadge} />
        )}
      </div>
    </div>
  );
}
