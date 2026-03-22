'use client';

/**
 * Carte affichant une issue de matching avec les options de résolution
 */

import { useState } from 'react';
import { AlertCircle, Users, UserX, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { resolveMatchingIssue, skipMatchingIssue, retryMatching } from '@/app/actions/matching';

interface Candidat {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface MatchingIssueCardProps {
  issue: {
    id: string;
    responsable_txt: string;
    raison: 'ambiguite' | 'inexistant' | 'format_invalide';
    candidats: any;
    created_at: string;
    action_id: string;
    actions: {
      id: string;
      description: string;
      source_file: string;
      plans_action: {
        nom: string;
      };
    };
  };
  tenantId: string;
}

export function MatchingIssueCard({ issue, tenantId }: MatchingIssueCardProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  // Parser les candidats (stockés en JSON)
  let candidats: Candidat[] = [];
  try {
    candidats = issue.candidats ? JSON.parse(issue.candidats as any) : [];
  } catch (e) {
    console.error('Erreur parsing candidats:', e);
  }

  const handleResolve = async () => {
    if (!selectedUserId) {
      alert('Veuillez sélectionner un utilisateur');
      return;
    }

    setIsResolving(true);

    const result = await resolveMatchingIssue({
      issueId: issue.id,
      actionId: issue.action_id,
      responsableId: selectedUserId,
    });

    setIsResolving(false);

    if (result.success) {
      setIsResolved(true);
    } else {
      alert(result.error || 'Erreur lors de la résolution');
    }
  };

  const handleSkip = async () => {
    setIsResolving(true);

    const result = await skipMatchingIssue({
      issueId: issue.id,
    });

    setIsResolving(false);

    if (result.success) {
      setIsResolved(true);
    } else {
      alert(result.error || 'Erreur');
    }
  };

  const handleRetry = async () => {
    setIsResolving(true);

    const result = await retryMatching({
      issueId: issue.id,
      actionId: issue.action_id,
      responsableTxt: issue.responsable_txt,
    });

    setIsResolving(false);

    if (result.success) {
      alert(result.message || 'Utilisateur trouvé et assigné !');
      setIsResolved(true);
    } else if (result.candidats && result.candidats.length > 0) {
      alert(`Plusieurs utilisateurs trouvés (${result.candidats.length}). Veuillez choisir manuellement.`);
      // TODO: Afficher les candidats pour sélection manuelle
      window.location.reload();
    } else {
      alert(result.error || result.message || 'Aucun utilisateur trouvé');
    }
  };

  if (isResolved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
        <span className="text-sm text-green-800">Issue résolue avec succès</span>
      </div>
    );
  }

  const getRaisonIcon = () => {
    switch (issue.raison) {
      case 'ambiguite':
        return <Users className="w-6 h-6 text-yellow-600" />;
      case 'inexistant':
        return <UserX className="w-6 h-6 text-red-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
    }
  };

  const getRaisonLabel = () => {
    switch (issue.raison) {
      case 'ambiguite':
        return 'Plusieurs utilisateurs trouvés';
      case 'inexistant':
        return 'Aucun utilisateur trouvé';
      default:
        return 'Format invalide';
    }
  };

  const getRaisonColor = () => {
    switch (issue.raison) {
      case 'ambiguite':
        return 'yellow';
      case 'inexistant':
        return 'red';
      default:
        return 'orange';
    }
  };

  const color = getRaisonColor();

  return (
    <div className={`bg-white border-2 border-${color}-200 rounded-lg shadow`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start">
            {getRaisonIcon()}
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {issue.responsable_txt}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                {getRaisonLabel()}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(issue.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>

        {/* Action concernée */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Action concernée :</p>
          <p className="text-sm text-gray-900">{issue.actions.description}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>📁 {issue.actions.plans_action.nom}</span>
            <span>📄 {issue.actions.source_file}</span>
          </div>
        </div>

        {/* Cas ambigus : liste des candidats */}
        {issue.raison === 'ambiguite' && candidats.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-gray-700">
              Sélectionnez le bon utilisateur :
            </p>
            {candidats.map((candidat) => (
              <label
                key={candidat.id}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedUserId === candidat.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name={`candidat-${issue.id}`}
                  value={candidat.id}
                  checked={selectedUserId === candidat.id}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {candidat.prenom} {candidat.nom}
                  </p>
                  <p className="text-xs text-gray-500">{candidat.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Cas inexistant : message d'aide */}
        {issue.raison === 'inexistant' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              <strong>Utilisateur inexistant.</strong> Vous devez d'abord créer l'utilisateur <strong>"{issue.responsable_txt}"</strong> dans la section "Utilisateurs", puis revenir ici pour l'assigner.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {issue.raison === 'ambiguite' && (
            <button
              onClick={handleResolve}
              disabled={!selectedUserId || isResolving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Résolution...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Assigner
                </>
              )}
            </button>
          )}

          {issue.raison === 'inexistant' && (
            <>
              <button
                onClick={handleRetry}
                disabled={isResolving}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-tenter le matching
                  </>
                )}
              </button>
              <a
                href="/admin/users"
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-center"
              >
                Créer l'utilisateur
              </a>
            </>
          )}

          <button
            onClick={handleSkip}
            disabled={isResolving}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
