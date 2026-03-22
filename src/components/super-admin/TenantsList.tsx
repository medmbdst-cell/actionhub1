'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toggleTenantStatus, deleteTenant } from '@/app/actions/tenants';
import type { Tenant } from '@/types';

interface TenantsListProps {
  tenants: Tenant[];
}

export default function TenantsList({ tenants }: TenantsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (
      !confirm(
        `Voulez-vous vraiment ${currentStatus ? 'désactiver' : 'activer'} ce tenant ?`
      )
    ) {
      return;
    }

    setLoadingId(id);
    const result = await toggleTenantStatus(id, !currentStatus);
    setLoadingId(null);

    if (result.error) {
      alert(result.error);
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (
      !confirm(
        `Êtes-vous ABSOLUMENT SÛR de vouloir supprimer "${nom}" ?\n\nCette action est IRRÉVERSIBLE et supprimera tous les utilisateurs et données associés.`
      )
    ) {
      return;
    }

    setLoadingId(id);
    const result = await deleteTenant(id);
    setLoadingId(null);

    if (result.error) {
      alert(result.error);
    }
  };

  if (!tenants || tenants.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Aucun tenant
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Commencez par créer votre première organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
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
            {tenants.map((tenant) => (
              <tr
                key={tenant.id}
                className={loadingId === tenant.id ? 'opacity-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {tenant.logo_url && (
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={tenant.logo_url}
                          alt=""
                        />
                      </div>
                    )}
                    <div className={tenant.logo_url ? 'ml-4' : ''}>
                      <div className="text-sm font-medium text-gray-900">
                        {tenant.nom}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {tenant.slug}
                    </code>
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
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() =>
                        handleToggleStatus(tenant.id, tenant.actif)
                      }
                      disabled={loadingId === tenant.id}
                      className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                    >
                      {tenant.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDelete(tenant.id, tenant.nom)}
                      disabled={loadingId === tenant.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
