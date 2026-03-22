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

async function createTestActions() {
  console.log('🎯 Création des actions TEST...\n');

  // Récupérer les infos nécessaires
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('nom', 'Acme Corporation')
    .single();

  const { data: plan } = await supabase
    .from('plans_action')
    .select('id')
    .eq('nom', 'AE')
    .single();

  // Récupérer Pierre Martin et Jeanne Duponne
  const { data: pierre } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .ilike('nom', 'Martin')
    .ilike('prenom', 'Pierre')
    .single();

  const { data: jeanne } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .ilike('prenom', 'Jeanne')
    .single();

  console.log(`📋 Plan: ${plan.id}`);
  console.log(`👤 Pierre: ${pierre.prenom} ${pierre.nom} (${pierre.id})`);
  console.log(`👤 Jeanne: ${jeanne.prenom} ${jeanne.nom} (${jeanne.id})\n`);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  const in5Days = new Date(today);
  in5Days.setDate(in5Days.getDate() + 5);

  const testActions = [
    {
      tenant_id: tenant.id,
      plan_id: plan.id,
      description: 'TEST Action en retard 1 - Urgent',
      responsable_id: pierre.id,
      responsable_txt: `${pierre.prenom} ${pierre.nom}`,
      echeance: yesterday.toISOString().split('T')[0],
      statut: 'todo',
    },
    {
      tenant_id: tenant.id,
      plan_id: plan.id,
      description: 'TEST Action en retard 2 - Très urgent',
      responsable_id: jeanne.id,
      responsable_txt: `${jeanne.prenom} ${jeanne.nom}`,
      echeance: twoDaysAgo.toISOString().split('T')[0],
      statut: 'wip',
    },
    {
      tenant_id: tenant.id,
      plan_id: plan.id,
      description: 'TEST Action échéance proche 1 - À faire bientôt',
      responsable_id: pierre.id,
      responsable_txt: `${pierre.prenom} ${pierre.nom}`,
      echeance: in3Days.toISOString().split('T')[0],
      statut: 'todo',
    },
    {
      tenant_id: tenant.id,
      plan_id: plan.id,
      description: 'TEST Action échéance proche 2 - Préparation en cours',
      responsable_id: jeanne.id,
      responsable_txt: `${jeanne.prenom} ${jeanne.nom}`,
      echeance: in5Days.toISOString().split('T')[0],
      statut: 'wip',
    },
  ];

  console.log('📝 Création de 4 actions TEST:\n');

  for (const action of testActions) {
    console.log(`  ✏️  ${action.description}`);
    console.log(`     Échéance: ${action.echeance}`);
    console.log(`     Responsable: ${action.responsable_txt}`);
    console.log(`     Statut: ${action.statut}\n`);
  }

  const { data: created, error } = await supabase
    .from('actions')
    .insert(testActions)
    .select();

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ ${created.length} action(s) TEST créée(s) avec succès !`);
  console.log('\n🔔 Maintenant tu peux tester les notifications:');
  console.log('   curl -X GET http://localhost:3000/api/cron/notify-echeances');
}

createTestActions().then(() => {
  process.exit(0);
});
