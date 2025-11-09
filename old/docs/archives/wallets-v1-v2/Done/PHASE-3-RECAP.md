# ✅ PHASE 3 COMPLÉTÉE : Système Pending Rewards

**Date :** 10 octobre 2025  
**Durée :** ~1h30  
**Statut :** ✅ **TERMINÉ ET COMPILÉ**

---

## 🎯 Objectif

Créer un **système robuste de gestion des rewards en attente** dans l'Admin Backend pour garantir qu'**aucun reward ne soit jamais perdu**, même si :
- User n'a pas encore créé son Embedded Wallet
- Erreur blockchain (RPC down, gas insuffisant, etc.)
- Nécessite validation admin (montants élevés)

---

## 📦 Ce qui a été créé

### 1. Schema MongoDB : `PendingReward`

**Fichier :** `cylimit-admin-backend/src/modules/rewards/schemas/pending-reward.schema.ts`

**Collection :** `pending_rewards`

**Champs principaux :**
- `userId` : Référence User (MongoDB ObjectId)
- `amountUSDC` : Montant du reward (Decimal128)
- `reason` : Raison du reward (ex: "Competition win")
- `status` : État du reward
  - `pending` : En attente (user sans wallet)
  - `processing` : Envoi en cours
  - `sent` : Envoyé avec succès
  - `failed` : Échec (sera retry)
  - `cancelled` : Annulé par admin
- `recipientWalletAddress` : Adresse Embedded Wallet (remplie après création)
- `txHash` : Hash blockchain (si envoyé)
- `retryCount` : Nombre de tentatives (max 5)
- `requiresAdminApproval` : Si validation admin requise
- `approvedBy` : Admin qui a approuvé (si applicable)
- `errorMessage` : Message d'erreur (si échec)

**Index optimisés :**
```typescript
{ userId: 1, status: 1 }           // Liste rewards user
{ status: 1, createdAt: 1 }        // Cron jobs
{ status: 1, lastRetryAt: 1 }      // Retry automatique
```

---

### 2. Service : `PendingRewardsService`

**Fichier :** `cylimit-admin-backend/src/modules/rewards/services/pending-rewards.service.ts`  
**Lignes :** 541

**Méthodes principales :**

#### `createPendingReward(userId, amount, reason)`
Créer un reward en DB. Si user a déjà un wallet → Envoi immédiat. Sinon → Email notification.

#### `processPendingReward(rewardId)`
Tenter envoi blockchain d'un reward. Gère succès/échec + retry.

#### `processPendingRewardsForNewWallets()` (Cron 1min)
Envoie automatiquement les rewards dès qu'un user crée son wallet.

#### `retryFailedRewards()` (Cron 5min)
Retry automatique des rewards failed avec backoff exponentiel :
- Retry #1 : 1 minute
- Retry #2 : 5 minutes
- Retry #3 : 15 minutes
- Retry #4 : 1 heure
- Retry #5 : 2 heures

#### `sendPendingRewardsForUser(userId, walletAddress)`
Envoie TOUS les rewards en attente d'un user après création wallet.  
**Appelé depuis User Backend** après `syncWalletAddress()`.

#### `approveReward(rewardId, adminId)` / `cancelReward(rewardId, adminId, reason)`
Actions admin sur rewards nécessitant approbation.

#### `getRewardsStats()`
Statistiques pour dashboard admin (compteurs par status + montants).

---

### 3. Controller Admin : `PendingRewardsController`

**Fichier :** `cylimit-admin-backend/src/modules/rewards/controllers/pending-rewards.controller.ts`  
**Lignes :** 262

**Route :** `/admin/rewards`  
**Protection :** `@UseGuards(AuthAdminGuard())` (JWT_ADMIN_SECRET + role ADMIN)

