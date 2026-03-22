# 🎉 Bienvenue dans ActionHub !

## ✅ Étape 1 : Configuration terminée !

Félicitations ! Votre projet ActionHub est maintenant prêt à démarrer.

### 📦 Ce qui a été créé

- ✅ Structure Next.js 15 avec App Router
- ✅ Configuration Supabase (client, server, middleware)
- ✅ Système d'authentification complet
- ✅ Types TypeScript pour toute la base de données
- ✅ Middleware de protection des routes
- ✅ Design system dark avec Tailwind CSS
- ✅ 6 guides de documentation détaillés
- ✅ Scripts de vérification et utilitaires

**Total : 32 fichiers créés | ~2500 lignes de code | 6 guides**

---

## 🚀 Démarrage en 3 étapes

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

**📖 Guide rapide (5 min)** : [QUICKSTART.md](QUICKSTART.md)
**📖 Guide détaillé** : [SETUP.md](SETUP.md)

En résumé :
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter `actionhub_schema.sql` dans le SQL Editor
3. Copier les clés API dans `.env.local`

### 3. Lancer le serveur

```bash
npm run dev
```

Ouvrir http://localhost:3000 🎉

---

## 📚 Documentation disponible

| Fichier | Description | Durée de lecture |
|---------|-------------|------------------|
| [QUICKSTART.md](QUICKSTART.md) | Démarrage rapide (commandes essentielles) | ⏱️ 5 min |
| [SETUP.md](SETUP.md) | Guide de setup pas à pas avec captures | ⏱️ 15 min |
| [README.md](README.md) | Documentation générale du projet | ⏱️ 10 min |
| [ETAPES.md](ETAPES.md) | Plan de développement (4 étapes) | ⏱️ 20 min |
| [STRUCTURE.md](STRUCTURE.md) | Structure complète du projet | ⏱️ 10 min |
| [TYPES.md](TYPES.md) | Génération automatique des types | ⏱️ 5 min |

**Par où commencer ?**
→ Si vous voulez démarrer rapidement : [QUICKSTART.md](QUICKSTART.md)
→ Si vous voulez tout comprendre : [README.md](README.md) puis [SETUP.md](SETUP.md)

---

## 🎯 Roadmap du projet

### ✅ Étape 1 : Setup initial (TERMINÉ)
- Configuration Next.js + Supabase
- Authentification de base
- Structure du projet

### ⏳ Étape 2 : Super Admin (PROCHAINE)
- Dashboard super admin
- Gestion des tenants
- Création d'admins par tenant

### ⏳ Étape 3 : Dashboard tenant
- Import Excel/CSV/Google Sheets
- Vue consolidée des actions
- Filtres et export CSV

### ⏳ Étape 4 : Gestion des rôles
- Interface admin, responsable, collaborateur
- Notifications email
- Historique des modifications

**Voir [ETAPES.md](ETAPES.md) pour tous les détails.**

---

## 🛠️ Commandes utiles

```bash
# Développement
npm run dev              # Lancer le serveur de dev (http://localhost:3000)

# Vérifications
npm run check            # Vérifier que tout est bien configuré
npm run lint             # Vérifier le code avec ESLint

# Build
npm run build            # Build de production
npm run start            # Lancer le serveur de production

# Types
npm run types            # Générer les types TypeScript depuis Supabase
                         # (à configurer, voir TYPES.md)
```

---

## 🔐 Sécurité multi-tenant

ActionHub utilise **Row Level Security (RLS)** de Supabase pour garantir une isolation totale entre les tenants.

### Comment ça fonctionne ?

```
User fait une requête
    ↓
Middleware vérifie l'auth
    ↓
Supabase injecte auth.uid()
    ↓
RLS policies filtrent par tenant_id
    ↓
Seules les données du bon tenant sont retournées
```

**Règle d'or** : Ne JAMAIS envoyer le `tenant_id` depuis le client. Le RLS s'en charge automatiquement.

✅ **BON** :
```typescript
const { data } = await supabase
  .from('actions')
  .insert({ description: '...' })
// Le tenant_id est injecté automatiquement par le RLS
```

❌ **MAUVAIS** :
```typescript
const { data } = await supabase
  .from('actions')
  .insert({ tenant_id: userInput, description: '...' })
// DANGER : l'utilisateur pourrait modifier le tenant_id !
```

---

## 🎨 Design System

ActionHub utilise un design **dark** et **technique** inspiré du prototype HTML.

### Couleurs principales

