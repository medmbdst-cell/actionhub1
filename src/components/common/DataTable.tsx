'use client';

import { useMemo, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Download, CheckSquare } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: T[]) => void | Promise<void>;
  variant?: 'default' | 'danger';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;

  // Tri simple (legacy support)
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';

  // Tri multi-colonnes
  multiSort?: boolean;
  sorts?: SortState[];
  onSortsChange?: (sorts: SortState[]) => void;

  // Filtres
  onFilter?: (field: string, value: string) => void;
  filters?: Record<string, string>;

  // Sélection
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedKeys: Set<string | number>) => void;

  // Actions groupées
  bulkActions?: BulkAction<T>[];

  // UI
  stickyHeader?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onSort,
  sortField,
  sortDirection,
  multiSort = false,
  sorts = [],
  onSortsChange,
  onFilter,
  filters = {},
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  bulkActions = [],
  stickyHeader = true,
  emptyMessage = 'Aucune donnée à afficher',
  className = '',
}: DataTableProps<T>) {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filters);
  const [localSelection, setLocalSelection] = useState<Set<string | number>>(selectedRows);

  // Gestion de la sélection
  const currentSelection = onSelectionChange ? selectedRows : localSelection;

  const handleSelectionChange = useCallback((newSelection: Set<string | number>) => {
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    } else {
      setLocalSelection(newSelection);
    }
  }, [onSelectionChange]);

  // Toggle sélection d'une ligne
  const toggleRowSelection = useCallback((key: string | number) => {
    const newSelection = new Set(currentSelection);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    handleSelectionChange(newSelection);
  }, [currentSelection, handleSelectionChange]);

  // Toggle sélection de toutes les lignes
  const toggleAllSelection = useCallback(() => {
    if (currentSelection.size === data.length) {
      handleSelectionChange(new Set());
    } else {
      const allKeys = new Set(data.map(row => row[keyField]));
      handleSelectionChange(allKeys);
    }
  }, [currentSelection.size, data, keyField, handleSelectionChange]);

  // Gestion du tri multi-colonnes
  const handleSort = useCallback((column: Column<T>, shiftKey: boolean) => {
    if (!column.sortable) return;

    if (multiSort && shiftKey && onSortsChange) {
      // Tri multi-colonnes (Shift+Click)
      const existingIndex = sorts.findIndex(s => s.field === column.key);
      let newSorts: SortState[];

      if (existingIndex >= 0) {
        // Toggle direction de cette colonne
        const currentSort = sorts[existingIndex];
        if (currentSort.direction === 'asc') {
          newSorts = [...sorts];
          newSorts[existingIndex] = { ...currentSort, direction: 'desc' };
        } else {
          // Retirer cette colonne du tri
          newSorts = sorts.filter((_, i) => i !== existingIndex);
        }
      } else {
        // Ajouter cette colonne au tri
        newSorts = [...sorts, { field: column.key, direction: 'asc' }];
      }

      onSortsChange(newSorts);
    } else if (onSort) {
      // Tri simple (legacy)
      const newDirection =
        sortField === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(column.key, newDirection);
    } else if (onSortsChange) {
      // Tri simple avec nouveau système
      onSortsChange([{
        field: column.key,
        direction: sorts[0]?.field === column.key && sorts[0]?.direction === 'asc' ? 'desc' : 'asc'
      }]);
    }
  }, [multiSort, sorts, onSortsChange, onSort, sortField, sortDirection]);

  // Gestion des filtres
  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    const newFilters = { ...localFilters, [columnKey]: value };
    setLocalFilters(newFilters);

    if (onFilter) {
      onFilter(columnKey, value);
    }
  }, [localFilters, onFilter]);

  // Icône de tri
  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null;

    // Tri multi-colonnes
    if (multiSort && sorts.length > 0) {
      const sortIndex = sorts.findIndex(s => s.field === column.key);
      if (sortIndex >= 0) {
        const sort = sorts[sortIndex];
        return (
          <div className="ml-2 flex items-center">
            {sort.direction === 'asc' ? (
              <ChevronUp className="h-4 w-4 text-accent" />
            ) : (
              <ChevronDown className="h-4 w-4 text-accent" />
            )}
            {sorts.length > 1 && (
              <span className="ml-1 text-xs text-accent">{sortIndex + 1}</span>
            )}
          </div>
        );
      }
    }

    // Tri simple
    if (sortField === column.key) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="ml-2 h-4 w-4 text-accent" />
      ) : (
        <ChevronDown className="ml-2 h-4 w-4 text-accent" />
      );
    }

    return <ChevronsUpDown className="ml-2 h-4 w-4 text-text3" />;
  };

  // Actions groupées
  const selectedRowsData = useMemo(() => {
    return data.filter(row => currentSelection.has(row[keyField]));
  }, [data, currentSelection, keyField]);

  const handleBulkAction = async (action: BulkAction<T>) => {
    await action.onClick(selectedRowsData);
    // Optionnel : Clear selection après action
    // handleSelectionChange(new Set());
  };

  // Rendu des lignes
  const tableRows = useMemo(() => {
    return data.map((row) => {
      const rowKey = String(row[keyField]);
      const isSelected = currentSelection.has(row[keyField]);

      return (
        <tr
          key={rowKey}
          className={`transition-colors ${
            isSelected ? 'bg-accent/5' : 'hover:bg-bg3/50'
          }`}
        >
          {selectable && (
            <td className="px-6 py-4 w-12">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRowSelection(row[keyField])}
                className="w-4 h-4 text-accent bg-bg border-border rounded focus:ring-accent focus:ring-2"
              />
            </td>
          )}
          {columns.map((column) => (
            <td
              key={column.key}
              className="px-6 py-4 text-sm text-text"
              style={{ width: column.width, minWidth: '100px' }}
            >
              {column.render ? column.render(row) : String(row[column.key] || '-')}
            </td>
          ))}
        </tr>
      );
    });
  }, [data, columns, keyField, selectable, currentSelection, toggleRowSelection]);

  const allSelected = data.length > 0 && currentSelection.size === data.length;
  const someSelected = currentSelection.size > 0 && currentSelection.size < data.length;

  return (
    <div className={className}>
      {/* Barre d'actions groupées */}
      {selectable && currentSelection.size > 0 && bulkActions.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-text">
              {currentSelection.size} {currentSelection.size === 1 ? 'ligne sélectionnée' : 'lignes sélectionnées'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {bulkActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleBulkAction(action)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  action.variant === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-accent text-white hover:bg-accent2'
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="shadow ring-1 ring-border sm:rounded-lg bg-bg2 overflow-hidden">
        <div className={`${stickyHeader ? 'max-h-[calc(100vh-300px)] overflow-y-auto' : ''} overflow-x-auto`}>
          <table className="min-w-full divide-y divide-border" style={{ tableLayout: 'auto', width: '100%' }}>
            <thead className={`bg-bg3 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            {/* Ligne des en-têtes */}
            <tr>
              {selectable && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 text-accent bg-bg border-border rounded focus:ring-accent focus:ring-2"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-text2 ${
                    column.sortable ? 'cursor-pointer select-none hover:bg-bg2/50' : ''
                  }`}
                  onClick={(e) => column.sortable && handleSort(column, e.shiftKey)}
                  style={{ width: column.width, minWidth: '100px' }}
                  title={column.sortable && multiSort ? 'Shift+Click pour tri multi-colonnes' : ''}
                >
                  <div className="flex items-center">
                    <span>{column.header}</span>
                    <SortIcon column={column} />
                  </div>
                </th>
              ))}
            </tr>

            {/* Ligne des filtres */}
            {columns.some((col) => col.filterable) && (
              <tr>
                {selectable && <th className="px-6 py-2 w-12"></th>}
                {columns.map((column) => (
                  <th key={`filter-${column.key}`} className="px-6 py-2">
                    {column.filterable ? (
                      <input
                        type="text"
                        value={localFilters[column.key] || ''}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        placeholder={`Filtrer...`}
                        className="w-full rounded-md border border-border bg-bg text-text text-xs px-2 py-1 focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-border bg-bg2">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-text3"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tableRows
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Hint pour tri multi-colonnes */}
      {multiSort && columns.some(c => c.sortable) && (
        <div className="mt-2 text-xs text-text3 text-center">
          💡 Maintenir <kbd className="px-1.5 py-0.5 bg-bg3 border border-border rounded font-mono text-text2">Shift</kbd> et cliquer pour trier plusieurs colonnes
        </div>
      )}
    </div>
  );
}
