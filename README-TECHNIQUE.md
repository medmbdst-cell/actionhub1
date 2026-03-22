# ActionHub - Documentation Technique

## Stack technique

### Frontend
- **Framework** : Next.js 15.1.6 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS + CSS variables personnalisées
- **UI Components** : Lucide React (icônes)
- **Charts** : Recharts
- **Excel Parsing** : xlsx (SheetJS)

### Backend
- **Framework** : Next.js API Routes (Server Actions)
- **Database** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Storage** : Supabase Storage (si uploads fichiers)
- **ORM** : Supabase JS Client (Query Builder)

### Intégrations
- **Google Drive** : googleapis (OAuth 2.0 + Drive API v3)
- **Email** : Resend API
- **Cron** : Vercel Cron Jobs

### Déploiement
- **Hosting** : Vercel
- **Database** : Supabase Cloud
- **CDN** : Vercel Edge Network

---

## Architecture

### Structure du projet

```
src/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions
│   │   ├── drive.ts              # Google Drive API
│   │   ├── drive-import.ts       # Import depuis Drive
│   │   ├── drive-sync.ts         # Synchronisation
│   │   ├── import.ts             # Import Excel
│   │   ├── get-actions.ts        # Récupération actions (pagination)
│   │   ├── update-action.ts      # Mise à jour action
│   │   └── update-user.ts        # Mise à jour utilisateur
│   ├── admin/                    # Pages admin
│   ├── responsable/              # Pages responsable
│   ├── collaborateur/            # Pages collaborateur
│   └── api/                      # API Routes
│       └── cron/                 # Endpoints cron
│           ├── sync-drive/       # Sync horaire Drive
│           └── notify-echeances/ # Notifications quotidiennes
├── components/                   # React Components
│   ├── common/                   # Composants réutilisables
│   ├── charts/                   # Graphiques (Recharts)
│   └── dashboard/                # Composants dashboard
├── lib/                          # Utilities
│   ├── supabase/                 # Clients Supabase
│   ├── google/                   # Google Drive client
│   ├── matching/                 # Matching automatique noms
│   ├── import/                   # Parsing & mapping Excel
│   ├── sync/                     # Logique sync incrémentale
│   ├── notifications/            # Système de notifications
│   └── email/                    # Envoi d'emails
│       ├── resendClient.ts       # Client Resend
│       └── templates/            # Templates HTML emails
├── contexts/                     # React Contexts
│   └── ThemeContext.tsx          # Gestion thème clair/sombre
└── migrations/                   # Migrations SQL
```

### Base de données (Supabase)

#### Tables principales

**tenants**
- Multi-tenant : 1 ligne = 1 entreprise
- Colonnes : id, nom, slug, actif

**profiles**
- 1 ligne = 1 utilisateur
- Colonnes : id, tenant_id, role, nom, prenom, email, equipe_id, actif
- Rôles : super_admin, admin, responsable, collaborateur

**equipes**
- 1 ligne = 1 équipe
- Colonnes : id, tenant_id, nom, responsable_id

**plans_action**
- 1 ligne = 1 plan d'action (fichier source)
- Colonnes : id, tenant_id, nom, source_type, google_drive_file_id, auto_sync

**actions**
- 1 ligne = 1 action
- Colonnes : id, tenant_id, plan_id, description, responsable_id, responsable_txt, echeance, statut, priorite, commentaire, drive_row_id, drive_content_hash

**google_drive_connections**
- Tokens OAuth Google Drive
- 1 connexion active par tenant

**google_drive_synced_files**
- Tracking des fichiers Drive synchronisés
- Colonnes : drive_file_id, plan_id, sync_enabled, sync_mode, last_sync_at

#### Row Level Security (RLS)

**Règles de base :**
- Tous les accès sont filtrés par `tenant_id`
- Super admin : accès cross-tenant
- Admin : accès complet à son tenant
- Responsable : accès aux actions de son équipe (`equipe_id`)
- Collaborateur : accès uniquement à ses actions (`responsable_id`)

**Exception :**
- Table `profiles` : RLS désactivé pour éviter récursion (sécurité gérée au niveau applicatif)

---

## Fonctionnalités clés

### 1. Import et parsing Excel