```css
--bg: #0f1117       /* Fond principal */
--bg2: #161b25      /* Fond secondaire (cartes) */
--bg3: #1e2535      /* Fond tertiaire (inputs) */
--border: #2a3347   /* Bordures */
--accent: #3b82f6   /* Accent bleu */
--text: #e2e8f0     /* Texte principal */
--text2: #94a3b8    /* Texte secondaire */
--text3: #64748b    /* Texte tertiaire */
```

### Fonts

- **IBM Plex Sans** : Interface utilisateur
- **IBM Plex Mono** : Données, code, métriques

### Composants réutilisables

Voir [src/app/globals.css](src/app/globals.css) pour tous les composants :
- `.btn`, `.btn-sm`, `.btn-ghost`
- `.card`
- `.input`, `.label`
- `.status-badge`, `.prio-badge`, `.date-badge`

---

## 📊 Architecture technique

```
Frontend (Next.js 15)
    ↓
Server Actions
    ↓
Supabase Client (server-side)
    ↓
PostgreSQL + RLS
```

### Fichiers clés

- **Middleware** : [src/middleware.ts](src/middleware.ts) - Protection des routes
- **Auth Actions** : [src/app/actions/auth.ts](src/app/actions/auth.ts) - Login/Signup/Signout
- **Supabase Clients** : [src/lib/supabase/](src/lib/supabase/) - Client, Server, Middleware
- **Types** : [src/types/](src/types/) - Types TypeScript

---

## 🐛 Problèmes courants

### ❌ "relation 'profiles' does not exist"

→ Vous n'avez pas exécuté le schéma SQL.
→ Solution : [SETUP.md](SETUP.md) étape 2.D

### ❌ "Invalid login credentials"

→ L'utilisateur n'existe pas ou le mot de passe est incorrect.
→ Solution : Créez un utilisateur dans **Supabase → Authentication → Users**

### ❌ "Failed to fetch"

→ Les variables d'environnement ne sont pas configurées.
→ Solution : Vérifiez `.env.local` avec `npm run check`

### ❌ Les types ne correspondent pas

→ Les types manuels ne correspondent pas au schéma SQL.
→ Solution : Générez-les automatiquement avec [TYPES.md](TYPES.md)

**Plus de solutions** : [SETUP.md](SETUP.md) section "Troubleshooting"

---

## 🎓 Ressources utiles

### Documentation officielle
- [Next.js Docs](https://nextjs.org/docs) - Framework React
- [Supabase Docs](https://supabase.com/docs) - Backend et Auth
- [Tailwind CSS](https://tailwindcss.com/docs) - Framework CSS
- [TypeScript](https://www.typescriptlang.org/docs/) - Langage

### Guides Supabase spécifiques
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Server-Side Rendering](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## 🤝 Contribution

Ce projet suit une architecture stricte pour garantir la sécurité multi-tenant.

### Avant de modifier le code

1. ✅ Lisez [README.md](README.md) et [ETAPES.md](ETAPES.md)
2. ✅ Comprenez le système RLS (voir `actionhub_schema.sql`)
3. ✅ Testez avec au moins 2 tenants différents
4. ✅ Ne modifiez JAMAIS les policies RLS sans validation

### Workflow recommandé

```bash
# 1. Créer une branche
git checkout -b feature/ma-feature

# 2. Développer
# ...

# 3. Tester
npm run lint
npm run build

# 4. Commit
git add .
git commit -m "feat: description de la feature"

# 5. Push
git push origin feature/ma-feature
```

---

## ✅ Checklist avant de commencer l'Étape 2

- [ ] Dépendances installées (`npm install`)
- [ ] Projet Supabase créé
- [ ] Schéma SQL exécuté
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Vérification passée (`npm run check`)
- [ ] Serveur démarre (`npm run dev`)
- [ ] Super admin créé (voir [SETUP.md](SETUP.md))
- [ ] Connexion réussie
- [ ] Documentation lue

🎉 **Tout est OK ? C'est parti pour l'Étape 2 !**

---

## 📞 Support

### En cas de problème

1. 🔍 Consultez la section **Troubleshooting** de [SETUP.md](SETUP.md)
2. 📖 Relisez [QUICKSTART.md](QUICKSTART.md) pour vérifier les étapes
3. 🐛 Vérifiez les logs du serveur (`npm run dev`)
4. 🔐 Testez le RLS directement dans le SQL Editor Supabase

### Fichiers importants à vérifier

- `.env.local` - Variables d'environnement
- `actionhub_schema.sql` - Schéma de base
- `src/middleware.ts` - Protection des routes
- Logs Supabase : Dashboard → Logs → API / Auth

---

**Made with ☕ and ❤️ for ActionHub**

🚀 **Bon développement !**
