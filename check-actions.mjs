import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Charger .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActions() {
  console.log('🔍 Vérification des actions avec échéances...\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Récupérer les actions avec échéances
  const { data: actions, error } = await supabase
    .from('actions')
    .select(`
      id,
      description,
      echeance,
      statut,
      responsable:profiles!actions_responsable_id_fkey(nom, prenom, email)
    `)
    .not('echeance', 'is', null)
    .neq('statut', 'done')
    .order('echeance', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`📋 ${actions?.length || 0} action(s) trouvée(s) avec échéance:\n`);

  for (const action of actions || []) {
    const echeance = new Date(action.echeance);
    const joursRestants = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let badge = '';
    if (echeance < today) {
      badge = '🔴 EN RETARD';
    } else if (joursRestants <= 7) {
      badge = '🟡 PROCHE';
    } else {
      badge = '🟢 OK';
    }

    const responsable = action.responsable
      ? `${action.responsable.prenom} ${action.responsable.nom} (${action.responsable.email})`
      : 'Non assignée';

    console.log(`  ${badge} ${action.description.substring(0, 60)}...`);
    console.log(`      Échéance: ${action.echeance} (${joursRestants > 0 ? `dans ${joursRestants}j` : `${Math.abs(joursRestants)}j de retard`})`);
    console.log(`      Responsable: ${responsable}`);
    console.log(`      Statut: ${action.statut}`);
    console.log('');
  }
}

checkActions().then(() => {
  console.log('✅ Vérification terminée');
  process.exit(0);
});
