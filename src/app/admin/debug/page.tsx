/**
 * Page de debug pour vérifier le mapping des imports
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DebugPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return <div>Tenant introuvable</div>;
  }

  // Récupérer les plans avec leur mapping
  const { data: plans } = await supabase
    .from('plans_action')
    .select('id, nom, column_mapping, source_type, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Récupérer quelques actions pour voir les valeurs de priorité
  const { data: actions } = await supabase
    .from('actions')
    .select('id, description, priorite, statut, responsable_txt')
    .eq('tenant_id', profile.tenant_id)
    .limit(20);

  // Compter les priorités
  const priorityCount = actions?.reduce((acc, action) => {
    const key = action.priorite || 'NULL';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Debug - Mapping & Données</h1>
      </div>

      {/* Plans et mappings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Plans importés (5 derniers)</h2>
        <div className="space-y-6">
          {plans?.map((plan) => (
            <div key={plan.id} className="border-l-4 border-blue-500 pl-4">
              <div className="font-medium text-lg">{plan.nom}</div>
              <div className="text-sm text-gray-600 mt-1">
                Source: {plan.source_type} • Créé le:{' '}
                {new Date(plan.created_at).toLocaleString('fr-FR')}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700">Column Mapping:</div>
                <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {JSON.stringify(plan.column_mapping, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiques priorités */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Distribution des priorités (sur {actions?.length || 0} actions)
        </h2>
        <div className="space-y-2">
          {Object.entries(priorityCount || {}).map(([priority, count]) => (
            <div key={priority} className="flex items-center justify-between">
              <span className="font-medium">{priority}</span>
              <span className="text-gray-600">{count} actions</span>
            </div>
          ))}
        </div>
      </div>

      {/* Échantillon d actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Échantillon d actions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Priorité
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Statut
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Responsable
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actions?.map((action) => (
                <tr key={action.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {action.description.substring(0, 50)}...
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {action.priorite ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {action.priorite}
                      </span>
                    ) : (
                      <span className="text-gray-400">NULL</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">{action.statut}</td>
                  <td className="px-4 py-2 text-sm">{action.responsable_txt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
