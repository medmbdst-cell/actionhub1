# Configuration Resend pour Production

## État actuel (Mode Test)

✅ **Fonctionnel en mode test :**
- Clé API : `re_SDDdAvdd_7srRaxgXAWNqwidHAp3uB6HW`
- Email d'envoi : `onboarding@resend.dev` (sandbox Resend)
- ⚠️ **Limitation** : Ne peut envoyer qu'à `medmbdst@gmail.com` (email du compte Resend)

## Configuration pour Production

### Étape 1 : Vérifier un domaine dans Resend

1. **Aller sur Resend Dashboard**
   - URL : https://resend.com/domains
   - Cliquer sur "Add Domain"

2. **Choisir ton domaine**
   - Option A : Utiliser `actionhub.app` (si tu possèdes ce domaine)
   - Option B : Utiliser ton propre domaine (ex: `monentreprise.com`)
   - Option C : Utiliser un sous-domaine dédié (ex: `mail.monentreprise.com`)

3. **Ajouter les enregistrements DNS**

   Resend va te fournir des enregistrements DNS à ajouter chez ton hébergeur :

   ```
   Type: TXT
   Name: resend._domainkey
   Value: [fourni par Resend]

   Type: TXT
   Name: @
   Value: [fourni par Resend]
   ```

4. **Vérifier le domaine**
   - Attendre la propagation DNS (peut prendre jusqu'à 48h, souvent 1-2h)
   - Cliquer sur "Verify" dans Resend
   - ✅ Statut doit passer à "Verified"

### Étape 2 : Modifier le code

**Fichier à modifier :** `src/lib/email/resendClient.ts` ligne 42

```typescript
// AVANT (mode test)
from: params.from || 'ActionHub <onboarding@resend.dev>',

// APRÈS (production avec domaine vérifié)
from: params.from || 'ActionHub <noreply@TON-DOMAINE.com>',
```

**Exemples selon ton domaine :**
- Si domaine = `actionhub.app` → `noreply@actionhub.app`
- Si domaine = `monentreprise.com` → `noreply@monentreprise.com`
- Si sous-domaine = `mail.monentreprise.com` → `noreply@mail.monentreprise.com`

### Étape 3 : Remettre l'email de Pierre Martin

**Actuellement modifié pour les tests :**
```
Pierre Martin : medmbdst@gmail.com (email de test)
```

**En production, restaurer :**

Exécute ce script ou modifie manuellement dans Supabase :

```javascript
// Remettre l'email correct de Pierre Martin
await supabase
  .from('profiles')
  .update({ email: 'pierre.martin@acme-corp.com' })
  .eq('prenom', 'Pierre')
  .eq('nom', 'Martin');
```

### Étape 4 : Tester en production

1. **S'assurer que les variables d'environnement sont déployées sur Vercel**

   Dans Vercel Dashboard > Settings > Environment Variables :
   ```
   RESEND_API_KEY=re_SDDdAvdd_7srRaxgXAWNqwidHAp3uB6HW
   ```

2. **Tester le cron de notifications**
   ```bash
   curl -X POST https://TON-DOMAINE.vercel.app/api/cron/notify-echeances \
     -H "Authorization: Bearer 4a8b313d994a2bb1e6e94b603560b8ab04d8aafec3bf688614a23614060ef6f3"
   ```

3. **Vérifier les logs Vercel**
   - Vercel Dashboard > Logs
   - Chercher : "✅ Email envoyé (ID: ...)"

4. **Vérifier les logs Resend**
   - https://resend.com/emails
   - Les emails envoyés doivent apparaître avec statut "Delivered"

### Étape 5 : Monitoring

**Surveiller dans Resend Dashboard :**
- **Emails envoyés** : Compteur mensuel (limite gratuite : 3,000/mois)
- **Taux de délivrabilité** : Doit être > 95%
- **Bounces** : Emails non délivrés (adresses invalides)
- **Spam complaints** : Utilisateurs signalant comme spam

**Si taux de bounce élevé :**
- Vérifier que les adresses emails dans `profiles` sont valides
- Nettoyer les adresses obsolètes

## Limites et quotas Resend

| Plan | Emails/mois | Prix |
|------|-------------|------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/mois |
| Scale | 1,000,000+ | Sur devis |

**Pour Acme Corporation :**
- Si < 100 utilisateurs avec notifications quotidiennes = Free suffit
- Si > 100 utilisateurs = passer au plan Pro

## Troubleshooting

### Problème : "Domain not verified"
**Solution :** Vérifier les enregistrements DNS dans le registrar de ton domaine

### Problème : "Quota exceeded"
**Solution :**
1. Vérifier https://resend.com/usage
2. Passer au plan supérieur ou attendre le renouvellement mensuel

### Problème : Emails arrivent en spam
**Solutions :**
1. Ajouter un enregistrement SPF : `v=spf1 include:resend.com ~all`
2. Ajouter un enregistrement DMARC : `v=DMARC1; p=none; rua=mailto:admin@TON-DOMAINE.com`
3. Demander aux utilisateurs d'ajouter `noreply@TON-DOMAINE.com` à leurs contacts

### Problème : Emails ne partent pas
**Vérifier :**
1. Clé API valide dans variables d'environnement Vercel
2. Domaine vérifié dans Resend
3. Adresse `from` utilise le domaine vérifié
4. Logs Vercel pour voir les erreurs Resend

## Checklist de déploiement

- [ ] Domaine vérifié dans Resend (statut "Verified")
- [ ] Enregistrements DNS configurés (SPF, DKIM, DMARC)
- [ ] Code modifié avec le bon domaine dans `resendClient.ts`
- [ ] Email de Pierre Martin restauré
- [ ] Variable `RESEND_API_KEY` ajoutée dans Vercel
- [ ] Test manuel du cron en production réussi
- [ ] Vérification d'un email de test reçu et formaté correctement
- [ ] Cron Vercel configuré pour exécution quotidienne à 8h
- [ ] Monitoring Resend activé (alertes si > 50 bounces/jour)

## Notes importantes

⚠️ **N'oublie pas de :**
1. Remettre l'email correct de Pierre Martin après les tests
2. Tester avec 2-3 adresses email réelles avant le lancement
3. Prévenir les utilisateurs qu'ils vont recevoir des notifications par email
4. Ajouter un lien de désabonnement (requis légalement dans certains pays)

📝 **Fichiers concernés :**
- `src/lib/email/resendClient.ts` - Configuration de l'adresse d'envoi
- `src/lib/email/templates/echeanceTemplate.ts` - Template HTML des emails
- `src/lib/notifications/echeanceNotifier.ts` - Logique de notifications
- `src/app/api/cron/notify-echeances/route.ts` - Endpoint du cron

✅ **Tout est prêt côté code !** Il ne reste que la configuration Resend.
