# Configuration GitHub - ActionHub

**Date:** 2026-03-22
**Objectif:** Initialiser Git et pousser le projet sur GitHub avant le déploiement Vercel

---

## 📋 Pré-requis

- [ ] Compte GitHub - [github.com/signup](https://github.com/signup)
- [ ] Git installé localement (`git --version` pour vérifier)
- [ ] `.gitignore` déjà configuré (✅ fait)

---

## 🚀 Étape 1: Initialiser Git Localement

Ouvrir un terminal dans le dossier du projet et exécuter:

```bash
cd "C:\Users\denis\Documents\Projets\Outil de gestion des plans d'actions"

# 1. Initialiser Git
git init

# 2. Configurer votre identité (si pas déjà fait globalement)
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"

# 3. Vérifier les fichiers à ignorer
git status
```

**Attendu:**
- Dossiers/fichiers ignorés (ne doivent PAS apparaître):
  - `node_modules/`
  - `.next/`
  - `.env.local`
- Tous les autres fichiers du projet devraient être listés

**Si `.env.local` apparaît:**
```bash
# Vérifier que .gitignore contient bien .env*.local
cat .gitignore | grep "env"
```

---

## 📦 Étape 2: Premier Commit

```bash
# 1. Ajouter tous les fichiers
git add .

# 2. Créer le premier commit
git commit -m "Initial commit - ActionHub"

# 3. Vérifier le commit
git log --oneline
```

**Attendu:**
```
abc1234 (HEAD -> master) Initial commit - ActionHub
```

---

## 🌐 Étape 3: Créer un Repository GitHub

### 3.1 Via l'Interface Web

1. **Aller sur GitHub**
   - URL: [github.com/new](https://github.com/new)

2. **Configurer le Repository**
   ```
   Repository name: actionhub
   Description: Plateforme collaborative de gestion de plans d'action
   Visibility: Private (recommandé) ou Public

   ⚠️ NE PAS cocher:
   - [ ] Add a README file
   - [ ] Add .gitignore
   - [ ] Choose a license

   (Nous avons déjà ces fichiers localement)
   ```

3. **Cliquer "Create repository"**

### 3.2 Récupérer l'URL du Repository

GitHub affiche des instructions. Copier l'URL du repository:
```
https://github.com/VOTRE-USERNAME/actionhub.git
```

Ou en SSH (si configuré):
```
git@github.com:VOTRE-USERNAME/actionhub.git
```

---

## 🔗 Étape 4: Lier le Repository Local à GitHub

```bash
# 1. Ajouter le remote GitHub
git remote add origin https://github.com/VOTRE-USERNAME/actionhub.git

# Ou en SSH:
# git remote add origin git@github.com:VOTRE-USERNAME/actionhub.git

# 2. Vérifier le remote
git remote -v
```

**Attendu:**
```
origin  https://github.com/VOTRE-USERNAME/actionhub.git (fetch)
origin  https://github.com/VOTRE-USERNAME/actionhub.git (push)
```

---

## 🚀 Étape 5: Pousser le Code sur GitHub

```bash
# 1. Renommer la branche principale en 'main' (convention GitHub)
git branch -M main

# 2. Pousser le code
git push -u origin main
```

**Si demande d'authentification:**
- **HTTPS:** Entrer votre username + Personal Access Token (pas le mot de passe!)
- **SSH:** Doit être configuré au préalable

**Attendu:**
```
Enumerating objects: 150, done.
Counting objects: 100% (150/150), done.
...
To https://github.com/VOTRE-USERNAME/actionhub.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## ✅ Étape 6: Vérifier sur GitHub

1. Aller sur `https://github.com/VOTRE-USERNAME/actionhub`

2. **Vérifier que tous les fichiers sont présents:**
   - ✅ `src/` (code source)
   - ✅ `public/` (assets)
   - ✅ `package.json`
   - ✅ `next.config.ts`
   - ✅ `vercel.json`
   - ✅ `.gitignore`
   - ✅ `README.md`
   - ✅ Migrations SQL
   - ❌ `.env.local` (NE DOIT PAS être présent!)
   - ❌ `node_modules/` (NE DOIT PAS être présent!)
   - ❌ `.next/` (NE DOIT PAS être présent!)

3. **Si `.env.local` apparaît sur GitHub:**
   ```bash
   # ⚠️ URGENT: Le supprimer immédiatement!

   # 1. Supprimer du cache Git
   git rm --cached .env.local

   # 2. Commit
   git commit -m "Remove .env.local from repository"

   # 3. Push
   git push

   # 4. Régénérer TOUS les secrets exposés (Supabase, Google, Resend, Cron)
   ```

---

## 🔑 Étape 7: Générer un Personal Access Token (si HTTPS)

**Si vous utilisez HTTPS et que vous n'avez pas encore de token:**

### 7.1 Créer le Token

1. Aller sur GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Cliquer "Generate new token (classic)"
3. Donner un nom: "ActionHub Vercel Deployment"
4. Sélectionner les scopes:
   - [x] `repo` (Full control of private repositories)
5. Cliquer "Generate token"
6. **COPIER LE TOKEN IMMÉDIATEMENT** (ne sera plus visible!)

### 7.2 Utiliser le Token

Lors du `git push`, utiliser:
- **Username:** Votre username GitHub
- **Password:** Le Personal Access Token (pas votre mot de passe!)

### 7.3 Sauvegarder les Credentials (optionnel)

```bash
# Pour ne pas avoir à re-entrer le token à chaque fois
git config credential.helper store

# Prochain git push sauvegardera le token
```

**⚠️ Sécurité:** Le token est sauvegardé en clair dans `~/.git-credentials`

---

## 🔄 Workflow Git pour les Modifications Futures

### Après Avoir Modifié du Code

```bash
# 1. Voir les modifications
git status

# 2. Ajouter les fichiers modifiés
git add .

# Ou ajouter des fichiers spécifiques
# git add src/app/admin/page.tsx

# 3. Commit avec un message descriptif
git commit -m "Add new feature: user notifications"

# 4. Pousser sur GitHub
git push

# Vercel détecte automatiquement le push et redéploie! 🚀
```

### Bonnes Pratiques de Commit Messages

```bash
# ✅ Bons messages (clairs et descriptifs)
git commit -m "Fix: Google OAuth redirect URI bug"
git commit -m "Add: Dark mode toggle component"
git commit -m "Update: Resend email template with new design"
git commit -m "Refactor: Extract sync logic to separate module"

# ❌ Mauvais messages (trop vagues)
git commit -m "fix bug"
git commit -m "update"
git commit -m "wip"
```

---

## 🌿 Branches (Pour Plus Tard)

**Pour l'instant, travailler directement sur `main` est OK.**

**Quand le projet grandit:**

```bash
# Créer une branche pour une nouvelle feature
git checkout -b feature/notifications

# Développer...
git add .
git commit -m "Add email notifications"

# Pousser la branche
git push -u origin feature/notifications

# Sur GitHub: Créer une Pull Request
# Merger dans main après review
```

---

## 🆘 Troubleshooting

### Erreur: "remote: Repository not found"

**Cause:** URL du remote incorrecte ou repository pas accessible

**Solution:**
```bash
# Vérifier l'URL
git remote -v

# Corriger si nécessaire
git remote set-url origin https://github.com/VOTRE-USERNAME/actionhub.git
```

### Erreur: "Support for password authentication was removed"

**Cause:** GitHub n'accepte plus les mots de passe depuis 2021

**Solution:**
- Utiliser un Personal Access Token à la place du mot de passe
- Ou configurer SSH

### Erreur: "failed to push some refs"

**Cause:** La branche distante a des commits que vous n'avez pas localement

**Solution:**
```bash
# Récupérer les changements distants
git pull --rebase origin main

# Résoudre les conflits si nécessaire

# Re-pousser
git push
```

### `.env.local` a été committé accidentellement

**Solution d'urgence:**

```bash
# 1. Supprimer du repo
git rm --cached .env.local
git commit -m "Remove .env.local"
git push

# 2. Ajouter une ligne dans .gitignore (devrait déjà être présent)
echo ".env*.local" >> .gitignore
git add .gitignore
git commit -m "Update .gitignore"
git push

# 3. ⚠️ RÉGÉNÉRER TOUS LES SECRETS EXPOSÉS
# - Supabase: Régénérer service_role_key
# - Google: Régénérer client_secret
# - Resend: Révoquer + créer nouvelle clé
# - Cron: Générer nouveau secret (openssl rand -hex 32)
```

---

## ✅ Checklist Complète

Avant de passer au déploiement Vercel:

### Initialisation Git

- [ ] `git init` exécuté
- [ ] Identity Git configurée (name + email)
- [ ] Premier commit créé
- [ ] `.env.local` n'apparaît PAS dans `git status`

### Repository GitHub

- [ ] Repository créé sur GitHub
- [ ] Remote ajouté (`git remote -v`)
- [ ] Code poussé (`git push`)
- [ ] Tous les fichiers visibles sur GitHub
- [ ] `.env.local` ABSENT sur GitHub
- [ ] `node_modules/` ABSENT sur GitHub

### Prêt pour Vercel

- [ ] Repository GitHub accessible
- [ ] Repository peut être Public ou Private (les deux fonctionnent)
- [ ] Branche `main` existe et contient le code
- [ ] Build local réussit (`npm run build`)

---

## 🎯 Prochaine Étape

Une fois le code sur GitHub, vous pouvez passer au déploiement Vercel en suivant:

📄 **[VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md)**

---

**Dernière mise à jour:** 2026-03-22
