/**
 * Page Analytics dédiée
 * Graphiques et statistiques détaillées sur les actions
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, TrendingDown, Calendar, Users } from 'lucide-react';
import ActionStatusPieChart from '@/components/charts/ActionStatusPieChart';
import ActionPriorityBarChart from '@/components/charts/ActionPriorityBarChart';
import {
  calculateGlobalStats,
  calculateStatusDistribution,
  calculatePriorityDistribution,
  isActionLate,
  isActionCompleted,
} from '@/lib/analytics/kpis';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Récupérer le tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(nom)')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;

  // Récupérer TOUTES les actions avec détails
  const { data: allActions } = await supabase
    .from('actions')
    .select(`
      id,
      statut,
      echeance,
      created_at,
      priorite,
      plan:plans_action!inner(id, nom)
    `)
    .eq('tenant_id', tenantId!);

  // Calculer les KPIs
  const kpis = calculateGlobalStats(allActions || []);
  const statusData = calculateStatusDistribution(allActions || []);
  const priorityData = calculatePriorityDistribution(allActions || []);

  // Actions en retard
  const lateActions = (allActions || []).filter(a => isActionLate(a));

  // Répartition par plan
  const planDistribution = (allActions || []).reduce((acc, action) => {
    const planName = action.plan?.nom || 'Non défini';
    acc[planName] = (acc[planName] || 0) + 1;
    return {};
  }, {} as Record<string, number>);

  const planData = Object.entries(planDistribution)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  return (
    <div className="space-y-8">
      {/* Header avec retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Statistiques détaillées - {profile?.tenants?.nom}
            </p>
          </div>
        </div>
      </div>

      {/* Résumé des KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{kpis.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En retard</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{kpis.late}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Terminées</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{kpis.completed}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{kpis.completionRate}%</p>
            </div>
            <div className="text-sm text-gray-500">
              {kpis.completed} / {kpis.total}
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Répartition par statut
          </h2>
          <ActionStatusPieChart data={statusData} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Répartition par priorité
          </h2>
          <ActionPriorityBarChart data={priorityData} />
        </div>
      </div>

      {/* Actions en retard - Liste */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Actions en retard ({lateActions.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {lateActions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              ✅ Aucune action en retard
            </div>
          ) : (
            lateActions.slice(0, 10).map((action: any) => (
              <div key={action.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {action.plan?.nom || 'Plan non défini'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Échéance: {action.echeance ? new Date(action.echeance).toLocaleDateString('fr-FR') : 'Non définie'}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      En retard
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {lateActions.length > 10 && (
          <div className="px-6 py-4 bg-gray-50 text-center">
            <Link
              href="/admin/actions"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Voir toutes les actions en retard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
