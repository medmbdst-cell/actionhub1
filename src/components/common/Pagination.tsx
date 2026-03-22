'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si peu nombreuses
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique avec ellipses
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between border-t border-border bg-bg2 px-4 py-3 sm:px-6">
      {/* Info sur les éléments affichés */}
      <div className="flex flex-1 items-center justify-between">
        <div className="hidden sm:block">
          <p className="text-sm text-text2">
            Affichage de{' '}
            <span className="font-medium text-text">{startItem}</span> à{' '}
            <span className="font-medium text-text">{endItem}</span> sur{' '}
            <span className="font-medium text-text">{totalItems}</span> résultats
          </p>
        </div>

        {/* Sélecteur taille de page */}
        {onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <label htmlFor="page-size" className="text-sm text-text2">
              Par page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-border bg-bg text-text py-1 pl-2 pr-8 text-sm focus:border-accent focus:ring-accent"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contrôles de navigation */}
      <div className="flex items-center space-x-2">
        {/* Première page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md bg-bg3 px-2 py-2 text-sm font-medium text-text2 hover:bg-bg2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Première page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Page précédente */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md bg-bg3 px-2 py-2 text-sm font-medium text-text2 hover:bg-bg2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Numéros de page */}
        <div className="hidden sm:flex sm:space-x-1">
          {pages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-text2"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-accent text-white hover:bg-accent2'
                    : 'bg-bg3 text-text2 hover:bg-bg2'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Mobile : affichage simple */}
        <div className="sm:hidden">
          <span className="text-sm text-text2">
            Page {currentPage} / {totalPages}
          </span>
        </div>

        {/* Page suivante */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center rounded-md bg-bg3 px-2 py-2 text-sm font-medium text-text2 hover:bg-bg2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dernière page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center rounded-md bg-bg3 px-2 py-2 text-sm font-medium text-text2 hover:bg-bg2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Dernière page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
