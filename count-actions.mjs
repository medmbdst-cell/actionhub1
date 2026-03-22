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

async function countActions() {
  // Récupérer le plan
  const { data: plan } = await supabase
    .from('plans_action')
    .select('id, nom')
    .eq('nom', 'AE')
    .single();

  if (!plan) {
    console.log('❌ Plan non trouvé');
    return;
  }

  // Compter toutes les actions
  const { count } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id);

  console.log(`📊 Plan "${plan.nom}": ${count} action(s) au total`);
  console.log('\n🔍 Détails:');

  // Actions avec échéances
  const { count: avecEcheance } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id)
    .not('echeance', 'is', null);

  console.log(`   - ${avecEcheance} avec échéance`);

  // Actions assignées
  const { count: assignees } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id)
    .not('responsable_id', 'is', null);

  console.log(`   - ${assignees} assignées à un responsable`);

  // Actions créées récemment (dernière heure)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { count: recent } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id)
    .gte('created_at', oneHourAgo.toISOString());

  console.log(`   - ${recent} créées dans la dernière heure`);

  console.log('\n💡 Si tu as ajouté 4 lignes TEST mais que le total est toujours 35,');
  console.log('   cela signifie que les nouvelles lignes n\'ont pas été synchronisées.');
}

countActions().then(() => {
  console.log('\n✅ Terminé');
  process.exit(0);
});
