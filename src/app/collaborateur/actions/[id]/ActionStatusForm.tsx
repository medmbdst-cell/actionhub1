'use client';

/**
 * Formulaire de mise à jour du statut d'une action (Collaborateur)
 */

import { useState, useTransition } from 'react';
import { updateMyActionStatut } from '@/app/actions/collaborateur';
import { useRouter } from 'next/navigation';

interface ActionStatusFormProps {
  actionId: string;
  currentStatut: string;
}

const STATUTS = [
  { value: 'todo', label: 'À faire', color: 'text-gray-700' },
  { value: 'wip', label: 'En cours', color: 'text-blue-700' },
  { value: 'blocked', label: 'Bloqué', color: 'text-orange-700' },
  { value: 'done', label: 'Terminé', color: 'text-green-700' },
] as const;

export function ActionStatusForm({ actionId, currentStatut }: ActionStatusFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(currentStatut);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateMyActionStatut({
        actionId,
        statut: statut as 'todo' | 'wip' | 'blocked' | 'done',
        commentaire: commentaire.trim() || undefined,
      });

      if (result.success) {
        setSuccess(true);
        setCommentaire('');
        router.refresh();
        // Success message disappears after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Erreur lors de la mise à jour');
      }
    });
  };

  const hasChanged = statut !== currentStatut || commentaire.trim() !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Statut */}
      <div>
        <label htmlFor="statut" className="block text-sm font-medium text-gray-700 mb-2">
          Nouveau statut
        </label>
        <select
          id="statut"
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Commentaire */}
      <div>
        <label htmlFor="commentaire" className="block text-sm font-medium text-gray-700 mb-2">
          Commentaire (optionnel)
        </label>
        <textarea
          id="commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={4}
          placeholder="Ajouter un commentaire sur cette mise à jour..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          Statut mis à jour avec succès !
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !hasChanged}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isPending ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  );
}
