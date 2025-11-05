# 🔒 MIGRATION SÉCURITÉ : SÉPARATION ADMIN / USER

**Date :** 14 Octobre 2025  
**Objectif :** Séparer les endpoints/scripts admin sécurisés des endpoints publics users

---

## ⚠️ PROBLÈME IDENTIFIÉ

### Architecture Actuelle (DANGEREUSE)

```
cylimit-backend-develop/ (USER BACKEND - PUBLIC)
├── contracts/                           ❌ Contrats blockchain accessibles
│   ├── CyLimitMarketplace.sol
│   ├── CyLimitNFT_v2.sol
│   └── CyLimitMarketplace_REFERENCE_COMMENTS.txt  ❌ DANGEREUX !
├── scripts/                             ❌ Scripts sensibles accessibles
│   ├── migrate-wallets.js               ❌ Peut migrer n'importe quel user
│   ├── remint-nfts-v2.js               ❌ Peut mint des NFTs
│   └── sync-nfts.js                     ❌ Peut sync toute la DB
└── src/modules/nft/
    └── services/nft-sync.service.ts     ❌ Endpoints admin dans backend user
```

**Risques :**
- 🚨 N'importe qui peut voir les contrats et références internes
- 🚨 Scripts de migration accessibles via serveur
- 🚨 Endpoints NFT Sync appelables sans auth admin
- 🚨 DoS possible sur `/nft/sync/audit`
- 🚨 Architecture interne exposée

---

## ✅ SOLUTION : SÉPARATION ADMIN / USER

### Nouvelle Architecture (SÉCURISÉE)

```
cylimit-admin-backend/ (ADMIN - SÉCURISÉ)
├── contracts/                           ✅ Protégé admin auth
│   ├── CyLimitMarketplace.sol
│   ├── CyLimitNFT_v2.sol
│   ├── CyLimitMarketplace_REFERENCE_COMMENTS.txt  ✅ Safe
│   └── CyLimitNFT_v2_REFERENCE_COMMENTS.txt       ✅ Safe
├── scripts/                             ✅ Protégé admin auth
│   ├── deploy-marketplace.js
│   ├── deploy-nft-v2.js
│   ├── remint-nfts-v2-batch.js         ✅ Safe
│   ├── migrate-wallets-batch.js        ✅ Safe
│   └── test-contracts.js
└── src/modules/
    ├── nft/
    │   ├── controllers/
    │   │   └── nft-admin.controller.ts  ✅ Auth admin required
    │   └── services/
    │       └── nft-sync.service.ts      ✅ Internal only
    ├── migration/
    │   ├── controllers/
    │   │   └── migration-admin.controller.ts  ✅ Auth admin
    │   └── services/
    │       └── migration.service.ts     ✅ Internal only
    └── rewards/
        ├── controllers/
        │   └── rewards-admin.controller.ts  ✅ Auth admin
        └── services/
            └── rewards.service.ts

cylimit-backend-develop/ (USER - PUBLIC)
├── src/modules/
    ├── user/
    │   └── controllers/
    │       └── user.controller.ts       ✅ Public endpoints only
    │           - POST /user/wallet/sync
    │           - GET /user/wallet/me
    ├── marketplace/
    │   └── controllers/
    │       └── marketplace.controller.ts  ✅ Public read-only
    │           - GET /marketplace/listings
    │           - POST /marketplace/buy/:id
    └── transaction/
        └── controllers/
            └── transaction.controller.ts  ✅ User transactions only
                - GET /user/transactions
                - GET /user/nfts
```

---

## 📋 PLAN DE MIGRATION

### Phase 1 : Contrats Blockchain → Admin Backend

