# 📢 **Configuration Slack pour Alertes Migration**

## 🎯 **OBJECTIF**

Configurer un webhook Slack dédié pour recevoir les alertes de migration NFT/USDC. Ce canal permet aux admins d'être notifiés en temps réel des échecs de migration nécessitant une intervention.

---

## 🔑 **1. CRÉER UN WEBHOOK SLACK**

### **Étape 1 : Créer une nouvelle App Slack**

1. Aller sur https://api.slack.com/apps
2. Cliquer sur **"Create New App"** → **"From scratch"**
3. Nom : `CyLimit Migration Alerts`
4. Workspace : Sélectionner votre workspace CyLimit

### **Étape 2 : Activer les Incoming Webhooks**

1. Dans le menu de gauche, cliquer sur **"Incoming Webhooks"**
2. Activer le toggle **"Activate Incoming Webhooks"**
3. Cliquer sur **"Add New Webhook to Workspace"**
4. **Choisir le canal** :
   - Option 1 : Créer un canal privé `#migration-alerts-admin` (recommandé)
   - Option 2 : Créer un canal privé `#tech-alerts`
   - ⚠️ **NE PAS utiliser un canal public** pour éviter spam

5. Autoriser l'app
6. Copier l'URL du webhook (ressemble à `https://hooks.slack.com/services/T.../B.../xxx`)

---

## 🔒 **2. CONFIGURER LE CANAL SLACK (Qui reçoit les notifs ?)**

### **Option A : Canal privé dédié (Recommandé)**

**Créer un canal privé `#migration-alerts-admin` :**

1. Dans Slack, cliquer sur `+` à côté de "Channels"
2. Nom : `migration-alerts-admin`
3. Description : `Alertes de migration NFT/USDC nécessitant intervention admin`
4. **Type : Privé** ✅
5. Inviter UNIQUEMENT :
   - Tech Lead / CTO
   - DevOps responsable
   - Admins autorisés à retry migrations

**Avantages :**
- ✅ Notifs ciblées (pas de spam pour toute l'équipe)
- ✅ Historique centralisé des migrations échouées
- ✅ Facile de tracer qui a retry quoi

---

### **Option B : Canal tech existant**

Si vous avez déjà un canal tech privé (ex: `#tech-alerts`), vous pouvez réutiliser celui-ci. Assurez-vous qu'il soit privé.

---

## 🛠️ **3. CONFIGURER LE BACKEND (Variables d'environnement)**

### **Backend User : `.env`**

Ajouter la variable suivante :

```bash
# Slack Migration Alerts
SLACK_WEBHOOK_MIGRATION=https://hooks.slack.com/services/YOUR_SLACK_WORKSPACE/YOUR_CHANNEL/YOUR_WEBHOOK_TOKEN

# Admin Dashboard URL (pour liens directs)
ADMIN_DASHBOARD_URL=https://admin.cylimit.com
```

**⚠️ Remplacer** `SLACK_WEBHOOK_MIGRATION` par l'URL de votre webhook créé à l'étape 1.

---

### **Backend User : `src/config/envs/development.ts` (Optionnel)**

Vous pouvez aussi ajouter le webhook directement dans la config :

```typescript
export const config = {
  // ... autres configs ...

  slackWebhooks: {
    nftSale: 'https://hooks.slack.com/services/T03.../B04.../xxx',
    migration: process.env.SLACK_WEBHOOK_MIGRATION || '', // ✅ NOUVEAU
  },

  // ... autres configs ...
};
```

---

## 📨 **4. FORMAT DES NOTIFICATIONS**

### **A. Migration Failed Alert (Initial)**

```
🚨 MIGRATION FAILED - Action Required

User: valentin@cylimit.com
User ID: 507f1f77bcf86cd799439011
Failed NFTs: 50/100
Transferred: 50/100

Errors:
• Network timeout
• Gas price spike
• Ownership mismatch

Action Required:
1. Investigate the issue
2. Fix the problem (network, gas, ownership)
3. Retry migration via dashboard or API

[🔍 View Details] → https://admin.cylimit.com/users/507f.../migration
```

---

### **B. Retry Failed Alert**

```
🔄 RETRY FAILED - Action Required

User: valentin@cylimit.com
User ID: 507f1f77bcf86cd799439011
Failed NFTs: 10/50
Transferred: 40/50

Errors:
• Ownership mismatch
• ...

Action Required:
1. Investigate the issue
2. Fix the problem
3. Retry again via dashboard

[🔍 View Details] → https://admin.cylimit.com/users/507f.../migration
```

---

### **C. Retry Success Notification**

```
✅ Migration Retry Successful

User: valentin@cylimit.com
Transferred: 50/50 NFTs

[📊 View Details] → https://admin.cylimit.com/users/507f.../migration
```

---

## 🧪 **5. TESTER LA CONFIGURATION**

### **Option A : Via Code (Recommandé)**

Créer un script de test :

```typescript
// test-slack.ts
import { SlackMigrationService } from './src/modules/user/services/slack-migration.service';

async function testSlack() {
  const slackService = new SlackMigrationService();

  // Test connection
  const result = await slackService.testConnection();
  console.log(result ? '✅ Slack configured!' : '❌ Slack not configured');
}

testSlack();
```

Puis lancer :

```bash
cd cylimit-backend-develop
npx ts-node test-slack.ts
```

---

### **Option B : Via cURL**

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"text": "✅ Test: Slack Migration Alerts configured!"}' \
  https://hooks.slack.com/services/T03.../B04.../xxx
