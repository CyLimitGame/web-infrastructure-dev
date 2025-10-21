# 🧪 GUIDE DE TEST - ENDPOINTS ADMIN MIGRATION

**Date :** 14 Octobre 2025  
**Objectif :** Tester les endpoints admin de migration (MONITORING)  
**Status :** ✅ CORRIGÉ

---

## ⚠️ CORRECTION IMPORTANTE

**Les endpoints admin font uniquement du MONITORING (lecture DB).**

**Pour migrer des users, utiliser les scripts admin :**
```bash
node scripts/test-migration-single-user.js <userId>
node scripts/count-users-to-migrate.js
```

---

## 🔑 PRÉREQUIS

### 1. JWT Admin

**Récupérer un JWT admin valide :**

```bash
# Se connecter en tant qu'admin
curl -X POST "http://localhost:3000/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cylimit.com",
    "password": "your_admin_password"
  }'

# Sauvegarder le JWT
export ADMIN_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Backend Admin Lancé

```bash
cd cylimit-admin-backend
npm run start:dev
# ou
docker-compose up -d
```

### 3. User de Test

**Avoir un user avec :**
- ✅ Ancien wallet (oldWalletAddress)
- ✅ USDC balance > 0
- ✅ NFTs > 0
- ✅ Nouveau wallet (walletAddress) créé

---

## 📊 TEST 1 : STATS MIGRATION (CORRIGÉ)

**Endpoint :** `GET /admin/migration/stats`

**But :** Vérifier les stats basiques des users

**Commande :**
```bash
curl -X GET "http://localhost:3000/admin/migration/stats" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue (SIMPLIFIÉE) :**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "usersWithWallet": 450,
    "usersWithoutWallet": 1050,
    "note": "Pour des stats détaillées (USDC, NFTs, migration), utiliser: scripts/count-users-to-migrate.js"
  }
}
```

**Vérifications :**
- ✅ `success: true`
- ✅ `totalUsers` correspond au nombre d'users en DB
- ✅ `usersWithWallet + usersWithoutWallet = totalUsers`

**⚠️ Note :** Les stats détaillées (USDC, NFTs, statut migration) nécessitent les scripts admin car le schema User dans admin backend ne contient pas ces propriétés.

---

## 📋 TEST 2 : LISTE USERS (CORRIGÉ)

**Endpoint :** `GET /admin/migration/users`

**But :** Récupérer la liste basique des users

**Commande :**
```bash
# Récupérer 10 users
curl -X GET "http://localhost:3000/admin/migration/users?limit=10" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue (SIMPLIFIÉE) :**
```json
{
  "success": true,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "email": "user1@example.com",
      "walletAddress": "0xabc...",
      "hasWallet": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    ...
  ],
  "count": 10
}
```

**Vérifications :**
- ✅ `success: true`
- ✅ `count` ≤ `limit` (10)
- ✅ Users triés par `createdAt` (plus récents en premier)

**Récupérer plus de users :**
```bash
# Récupérer 100 users
curl -X GET "http://localhost:3000/admin/migration/users?limit=100" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**⚠️ Pour identifier users À MIGRER avec détails (USDC, NFTs) :**
```bash
cd cylimit-admin-backend
node scripts/count-users-to-migrate.js
```

---

## 🧪 TEST 3 : MIGRATION FORCÉE (SCRIPTS)

**⚠️ Correction :** Il n'y a PAS d'endpoint POST pour migrer.  
**Utiliser les scripts admin à la place.**

**Script : Test Migration (Dry-Run)**

**Commande :**
```bash
cd cylimit-admin-backend

# Remplacer par un vrai userId
USER_ID="507f1f77bcf86cd799439011"