**Fichiers à migrer :**
```
Source: cylimit-backend-develop/contracts/
Destination: cylimit-admin-backend/contracts/

✅ CyLimitMarketplace.sol
✅ CyLimitMarketplace_REFERENCE_COMMENTS.txt
✅ CyLimitNFT_v2.sol
✅ CyLimitNFT_v2_REFERENCE_COMMENTS.txt
✅ CyLimitNFT_v2_REFERENCE_COMMENTS.txt (ancien)
✅ erc20/abi.json
✅ erc721/abi.json
```

**Actions :**
1. Copier tous les contrats vers admin backend
2. Supprimer les fichiers `_REFERENCE_COMMENTS.txt` du user backend
3. Garder uniquement les ABIs nécessaires dans user backend

---

### Phase 2 : Scripts de Migration → Admin Backend

**Fichiers à migrer :**
```
Source: cylimit-backend-develop/scripts/
Destination: cylimit-admin-backend/scripts/

✅ deploy-marketplace.js
✅ deploy-nft-v2.js
✅ remint-nfts-v2-batch.js
✅ migrate-wallets-batch.js
✅ prepare-nfts-for-remint.js
✅ setup-whitelist.js
✅ test-*.js (tous les scripts de test)
```

**À garder dans User Backend :**
```
❌ AUCUN SCRIPT (tous migrés vers admin)
```

---

### Phase 3 : NFT Sync → Admin Backend

**Modules à migrer :**
```
Source: cylimit-backend-develop/src/modules/nft/
Destination: cylimit-admin-backend/src/modules/nft/

Structure Admin Backend :
src/modules/nft/
├── controllers/
│   └── nft-admin.controller.ts
│       - GET /admin/nft/sync/audit
│       - POST /admin/nft/sync/:nftId
│       - POST /admin/nft/sync/batch
│       - POST /admin/nft/remint/batch
└── services/
    └── nft-sync.service.ts
    └── nft-admin.service.ts
```

**Endpoints Admin (protégés) :**
```typescript
@Controller('admin/nft')
@UseGuards(AdminAuthGuard)  // ✅ Auth admin obligatoire
export class NftAdminController {
  // Phase 1 : NFT Sync
  @Get('sync/audit')
  async auditNfts() { }
  
  @Post('sync/:nftId')
  async syncNft(@Param('nftId') nftId: string) { }
  
  @Post('sync/batch')
  async syncNftsBatch(@Body() { nftIds }: { nftIds: string[] }) { }
  
  // Phase 1 : NFT Remint
  @Post('remint/batch')
  async remintNftsBatch(@Body() data: RemintBatchDto) { }
}
```

---

### Phase 4 : Migration Wallets → Admin Backend

**Nouveau module Admin :**
```
cylimit-admin-backend/src/modules/migration/
├── controllers/
│   └── migration-admin.controller.ts
│       - GET /admin/migration/stats
│       - GET /admin/migration/users/pending
│       - POST /admin/migration/user/:userId
│       - POST /admin/migration/batch
│       - POST /admin/migration/test/:userId
└── services/
    └── migration-admin.service.ts
```

**Endpoints Admin (protégés) :**
```typescript
@Controller('admin/migration')
@UseGuards(AdminAuthGuard)
export class MigrationAdminController {
  // Stats
  @Get('stats')
  async getMigrationStats() {
    return {
      totalUsers: 1500,
      migrated: 450,
      pending: 1050,
      failed: 0,
      inProgress: 10
    };
  }
  
  // Liste users à migrer
  @Get('users/pending')
  async getPendingUsers(@Query('limit') limit = 100) { }
  
  // Migrer un user spécifique
  @Post('user/:userId')
  async migrateUser(@Param('userId') userId: string) { }
  
  // Migrer batch de users
  @Post('batch')
  async migrateBatch(@Body() { userIds }: { userIds: string[] }) { }
  
  // Test migration (dry-run)
  @Post('test/:userId')
  async testMigration(@Param('userId') userId: string) { }
}
```

---

### Phase 5 : Pending Rewards → Admin Backend

