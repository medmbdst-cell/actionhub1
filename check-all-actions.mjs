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

async function checkAllActions() {
  console.log('🔍 Vérification de toutes les actions du plan AE...\n');

  // Récupérer le plan
  const { data: plan } = await supabase
    .from('plans_action')
    .select('id, nom')
    .eq('nom', 'AE')
    .single();

  if (!plan) {
    console.log('❌ Plan AE non trouvé');
    return;
  }

  console.log(`📋 Plan: ${plan.nom} (${plan.id})\n`);

  // Récupérer toutes les actions
  const { data: actions, error } = await supabase
    .from('actions')
    .select(`
      id,
      description,
      echeance,
      responsable_txt,
      created_at
    `)
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`✅ ${actions?.length || 0} action(s) les plus récentes:\n`);

  for (const action of actions || []) {
    console.log(`  - ${action.description.substring(0, 70)}...`);
    console.log(`    Échéance: ${action.echeance || 'N/A'}`);
    console.log(`    Responsable: ${action.responsable_txt || 'N/A'}`);
    console.log(`    Créée: ${new Date(action.created_at).toLocaleString('fr-FR')}`);
    console.log('');
  }
}

checkAllActions().then(() => {
  console.log('✅ Vérification terminée');
  process.exit(0);
});