# Dry-run (simulation)
DRY_RUN=true node scripts/test-migration-single-user.js $USER_ID
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "success": true,
    "usdcTransferred": true,
    "usdcAmount": 150.50,
    "nftsTransferred": 3,
    "nftsFailed": 0,
    "errors": [],
    "dryRun": true
  }
}
```

**Vérifications :**
- ✅ `success: true`
- ✅ `dryRun: true` (pas de vraies transactions)
- ✅ `usdcAmount` correspond au balance du user
- ✅ `nftsTransferred` correspond au nombre de NFTs
- ✅ `errors` est vide

---

## 🔧 TEST 4 : MIGRATION USER (DRY-RUN D'ABORD)

**Endpoint :** `POST /admin/migration/user/:userId`

**But :** Migrer un user spécifique

### Étape 1 : Dry-Run

**Commande :**
```bash
USER_ID="507f1f77bcf86cd799439011"

curl -X POST "http://localhost:3000/admin/migration/user/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true
  }' \
  | jq
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "success": true,
    "usdcTransferred": true,
    "usdcAmount": 150.50,
    "nftsTransferred": 3,
    "nftsFailed": 0,
    "errors": [],
    "dryRun": true
  }
}
```

**Vérifications :**
- ✅ `success: true`
- ✅ `dryRun: true`
- ✅ Pas d'erreurs

### Étape 2 : Migration Réelle (ATTENTION !)

**⚠️ ATTENTION : Cette commande effectue de vraies transactions blockchain !**

```bash
USER_ID="507f1f77bcf86cd799439011"

curl -X POST "http://localhost:3000/admin/migration/user/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false
  }' \
  | jq
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "success": true,
    "usdcTransferred": true,
    "usdcAmount": 150.50,
    "nftsTransferred": 3,
    "nftsFailed": 0,
    "errors": []
  }
}
```

**Vérifications post-migration :**
```bash
# 1. Vérifier balance USDC du user (Polygonscan)
open "https://polygonscan.com/address/0xNEW_WALLET_ADDRESS"

# 2. Vérifier NFTs du user (Polygonscan)
open "https://polygonscan.com/address/0xNEW_WALLET_ADDRESS#tokentxnsErc721"

# 3. Vérifier status en DB
curl -X GET "http://localhost:4000/user/wallet/me" \
  -H "Authorization: Bearer $USER_JWT" \
  | jq
```

---

## 📦 TEST 5 : MIGRATION BATCH (DRY-RUN D'ABORD)

**Endpoint :** `POST /admin/migration/batch`

**But :** Migrer plusieurs users en une seule requête

### Étape 1 : Dry-Run Batch

**Commande :**
```bash
curl -X POST "http://localhost:3000/admin/migration/batch" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ],
    "dryRun": true
  }' \
  | jq
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "succeeded": 3,
    "failed": 0,
    "details": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "success": true,
        "result": {
          "success": true,
          "usdcTransferred": true,
          "usdcAmount": 150.50,
          "nftsTransferred": 3,
          "dryRun": true
        }
      },
      ...
    ]
  }
}
```

**Vérifications :**
- ✅ `total` = nombre de `userIds`
- ✅ `succeeded + failed = total`
- ✅ Tous les `dryRun: true`

### Étape 2 : Migration Batch Réelle (ATTENTION !)

**⚠️ ATTENTION : Migrations réelles de plusieurs users !**

```bash
curl -X POST "http://localhost:3000/admin/migration/batch" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012"
    ],
    "dryRun": false
  }' \
  | jq
```

---

## 🚨 TEST 6 : GESTION DES ERREURS

### Test 6.1 : User inexistant

```bash
curl -X POST "http://localhost:3000/admin/migration/user/000000000000000000000000" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue :**
```json
{
  "statusCode": 404,
  "message": "User 000000000000000000000000 not found",
  "error": "Not Found"
}
```

### Test 6.2 : User sans Embedded Wallet

