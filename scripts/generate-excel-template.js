/**
 * Script pour générer un fichier Excel template pour l'import d'actions
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Données exemple
const data = [
  {
    'Description': 'Mettre à jour la documentation technique',
    'Responsable': 'Jean Dupont',
    'Échéance': '2026-04-15',
    'Statut': 'todo',
    'Priorité': 'haute',
    'Commentaire': 'Urgence client pour la release'
  },
  {
    'Description': 'Corriger le bug d\'authentification',
    'Responsable': 'Marie Martin',
    'Échéance': '2026-03-20',
    'Statut': 'wip',
    'Priorité': 'haute',
    'Commentaire': 'En cours de test'
  },
  {
    'Description': 'Optimiser les performances de la base de données',
    'Responsable': 'Pierre Bernard',
    'Échéance': '2026-05-01',
    'Statut': 'todo',
    'Priorité': 'moyen',
    'Commentaire': 'Prévoir une réunion technique'
  },
  {
    'Description': 'Former les nouveaux collaborateurs',
    'Responsable': 'Sophie Dubois',
    'Échéance': '2026-03-25',
    'Statut': 'done',
    'Priorité': 'faible',
    'Commentaire': 'Formation terminée avec succès'
  },
  {
    'Description': 'Réviser le processus de déploiement',
    'Responsable': 'Luc Moreau',
    'Échéance': '2026-04-10',
    'Statut': 'blocked',
    'Priorité': 'haute',
    'Commentaire': 'En attente de validation sécurité'
  },
  {
    'Description': 'Créer les tests unitaires pour le module API',
    'Responsable': 'Alice Petit',
    'Échéance': '2026-04-05',
    'Statut': 'todo',
    'Priorité': 'moyen',
    'Commentaire': ''
  },
  {
    'Description': 'Migrer vers la nouvelle infrastructure cloud',
    'Responsable': 'Thomas Roux',
    'Échéance': '2026-05-15',
    'Statut': 'todo',
    'Priorité': 'haute',
    'Commentaire': 'Budget approuvé'
  },
  {
    'Description': 'Audit de sécurité annuel',
    'Responsable': 'Emma Laurent',
    'Échéance': '2026-06-01',
    'Statut': 'todo',
    'Priorité': 'haute',
    'Commentaire': 'Prévoir 2 semaines'
  },
  {
    'Description': 'Refactoring du code legacy',
    'Responsable': 'Lucas Simon',
    'Échéance': '2026-04-20',
    'Statut': 'wip',
    'Priorité': 'moyen',
    'Commentaire': '50% complété'
  },
  {
    'Description': 'Mise en place du monitoring',
    'Responsable': 'Chloé Michel',
    'Échéance': '2026-03-30',
    'Statut': 'todo',
    'Priorité': 'haute',
    'Commentaire': 'Urgent pour la production'
  }
];

// Créer un workbook
const wb = XLSX.utils.book_new();

// Créer une feuille à partir des données
const ws = XLSX.utils.json_to_sheet(data);

// Définir la largeur des colonnes
ws['!cols'] = [
  { wch: 50 },  // Description
  { wch: 20 },  // Responsable
  { wch: 12 },  // Échéance
  { wch: 10 },  // Statut
  { wch: 10 },  // Priorité
  { wch: 40 }   // Commentaire
];

// Ajouter la feuille au workbook
XLSX.utils.book_append_sheet(wb, ws, 'Actions');

// Créer une feuille d'instructions
const instructions = [
  ['📋 Instructions pour l\'import d\'actions'],
  [''],
  ['Colonnes requises:', 'Description'],
  ['Colonnes optionnelles:', 'Responsable, Échéance, Statut, Priorité, Commentaire'],
  [''],
  ['Formats acceptés:'],
  ['• Échéance: AAAA-MM-JJ (ex: 2026-04-15)'],
  ['• Statut: todo, wip, blocked, done'],
  ['• Priorité: haute, moyen, faible'],
  [''],
  ['💡 Conseils:'],
  ['• Supprimez cette feuille avant l\'import'],
  ['• Gardez uniquement la feuille "Actions"'],
  ['• Le responsable peut être un nom (sera converti en utilisateur plus tard)']
];

const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 30 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Sauvegarder le fichier
const outputPath = path.join(__dirname, '..', 'public', 'template-import-actions.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ Fichier Excel créé:', outputPath);
console.log('📊 Nombre de lignes d\'exemple:', data.length);
