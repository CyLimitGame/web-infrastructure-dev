# 🧪 GUIDE DE TEST - ENDPOINTS ADMIN (SIMPLIFIÉ)

**Date :** 14 Octobre 2025  
**Status :** ✅ CORRIGÉ ET SIMPLIFIÉ

---

## ⚠️ ARCHITECTURE CORRECTE

**Admin Backend = Monitoring uniquement (lecture DB)**
- GET /admin/migration/stats
- GET /admin/migration/users

**User Backend = Auto-migration (action)**
- POST /user/wallet/sync (auto-migration)

**Scripts Admin = Migration forcée (exceptionnel)**
- node scripts/test-migration-single-user.js <userId>
- node scripts/count-users-to-migrate.js

---

## 🔑 PRÉREQUIS

### 1. JWT Admin

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
```

---

## 📊 TEST 1 : STATS MIGRATION

**Endpoint :** `GET /admin/migration/stats`

**Commande :**
```bash
curl -X GET "http://localhost:3000/admin/migration/stats" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue :**
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
- ✅ `totalUsers` cohérent
- ✅ `usersWithWallet + usersWithoutWallet = totalUsers`

---

## 📋 TEST 2 : LISTE USERS

**Endpoint :** `GET /admin/migration/users`

**Commande :**
```bash
# Récupérer 10 users
curl -X GET "http://localhost:3000/admin/migration/users?limit=10" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq
```

**Réponse attendue :**
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
- ✅ `count` ≤ `limit`
- ✅ Liste des users avec wallet status

---

## 🔧 TEST 3 : STATS DÉTAILLÉES (SCRIPT)

**⚠️ Les stats détaillées (USDC, NFTs) nécessitent un script**

**Commande :**
```bash
cd cylimit-admin-backend
node scripts/count-users-to-migrate.js
```

**Sortie attendue :**
```
📊 STATS DE MIGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total users: 1500

À migrer: 1050 users
- Avec USDC uniquement: 450
- Avec NFTs uniquement: 300
- Avec USDC + NFTs: 300

Déjà migrés: 450 users

USDC total à migrer: 45,000 USDC
NFTs total à migrer: 3,150 NFTs
```

---

## 🧪 TEST 4 : MIGRATION FORCÉE (SCRIPT)

**⚠️ Pour migrer un user, utiliser le script admin**

### Étape 1 : Dry-Run (Simulation)

```bash
cd cylimit-admin-backend

# Récupérer un userId depuis les stats
USER_ID="507f1f77bcf86cd799439011"

# Simulation (pas de vraies transactions)
DRY_RUN=true node scripts/test-migration-single-user.js $USER_ID
```

**Sortie attendue :**
```
🔍 TEST MIGRATION - DRY RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: user1@example.com (507f1f77bcf86cd799439011)
Old Wallet: 0x123...
New Wallet: 0xabc...

USDC Balance: 150.50 USDC
NFTs: 3 NFTs

🧪 [DRY-RUN] Simulation uniquement, pas de vraies transactions

✅ USDC transfer simulated: 150.50 USDC
✅ NFT transfers simulated: 3 NFTs

Migration réussie ! (simulation)
```

### Étape 2 : Migration Réelle (ATTENTION !)

**⚠️ ATTENTION : Vraies transactions blockchain !**

```bash
# Migration réelle
node scripts/test-migration-single-user.js $USER_ID
```

**Sortie attendue :**
```
🚀 MIGRATION USER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: user1@example.com (507f1f77bcf86cd799439011)
Old Wallet: 0x123...
New Wallet: 0xabc...

USDC Balance: 150.50 USDC
NFTs: 3 NFTs

⏳ Transfert USDC...
✅ USDC transféré: 150.50 USDC
   TX: 0xabcdef...

⏳ Transfert NFTs...
✅ NFT #1 transféré (TX: 0x123...)
✅ NFT #2 transféré (TX: 0x456...)
✅ NFT #3 transféré (TX: 0x789...)

✅ Migration complète !
   - USDC: ✅
   - NFTs: 3/3 ✅
   - Status: completed
```

### Étape 3 : Vérification Post-Migration

