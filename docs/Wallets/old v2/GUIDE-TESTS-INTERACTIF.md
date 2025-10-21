# 🧪 GUIDE DE TESTS INTERACTIF - WALLET SYSTEM

**Date :** 10 octobre 2025  
**Statut :** 🔄 **EN COURS**

---

## 📋 PLAN DE TESTS

### Tests à effectuer (dans l'ordre)

1. ✅ **Configuration environnement** (5 min)
2. 🔄 **Tests Admin Backend** (1h30)
   - Lancer backend admin
   - Tester endpoints NFT Sync
   - Tester Pending Rewards
3. 🔄 **Tests User Backend** (30 min)
   - Lancer backend user
   - Tester vérification ownership
4. 🔄 **Tests Frontend** (55 min)
   - Tester onboarding modal
   - Tester required modal

**Temps total estimé : 3h**

---

## ✅ ÉTAPE 1 : CONFIGURATION ENVIRONNEMENT (5 min)

### Admin Backend

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-admin-backend
```

**Variables à configurer dans `env` :**

```bash
# ⚠️ IMPORTANT : Remplacer par tes vraies valeurs
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NFT_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890  # Adresse réelle du contrat
```

**Pour obtenir une clé Alchemy :**
1. Aller sur https://www.alchemy.com/
2. Créer un compte (gratuit)
3. Créer une app "Polygon Mainnet"
4. Copier la clé API

---

### User Backend

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop
```

**Vérifier que le fichier `.env` contient :**

```bash
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NFT_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890  # Même adresse que admin
```

---

## 🔄 ÉTAPE 2 : TESTS ADMIN BACKEND (1h30)

### 2.1 Lancer Backend Admin (5 min)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-admin-backend

# Installer dépendances (si pas déjà fait)
npm install

# Lancer backend
npm run start:dev
```

**Vérifications :**
- ✅ Server démarre sur port 3001 (ou 3003)
- ✅ Logs affichent : "✅ NFT Contract initialized: 0x..."
- ✅ Pas d'erreur de connexion MongoDB

---

### 2.2 Obtenir TOKEN_ADMIN (10 min)

**Méthode 1 : Via Postman/Insomnia**

```http
POST http://localhost:3001/v1/admin/auth/login
Content-Type: application/json

{
  "email": "admin@cylimit.com",
  "password": "your_admin_password"
}
```

**Méthode 2 : Via curl**

```bash
curl -X POST http://localhost:3001/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cylimit.com",
    "password": "your_admin_password"
  }'
```

**Réponse attendue :**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ COPIER LE TOKEN** et l'exporter :

```bash
export TOKEN_ADMIN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2.3 Obtenir NFT_ID pour tests (5 min)

**Méthode 1 : Via MongoDB Compass**

```javascript
// Se connecter à MongoDB
mongodb://localhost:27017/cylimit

// Requête dans collection "nfts"
db.nfts.findOne({ tokenId: { $exists: true, $ne: null } })

// Copier le "_id"
```

**Méthode 2 : Via curl**

```bash
curl http://localhost:3001/v1/admin/nfts?limit=1 \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Exporter l'ID :**

```bash
export NFT_ID="64f5a3c1234567890abcdef0"  # Remplacer par ID réel
```

---

### 2.4 Test NFT Sync Endpoints (20 min)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-admin-backend

# Lancer script de test
bash test-nft-sync-endpoints.sh
```

**Résultats attendus :**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEST 1 : POST /admin/nft/sync/:nftId
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Réponse:
{
  "success": true,
  "data": {
    "nftId": "64f5a3c1234567890abcdef0",
    "tokenId": 123,
    "ownerIdInDB": "64f5a3c1...",
    "ownerOnChain": "64f5a3c1...",
    "ownerWalletAddress": "0x1234...",
    "wasOutOfSync": false
  }
}

✅ TEST 1 PASSED : NFT sync réussi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEST 2 : POST /admin/nft/sync/audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Réponse:
{
  "success": true,
  "message": "Audit lancé en background. Consulter les logs pour suivre la progression."
}

✅ TEST 2 PASSED : Audit lancé en background

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEST 3 : Vérification AuthAdminGuard (sans token)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Réponse:
{
  "statusCode": 401,
  "message": "Unauthorized"
}

✅ TEST 3 PASSED : Endpoint bien protégé (401/403)
```

**Vérifier logs backend :**

```bash
tail -f backend.log | grep -i "sync\|audit"
```

**Logs attendus :**

```
🔧 Admin triggered full NFT audit
Starting daily NFT ownership audit...
Daily NFT ownership audit finished. Out of sync: 0, External wallets: 0
```

---

### 2.5 Test Pending Rewards - User AVEC wallet (20 min)

**1. Identifier un user avec wallet**

```bash
# Via MongoDB Compass
db.users.findOne({ walletAddress: { $exists: true, $ne: null } })

