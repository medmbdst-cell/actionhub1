# Plan de développement ActionHub

Ce document détaille les 4 étapes de développement d'ActionHub.

---

## ✅ ÉTAPE 1 : Initialiser le projet Next.js + Supabase (TERMINÉ)

### Objectifs
- [x] Créer la structure Next.js avec App Router
- [x] Configurer Supabase (client, server, middleware)
- [x] Mettre en place l'authentification de base
- [x] Créer les types TypeScript depuis le schéma SQL

### Livrables

#### Configuration
- ✅ [package.json](package.json) - Dépendances et scripts
- ✅ [tsconfig.json](tsconfig.json) - Configuration TypeScript
- ✅ [tailwind.config.ts](tailwind.config.ts) - Configuration Tailwind avec couleurs ActionHub
- ✅ [.env.local.example](.env.local.example) - Template des variables d'environnement
- ✅ [.gitignore](.gitignore) - Fichiers à ignorer

#### Helpers Supabase
- ✅ [src/lib/supabase/client.ts](src/lib/supabase/client.ts) - Client browser
- ✅ [src/lib/supabase/server.ts](src/lib/supabase/server.ts) - Client server
- ✅ [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) - Client middleware
- ✅ [src/middleware.ts](src/middleware.ts) - Middleware Next.js pour auth

#### Types
- ✅ [src/types/database.ts](src/types/database.ts) - Types générés depuis la DB
- ✅ [src/types/index.ts](src/types/index.ts) - Types applicatifs

