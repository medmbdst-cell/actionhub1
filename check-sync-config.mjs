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

async function checkSyncConfig() {
  console.log('🔍 Configuration de synchronisation du plan AE...\n');

  // Récupérer le plan
  const { data: plan } = await supabase
    .from('plans_action')
    .select('id, nom, google_drive_file_id')
    .eq('nom', 'AE')
    .single();

  if (!plan) {
    console.log('❌ Plan AE non trouvé');
    return;
  }

  console.log(`📋 Plan: ${plan.nom}`);
  console.log(`   Drive File ID: ${plan.google_drive_file_id}\n`);

  // Récupérer la config de sync
  const { data: syncConfig } = await supabase
    .from('google_drive_synced_files')
    .select('*')
    .eq('drive_file_id', plan.google_drive_file_id)
    .single();

  if (!syncConfig) {
    console.log('❌ Configuration de sync non trouvée');
    return;
  }

  console.log('🔄 Configuration de synchronisation:');
  console.log(`   Fichier: ${syncConfig.drive_file_name}`);
  console.log(`   Feuille: "${syncConfig.sheet_name}" ⬅️ IMPORTANTE !`);
  console.log(`   Mode: ${syncConfig.sync_mode}`);
  console.log(`   Sync activée: ${syncConfig.sync_enabled}`);
  console.log(`   Dernière sync: ${syncConfig.last_synced_at}`);

  console.log('\n📝 Mapping des colonnes:');
  const mapping = syncConfig.column_mapping;
  for (const [key, value] of Object.entries(mapping)) {
    console.log(`   ${key}: "${value}"`);
  }

  console.log('\n⚠️  IMPORTANT:');
  console.log(`   Tes actions TEST doivent être dans la feuille: "${syncConfig.sheet_name}"`);
  console.log('   Dans ton fichier Google Sheets, vérifie que tu as modifié la bonne feuille !');
}

checkSyncConfig().then(() => {
  console.log('\n✅ Vérification terminée');
  process.exit(0);
});
