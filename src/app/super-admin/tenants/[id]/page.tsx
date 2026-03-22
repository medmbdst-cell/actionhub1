import { getTenantById, getTenantStats } from '@/app/actions/tenants';
import { getUsersByTenant } from '@/app/actions/users';
import Link from 'next/link';
import TenantDetailsHeader from '@/components/super-admin/TenantDetailsHeader';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [tenant, stats, users] = await Promise.all([
    getTenantById(id),
    getTenantStats(id),
    getUsersByTenant(id),
  ]);

  return (
    <div className="px-4 sm:px-0">
      {/* Fil d'Ariane */}
      <nav className="mb-4 text-sm">
        <Link
          href="/super-admin/tenants"
          className="text-indigo-600 hover:text-indigo-800"
        >
          ← Retour aux tenants
        </Link>
      </nav>

      {/* En-tête avec actions */}
      <TenantDetailsHeader tenant={tenant} />

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">
              Utilisateurs
            </div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.users}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">
              Plans d'action
            </div>
            <div className="mt-1 text-3xl font-semibold text-indigo-600">
              {stats.plans}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Actions</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">
              {stats.actions}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">
              Taux de complétion
            </div>
            <div className="mt-1 text-3xl font-semibold text-green-600">
              {stats.completionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Utilisateurs du tenant */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Utilisateurs de {tenant.nom}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé le
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.prenom} {user.nom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800'
                            : user.role === 'responsable'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.actif ? (
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
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <div>Aucun utilisateur pour ce tenant</div>
                    <div className="mt-2">
                      <Link
                        href="/super-admin/users"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Créer un utilisateur →
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
