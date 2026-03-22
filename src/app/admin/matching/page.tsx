/**
 * Page admin pour résoudre les problèmes de matching
 * Affiche les actions dont le responsable n'a pas pu être identifié automatiquement
 */

import { createClient } from '@/lib/supabase/server';
import { AlertCircle, CheckCircle, UserX, Users } from 'lucide-react';
import { MatchingIssueCard } from './MatchingIssueCard';

export default async function MatchingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;

  // Récupérer les issues non résolues
  const { data: issues } = await supabase
    .from('action_matching_issues')
    .select(`
      id,
      responsable_txt,
      raison,
      candidats,
      created_at,
      action_id,
      actions (
        id,
        description,
        plan_id,
        source_file,
        plans_action (
          nom
        )
      )
    `)
    .eq('tenant_id', tenantId!)
    .eq('resolu', false)
    .order('created_at', { ascending: false });

  // Récupérer les issues résolues récemment (7 derniers jours)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: resolvedIssues } = await supabase
    .from('action_matching_issues')
    .select('id')
    .eq('tenant_id', tenantId!)
    .eq('resolu', true)
    .gte('resolu_le', sevenDaysAgo.toISOString());

  // Statistiques
  const stats = {
    total: (issues?.length || 0) + (resolvedIssues?.length || 0),
    aResoudre: issues?.length || 0,
    ambigus: issues?.filter((i) => i.raison === 'ambiguite').length || 0,
    inexistants: issues?.filter((i) => i.raison === 'inexistant').length || 0,
    resolus: resolvedIssues?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Matching des responsables</h1>
        <p className="mt-2 text-gray-600">
          Résolvez les actions dont le pilote n'a pas pu être identifié automatiquement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">À résoudre</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">{stats.aResoudre}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ambigus</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.ambigus}</p>
            </div>
            <Users className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inexistants</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.inexistants}</p>
            </div>
            <UserX className="w-12 h-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Résolus (7j)</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.resolus}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      {stats.aResoudre > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Comment résoudre ?</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p><strong>Cas ambigus :</strong> Plusieurs utilisateurs correspondent au nom. Choisissez le bon utilisateur.</p>
                <p><strong>Cas inexistants :</strong> Aucun utilisateur trouvé. Créez l'utilisateur d'abord, puis assignez-le.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des issues */}
      {!issues || issues.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Tous les matchings sont résolus !
          </h3>
          <p className="text-gray-600">
            Toutes les actions importées ont un pilote identifié.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Issues à résoudre ({stats.aResoudre})
          </h2>

          {issues.map((issue) => (
            <MatchingIssueCard
              key={issue.id}
              issue={issue}
              tenantId={tenantId!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
