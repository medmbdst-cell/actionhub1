/**
 * Page d'édition d'un utilisateur
 * Permet à l'admin d'assigner une équipe et modifier le rôle
 */

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Users as UsersIcon, Shield } from 'lucide-react';
import { UserEditForm } from './UserEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Vérifier que l'utilisateur connecté est admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Récupérer l'utilisateur à éditer
  const { data: targetUser, error } = await supabase
    .from('profiles')
    .select(`
      *,
      equipe:equipes(id, nom)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id!)
    .single();

  if (error || !targetUser) {
    notFound();
  }

  // Récupérer toutes les équipes du tenant
  const { data: equipes } = await supabase
    .from('equipes')
    .select('id, nom, responsable_id')
    .eq('tenant_id', profile.tenant_id!)
    .order('nom');

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      responsable: 'bg-blue-100 text-blue-800',
      collaborateur: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      admin: 'Admin',
      responsable: 'Responsable',
      collaborateur: 'Collaborateur',
    };
    return {
      style: styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[role as keyof typeof labels] || role,
    };
  };

  const badge = getRoleBadge(targetUser.role);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm text-text2 hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux utilisateurs
        </Link>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-bg3 rounded-full">
              <User className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">
                {targetUser.prenom} {targetUser.nom}
              </h1>
              <p className="text-text2 mt-1">{targetUser.email}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.style}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Informations actuelles */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-accent" />
          Informations actuelles
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="label">Rôle</dt>
            <dd className="text-text font-medium">{badge.label}</dd>
          </div>
          <div>
            <dt className="label">Équipe</dt>
            <dd className="text-text font-medium">
              {targetUser.equipe?.nom || (
                <span className="text-text3 italic">Aucune équipe assignée</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="label">Statut</dt>
            <dd className="text-text font-medium">
              {targetUser.actif ? (
                <span className="text-green-500">Actif</span>
              ) : (
                <span className="text-red-500">Inactif</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="label">Créé le</dt>
            <dd className="text-text font-medium">
              {new Date(targetUser.created_at).toLocaleDateString('fr-FR')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Formulaire d'édition */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center">
          <UsersIcon className="w-5 h-5 mr-2 text-accent" />
          Modifier l'affectation
        </h2>
        <UserEditForm
          userId={targetUser.id}
          currentEquipeId={targetUser.equipe_id}
          currentRole={targetUser.role}
          equipes={equipes || []}
        />
      </div>
    </div>
  );
}
