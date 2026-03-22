import { getAllUsers } from '@/app/actions/users';
import { getTenants } from '@/app/actions/tenants';
import CreateUserButton from '@/components/super-admin/CreateUserButton';
import UsersList from '@/components/super-admin/UsersList';

export default async function UsersPage() {
  const [users, tenants] = await Promise.all([getAllUsers(), getTenants()]);

  return (
    <div className="px-4 sm:px-0">
      {/* En-tête */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Utilisateurs
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tous les utilisateurs de toutes les organisations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <CreateUserButton tenants={tenants} />
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Total</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {users.length}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Admins</div>
            <div className="mt-1 text-3xl font-semibold text-indigo-600">
              {users.filter((u) => u.role === 'admin').length}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">
              Responsables
            </div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">
              {users.filter((u) => u.role === 'responsable').length}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">
              Collaborateurs
            </div>
            <div className="mt-1 text-3xl font-semibold text-green-600">
              {users.filter((u) => u.role === 'collaborateur').length}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <UsersList users={users} />
    </div>
  );
}
