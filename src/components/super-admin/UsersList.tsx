'use client';

import { useState } from 'react';
import { toggleUserStatus, deleteUser } from '@/app/actions/users';
import type { Profile } from '@/types';

interface UsersListProps {
  users: (Profile & {
    tenants?: { id: string; nom: string; slug: string } | null;
  })[];
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  responsable: 'Responsable',
  collaborateur: 'Collaborateur',
};

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-indigo-100 text-indigo-800',
  responsable: 'bg-blue-100 text-blue-800',
  collaborateur: 'bg-green-100 text-green-800',
};

export default function UsersList({ users }: UsersListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les utilisateurs
  const filteredUsers = users.filter((user) => {
    const matchRole = filterRole === 'all' || user.role === filterRole;
    const matchSearch =
      searchTerm === '' ||
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchSearch;
  });

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (
      !confirm(
        `Voulez-vous vraiment ${currentStatus ? 'désactiver' : 'activer'} cet utilisateur ?`
      )
    ) {
      return;
    }

    setLoadingId(id);
    const result = await toggleUserStatus(id, !currentStatus);
    setLoadingId(null);

    if (result.error) {
      alert(result.error);
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (
      !confirm(
        `Êtes-vous ABSOLUMENT SÛR de vouloir supprimer "${nom}" ?\n\nCette action est IRRÉVERSIBLE.`
      )
    ) {
      return;
    }

    setLoadingId(id);
    const result = await deleteUser(id);
    setLoadingId(null);

    if (result.error) {
      alert(result.error);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Filtres */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Filtre par rôle */}
          <div className="sm:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Admins</option>
              <option value="responsable">Responsables</option>
              <option value="collaborateur">Collaborateurs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organisation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={loadingId === user.id ? 'opacity-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.prenom} {user.nom}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.tenants?.nom || (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}
                    >
                      {roleLabels[user.role]}
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() =>
                          handleToggleStatus(user.id, user.actif)
                        }
                        disabled={loadingId === user.id}
                        className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                      >
                        {user.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(user.id, `${user.prenom} ${user.nom}`)
                        }
                        disabled={loadingId === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer avec compte */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        Affichage de {filteredUsers.length} sur {users.length} utilisateur
        {users.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