**Fichiers :** [src/lib/import/excelParser.ts](src/lib/import/excelParser.ts)

**Flow :**
1. Upload fichier Excel
2. Parse avec `xlsx` (SheetJS)
3. Conversion en JSON (headers + rows)
4. Validation du format ([src/lib/import/fileValidator.ts](src/lib/import/fileValidator.ts))
5. Mapping colonnes → champs base de données
6. Import en base avec matching automatique

**Validation automatique :**
- Colonnes requises : `description`
- Colonnes recommandées : `responsable`, `echeance`, `statut`
- Détection lignes vides, statuts/priorités invalides
- Retourne erreurs bloquantes + warnings

### 2. Matching automatique des responsables

**Fichiers :** [src/lib/matching/nameMatching.ts](src/lib/matching/nameMatching.ts)

**Algorithme :**
1. Parser le texte du responsable : "P MORANDINI" → initiale="P", nom="MORANDINI"
2. Normaliser (lowercase, sans accents)
3. Rechercher dans `profiles` :
   - Filtre par `nom` (ilike)
   - Si initiale présente, filtre aussi par `prenom` (LIKE 'p%')
4. Résultats :
   - 0 candidat → créer une issue "inexistant"
   - 1 candidat → match automatique ✅
   - >1 candidat → créer une issue "ambiguïté"

**Format attendu :**
- "MORANDINI" (nom seul) : OK si pas d'homonyme
- "P MORANDINI" (initiale + nom) : lever l'ambiguïté
- "PA MORANDINI" (initiales multiples + nom) : pour cas complexes

**Résolution manuelle :**
- Page `/admin/matching` : liste des issues
- Admin choisit manuellement le bon utilisateur

### 3. Synchronisation Google Drive

**Fichiers :**
- [src/lib/google/driveClient.ts](src/lib/google/driveClient.ts) - Wrapper googleapis
- [src/app/actions/drive-sync.ts](src/app/actions/drive-sync.ts) - Logique de sync

**Flow OAuth :**
1. User clique "Connecter Google Drive"
2. Redirect vers `/api/auth/google/authorize`
3. Google OAuth consent screen
4. Callback `/api/auth/google/callback`
5. Stockage du refresh token dans `google_drive_connections`

**Flow synchronisation :**
1. Cron horaire (`0 * * * *`) déclenche `/api/cron/sync-drive`
2. Pour chaque fichier avec `sync_enabled=true` :
   - Télécharger le fichier depuis Drive
   - Calculer hash SHA-256 du contenu complet
   - Comparer avec `file_content_hash` en base
   - Si différent : sync incrémentale
   - Si identique : skip (pas de changements)

**Sync incrémentale :**
- Identifier chaque ligne par `drive_row_id` (hash position + données)
- Pour chaque ligne du fichier :
  - Si `drive_row_id` existe : merge champ par champ
  - Si nouveau : créer action
- Lignes absentes du fichier : marquer `deleted_from_source=true`

**Merge strategy :**
- Champs écrasés par Drive : `description`, `echeance`, `priorite`
- Champs préservés locaux : `statut`, `commentaire`

**Détection changements :**
- Utilise hash SHA-256 du contenu (pas `modifiedTime`)
- Raison : bug Google Sheets ne met pas à jour `modifiedTime` pour éditions via l'interface web

### 4. Notifications d'échéances

**Fichiers :**
- [src/lib/notifications/echeanceNotifier.ts](src/lib/notifications/echeanceNotifier.ts) - Logique détection
- [src/lib/email/templates/echeanceTemplate.ts](src/lib/email/templates/echeanceTemplate.ts) - Template HTML

**Flow :**
1. Cron quotidien (`0 8 * * *`) déclenche `/api/cron/notify-echeances`
2. Pour chaque tenant actif :
   - Récupérer actions non terminées avec échéance
   - Classifier :
     - En retard : `echeance < today`
     - Échéance proche : `echeance <= today + 7 jours`
   - Grouper par responsable
3. Envoyer 1 email par responsable concerné
4. Email contient :
   - Résumé (X en retard, Y à échéance proche)
   - Détail des actions (description, plan, retard en jours)
   - CTA "Voir mes actions"

