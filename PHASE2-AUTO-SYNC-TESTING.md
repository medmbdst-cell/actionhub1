# Phase 2 : Guide de Test - Auto-Synchronisation Google Drive

## ✅ Implémentation Complétée

### Fichiers Créés

**API & Server Actions:**
- ✅ `src/app/api/auth/google/authorize/route.ts` - OAuth authorization
- ✅ `src/app/api/auth/google/callback/route.ts` - OAuth callback
- ✅ `src/app/api/auth/google/disconnect/route.ts` - Disconnect
- ✅ `src/app/api/cron/sync-drive/route.ts` - Cron endpoint (hourly sync)
- ✅ `src/app/api/sync-status/route.ts` - Get synced files for UI
- ✅ `src/app/actions/drive.ts` - List Drive files
- ✅ `src/app/actions/drive-import.ts` - Import flow
- ✅ `src/app/actions/drive-sync.ts` - Sync logic

**Pages:**
- ✅ `src/app/admin/import/drive/page.tsx` - Import UI
- ✅ `src/app/admin/sync-status/page.tsx` - Sync management UI

**Utilities:**
- ✅ `src/lib/google/driveClient.ts` - Drive API wrapper
- ✅ `src/lib/import/excelParser.ts` - Excel parsing
- ✅ `src/lib/import/mappingUtils.ts` - Column mapping + percentage support

**Database:**
- ✅ `migrations/add-google-drive-support.sql` - Tables créées
- ✅ `migrations/change-statut-to-text.sql` - Support pourcentages

**Configuration:**
- ✅ `vercel.json` - Cron job configuration (every hour)
- ✅ `.env.local` - Google credentials configured

**Navigation:**
- ✅ Liens ajoutés dans `/admin` layout

---

## 🧪 Plan de Test

### Test 1: Connexion Google Drive

**Objectif:** Vérifier que l'OAuth fonctionne correctement

1. Se connecter avec un compte admin
2. Aller sur `/admin/import/drive`
3. Si pas connecté, cliquer sur **"Connect Google Drive"**
4. **Attendu:**
   - Redirection vers Google OAuth consent screen
   - Demande de permissions (drive.readonly, userinfo.email)
   - Après acceptation: retour sur `/admin/import/drive`
   - Message "Connecté en tant que [email]"
   - Liste des fichiers Excel du Drive affichée

5. **Vérification DB:**
   ```sql
   SELECT tenant_id, connected_email, actif, created_at
   FROM google_drive_connections
   WHERE actif = true;
   ```
   → Doit avoir une entrée avec `actif = true`

---

### Test 2: Import depuis Drive avec Auto-Sync

**Objectif:** Importer un fichier Drive et activer la synchronisation automatique

1. Sur `/admin/import/drive`, sélectionner un fichier Excel
2. Cliquer sur **"Import from Drive"**
3. Si multiple sheets: sélectionner la sheet
4. Vérifier le preview (10 premières lignes)
5. Faire le mapping des colonnes (auto-détection devrait pré-remplir)
6. **IMPORTANT:** Cocher la case **"Enable auto-sync"**
7. Donner un nom au plan (ex: "Test Sync Auto")
8. Cliquer **"Import"**

9. **Attendu:**
   - Import réussi avec message de confirmation
   - Plan créé avec X actions
   - Matching automatique appliqué

10. **Vérification DB:**
    ```sql
    -- Vérifier plan créé
    SELECT id, nom, source_type, auto_sync, google_drive_file_id
    FROM plans_action
    WHERE nom = 'Test Sync Auto';

    -- Vérifier fichier synchronisé
    SELECT sf.drive_file_name, sf.sync_enabled, sf.last_synced_at, pa.nom
    FROM google_drive_synced_files sf
    JOIN plans_action pa ON sf.plan_id = pa.id
    WHERE sf.sync_enabled = true;
    ```
    → Doit avoir une entrée dans `google_drive_synced_files` avec `sync_enabled = true`

---

### Test 3: Page de Gestion des Synchronisations

**Objectif:** Vérifier l'UI de gestion

1. Aller sur `/admin/sync-status` (ou cliquer sur "Synchronisations" dans la nav)
2. **Attendu:**
   - Liste des fichiers synchronisés
   - Pour chaque fichier:
     - Nom du plan
     - Nom du fichier Drive
     - Nom de la sheet
     - Badge "Actif" ou "Désactivé"
     - Date du dernier sync (ex: "15/03/2026 14:30" + "il y a X minutes")
     - Bouton **"Sync Now"**
     - Bouton **"Désactiver"** (ou "Activer" si désactivé)

