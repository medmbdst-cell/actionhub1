/**
 * Page principale du dashboard admin tenant
 * Vue d'ensemble des statistiques et graphiques
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, Layers, Target, Upload, AlertTriangle, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ActionStatusPieChart from '@/components/charts/ActionStatusPieChart';
import ActionPriorityBarChart from '@/components/charts/ActionPriorityBarChart';
import {
  calculateGlobalStats,
  calculateStatusDistribution,
  calculatePriorityDistribution,
} from '@/lib/analytics/kpis';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Récupérer le tenant_id de l'admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(nom)')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;

  // Récupérer TOUTES les actions pour calculer les KPIs
  const { data: allActions } = await supabase
    .from('actions')
    .select('id, statut, echeance, created_at, priorite')
    .eq('tenant_id', tenantId!);

  // Statistiques de base
  const [
    { count: teamsCount },
    { count: usersCount },
  ] = await Promise.all([
    supabase.from('equipes').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId!),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId!),
  ]);

  // Calculer les KPIs analytiques
  const kpis = calculateGlobalStats(allActions || []);
  const statusData = calculateStatusDistribution(allActions || []);
  const priorityData = calculatePriorityDistribution(allActions || []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de bord Admin
          </h1>
          <p className="mt-2 text-gray-600">
            Gérez votre organisation {profile?.tenants?.nom}
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics détaillées
        </Link>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          name="Actions totales"
          value={kpis.total}
          description="actions au total"
          icon={Target}
          href="/admin/actions"
          color="text-purple-600"
          bgColor="bg-purple-100"
        />

        <StatCard
          name="En retard"
          value={kpis.late}
          description="actions en retard"
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-100"
        />

        <StatCard
          name="Terminées"
          value={kpis.completed}
          description="actions terminées"
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-100"
        />

        <StatCard
          name="Taux d'avancement"
          value={`${kpis.completionRate}%`}
          description={`${kpis.completed} / ${kpis.total} terminées`}
          icon={TrendingUp}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Répartition par statut
          </h2>
          <ActionStatusPieChart data={statusData} />
        </div>

        {/* Répartition par priorité */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Répartition par priorité
          </h2>
          <ActionPriorityBarChart data={priorityData} />
        </div>
      </div>

      {/* Stats organisationnelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/teams"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Équipes</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {teamsCount || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">équipes actives</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {usersCount || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">membres de l'organisation</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/teams/new"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Layers className="w-5 h-5 text-blue-600 mr-3" />
            <span className="font-medium text-gray-700">Créer une équipe</span>
          </Link>

          <Link
            href="/admin/users/new"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Users className="w-5 h-5 text-green-600 mr-3" />
            <span className="font-medium text-gray-700">Inviter un utilisateur</span>
          </Link>

          <Link
            href="/admin/import"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Upload className="w-5 h-5 text-purple-600 mr-3" />
            <span className="font-medium text-gray-700">Importer des actions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
