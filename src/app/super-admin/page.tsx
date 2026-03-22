import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  // Récupérer les statistiques globales
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, nom, slug, actif, created_at')
    .order('created_at', { ascending: false });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, role, tenant_id, actif')
    .neq('role', 'super_admin');

  const { data: actions } = await supabase.from('actions').select('id, statut');

  // Calculer les statistiques
  const stats = {
    totalTenants: tenants?.length || 0,
    activeTenants: tenants?.filter((t) => t.actif).length || 0,
    totalUsers: profiles?.length || 0,
    activeUsers: profiles?.filter((p) => p.actif).length || 0,
    totalActions: actions?.length || 0,
    completedActions: actions?.filter((a) => a.statut === 'done').length || 0,
  };

  // Regrouper les utilisateurs par tenant
  const usersByTenant = profiles?.reduce(
    (acc, profile) => {
      const tenantId = profile.tenant_id || 'null';
      acc[tenantId] = (acc[tenantId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="px-4 sm:px-0">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Tableau de bord Super Admin
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestion centralisée de tous les tenants et utilisateurs
        </p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Tenants */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tenants
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalTenants}
                    </div>
                    <div className="ml-2 text-sm text-green-600">
                      {stats.activeTenants} actifs
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/super-admin/tenants"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Gérer les tenants →
            </Link>
          </div>
        </div>

        {/* Utilisateurs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Utilisateurs
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalUsers}
                    </div>
                    <div className="ml-2 text-sm text-green-600">
                      {stats.activeUsers} actifs
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/super-admin/users"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Gérer les utilisateurs →
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Actions totales
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalActions}
                    </div>
                    <div className="ml-2 text-sm text-green-600">
                      {stats.completedActions} terminées
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm text-gray-500">
              Toutes organisations confondues
            </div>
          </div>
        </div>
      </div>

      {/* Tenants récents */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Tenants récents
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Les dernières organisations ajoutées à la plateforme
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants && tenants.length > 0 ? (
                tenants.slice(0, 5).map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {tenant.nom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{tenant.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {usersByTenant?.[tenant.id] || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.actif ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/super-admin/tenants/${tenant.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Aucun tenant pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tenants && tenants.length > 5 && (
          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <Link
              href="/super-admin/tenants"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Voir tous les tenants ({tenants.length}) →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
