# 📄 RÉSUMÉ 1 PAGE - MIGRATION V1→V2

**Date :** 14 Octobre 2025 | **Status :** ✅ VALIDÉ

---

## 🎯 EN 3 PHRASES

1. **Admin backend** = Outils blockchain + Monitoring (lecture DB uniquement)
2. **User backend** = Auto-migration lors connexion Coinbase (MigrationService)
3. **Scripts admin** = Migration forcée pour cas exceptionnels (1%)

---

## 📊 ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN BACKEND (port 3000)                │
│                                                             │
│  🔒 Contrats Blockchain                                    │
│     - CyLimitNFT_v2.sol                                    │
│     - CyLimitMarketplace.sol                               │
│     - *_REFERENCE_COMMENTS.txt (protégés)                  │
│                                                             │
│  🔧 Scripts Admin                                          │
│     - deploy-*.js                                          │
│     - remint-*.js                                          │
│     - test-migration-single-user.js                        │
│     - count-users-to-migrate.js                            │
│                                                             │
│  📊 Endpoints Monitoring (lecture seule)                   │
│     - GET /admin/migration/stats                           │
│     - GET /admin/migration/users                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    USER BACKEND (port 4000)                 │
│                                                             │
│  ✅ MigrationService (CŒUR DU SYSTÈME)                     │
│     - migrateUserAssets()                                  │
│     - transferUSDC()                                       │
│     - transferNFTs()                                       │
│                                                             │
│  🔄 Endpoints Auto-Migration                               │
│     - POST /user/wallet/sync (AUTO-MIGRATION ici !)       │
│     - GET /user/wallet/me                                  │
│     - GET /user/nfts                                       │
│                                                             │
│  🛒 Endpoints Marketplace                                  │
│     - GET /marketplace/listings                            │
│     - POST /marketplace/buy/:id                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLOWS PRINCIPAUX

### Auto-Migration (99% des users)
```
User login Coinbase → Frontend → POST /user/wallet/sync (USER backend)
→ MigrationService.migrateUserAssets() → Transfert USDC + NFTs
→ ✅ Transparent pour le user !
```

### Monitoring (Admin)
```
Admin → GET /admin/migration/stats (ADMIN backend)
→ { totalUsers: 1500, usersWithWallet: 450, ... }
```

### Migration Forcée (1% cas exceptionnels)
```
Admin → node scripts/test-migration-single-user.js <userId>
→ Script appelle MigrationService → Transfert USDC + NFTs
```

---

## 📍 ENDPOINTS

### Admin Backend (Monitoring)
```
GET  /admin/migration/stats     // Stats basiques
GET  /admin/migration/users     // Liste users
```

### User Backend (Migration + Public)
```
POST /user/wallet/sync          // Création wallet + AUTO-MIGRATION
GET  /user/wallet/me            // Info wallet user
GET  /user/nfts                 // NFTs user
GET  /marketplace/listings      // NFTs en vente
POST /marketplace/buy/:id       // Acheter NFT
```

### Scripts Admin (Migration Forcée)
```bash
node scripts/test-migration-single-user.js <userId>  # Migrer 1 user
node scripts/count-users-to-migrate.js               # Stats détaillées
node scripts/deploy-nft-v2-mainnet.js                # Déployer NFT v2
node scripts/remint-nfts-v2-batch.js                 # Remint NFTs
```

---

## ✅ POINTS CLÉS

| Point | Réponse |
|-------|---------|
| **Où est MigrationService ?** | USER backend (pas admin !) |
| **Auto-migration ?** | POST /user/wallet/sync (USER backend) |
| **Migration forcée ?** | Scripts admin (1% cas exceptionnels) |
| **Endpoints admin ?** | Monitoring uniquement (GET, lecture DB) |
| **Contrats blockchain ?** | Admin backend (protégés, avec _REFERENCE) |
| **Scripts admin ?** | Admin backend (deploy, remint, migration) |

---

## 🚀 COMMANDES RAPIDES

**Tester monitoring admin :**
```bash
curl -X GET "http://localhost:3000/admin/migration/stats" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

**Migrer un user (forcé) :**
```bash
cd cylimit-admin-backend
node scripts/test-migration-single-user.js 507f1f77bcf86cd799439011
```

**Tester auto-migration :**
```bash
curl -X POST "http://localhost:4000/user/wallet/sync" \
  -H "Authorization: Bearer $USER_JWT" \
  -d '{"walletAddress":"0xABC...","provider":"coinbase"}' | jq
```

---

## 📚 DOCUMENTATION

**Pour démarrer :** [INDEX-DOCUMENTATION.md](./INDEX-DOCUMENTATION.md)

**Architecture :** [ARCHITECTURE-FINALE-CORRECTE.md](./ARCHITECTURE-FINALE-CORRECTE.md)

**Tests :** [GUIDE-TEST-ENDPOINTS-ADMIN-SIMPLIFIE.md](./GUIDE-TEST-ENDPOINTS-ADMIN-SIMPLIFIE.md)

**Contrats :** [CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md](./CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md)

---

## ⚠️ À NE PAS OUBLIER

- ❌ Admin backend ne fait PAS de migration directe
- ✅ MigrationService reste dans USER backend
- ✅ Auto-migration = 99% des cas (transparent)
- ✅ Scripts admin = 1% cas exceptionnels uniquement

---

**Version :** 2.0 (post-correction) | **Équipe :** CyLimit

