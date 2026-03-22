# Génération automatique des types TypeScript

Ce guide explique comment générer automatiquement les types TypeScript depuis votre schéma Supabase.

## 🎯 Pourquoi générer les types ?

Actuellement, le fichier `src/types/database.ts` contient des types écrits manuellement. C'est suffisant pour démarrer, mais à long terme :

- ❌ Les types peuvent se désynchroniser de la DB
- ❌ Ajouter une colonne nécessite de mettre à jour les types manuellement
- ❌ Risque d'erreurs humaines

La solution : **générer automatiquement** les types depuis votre schéma Supabase.

## 🛠️ Installation de la CLI Supabase

### Option 1 : Installation globale

```bash
npm install -g supabase
```

### Option 2 : Installation locale (recommandé)

```bash
npm install -D supabase
```

Puis ajouter dans `package.json` :

```json
{
  "scripts": {
    "types": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts"
  }
}
```

## 📝 Récupérer votre Project ID

1. Aller sur https://supabase.com
2. Ouvrir votre projet ActionHub
3. **Settings** → **General**
4. Copier le **Reference ID** (exemple : `abcdefghijklmnop`)

## 🚀 Générer les types

### Méthode 1 : Via la CLI directe

```bash
npx supabase gen types typescript --project-id abcdefghijklmnop > src/types/database.ts
```

### Méthode 2 : Via le script npm

1. Éditer `package.json` et remplacer `YOUR_PROJECT_ID` par votre vrai ID :

```json
{
  "scripts": {
    "types": "npx supabase gen types typescript --project-id abcdefghijklmnop > src/types/database.ts"
  }
}
```

2. Exécuter :

```bash
npm run types
```

✅ Le fichier `src/types/database.ts` est automatiquement mis à jour !

### Méthode 3 : Via connexion directe (plus flexible)

Si vous avez des problèmes avec le project-id, utilisez une connexion directe :

```bash
# Récupérer la connection string
# Dashboard Supabase → Settings → Database → Connection string → URI

npx supabase gen types typescript --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" > src/types/database.ts
```

## 🔄 Workflow recommandé

### 1. Modifier le schéma SQL

Exemple : ajouter une colonne `description` à la table `tenants` :

```sql
ALTER TABLE tenants
ADD COLUMN description TEXT;
```

### 2. Régénérer les types

```bash
npm run types
```

### 3. Vérifier les changements

```bash
git diff src/types/database.ts
```

Vous devriez voir la nouvelle colonne `description` dans les types !

### 4. Utiliser les nouveaux types

```typescript
// TypeScript détecte automatiquement la nouvelle colonne
const { data } = await supabase
  .from('tenants')
  .select('nom, description') // ✅ Autocomplétion fonctionne !
  .single();

console.log(data?.description); // ✅ Type-safe
```

## ⚙️ Configuration avancée

### Automatiser la génération

Ajoutez un hook Git pour régénérer les types avant chaque commit :

`.husky/pre-commit` :

```bash
#!/bin/sh
npm run types
git add src/types/database.ts
```

### CI/CD

Dans votre pipeline (GitHub Actions, GitLab CI, etc.) :

```yaml
- name: Generate Supabase Types
  run: npm run types
  env:
    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## 🐛 Troubleshooting

### "Error: Failed to connect to database"

→ Vérifiez que :
1. Votre projet Supabase est bien démarré (pas en pause)
2. Le Project ID est correct
3. Votre connexion Internet fonctionne

### "Error: Invalid project ID"

→ Le Project ID doit être le **Reference ID**, pas le nom du projet.

Dashboard → Settings → General → Reference ID

### Les types générés ne correspondent pas au schéma

→ Vérifiez que vous avez bien exécuté le schéma SQL complet (`actionhub_schema.sql`).

### Les vues ne sont pas générées

→ La CLI Supabase génère uniquement les tables par défaut. Pour les vues, ajoutez `--include-views` :

```bash
npx supabase gen types typescript --project-id abcdefghijklmnop --include-views > src/types/database.ts
```

## 📚 Types personnalisés

Le fichier `src/types/index.ts` contient des types métier supplémentaires qui ne sont pas générés automatiquement.

Exemple :

```typescript
// Types métier (manuels)
export interface ActionWithDetails extends Action {
  tenant: Tenant;
  plan: PlanAction;
  responsable?: Profile;
}

// Types d'import (manuels)
export interface ImportedAction {
  source: string;
  action: string;
  responsable: string;
  // ...
}
```

Ces types **ne doivent pas** être générés automatiquement car ils sont spécifiques à l'application.

**Règle :**
- `database.ts` → Généré automatiquement depuis Supabase
- `index.ts` → Types métier écrits manuellement

## ✅ Checklist

- [ ] CLI Supabase installée (`npm install -D supabase`)
- [ ] Script `npm run types` ajouté dans `package.json`
- [ ] Project ID récupéré depuis le dashboard
- [ ] Types générés avec succès
- [ ] Aucune erreur TypeScript dans l'application
- [ ] Types ajoutés au `.gitignore` si nécessaire (optionnel)

## 🎯 Bonus : Validation avec Zod

Pour une validation runtime en plus du typage TypeScript :

```bash
npm install zod
```

Puis créer des schémas de validation :

```typescript
import { z } from 'zod';

export const ActionSchema = z.object({
  description: z.string().min(3, 'Minimum 3 caractères'),
  statut: z.enum(['todo', 'wip', 'blocked', 'done']),
  priorite: z.enum(['haute', 'moyen', 'faible']).optional(),
  echeance: z.string().datetime().optional(),
});

// Validation
const result = ActionSchema.safeParse(data);
if (!result.success) {
  console.error(result.error);
}
```

---

**Génération automatique = types toujours synchronisés avec votre DB ! 🎉**
