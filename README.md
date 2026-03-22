# ActionHub

🎯 **Plateforme collaborative de gestion et consolidation de plans d'action**

ActionHub est une application web multi-tenant conçue pour centraliser, synchroniser et suivre vos plans d'action en temps réel. Connectez vos fichiers Google Drive, importez vos Excel, et pilotez vos actions avec des indicateurs métier en temps réel.

## ✨ Fonctionnalités principales

### 📊 Import & Synchronisation
- **Import Google Drive** : Connexion OAuth et import direct depuis votre Drive
- **Synchronisation automatique** : Détection des changements et mise à jour horaire via cron
- **Sync incrémentale intelligente** : Merge automatique préservant vos modifications locales
- **Gestion des conflits** : UI dédiée pour résoudre les conflits de synchronisation
- **Support Excel local** : Import manuel de fichiers .xlsx/.csv

### 📈 Dashboards & Analytics
- **KPIs en temps réel** : Total actions, en retard, terminées, taux d'avancement
- **Graphiques interactifs** : Répartition par statut, priorité, équipe
- **Vue par rôle** : Dashboards adaptés (Super Admin, Admin, Responsable, Collaborateur)
- **Filtres avancés** : Par plan, équipe, responsable, statut, date

### 🔔 Notifications & Suivi
- **Emails automatiques** : Notification des échéances via Resend
- **Rappels personnalisés** : Alertes pour actions en retard ou approchant de l'échéance
- **Historique complet** : Tracking des modifications et synchronisations

### 👥 Gestion Multi-tenant
- **Isolation totale** : Données cloisonnées par entreprise via Row Level Security
- **Gestion d'équipes** : Organisation par équipes avec responsables
- **Matching automatique** : Assignation intelligente des responsables (homonymes, inexistants)
- **4 niveaux de rôles** : Super Admin, Admin, Responsable, Collaborateur

### Stack technique

- **Frontend** : Next.js 15 (App Router) + React 19 + Tailwind CSS + Recharts
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Intégrations** : Google Drive API, Resend Email API
- **Hébergement** : Vercel (avec Cron Jobs)
- **Sécurité** : Row Level Security (RLS) + OAuth 2.0

## 🚀 Installation

### Prérequis

- Node.js 20+
- Un projet Supabase configuré
- npm ou yarn

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configuration Supabase

#### A. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Récupérez les clés API dans **Settings → API**

#### B. Exécuter le schéma SQL

1. Dans le dashboard Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez le contenu du fichier `actionhub_schema.sql`
4. Exécutez la requête

Cela créera :
- Les tables : `tenants`, `profiles`, `equipes`, `plans_action`, `actions`, etc.
- Les policies RLS pour l'isolation des données
- Les triggers pour l'historique automatique
- Les vues pour les statistiques

#### C. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

> ⚠️ **Important** : Ne committez JAMAIS le fichier `.env.local`. Il est déjà dans le `.gitignore`.

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 👤 Création du premier super admin

Après avoir exécuté le schéma SQL, créez votre premier compte :

1. Créez un compte via l'interface Supabase Auth ou la page de signup
2. Récupérez l'UUID de l'utilisateur dans **Authentication → Users**
3. Dans le **SQL Editor**, exécutez :

```sql
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE id = 'UUID_DE_VOTRE_UTILISATEUR';
```

Vous êtes maintenant super admin et pouvez créer des tenants !

## 🏗️ Architecture

### Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| `super_admin` | Accès cross-tenant, gère tous les tenants |
| `admin` | Gère son tenant : utilisateurs, plans, toutes les actions |
| `responsable` | Voit ses actions + celles de son équipe |
| `collaborateur` | Voit uniquement ses propres actions |

### Flux de synchronisation

```
Google Drive (Excel)
    ↓ OAuth 2.0
Détection changements (hash SHA-256)
    ↓ Cron horaire
Sync incrémentale (row_id matching)
    ↓ Merge intelligent
Résolution conflits (Drive wins / Local wins)
    ↓ RLS enforcement
Actions visibles par tenant/rôle
```

### Composants clés

