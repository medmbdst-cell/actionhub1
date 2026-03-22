/**
 * Script pour appliquer la migration file_content_hash
 *
 * Usage: npx tsx src/scripts/apply-content-hash-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Application de la migration file_content_hash...\n');

  // Lire le fichier SQL
  const migrationPath = path.join(process.cwd(), 'migrations', 'add-file-content-hash.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('');

  // Exécuter la migration
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // Si la fonction exec_sql n'existe pas, utiliser une approche directe
    console.log('⚠️  Fonction exec_sql non disponible, utilisation de l\'approche directe...');

    // Exécuter directement via SQL (Supabase client ne supporte pas multi-statements)
    // On va devoir le faire manuellement dans le dashboard Supabase
    console.log('');
    console.log('📋 INSTRUCTIONS MANUELLES:');
    console.log('1. Ouvre Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Va dans SQL Editor');
    console.log('3. Copie-colle le SQL ci-dessus');
    console.log('4. Exécute-le');
    console.log('');
    console.log('Ou utilise la commande psql si tu as accès:');
    console.log(`psql ${supabaseUrl} < ${migrationPath}`);

    return;
  }

  console.log('✅ Migration appliquée avec succès!');
  console.log('');

  // Vérifier que la colonne existe
  const { data: columns, error: checkError } = await supabase
    .from('google_drive_synced_files')
    .select('file_content_hash')
    .limit(1);

  if (checkError) {
    console.error('❌ Erreur lors de la vérification:', checkError);
  } else {
    console.log('✅ Colonne file_content_hash vérifiée');
  }
}

applyMigration().catch(console.error);