**Nouveau module Admin :**
```
cylimit-admin-backend/src/modules/rewards/
├── controllers/
│   └── rewards-admin.controller.ts
│       - GET /admin/rewards/pending
│       - POST /admin/rewards/process
│       - POST /admin/rewards/process/:userId
└── services/
    └── rewards-admin.service.ts
```

**Endpoints Admin (protégés) :**
```typescript
@Controller('admin/rewards')
@UseGuards(AdminAuthGuard)
export class RewardsAdminController {
  // Liste rewards en attente
  @Get('pending')
  async getPendingRewards() { }
  
  // Process tous les rewards
  @Post('process')
  async processAllRewards() { }
  
  // Process rewards d'un user
  @Post('process/:userId')
  async processUserRewards(@Param('userId') userId: string) { }
}
```

---

### Phase 6 : Nettoyer User Backend

**Endpoints à CONSERVER (publics) :**
```typescript
// src/modules/user/controllers/user.controller.ts
@Controller('user')
export class UserController {
  // Wallet sync (auto-création si besoin)
  @Post('wallet/sync')
  @UseGuards(UserAuthGuard)  // Auth user simple
  async syncWalletAddress(@Body() data: SyncWalletDto) {
    // Migration automatique si ancien user
    // Mais SANS endpoints admin exposés
  }
  
  // Info wallet
  @Get('wallet/me')
  @UseGuards(UserAuthGuard)
  async getMyWallet(@CurrentUser() user: User) { }
  
  // NFTs du user
  @Get('nfts')
  @UseGuards(UserAuthGuard)
  async getMyNfts(@CurrentUser() user: User) { }
  
  // Transactions du user
  @Get('transactions')
  @UseGuards(UserAuthGuard)
  async getMyTransactions(@CurrentUser() user: User) { }
}

// src/modules/marketplace/controllers/marketplace.controller.ts
@Controller('marketplace')
export class MarketplaceController {
  // Liste publique des NFTs en vente
  @Get('listings')
  async getListings() { }
  
  // Acheter un NFT
  @Post('buy/:nftId')
  @UseGuards(UserAuthGuard)
  async buyNft(@Param('nftId') nftId: string) { }
}
```

**Endpoints à SUPPRIMER (migrer vers admin) :**
```typescript
❌ /nft/sync/audit         → /admin/nft/sync/audit
❌ /nft/sync/:nftId        → /admin/nft/sync/:nftId
❌ /migration/users        → /admin/migration/users/pending
❌ /migration/user/:userId → /admin/migration/user/:userId
❌ /rewards/pending        → /admin/rewards/pending
```

---

## 🔒 SÉCURITÉ RENFORCÉE

### Admin Backend

**Protection :**
- ✅ `@UseGuards(AdminAuthGuard)` sur TOUS les controllers admin
- ✅ JWT admin avec rôle vérifié
- ✅ Logs de toutes les actions admin
- ✅ Rate limiting strict
- ✅ IP whitelist (optionnel)

**Auth Admin :**
```typescript
// src/common/guards/admin-auth.guard.ts
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Vérifie que user existe ET a le rôle admin
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    
    // Log action admin
    this.logAdminAction(user, request);
    
    return true;
  }
}
```

### User Backend

**Protection :**
- ✅ `@UseGuards(UserAuthGuard)` pour endpoints user
- ✅ JWT user simple
- ✅ Rate limiting standard
- ✅ Pas d'accès aux ressources admin

---

## 📊 COMPARAISON AVANT / APRÈS

### Avant (DANGEREUX)

| Ressource | Localisation | Accessible | Risque |
|-----------|--------------|------------|--------|
| Contrats .sol | User Backend | ✅ Oui | 🚨 High |
| _REFERENCE_COMMENTS.txt | User Backend | ✅ Oui | 🚨 Critical |
| Scripts migration | User Backend | ✅ Oui | 🚨 Critical |
| NFT Sync endpoints | User Backend | ✅ Oui | 🚨 High |
| Migration service | User Backend | ✅ Oui | 🚨 High |