**Email provider :**
- **Resend** (recommandé) : https://resend.com
- Env var : `RESEND_API_KEY`
- Si non configuré : logs console uniquement

**Template email :**
- HTML responsive
- Design moderne (bleu/blanc)
- Sections séparées retard/proche
- Limite 10 actions par section (+ "... et X autres")

### 5. Prévention des doublons

**Fichiers :**
- [migrations/prevent-duplicate-drive-imports.sql](migrations/prevent-duplicate-drive-imports.sql)
- [src/app/actions/drive-import.ts](src/app/actions/drive-import.ts) (vérification côté app)

**Stratégie :**
1. Contrainte unique en base :
   ```sql
   CREATE UNIQUE INDEX idx_plans_action_unique_drive_file
   ON plans_action(google_drive_file_id, tenant_id)
   WHERE google_drive_file_id IS NOT NULL;
   ```
2. Vérification applicative avant import :
   - Query `plans_action` avec `google_drive_file_id`
   - Si existe : erreur explicite avec date du premier import
   - Sinon : autoriser l'import

**Message d'erreur :**
> "Ce fichier a déjà été importé dans le plan "XXX" le JJ/MM/AAAA HH:MM. Utilisez la synchronisation pour mettre à jour les données."

### 6. Pagination server-side

**Fichiers :**
- [src/app/actions/get-actions.ts](src/app/actions/get-actions.ts)
- [src/app/admin/actions/page.tsx](src/app/admin/actions/page.tsx)

**Implémentation :**
```typescript
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;
const { data, count } = await supabase
  .from('actions')
  .select('*', { count: 'exact' })
  .range(from, to);
```

**Features :**
- Page size configurable (25, 50, 100)
- Count exact pour pagination
- Tri multi-colonnes
- Filtres combinables (statut, priorité, responsable, recherche full-text)

---

## Optimisations et performances

### Indexation base de données

**Indexes existants :**
```sql
-- Recherche par tenant (utilisé dans toutes les queries RLS)
CREATE INDEX idx_actions_tenant ON actions(tenant_id);

-- Tri par statut
CREATE INDEX idx_actions_statut ON actions(tenant_id, statut);

-- Recherche par responsable
CREATE INDEX idx_actions_responsable ON actions(tenant_id, responsable_txt);

-- Filtre échéances (NULL exclus)
CREATE INDEX idx_actions_echeance ON actions(tenant_id, echeance) WHERE echeance IS NOT NULL;

-- Full-text search (trigram)
CREATE INDEX idx_actions_description_trgm ON actions USING gin(description gin_trgm_ops);
```

**À ajouter si > 50k actions :**
- Index composite `(tenant_id, equipe_id, statut)` pour responsables
- Index `(tenant_id, responsable_id, statut)` pour collaborateurs
- Partitioning par `tenant_id` si multi-tenant à grande échelle

### Caching

**Actuellement :**
- Next.js revalidation automatique des Server Components
- `revalidatePath()` après mutations (import, update)

**Recommandations futures :**
- Redis pour cacher les listes d'actions (TTL 5 min)
- CDN edge caching pour assets statiques
- React Query pour state management client

### Limitations connues

1. **Pagination côté client sur listes < 1000 items**
   - À migrer vers server-side systematiquement

2. **Sync Drive sequentielle**
   - 1 fichier à la fois (pas de parallélisation)
   - OK pour < 20 fichiers, à optimiser au-delà

3. **Pas de webhooks Drive**
   - Polling horaire uniquement
   - Pour temps réel : implémenter Google Drive Push Notifications

4. **Email rate limiting**
   - Resend : 100 emails/batch
   - Implémentation actuelle : batch de 100 avec délai 1s entre batches
   - Pour > 1000 users : considérer service dédié (SendGrid, Mailgun)

---

## Sécurité

### Authentification
- **Supabase Auth** : JWT tokens, refresh tokens, session management
- Pas de mots de passe stockés (hashés côté Supabase)

### Autorisation
- **RLS (Row Level Security)** : filtre automatique par `tenant_id`
- **Server Actions** : vérification rôle + tenant avant chaque opération
- **API Routes** : protection par `CRON_SECRET` pour les crons