# Copier le "_id"
export USER_ID_WITH_WALLET="64f5a3c1234567890abcdef0"
```

**2. Créer pending reward**

```bash
curl -X POST http://localhost:3001/v1/admin/rewards \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_WITH_WALLET'",
    "amountUSDC": 10,
    "reason": "Test reward avec wallet",
    "requiresAdminApproval": false
  }'
```

**Réponse attendue :**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "64f5a3c1...",
    "amountUSDC": 10,
    "reason": "Test reward avec wallet",
    "status": "pending",
    "recipientWalletAddress": "0x...",
    "createdAt": "2025-10-10T..."
  }
}
```

**3. Vérifier auto-process (attendre 1-2 min)**

```bash
# Consulter logs
tail -f backend.log | grep -i "reward\|pending"
```

**Logs attendus :**

```
✅ Pending reward created: 10 USDC for user 64f5a3c1... (Test reward avec wallet)
🚀 Processing 1 pending rewards for new wallets...
✅ Reward <rewardId> sent: 10 USDC → 0x... (TX: 0x...)
```

**4. Vérifier status en DB**

```javascript
// MongoDB Compass
db.pendingrewards.findOne({ userId: ObjectId("64f5a3c1...") })

// Vérifier :
// - status: "sent"
// - txHash: "0x..."
// - sentAt: Date
```

---

### 2.6 Test Pending Rewards - User SANS wallet (20 min)

**1. Identifier un user sans wallet**

```bash
# Via MongoDB Compass
db.users.findOne({ walletAddress: { $exists: false } })

# Copier le "_id"
export USER_ID_WITHOUT_WALLET="64f5a3c1234567890abcdef1"
```

**2. Créer pending reward**

```bash
curl -X POST http://localhost:3001/v1/admin/rewards \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_WITHOUT_WALLET'",
    "amountUSDC": 25,
    "reason": "Test reward sans wallet",
    "requiresAdminApproval": false
  }'
```

**3. Vérifier que reward reste en pending**

```bash
curl http://localhost:3001/v1/admin/rewards/pending?userId=$USER_ID_WITHOUT_WALLET \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Réponse attendue :**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "64f5a3c1...",
      "amountUSDC": 25,
      "status": "pending",
      "recipientWalletAddress": null,
      "reason": "Test reward sans wallet"
    }
  ]
}
```

**4. Vérifier email notification**

Consulter boîte mail du user → Email "Tu as gagné 25 USDC ! Crée ton wallet pour recevoir."

---

### 2.7 Test Retry Failed Reward (20 min)

**1. Simuler échec (wallet rewards vide)**

Pour simuler un échec, on peut temporairement désactiver le wallet rewards ou modifier le code pour forcer une erreur.

**Méthode simple : Modifier temporairement le code**

```typescript
// Dans pending-rewards.service.ts, ligne ~150
const { txHash } = await this.coinbaseWalletService.sendReward(
  user.walletAddress,
  reward.amountUSDC
);

// Remplacer temporairement par :
throw new Error('Simulated failure for testing');
```

**2. Créer reward (va échouer)**

```bash
curl -X POST http://localhost:3001/v1/admin/rewards \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_WITH_WALLET'",
    "amountUSDC": 5,
    "reason": "Test retry failed",
    "requiresAdminApproval": false
  }'
```

**3. Vérifier status = failed**

```bash
curl http://localhost:3001/v1/admin/rewards/pending?status=failed \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**4. Attendre cron job retry (5 min max)**

```bash
tail -f backend.log | grep -i "retry"
```

**Logs attendus :**

```
🔄 Retrying 1 failed rewards...
❌ Failed to send reward <rewardId> (attempt 2): Simulated failure for testing
```

**5. Restaurer le code original et retry manuel**

```bash
# Restaurer le code dans pending-rewards.service.ts
# Puis retry manuel

curl -X POST http://localhost:3001/v1/admin/rewards/<REWARD_ID>/retry \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

---

### 2.8 Test Admin Approve/Cancel (10 min)

**1. Créer reward avec approval required**

```bash
curl -X POST http://localhost:3001/v1/admin/rewards \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_WITH_WALLET'",
    "amountUSDC": 100,
    "reason": "Big reward requiring approval",
    "requiresAdminApproval": true
  }'
```

**Copier le reward ID depuis la réponse**

**2. Approuver reward**

```bash
export REWARD_ID="..."

curl -X PATCH http://localhost:3001/v1/admin/rewards/$REWARD_ID/approve \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Approved by admin after verification"
  }'
```

**3. Vérifier auto-process après approval**

```bash
tail -f backend.log | grep -i "reward\|approved"
```

---

### 2.9 Test Statistiques (5 min)