```bash
# 1. Vérifier sur Polygonscan
open "https://polygonscan.com/address/0xNEW_WALLET_ADDRESS"

# 2. Vérifier via API user
curl -X GET "http://localhost:4000/user/wallet/me" \
  -H "Authorization: Bearer $USER_JWT" \
  | jq

# Expected:
# {
#   "walletAddress": "0xNEW_WALLET_ADDRESS",
#   "usdcBalance": 150.50,
#   "nfts": [...],
#   "migrationStatus": "completed"
# }
```

---

## ✅ TEST 5 : AUTO-MIGRATION (USER BACKEND)

**⚠️ Important : C'est le flow normal pour 99% des users !**

**Endpoint :** `POST /user/wallet/sync` (USER BACKEND port 4000)

### Flow Complet

**1. User login avec Coinbase (Frontend)**
```javascript
// Frontend
const wallet = await coinbaseService.createWallet(userId);
// wallet.address = "0xNEW_EMBEDDED_WALLET"
```

**2. Sync wallet + auto-migration (Frontend → USER Backend)**
```bash
curl -X POST "http://localhost:4000/user/wallet/sync" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xNEW_EMBEDDED_WALLET",
    "provider": "coinbase"
  }' \
  | jq
```

**3. Réponse (avec auto-migration)**
```json
{
  "success": true,
  "wallet": {
    "address": "0xNEW_EMBEDDED_WALLET",
    "provider": "coinbase"
  },
  "migration": {
    "performed": true,
    "usdcTransferred": true,
    "usdcAmount": 150.50,
    "nftsTransferred": 3,
    "status": "completed"
  }
}
```

**4. User voit ses NFTs dans son nouveau wallet (transparent)**

---

## 🎯 RÉSUMÉ DES FLOWS

### Flow 1 : Monitoring (Admin)
```
Admin → GET /admin/migration/stats (ADMIN BACKEND)
     → Voir nombre total users
     → Identifier si beaucoup de users à migrer
```

### Flow 2 : Stats Détaillées (Script)
```
Admin → node scripts/count-users-to-migrate.js
     → Voir USDC, NFTs, liste détaillée
```

### Flow 3 : Migration Forcée (Script)
```
Admin → node scripts/test-migration-single-user.js <userId>
     → Migrer un user qui a un problème
     → Cas exceptionnel uniquement
```

### Flow 4 : Auto-Migration (Normal)
```
User → Login Coinbase (Frontend)
    → POST /user/wallet/sync (USER BACKEND)
    → Auto-migration automatique
    → User ne remarque rien !
```

---

## 🚨 ERREURS COURANTES

### Erreur 1 : "Cannot migrate user, no new wallet"
```
❌ User n'a pas encore de wallet Coinbase
✅ User doit d'abord login avec Coinbase pour créer son Embedded Wallet
```

### Erreur 2 : "User already migrated"
```
❌ User déjà migré
✅ Normal, ne rien faire
```

### Erreur 3 : "Insufficient gas"
```
❌ Master New Wallet n'a plus de gas
✅ Ajouter du MATIC au Master New Wallet
```

### Erreur 4 : "Endpoint /admin/migration/user/:userId not found"
```
❌ Ce endpoint n'existe pas (c'était une erreur de conception)
✅ Utiliser le script : node scripts/test-migration-single-user.js <userId>
```

---

## 📚 DOCUMENTATION COMPLÈTE

Pour plus de détails :
- `ARCHITECTURE-FINALE-CORRECTE.md` : Architecture complète
- `MIGRATION-COMPLETE.md` : Récap de la migration admin/user
- `README-BLOCKCHAIN.md` : Documentation scripts admin
- `CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md` : Explications contrats

---

## ✅ CHECKLIST DE TEST

**Endpoints Admin (ADMIN BACKEND) :**
- [ ] GET /admin/migration/stats (stats basiques)
- [ ] GET /admin/migration/users (liste users)

**Scripts Admin :**
- [ ] node scripts/count-users-to-migrate.js (stats détaillées)
- [ ] DRY_RUN=true node scripts/test-migration-single-user.js <userId> (simulation)
- [ ] node scripts/test-migration-single-user.js <userId> (migration réelle)

**Auto-Migration (USER BACKEND) :**
- [ ] POST /user/wallet/sync (création wallet + auto-migration)
- [ ] Vérification Polygonscan
- [ ] Vérification DB (migrationStatus = completed)

---

**Maintenu par :** Équipe CyLimit  
**Date :** 14 Octobre 2025  
**Status :** ✅ GUIDE CORRIGÉ ET VALIDÉ