### Après (SÉCURISÉ)

| Ressource | Localisation | Accessible | Risque |
|-----------|--------------|------------|--------|
| Contrats .sol | Admin Backend | ❌ Admin only | ✅ Safe |
| _REFERENCE_COMMENTS.txt | Admin Backend | ❌ Admin only | ✅ Safe |
| Scripts migration | Admin Backend | ❌ Admin only | ✅ Safe |
| NFT Sync endpoints | Admin Backend | ❌ Admin only | ✅ Safe |
| Migration endpoints | Admin Backend | ❌ Admin only | ✅ Safe |
| User wallet sync | User Backend | ✅ Auth user | ✅ Safe |
| Marketplace listings | User Backend | ✅ Public | ✅ Safe |

---

## ✅ CHECKLIST MIGRATION

### Phase 1 : Contrats
- [ ] Copier contrats .sol vers admin backend
- [ ] Copier fichiers _REFERENCE_COMMENTS.txt vers admin backend
- [ ] Copier ABIs vers admin backend
- [ ] Supprimer _REFERENCE_COMMENTS.txt de user backend
- [ ] Garder uniquement ABIs nécessaires dans user backend

### Phase 2 : Scripts
- [ ] Copier tous scripts vers admin backend
- [ ] Tester les scripts dans admin backend
- [ ] Supprimer scripts de user backend
- [ ] Créer README.md dans admin backend/scripts

### Phase 3 : NFT Sync
- [ ] Créer nft-admin.controller.ts dans admin backend
- [ ] Migrer nft-sync.service.ts vers admin backend
- [ ] Ajouter AdminAuthGuard sur tous les endpoints
- [ ] Tester endpoints admin
- [ ] Supprimer nft-sync de user backend

### Phase 4 : Migration Wallets
- [ ] Créer migration-admin.controller.ts
- [ ] Créer migration-admin.service.ts
- [ ] Migrer migration.service.ts vers admin backend
- [ ] Créer endpoints stats/pending/batch
- [ ] Garder logique auto-migration dans user.controller.ts (sans endpoints admin)

### Phase 5 : Rewards
- [ ] Créer rewards-admin.controller.ts
- [ ] Créer rewards-admin.service.ts
- [ ] Endpoints pending/process

### Phase 6 : Nettoyage User Backend
- [ ] Supprimer tous endpoints admin
- [ ] Garder uniquement endpoints publics
- [ ] Tester que la migration auto fonctionne toujours
- [ ] Vérifier que les endpoints user fonctionnent

### Phase 7 : Documentation
- [ ] Mettre à jour README admin backend
- [ ] Mettre à jour README user backend
- [ ] Documenter architecture de sécurité
- [ ] Créer guide déploiement séparé

---

## 🚀 AVANTAGES

### Sécurité
- 🔒 Endpoints admin protégés par auth admin
- 🔒 Contrats et références internes non exposés
- 🔒 Scripts de migration sécurisés
- 🔒 Logs de toutes actions admin
- 🔒 Impossible de DoS les endpoints admin depuis user backend

### Performance
- ⚡ User backend plus léger (pas de logique admin)
- ⚡ Moins de dépendances dans user backend
- ⚡ Rate limiting séparé admin/user
- ⚡ Scaling indépendant

### Maintenance
- 📊 Séparation claire admin/user
- 📊 Code plus propre et organisé
- 📊 Tests plus simples
- 📊 Déploiement indépendant

### Architecture
- 🎯 Admin backend = outil interne sécurisé
- 🎯 User backend = API publique légère
- 🎯 Responsabilités bien séparées
- 🎯 Évolutivité facilitée

---

**Prochaine étape :** Commencer la migration Phase 1 (Contrats)

**Maintenu par :** Équipe CyLimit  
**Date :** 14 Octobre 2025

