'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes: Array<{ value: 'light' | 'dark' | 'auto'; icon: any; label: string }> = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
    { value: 'auto', icon: Monitor, label: 'Auto' },
  ];

  const currentTheme = themes.find((t) => t.value === theme);
  const Icon = currentTheme?.icon || Sun;

  return (
    <div className="relative group">
      {/* Bouton principal */}
      <button
        className="p-2 rounded-lg hover:bg-bg3 transition-colors"
        title={`Thème: ${currentTheme?.label}`}
      >
        <Icon className="w-5 h-5 text-text2" />
      </button>

      {/* Dropdown menu (hover) */}
      <div className="absolute right-0 mt-2 w-40 bg-bg2 rounded-lg shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {themes.map(({ value, icon: ThemeIcon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-bg3 transition-colors first:rounded-t-lg last:rounded-b-lg ${
              theme === value
                ? 'text-accent font-medium'
                : 'text-text2'
            }`}
          >
            <ThemeIcon className="w-4 h-4" />
            <span>{label}</span>
            {theme === value && (
              <span className="ml-auto text-accent">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
