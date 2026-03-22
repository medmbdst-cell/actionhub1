'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Users, Target, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from './SearchInput';

interface SearchResult {
  id: string;
  type: 'action' | 'plan' | 'user';
  title: string;
  subtitle?: string;
  url: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Raccourci clavier Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input quand modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Recherche quand query change
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    async function search() {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  // Navigation au clavier
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <Target className="w-4 h-4 text-purple-500" />;
      case 'plan':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'action':
        return 'Action';
      case 'plan':
        return 'Plan';
      case 'user':
        return 'Utilisateur';
      default:
        return type;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-text2 bg-bg3 rounded-lg hover:bg-bg2 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Rechercher...</span>
        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 border border-border rounded text-xs font-mono bg-bg">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
        <div
          ref={modalRef}
          className="w-full max-w-2xl bg-bg2 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="w-5 h-5 text-text3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des actions, plans, utilisateurs..."
              className="flex-1 px-4 py-4 text-sm bg-transparent text-text placeholder-text3 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="p-1 hover:bg-bg3 rounded"
              >
                <X className="w-4 h-4 text-text3" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 px-3 py-1 text-xs text-text2 hover:bg-bg3 rounded"
            >
              ESC
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-text2">
                Recherche en cours...
              </div>
            ) : query.length < 2 ? (
              <div className="px-4 py-8 text-center text-sm text-text2">
                Tapez au moins 2 caractères pour rechercher
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-12 h-12 text-text3 mx-auto mb-3" />
                <p className="text-sm text-text2">Aucun résultat trouvé</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-start px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-accent/10'
                        : 'hover:bg-bg3/50'
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(result.type)}
                    </div>

                    {/* Content */}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-text truncate">
                          {result.title}
                        </p>
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg3 text-text2">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="mt-0.5 text-xs text-text3 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Enter hint */}
                    {index === selectedIndex && (
                      <div className="flex-shrink-0 ml-2">
                        <kbd className="inline-flex items-center px-2 py-0.5 border border-border rounded text-xs font-mono bg-bg text-text2">
                          ⏎
                        </kbd>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-xs text-text3 flex items-center justify-between bg-bg3">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="px-2 py-0.5 border border-border rounded font-mono bg-bg mr-1">
                  ↑↓
                </kbd>
                Naviguer
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-0.5 border border-border rounded font-mono bg-bg mr-1">
                  ⏎
                </kbd>
                Sélectionner
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-0.5 border border-border rounded font-mono bg-bg mr-1">
                  ESC
                </kbd>
                Fermer
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
