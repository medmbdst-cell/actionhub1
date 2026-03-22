import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Charger .env.local manuellement
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

async function checkSyncStatus() {
  console.log('🔍 Vérification statut synchronisation...\n');

  // Récupérer tous les plans d'action
  const { data: plans, error: plansError } = await supabase
    .from('plans_action')
    .select('id, nom, google_drive_file_id, auto_sync')
    .order('created_at', { ascending: false });

  if (plansError) {
    console.error('Erreur plans:', plansError);
    return;
  }

  console.log(`📋 ${plans?.length || 0} plan(s) d'action trouvé(s):\n`);

  for (const plan of plans || []) {
    console.log(`  - ${plan.nom}`);
    console.log(`    ID: ${plan.id}`);
    console.log(`    Drive file ID: ${plan.google_drive_file_id || 'N/A'}`);
    console.log(`    Auto-sync: ${plan.auto_sync}`);
    console.log('');
  }

  // Récupérer les fichiers synchronisés
  const { data: syncedFiles, error: syncError } = await supabase
    .from('google_drive_synced_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (syncError) {
    console.error('Erreur synced files:', syncError);
    return;
  }

  console.log(`\n🔄 ${syncedFiles?.length || 0} fichier(s) dans google_drive_synced_files:\n`);

  for (const file of syncedFiles || []) {
    console.log(`  - ${file.drive_file_name}`);
    console.log(`    Drive file ID: ${file.drive_file_id}`);
    console.log(`    Sync enabled: ${file.sync_enabled}`);
    console.log(`    Last synced: ${file.last_synced_at || 'Jamais'}`);
    console.log('');
  }
}

checkSyncStatus().then(() => {
  console.log('✅ Vérification terminée');
  process.exit(0);
});
