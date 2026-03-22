// Test de l'algorithme de matching
const { parseResponsableTxt, normalize } = require('./src/lib/matching/nameMatching.ts');

// Test avec "BERNARD"
const input = "BERNARD";
console.log('Input:', input);

// Ce que l'algorithme devrait faire
const cleaned = input.trim().replace(/\s+/g, ' ').replace(/\./g, '');
console.log('Cleaned:', cleaned);

const hasSpace = cleaned.includes(' ');
console.log('Has space:', hasSpace);

if (!hasSpace) {
  console.log('Résultat: { initiale: null, nom:', cleaned, '}');
}

// Normalisation
const nomNormalized = cleaned.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
console.log('Normalized:', nomNormalized);

// Query SQL qui serait exécutée
console.log('\nQuery SQL équivalente:');
console.log(`SELECT * FROM profiles WHERE tenant_id = '...' AND actif = true AND LOWER(nom) = LOWER('${nomNormalized}')`);
console.log(`Ou avec ilike: SELECT * FROM profiles WHERE nom ILIKE '${nomNormalized}'`);

console.log('\nDans la base, l\'utilisateur a:');
console.log('nom: "Bernard" (avec B majuscule)');
console.log('prenom: "Bernard"');

console.log('\nEst-ce que "bernard" matche avec "Bernard" en ilike? OUI (case-insensitive)');
console.log('Donc le matching DEVRAIT fonctionner.');
