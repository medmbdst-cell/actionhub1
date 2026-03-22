/**
 * Script pour appliquer la migration file_content_hash
 *
 * Usage: node src/scripts/apply-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Charger .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables manquantes dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('📦 Application de la migration...\n');

  // Lire le SQL
  const sql = readFileSync('migrations/add-file-content-hash.sql', 'utf-8');

  console.log('SQL à exécuter:');
  console.log('─'.repeat(70));
  console.log(sql);
  console.log('─'.repeat(70));
  console.log('');

  // Supabase JS client ne supporte pas l'exécution de SQL brut
  // Il faut utiliser le REST API directement
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    console.log('⚠️  API REST non disponible');
    console.log('');
    console.log('📋 Copie le SQL ci-dessus et exécute-le dans:');
    console.log('   Supabase Dashboard → SQL Editor');
    console.log('   https://supabase.com/dashboard');
    return;
  }

  console.log('✅ Migration appliquée!');
}

main().catch(console.error);
