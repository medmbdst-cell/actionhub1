/**
 * Script de migration pour remplir drive_row_id et drive_content_hash
 * sur les actions importées en Phase 2 (sans ces colonnes)
 *
 * Usage: npx tsx src/scripts/backfill-drive-row-ids.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateActionHash } from '../lib/sync/rowIdentifier';
import crypto from 'crypto';

// Charger les variables d'environnement depuis .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies');
  process.exit(1);
}

async function backfillRowIds() {
  console.log('🔄 Migration: Backfill drive_row_id et drive_content_hash...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Récupérer tous les plans synchronisés avec Drive
  const { data: syncedFiles, error: filesError } = await supabase
    .from('google_drive_synced_files')
    .select('*');

  if (filesError) {
    console.error('❌ Erreur lors de la récupération des fichiers synchronisés:', filesError);
    return;
  }

  if (!syncedFiles || syncedFiles.length === 0) {
    console.log('ℹ️ Aucun fichier synchronisé trouvé');
    return;
  }

  console.log(`📁 ${syncedFiles.length} fichier(s) synchronisé(s) trouvé(s)\n`);

  let totalMigrated = 0;

  for (const file of syncedFiles) {
    console.log(`\n📄 Traitement: ${file.drive_file_name} (Plan: ${file.plan_id})`);

    // Récupérer les actions du plan SANS drive_row_id
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('plan_id', file.plan_id)
      .is('drive_row_id', null)
      .order('created_at', { ascending: true }); // Tri par date de création pour approximer l'ordre d'import

    if (actionsError) {
      console.error(`   ❌ Erreur récupération actions:`, actionsError.message);
      continue;
    }

    if (!actions || actions.length === 0) {
      console.log('   ✓ Toutes les actions ont déjà un drive_row_id');
      continue;
    }

    console.log(`   Actions à migrer: ${actions.length}`);

    // Générer les row_id et content_hash
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Créer un row_id approximatif basé sur l'index + description
      // Note : C'est une approximation car on ne connaît pas l'ordre exact dans le fichier Excel original
      // Mais c'est suffisant pour la migration
      const keyFields = [
        `row:${i}`, // Position approximative
        (action.description || '').trim(),
        (action.event_description || '').trim(),
      ];

      const rowId = crypto.createHash('sha256')
        .update(keyFields.join('|'), 'utf-8')
        .digest('hex');

      // Générer le content hash de l'état actuel
      const contentHash = generateActionHash(action);

      // Update l'action
      const { error: updateError } = await supabase
        .from('actions')
        .update({
          drive_row_id: rowId,
          drive_content_hash: contentHash,
          last_synced_at: file.last_synced_at || new Date().toISOString(),
        })
        .eq('id', action.id);

      if (updateError) {
        console.error(`   ❌ Erreur update action ${action.id}:`, updateError.message);
      } else {
        totalMigrated++;
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`   ... ${i + 1}/${actions.length} actions migrées`);
      }
    }

    console.log(`   ✅ ${actions.length} actions migrées avec succès`);
  }

  console.log(`\n✅ Migration terminée : ${totalMigrated} action(s) migrée(s) au total`);
  console.log('\n💡 Prochaines étapes :');
  console.log('   1. Aller sur /admin/sync-status');
  console.log('   2. Changer le mode de sync vers "Incrémental (Phase 3)"');
  console.log('   3. Tester une synchronisation manuelle');
}

// Exécution du script
backfillRowIds()
  .then(() => {
    console.log('\n🎉 Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