- **`src/lib/google/driveClient.ts`** : Wrapper Google Drive API avec auto-refresh tokens
- **`src/lib/sync/rowIdentifier.ts`** : Hash-based row identification (SHA-256)
- **`src/lib/sync/mergeStrategies.ts`** : Merge champ par champ (drive_wins, local_wins)
- **`src/app/actions/drive-sync.ts`** : Logique sync incrémentale
- **`src/app/api/cron/sync-drive/route.ts`** : Endpoint cron sync automatique
- **`src/app/api/cron/notify-echeances/route.ts`** : Endpoint cron notifications email
- **`src/lib/email/resendClient.ts`** : Client Resend pour envoi d'emails

### Sécurité

- **Row Level Security (RLS)** : Toutes les tables protégées au niveau PostgreSQL
- **Isolation tenant** : Impossible d'accéder aux données d'un autre tenant
- **OAuth 2.0** : Google Drive avec refresh tokens automatiques
- **Cron protégés** : Endpoints sécurisés par `CRON_SECRET`
- **Validation côté serveur** : Toutes mutations via Server Actions
- **HTTPS only** : Déploiement Vercel avec certificats automatiques

## 📊 Métriques de production

### Import et synchronisation réussis
- **4,632 actions** importées depuis Google Drive
- **16 fichiers Excel** détectés et disponibles
- **35 actions** en production après nettoyage
- **Sync incrémentale** avec détection changements par hash SHA-256
- **0 conflits** non résolus

### Performance
- **Liste Drive** : ~1 seconde (16 fichiers)
- **Import complet** : ~5 secondes (4,632 actions)
- **Sync détection** : Instantané (comparaison hash)
- **Dashboard rendering** : < 100ms (graphiques Recharts)

### Couverture fonctionnelle
- ✅ Multi-tenant avec isolation complète (RLS)
- ✅ 4 niveaux de rôles avec permissions
- ✅ Import Excel local + Google Drive
- ✅ Sync automatique horaire
- ✅ Matching automatique responsables
- ✅ Notifications email quotidiennes
- ✅ Analytics temps réel avec graphiques
- ✅ Gestion des conflits de synchronisation
- ✅ Historique complet des changements

### Structure du projet

```
src/
├── app/
│   ├── actions/                 # Server Actions (import, sync, update)
│   ├── admin/                   # Dashboards admin & analytics
│   │   ├── analytics/           # Page analytics détaillée
│   │   ├── sync-status/         # Gestion syncs Google Drive
│   │   ├── sync-conflicts/      # Résolution conflits
│   │   └── matching/            # Résolution matching responsables
│   ├── api/
│   │   ├── auth/google/         # OAuth Google Drive flow
│   │   └── cron/                # Endpoints cron (sync, notifications)
│   ├── auth/                    # Authentification Supabase
│   └── layout.tsx               # Layout racine avec navigation
├── components/
│   ├── auth/                    # Composants authentification
│   ├── charts/                  # Graphiques Recharts (pie, bar)
│   └── dashboard/               # StatCards, KPIs
├── lib/
│   ├── analytics/               # Calcul KPIs et métriques
│   ├── email/                   # Client Resend + templates HTML
│   ├── google/                  # Client Google Drive API
│   ├── import/                  # Parsing Excel + mapping
│   ├── matching/                # Algorithme matching noms
│   ├── notifications/           # Logique notifications échéances
│   ├── supabase/                # Helpers Supabase (client, server, middleware)
│   └── sync/                    # Row identification + merge strategies
├── types/
│   ├── database.ts              # Types générés depuis Supabase
│   └── index.ts                 # Types applicatifs
└── migrations/                  # Migrations SQL Supabase
```

## 📋 État du projet

### ✅ Phase 1 : Multi-tenant & Matching (COMPLÉTÉ)
- [x] Configuration Supabase multi-tenant avec RLS
- [x] Dashboards par rôle (Super Admin, Admin, Responsable, Collaborateur)
- [x] Matching automatique des responsables (homonymes, inexistants)
- [x] Indicateurs métier (en retard, faites dans le mois)
- [x] Support pourcentages d'avancement (0% à 100%)

