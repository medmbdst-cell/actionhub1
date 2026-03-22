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

async function forceResync() {
  console.log('🔄 Forçage de la re-synchronisation...\n');

  // Supprimer le hash pour forcer la détection de changements
  const { data: updated, error } = await supabase
    .from('google_drive_synced_files')
    .update({ file_content_hash: null })
    .eq('sync_enabled', true)
    .select();

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ Hash supprimé pour ${updated?.length || 0} fichier(s)`);
  console.log('\nLe prochain sync va forcer le re-téléchargement et la comparaison.');
  console.log('Lance : curl -X POST http://localhost:3000/api/cron/sync-drive -H "Authorization: Bearer 4a8b313d994a2bb1e6e94b603560b8ab04d8aafec3bf688614a23614060ef6f3"');
}

forceResync().then(() => {
  process.exit(0);
});
