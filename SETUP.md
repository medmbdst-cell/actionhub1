# Guide de Setup - ActionHub

Guide pas à pas pour configurer ActionHub de zéro.

## ✅ Checklist de configuration

### 1. Installation locale

```bash
# Installer les dépendances
npm install

# Vérifier que tout est installé
npm list @supabase/supabase-js @supabase/ssr next react
```

### 2. Configuration Supabase

#### A. Créer le projet Supabase

1. Aller sur https://supabase.com
2. Cliquer sur "New Project"
3. Choisir :
   - Organization : votre organisation
   - Name : `actionhub-prod` (ou autre)
   - Database Password : **NOTER LE MOT DE PASSE** (vous en aurez besoin)
   - Region : choisir la plus proche (eu-west-1 pour Europe)
4. Cliquer sur "Create new project"

⏱️ Attendre ~2 minutes que le projet soit provisionné.

#### B. Récupérer les clés API

1. Dans le dashboard Supabase, aller dans **Settings** (⚙️ en bas à gauche)
2. Cliquer sur **API**
3. Copier :
   - **Project URL** (exemple : `https://abcdefgh.supabase.co`)
   - **anon public** key (commence par `eyJ...`)

#### C. Créer le fichier .env.local

À la racine du projet, créer un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...votre-anon-key
```

⚠️ **IMPORTANT** : Remplacez les valeurs par celles copiées à l'étape précédente.

#### D. Exécuter le schéma SQL

1. Dans le dashboard Supabase, aller dans **SQL Editor** (à gauche)
2. Cliquer sur **+ New query**
3. Ouvrir le fichier `actionhub_schema.sql` de ce projet
4. Copier **TOUT** le contenu (Ctrl+A, Ctrl+C)
5. Coller dans l'éditeur SQL de Supabase
6. Cliquer sur **RUN** (ou Ctrl+Enter)

✅ Vous devriez voir : "Success. No rows returned"

#### E. Vérifier que tout est créé

Dans le dashboard Supabase, aller dans **Table Editor** :

Vous devriez voir les tables :
- `tenants`
- `profiles`
- `equipes`
- `equipe_membres`
- `plans_action`
- `actions`
- `actions_historique`

### 3. Premier lancement

```bash
npm run dev
```

Ouvrir http://localhost:3000

Vous devriez voir la page de login !

### 4. Créer le premier super admin

#### Option A : Via l'interface Supabase

1. Dans le dashboard Supabase, aller dans **Authentication** → **Users**
2. Cliquer sur **Add user** → **Create new user**
3. Remplir :
   - Email : votre email
   - Password : votre mot de passe
   - Auto Confirm User : ✅ (cocher)
4. Cliquer sur **Create user**

Le trigger SQL va automatiquement créer un profil avec le rôle `collaborateur`.

5. **Promouvoir en super_admin** :
   - Copier l'UUID de l'utilisateur (colonne `id` dans Authentication → Users)
   - Aller dans **SQL Editor**
   - Exécuter :

```sql
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE id = 'COLLER_UUID_ICI';
```

#### Option B : Via l'API (plus rapide pour dev)

Créer un fichier `scripts/create-superadmin.mjs` :

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'VOTRE_SUPABASE_URL',
  'VOTRE_SERVICE_ROLE_KEY' // ⚠️ NE PAS UTILISER EN PROD
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@actionhub.com',
  password: 'super-secret-password',
  email_confirm: true,
  user_metadata: {
    nom: 'Admin',
    prenom: 'Super',
    role: 'super_admin'
  }
});

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Super admin créé:', data.user.id);

  // Promouvoir en super_admin
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin', tenant_id: null })
    .eq('id', data.user.id);

  if (updateError) {
    console.error('❌ Erreur promotion:', updateError);
  } else {
    console.log('✅ Promu en super_admin');
  }
}
```

Puis :

```bash
node scripts/create-superadmin.mjs
```

### 5. Tester la connexion

1. Aller sur http://localhost:3000
2. Se connecter avec l'email/mot de passe du super admin
3. Vous devriez arriver sur le dashboard !

## 🔍 Vérifications

### Vérifier que le RLS fonctionne

