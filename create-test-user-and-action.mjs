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

async function createTestUserAndAction() {
  console.log('🎯 Création utilisateur TEST et action...\n');

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

  // Vérifier si l'utilisateur existe déjà
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, nom, prenom, email')
    .eq('email', 'medmbdst@gmail.com')
    .single();

  let userId;
  if (existingUser) {
    console.log(`✅ Utilisateur déjà existant: ${existingUser.prenom} ${existingUser.nom}`);
    userId = existingUser.id;
  } else {
    // Créer l'utilisateur dans auth.users d'abord
    console.log('⚠️  Pour créer un utilisateur, il faut le créer via Supabase Auth.');
    console.log('   Pour tester rapidement, modifions plutôt l\'email de Pierre Martin.');

    // Modifier temporairement l'email de Pierre Martin
    const { data: pierre } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('prenom', 'Pierre')
      .ilike('nom', 'Martin')
      .single();

    console.log(`\n📝 Modification email de Pierre Martin:`);
    console.log(`   Ancien: ${pierre.email}`);
    console.log(`   Nouveau: medmbdst@gmail.com (pour test Resend)`);

    await supabase
      .from('profiles')
      .update({ email: 'medmbdst@gmail.com' })
      .eq('id', pierre.id);

    userId = pierre.id;
  }

  // Créer une action TEST assignée à cet utilisateur
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const testAction = {
    tenant_id: tenant.id,
    plan_id: plan.id,
    description: 'TEST EMAIL - Action urgente en retard',
    responsable_id: userId,
    responsable_txt: 'Test Resend',
    echeance: yesterday.toISOString().split('T')[0],
    statut: 'todo',
  };

  const { data: created } = await supabase
    .from('actions')
    .insert(testAction)
    .select();

  console.log(`\n✅ Action TEST créée pour medmbdst@gmail.com`);
  console.log(`   Description: ${testAction.description}`);
  console.log(`   Échéance: ${testAction.echeance} (hier)`);
  console.log('\n📧 Lance maintenant: curl -X GET http://localhost:3000/api/cron/notify-echeances');
  console.log('   Tu devrais recevoir un email à medmbdst@gmail.com !');
}

createTestUserAndAction().then(() => {
  process.exit(0);
});