### Secrets
- **Google OAuth** : Client Secret stocké en env var (jamais exposé client)
- **Cron Secret** : Généré aléatoirement (32 bytes hex)
- **Resend API Key** : Stockée en env var

### OWASP Top 10
- ✅ SQL Injection : Supabase Query Builder (parameterized queries)
- ✅ XSS : React escape automatique
- ✅ CSRF : SameSite cookies + tokens
- ✅ Sensitive Data Exposure : HTTPS only, env vars non commitées
- ✅ Access Control : RLS + checks applicatifs

**Reste à faire :**
- Rate limiting sur API endpoints
- CAPTCHA sur login (si besoin)
- CSP (Content Security Policy) headers

---

## Monitoring et debugging

### Logs

**Production (Vercel) :**
```bash
vercel logs  # Tous les logs
vercel logs --follow  # Real-time
vercel logs --since 1h  # Dernière heure
```

**Logs structurés :**
```typescript
console.log(`[Import Drive] Stats: ${validRows}/${totalRows} lignes valides`);
console.warn(`[Import Drive] Warnings: ${warnings.join(', ')}`);
console.error(`[Sync] Erreur fichier ${fileId}:`, error);
```

### Debugging

**Variables d'environnement debug :**
```bash
NEXT_PUBLIC_DEBUG=true  # Active logs verbeux
```

**Outils :**
- Vercel Dashboard > Logs
- Supabase Dashboard > Logs (SQL queries)
- Resend Dashboard > Logs (emails envoyés)
- Browser DevTools > Network (API calls)

### Erreurs courantes

**"Non authentifié" sur Server Action**
→ Token expiré, re-login nécessaire

**"Permissions insuffisantes"**
→ RLS bloque l'accès, vérifier `tenant_id` et `role`

**"google_drive_file_id already exists"**
→ Doublon Drive, utiliser sync au lieu de réimporter

**"RESEND_API_KEY non configurée"**
→ Emails désactivés, configurer ou accepter logs console

---

## Commandes utiles

### Développement

```bash
npm run dev                 # Serveur local
npm run build               # Build production
npm run start               # Serveur production local
npm run lint                # ESLint
```

### Déploiement Vercel

```bash
vercel                      # Deploy preview
vercel --prod               # Deploy production
vercel env pull            # Télécharger env vars
vercel logs --follow       # Logs temps réel
```

### Supabase

```bash
# Migrations
psql -h xxx.supabase.co -U postgres -d postgres -f migrations/xxx.sql

# Backup
pg_dump -h xxx.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h xxx.supabase.co -U postgres -d postgres < backup.sql
```

### Tests manuels

```bash
# Test cron sync Drive (dev)
curl http://localhost:3000/api/cron/sync-drive

# Test cron notifications (dev)
curl http://localhost:3000/api/cron/notify-echeances

# Test cron sync Drive (prod)
curl -X POST https://domain.com/api/cron/sync-drive \
  -H "Authorization: Bearer $CRON_SECRET"

# Test cron notifications (prod)
curl -X POST https://domain.com/api/cron/notify-echeances \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Roadmap technique

### Court terme (Q2 2026)
- [ ] Tests automatisés (Jest + Playwright)
- [ ] Monitoring (Sentry error tracking)
- [ ] CI/CD pipelines (GitHub Actions)

### Moyen terme (Q3 2026)
- [ ] Webhooks Drive (temps réel)
- [ ] Cache Redis (performances)
- [ ] Search Algolia (full-text avancé)

### Long terme (Q4 2026+)
- [ ] Mobile app (React Native)
- [ ] API publique (REST + GraphQL)
- [ ] Analytics avancés (Mixpanel/Amplitude)

---

## Contribution

### Setup développeur

```bash
# Clone
git clone https://github.com/yourorg/actionhub.git
cd actionhub

# Install
npm install

# Env vars
cp .env.example .env.local
# Remplir .env.local avec vos credentials

# Migrations
psql < migrations/*.sql

# Dev
npm run dev
```

### Guidelines

- **Code style** : Prettier + ESLint (config dans package.json)
- **Commits** : Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Branches** : `feature/xxx`, `bugfix/xxx`, `hotfix/xxx`
- **PRs** : Description claire, tests passants, review requise

---

**ActionHub** - Technical Documentation
Version 2.0 - Mars 2026