Dans **SQL Editor**, exécuter :

```sql
-- Doit retourner 0 (le RLS bloque tout par défaut)
SELECT count(*) FROM actions;

-- Se connecter en tant qu'utilisateur (remplacer l'UUID)
SET request.jwt.claim.sub = 'uuid-de-votre-user';

-- Doit maintenant retourner les actions de votre tenant
SELECT * FROM actions;
```

### Vérifier les triggers

Créer une action de test :

```sql
-- Via l'interface ou SQL
INSERT INTO actions (tenant_id, plan_id, description, statut)
VALUES (
  (SELECT tenant_id FROM profiles WHERE id = auth.uid()),
  (SELECT id FROM plans_action LIMIT 1),
  'Test action',
  'todo'
);

-- Modifier le statut
UPDATE actions
SET statut = 'done'
WHERE description = 'Test action';

-- Vérifier que l'historique est créé
SELECT * FROM actions_historique
WHERE action_id = (SELECT id FROM actions WHERE description = 'Test action');
```

Vous devriez voir une ligne dans `actions_historique` avec le changement de statut.

## 🚨 Problèmes courants

### "relation 'profiles' does not exist"

→ Le schéma SQL n'a pas été exécuté. Retour à l'étape 2.D.

### "Invalid login credentials"

→ Vérifiez :
1. Que l'email/mot de passe sont corrects
2. Que l'utilisateur existe dans **Authentication → Users**
3. Que l'utilisateur a un profil dans la table `profiles`

### "User not found after login"

→ Le trigger `handle_new_user()` n'a pas créé le profil. Créez-le manuellement :

```sql
INSERT INTO profiles (id, email, nom, prenom, role, tenant_id)
VALUES (
  'uuid-from-auth-users',
  'email@example.com',
  'Nom',
  'Prenom',
  'collaborateur',
  NULL  -- NULL pour super_admin, sinon un UUID de tenant
);
```

### Les actions ne s'affichent pas

→ Vérifiez que :
1. Votre utilisateur a un `tenant_id` dans `profiles`
2. Les actions ont le même `tenant_id`
3. Les policies RLS sont actives (`SELECT * FROM pg_policies;`)

### "Failed to fetch"

→ Vérifiez que :
1. Le serveur Next.js tourne (`npm run dev`)
2. Les variables d'environnement sont correctes dans `.env.local`
3. Le projet Supabase est bien démarré (pas en pause)

## 📊 Créer des données de test

### Créer un tenant

```sql
INSERT INTO tenants (nom, slug, actif)
VALUES ('ACME Corp', 'acme', true)
RETURNING id;
```

### Créer un admin pour ce tenant

1. Créer l'utilisateur dans **Authentication → Users**
2. Promouvoir en admin :

```sql
UPDATE profiles
SET
  role = 'admin',
  tenant_id = (SELECT id FROM tenants WHERE slug = 'acme')
WHERE id = 'uuid-de-l-utilisateur';
```

### Créer un plan d'action

```sql
INSERT INTO plans_action (tenant_id, nom, source_type, created_by)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'acme'),
  'Plan Q1 2026',
  'manuel',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
)
RETURNING id;
```

### Créer des actions

```sql
INSERT INTO actions (tenant_id, plan_id, description, statut, priorite, echeance)
VALUES
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action LIMIT 1),
    'Recruter un dev fullstack',
    'wip',
    'haute',
    '2026-04-15'
  ),
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action LIMIT 1),
    'Migrer vers PostgreSQL 16',
    'todo',
    'moyen',
    '2026-05-01'
  ),
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action LIMIT 1),
    'Documenter l API',
    'done',
    'faible',
    '2026-03-01'
  );
```

## ✅ Checklist finale

- [ ] Projet Supabase créé
- [ ] Schéma SQL exécuté
- [ ] Variables d'environnement configurées
- [ ] `npm install` exécuté
- [ ] `npm run dev` fonctionne
- [ ] Super admin créé et peut se connecter
- [ ] Dashboard s'affiche correctement
- [ ] Tenant de test créé
- [ ] Actions de test créées

🎉 **Vous êtes prêt pour l'Étape 2 !**