### ✅ Phase 2 : Google Drive Integration (COMPLÉTÉ)
- [x] Connexion OAuth Google Drive
- [x] Import direct depuis Drive (sans upload manuel)
- [x] Synchronisation automatique (cron horaire)
- [x] Détection des changements (hash-based)
- [x] UI de gestion des synchronisations
- [x] Support multi-tenant isolé

### ✅ Phase 3 : Sync Incrémentale & Conflits (COMPLÉTÉ)
- [x] Sync incrémentale intelligente (hash-based row identification)
- [x] Merge automatique champ par champ
- [x] Gestion des conflits avec UI dédiée
- [x] Soft delete (deleted_from_source)
- [x] Page d'édition des actions
- [x] Détection changements par hash de contenu

### ✅ Phase 4 : Analytics & Graphiques (COMPLÉTÉ)
- [x] Dashboard avec graphiques interactifs (Recharts)
- [x] KPIs temps réel (total, retard, terminées, avancement)
- [x] Répartition par statut (pie chart)
- [x] Répartition par priorité (bar chart)
- [x] Page analytics détaillée
- [x] Page debug pour diagnostics

### ✅ Phase 5 : Notifications Email (COMPLÉTÉ)
- [x] Intégration Resend API
- [x] Templates HTML personnalisés
- [x] Notifications échéances automatiques
- [x] Cron quotidien (8h00)
- [x] Support sandbox et production

### 🚀 Prêt pour la Production
✅ **4,632 actions importées et synchronisées**
✅ **Tous les tests validés**
✅ **Documentation complète**

## 🔒 Sécurité - Best Practices

### ❌ À NE JAMAIS faire

```typescript
// ❌ Ne JAMAIS envoyer le tenant_id depuis le client
const { data } = await supabase
  .from('actions')
  .insert({ tenant_id: userInput, ... }) // DANGER !
```

### ✅ À TOUJOURS faire

```typescript
// ✅ Le RLS injecte automatiquement le tenant_id
const { data } = await supabase
  .from('actions')
  .insert({ description: '...', ... })
// Le trigger DB ajoute automatiquement le tenant_id de l'user
```

### Règles d'or

1. **Toujours utiliser le client server** pour les mutations
2. **Ne jamais bypasser le RLS** côté client
3. **Valider les entrées** avant insertion
4. **Logger les actions sensibles** (via `actions_historique`)

## 🎨 Design System

Le projet utilise un design sombre et technique inspiré du prototype HTML :

- **Fonts** : IBM Plex Sans (UI) + IBM Plex Mono (code/data)
- **Couleurs** : Palette dark (voir `tailwind.config.ts`)
- **Composants** : Classes Tailwind réutilisables dans `globals.css`

## 📦 Dépendances principales

```json
{
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.45.6",
  "next": "15.1.6",
  "react": "^19.0.0",
  "xlsx": "^0.18.5"
}
```

## 🚢 Déploiement en Production

### 📖 Guides de déploiement complets

Consultez les guides détaillés pour déployer ActionHub en production :

1. **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Guide complet de déploiement Vercel
   - Configuration GitHub et Vercel
   - Variables d'environnement
   - Configuration OAuth Google et Cron Jobs
   - Procédures de test et monitoring
   - Checklist de sécurité
   - Scénario de démo (13 minutes)

2. **[RESEND-PRODUCTION-SETUP.md](./RESEND-PRODUCTION-SETUP.md)** - Configuration des emails
   - Transition sandbox → production
   - Vérification de domaine
   - Configuration DNS (SPF, DKIM, DMARC)
   - Troubleshooting emails

### 🧹 Préparation avant démo

Avant de montrer ActionHub à votre entreprise, nettoyez les données de test :

```bash
node clean-test-data.mjs
```

Ce script :
- Supprime toutes les actions TEST
- Restaure les emails réels
- Affiche les statistiques finales

### ⚡ Déploiement rapide (résumé)

