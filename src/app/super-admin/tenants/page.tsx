import { getTenants } from '@/app/actions/tenants';
import CreateTenantButton from '@/components/super-admin/CreateTenantButton';
import TenantsList from '@/components/super-admin/TenantsList';

export default async function TenantsPage() {
  const tenants = await getTenants();

  return (
    <div className="px-4 sm:px-0">
      {/* En-tête */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Tenants
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Liste de toutes les organisations utilisant ActionHub
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <CreateTenantButton />
        </div>
      </div>

      {/* Liste des tenants */}
      <TenantsList tenants={tenants} />
    </div>
  );
}
