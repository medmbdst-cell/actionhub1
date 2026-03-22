/**
 * Layout pour les collaborateurs
 * Protection du rôle + navigation
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Target, Users, LogOut } from 'lucide-react';

export default async function CollaborateurLayout({
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

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, equipe_id, tenants(nom)')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'collaborateur') {
    redirect('/dashboard');
  }

  // Récupérer l'équipe assignée (si existe)
  let equipe = null;
  if (profile.equipe_id) {
    const { data: equipeData } = await supabase
      .from('equipes')
      .select('id, nom, description')
      .eq('id', profile.equipe_id)
      .eq('tenant_id', profile.tenant_id!)
      .single();
    equipe = equipeData;
  }

  const tenantNom = (profile.tenants as any)?.nom || 'Organisation';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/collaborateur" className="text-2xl font-bold text-blue-600">
                ActionHub
              </Link>
              <span className="ml-4 text-sm text-gray-500">
                COLLABORATEUR · {tenantNom}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {equipe && (
                <span className="text-sm text-gray-700">{equipe.nom}</span>
              )}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4">
            <Link
              href="/collaborateur"
              className="inline-flex items-center px-3 py-4 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300"
            >
              <Target className="w-4 h-4 mr-2" />
              Mes actions
            </Link>
            {equipe && (
              <Link
                href="/collaborateur/equipe"
                className="inline-flex items-center px-3 py-4 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300"
              >
                <Users className="w-4 h-4 mr-2" />
                Mon équipe
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