1. **Push vers GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial production setup"
   git remote add origin https://github.com/VOTRE-USERNAME/actionhub.git
   git push -u origin main
   ```

2. **Déployer sur Vercel**
   - Connectez votre repo GitHub
   - Configurez les 8 variables d'environnement
   - Déployez automatiquement

3. **Post-déploiement**
   - Mettre à jour `NEXT_PUBLIC_BASE_URL` avec l'URL Vercel
   - Configurer Google OAuth callback
   - Vérifier les Cron Jobs actifs
   - Tester les endpoints

Les edge functions et le middleware fonctionnent automatiquement sur Vercel.

## 🐛 Troubleshooting

### Erreur : "relation 'profiles' does not exist"

→ Vous n'avez pas exécuté le schéma SQL. Allez dans Supabase SQL Editor et exécutez `actionhub_schema.sql`.

### Erreur : "User not found"

→ Vérifiez que le trigger `handle_new_user()` s'est bien exécuté. Si non, créez manuellement le profil :

```sql
INSERT INTO profiles (id, email, nom, prenom, role)
VALUES ('uuid-from-auth', 'email@example.com', 'Nom', 'Prénom', 'collaborateur');
```

### Les policies RLS bloquent mes requêtes

→ Vérifiez que votre utilisateur a bien un `tenant_id` dans la table `profiles` (sauf pour les super_admin qui doivent avoir `tenant_id = NULL`).

## 💼 Cas d'usage entreprise

### Scénario 1 : Consolidation multi-sites
**Problème** : Chaque site maintient son plan d'action Excel, impossible d'avoir une vue consolidée.

**Solution ActionHub** :
1. Chaque site conserve son Excel dans Google Drive
2. ActionHub synchronise automatiquement toutes les heures
3. La direction visualise la consolidation en temps réel
4. Les indicateurs de retard sont calculés automatiquement

### Scénario 2 : Suivi d'équipe
**Problème** : Les responsables ne savent pas où en sont leurs collaborateurs.

**Solution ActionHub** :
1. Chaque collaborateur voit ses actions assignées
2. Le responsable voit toutes les actions de son équipe
3. Notifications automatiques avant les échéances
4. Graphiques de répartition par statut et priorité

### Scénario 3 : Audit et traçabilité
**Problème** : Difficile de savoir qui a modifié quoi et quand.

**Solution ActionHub** :
1. Historique complet des modifications (table `actions_historique`)
2. Tracking source (Excel local vs Google Drive)
3. Gestion des conflits avec choix Drive/Local
4. Logs de synchronisation avec timestamps

## 🎯 Valeur ajoutée

| Avant ActionHub | Après ActionHub |
|-----------------|-----------------|
| Excel dispersés et non synchronisés | Synchronisation automatique toutes les heures |
| Consolidation manuelle fastidieuse | Vue consolidée temps réel |
| Oubli d'échéances | Notifications email automatiques |
| Pas de vue d'équipe | Dashboards par rôle avec filtres |
| Pas de traçabilité | Historique complet des changements |
| Doublons et incohérences | Matching automatique et gestion conflits |

## 📞 Support et démarrage

### Premiers pas
1. Créez votre compte (premier utilisateur = Super Admin)
2. Créez votre tenant (entreprise)
3. Invitez vos utilisateurs avec les rôles appropriés
4. Connectez votre Google Drive ou importez un fichier Excel
5. Activez la synchronisation automatique

### Besoin d'aide ?
- 📖 Consultez [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) pour le déploiement
- 📧 Consultez [RESEND-PRODUCTION-SETUP.md](./RESEND-PRODUCTION-SETUP.md) pour les emails
- 🐛 Page `/admin/debug` pour diagnostics en temps réel

## 📄 Licence

Projet privé - Tous droits réservés.

## 🤝 Contribution

Ce projet suit une architecture stricte pour garantir la sécurité multi-tenant. Avant toute modification :

1. Lisez attentivement le schéma SQL
2. Testez avec plusieurs tenants pour vérifier l'isolation
3. Ne modifiez jamais les policies RLS sans validation

---

**Made with ☕ by ActionHub Team**
