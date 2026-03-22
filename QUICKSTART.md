# 🚀 Démarrage Rapide - ActionHub

Guide ultra-rapide pour lancer ActionHub en 5 minutes.

## 📋 Prérequis

- Node.js 20+ installé
- Un compte Supabase (gratuit sur [supabase.com](https://supabase.com))

## ⚡ Installation Express

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer un projet Supabase

1. Aller sur https://supabase.com
2. **New Project** → Nom: `actionhub` → Région: `Europe West` → **Create**
3. Attendre 2 min ⏱️

### 3. Configurer la base de données

**Dans le dashboard Supabase :**

1. **SQL Editor** (à gauche) → **+ New query**
2. Ouvrir le fichier `actionhub_schema.sql` de ce projet
3. Copier **TOUT** le contenu → Coller dans l'éditeur
4. Cliquer **RUN** ✅

### 4. Récupérer les clés API

**Dans le dashboard Supabase :**

1. **Settings** ⚙️ (en bas à gauche) → **API**
2. Copier :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbG...`

### 5. Configurer les variables d'environnement

Éditer le fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

⚠️ Remplacer par **VOS** valeurs copiées à l'étape 4.

### 6. Vérifier la configuration

```bash
npm run check
```

Si tout est vert ✅, vous êtes prêt !

### 7. Lancer le serveur

```bash
npm run dev
```

Ouvrir http://localhost:3000 🎉

## 👤 Créer votre compte admin

### Option 1 : Via Supabase Dashboard (recommandé)

**Dans le dashboard Supabase :**

1. **Authentication** → **Users** → **Add user**
2. Remplir :
   - Email : `admin@actionhub.com`
   - Password : `votre-mot-de-passe-secret`
   - ✅ **Auto Confirm User**
3. **Create user**
4. Copier l'**UUID** de l'utilisateur (colonne `id`)
5. **SQL Editor** → Nouvelle requête :

```sql
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE id = 'COLLER_UUID_ICI';
```

6. **RUN** ✅

### Option 2 : Tout en SQL (rapide)

**SQL Editor** → Nouvelle requête :

```sql
-- 1. Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@actionhub.com',
  crypt('VotreMotDePasse123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"nom": "Admin", "prenom": "Super", "role": "super_admin"}',
  false,
  ''
)
RETURNING id;

-- 2. Copier l'UUID retourné et l'utiliser ci-dessous
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE id = 'UUID_RETOURNÉ_CI-DESSUS';
```

## ✅ Tester la connexion

1. Aller sur http://localhost:3000
2. Se connecter avec :
   - Email : `admin@actionhub.com`
   - Mot de passe : celui que vous avez choisi
3. Vous êtes sur le dashboard ! 🎉

## 📊 Créer des données de test (optionnel)

Si vous voulez tester avec des vraies données :

**SQL Editor** → Nouvelle requête :

```sql
-- Créer un tenant de test
INSERT INTO tenants (nom, slug, actif)
VALUES ('ACME Corporation', 'acme', true);

-- Créer un plan d'action
INSERT INTO plans_action (tenant_id, nom, source_type)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'acme'),
  'Plan Q1 2026',
  'manuel'
);

-- Créer quelques actions
INSERT INTO actions (tenant_id, plan_id, description, statut, priorite, echeance)
VALUES
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action WHERE nom = 'Plan Q1 2026'),
    'Recruter un développeur fullstack',
    'wip',
    'haute',
    CURRENT_DATE + 30
  ),
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action WHERE nom = 'Plan Q1 2026'),
    'Migrer vers PostgreSQL 16',
    'todo',
    'moyen',
    CURRENT_DATE + 60
  ),
  (
    (SELECT id FROM tenants WHERE slug = 'acme'),
    (SELECT id FROM plans_action WHERE nom = 'Plan Q1 2026'),
    'Mettre à jour la documentation API',
    'done',
    'faible',
    CURRENT_DATE - 5
  );
```

## 🔍 Vérifier que tout fonctionne

### Tester le RLS

**SQL Editor** :

```sql
-- Doit retourner les 3 actions créées
SELECT * FROM actions;

-- Doit retourner les stats du tenant
SELECT * FROM v_stats_tenant;
```

### Tester l'isolation

Créez un 2e tenant et vérifiez que les actions ne se mélangent pas :

```sql
-- Créer un 2e tenant
INSERT INTO tenants (nom, slug, actif)
VALUES ('TechCorp', 'techcorp', true);

-- Créer une action pour ce tenant
INSERT INTO actions (tenant_id, plan_id, description, statut)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'techcorp'),
  (SELECT id FROM plans_action LIMIT 1), -- Réutilise un plan existant
  'Action de TechCorp',
  'todo'
);

-- Compter les actions par tenant
SELECT
  t.nom,
  COUNT(a.id) as nb_actions
FROM tenants t
LEFT JOIN actions a ON a.tenant_id = t.id
GROUP BY t.nom;
```

Vous devriez voir :
- ACME Corporation : 3 actions
- TechCorp : 1 action

## 🎯 Et maintenant ?

Vous avez terminé l'**Étape 1** ! 🎉

**Prochaines étapes :**

1. **Étape 2** : Dashboard super admin + Gestion tenants
2. **Étape 3** : Import Excel/CSV + Vue consolidée
3. **Étape 4** : Gestion des rôles + Notifications

Consultez [ETAPES.md](ETAPES.md) pour le détail de chaque étape.

## 🆘 Problèmes ?

### Le serveur ne démarre pas

```bash
# Vérifier que les dépendances sont installées
npm install

# Vérifier la config
npm run check

# Nettoyer et relancer
rm -rf .next
npm run dev
```

### Impossible de se connecter

1. Vérifier que l'utilisateur existe dans **Authentication → Users**
2. Vérifier que le profil existe dans la table `profiles` :

```sql
SELECT * FROM profiles WHERE email = 'admin@actionhub.com';
```

Si vide, le trigger n'a pas fonctionné. Créez le profil manuellement :

```sql
INSERT INTO profiles (id, email, nom, prenom, role, tenant_id)
VALUES (
  'uuid-from-auth-users',
  'admin@actionhub.com',
  'Admin',
  'Super',
  'super_admin',
  NULL
);
```

### Les actions ne s'affichent pas

Vérifier que les RLS policies sont actives :

```sql
-- Lister les policies
SELECT * FROM pg_policies WHERE tablename = 'actions';
```

Si vide, réexécutez le fichier `actionhub_schema.sql`.

## 📚 Documentation complète

- [README.md](README.md) - Vue d'ensemble du projet
- [SETUP.md](SETUP.md) - Guide de setup détaillé
- [ETAPES.md](ETAPES.md) - Plan de développement complet

---

**Besoin d'aide ?** Consultez la documentation ou créez une issue ! 🚀
