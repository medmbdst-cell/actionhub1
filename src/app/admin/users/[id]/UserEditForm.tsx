'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/app/actions/update-user';
import { Save, Loader2 } from 'lucide-react';

interface UserEditFormProps {
  userId: string;
  currentEquipeId: string | null;
  currentRole: string;
  equipes: Array<{
    id: string;
    nom: string;
    responsable_id: string | null;
  }>;
}

export function UserEditForm({
  userId,
  currentEquipeId,
  currentRole,
  equipes,
}: UserEditFormProps) {
  const router = useRouter();
  const [equipeId, setEquipeId] = useState<string>(currentEquipeId || '');
  const [role, setRole] = useState<string>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUser({
        userId,
        equipeId: equipeId || null,
        role: role as 'admin' | 'responsable' | 'collaborateur',
      });

      if (result.success) {
        setSuccess(result.message || 'Utilisateur mis à jour avec succès');
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Message de succès */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Sélection du rôle */}
      <div>
        <label className="label">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input"
          disabled={loading}
        >
          <option value="collaborateur">Collaborateur</option>
          <option value="responsable">Responsable</option>
          <option value="admin">Admin</option>
        </select>
        <p className="mt-1 text-xs text-text3">
          Le rôle détermine les permissions de l'utilisateur dans l'application
        </p>
      </div>

      {/* Sélection de l'équipe */}
      <div>
        <label className="label">Équipe</label>
        <select
          value={equipeId}
          onChange={(e) => setEquipeId(e.target.value)}
          className="input"
          disabled={loading}
        >
          <option value="">Aucune équipe</option>
          {equipes.map((equipe) => (
            <option key={equipe.id} value={equipe.id}>
              {equipe.nom}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text3">
          L'équipe permet au responsable de voir les actions de ses collaborateurs
        </p>
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </form>
  );
}