3. Cliquer sur **"Actualiser"** → Liste rechargée

---

### Test 4: Synchronisation Manuelle

**Objectif:** Tester le bouton "Sync Now"

**Pré-requis:** Modifier le fichier Google Drive avant ce test
- Ouvrir le fichier Excel dans Google Drive
- Changer quelques lignes (modifier descriptions, statuts, etc.)
- Enregistrer

**Steps:**
1. Sur `/admin/sync-status`, cliquer sur **"Sync Now"** pour le fichier modifié
2. **Attendu:**
   - Bouton affiche "Sync..." avec spinner
   - Après quelques secondes: message "✅ X actions synchronisées"
   - Date "Dernier sync" mise à jour

3. Aller sur `/admin/actions`
4. Filtrer par plan "Test Sync Auto"
5. **Vérifier:** Les actions reflètent les changements du Drive
   - Anciennes actions supprimées
   - Nouvelles données importées

6. **Vérification DB:**
   ```sql
   SELECT drive_file_name, last_synced_at, drive_modified_time
   FROM google_drive_synced_files
   WHERE sync_enabled = true
   ORDER BY last_synced_at DESC;
   ```
   → `last_synced_at` doit être récent (à l'instant)

---

### Test 5: Désactiver/Activer Synchronisation

**Objectif:** Toggle du sync pour un fichier

1. Sur `/admin/sync-status`, cliquer sur **"Désactiver"** pour un fichier
2. **Attendu:**
   - Badge passe de "Actif" (vert) à "Désactivé" (gris)
   - Bouton "Sync Now" devient disabled
   - Bouton "Désactiver" devient "Activer"

3. Cliquer sur **"Activer"**
4. **Attendu:** Retour à l'état actif

5. **Vérification DB:**
   ```sql
   SELECT drive_file_name, sync_enabled
   FROM google_drive_synced_files;
   ```
   → `sync_enabled` doit refléter les changements

---

### Test 6: Cron Job (Automatique)

**Objectif:** Vérifier que le cron synchronise automatiquement

**Note:** Le cron tourne toutes les heures (0 * * * *) en production Vercel

**Option A: Test en Local (Manuel)**

Appeler l'endpoint directement avec curl:

```bash
curl -X POST http://localhost:3000/api/cron/sync-drive \
  -H "Authorization: Bearer 4a8b313d994a2bb1e6e94b603560b8ab04d8aafec3bf688614a23614060ef6f3"
```

**Attendu:**
```json
{
  "success": true,
  "timestamp": "2026-03-15T14:30:00.000Z",
  "tenantsProcessed": 1,
  "totalFiles": 1,
  "totalSynced": 0,
  "results": [
    {
      "tenantId": "uuid-here",
      "success": true,
      "summary": "0/1 fichier(s) synchronisé(s)"
    }
  ]
}
```

**Option B: Test en Production**

1. Déployer sur Vercel
2. Modifier un fichier Drive
3. Attendre la prochaine heure (ex: si 14:30, attendre 15:00)
4. Vérifier sur `/admin/actions` que les changements sont reflétés
5. Vérifier sur `/admin/sync-status` que "Dernier sync" est récent

**Option C: Déclencher Manuellement (Vercel Dashboard)**

1. Aller sur Vercel Dashboard → Projet → Cron Jobs
2. Trouver `/api/cron/sync-drive`
3. Cliquer **"Run Now"**

---

### Test 7: Multi-Tenant Isolation

**Objectif:** S'assurer qu'un tenant ne voit pas les fichiers d'un autre

1. Créer un second tenant avec un admin
2. Connecter un Drive différent pour ce tenant
3. Importer un fichier avec auto-sync
4. **Vérifier:**
   - Tenant A ne voit que ses fichiers sur `/admin/sync-status`
   - Tenant B ne voit que ses fichiers
   - Les syncs respectent l'isolation

---

### Test 8: Gestion d'Erreurs

**Cas 1: Fichier Drive Supprimé**

1. Supprimer un fichier synchronisé depuis Google Drive
2. Cliquer "Sync Now"
3. **Attendu:** Message d'erreur clair (ex: "Fichier non trouvé")

**Cas 2: Token Expiré**

1. Manipuler DB pour expirer le token:
   ```sql
   UPDATE google_drive_connections
   SET token_expires_at = NOW() - INTERVAL '1 hour'
   WHERE actif = true;
   ```
2. Cliquer "Sync Now"
3. **Attendu:** Refresh automatique du token (transparent)

**Cas 3: Refresh Échoue (Revoke Access)**

1. Aller sur https://myaccount.google.com/permissions
2. Révoquer l'accès à l'app
3. Cliquer "Sync Now"
4. **Attendu:** Message demandant de se reconnecter

---

### Test 9: Support Pourcentages

**Objectif:** Vérifier que les pourcentages s'affichent correctement

1. Créer un fichier Excel avec une colonne "Statut" contenant:
   - 0%, 10%, 25% (doit arrondir à 30%), 50%, 75% (→ 80%), 100%
   - Aussi tester: 5 (→ 10%), 42 (→ 40%), 88 (→ 90%)

2. Importer depuis Drive
3. Aller sur `/admin/actions`
4. **Vérifier:**
   - 0% → Badge gris "À faire"
   - 10%-60% → Badge bleu clair "X%"
   - 70%-90% → Badge bleu foncé "X%"
   - 100% → Badge vert "100%"

---

## 🔍 Points de Vérification Critiques

### Sécurité

- [ ] Endpoint `/api/cron/sync-drive` protégé par CRON_SECRET
- [ ] Tokens OAuth jamais exposés au client
- [ ] RLS vérifie que user ne voit que son tenant
- [ ] State token CSRF protection dans OAuth flow

### Performance

- [ ] Import de 1000+ actions réussit sans timeout
- [ ] Sync ne ralentit pas l'app (background process)
- [ ] Liste Drive charge en < 2s

### UX

- [ ] Messages d'erreur clairs et actionnables
- [ ] Loading states pendant fetch/sync
- [ ] Dates formatées en français
- [ ] Badges de statut visuellement distincts

---

## 📊 Métriques de Succès

| Critère | Objectif | Statut |
|---------|----------|--------|
| OAuth connection | < 2 minutes | ⏳ À tester |
| Import Drive vs Upload | Même vitesse | ⏳ À tester |
| Sync detection | < 1 heure | ⏳ À tester |
| Matching auto | Fonctionne pareil | ⏳ À tester |
| Zéro régression | Import Excel ok | ⏳ À tester |
| Isolation tenant | Étanche | ⏳ À tester |

---

## 🐛 Bugs Connus / Limitations

### MVP (Phase 2)

1. **Re-import complet** : Supprime toutes les actions et re-importe
   - ❌ Perd les modifications manuelles (statuts changés, commentaires ajoutés)
   - ✅ Simple et fiable
   - 📌 Phase 3 : Update incrémental (matcher par description)

2. **Polling (pas webhooks)** : Vérifie toutes les heures
   - ❌ Pas temps réel (délai max 1h)
   - ✅ Pas besoin de domaine public/SSL
   - 📌 Phase 3 : Migrer vers Push Notifications si besoin

3. **Un Drive par tenant** : Index unique sur (tenant_id) WHERE actif = true
   - ❌ Ne peut pas connecter multiple comptes Drive
   - ✅ Suffit pour MVP
   - 📌 Phase 3 : Support multi-connections

---

## 🚀 Déploiement Production

### Pré-requis

1. **Google Cloud Console:**
   - Vérifier le domaine de production
   - Mettre OAuth consent screen en "Production"
   - Ajouter authorized redirect URI production (ex: `https://actionhub.com/api/auth/google/callback`)

2. **Variables d'environnement Vercel:**
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   NEXT_PUBLIC_BASE_URL=https://votre-domaine.com
   CRON_SECRET=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

3. **Vercel Cron:**
   - Vérifier que `vercel.json` est committé
   - Après déploiement: Voir cron dans Vercel Dashboard
   - Tester avec "Run Now"

---

## 📝 Checklist Finale

Avant de valider Phase 2:

- [ ] Test 1: OAuth connection
- [ ] Test 2: Import Drive + auto-sync
- [ ] Test 3: Page sync-status
- [ ] Test 4: Sync manuelle
- [ ] Test 5: Toggle enable/disable
- [ ] Test 6: Cron job
- [ ] Test 7: Multi-tenant
- [ ] Test 8: Gestion erreurs
- [ ] Test 9: Pourcentages
- [ ] Déploiement production
- [ ] Documentation README mise à jour

---

## 🎉 Prochaine Étape : Phase 3

**Fonctionnalités potentielles:**

1. **Update incrémental** : Préserver modifications manuelles
2. **Webhooks Google Drive** : Sync temps réel (pas polling)
3. **Multi-Drive support** : Plusieurs connexions par tenant
4. **Historique des syncs** : Voir logs, rollback
5. **Sync sélectif** : Choisir quelles actions sync ou non
6. **UI édition actions** : Modifier depuis l'outil (sans retourner dans Excel)

---

**Date:** 2026-03-15
**Statut:** Implémentation complète, prêt pour tests
