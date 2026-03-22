'use client';

import { useState } from 'react';
import { toggleTenantStatus } from '@/app/actions/tenants';
import type { Tenant } from '@/types';

interface TenantDetailsHeaderProps {
  tenant: Tenant;
}

export default function TenantDetailsHeader({
  tenant,
}: TenantDetailsHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = async () => {
    if (
      !confirm(
        `Voulez-vous vraiment ${tenant.actif ? 'désactiver' : 'activer'} ce tenant ?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    const result = await toggleTenantStatus(tenant.id, !tenant.actif);
    setIsLoading(false);

    if (result.error) {
      alert(result.error);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.nom}
                className="h-16 w-16 rounded-lg mr-4"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tenant.nom}
              </h1>
              <div className="mt-1 flex items-center gap-3">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {tenant.slug}
                </code>
                {tenant.actif ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Actif
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Inactif
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={handleToggleStatus}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${
                tenant.actif
                  ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                  : 'text-green-700 bg-green-100 hover:bg-green-200'
              }`}
            >
              {isLoading
                ? 'Chargement...'
                : tenant.actif
                  ? 'Désactiver'
                  : 'Activer'}
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Créé le {new Date(tenant.created_at).toLocaleDateString('fr-FR')} •
          Mis à jour le {new Date(tenant.updated_at).toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
