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

async function checkTestActions() {
  console.log('🔍 Vérification des actions TEST...\n');

  // Récupérer les actions TEST
  const { data: testActions, error } = await supabase
    .from('actions')
    .select(`
      id,
      description,
      echeance,
      statut,
      responsable_txt,
      responsable:profiles!actions_responsable_id_fkey(id, nom, prenom, email)
    `)
    .ilike('description', 'TEST%')
    .order('echeance', { ascending: true });

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  if (!testActions || testActions.length === 0) {
    console.log('❌ Aucune action TEST trouvée');
    console.log('\nVérifie que :');
    console.log('  1. Le fichier Google Sheets a bien été sauvegardé');
    console.log('  2. Les actions commencent par "TEST"');
    return;
  }

  console.log(`✅ ${testActions.length} action(s) TEST trouvée(s):\n`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const action of testActions) {
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

    console.log(`  ${badge} ${action.description}`);
    console.log(`      Échéance: ${action.echeance} (${joursRestants > 0 ? `dans ${joursRestants}j` : `${Math.abs(joursRestants)}j de retard`})`);
    console.log(`      Responsable texte: ${action.responsable_txt || 'N/A'}`);

    if (action.responsable) {
      console.log(`      ✅ ASSIGNÉE à: ${action.responsable.prenom} ${action.responsable.nom} (${action.responsable.email})`);
    } else {
      console.log(`      ❌ NON ASSIGNÉE - Le matching automatique n'a pas trouvé de correspondance`);
    }

    console.log(`      Statut: ${action.statut}`);
    console.log('');
  }

  // Résumé pour notifications
  const assignedActions = testActions.filter(a => a.responsable !== null);
  console.log(`\n📧 Notifications:`);
  console.log(`   - ${assignedActions.length} action(s) assignée(s) peuvent générer des notifications`);
  console.log(`   - ${testActions.length - assignedActions.length} action(s) non assignée(s) seront ignorées`);
}

checkTestActions().then(() => {
  console.log('\n✅ Vérification terminée');
  process.exit(0);
});
