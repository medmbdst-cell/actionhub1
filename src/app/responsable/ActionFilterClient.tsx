'use client';

/**
 * Composant client pour filtrer les actions par plan d'action
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';

interface Action {
  id: string;
  description: string;
  event_description?: string;
  responsable_txt?: string;
  statut: string;
  echeance?: string;
  plan_action_nom?: string;
  [key: string]: any;
}

interface ActionFilterClientProps {
  actions: Action[];
  getStatutBadge: (statut: string) => { style: string; label: string };
}

export function ActionFilterClient({ actions, getStatutBadge }: ActionFilterClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('all');

  // Extraire la liste unique des plans d'action
  const plans = useMemo(() => {
    const planSet = new Set<string>();
    actions.forEach((action) => {
      if (action.plan_action_nom) {
        planSet.add(action.plan_action_nom);
      }
    });
    return Array.from(planSet).sort();
  }, [actions]);

  // Filtrer les actions selon le plan sélectionné
  const filteredActions = useMemo(() => {
    if (selectedPlan === 'all') return actions;
    return actions.filter((action) => action.plan_action_nom === selectedPlan);
  }, [actions, selectedPlan]);

  return (
    <div>
      {/* Filtre par plan d'action */}
      {plans.length > 0 && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <label htmlFor="plan-filter" className="text-sm font-medium text-gray-700">
              Filtrer par plan d'action :
            </label>
            <select
              id="plan-filter"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="all">Tous les plans ({actions.length})</option>
              {plans.map((plan) => {
                const count = actions.filter((a) => a.plan_action_nom === plan).length;
                return (
                  <option key={plan} value={plan}>
                    {plan} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Table des actions filtrées */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Échéance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredActions.map((action) => {
              const badge = getStatutBadge(action.statut);
              return (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {action.description}
                    </div>
                    {action.event_description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {action.event_description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {action.responsable_txt || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {action.echeance
                      ? new Date(action.echeance).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/responsable/actions/${action.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