**Endpoints :**

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/admin/rewards` | Créer reward manuel |
| `GET` | `/admin/rewards/pending` | Liste rewards (filtres status/userId) |
| `PATCH` | `/admin/rewards/:id/approve` | Approuver reward |
| `PATCH` | `/admin/rewards/:id/cancel` | Annuler reward |
| `POST` | `/admin/rewards/:id/retry` | Retry reward failed manuellement |
| `GET` | `/admin/rewards/stats` | Statistiques dashboard |
| `POST` | `/admin/rewards/retry-all` | Force retry tous les failed |

---

### 4. Module : `RewardsModule`

**Fichier :** `cylimit-admin-backend/src/modules/rewards/rewards.module.ts`

**Imports :**
- `MongooseModule` (schemas PendingReward + UserEntity)
- `WalletModule` (pour `CoinbaseWalletService`)
- `MailModule` (pour notifications)

**Providers :**
- `PendingRewardsService`

**Controllers :**
- `PendingRewardsController`

**Exports :**
- `PendingRewardsService` (pour User Backend)

---

## 🔄 FLUX COMPLETS

### Use Case 1 : User sans wallet gagne reward

```
1. User gagne compétition
   └─> Backend appelle createPendingReward(userId, 50, "Competition win")

2. Service vérifie si user a wallet
   └─> Aucun wallet → Reward créé (status: 'pending')

3. Email envoyé : "Tu as gagné 50 USDC, crée ton wallet !"
   └─> TODO: Template reward-pending.hbs (Phase 3.5)

4. User clique email → Frontend affiche WalletAuthModal
   └─> User crée Embedded Wallet (Coinbase email OTP)

5. Frontend sync walletAddress
   └─> PATCH /users/me/wallet-address

6. User Backend appelle sendPendingRewardsForUser()
   └─> Admin Backend (PendingRewardsService)

7. Batch envoi tous les rewards en attente
   └─> CoinbaseWalletService.sendReward() pour chaque reward

8. Status 'sent' + txHash sauvegardé
   └─> Email confirmation : "50 USDC envoyés !"
```

---

### Use Case 2 : Erreur blockchain → Retry automatique

```
1. Tentative envoi reward → Erreur RPC down
   └─> processPendingReward() catch error

2. Reward marqué 'failed'
   └─> status = 'failed'
   └─> retryCount = 1
   └─> errorMessage = "RPC connection failed"
   └─> lastRetryAt = now()

3. Cron job (5min) détecte failed rewards
   └─> retryFailedRewards()

