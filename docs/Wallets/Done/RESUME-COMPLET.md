# 📋 RÉSUMÉ COMPLET : Migration Wallets CyLimit V2

**Date :** 9 octobre 2025  
**Statut :** En cours d'implémentation  
**Progression globale :** 75%

---

## 🎯 TABLE DES MATIÈRES

1. [Vue d'Ensemble](#vue-densemble)
2. [Ce qui est FAIT](#ce-qui-est-fait)
3. [Ce qui reste à FAIRE](#ce-qui-reste-à-faire)
4. [Décisions Architecturales](#décisions-architecturales)
5. [Phases d'Implémentation Détaillées](#phases-dimplémentation-détaillées)
6. [Ordre d'Exécution Recommandé](#ordre-dexécution-recommandé)

---

## 🎯 VUE D'ENSEMBLE

### Architecture Finale

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS (Embedded Wallets)                 │
│  ✅ Auth Email + OTP (Coinbase)                             │
│  ✅ Smart Account (ERC-4337) - Gas sponsorisé               │
│  ✅ Balance USDC visible en temps réel                      │
│  ✅ Onramp Coinbase intégré (popup)                         │
│  ✅ Dépôt blockchain manuel (QR Code)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ API calls (HTTPS)
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CYLIMIT USER BACKEND (NestJS)                  │
│  ✅ OnrampService : Génération liens Onramp                 │
│  ✅ FeeCalculatorService : Calcul fees dynamique            │
│  🔄 MarketplaceService : Achats/Ventes NFTs (skeleton)     │
│  🔄 NftSyncService : Vérification ownership au listing      │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CYLIMIT ADMIN BACKEND (NestJS)                 │
│  ✅ CoinbaseWalletService : Gestion Server Wallets          │
│  ✅ Master Wallet : Collecter fees marketplace              │
│  ✅ Rewards Wallet : Payer rewards automatiquement          │
│  🔄 NftSyncService : Cron job quotidien audit DB ↔ Chain   │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              POLYGON MAINNET (Blockchain)                   │
│  - USDC Contract (ERC-20)                                   │
│  - CyLimit NFT Contract (ERC-721)                           │
│  - Smart Accounts (ERC-4337)                                │
└─────────────────────────────────────────────────────────────┘
```

### Blockchain : Polygon Mainnet

**Pourquoi Polygon Mainnet (pas Base Sepolia) :**
- ✅ NFTs CyLimit déjà déployés sur Polygon
- ✅ Coinbase Onramp ne supporte QUE les mainnets pour achats réels
- ✅ Impossible de tester Onramp sur testnet (Base Sepolia)
- ⚠️ Développement = Production (utilise Polygon Mainnet avec fonds réels)

**Configuration actuelle :**
```bash
BLOCKCHAIN_NETWORK=polygon-mainnet
USDC_CONTRACT_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 # USDC natif Polygon
```

---

## ✅ CE QUI EST FAIT

### 1. Backend Server Wallets (Admin Backend) - 100% ✅

**Localisation :** `cylimit-admin-backend/`

**Services créés :**
- ✅ `CoinbaseWalletService` : Gestion Server Wallets (Master, Rewards)
- ✅ `CoinbaseApiService` : Appels authentifiés CDP REST API
- ✅ `CoinbaseTransactionService` : Signature et broadcast transactions
- ✅ `WalletController` : Endpoints admin pour gérer les wallets CyLimit

**Configuration :**
- ✅ `.env` configuré avec API Key, Wallet Secret, Master Wallet ID
- ✅ Support Smart Accounts (ERC-4337)
- ✅ Polygon Mainnet configuré

**Fichiers clés :**
```
cylimit-admin-backend/
├── src/modules/wallet/
│   ├── services/
│   │   ├── coinbase-wallet.service.ts ✅
│   │   ├── coinbase-api.service.ts ✅
│   │   └── coinbase-transaction.service.ts ✅
│   ├── controllers/
│   │   └── wallet.controller.ts ✅
│   └── wallet.module.ts ✅
└── .env ✅
```

---

### 2. Frontend Embedded Wallets - 100% ✅

**Localisation :** `cylimit-frontend-develop/`

**Composants créés :**
- ✅ `WalletAuthModal` : Modal auth email/OTP + gestion fonds
  - Accordion Coinbase (CB, virement, PayPal, Apple Pay, solde Coinbase)
  - Accordion Blockchain (dépôt manuel avec QR Code + adresse)
  - Design aligné avec le système (dark gradient, bordures blanches)
- ✅ `useEmbeddedWallet` : Hook centralisé pour état wallet
  - Auto-connexion au login CyLimit
  - Auto-déconnexion à la déconnexion CyLimit
  - Sync automatique `walletAddress` avec backend
- ✅ `useUserCountry` : Détection pays automatique (IP-based avec ipapi.co)
- ✅ `CoinbaseWalletProvider` : Wrapper SSR-safe pour Next.js

**Fonctionnalités :**
- ✅ Auth email/OTP Coinbase (email CyLimit = email Embedded Wallet)
- ✅ Balance USDC en temps réel (depuis backend API)
- ✅ Onramp Coinbase (popup avec `fetchBuyQuote`)
- ✅ Dépôt blockchain manuel (QR Code + adresse + contrat USDC)
- ✅ Copie adresse et contrat USDC en 1 clic
- ✅ Warning "USDC natif Polygon uniquement"

**Fichiers clés :**
```
cylimit-frontend-develop/
├── src/
│   ├── components/wallet/
│   │   ├── WalletAuthModal.tsx ✅
│   │   └── index.ts ✅
│   ├── hooks/
│   │   ├── useEmbeddedWallet.ts ✅
│   │   └── useUserCountry.ts ✅
│   ├── shared/
│   │   └── CoinbaseWalletProvider.tsx ✅
│   ├── apis/
│   │   └── onramp.ts ✅
│   └── pages/
│       └── _app.tsx ✅ (configured CDPReactProvider)
```

---

### 3. User Backend Services - 90% ✅

**Localisation :** `cylimit-backend-develop/`

**Services créés :**
- ✅ `OnrampService` : Génération liens Onramp, balance USDC
  - `getBuyOptions()` : Récupérer options de paiement disponibles
  - `createBuyQuote()` : Générer quote Onramp
  - `getAddressBalance()` : Balance USDC d'une adresse
- ✅ `MarketplaceService` : Préparation achats/ventes NFTs (skeleton)
- ✅ `FeeCalculatorService` : Calcul fees dynamique

**Endpoints créés :**
- ✅ `GET /v1/wallet/balance/:address` : Balance USDC
- ✅ `POST /v1/onramp/buy-quote` : Générer quote Onramp
- ✅ `POST /v1/onramp/buy-options` : Options de paiement disponibles
- ✅ `PATCH /v1/users/me/wallet-address` : Sync walletAddress

**Schema User mis à jour :**
```typescript
@Prop({ lowercase: true, trim: true })
public embeddedWalletEmail?: string; // Email Embedded Wallet (= email CyLimit)

@Prop({ type: Date })
public walletSyncedAt?: Date; // Date dernière sync walletAddress

@Prop({ lowercase: true })
public walletAddress?: string; // Adresse Embedded Wallet (synchronisé auto)
```

**Fichiers clés :**
```
cylimit-backend-develop/
├── src/modules/wallet/
│   ├── services/
│   │   ├── onramp.service.ts ✅
│   │   ├── marketplace.service.ts ✅ (skeleton)
│   │   └── fee-calculator.service.ts ✅
│   ├── controllers/
│   │   ├── onramp.controller.ts ✅
│   │   └── marketplace.controller.ts ✅ (skeleton)
│   └── dto/
│       ├── onramp.dto.ts ✅
│       ├── marketplace.dto.ts ✅
│       └── sync-wallet.dto.ts ✅
├── src/modules/user/
│   ├── schemas/user.schema.ts ✅
│   └── dtos/profile.dto.ts ✅
└── src/base/controllers/user.controller.ts ✅
```

---

### 4. NFT Sync Service - Code créé, pas encore intégré 🔄

**Localisation :** `cylimit-admin-backend/src/modules/nft/services/nft-sync.service.ts`

**Statut :** ✅ Code créé (579 lignes) | 🔄 Pas encore intégré dans les modules

**Fonctionnalités :**
- ✅ **Cron job quotidien** (3h du matin) : Audit complet DB ↔ Blockchain
  - Vérifier ownership on-chain pour tous les NFTs mintés
  - Détecter désynchronisations
  - Corriger automatiquement la DB
  - Alerter si > 10 désync
- ✅ **Vérification au listing** : Check ownership avant mise en vente
- ✅ **Endpoint admin** : Sync manuel pour debug (`POST /admin/nft/sync/:nftId`)
- ✅ **Logs détaillés** : Chaque opération loguée
- ✅ **Gestion wallets externes** : Détection si NFT transféré hors CyLimit

**Coûts :**
- 50 000 NFTs : **0€/mois** (Alchemy gratuit, 15M CU/mois sur 300M quota)
- Performance : ~1h23min d'exécution (3h-4h23 du matin)

**Fichier créé :**
```
cylimit-admin-backend/
└── src/modules/nft/services/
    └── nft-sync.service.ts ✅ (créé, pas intégré)
```

---

### 5. Documentation - 100% ✅

**Fichiers créés :**
- ✅ `SYSTEME-WALLETS-COMPLET.md` : Architecture globale
- ✅ `PLAN-IMPLEMENTATION-COMPLET.md` : Checklist complète
- ✅ `NOTE-SERVER-WALLETS-COMPLET.md` : Guide Server Wallets v2
- ✅ `NOTE-EMBEDDED-WALLETS-COMPLET.md` : Guide Embedded Wallets
- ✅ `NOTE-ONRAMP-OFFRAMP-COMPLET.md` : Guide Onramp/Offramp
- ✅ `NFT-SYNC-SERVICE.md` : Guide NFT Sync Service
- ✅ `EMBEDDED-WALLET-SYNC.md` : Guide sync walletAddress
- ✅ `CHECKLIST-MIGRATION.md` : Timeline migration
- ✅ `GUIDE-DEPLOIEMENT.md` : Guide déploiement production
- ✅ `RECAP-NFT-SYNC.md` : Récapitulatif NFT Sync

---

## 🔄 CE QUI RESTE À FAIRE

### Récapitulatif

| Phase | Statut | Temps estimé | Bloquant ? |
|-------|--------|---------------|-----------|
| **1. NFT Sync - Intégration Admin** | 🔄 | 1-2h | Oui (cron job) |
| **2. NFT Sync - Intégration User** | 🔄 | 1-2h | Oui (listing) |
| **3. Pending Rewards System** | 🔄 | 3-4h | Recommandé |
| **4. Wallet Required Modals** | 🔄 | 2-3h | Recommandé |
| **5. Tests Wallet Address Sync** | 🔄 | 30min | Non |
| **6. Marketplace Complet** | 📋 | 5-7j | Oui (achats/ventes) |

**TOTAL TEMPS RESTANT POUR MVP COMPLET : 8-12h** (hors marketplace complet)

---

## 🏗️ DÉCISIONS ARCHITECTURALES

### 1. NFT Sync Service : Pourquoi dans DEUX backends ?

**Besoin :**
- **Admin Backend** : Cron job quotidien (audit complet)
- **User Backend** : Vérification au listing (marketplace)

**Solution retenue : Service PARTAGÉ entre les deux backends**

**Implémentation :**
1. ✅ Service créé dans **Admin Backend** (pour cron job)
2. 🔄 Service **COPIÉ** dans **User Backend** (pour listing)
3. ⚠️ **Pas de package partagé** (overkill pour 1 seul service)

**Raison :** 
- Admin et User sont des backends **séparés** (pas de dépendances croisées)
- Évite complexité d'un monorepo ou package npm privé
- Service petit (~500 lignes), facile à maintenir en double

---

### 2. Réseau Blockchain : Polygon Mainnet UNIQUEMENT

**Décision :** ❌ Pas de testnet (Base Sepolia), ✅ Polygon Mainnet même en dev

**Raisons :**
1. **NFTs CyLimit** : Déjà déployés sur Polygon Mainnet
2. **Coinbase Onramp** : Ne supporte QUE les mainnets (pas de testnet)
3. **Tests Onramp** : Impossible de tester avec Base Sepolia
4. **Développement** : Utilise Polygon Mainnet avec petits montants réels

**Conséquences :**
- ⚠️ Dev = Prod (attention aux transactions réelles)
- ✅ Onramp testable en dev (avec vraie CB)
- ✅ Balance USDC réelle visible

**Configuration :**
```bash
BLOCKCHAIN_NETWORK=polygon-mainnet
USDC_CONTRACT_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
```

---

### 3. Wallet Address Sync : Automatique

**Décision :** Sync automatique `walletAddress` dès connexion Embedded Wallet

**Flow :**
1. User login CyLimit (email/password)
2. Frontend auto-connecte Embedded Wallet (email OTP)
3. Frontend récupère `evmAddress` (adresse Embedded Wallet)
4. Frontend envoie `PATCH /users/me/wallet-address` avec `evmAddress`
5. Backend met à jour `user.walletAddress` en DB

**Raison :**
- ✅ User n'a rien à faire (UX optimale)
- ✅ 1 user CyLimit = 1 Embedded Wallet (1:1)
- ✅ Pas de doublon possible (check backend)

---

### 4. Email CyLimit = Email Embedded Wallet

**Décision :** Lier Embedded Wallet à l'email CyLimit

**Implémentation :**
- Frontend pré-remplit l'email avec `userProfile.email`
- Input email **disabled** (user ne peut pas changer)
- Backend vérifie cohérence (futur)

**Raison :**
- ✅ 1 email CyLimit = 1 Embedded Wallet (simple)
- ✅ Pas de confusion (email unique)
- ✅ Auto-connexion au login CyLimit

---

## 📋 PHASES D'IMPLÉMENTATION DÉTAILLÉES

---

## 🔴 PHASE 1 : Intégrer NFT Sync Service dans Admin Backend

**Objectif :** Activer le cron job quotidien pour audit DB ↔ Blockchain

**Temps estimé :** 1-2h

**Bloquant :** Oui (pour audit automatique)

---

### Ce qui doit être fait

1. **Ajouter `NftSyncService` dans `NFTModule`**
   - Provider + Export

2. **Activer `ScheduleModule` dans `AppModule`**
   - Requis pour cron jobs

3. **Créer controller admin pour sync manuel**
   - `POST /admin/nft/sync/audit` : Force audit complet
   - `POST /admin/nft/sync/:nftId` : Sync un NFT spécifique

4. **Tester le cron job**
   - Vérifier logs à 3h du matin
   - Ou créer endpoint temporaire pour trigger manuellement

---

### Fichiers à modifier

#### 1. `cylimit-admin-backend/src/modules/nft/nft.module.ts`

**Action :** Ajouter `NftSyncService` dans providers et exports

**Contexte nécessaire :**
```
cylimit-admin-backend/src/modules/nft/nft.module.ts
```

**Modification à faire :**
```typescript
import { NftSyncService } from './services/nft-sync.service';
import { NFTSyncAdminController } from './controllers/nft-sync-admin.controller';

@Module({
  imports: [
    // ... existing imports
  ],
  controllers: [
    NftController,
    NFTSyncAdminController, // ← AJOUTER
  ],
  providers: [
    // ... existing providers
    NftSyncService, // ← AJOUTER
    Logger,
  ],
  exports: [
    // ... existing exports
    NftSyncService, // ← AJOUTER
  ],
})
export class NftModule {}
```

---

#### 2. `cylimit-admin-backend/src/app.module.ts`

**Action :** Activer `ScheduleModule` pour cron jobs

**Contexte nécessaire :**
```
cylimit-admin-backend/src/app.module.ts
```

**Modification à faire :**
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ← AJOUTER (en premier si possible)
    // ... other modules
  ],
})
export class AppModule {}
```

---

#### 3. `cylimit-admin-backend/src/modules/nft/controllers/nft-sync-admin.controller.ts`

**Action :** Créer controller admin pour sync manuel

**Contexte nécessaire :** Aucun (nouveau fichier)

**Code à créer :**
```typescript
import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminGuard } from '@/common/guards/admin.guard';
import { NftSyncService } from '../services/nft-sync.service';

@ApiTags('admin/nft-sync')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/nft/sync')
export class NFTSyncAdminController {
  constructor(private nftSyncService: NftSyncService) {}

  @Post('audit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force a full daily NFT ownership audit' })
  @ApiResponse({ status: 200, description: 'NFT audit initiated successfully.' })
  async forceAudit() {
    await this.nftSyncService.auditAllNFTs();
    return { success: true, message: 'NFT audit initiated. Check logs for details.' };
  }

  @Post(':nftId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force synchronization for a specific NFT' })
  @ApiResponse({ status: 200, description: 'NFT synchronization initiated successfully.' })
  @ApiResponse({ status: 400, description: 'NFT not found or not minted.' })
  async forceSyncNFT(@Param('nftId') nftId: string) {
    const result = await this.nftSyncService.forceSyncNFT(nftId);
    return { success: true, data: result };
  }
}
```

---

#### 4. `cylimit-admin-backend/.env`

**Action :** Vérifier que les variables nécessaires sont présentes

**Contexte nécessaire :**
```
cylimit-admin-backend/.env
```

**Variables requises :**
```bash
# Alchemy RPC
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# NFT Contract
NFT_CONTRACT_ADDRESS=0x... # Adresse du contrat NFT CyLimit sur Polygon
```

---

### Tests à effectuer

#### Test 1 : Cron job automatique

```bash
# 1. Démarrer backend admin
cd cylimit-admin-backend
npm run start:dev

# 2. Attendre 3h du matin OU utiliser endpoint temporaire

# 3. Vérifier logs :
# [NftSyncService] ✅ NFT Contract initialized: 0x...
# [NftSyncService] 🔍 Starting daily NFT audit...
# [NftSyncService] 📊 Total NFTs to audit: X
# [NftSyncService] ✅ Daily NFT audit complete: Duration: Xs, Total: X, Synced: X, Errors: X
```

#### Test 2 : Sync manuel (endpoint admin)

```bash
# Trigger audit complet manuellement
curl -X POST http://localhost:3003/admin/nft/sync/audit \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Sync un NFT spécifique
curl -X POST http://localhost:3003/admin/nft/sync/64f5a3c1... \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à implémenter cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir :
├── cylimit-admin-backend/src/modules/nft/nft.module.ts
├── cylimit-admin-backend/src/app.module.ts
├── cylimit-admin-backend/src/modules/nft/schemas/nft.schema.ts (pour vérifier structure)
├── cylimit-admin-backend/src/modules/user/schemas/user.schema.ts (pour vérifier structure)
├── cylimit-admin-backend/src/common/guards/admin.guard.ts (si existe)
└── cylimit-admin-backend/.env (masquer les secrets)
```

---

## 🟠 PHASE 2 : Intégrer NFT Sync Service dans User Backend

**Objectif :** Vérifier ownership NFT AVANT chaque listing marketplace

**Temps estimé :** 1-2h

**Bloquant :** Oui (pour marketplace)

---

### Ce qui doit être fait

1. **Copier `NftSyncService` depuis admin backend**
   - Adapter imports (schemas User/Nft du user backend)

2. **Ajouter `NftSyncService` dans `NFTModule` (user backend)**
   - Provider + Export

3. **Intégrer dans `MarketplaceService.listNFT()`**
   - Appeler `verifyOwnershipForListing()` avant listing

4. **Tester vérification au listing**
   - Cas OK : User possède le NFT
   - Cas KO : User ne possède plus le NFT

---

### Fichiers à créer/modifier

#### 1. `cylimit-backend-develop/src/modules/nft/services/nft-sync.service.ts`

**Action :** Copier depuis admin backend et adapter imports

**Contexte nécessaire :**
```
cylimit-admin-backend/src/modules/nft/services/nft-sync.service.ts (source)
cylimit-backend-develop/src/modules/nft/schemas/nft.schema.ts (cible)
cylimit-backend-develop/src/modules/user/schemas/user.schema.ts (cible)
```

**Modifications à faire :**
```typescript
// Adapter les imports selon la structure du user backend
import { Nft } from '@/modules/nft/schemas/nft.schema'; // User backend
import { User } from '@/modules/user/schemas/user.schema'; // User backend

// ⚠️ RETIRER le cron job (uniquement admin backend)
// @Cron('0 3 * * *') // ← SUPPRIMER cette méthode
// async auditAllNFTs() { ... } // ← SUPPRIMER

// ✅ GARDER :
// - verifyOwnershipForListing()
// - forceSyncNFT()
```

---

#### 2. `cylimit-backend-develop/src/modules/nft/nft.module.ts`

**Action :** Ajouter `NftSyncService` dans providers et exports

**Contexte nécessaire :**
```
cylimit-backend-develop/src/modules/nft/nft.module.ts
```

**Modification à faire :**
```typescript
import { NftSyncService } from './services/nft-sync.service';

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    // ... existing providers
    NftSyncService, // ← AJOUTER
    Logger,
  ],
  exports: [
    // ... existing exports
    NftSyncService, // ← AJOUTER
  ],
})
export class NftModule {}
```

---

#### 3. `cylimit-backend-develop/src/modules/wallet/services/marketplace.service.ts`

**Action :** Intégrer vérification ownership dans `listNFT()`

**Contexte nécessaire :**
```
cylimit-backend-develop/src/modules/wallet/services/marketplace.service.ts
```

**Modification à faire :**
```typescript
import { NftSyncService } from '@/modules/nft/services/nft-sync.service';

@Injectable()
export class MarketplaceService {
  constructor(
    // ... existing dependencies
    private readonly nftSyncService: NftSyncService, // ← AJOUTER
  ) {}

  /**
   * Lister un NFT sur le marketplace
   * ✅ Vérification ownership on-chain AVANT listing
   */
  async listNFT(
    userId: string,
    nftId: string,
    price: number,
  ): Promise<{ success: boolean; nft: any; warning?: string }> {
    // 1. Vérifier ownership on-chain (critique !)
    const verification = await this.nftSyncService.verifyOwnershipForListing(
      nftId,
      userId,
    );

    if (!verification.isValid) {
      throw new BadRequestException(
        `You don't own this NFT anymore. Actual owner: ${verification.actualOwnerId}`,
      );
    }

    // 2. Si ownership vérifié, continuer le listing
    const nft = await this.nftModel.findById(nftId);

    if (!nft) {
      throw new BadRequestException('NFT not found');
    }

    // 3. Mettre en vente
    nft.marketType = 'market';
    nft.marketPrice = price;
    await nft.save();

    // 4. Warning si désynchronisation corrigée
    const warning = !verification.wasSynced
      ? 'Ownership was out of sync and has been corrected automatically.'
      : undefined;

    return {
      success: true,
      nft,
      warning,
    };
  }
}
```

---

#### 4. `cylimit-backend-develop/.env`

**Action :** Vérifier que les variables nécessaires sont présentes

**Contexte nécessaire :**
```
cylimit-backend-develop/.env
```

**Variables requises :**
```bash
# Alchemy RPC
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# NFT Contract
NFT_CONTRACT_ADDRESS=0x... # Adresse du contrat NFT CyLimit sur Polygon
```

---

### Tests à effectuer

#### Test 1 : Listing OK (user possède le NFT)

```typescript
// Scénario : User possède le NFT et veut le lister
// 1. User clique "Mettre en vente" dans son profil
// 2. Frontend envoie POST /marketplace/list
// 3. Backend appelle verifyOwnershipForListing()
// 4. Vérification on-chain : OK
// 5. NFT listé avec succès
```

#### Test 2 : Listing KO (user ne possède plus le NFT)

```typescript
// Scénario : NFT a été transféré manuellement hors CyLimit (via MetaMask)
// 1. Créer désync artificielle en DB (changer ownerId)
// 2. User essaie de lister le NFT
// 3. Backend appelle verifyOwnershipForListing()
// 4. Vérification on-chain : KO (owner différent)
// 5. → BadRequestException : "You don't own this NFT anymore"
// 6. → DB corrigée automatiquement
```

#### Test 3 : Listing avec correction auto (désync détectée)

```typescript
// Scénario : DB désynchronisée mais user possède toujours le NFT
// 1. Désync artificielle (changer ownerId dans DB)
// 2. User essaie de lister
// 3. Backend vérifie on-chain : User possède toujours le NFT
// 4. → DB corrigée automatiquement
// 5. → Listing OK avec warning "Ownership was out of sync..."
```

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à implémenter cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir :
├── cylimit-backend-develop/src/modules/nft/nft.module.ts
├── cylimit-backend-develop/src/modules/nft/schemas/nft.schema.ts
├── cylimit-backend-develop/src/modules/user/schemas/user.schema.ts
├── cylimit-backend-develop/src/modules/wallet/services/marketplace.service.ts
├── cylimit-backend-develop/src/modules/wallet/wallet.module.ts
└── cylimit-backend-develop/.env (masquer les secrets)
```

---

## 🟡 PHASE 3 : Tests Wallet Address Sync

**Objectif :** Vérifier que la synchronisation automatique `walletAddress` fonctionne

**Temps estimé :** 30min

**Bloquant :** Non (fonctionnalité déjà créée, juste tester)

---

### Ce qui doit être fait

1. **Test connexion première fois**
   - User nouveau login CyLimit
   - Embedded Wallet créé
   - `walletAddress` synchronisé en DB

2. **Test reconnexion**
   - User existant re-login CyLimit
   - Embedded Wallet auto-connecté
   - `walletAddress` vérifié (pas de changement)

3. **Test doublon (sécurité)**
   - User A a wallet `0xAAA...`
   - User B essaie de sync `0xAAA...`
   - → Backend rejette (BadRequestException)

---

### Tests à effectuer

#### Test 1 : Première connexion (nouveau user)

```typescript
// Scénario : User crée compte CyLimit pour la 1ère fois
// 1. User signup CyLimit (email/password)
// 2. User login CyLimit
// 3. Frontend affiche WalletAuthModal
// 4. User clique "Continuer" (email pré-rempli)
// 5. User reçoit OTP Coinbase
// 6. User entre OTP
// 7. ✅ Embedded Wallet créé (evmAddress disponible)
// 8. Frontend envoie PATCH /users/me/wallet-address
// 9. Backend met à jour user.walletAddress
// 10. Vérifier en DB : walletAddress = 0x... (adresse Embedded Wallet)
```

#### Test 2 : Reconnexion (user existant)

```typescript
// Scénario : User existant re-login CyLimit
// 1. User login CyLimit
// 2. Frontend auto-connecte Embedded Wallet (sans modal OTP)
// 3. evmAddress disponible immédiatement
// 4. Frontend envoie PATCH /users/me/wallet-address
// 5. Backend vérifie : walletAddress déjà identique
// 6. → Pas de mise à jour (ou update walletSyncedAt uniquement)
```

#### Test 3 : Tentative doublon (sécurité)

```typescript
// Scénario : User B essaie de réutiliser l'adresse de User A
// 1. User A a walletAddress = 0xAAA...
// 2. User B login
// 3. User B essaie de sync walletAddress = 0xAAA... (via API manipulation)
// 4. Backend vérifie : 0xAAA... déjà lié à User A
// 5. → BadRequestException : "This wallet address is already linked to another account"
```

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à tester cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir (pour vérifier l'implémentation) :
├── cylimit-backend-develop/src/base/controllers/user.controller.ts (endpoint PATCH)
├── cylimit-backend-develop/src/modules/user/dtos/sync-wallet.dto.ts
├── cylimit-frontend-develop/src/hooks/useEmbeddedWallet.ts (syncWalletAddress)
└── cylimit-frontend-develop/src/components/wallet/WalletAuthModal.tsx
```

---

## 🟢 PHASE 3 : Système de Pending Rewards

**Objectif :** Créer un système robuste de gestion des rewards en attente

**Temps estimé :** 3-4h

**Bloquant :** Non, mais **fortement recommandé** pour la résilience

---

### Ce qui doit être fait

#### 3.1. Schema MongoDB `PendingReward`

**Fonctionnalités :**
- Stocker rewards en attente
- Statuts : `pending`, `processing`, `sent`, `failed`, `cancelled`
- Retry automatique avec backoff exponentiel
- Approbation admin optionnelle
- Audit trail complet

**Fichier à créer :**
```
cylimit-admin-backend/src/modules/rewards/schemas/pending-reward.schema.ts
```

---

#### 3.2. Service `PendingRewardsService`

**Fonctionnalités :**
- `createPendingReward()` : Créer un reward
- `processPendingReward()` : Tenter l'envoi blockchain
- `sendPendingRewardsForUser()` : Envoyer tous les rewards d'un user
- `retryFailedRewards()` : Cron job retry automatique (toutes les 5min)
- `processPendingRewardsForNewWallets()` : Cron job envoi rewards (toutes les 1min)
- `approveReward()` : Approbation admin
- `cancelReward()` : Annulation admin
- `getRewardsStats()` : Statistiques dashboard

**Fichier à créer :**
```
cylimit-admin-backend/src/modules/rewards/services/pending-rewards.service.ts
```

---

#### 3.3. Controller `PendingRewardsController` (Admin)

**Endpoints :**
- `POST /admin/rewards` : Créer reward manuel
- `GET /admin/rewards/pending` : Liste rewards pending
- `PATCH /admin/rewards/:id/approve` : Approuver reward
- `PATCH /admin/rewards/:id/cancel` : Annuler reward
- `POST /admin/rewards/:id/retry` : Retry manuel
- `GET /admin/rewards/stats` : Statistiques
- `POST /admin/rewards/retry-all` : Retry tous les failed

**Fichier à créer :**
```
cylimit-admin-backend/src/modules/rewards/controllers/pending-rewards.controller.ts
```

---

#### 3.4. Intégration User Backend

**Modification :**
- Appeler `sendPendingRewardsForUser()` après sync wallet address
- Retourner nombre de rewards envoyés dans réponse API

**Fichier à modifier :**
```
cylimit-backend-develop/src/base/controllers/user.controller.ts
```

---

#### 3.5. Templates Email

**Templates à créer :**
1. `reward-pending.hbs` : "Tu as gagné un reward, crée ton wallet"
2. `reward-sent.hbs` : "Ton reward a été envoyé !"

**Fichiers à créer :**
```
cylimit-admin-backend/src/modules/mail/templates/reward-pending.hbs
cylimit-admin-backend/src/modules/mail/templates/reward-sent.hbs
```

---

### Use Cases

#### Use Case 1 : User sans wallet gagne compétition
```
1. User gagne compétition → 50 USDC reward
2. Reward créé en DB (status: 'pending')
3. Email envoyé : "Crée ton wallet pour recevoir 50 USDC"
4. User crée wallet → sendPendingRewardsForUser()
5. Reward envoyé sur blockchain
6. Email confirmaton : "50 USDC envoyés !"
```

#### Use Case 2 : Erreur blockchain (RPC down)
```
1. Envoi reward échoue → Erreur RPC
2. Reward marqué 'failed', retryCount = 1
3. Cron job (5min) : Retry automatique après délai
4. Backoff exponentiel : 1min → 5min → 15min → 1h → 2h
5. Max 5 retries
6. Si toujours failed : Alert admin
```

#### Use Case 3 : Approbation admin requise
```
1. Admin crée reward manuel : 1000 USDC
2. Reward marqué requiresAdminApproval: true
3. Admin dashboard : Affiche reward en attente
4. Admin vérifie et approuve
5. Envoi automatique si wallet existe
```

#### Use Case 4 : Batch rewards (100 winners)
```
1. Competition terminée → 100 rewards créés
2. Cron job détecte rewards pending avec wallets
3. Envoie batch par batch (throttle 500ms)
4. Statistiques : 95 sent, 5 failed
5. Failed retried automatiquement
```

---

### Tests à effectuer

#### Test 1 : User sans wallet gagne reward
```typescript
// 1. Créer reward pour user sans wallet
await pendingRewardsService.createPendingReward(userId, 50, 'Competition win');

// 2. Vérifier reward créé en DB (status: 'pending')
const reward = await pendingRewardModel.findOne({ userId });
expect(reward.status).toBe('pending');

// 3. User crée wallet
await userController.syncWalletAddress({ walletAddress: '0x123...' });

// 4. Vérifier reward envoyé (status: 'sent')
const updatedReward = await pendingRewardModel.findById(reward._id);
expect(updatedReward.status).toBe('sent');
expect(updatedReward.txHash).toBeDefined();
```

#### Test 2 : Retry automatique après erreur
```typescript
// 1. Mock erreur RPC
jest.spyOn(coinbaseWalletService, 'sendReward').mockRejectedValue(new Error('RPC down'));

// 2. Tenter envoi reward
await pendingRewardsService.processPendingReward(rewardId);

// 3. Vérifier status 'failed' et retryCount++
const reward = await pendingRewardModel.findById(rewardId);
expect(reward.status).toBe('failed');
expect(reward.retryCount).toBe(1);

// 4. Attendre délai retry (1min)
await sleep(60000);

// 5. Déclencher cron job retry
await pendingRewardsService.retryFailedRewards();

// 6. Vérifier retry tenté
expect(coinbaseWalletService.sendReward).toHaveBeenCalledTimes(2);
```

#### Test 3 : Approbation admin
```typescript
// 1. Créer reward avec approbation requise
const reward = await pendingRewardsService.createPendingReward(
  userId, 
  1000, 
  'Manual bonus',
  { requiresAdminApproval: true }
);

// 2. Vérifier status 'pending' et approvedBy = null
expect(reward.status).toBe('pending');
expect(reward.approvedBy).toBeNull();

// 3. Admin approuve
await pendingRewardsService.approveReward(reward._id, adminId);

// 4. Vérifier approvedBy rempli
const approvedReward = await pendingRewardModel.findById(reward._id);
expect(approvedReward.approvedBy).toBe(adminId);
```

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à implémenter cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir :
├── cylimit-admin-backend/src/modules/rewards/rewards.module.ts (si existe)
├── cylimit-admin-backend/src/modules/wallet/services/coinbase-wallet.service.ts
├── cylimit-admin-backend/src/modules/mail/mail.service.ts (ou équivalent)
├── cylimit-admin-backend/src/modules/user/schemas/user.schema.ts
├── cylimit-backend-develop/src/base/controllers/user.controller.ts
└── cylimit-admin-backend/.env (variables mail si configuré)
```

---

## 🟣 PHASE 4 : Wallet Required Modals (Frontend)

**Objectif :** Créer modals pour bloquer actions nécessitant un wallet

**Temps estimé :** 2-3h

**Bloquant :** Non, mais **fortement recommandé** pour UX

---

### Ce qui doit être fait

#### 4.1. Hook `useWalletRequired`

**Fonctionnalité :**
- Vérifier si wallet existe avant action
- Si pas de wallet : Afficher modal bloquante
- Retourner `checkWalletRequired(action)`

**Fichier à créer :**
```
cylimit-frontend-develop/src/hooks/useWalletRequired.ts
```

---

#### 4.2. Composant `WalletOnboardingModal`

**Fonctionnalité :**
- Modal skippable au premier login
- Expliquer avantages du wallet
- Bouton "Créer maintenant" ou "Plus tard"
- Email notification si skip

**Fichier à créer :**
```
cylimit-frontend-develop/src/components/wallet/WalletOnboardingModal.tsx
```

---

#### 4.3. Composant `WalletRequiredModal`

**Fonctionnalité :**
- Modal bloquante pour actions nécessitant wallet
- Actions : buy, sell, withdraw, receive
- Bouton "Créer mon wallet" (obligatoire)
- Bouton "Annuler" (retour)

**Fichier à créer :**
```
cylimit-frontend-develop/src/components/wallet/WalletRequiredModal.tsx
```

---

#### 4.4. Intégration dans composants marketplace

**Composants à modifier :**
- `BuyNFTButton` : Vérifier wallet avant achat
- `SellNFTButton` : Vérifier wallet avant listing
- `WithdrawButton` : Vérifier wallet avant retrait

**Fichiers à modifier :**
```
cylimit-frontend-develop/src/components/marketplace/BuyNFTButton.tsx
cylimit-frontend-develop/src/components/marketplace/SellNFTButton.tsx
cylimit-frontend-develop/src/components/wallet/WithdrawButton.tsx
```

---

#### 4.5. Intégration dans `_app.tsx`

**Modification :**
- Afficher `WalletOnboardingModal` au premier login si pas de wallet
- Ne pas re-afficher si user a skip (localStorage)

**Fichier à modifier :**
```
cylimit-frontend-develop/src/pages/_app.tsx
```

---

### Tests à effectuer

#### Test 1 : User nouveau login (première fois)
```typescript
// 1. User login CyLimit (première fois après migration)
// 2. Frontend détecte : pas d'Embedded Wallet
// 3. WalletOnboardingModal s'affiche
// 4. User clique "Plus tard"
// 5. Modal se ferme, localStorage marqué 'skipped'
// 6. User peut continuer à explorer le site
```

#### Test 2 : User essaie d'acheter NFT sans wallet
```typescript
// 1. User clique "Acheter ce NFT"
// 2. checkWalletRequired('buy') → false
// 3. WalletRequiredModal s'affiche (bloquante)
// 4. User clique "Créer mon wallet"
// 5. Processus création wallet (email OTP)
// 6. Après création : Modal se ferme, achat peut continuer
```

#### Test 3 : User avec wallet essaie d'acheter
```typescript
// 1. User clique "Acheter ce NFT"
// 2. checkWalletRequired('buy') → true
// 3. Pas de modal, achat continue normalement
```

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à implémenter cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir :
├── cylimit-frontend-develop/src/hooks/useEmbeddedWallet.ts
├── cylimit-frontend-develop/src/components/wallet/WalletAuthModal.tsx
├── cylimit-frontend-develop/src/pages/_app.tsx
├── cylimit-frontend-develop/src/components/marketplace/BuyNFTButton.tsx (si existe)
└── cylimit-frontend-develop/src/components/marketplace/SellNFTButton.tsx (si existe)
```

---

## 🟡 PHASE 5 : Tests Wallet Address Sync

**Objectif :** Implémenter achats/ventes NFTs avec transactions atomiques

**Temps estimé :** 5-7 jours

**Bloquant :** Oui (pour marketplace fonctionnel)

---

### Ce qui doit être fait

#### 4.1. Achat NFT Primaire (CyLimit → User)

**Flow :**
1. User clique "Acheter" sur NFT CyLimit (marché primaire)
2. Frontend vérifie balance USDC
3. Si suffisant : Prépare transaction atomique
4. Backend mint NFT + transfer USDC
5. Gas payé par CyLimit (Paymaster)

**Services :**
- ✅ `MarketplaceService.buyNFTPrimary()`
- ✅ `CoinbaseWalletService.executeBatchTransaction()`

---

#### 4.2. Achat NFT Secondaire (User → User)

**Flow :**
1. User A liste NFT à 10 USDC
2. User B clique "Acheter"
3. Backend vérifie ownership User A (vérification on-chain)
4. Transaction atomique :
   - User B → User A : 9.95 USDC
   - User B → CyLimit Master : 0.05 USDC (fee)
   - User A → User B : NFT
5. Gas payé par CyLimit (Paymaster)

**Services :**
- ✅ `MarketplaceService.buyNFTSecondary()`
- ✅ `NftSyncService.verifyOwnershipForListing()` (déjà fait)

---

#### 4.3. Intégration Stripe (Paiement CB classique)

**Flow :**
1. User clique "Acheter avec CB" (Stripe)
2. Frontend crée Payment Intent
3. User paie avec CB
4. Webhook Stripe confirme paiement
5. Backend convertit EUR → USDC
6. Backend envoie USDC au user (depuis Rewards Wallet)
7. Backend exécute achat NFT

**Services :**
- 🔄 `DepositService.createStripePaymentIntent()`
- 🔄 `DepositService.handleStripePaymentCompleted()`
- 🔄 `WebhooksController.handleStripe()`

---

#### 4.4. Webhooks Alchemy (Détection transferts on-chain)

**Flow :**
1. User transfère NFT manuellement (via MetaMask)
2. Alchemy détecte transfert on-chain
3. Webhook Alchemy envoie notification
4. Backend met à jour DB (ownerId)

**Services :**
- 🔄 `WebhooksController.handleAlchemy()`
- 🔄 `NftSyncService.handleTransferWebhook()`

---

#### 4.5. Smart Contract NFT v2 (Transferts restreints)

**Fonctionnalités :**
- Mint NFTs avec metadata IPFS
- Transferts restreints (whitelist CyLimit marketplace)
- Royalties on-chain (ERC-2981)
- Mode urgence (déblocage si CyLimit ferme)
- Visibilité OpenSea/MetaMask (lecture seule)

**Fichiers :**
- 🔄 `contracts/CyLimitNFT_v2.sol`
- 🔄 `scripts/deploy-nft-v2.ts`

---

### Fichiers de contexte nécessaires

Pour que je puisse t'aider à implémenter cette phase, j'ai besoin de :

```
📂 Fichiers à me fournir :
├── cylimit-backend-develop/src/modules/wallet/services/marketplace.service.ts (version actuelle)
├── cylimit-admin-backend/src/modules/wallet/services/coinbase-wallet.service.ts
├── cylimit-admin-backend/src/modules/wallet/services/coinbase-transaction.service.ts
├── cylimit-backend-develop/src/modules/nft/schemas/nft.schema.ts
├── cylimit-backend-develop/src/modules/user/schemas/user.schema.ts
├── cylimit-frontend-develop/src/hooks/useEmbeddedWallet.ts
└── cylimit-frontend-develop/src/hooks/useMarketplace.ts (si existe)
```

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

```
1. ✅ FAIT : Backend Server Wallets (Admin)
   └─> Master Wallet, Rewards Wallet, API CDP

2. ✅ FAIT : Frontend Embedded Wallets
   └─> Auth email/OTP, Balance USDC, Onramp, Design

3. ✅ FAIT : User Backend Services
   └─> OnrampService, MarketplaceService (skeleton), Sync walletAddress

4. ✅ FAIT : NFT Sync Service (Code créé)
   └─> Cron job, Vérification listing, Endpoint admin

5. 🔴 PHASE 1 : Intégrer NFT Sync dans Admin Backend (1-2h)
   └─> NFTModule, ScheduleModule, Controller admin

6. 🟠 PHASE 2 : Intégrer NFT Sync dans User Backend (1-2h)
   └─> Copier service, Intégrer dans MarketplaceService

7. 🟢 PHASE 3 : Système Pending Rewards (3-4h) ⭐ NOUVEAU
   └─> Schema, Service, Controller, Cron jobs, Retry automatique

8. 🟣 PHASE 4 : Wallet Required Modals (2-3h) ⭐ NOUVEAU
   └─> Onboarding modal, Required modal, Intégration marketplace

9. 🟡 PHASE 5 : Tests Wallet Address Sync (30min)
   └─> Première connexion, Reconnexion, Doublon

10. 🔵 PHASE 6 : Marketplace Complet (5-7j)
    └─> Achats/Ventes, Stripe, Webhooks, Smart Contract
```

**TOTAL TEMPS RESTANT POUR MVP COMPLET : 8-12h** (phases 1-5)

**TOTAL TEMPS POUR PRODUCTION : 13-19j** (phases 1-6)

---

## 📊 ÉTAT GLOBAL DU PROJET

### Progression par composant

| Composant | Statut | Progression |
|-----------|--------|-------------|
| **Admin Backend (Server Wallets)** | ✅ | 100% |
| **Frontend (Embedded Wallets)** | ✅ | 100% |
| **User Backend (Services)** | ✅ | 90% |
| **NFT Sync Service (Code)** | ✅ | 100% |
| **NFT Sync Service (Intégration)** | 🔄 | 0% |
| **Pending Rewards System** | 🔄 | 0% |
| **Wallet Required Modals** | 🔄 | 0% |
| **Marketplace (Préparation)** | ✅ | 30% |
| **Marketplace (Complet)** | 🔄 | 0% |
| **Smart Contract NFT v2** | 🔄 | 0% |
| **Documentation** | ✅ | 100% |

**PROGRESSION GLOBALE : 70%** (ajout de nouvelles phases)

---

## 🎉 RÉSUMÉ EXÉCUTIF

### ✅ Ce qui marche MAINTENANT

- ✅ Server Wallets CyLimit (Master, Rewards)
- ✅ Embedded Wallets users (auth email/OTP)
- ✅ Balance USDC en temps réel
- ✅ Onramp Coinbase (popup pour achats CB)
- ✅ Dépôt blockchain manuel (QR Code)
- ✅ Auto-connexion/déconnexion wallet
- ✅ Sync automatique `walletAddress`
- ✅ Design aligné avec l'app
- ✅ Code NFT Sync Service créé

### 🔄 Ce qui manque pour MVP COMPLET

- 🔄 Intégration NFT Sync Service (1-2h)
- 🔄 Système Pending Rewards (3-4h) ⭐ **RECOMMANDÉ**
- 🔄 Wallet Required Modals (2-3h) ⭐ **RECOMMANDÉ**
- 🔄 Tests Wallet Address Sync (30min)

**TOTAL : 8-12h de dev**

### 📋 Ce qui manque pour Production

- 📋 Marketplace Complet (5-7j)
  - Achats/Ventes NFTs atomiques
  - Intégration Stripe
  - Webhooks Alchemy
  - Smart Contract NFT v2
- 📋 Tests end-to-end (2j)
- 📋 Déploiement production (1j)

**TOTAL : 7-10j de dev**

---

## 📞 CONTACTS & SUPPORT

**Questions sur le code ?**
- Voir `NFT-SYNC-SERVICE.md` (guide technique complet)
- Voir `EMBEDDED-WALLET-SYNC.md` (sync walletAddress)

**Questions sur le déploiement ?**
- Voir `GUIDE-DEPLOIEMENT.md` (Smart Contract + Config)
- Voir `CHECKLIST-MIGRATION.md` (timeline complet)

**Questions sur l'architecture ?**
- Voir `SYSTEME-WALLETS-COMPLET.md` (système complet)

---

**Maintenu par :** Valentin @ CyLimit  
**Dernière mise à jour :** 9 octobre 2025  
**Version :** 1.0

🚀 **Prêt pour implémentation Phase 1 !**

