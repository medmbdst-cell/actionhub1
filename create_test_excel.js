const XLSX = require('xlsx');

// Données de test pour le matching
const data = [
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 1 - Match exact DUPONT',
    'Responsable': 'DUPONT',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 2 - Match exact LEFEBVRE',
    'Responsable': 'LEFEBVRE',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 3 - Homonyme sans initiale (ambigu)',
    'Responsable': 'MARTIN',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 4 - Homonyme avec initiale P',
    'Responsable': 'P MARTIN',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 5 - Homonyme avec initiale S',
    'Responsable': 'S MARTIN',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 6 - Match exact PETIT',
    'Responsable': 'PETIT',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 7 - Inexistant BERNARD',
    'Responsable': 'BERNARD',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  },
  {
    'Plan d\'action': 'Plan Test Matching',
    'Description': 'Action 8 - Match exact DUPONNE',
    'Responsable': 'DUPONNE',
    'Statut': 'En cours',
    'Echeance': '2024-12-31'
  }
];

// Créer un nouveau workbook
const wb = XLSX.utils.book_new();

// Convertir les données en worksheet
const ws = XLSX.utils.json_to_sheet(data);

// Ajouter le worksheet au workbook
XLSX.utils.book_append_sheet(wb, ws, 'Actions');

// Écrire le fichier
XLSX.writeFile(wb, 'test_matching.xlsx');

console.log('✅ Fichier test_matching.xlsx créé avec succès !');
