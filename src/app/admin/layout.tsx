/**
 * Layout pour les pages d'administration tenant
 * Accessible uniquement aux utilisateurs avec le rôle 'admin'
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import GlobalSearch from '@/components/common/GlobalSearch';
import ThemeToggle from '@/components/common/ThemeToggle';
import { LayoutDashboard, Users, ListChecks, Upload, Cloud, RefreshCw, LogOut } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Vérifier que l'utilisateur est bien un admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, tenants(nom)')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const tenantName = profile.tenants?.nom || 'Mon Organisation';

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg2 border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-bg2/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Tenant */}
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="flex items-center space-x-2 group">
                <span className="text-xl font-bold text-accent group-hover:text-accent2 transition-colors">
                  ActionHub
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  ADMIN
                </span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-text2 font-medium">
                {tenantName}
              </span>
            </div>

            {/* Navigation principale */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link
                href="/admin"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text2 hover:text-text hover:bg-bg3 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tableau de bord</span>
              </Link>
              <Link
                href="/admin/actions"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text2 hover:text-text hover:bg-bg3 transition-all"
              >
                <ListChecks className="w-4 h-4" />
                <span>Actions</span>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text2 hover:text-text hover:bg-bg3 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Équipe</span>
              </Link>

              {/* Menu Import/Sync */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text2 hover:text-text hover:bg-bg3 transition-all">
                  <Cloud className="w-4 h-4" />
                  <span>Imports</span>
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                <div className="absolute left-0 mt-2 w-56 bg-bg2 rounded-lg shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link
                    href="/admin/import"
                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-bg3 first:rounded-t-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Excel</span>
                  </Link>
                  <Link
                    href="/admin/import/drive"
                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-accent hover:text-accent2 hover:bg-accent/10 transition-colors"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Google Drive</span>
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <Link
                    href="/admin/sync-status"
                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-text2 hover:text-text hover:bg-bg3 last:rounded-b-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Synchronisations</span>
                  </Link>
                </div>
              </div>
            </nav>

            {/* Actions droite */}
            <div className="flex items-center space-x-4">
              <GlobalSearch />
              <div className="h-6 w-px bg-border hidden lg:block" />
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text2 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Déconnexion</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
