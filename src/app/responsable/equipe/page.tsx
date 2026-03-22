/**
 * Page "Vue par collaborateur" pour les responsables d'équipe
 * Affiche une synthèse de chaque collaborateur avec ses indicateurs
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, User, TrendingUp } from 'lucide-react';

export default async function EquipeDetailPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Récupérer le profil du responsable
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, equipe_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'responsable') {
    redirect('/dashboard');
  }

  const tenantId = profile.tenant_id;
  const equipeId = profile.equipe_id;

  // Récupérer les infos de l'équipe
  const { data: equipe } = await supabase
    .from('equipes')
    .select('id, nom, description')
    .eq('id', equipeId!)
    .single();

  // Récupérer tous les collaborateurs de l'équipe
  const { data: collaborateurs } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email, role')
    .eq('equipe_id', equipeId!)
    .eq('actif', true)
    .order('nom');

  // Récupérer toutes les actions de l'équipe
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('tenant_id', tenantId!)
    .eq('equipe_id', equipeId!);

  // Date du jour et début du mois
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Calculer les indicateurs par collaborateur
  const collaborateursAvecStats = (collaborateurs || []).map((collab) => {
    const actionsCollab = (actions || []).filter(
      (a) => a.responsable_id === collab.id
    );

    const total = actionsCollab.length;
    const enCours = actionsCollab.filter((a) => a.statut === 'wip').length;
    const todo = actionsCollab.filter((a) => a.statut === 'todo').length;
    const bloquees = actionsCollab.filter((a) => a.statut === 'blocked').length;
    const terminees = actionsCollab.filter((a) => a.statut === 'done').length;

    const enRetard = actionsCollab.filter((a) => {
      if (!a.echeance || a.statut === 'done') return false;
      const echeance = new Date(a.echeance);
      return echeance < today;
    }).length;

    const faitesDansMois = actionsCollab.filter((a) => {
      if (a.statut !== 'done' || !a.updated_at) return false;
      const updatedAt = new Date(a.updated_at);
      return updatedAt >= startOfMonth;
    }).length;

    const tauxAvancement = total > 0 ? Math.round((terminees / total) * 100) : 0;

    return {
      ...collab,
      stats: {
        total,
        enCours,
        todo,
        bloquees,
        terminees,
        enRetard,
        faitesDansMois,
        tauxAvancement,
      },
    };
  });

  // Stats globales de l'équipe
  const statsEquipe = {
    totalActions: actions?.length || 0,
    totalCollaborateurs: collaborateurs?.length || 0,
    actionsEnRetard: collaborateursAvecStats.reduce(
      (sum, c) => sum + c.stats.enRetard,
      0
    ),
    actionsFaitesMois: collaborateursAvecStats.reduce(
      (sum, c) => sum + c.stats.faitesDansMois,
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Vue par collaborateur</h1>
        <p className="mt-2 text-text2">
          Indicateurs détaillés de chaque membre de l'équipe{' '}
          <span className="font-semibold text-accent">{equipe?.nom}</span>
        </p>
      </div>

      {/* Stats globales équipe */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Collaborateurs</p>
              <p className="mt-2 text-3xl font-bold text-text">
                {statsEquipe.totalCollaborateurs}
              </p>
            </div>
            <div className="p-3 bg-accent/10 rounded-full">
              <Users className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Total actions</p>
              <p className="mt-2 text-3xl font-bold text-text">
                {statsEquipe.totalActions}
              </p>
            </div>
            <div className="p-3 bg-bg3 rounded-full">
              <TrendingUp className="w-6 h-6 text-text2" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">En retard (équipe)</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  statsEquipe.actionsEnRetard > 0 ? 'text-red-500' : 'text-text3'
                }`}
              >
                {statsEquipe.actionsEnRetard}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Faites ce mois</p>
              <p className="mt-2 text-3xl font-bold text-green-500">
                {statsEquipe.actionsFaitesMois}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des collaborateurs */}
      <div className="card">
        <div className="border-b border-border pb-4 mb-4">
          <h2 className="text-lg font-semibold text-text flex items-center">
            <Users className="w-5 h-5 mr-2 text-accent" />
            Indicateurs par collaborateur
          </h2>
        </div>

        {!collaborateursAvecStats || collaborateursAvecStats.length === 0 ? (
          <div className="py-12 text-center">
            <User className="w-12 h-12 text-text3 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              Aucun collaborateur
            </h3>
            <p className="text-text2">
              Aucun collaborateur n'est assigné à votre équipe
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-bg3">
                <tr>
                  <th className="px-6 py-3 text-left label">Collaborateur</th>
                  <th className="px-6 py-3 text-center label">Total</th>
                  <th className="px-6 py-3 text-center label">À faire</th>
                  <th className="px-6 py-3 text-center label">En cours</th>
                  <th className="px-6 py-3 text-center label">Bloquées</th>
                  <th className="px-6 py-3 text-center label">Terminées</th>
                  <th className="px-6 py-3 text-center label">En retard</th>
                  <th className="px-6 py-3 text-center label">Faites/mois</th>
                  <th className="px-6 py-3 text-center label">Avancement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {collaborateursAvecStats.map((collab) => (
                  <tr key={collab.id} className="hover:bg-bg2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-accent">
                            {collab.prenom?.charAt(0)}
                            {collab.nom?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text">
                            {collab.prenom} {collab.nom}
                          </div>
                          <div className="text-xs text-text3">{collab.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-text">
                        {collab.stats.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="status-badge sb-todo">
                        {collab.stats.todo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="status-badge sb-wip">
                        {collab.stats.enCours}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="status-badge sb-blocked">
                        {collab.stats.bloquees}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="status-badge sb-done">
                        {collab.stats.terminees}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          collab.stats.enRetard > 0
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-bg3 text-text3'
                        }`}
                      >
                        {collab.stats.enRetard}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
                        {collab.stats.faitesDansMois}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-20 bg-bg3 rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full transition-all"
                            style={{ width: `${collab.stats.tauxAvancement}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text2">
                          {collab.stats.tauxAvancement}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
