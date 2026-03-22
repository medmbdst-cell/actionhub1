#!/usr/bin/env node

/**
 * Script de vérification de l'environnement
 * Vérifie que toutes les variables d'environnement sont configurées
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Vérification de la configuration ActionHub...\n');

let hasErrors = false;

// Vérifier .env.local
try {
  const envPath = join(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');

  const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=') &&
    !envContent.includes('your_supabase_project_url');
  const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=') &&
    !envContent.includes('your_supabase_anon_key');

  if (hasUrl && hasKey) {
    console.log('✅ Variables d\'environnement configurées');
  } else {
    console.log('❌ Variables d\'environnement manquantes ou invalides');
    console.log('   → Éditez .env.local avec vos clés Supabase');
    hasErrors = true;
  }
} catch (error) {
  console.log('❌ Fichier .env.local introuvable');
  console.log('   → Copiez .env.local.example vers .env.local');
  hasErrors = true;
}

// Vérifier package.json
try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  const requiredDeps = ['@supabase/supabase-js', '@supabase/ssr', 'next', 'react', 'xlsx'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);

  if (missingDeps.length === 0) {
    console.log('✅ Dépendances installées');
  } else {
    console.log(`❌ Dépendances manquantes: ${missingDeps.join(', ')}`);
    console.log('   → Exécutez: npm install');
    hasErrors = true;
  }
} catch (error) {
  console.log('❌ Erreur lors de la lecture de package.json');
  hasErrors = true;
}

// Vérifier node_modules
try {
  readFileSync(join(process.cwd(), 'node_modules', '@supabase', 'supabase-js', 'package.json'));
  console.log('✅ node_modules présent');
} catch (error) {
  console.log('❌ node_modules introuvable');
  console.log('   → Exécutez: npm install');
  hasErrors = true;
}

// Résumé
console.log('');
if (!hasErrors) {
  console.log('🎉 Tout est prêt ! Vous pouvez lancer le serveur avec:');
  console.log('   npm run dev\n');
  console.log('📖 Pour créer votre super admin, consultez SETUP.md');
} else {
  console.log('⚠️  Des erreurs ont été détectées. Consultez SETUP.md pour plus de détails.');
  process.exit(1);
}