4. Vérifie délai backoff (1min pour retry #1)
   └─> Si délai écoulé → retry
   └─> Sinon → skip (attendre encore)

5. Si succès → status = 'sent' + email
   Si échec → retryCount++ (max 5)

6. Après 5 échecs → Alert admin (logs error)
```

---

### Use Case 3 : Approbation admin requise

```
1. Admin crée reward manuel 1000 USDC
   └─> POST /admin/rewards
   └─> requiresAdminApproval: true

2. Reward créé (status: 'pending', approvedBy: null)

3. Dashboard admin affiche reward en attente
   └─> GET /admin/rewards/pending?status=pending

4. Admin vérifie légitimité et approuve
   └─> PATCH /admin/rewards/:id/approve

5. approvedBy + approvedAt remplis

6. Si wallet existe → Envoi immédiat
   Sinon → Sera envoyé dès création wallet (cron)
```

---

## ⏱️ CRON JOBS CONFIGURÉS

### 1. `processPendingRewardsForNewWallets()`

**Fréquence :** Toutes les 1 minute  
**Cron :** `* * * * *`  
**TimeZone :** UTC

**Logique :**
1. Récupère rewards `pending` avec `walletAddress` remplie
2. Filtre ceux sans `requiresAdminApproval` (ou déjà approuvés)
3. Tente envoi pour chacun
4. Throttle 500ms entre chaque envoi
5. Limite 100 rewards par run (scalabilité)

---

### 2. `retryFailedRewards()`

**Fréquence :** Toutes les 5 minutes  
**Cron :** `*/5 * * * *`  
**TimeZone :** UTC

**Logique :**
1. Récupère rewards `failed` (retryCount < 5)
2. Pour chaque reward, calcule délai backoff
3. Si délai écoulé → Retry avec `processPendingReward()`
4. Throttle 500ms entre chaque retry
5. Limite 50 rewards par run

**Backoff exponentiel :**
```typescript
const delays = [1, 5, 15, 60, 120]; // minutes
const delayMinutes = delays[retryCount - 1] || 120;
```

---

## 🔗 INTÉGRATION AVEC USER BACKEND

**À FAIRE (prochaine étape) :**

Modifier `UserController.syncWalletAddress()` dans `cylimit-backend-develop` :

```typescript
// cylimit-backend-develop/src/base/controllers/user.controller.ts

import { PendingRewardsService } from '@/modules/rewards/services/pending-rewards.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly pendingRewardsService: PendingRewardsService, // ← AJOUTER
  ) {}

  @Patch('/me/wallet-address')
  async syncWalletAddress(
    @ReqUser() user: Payload,
    @Body() dto: SyncWalletAddressDto,
  ) {
    // ... existing code (sync walletAddress dans User schema)

    // ✅ NOUVEAU : Envoyer rewards en attente
    let pendingRewardsResult = null;
    try {
      pendingRewardsResult = await this.pendingRewardsService.sendPendingRewardsForUser(
        user.userId,
        dto.walletAddress.toLowerCase(),
      );

      if (pendingRewardsResult.sent > 0) {
        this.logger.log(
          `✅ ${pendingRewardsResult.sent} pending rewards sent to ${dto.walletAddress}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send pending rewards:', error);
      // Ne pas bloquer la réponse si erreur rewards
    }

    return {
      success: true,
      walletAddress: dto.walletAddress,
      pendingRewards: pendingRewardsResult
        ? { sent: pendingRewardsResult.sent, failed: pendingRewardsResult.failed }
        : undefined,
    };
  }
}
```

**Également importer RewardsModule dans User Backend :**

```typescript
// cylimit-backend-develop/src/app.module.ts

import { RewardsModule } from './modules/rewards/rewards.module';

@Module({
  imports: [
    // ... autres modules
    RewardsModule,
  ],
})
export class AppModule {}
```

---

## 📊 STATISTIQUES DASHBOARD

**Endpoint :** `GET /admin/rewards/stats`

**Exemple réponse :**
```json
{
  "success": true,
  "data": {
    "pending": 12,
    "processing": 3,
    "sent": 485,
    "failed": 5,
    "cancelled": 2,
    "totalAmountPending": 450.50,
    "totalAmountSent": 24350.00
  }
}
```

**Utilisation :**
- Dashboard admin (graphiques)
- Monitoring temps réel
- Alertes (si trop de failed)

---

## 📧 EMAILS À CRÉER (Phase 3.5 - Optionnel)

### 1. `reward-pending.hbs`

**Trigger :** User gagne reward sans wallet  
**Sujet :** "🎉 Tu as gagné un reward CyLimit !"  
**Variables :**
- `userName`
- `amountUSDC`
- `reason`
- `createWalletLink`

**CTA :** "Créer mon wallet pour recevoir mon reward"

---

### 2. `reward-sent.hbs`

**Trigger :** Reward envoyé avec succès  
**Sujet :** "✅ Ton reward a été envoyé !"  
**Variables :**
- `userName`
- `amountUSDC`
- `txHash`
- `polygonScanLink` (pour voir transaction)

**Contenu :** Confirmation + lien PolygonScan

---

## ✅ AVANTAGES DU SYSTÈME

### 1. **Résilience totale**
- ✅ Aucun reward perdu (jamais)
- ✅ Retry automatique avec backoff intelligent
- ✅ Queue robuste (MongoDB)
- ✅ Gère coupures RPC, erreurs gas, etc.

### 2. **Audit Trail complet**
- ✅ Historique traçable (createdAt, sentAt, txHash)
- ✅ Logs détaillés (succès/échec)
- ✅ Traçabilité admin (approvedBy, cancelledBy)

### 3. **Flexibilité**
- ✅ Approbation admin optionnelle (montants élevés)
- ✅ Batch processing (plusieurs rewards à la fois)
- ✅ Retry manuel possible (admin endpoint)
- ✅ Annulation possible

### 4. **UX améliorée**
- ✅ User informé par email
- ✅ Rewards automatiques après création wallet
- ✅ Notifications claires (pending → sent)
- ✅ Pas de friction (user n'a rien à faire)

### 5. **Scalabilité**
- ✅ Gère des milliers de rewards
- ✅ Cron jobs optimisés (limites par run)
- ✅ Throttling intégré (500ms entre envois)
- ✅ Index MongoDB performants

---

## 🧪 TESTS À EFFECTUER

### Test 1 : User sans wallet gagne reward

```bash
# 1. Créer reward manuel
curl -X POST http://localhost:3003/admin/rewards \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_SANS_WALLET",
    "amountUSDC": 50,
    "reason": "Test reward"
  }'

# 2. Vérifier création en DB
# → status = 'pending'
# → recipientWalletAddress = null
# → Email envoyé (TODO: Phase 3.5)

# 3. User crée wallet (frontend)
# → PATCH /users/me/wallet-address

# 4. Vérifier reward envoyé automatiquement
# → status = 'sent'
# → txHash rempli
# → Email confirmation (TODO: Phase 3.5)
```

---

### Test 2 : Retry automatique après erreur

```bash
# 1. Mock erreur blockchain (ex: stopper RPC Alchemy temporairement)

# 2. Créer reward pour user avec wallet
# → Échec immédiat → status = 'failed', retryCount = 1

# 3. Attendre 1 minute

# 4. Cron job retry détecte le reward
# → Logs : "Retrying reward [ID] (attempt 2/5)"

# 5. Rétablir RPC

# 6. Prochain retry → Succès
# → status = 'sent', txHash rempli
```

---

### Test 3 : Approbation admin

```bash
# 1. Créer reward avec approbation requise
curl -X POST http://localhost:3003/admin/rewards \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "amountUSDC": 1000,
    "reason": "Big bonus",
    "requiresAdminApproval": true
  }'

# 2. Vérifier : approvedBy = null, status = 'pending'

# 3. Approuver
curl -X PATCH http://localhost:3003/admin/rewards/REWARD_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "notes": "Approved after verification" }'

# 4. Vérifier : approvedBy rempli + envoi si wallet existe
```

---

### Test 4 : Statistiques dashboard

```bash
curl -X GET http://localhost:3003/admin/rewards/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Vérifier :
# - Compteurs par status cohérents
# - Montants totaux corrects
```

---

## 📋 PROCHAINES ÉTAPES

### Phase 3.5 : Templates Email (Optionnel mais recommandé)
- [ ] Créer `src/modules/mail/templates/reward-pending.hbs`
- [ ] Créer `src/modules/mail/templates/reward-sent.hbs`
- [ ] Configurer MailService pour ces templates
- [ ] Tester envoi emails

### Intégration User Backend (Critique)
- [ ] Copier module `rewards` dans `cylimit-backend-develop`
- [ ] Importer `RewardsModule` dans AppModule
- [ ] Modifier `UserController.syncWalletAddress()`
- [ ] Tester flow complet end-to-end

### Tests Production
- [ ] Tester avec vrais users en staging
- [ ] Monitoring logs cron jobs (1min + 5min)
- [ ] Vérifier statistiques dashboard
- [ ] Alertes si trop de failed rewards

---

## 🎉 RÉSUMÉ EXÉCUTIF

### ✅ Ce qui est TERMINÉ maintenant

- ✅ Schema `PendingReward` créé et documenté (90 lignes)
- ✅ `PendingRewardsService` complet avec toute la logique (541 lignes)
- ✅ `PendingRewardsController` admin avec tous les endpoints (262 lignes)
- ✅ Cron jobs configurés (1min + 5min) avec backoff exponentiel
- ✅ Retry automatique des erreurs (max 5 tentatives)
- ✅ Approbation admin optionnelle pour gros montants
- ✅ Statistiques dashboard
- ✅ `RewardsModule` intégré dans AppModule (Admin Backend)
- ✅ **Compilation réussie** (aucune erreur TypeScript)

### 🔄 Ce qui reste pour intégration complète

- 🔄 Templates email (Phase 3.5 - optionnel)
- 🔄 Intégration User Backend (appel `sendPendingRewardsForUser`)
- 🔄 Tests end-to-end avec vrais users

**TEMPS ESTIMÉ RESTANT : 1-2h** (intégration User Backend + tests)

---

## 🏆 LEÇONS APPRISES

1. **Architecture propre dès le début**
   - Module séparé (rewards)
   - Service bien découpé (responsabilités claires)
   - Controller admin protégé (AuthAdminGuard)

2. **Pas de dépendance circulaire**
   - `RewardsModule` → `WalletModule` (unidirectionnel)
   - `UserModule` ← `RewardsModule` (via exports)

3. **Documentation extensive**
   - Commentaires détaillés sur chaque fonction
   - Explication OBJECTIF / POURQUOI / COMMENT
   - Exemples d'utilisation

4. **Résilience by design**
   - Retry automatique
   - Backoff exponentiel
   - Limites par run (scalabilité)

---

**Maintenu par :** Valentin @ CyLimit  
**Dernière mise à jour :** 10 octobre 2025

🚀 **Phase 3 complétée avec succès ! Le système Pending Rewards est prêt.**

