/**
 * Module de matching intelligent pour associer automatiquement
 * les noms des fichiers Excel aux utilisateurs de la plateforme
 *
 * Format attendu dans les fichiers Excel :
 * - Format de base : "MORANDINI" (nom de famille uniquement)
 * - Si homonymes : "P MORANDINI" (initiale prénom + nom)
 * - Si plusieurs homonymes : "PA MORANDINI" (initiales + nom)
 *
 * Algorithme :
 * 1. Parser le texte pour extraire initiale(s) et nom
 * 2. Normaliser (lowercase, accents, trim)
 * 3. Chercher dans profiles du tenant
 * 4. Si ambiguïté ou inexistant → créer une issue pour résolution admin
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Résultat du matching
 */
export interface MatchingResult {
  success: boolean;
  responsableId: string | null;
  issue: {
    raison: 'ambiguite' | 'inexistant' | 'format_invalide';
    candidats?: Array<{
      id: string;
      nom: string;
      prenom: string;
      email: string;
    }>;
    message: string;
  } | null;
}

/**
 * Parse le texte du responsable pour extraire initiale(s) et nom
 *
 * Exemples :
 * - "MORANDINI" → { initiale: null, nom: "MORANDINI" }
 * - "P MORANDINI" → { initiale: "P", nom: "MORANDINI" }
 * - "PA MORANDINI" → { initiale: "PA", nom: "MORANDINI" }
 * - "P. MORANDINI" → { initiale: "P", nom: "MORANDINI" }
 */
function parseResponsableTxt(responsableTxt: string): {
  initiale: string | null;
  nom: string;
} {
  // Nettoyer le texte
  const cleaned = responsableTxt
    .trim()
    .replace(/\s+/g, ' ') // Remplacer multiples espaces par un seul
    .replace(/\./g, ''); // Retirer les points (P. → P)

  // Cas 1 : Pas d'espace → juste un nom
  if (!cleaned.includes(' ')) {
    return {
      initiale: null,
      nom: cleaned,
    };
  }

  // Cas 2 : Avec espace → séparer initiale et nom
  const parts = cleaned.split(' ');

  // Première partie = initiale (1 à 3 caractères max)
  // Reste = nom
  const firstPart = parts[0];
  const restParts = parts.slice(1).join(' ');

  // Si la première partie est courte (1-3 chars), c'est probablement une initiale
  if (firstPart.length <= 3) {
    return {
      initiale: firstPart,
      nom: restParts,
    };
  }

  // Sinon, c'est peut-être "Pierre MORANDINI" (prénom complet)
  // Dans ce cas, on prend la première lettre comme initiale
  return {
    initiale: firstPart[0],
    nom: restParts,
  };
}

/**
 * Normalise une chaîne pour la comparaison
 * - Lowercase
 * - Supprime les accents
 * - Trim
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .trim();
}

/**
 * Trouve les utilisateurs correspondants dans la base
 */
async function findCandidates(
  supabase: SupabaseClient,
  tenantId: string,
  nom: string,
  initiale: string | null
): Promise<Array<{
  id: string;
  nom: string;
  prenom: string;
  email: string;
}>> {
  const nomNormalized = normalize(nom);

  // Construire la requête
  let query = supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .eq('tenant_id', tenantId)
    .eq('actif', true); // Seulement les utilisateurs actifs

  // Filtrer par nom (insensible à la casse)
  // Note : On utilise ilike pour PostgreSQL (case-insensitive LIKE)
  query = query.ilike('nom', nomNormalized);

  // Si on a une initiale, filtrer aussi par prénom
  if (initiale) {
    const initialeNormalized = normalize(initiale);

    // Le prénom doit commencer par l'initiale
    // Ex: "P" → prénom LIKE 'p%'
    // Ex: "PA" → prénom LIKE 'pa%'
    query = query.ilike('prenom', `${initialeNormalized}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erreur recherche candidats:', error);
    return [];
  }

  return data || [];
}

/**
 * Effectue le matching automatique entre un nom et les utilisateurs
 *
 * @param supabase Client Supabase
 * @param tenantId ID du tenant
 * @param responsableTxt Texte du responsable depuis le fichier Excel
 * @returns Résultat du matching avec ID du responsable ou issue à résoudre
 */
export async function matchResponsable(
  supabase: SupabaseClient,
  tenantId: string,
  responsableTxt: string
): Promise<MatchingResult> {
  // Si pas de texte, retourner null
  if (!responsableTxt || responsableTxt.trim() === '') {
    return {
      success: true,
      responsableId: null,
      issue: null,
    };
  }

  try {
    // Parser le texte
    const { initiale, nom } = parseResponsableTxt(responsableTxt);

    // Chercher les candidats
    const candidats = await findCandidates(supabase, tenantId, nom, initiale);

    // Cas 1 : Aucun candidat trouvé
    if (candidats.length === 0) {
      return {
        success: false,
        responsableId: null,
        issue: {
          raison: 'inexistant',
          candidats: [],
          message: initiale
            ? `Aucun utilisateur trouvé avec le nom "${nom}" et le prénom commençant par "${initiale}"`
            : `Aucun utilisateur trouvé avec le nom "${nom}"`,
        },
      };
    }

    // Cas 2 : Un seul candidat → Match automatique
    if (candidats.length === 1) {
      return {
        success: true,
        responsableId: candidats[0].id,
        issue: null,
      };
    }

    // Cas 3 : Plusieurs candidats → Ambiguïté
    return {
      success: false,
      responsableId: null,
      issue: {
        raison: 'ambiguite',
        candidats: candidats,
        message: initiale
          ? `${candidats.length} utilisateurs trouvés avec le nom "${nom}" et le prénom commençant par "${initiale}". Veuillez choisir le bon utilisateur.`
          : `${candidats.length} utilisateurs trouvés avec le nom "${nom}". Veuillez ajouter l'initiale du prénom pour lever l'ambiguïté.`,
      },
    };
  } catch (error) {
    console.error('Erreur matching:', error);
    return {
      success: false,
      responsableId: null,
      issue: {
        raison: 'format_invalide',
        message: `Erreur lors du matching: ${error}`,
      },
    };
  }
}

/**
 * Traite un batch d'actions pour faire le matching en masse
 *
 * @param supabase Client Supabase
 * @param tenantId ID du tenant
 * @param actions Liste des actions avec responsable_txt à matcher
 * @returns Map des actions avec leur résultat de matching
 */
export async function matchResponsablesBatch(
  supabase: SupabaseClient,
  tenantId: string,
  actions: Array<{ responsable_txt?: string }>
): Promise<Map<number, MatchingResult>> {
  const results = new Map<number, MatchingResult>();

  // Pour optimiser, on pourrait faire un seul appel à la DB
  // et filtrer en mémoire, mais pour simplifier on fait appel par appel
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.responsable_txt) {
      const result = await matchResponsable(
        supabase,
        tenantId,
        action.responsable_txt
      );
      results.set(i, result);
    }
  }

  return results;
}

/**
 * Teste l'algorithme de parsing
 * Utile pour le debug
 */
export function testParsing(examples: string[]) {
  console.log('=== TEST PARSING ===');
  examples.forEach((example) => {
    const result = parseResponsableTxt(example);
    console.log(`"${example}" → initiale: "${result.initiale}", nom: "${result.nom}"`);
  });
}

// Export pour tests
export { parseResponsableTxt, normalize };
