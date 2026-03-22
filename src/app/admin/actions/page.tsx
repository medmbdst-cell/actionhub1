// @ts-nocheck
'use client';

/**
 * Page de gestion des actions du tenant
 * Vue d'ensemble de toutes les actions avec pagination, tri et filtres
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target, Plus, Filter, Download, Trash2 } from 'lucide-react';
import DataTable, { Column, SortState, BulkAction } from '@/components/common/DataTable';
import SearchInput from '@/components/common/SearchInput';
import Pagination from '@/components/common/Pagination';
import { getActions, getActionFilterOptions } from '@/app/actions/get-actions';
import { createClient } from '@/lib/supabase/client';

interface Action {
  id: string;
  description: string;
  event_description: string | null;
  statut: string;
  echeance: string | null;
  priorite: string | null;
  responsable_txt: string | null;
  commentaire: string | null;
  created_at: string;
  plan: {
    id: string;
    nom: string;
  };
}

export default function ActionsPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<Action[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sorts, setSorts] = useState<SortState[]>([{ field: 'created_at', direction: 'desc' }]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{
    statuts: string[];
    priorites: string[];
    responsables: string[];
  }>({ statuts: [], priorites: [], responsables: [] });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Récupérer tenant_id
  useEffect(() => {
    async function loadTenant() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
      }
    }

    loadTenant();
  }, [router]);

  // Charger les options de filtres
  useEffect(() => {
    if (!tenantId) return;

    async function loadFilterOptions() {
      const options = await getActionFilterOptions(tenantId);
      setFilterOptions(options);
    }

    loadFilterOptions();
  }, [tenantId]);

  // Charger les actions
  useEffect(() => {
    if (!tenantId) return;

    async function loadActions() {
      setLoading(true);
      try {
        const result = await getActions({
          tenantId,
          page,
          pageSize,
          search: searchQuery || undefined,
          status: statusFilter.length > 0 ? statusFilter : undefined,
          priority: priorityFilter.length > 0 ? priorityFilter : undefined,
          sortField,
          sortDirection,
        });

        setActions(result.actions);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error('Error loading actions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActions();
  }, [tenantId, page, pageSize, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

  // Helper pour badge statut
  const getStatutBadge = (statut: string) => {
    if (statut && statut.includes('%')) {
      const percentage = parseInt(statut);
      if (percentage === 0) return { style: 'bg-gray-100 text-gray-800', label: 'À faire' };
      if (percentage === 100) return { style: 'bg-green-100 text-green-800', label: '100%' };
      const style = percentage >= 70 ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800';
      return { style, label: `${percentage}%` };
    }

    const styles = {
      todo: 'bg-gray-100 text-gray-800',
      wip: 'bg-blue-100 text-blue-800',
      blocked: 'bg-orange-100 text-orange-800',
      done: 'bg-green-100 text-green-800',
    };
    const labels = {
      todo: 'À faire',
      wip: 'En cours',
      blocked: 'Bloqué',
      done: 'Terminé',
    };
    return {
      style: styles[statut as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[statut as keyof typeof labels] || statut,
    };
  };

  // Colonnes du tableau
  const columns: Column<Action>[] = [
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (action) => (
        <div>
          <div className="text-sm font-medium text-text">{action.description}</div>
          {action.event_description && (
            <div className="text-xs text-text3 mt-1">{action.event_description}</div>
          )}
        </div>
      ),
      width: '30%',
    },
    {
      key: 'plan',
      header: 'Plan',
      sortable: false,
      render: (action) => (
        <div className="text-sm text-text">{action.plan?.nom || '-'}</div>
      ),
      width: '20%',
    },
    {
      key: 'responsable_txt',
      header: 'Responsable',
      sortable: true,
      render: (action) => (
        <div className="text-sm text-text2">{action.responsable_txt || '-'}</div>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (action) => {
        const badge = getStatutBadge(action.statut);
        return (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.style}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'priorite',
      header: 'Priorité',
      sortable: true,
      render: (action) => (
        <div className="text-sm text-text2">{action.priorite || '-'}</div>
      ),
    },
    {
      key: 'echeance',
      header: 'Échéance',
      sortable: true,
      render: (action) => (
        <div className="text-sm text-text2">
          {action.echeance ? new Date(action.echeance).toLocaleDateString('fr-FR') : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (action) => (
        <Link
          href={`/admin/actions/${action.id}`}
          className="text-accent hover:text-accent2 text-sm font-medium"
        >
          Voir
        </Link>
      ),
    },
  ];

  // Handlers
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setSorts([{ field, direction }]);
    setPage(1); // Reset à la page 1
  };

  const handleSortsChange = (newSorts: SortState[]) => {
    setSorts(newSorts);
    // Pour la compatibilité avec getActions, on prend le premier tri
    if (newSorts.length > 0) {
      setSortField(newSorts[0].field);
      setSortDirection(newSorts[0].direction);
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset à la page 1
  };

  // Actions groupées
  const handleBulkDelete = async (selectedActions: Action[]) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedActions.length} action(s) ?`)) {
      return;
    }

    try {
      const supabase = createClient();
      const ids = selectedActions.map(a => a.id);

      const { error } = await supabase
        .from('actions')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Recharger les actions
      setSelectedRows(new Set());
      const result = await getActions({
        tenantId,
        page,
        pageSize,
        search: searchQuery || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        priority: priorityFilter.length > 0 ? priorityFilter : undefined,
        sortField,
        sortDirection,
      });
      setActions(result.actions);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Error deleting actions:', error);
      alert('Erreur lors de la suppression des actions');
    }
  };

  const handleBulkExport = async (selectedActions: Action[]) => {
    // Export simple en CSV
    const csv = [
      ['Description', 'Événement', 'Responsable', 'Statut', 'Priorité', 'Échéance', 'Plan'].join(';'),
      ...selectedActions.map(a => [
        a.description,
        a.event_description || '',
        a.responsable_txt || '',
        a.statut,
        a.priorite || '',
        a.echeance || '',
        a.plan?.nom || ''
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `actions_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bulkActions: BulkAction<Action>[] = [
    {
      label: 'Exporter',
      icon: <Download className="w-4 h-4" />,
      onClick: handleBulkExport,
    },
    {
      label: 'Supprimer',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleBulkDelete,
      variant: 'danger',
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text3">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Gestion des Actions</h1>
          <p className="mt-2 text-text2">
            {totalCount} action{totalCount !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-border text-text2 font-medium rounded-lg hover:bg-bg3"
          >
            <Filter className="w-5 h-5 mr-2" />
            {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
          </button>
          <Link
            href="/admin/import"
            className="inline-flex items-center px-4 py-2 border border-border text-text2 font-medium rounded-lg hover:bg-bg3"
          >
            <Plus className="w-5 h-5 mr-2" />
            Importer
          </Link>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-bg2 rounded-lg shadow p-4">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          placeholder="Rechercher par description, événement ou responsable..."
          className="w-full"
        />
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="bg-bg2 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Filtres avancés</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre statut */}
            <div>
              <label className="block text-sm font-medium text-text2 mb-2">
                Statut
              </label>
              <select
                multiple
                value={statusFilter}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setStatusFilter(selected);
                  setPage(1);
                }}
                className="w-full rounded-md border border-border bg-bg text-text focus:border-accent focus:ring-accent"
                size={5}
              >
                {filterOptions.statuts.map((statut) => (
                  <option key={statut} value={statut}>
                    {statut}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text3">
                Maintenez Ctrl/Cmd pour sélectionner plusieurs
              </p>
            </div>

            {/* Filtre priorité */}
            <div>
              <label className="block text-sm font-medium text-text2 mb-2">
                Priorité
              </label>
              <select
                multiple
                value={priorityFilter}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setPriorityFilter(selected);
                  setPage(1);
                }}
                className="w-full rounded-md border border-border bg-bg text-text focus:border-accent focus:ring-accent"
                size={5}
              >
                {filterOptions.priorites.map((priorite) => (
                  <option key={priorite} value={priorite}>
                    {priorite}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text3">
                Maintenez Ctrl/Cmd pour sélectionner plusieurs
              </p>
            </div>
          </div>

          {/* Boutons reset */}
          {(statusFilter.length > 0 || priorityFilter.length > 0) && (
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => {
                  setStatusFilter([]);
                  setPriorityFilter([]);
                  setPage(1);
                }}
                className="text-sm text-accent hover:text-accent2 font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-bg2 rounded-lg shadow">
        {loading ? (
          <div className="p-12 text-center text-text3">Chargement...</div>
        ) : actions.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-text3 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              Aucune action trouvée
            </h3>
            <p className="text-text2 mb-6">
              {searchQuery || statusFilter.length > 0 || priorityFilter.length > 0
                ? 'Essayez de modifier vos filtres'
                : 'Importez vos premières actions depuis Excel'}
            </p>
            {!searchQuery && statusFilter.length === 0 && priorityFilter.length === 0 && (
              <Link
                href="/admin/import"
                className="inline-flex items-center px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent2"
              >
                <Plus className="w-5 h-5 mr-2" />
                Importer des actions
              </Link>
            )}
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={actions}
              keyField="id"
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              multiSort={true}
              sorts={sorts}
              onSortsChange={handleSortsChange}
              selectable={true}
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              bulkActions={bulkActions}
              stickyHeader={true}
              emptyMessage="Aucune action à afficher"
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