#### Interface de base
- ✅ [src/app/globals.css](src/app/globals.css) - Styles globaux
- ✅ [src/app/layout.tsx](src/app/layout.tsx) - Layout racine
- ✅ [src/app/page.tsx](src/app/page.tsx) - Page d'accueil (redirection)
- ✅ [src/app/login/page.tsx](src/app/login/page.tsx) - Page de connexion
- ✅ [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - Dashboard de base
- ✅ [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx) - Formulaire de login
- ✅ [src/app/actions/auth.ts](src/app/actions/auth.ts) - Server actions auth

#### Documentation
- ✅ [README.md](README.md) - Documentation générale
- ✅ [SETUP.md](SETUP.md) - Guide de setup pas à pas
- ✅ [scripts/check-env.mjs](scripts/check-env.mjs) - Script de vérification

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer Supabase
# - Créer un projet sur supabase.com
# - Exécuter actionhub_schema.sql dans SQL Editor
# - Copier les clés dans .env.local

# 3. Vérifier la config
node scripts/check-env.mjs

# 4. Lancer le serveur
npm run dev
```

### Tests de validation

- [x] Le serveur démarre sur http://localhost:3000
- [x] La page login s'affiche correctement
- [x] Le middleware redirige vers /login si non connecté
- [x] Les utilisateurs authentifiés accèdent au dashboard

---

## ⏳ ÉTAPE 2 : Auth + Super Admin (À FAIRE)

### Objectifs
- [ ] Finaliser le système d'authentification
- [ ] Créer le dashboard super_admin
- [ ] Permettre la gestion des tenants
- [ ] Créer des admins pour chaque tenant

### À développer

#### Pages & Routes
- [ ] `src/app/super-admin/page.tsx` - Dashboard super admin
- [ ] `src/app/super-admin/tenants/page.tsx` - Liste des tenants
- [ ] `src/app/super-admin/tenants/[id]/page.tsx` - Détail tenant
- [ ] `src/app/super-admin/users/page.tsx` - Gestion utilisateurs cross-tenant

#### Composants
- [ ] `src/components/super-admin/TenantsList.tsx` - Liste tenants
- [ ] `src/components/super-admin/CreateTenantModal.tsx` - Création tenant
- [ ] `src/components/super-admin/UsersList.tsx` - Liste users
- [ ] `src/components/super-admin/CreateAdminModal.tsx` - Création admin

#### Actions
- [ ] `src/app/actions/tenants.ts` - CRUD tenants
- [ ] `src/app/actions/users.ts` - Gestion utilisateurs

#### Features
- [ ] Créer un tenant (nom, slug, logo)
- [ ] Désactiver/activer un tenant
- [ ] Créer un admin pour un tenant
- [ ] Voir les stats de tous les tenants
- [ ] Voir tous les utilisateurs (filtrable par tenant)

### Tests de validation
- [ ] Super admin peut créer un tenant
- [ ] Super admin peut créer un admin pour un tenant
- [ ] Admin créé peut se connecter
- [ ] Admin ne voit que son tenant (pas les autres)
- [ ] Super admin voit tous les tenants

---

## ⏳ ÉTAPE 3 : Dashboard tenant & Import (À FAIRE)

### Objectifs
- [ ] Porter le prototype HTML vers Next.js
- [ ] Implémenter l'import Excel/CSV/Google Sheets
- [ ] Mapper les colonnes automatiquement
- [ ] Sauvegarder les actions en base
- [ ] Afficher la vue consolidée avec filtres
- [ ] Exporter en CSV

### À développer

#### Pages
- [ ] `src/app/dashboard/plans/page.tsx` - Liste des plans
- [ ] `src/app/dashboard/plans/[id]/page.tsx` - Détail d'un plan
- [ ] `src/app/dashboard/actions/page.tsx` - Vue consolidée des actions
- [ ] `src/app/dashboard/import/page.tsx` - Interface d'import

#### Composants d'import
- [ ] `src/components/import/FileDropZone.tsx` - Zone drag & drop
- [ ] `src/components/import/ColumnMappingModal.tsx` - Modal de mapping
- [ ] `src/components/import/GoogleSheetsImport.tsx` - Import GSheets
- [ ] `src/components/import/PreviewTable.tsx` - Aperçu avant import

#### Composants de visualisation
- [ ] `src/components/actions/ActionsTable.tsx` - Tableau des actions
- [ ] `src/components/actions/StatsCards.tsx` - Cartes statistiques
- [ ] `src/components/actions/FilterBar.tsx` - Barre de filtres
- [ ] `src/components/actions/ResponsableAutocomplete.tsx` - Autocomplete responsables
- [ ] `src/components/actions/ExportButton.tsx` - Export CSV

#### Actions & Utils
- [ ] `src/app/actions/plans.ts` - CRUD plans
- [ ] `src/app/actions/actions.ts` - CRUD actions
- [ ] `src/lib/import/parseExcel.ts` - Parser Excel avec SheetJS
- [ ] `src/lib/import/parseCSV.ts` - Parser CSV
- [ ] `src/lib/import/autoMapper.ts` - Mapping automatique des colonnes
- [ ] `src/lib/import/normalizeData.ts` - Normalisation des données
- [ ] `src/lib/export/exportCSV.ts` - Export CSV

#### Features
- [ ] Drag & drop de fichiers Excel/CSV
- [ ] Import depuis URL Google Sheets
- [ ] Détection automatique des colonnes
- [ ] Mapping manuel si nécessaire
- [ ] Sauvegarde en base avec tenant_id
- [ ] Vue consolidée filtrée par rôle (RLS)
- [ ] Filtrage par responsable (autocomplete)
- [ ] Stats : total, en retard, urgentes, en cours, terminées
- [ ] Barre de progression
- [ ] Tri par date/statut/priorité/source
- [ ] Export CSV des actions filtrées

### Tests de validation
- [ ] Import Excel avec colonnes standard → mapping auto
- [ ] Import Excel avec colonnes custom → modal mapping
- [ ] Import CSV fonctionne
- [ ] Import Google Sheets (URL publique) fonctionne
- [ ] Actions sauvegardées ont le bon tenant_id
- [ ] Admin voit toutes les actions de son tenant
- [ ] Responsable ne voit que ses actions + équipe
- [ ] Collaborateur ne voit que ses actions
- [ ] Filtrage par responsable fonctionne
- [ ] Stats se mettent à jour
- [ ] Export CSV génère un fichier valide

---

## ⏳ ÉTAPE 4 : Gestion des rôles (À FAIRE)

### Objectifs
- [ ] Interface admin : gestion utilisateurs
- [ ] Interface responsable : gestion équipe
- [ ] Interface collaborateur : mise à jour actions
- [ ] Notifications email pour échéances

### À développer

#### Pages admin
- [ ] `src/app/dashboard/users/page.tsx` - Gestion utilisateurs
- [ ] `src/app/dashboard/teams/page.tsx` - Gestion équipes

#### Composants admin
- [ ] `src/components/admin/UsersList.tsx` - Liste users du tenant
- [ ] `src/components/admin/InviteUserModal.tsx` - Inviter un user
- [ ] `src/components/admin/EditUserModal.tsx` - Modifier un user
- [ ] `src/components/admin/TeamsList.tsx` - Liste équipes
- [ ] `src/components/admin/CreateTeamModal.tsx` - Créer équipe

#### Pages responsable
- [ ] `src/app/dashboard/my-team/page.tsx` - Vue équipe
- [ ] `src/app/dashboard/my-team/[id]/page.tsx` - Détail membre

#### Composants responsable
- [ ] `src/components/team/TeamMembersList.tsx` - Liste membres
- [ ] `src/components/team/AssignActionModal.tsx` - Assigner action
- [ ] `src/components/team/TeamStats.tsx` - Stats équipe

#### Pages collaborateur
- [ ] `src/app/dashboard/my-actions/page.tsx` - Mes actions
- [ ] `src/app/dashboard/my-actions/[id]/page.tsx` - Détail action

#### Composants collaborateur
- [ ] `src/components/actions/ActionCard.tsx` - Carte action
- [ ] `src/components/actions/UpdateStatusModal.tsx` - Modifier statut
- [ ] `src/components/actions/AddCommentModal.tsx` - Ajouter commentaire

#### Notifications
- [ ] `supabase/functions/send-email-reminders/index.ts` - Edge Function
- [ ] `src/lib/notifications/scheduleReminders.ts` - Scheduler
- [ ] Templates email (Resend ou similaire)

#### Actions
- [ ] `src/app/actions/team.ts` - Gestion équipes
- [ ] `src/app/actions/notifications.ts` - Gestion notifications

#### Features
- [ ] Admin : inviter un utilisateur (email + rôle)
- [ ] Admin : désactiver un utilisateur
- [ ] Admin : créer une équipe
- [ ] Admin : assigner un responsable à une équipe
- [ ] Responsable : voir les actions de son équipe
- [ ] Responsable : assigner des actions à des membres
- [ ] Collaborateur : voir ses actions
- [ ] Collaborateur : mettre à jour le statut
- [ ] Collaborateur : ajouter des commentaires
- [ ] Historique : traçabilité de toutes les modifications
- [ ] Notifications : email J-7 avant échéance
- [ ] Notifications : email le jour de l'échéance
- [ ] Notifications : email actions en retard

### Tests de validation
- [ ] Admin peut inviter un user
- [ ] User reçoit un email d'invitation
- [ ] Admin peut créer une équipe
- [ ] Responsable voit ses membres d'équipe
- [ ] Responsable peut assigner une action
- [ ] Collaborateur voit uniquement ses actions
- [ ] Modification de statut enregistre l'historique
- [ ] Notifications envoyées à J-7
- [ ] Notifications envoyées le jour J
- [ ] Notifications pour actions en retard

---

## 🚀 Déploiement (Post-Étape 4)

### Checklist déploiement

#### Vercel
- [ ] Connecter le repo GitHub à Vercel
- [ ] Configurer les variables d'environnement
- [ ] Tester en preview
- [ ] Déployer en production

#### Supabase
- [ ] Vérifier que RLS est actif partout
- [ ] Activer les sauvegardes automatiques
- [ ] Configurer les alertes (quota, erreurs)
- [ ] Documenter les policies

#### Tests finaux
- [ ] Tests multi-tenants (2+ tenants)
- [ ] Tests de charge (100+ actions)
- [ ] Tests de sécurité (tentative d'accès cross-tenant)
- [ ] Tests des emails
- [ ] Tests sur mobile

---

## 📚 Ressources

- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SheetJS Documentation](https://docs.sheetjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Progression globale : 25% (Étape 1/4 terminée)**