```bash
# User qui n'a pas encore créé son Embedded Wallet
curl -X POST "http://localhost:3000/admin/migration/user/$USER_WITHOUT_WALLET" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue :**
```json
{
  "statusCode": 400,
  "message": "User does not have an Embedded Wallet yet",
  "error": "Bad Request"
}
```

### Test 6.3 : Sans JWT admin

```bash
curl -X GET "http://localhost:3000/admin/migration/stats"
```

**Réponse attendue :**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## 📈 TEST 7 : VÉRIFICATION POST-MIGRATION

### Sur le Backend User

**Vérifier que l'auto-migration fonctionne toujours :**

```bash
# User se connecte avec Coinbase
curl -X POST "http://localhost:4000/user/wallet/sync" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xNEW_EMBEDDED_WALLET",
    "network": "base"
  }' \
  | jq
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Wallet synced successfully",
  "migration": {
    "status": "completed",
    "usdcTransferred": true,
    "nftsTransferred": 3
  }
}
```

### Sur la Blockchain

**Vérifier on-chain (Polygonscan) :**

1. **USDC Balance :**
   ```
   https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359?a=0xNEW_WALLET
   ```

2. **NFTs :**
   ```
   https://polygonscan.com/address/0xNEW_WALLET#tokentxnsErc721
   ```

3. **Transactions récentes :**
   ```
   https://polygonscan.com/address/0xNEW_WALLET#internaltx
   ```

---

## 📊 CHECKLIST COMPLÈTE

### Tests Basiques
- [ ] ✅ `GET /admin/migration/stats` → Stats correctes
- [ ] ✅ `GET /admin/migration/users/pending` → Liste correcte
- [ ] ✅ `POST /admin/migration/test/:userId` → Dry-run OK

### Tests Migration
- [ ] ✅ `POST /admin/migration/user/:userId` (dryRun: true) → Simulation OK
- [ ] ✅ `POST /admin/migration/user/:userId` (dryRun: false) → Migration réelle OK
- [ ] ✅ `POST /admin/migration/batch` (dryRun: true) → Batch simulation OK
- [ ] ✅ `POST /admin/migration/batch` (dryRun: false) → Batch migration OK

### Tests Erreurs
- [ ] ✅ User inexistant → 404 Not Found
- [ ] ✅ User sans wallet → 400 Bad Request
- [ ] ✅ Sans JWT admin → 401 Unauthorized

### Vérifications Post-Migration
- [ ] ✅ USDC transféré on-chain (Polygonscan)
- [ ] ✅ NFTs transférés on-chain (Polygonscan)
- [ ] ✅ User.migrationStatus = "completed" en DB
- [ ] ✅ User.migratedAt défini en DB
- [ ] ✅ Auto-migration user fonctionne toujours

---

## 🎯 SCÉNARIO COMPLET DE TEST

**Workflow recommandé :**

```bash
# 1. Récupérer JWT admin
export ADMIN_JWT="..."

# 2. Vérifier stats globales
curl -X GET "http://localhost:3000/admin/migration/stats" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq

# 3. Récupérer un user à migrer
curl -X GET "http://localhost:3000/admin/migration/users/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq

# 4. Sauvegarder userId
export USER_ID="507f1f77bcf86cd799439011"

# 5. Test migration (dry-run)
curl -X POST "http://localhost:3000/admin/migration/test/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq

# 6. Migration user (dry-run)
curl -X POST "http://localhost:3000/admin/migration/user/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' | jq

# 7. Migration user (RÉELLE)
curl -X POST "http://localhost:3000/admin/migration/user/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}' | jq

# 8. Vérifier sur Polygonscan
open "https://polygonscan.com/address/0xNEW_WALLET"

# 9. Vérifier stats à nouveau
curl -X GET "http://localhost:3000/admin/migration/stats" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

---

## 🐛 TROUBLESHOOTING

### Erreur : "Cannot read property 'usdcBalance' of null"

**Cause :** User n'a pas de balance USDC en DB

**Solution :**
```javascript
// Vérifier en DB
db.users.findOne({ _id: ObjectId("507f1f77bcf86cd799439011") })

// Ajouter balance si manquante
db.users.updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  { $set: { usdcBalance: 100 } }
)
```

### Erreur : "MigrationService not found"

**Cause :** MigrationService pas dans UserModule.exports

**Solution :**
```typescript
// user.module.ts
@Module({
  // ...
  exports: [MigrationService], // Ajouter
})
```

### Erreur : "Cannot find module '@/modules/migration'"

**Cause :** Path alias non configuré

**Solution :**
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

**Maintenu par :** Équipe CyLimit  
**Date :** 14 Octobre 2025

