# Guide Utilisateur - ActionHub

## Table des matières
1. [Introduction](#introduction)
2. [Rôles et permissions](#rôles-et-permissions)
3. [Guide Administrateur](#guide-administrateur)
4. [Guide Responsable d'équipe](#guide-responsable-déquipe)
5. [Guide Collaborateur](#guide-collaborateur)
6. [Nouvelles fonctionnalités](#nouvelles-fonctionnalités)

---

## Introduction

**ActionHub** est une plateforme de consolidation et de suivi de plans d'action. Elle centralise les actions issues de multiples fichiers Excel ou Google Sheets pour offrir une vue d'ensemble à tous les niveaux de l'organisation.

### Principaux avantages
- ✅ **Centralisation** : toutes vos actions au même endroit
- ✅ **Automatisation** : import et synchronisation automatiques depuis Google Drive
- ✅ **Suivi temps réel** : indicateurs de retard, avancement, etc.
- ✅ **Notifications** : alertes automatiques pour les échéances
- ✅ **Multi-niveaux** : vues adaptées pour admin, responsables et collaborateurs

---

## Rôles et permissions

### Admin
**Accès** : Gestion complète de l'organisation
- Gérer les utilisateurs et les équipes
- Importer des plans d'action (Excel, Google Drive)
- Voir toutes les actions de l'organisation
- Résoudre les problèmes de matching automatique

### Responsable d'équipe
**Accès** : Suivi de son équipe
- Voir les actions de son équipe
- Vue détaillée par collaborateur
- Éditer les actions de son équipe
- Pas d'accès à la gestion utilisateurs

### Collaborateur
**Accès** : Ses propres actions
- Voir uniquement les actions qui lui sont assignées
- Mettre à jour le statut et les commentaires
- Voir les indicateurs personnels (en retard, faites ce mois, etc.)
- Pas d'accès aux autres collaborateurs

---

## Guide Administrateur

### 1. Gestion des utilisateurs

#### Créer un utilisateur
1. Aller dans **Admin > Utilisateurs**
2. Cliquer **"Inviter un utilisateur"**
3. Remplir les informations : nom, prénom, email, rôle
4. Le nouvel utilisateur recevra un email pour créer son mot de passe

#### ✨ NOUVEAU : Affecter un utilisateur à une équipe
1. Aller dans **Admin > Utilisateurs**
2. Cliquer **"Éditer"** sur l'utilisateur
3. Sélectionner une équipe dans le dropdown
4. Modifier le rôle si nécessaire
5. Cliquer **"Enregistrer"**

**Pourquoi c'est important ?**
- Les collaborateurs assignés à une équipe apparaissent dans la vue du responsable
- Permet de structurer l'organisation en équipes logiques
- Facilite le suivi et la délégation

### 2. Import de plans d'action

#### Option A : Import Excel manuel
1. Aller dans **Admin > Import Excel**
2. Sélectionner votre fichier Excel (.xlsx ou .xls)
3. Choisir la feuille à importer
4. Mapper les colonnes :
   - **Description** (obligatoire)
   - Responsable, Échéance, Statut, Priorité, Commentaire
5. Donner un nom au plan d'action
6. Cliquer **"Importer"**

#### ✨ NOUVEAU : Validation automatique du fichier
Avant l'import, ActionHub vérifie :
- ✅ Présence des colonnes requises (Description)
- ⚠️ Colonnes recommandées manquantes (Responsable, Échéance)
- ⚠️ Lignes vides ou invalides
- ⚠️ Statuts/priorités non reconnus

**Si le fichier est invalide**, l'import est bloqué avec un message d'erreur clair.
**Si le fichier a des warnings**, l'import continue mais vous êtes informé des problèmes potentiels.

#### Option B : Import Google Drive avec auto-sync
1. Aller dans **Admin > Google Drive**
2. Cliquer **"Connecter Google Drive"**
3. Autoriser l'accès à votre compte Google
4. Sélectionner un fichier dans la liste
5. Choisir la feuille et mapper les colonnes
6. **Activer "Auto-sync"** pour synchronisation automatique
7. Cliquer **"Importer"**

**Avantages de l'auto-sync :**
- Les modifications dans le fichier Drive sont détectées automatiquement
- Synchronisation toutes les heures
- Vos modifications locales (statut, commentaire) sont préservées

#### ✨ NOUVEAU : Prévention des doublons
Si vous essayez d'importer un fichier Drive déjà importé, ActionHub vous bloquera avec le message :

> "Ce fichier a déjà été importé dans le plan "XXX" le JJ/MM/AAAA. Utilisez la synchronisation pour mettre à jour les données."

**Pourquoi ?** Évite les doublons et la confusion. Utilisez plutôt la synchronisation automatique.

### 3. Gestion des synchronisations

#### Voir les synchronisations actives
1. Aller dans **Admin > Synchronisations**
2. Voir la liste des fichiers Drive synchronisés
3. Informations affichées :
   - Nom du fichier
   - Dernière sync
   - Mode (incrémental / remplacement complet)
   - Statut (actif / erreur)

#### Désactiver une synchronisation
1. Dans la liste, cliquer **"Désactiver"**
2. Le fichier ne sera plus synchronisé automatiquement
3. Les données existantes restent en place

#### Supprimer un plan
1. Cliquer **"Supprimer"** sur un plan
2. ⚠️ **Attention** : toutes les actions du plan seront supprimées
3. Cette action est **irréversible**

### 4. Résolution des problèmes de matching

Si le matching automatique échoue (homonymes, nom inconnu), résoudre dans :
**Admin > Matching**

**Cas 1 : Homonymes**
- Plusieurs "MARTIN" existent
- Solution : Demander au fichier source d'ajouter l'initiale ("P MARTIN")

**Cas 2 : Nom inexistant**
- "DUPONT" n'existe pas dans les utilisateurs
- Solution : Créer l'utilisateur OU ignorer l'action

---

## Guide Responsable d'équipe

### 1. Vue d'ensemble de l'équipe

**Dashboard principal** : `/responsable`

Indicateurs affichés :
- Total d'actions de l'équipe
- Répartition par statut (À faire, En cours, Bloqué, Terminé)
- 🚨 Actions en retard (équipe)
- ✅ Actions faites ce mois (équipe)

### 2. ✨ NOUVEAU : Vue par collaborateur

**Accès** : **Responsable > Vue par collaborateur**

Cette vue affiche un **tableau détaillé** avec :
- **1 ligne = 1 collaborateur** de votre équipe
- **Colonnes** :
  - Total d'actions
  - À faire / En cours / Bloquées / Terminées
  - **En retard** (nombre d'actions dépassant l'échéance)
  - **Faites ce mois** (actions terminées depuis le début du mois)
  - **Taux d'avancement** (% terminées)

**Pourquoi c'est utile ?**
- Vision immédiate de la charge et de l'avancement de chaque collaborateur
- Identifier rapidement qui est en difficulté (nombreuses actions bloquées/en retard)
- Prioriser les points individuels avec les membres de l'équipe

**Exemple :**
```
Collaborateur       | Total | À faire | En cours | Bloquées | Terminées | En retard | Faites/mois | Avancement
--------------------|-------|---------|----------|----------|-----------|-----------|-------------|------------
Jeanne Duponne      | 25    | 5       | 10       | 2        | 8         | 3         | 5           | 32% ███░░░░
Pierre Durand       | 18    | 2       | 8        | 0        | 8         | 0         | 7           | 44% ████░░░
```

### 3. Gestion des actions

#### Éditer une action
1. Cliquer sur une action de l'équipe
2. Modifier le statut ou ajouter un commentaire
3. Sauvegarder

**Note** : Vous pouvez éditer toutes les actions de votre équipe, même si vous n'êtes pas le responsable direct.

---

## Guide Collaborateur

### 1. Dashboard personnel

**Accès** : `/collaborateur`

Indicateurs affichés :
- Total de MES actions
- Répartition par statut
- 🚨 MES actions en retard
- ✅ MES actions faites ce mois

### 2. Gérer mes actions

#### Mettre à jour le statut
1. Cliquer sur une action
2. Changer le statut : À faire → En cours → Terminé
3. Ajouter un commentaire (optionnel)
4. Sauvegarder

**Statuts disponibles :**
- **À faire** : pas encore commencé
- **En cours** : travail en cours
- **Bloqué** : en attente d'un élément extérieur
- **Terminé** : action complétée

#### Voir la source de l'action
Chaque action affiche :
- **Plan d'action** : nom du plan dont elle provient
- **Fichier source** : nom du fichier Excel/Sheets d'origine
- **Onglet** : feuille du fichier

**Pourquoi c'est utile ?** Retrouver le contexte complet de l'action si nécessaire.

### 3. ✨ NOUVEAU : Notifications automatiques

#### Recevoir les alertes par email

Vous recevrez automatiquement un **email quotidien (8h du matin)** si vous avez :
- ⚠️ **Actions en retard** (échéance dépassée)
- ⏰ **Échéances proches** (< 7 jours)

**Contenu de l'email :**
- Résumé : nombre d'actions en retard et proches
- Détail des actions (description, plan, retard en jours)
- Bouton "Voir mes actions" → lien direct vers ActionHub

**Comment ça fonctionne ?**
- Vérification automatique tous les jours à 8h
- Un seul email par personne (toutes les alertes groupées)
- Pas de spam : seulement si vous avez des actions en alerte

#### Désactiver les notifications
Pour l'instant, les notifications sont automatiques pour tous. Si vous souhaitez les désactiver, contactez votre administrateur.

---

## Nouvelles fonctionnalités

### ✨ Affectation collaborateurs → équipes (Admin)

**Pourquoi ?** Structurer l'organisation et permettre aux responsables de suivre leur équipe.

**Comment ?**
1. Admin > Utilisateurs
2. Cliquer "Éditer" sur un utilisateur
3. Sélectionner une équipe
4. Enregistrer

**Résultat :**
- Le collaborateur apparaît dans la vue du responsable de l'équipe
- Le responsable voit les statistiques et actions de ce collaborateur

---

### ✨ Vue par collaborateur (Responsables)

**Pourquoi ?** Vision claire de l'avancement et de la charge de chaque membre de l'équipe.

**Comment ?**
1. Responsable > Vue par collaborateur
2. Consulter le tableau détaillé

**Indicateurs clés :**
- En retard : collaborateurs avec actions en retard
- Taux d'avancement : % d'actions terminées
- Faites ce mois : productivité récente

---

### ✨ Prévention des doublons (Admin)

**Pourquoi ?** Éviter d'importer 2x le même fichier Drive et créer des doublons.

**Comment ça fonctionne ?**
- ActionHub se souvient des fichiers Drive déjà importés
- Si vous réessayez d'importer le même fichier, l'import est bloqué
- Un message vous indique quand le fichier a été importé la première fois

**Solution :** Utilisez la synchronisation automatique au lieu de réimporter.

---

### ✨ Notifications automatiques d'échéances (Tous)

**Pourquoi ?** Ne jamais manquer une échéance importante.

**Comment ça fonctionne ?**
- Tous les jours à 8h, ActionHub vérifie les actions
- Si vous avez des actions en retard ou à échéance proche, vous recevez un email
- L'email regroupe toutes vos alertes

**Contenu :**
- Actions en retard (échéance dépassée)
- Actions à échéance proche (< 7 jours)
- Lien direct vers vos actions

**Fréquence :** 1 email par jour maximum (8h du matin)

---

### ✨ Validation des fichiers (Admin)

**Pourquoi ?** Détecter les erreurs AVANT l'import et éviter les mauvaises surprises.

**Ce qui est vérifié :**
- ✅ Colonnes requises présentes (Description)
- ⚠️ Colonnes recommandées (Responsable, Échéance, Statut)
- ⚠️ Lignes vides ou invalides
- ⚠️ Valeurs non reconnues (statuts, priorités)

**Résultat :**
- **Erreur bloquante** : import impossible, corrigez le fichier
- **Warnings** : import possible mais données incomplètes

**Exemple d'erreur :**
> "Colonnes requises manquantes: description. Colonnes trouvées: Action, Personne, Date."

**Exemple de warning :**
> "15 ligne(s) sans responsable - les actions ne seront pas assignées."

---

### ✨ Pagination liste actions (Admin)

**Pourquoi ?** Améliorer les performances avec des milliers d'actions.

**Comment ça fonctionne ?**
- Affichage par défaut : 25 actions par page
- Options : 25, 50, 100 actions/page
- Navigation : boutons Précédent / Suivant / Numéro de page

**Avantages :**
- Chargement plus rapide
- Recherche et filtres plus performants
- Meilleure expérience utilisateur

---

## FAQ

### Comment savoir si une action est en retard ?
Une action est "en retard" si :
- Elle a une échéance définie
- L'échéance est dans le passé (date dépassée)
- Elle n'est PAS terminée (statut ≠ done/100%)

### Que se passe-t-il si je modifie une action dans Drive ET dans ActionHub ?
**Avec la synchronisation incrémentale :**
- Modifications Drive (description, échéance) : écrasent la version ActionHub
- Modifications ActionHub (statut, commentaire) : sont préservées

**Exemple concret :**
1. Vous changez le statut en "En cours" dans ActionHub
2. Quelqu'un modifie la description dans le fichier Drive
3. Lors de la sync, ActionHub :
   - ✅ Met à jour la description (version Drive)
   - ✅ Garde le statut "En cours" (version ActionHub)

### Puis-je désactiver les emails de notification ?
Pour l'instant, non. Les notifications sont activées pour tous les utilisateurs ayant des actions en alerte. Contactez votre administrateur si c'est un problème.

### Combien de temps prend une synchronisation Drive ?
- **Petits fichiers** (< 100 actions) : < 5 secondes
- **Gros fichiers** (1000-5000 actions) : 10-30 secondes
- La sync est automatique (toutes les heures), vous n'avez rien à faire

### Que faire si le matching automatique ne fonctionne pas ?
1. Vérifier le format du nom dans le fichier source
2. Format attendu : "NOM" ou "Initiale NOM" (ex: "P MARTIN")
3. Si plusieurs homonymes, ajouter l'initiale
4. Si le nom n'existe pas, créer l'utilisateur OU demander à l'admin de résoudre manuellement

---

## Support et contact

### Besoin d'aide ?
- **Admin** : Contactez votre responsable IT
- **Responsable/Collaborateur** : Contactez votre admin ActionHub

### Signaler un bug
1. Noter les étapes pour reproduire le problème
2. Faire une capture d'écran si possible
3. Envoyer à votre admin avec le maximum de détails

### Demander une fonctionnalité
Les suggestions sont les bienvenues ! Contactez votre admin pour remonter les besoins.

---

**ActionHub** - Gestion simplifiée de vos plans d'action
Version 2.0 - Mars 2026
