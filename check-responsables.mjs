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

async function checkResponsables() {
  console.log('🔍 Vérification des responsables dans les actions récentes...\n');

  // Récupérer le plan
  const { data: plan } = await supabase
    .from('plans_action')
    .select('id')
    .eq('nom', 'AE')
    .single();

  // Récupérer les 15 actions les plus récentes
  const { data: actions } = await supabase
    .from('actions')
    .select('id, description, responsable_txt, responsable_id')
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })
    .limit(15);

  console.log('📋 15 actions les plus récentes:\n');

  const responsables = new Map();

  for (const action of actions || []) {
    const respTxt = action.responsable_txt || 'N/A';
    console.log(`  ${action.description.substring(0, 50)}...`);
    console.log(`    responsable_txt: "${respTxt}"`);
    console.log(`    responsable_id: ${action.responsable_id || 'NULL (pas de match)'}\n`);

    if (respTxt !== 'N/A') {
      responsables.set(respTxt, (responsables.get(respTxt) || 0) + 1);
    }
  }

  console.log('\n📊 Valeurs uniques de responsable_txt:');
  for (const [resp, count] of responsables.entries()) {
    console.log(`   - "${resp}" (${count} action(s))`);
  }

  // Lister les utilisateurs disponibles
  console.log('\n👥 Utilisateurs disponibles pour le matching:');
  const { data: users } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .eq('tenant_id', (await supabase.from('tenants').select('id').eq('nom', 'Acme Corporation').single()).data.id)
    .order('nom');

  for (const user of users || []) {
    console.log(`   - ${user.prenom} ${user.nom} (${user.email})`);
  }
}

checkResponsables().then(() => {
  console.log('\n✅ Terminé');
  process.exit(0);
});
