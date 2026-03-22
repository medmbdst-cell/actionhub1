'use client';

/**
 * Page d'invitation d'un nouvel utilisateur
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createTenantUser, getTenantTeams } from '@/app/actions/users';

type Team = {
  id: string;
  nom: string;
  description: string | null;
};

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    prenom: '',
    nom: '',
    role: 'collaborateur' as 'admin' | 'responsable' | 'collaborateur',
    equipe_id: '',
  });

  // Charger les équipes au montage
  useEffect(() => {
    const loadTeams = async () => {
      const result = await getTenantTeams();
      if (result.success && result.data) {
        setTeams(result.data);
      }
    };
    loadTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createTenantUser({
        email: formData.email,
        prenom: formData.prenom,
        nom: formData.nom,
        role: formData.role,
        equipe_id: formData.equipe_id || undefined,
      });

      if (result.success) {
        router.push('/admin/users');
      } else {
        setError(result.error || 'Erreur lors de la création de l\'utilisateur');
      }
    } catch (err) {
      setError('Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showTeamSelector = formData.role === 'responsable' || formData.role === 'collaborateur';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux utilisateurs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Inviter un utilisateur</h1>
        <p className="mt-2 text-gray-600">
          Créez un nouveau compte utilisateur pour votre organisation
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="prenom"
                required
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Jean"
              />
            </div>

            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nom"
                required
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="jean.dupont@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Un email d'invitation sera envoyé à cette adresse
            </p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="collaborateur">Collaborateur</option>
              <option value="responsable">Responsable d'équipe</option>
              <option value="admin">Administrateur</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.role === 'admin' && 'Accès complet à toutes les fonctionnalités'}
              {formData.role === 'responsable' && 'Gestion d\'une équipe et de ses actions'}
              {formData.role === 'collaborateur' && 'Gestion de ses propres actions'}
            </p>
          </div>

          {showTeamSelector && (
            <div>
              <label htmlFor="equipe_id" className="block text-sm font-medium text-gray-700 mb-2">
                Équipe {formData.role === 'responsable' && <span className="text-red-500">*</span>}
              </label>
              <select
                id="equipe_id"
                required={formData.role === 'responsable'}
                value={formData.equipe_id}
                onChange={(e) => setFormData({ ...formData, equipe_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Sélectionnez une équipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.nom}
                  </option>
                ))}
              </select>
              {teams.length === 0 && (
                <p className="mt-1 text-xs text-orange-600">
                  Aucune équipe disponible. <Link href="/admin/teams/new" className="underline">Créez-en une d'abord</Link>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Link
              href="/admin/users"
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Inviter l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
