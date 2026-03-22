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

async function cleanTestData() {
  console.log('🧹 Nettoyage des données TEST...\n');

  // 1. Supprimer les actions TEST
  const { data: deletedActions, error: deleteError } = await supabase
    .from('actions')
    .delete()
    .ilike('description', 'TEST%')
    .select();

  if (deleteError) {
    console.error('❌ Erreur suppression actions TEST:', deleteError);
  } else {
    console.log(`✅ ${deletedActions?.length || 0} action(s) TEST supprimée(s)`);
    if (deletedActions && deletedActions.length > 0) {
      deletedActions.forEach(action => {
        console.log(`   - ${action.description}`);
      });
    }
  }

  // 2. Restaurer l'email de Pierre Martin
  console.log('\n📧 Restauration email Pierre Martin...');

  const { data: pierre } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('prenom', 'Pierre')
    .ilike('nom', 'Martin')
    .single();

  if (pierre) {
    if (pierre.email === 'medmbdst@gmail.com') {
      await supabase
        .from('profiles')
        .update({ email: 'pierre.martin@acme-corp.com' })
        .eq('id', pierre.id);

      console.log('✅ Email Pierre Martin restauré');
      console.log('   Ancien: medmbdst@gmail.com');
      console.log('   Nouveau: pierre.martin@acme-corp.com');
    } else {
      console.log(`ℹ️  Email déjà correct: ${pierre.email}`);
    }
  }

  // 3. Statistiques finales
  console.log('\n📊 Statistiques base de données:');

  const { count: totalActions } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true });

  const { count: actionsAvecEcheance } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .not('echeance', 'is', null);

  const { count: actionsAssignees } = await supabase
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .not('responsable_id', 'is', null);

  console.log(`   Total actions: ${totalActions}`);
  console.log(`   Avec échéance: ${actionsAvecEcheance}`);
  console.log(`   Assignées: ${actionsAssignees}`);

  console.log('\n✅ Nettoyage terminé - Base prête pour la production !');
}

cleanTestData().then(() => {
  process.exit(0);
});