```bash
curl http://localhost:3001/v1/admin/rewards/stats \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Réponse attendue :**

```json
{
  "success": true,
  "data": {
    "pending": 1,
    "processing": 0,
    "sent": 5,
    "failed": 1,
    "cancelled": 0,
    "totalAmountPending": 25,
    "totalAmountSent": 45,
    "avgProcessingTime": 12000
  }
}
```

---

## ✅ RÉSUMÉ TESTS ADMIN BACKEND

| Test | Statut | Temps |
|------|--------|-------|
| Configuration | ✅ | 5 min |
| NFT Sync Endpoints | 🔄 | 20 min |
| Pending Rewards (avec wallet) | 🔄 | 20 min |
| Pending Rewards (sans wallet) | 🔄 | 20 min |
| Retry Failed Reward | 🔄 | 20 min |
| Admin Approve/Cancel | 🔄 | 10 min |
| Statistiques | 🔄 | 5 min |
| **TOTAL** | 🔄 | **1h30** |

---

## 🔄 ÉTAPE 3 : TESTS USER BACKEND (30 min)

### 3.1 Lancer Backend User (5 min)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Lancer backend (autre terminal)
npm run start:dev
```

**Vérifications :**
- ✅ Server démarre sur port 3002
- ✅ Logs affichent : "✅ NFT Contract initialized: 0x..."

---

### 3.2 Obtenir TOKEN_USER (5 min)

```bash
curl -X POST http://localhost:3002/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'

# Exporter token
export TOKEN_USER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3.3 Test Listing NFT (20 min)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Identifier NFT appartenant au user
export NFT_ID="..."  # NFT owned by TOKEN_USER
export NFT_ID_NOT_OWNED="..."  # NFT NOT owned by TOKEN_USER

# Lancer script
bash test-nft-sync-listing.sh
```

**Résultats attendus :**

```
✅ TEST 1 PASSED : NFT listé avec succès
✅ TEST 2 PASSED : Listing bloqué correctement
```

---

## 🔄 ÉTAPE 4 : TESTS FRONTEND (55 min)

### 4.1 Lancer Frontend (5 min)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-frontend-develop

npm run dev
```

**Ouvrir :** http://localhost:3000

---

### 4.2 Test WalletOnboardingModal (20 min)

**Scénario : Premier login nouveau user**

1. Supprimer localStorage complet (DevTools → Application → Local Storage → Clear All)
2. Créer nouveau compte (signup)
3. Login avec nouveau compte
4. Attendre 1 seconde
5. ✅ **Vérifier :** WalletOnboardingModal s'affiche
6. Cliquer "Plus tard"
7. ✅ **Vérifier :** `localStorage.getItem('walletOnboardingSkipped') === 'true'`
8. Recharger page
9. ✅ **Vérifier :** Modal ne s'affiche plus

---

### 4.3 Test Création Wallet via Onboarding (20 min)

1. Supprimer localStorage
2. Login nouveau user
3. Attendre 1 seconde
4. ✅ **Vérifier :** WalletOnboardingModal s'affiche
5. Cliquer "Créer maintenant"
6. ✅ **Vérifier :** WalletOnboardingModal se ferme
7. ✅ **Vérifier :** WalletAuthModal s'affiche
8. Entrer email (email CyLimit du user)
9. Recevoir OTP par email
10. Entrer OTP
11. ✅ **Vérifier :** Wallet créé (adresse affichée)
12. Recharger page
13. ✅ **Vérifier :** Aucun modal ne s'affiche

---

### 4.4 Test WalletRequiredModal (10 min)

**Scénario : User sans wallet essaie d'acheter NFT**

1. Login user sans wallet
2. Aller sur marketplace
3. Cliquer "Acheter" sur un NFT
4. ✅ **Vérifier :** WalletRequiredModal s'affiche
5. ✅ **Vérifier :** Message "Wallet requis pour acheter"
6. Cliquer "Créer mon wallet"
7. ✅ **Vérifier :** WalletRequiredModal se ferme
8. ✅ **Vérifier :** WalletAuthModal s'affiche

---

## ✅ CHECKLIST FINALE

### Admin Backend
- [ ] NFT Sync Endpoints testés
- [ ] Pending Rewards (avec wallet) testé
- [ ] Pending Rewards (sans wallet) testé
- [ ] Retry failed reward testé
- [ ] Admin approve/cancel testé
- [ ] Statistiques testées

### User Backend
- [ ] NFT Sync Listing testé
- [ ] Ownership verification testée

### Frontend
- [ ] WalletOnboardingModal testé
- [ ] Création wallet via onboarding testée
- [ ] WalletRequiredModal testée

---

**Maintenu par :** Valentin @ CyLimit  
**Dernière mise à jour :** 10 octobre 2025

**🧪 TESTS EN COURS... Bon courage ! 🚀**

