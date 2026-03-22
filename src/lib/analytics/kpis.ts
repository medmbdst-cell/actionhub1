/**
 * Fonctions de calcul des KPIs pour les dashboards analytiques
 */

interface Action {
  id: string;
  statut: string;
  echeance?: string | null;
  created_at: string;
  priorite?: string | null;
}

/**
 * Vérifie si une action est terminée
 */
export function isActionCompleted(statut: string): boolean {
  return statut === 'done' || statut === '100%';
}

/**
 * Vérifie si une action est en retard
 * (échéance dépassée ET non terminée)
 */
export function isActionLate(action: Action): boolean {
  if (!action.echeance) return false;
  if (isActionCompleted(action.statut)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const echeance = new Date(action.echeance);
  return echeance < today;
}

/**
 * Vérifie si une action a été terminée ce mois
 */
export function isActionCompletedThisMonth(action: Action): boolean {
  if (!isActionCompleted(action.statut)) return false;

  const now = new Date();
  const actionDate = new Date(action.created_at);

  return (
    actionDate.getMonth() === now.getMonth() &&
    actionDate.getFullYear() === now.getFullYear()
  );
}

/**
 * Calcule les statistiques globales
 */
export function calculateGlobalStats(actions: Action[]) {
  const total = actions.length;
  const completed = actions.filter(a => isActionCompleted(a.statut)).length;
  const late = actions.filter(a => isActionLate(a)).length;
  const completedThisMonth = actions.filter(a => isActionCompletedThisMonth(a)).length;
  const inProgress = actions.filter(a => !isActionCompleted(a.statut)).length;

  return {
    total,
    completed,
    late,
    completedThisMonth,
    inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Calcule la répartition par statut pour le pie chart
 */
export function calculateStatusDistribution(actions: Action[]) {
  const counts: Record<string, number> = {};

  actions.forEach(action => {
    const statut = action.statut;

    // Regrouper les pourcentages
    if (statut.includes('%')) {
      const percentage = parseInt(statut);
      if (percentage === 0) {
        counts['À faire'] = (counts['À faire'] || 0) + 1;
      } else if (percentage === 100) {
        counts['Terminé'] = (counts['Terminé'] || 0) + 1;
      } else {
        counts['En cours'] = (counts['En cours'] || 0) + 1;
      }
    } else {
      // Statuts textuels
      switch (statut) {
        case 'todo':
          counts['À faire'] = (counts['À faire'] || 0) + 1;
          break;
        case 'wip':
          counts['En cours'] = (counts['En cours'] || 0) + 1;
          break;
        case 'blocked':
          counts['Bloqué'] = (counts['Bloqué'] || 0) + 1;
          break;
        case 'done':
          counts['Terminé'] = (counts['Terminé'] || 0) + 1;
          break;
        default:
          counts['Autre'] = (counts['Autre'] || 0) + 1;
      }
    }
  });

  // Couleurs par statut
  const colors: Record<string, string> = {
    'À faire': '#9CA3AF',      // gray-400
    'En cours': '#3B82F6',     // blue-500
    'Bloqué': '#EF4444',       // red-500
    'Terminé': '#10B981',      // green-500
    'Autre': '#6B7280',        // gray-500
  };

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: colors[name] || '#6B7280',
  }));
}

/**
 * Calcule la répartition par priorité pour le bar chart
 */
export function calculatePriorityDistribution(actions: Action[]) {
  const priorities = ['Haute', 'Moyenne', 'Basse', 'Non définie'];
  const counts: Record<string, number> = {
    'Haute': 0,
    'Moyenne': 0,
    'Basse': 0,
    'Non définie': 0,
  };

  actions.forEach(action => {
    const priorite = action.priorite?.trim();
    if (!priorite) {
      counts['Non définie']++;
    } else if (priorite.toLowerCase().includes('haute') || priorite.toLowerCase().includes('high')) {
      counts['Haute']++;
    } else if (priorite.toLowerCase().includes('moyenne') || priorite.toLowerCase().includes('medium')) {
      counts['Moyenne']++;
    } else if (priorite.toLowerCase().includes('basse') || priorite.toLowerCase().includes('low')) {
      counts['Basse']++;
    } else {
      counts['Non définie']++;
    }
  });

  const colors: Record<string, string> = {
    'Haute': '#EF4444',        // red-500
    'Moyenne': '#F59E0B',      // amber-500
    'Basse': '#10B981',        // green-500
    'Non définie': '#9CA3AF',  // gray-400
  };

  return priorities.map(name => ({
    name,
    count: counts[name],
    color: colors[name],
  }));
}