```

(Remplacer l'URL par votre webhook)

---

### **Option C : Déclencher une migration test**

1. Créer un user test avec quelques NFTs
2. Déclencher une migration manuelle
3. Simuler un échec (déconnecter réseau temporairement)
4. Vérifier que l'alerte Slack arrive

---

## 🎨 **6. PERSONNALISER LES MENTIONS (Optionnel)**

### **Mentionner des personnes spécifiques**

Modifier `slack-migration.service.ts` :

```typescript
const message = {
  text: `🚨 *MIGRATION FAILED* - <@U123456> <@U789012>`, // Mentions
  blocks: [
    // ... (reste du message)
  ],
};
```

**Comment trouver l'User ID Slack ?**

1. Cliquer sur le profil de la personne dans Slack
2. Copier l'ID de membre (ex: `U123456789`)
3. Ou utiliser : `@channel`, `@here`

---

## 🔥 **7. WORKFLOW COMPLET**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User login → Embedded Wallet créé                       │
│ 2. MigrationService.migrateUserAssets() démarre           │
│ 3. ❌ Migration échoue (ex: Network timeout)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SlackService.sendMigrationFailedAlert() envoyé          │
│ 5. 📢 Alerte Slack reçue dans #migration-alerts-admin      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Admin clique sur "View Details"                         │
│ 7. Admin investigate (logs, network, gas)                  │
│ 8. Admin résout le problème                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Admin clique "Retry Migration" (Dashboard)              │
│ 10. POST /users/:userId/retry-nft-migration (Backend)      │
│ 11. MigrationService.retryFailedNFTMigration() exécuté    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 12a. ✅ Retry réussi                                        │
│      → SlackService.sendMigrationRetrySuccess()            │
│      → 📢 Notification Slack positive                      │
│                                                             │
│ 12b. ❌ Retry échoué                                        │
│      → SlackService.sendMigrationFailedAlert(isRetry=true)│
│      → 📢 Alerte Slack (Retry Failed)                      │
│      → Go to step 6 (Admin re-investigate)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 **8. CHECKLIST CONFIGURATION**

- [ ] Webhook Slack créé (`SLACK_WEBHOOK_MIGRATION`)
- [ ] Canal privé `#migration-alerts-admin` créé
- [ ] Admins invités dans le canal
- [ ] Variable `SLACK_WEBHOOK_MIGRATION` ajoutée au `.env`
- [ ] Variable `ADMIN_DASHBOARD_URL` configurée
- [ ] Test de connexion réussi (`testConnection()`)
- [ ] Test migration échouée → Alerte Slack reçue
- [ ] Test retry réussi → Notification Slack reçue

---

## 🚨 **9. TROUBLESHOOTING**

### **Problème : Pas d'alerte Slack reçue**

1. Vérifier que `SLACK_WEBHOOK_MIGRATION` est bien configuré dans `.env`
2. Vérifier les logs backend :
   ```
   ✅ Slack migration alerts enabled
      Webhook: https://hooks.slack.com/services/...
   ```
3. Tester manuellement avec cURL (voir section 5B)
4. Vérifier que l'app Slack est bien installée dans le workspace
5. Vérifier que le canal existe et que le webhook pointe dessus

---

### **Problème : Alerte envoyée mais pas visible dans Slack**

1. Vérifier que vous êtes invité dans le canal `#migration-alerts-admin`
2. Vérifier que le canal n'est pas masqué (clic droit → "Show")
3. Vérifier dans Slack App Directory que l'app est installée

---

### **Problème : Alerte envoyée à tout le monde**

⚠️ **Le webhook pointe vers un canal public !**

1. Créer un nouveau canal **privé** `#migration-alerts-admin`
2. Recréer un webhook pointant vers ce nouveau canal
3. Mettre à jour `SLACK_WEBHOOK_MIGRATION` dans `.env`

---

## 🎯 **10. RÉSUMÉ RAPIDE**

| Variable | Valeur | Où ? |
|----------|--------|------|
| `SLACK_WEBHOOK_MIGRATION` | `https://hooks.slack.com/services/...` | `.env` |
| `ADMIN_DASHBOARD_URL` | `https://admin.cylimit.com` | `.env` |
| Canal Slack | `#migration-alerts-admin` (privé) | Slack Workspace |
| Membres | Tech Lead, DevOps, Admins autorisés | Slack Channel |

---

## 🔗 **11. LIENS UTILES**

- [Slack API : Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Slack API : Formatting Messages](https://api.slack.com/reference/surfaces/formatting)
- [Slack API : Block Kit](https://api.slack.com/block-kit)
- [Code : `slack-migration.service.ts`](../../../cylimit-backend-develop/src/modules/user/services/slack-migration.service.ts)
- [Code : `migration.service.ts`](../../../cylimit-backend-develop/src/modules/user/services/migration.service.ts)
- [Code : `user.controller.ts`](../../../cylimit-backend-develop/src/base/controllers/user.controller.ts)

---

✅ **Configuration terminée !** Vous recevrez désormais des alertes ciblées pour chaque migration échouée, avec un lien direct vers le dashboard admin pour retry.

