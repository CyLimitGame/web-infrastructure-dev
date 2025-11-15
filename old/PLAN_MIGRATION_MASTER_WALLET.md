# 🔄 Plan de Migration : Master Wallet vers Admin Backend

## 📋 **Contexte**

**PROBLÈME ACTUEL** :
Les clés CDP du Master Wallet sont dans le **User Backend** (cylimit-backend-develop), qui est exposé publiquement. Cela crée des failles de sécurité critiques.

**SOLUTION** :
Déplacer les clés CDP vers l'**Admin Backend** (cylimit-admin-backend) et faire appel via API interne sécurisée.

---

## 🎯 **Objectifs**

1. ✅ **Sécurité** : Isoler les clés CDP dans un backend non-public
2. ✅ **Isolation** : Séparer User Backend (public) et Admin Backend (privé)
3. ✅ **Audit Trail** : Logger tous les appels Master Wallet
4. ✅ **Flexibilité** : Permettre d'ajouter KMS, multi-sig, etc. plus tard

---

## 🔍 **Services Impactés**

### 1. User Backend : `MigrationService`

**Fichier** : `/cylimit-backend-develop/src/modules/user/services/migration.service.ts`

**Fonctions utilisant CDP** :
- `transferUSDC()` (lignes 608-734)
  - Utilise `cdp.evm.getOrCreateAccount()` pour récupérer Master Account
  - Utilise `masterAccount.transfer()` pour envoyer USDC
  - Attend confirmation avec `publicClient.waitForTransactionReceipt()`

- `transferNFTsV2()` (lignes 951-1256)
  - Utilise `cdp.evm.getOrCreateAccount()` pour récupérer Master Account
  - Utilise `cdp.evm.sendTransaction()` pour batch transfer NFTs
  - Attend confirmation avec `waitForTransactionWithRetry()`

**Variables d'environnement utilisées** :
```bash
COINBASE_API_KEY_NAME           # Ligne 188
COINBASE_API_KEY_PRIVATE_KEY    # Ligne 189
COINBASE_WALLET_SECRET          # Ligne 190
```

---

### 2. User Backend : `CoinbaseService`

**Fichier** : `/cylimit-backend-develop/src/modules/coinbase/coinbase.service.ts`

**Fonctions utilisant CDP** :
- `transferEscrowedUSDCFromOffer()` (lignes 108-178)
  - Transfer USDC escrowed depuis une offre vers le target
- `transferNFT()` (lignes 191-260)
  - Transfer un NFT individuel
- `transferNFTsBatch()` (lignes 269-336)
  - Transfer plusieurs NFTs en batch

**Variables d'environnement utilisées** :
```bash
COINBASE_API_KEY_NAME           # Via getCdpClient()
COINBASE_API_KEY_PRIVATE_KEY
COINBASE_WALLET_SECRET
MASTER_WALLET_ADDRESS
```

---

## 📐 **Architecture Cible**

### **AVANT (Actuel - Risqué)**

```
┌─────────────────────────────────────────┐
│ User Backend (Public)                   │
│ - Port 3002                             │
│ - Exposé sur internet                   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ MigrationService                  │   │
│ │ - transferUSDC()                  │   │
│ │ - transferNFTsV2()                │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ CoinbaseService                   │   │
│ │ - transferEscrowedUSDCFromOffer() │   │
│ │ - transferNFTsBatch()             │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ⚠️ Clés CDP EXPOSÉES :                  │
│ - CDP_API_KEY_NAME                      │
│ - CDP_API_KEY_PRIVATE_KEY               │
│ - COINBASE_WALLET_SECRET                │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Smart Contract (Base Sepolia/Mainnet)  │
│ - Marketplace v4                        │
│ - NFT Contract v2                       │
│ - USDC Contract                         │
└─────────────────────────────────────────┘
```

### **APRÈS (Sécurisé)**

```
┌─────────────────────────────────────────┐
│ User Backend (Public)                   │
│ - Port 3002                             │
│ - Exposé sur internet                   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ MigrationService                  │   │
│ │ - transferUSDC()                  │   │
│ │   → Appelle AdminBackendClient   │   │
│ │ - transferNFTsV2()                │   │
│ │   → Appelle AdminBackendClient   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ OfferService                      │   │
│ │ - confirmOfferAccepted()          │   │
│ │   → Appelle AdminBackendClient   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ AdminBackendClient (Nouveau)     │   │
│ │ - transferUSDC()                  │   │
│ │ - transferNFTs()                  │   │
│ │ - finalizeOffer()                 │   │
│ │                                   │   │
│ │ ✅ Signature HMAC                │   │
│ │ ✅ Nonce anti-replay              │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ❌ Clés CDP RETIRÉES                    │
└─────────────────────────────────────────┘
         │
         │ HTTPS (Internal API)
         │ IP Whitelist
         │ HMAC Signature
         ▼
┌─────────────────────────────────────────┐
│ Admin Backend (Private)                 │
│ - Port 3003 (private network only)      │
│ - NON exposé sur internet               │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ InternalMarketplaceController     │   │
│ │                                   │   │
│ │ POST /internal/transfer-usdc      │   │
│ │ POST /internal/transfer-nfts      │   │
│ │ POST /internal/finalize-offer     │   │
│ │                                   │   │
│ │ Guards:                           │   │
│ │ - IPWhitelistGuard                │   │
│ │ - HMACSignatureGuard              │   │
│ │ - NonceGuard                      │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ MasterWalletService (Nouveau)     │   │
│ │ - transferUSDC()                  │   │
│ │ - transferNFTsBatch()             │   │
│ │ - transferEscrowedUSDCFromOffer() │   │
│ │                                   │   │
│ │ ✅ CDP SDK v2                     │   │
│ │ ✅ Audit logging                  │   │
│ │ ✅ Rate limiting                  │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ✅ Clés CDP SÉCURISÉES :                │
│ - CDP_API_KEY_NAME                      │
│ - CDP_API_KEY_PRIVATE_KEY               │
│ - COINBASE_WALLET_SECRET                │
│ - INTERNAL_API_SECRET (HMAC)            │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Smart Contract (Base Sepolia/Mainnet)  │
│ - Marketplace v4                        │
│ - NFT Contract v2                       │
│ - USDC Contract                         │
└─────────────────────────────────────────┘
```

---

## 🔧 **Implémentation Détaillée**

### **ÉTAPE 1 : Créer le MasterWalletService dans Admin Backend**

**Fichier** : `/cylimit-admin-backend/src/modules/master-wallet/master-wallet.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CdpClient } from '@coinbase/cdp-sdk';
import { encodeFunctionData, createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

@Injectable()
export class MasterWalletService {
  private readonly logger = new Logger(MasterWalletService.name);
  private cdp: CdpClient;
  private readonly publicClient: any;
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';

    // Initialiser CDP SDK v2
    this.cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_NAME,
      apiKeySecret: process.env.CDP_API_KEY_PRIVATE_KEY,
      walletSecret: process.env.COINBASE_WALLET_SECRET,
    });

    // Public Client (viem)
    this.publicClient = createPublicClient({
      chain: this.isProduction ? base : baseSepolia,
      transport: http(),
    });

    this.logger.log('✅ MasterWalletService initialized (Admin Backend)');
  }

  /**
   * Transfer USDC depuis Master Wallet vers une adresse
   */
  async transferUSDC(
    toAddress: string,
    amount: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    // ... copier la logique depuis User Backend MigrationService.transferUSDC()
  }

  /**
   * Transfer NFTs en batch depuis Master Wallet
   */
  async transferNFTsBatch(
    toAddress: string,
    tokenIds: string[],
    contractAddress: string,
  ): Promise<{ success: boolean; txHash?: string; errors?: string[] }> {
    // ... copier la logique depuis User Backend MigrationService.transferNFTsV2()
  }

  /**
   * Transfer USDC escrowed depuis une offre
   */
  async transferEscrowedUSDCFromOffer(
    offerId: string,
    toAddress: string,
    amount: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    // ... copier la logique depuis User Backend CoinbaseService
  }
}
```

---

### **ÉTAPE 2 : Créer le Controller Interne dans Admin Backend**

**Fichier** : `/cylimit-admin-backend/src/modules/master-wallet/internal-marketplace.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IPWhitelistGuard } from './guards/ip-whitelist.guard';
import { HMACSignatureGuard } from './guards/hmac-signature.guard';
import { NonceGuard } from './guards/nonce.guard';
import { MasterWalletService } from './master-wallet.service';

@Controller('internal')
@UseGuards(IPWhitelistGuard, HMACSignatureGuard, NonceGuard)
export class InternalMarketplaceController {
  constructor(private readonly masterWalletService: MasterWalletService) {}

  /**
   * POST /internal/transfer-usdc
   * Transfer USDC depuis Master Wallet (pour Migration)
   */
  @Post('transfer-usdc')
  async transferUSDC(
    @Body() body: { toAddress: string; amount: number; nonce: string; timestamp: number },
  ) {
    return this.masterWalletService.transferUSDC(body.toAddress, body.amount);
  }

  /**
   * POST /internal/transfer-nfts
   * Transfer NFTs en batch (pour Migration)
   */
  @Post('transfer-nfts')
  async transferNFTs(
    @Body() body: { toAddress: string; tokenIds: string[]; contractAddress: string; nonce: string; timestamp: number },
  ) {
    return this.masterWalletService.transferNFTsBatch(
      body.toAddress,
      body.tokenIds,
      body.contractAddress,
    );
  }

  /**
   * POST /internal/finalize-offer
   * Finaliser une offre (Transfer USDC escrowed + NFTs)
   */
  @Post('finalize-offer')
  async finalizeOffer(
    @Body() body: { offerId: string; targetAddress: string; offeredUSDC: number; nfts: any[]; nonce: string; timestamp: number },
  ) {
    // 1. Transfer USDC escrowed si offeredUSDC > 0
    let usdcTxHash = null;
    if (body.offeredUSDC > 0) {
      const usdcResult = await this.masterWalletService.transferEscrowedUSDCFromOffer(
        body.offerId,
        body.targetAddress,
        body.offeredUSDC,
      );
      usdcTxHash = usdcResult.txHash;
    }

    // 2. Transfer NFTs si nécessaire
    let nftTxHash = null;
    if (body.nfts.length > 0) {
      const tokenIds = body.nfts.map(nft => nft.tokenId);
      const contractAddress = body.nfts[0].contractAddress;
      const nftResult = await this.masterWalletService.transferNFTsBatch(
        body.targetAddress,
        tokenIds,
        contractAddress,
      );
      nftTxHash = nftResult.txHash;
    }

    return {
      success: true,
      transactionHashes: {
        usdc: usdcTxHash,
        nfts: nftTxHash,
      },
    };
  }
}
```

---

### **ÉTAPE 3 : Créer les Guards de Sécurité**

#### **A. IPWhitelistGuard**

**Fichier** : `/cylimit-admin-backend/src/modules/master-wallet/guards/ip-whitelist.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class IPWhitelistGuard implements CanActivate {
  private readonly allowedIPs: string[];

  constructor() {
    // Charger les IPs autorisées depuis .env
    this.allowedIPs = (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim());
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;

    if (!this.allowedIPs.includes(clientIp)) {
      throw new ForbiddenException(`IP ${clientIp} not whitelisted`);
    }

    return true;
  }
}
```

#### **B. HMACSignatureGuard**

**Fichier** : `/cylimit-admin-backend/src/modules/master-wallet/guards/hmac-signature.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HMACSignatureGuard implements CanActivate {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.INTERNAL_API_SECRET!;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature'];
    const payload = request.body;

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new ForbiddenException('Invalid HMAC signature');
    }

    return true;
  }
}
```

#### **C. NonceGuard**

**Fichier** : `/cylimit-admin-backend/src/modules/master-wallet/guards/nonce.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service'; // Ou votre service Redis

@Injectable()
export class NonceGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { nonce, timestamp } = request.body;

    // Vérifier timestamp (max 5 minutes)
    if (Date.now() - timestamp > 300000) {
      throw new BadRequestException('Request expired (timestamp too old)');
    }

    // Vérifier nonce unique
    const nonceKey = `nonce:${nonce}`;
    const exists = await this.redis.exists(nonceKey);

    if (exists) {
      throw new BadRequestException('Nonce already used (replay attack detected)');
    }

    // Stocker nonce (TTL 10 minutes)
    await this.redis.setex(nonceKey, 600, '1');

    return true;
  }
}
```

---

### **ÉTAPE 4 : Créer AdminBackendClient dans User Backend**

**Fichier** : `/cylimit-backend-develop/src/modules/admin-backend-client/admin-backend-client.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AdminBackendClient {
  private readonly logger = new Logger(AdminBackendClient.name);
  private readonly adminBackendUrl: string;
  private readonly internalApiSecret: string;

  constructor() {
    this.adminBackendUrl = process.env.ADMIN_BACKEND_URL || 'http://localhost:3003';
    this.internalApiSecret = process.env.INTERNAL_API_SECRET!;

    this.logger.log(`✅ AdminBackendClient initialized: ${this.adminBackendUrl}`);
  }

  private signRequest(payload: any): string {
    return crypto
      .createHmac('sha256', this.internalApiSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async transferUSDC(
    toAddress: string,
    amount: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const payload = {
      toAddress,
      amount,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const signature = this.signRequest(payload);

    const response = await axios.post(
      `${this.adminBackendUrl}/internal/transfer-usdc`,
      payload,
      {
        headers: {
          'X-Signature': signature,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async transferNFTs(
    toAddress: string,
    tokenIds: string[],
    contractAddress: string,
  ): Promise<{ success: boolean; txHash?: string; errors?: string[] }> {
    const payload = {
      toAddress,
      tokenIds,
      contractAddress,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const signature = this.signRequest(payload);

    const response = await axios.post(
      `${this.adminBackendUrl}/internal/transfer-nfts`,
      payload,
      {
        headers: {
          'X-Signature': signature,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async finalizeOffer(
    offerId: string,
    targetAddress: string,
    offeredUSDC: number,
    nfts: any[],
  ): Promise<{ success: boolean; transactionHashes: any }> {
    const payload = {
      offerId,
      targetAddress,
      offeredUSDC,
      nfts,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const signature = this.signRequest(payload);

    const response = await axios.post(
      `${this.adminBackendUrl}/internal/finalize-offer`,
      payload,
      {
        headers: {
          'X-Signature': signature,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
}
```

---

### **ÉTAPE 5 : Refactorer User Backend pour utiliser AdminBackendClient**

#### **A. MigrationService**

**Fichier** : `/cylimit-backend-develop/src/modules/user/services/migration.service.ts`

```typescript
// Remplacer la fonction transferUSDC()
private async transferUSDC(
  toAddress: string,
  amount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    this.logger.log(`💵 Transferring ${amount} USDC to ${toAddress} via Admin Backend`);

    // Appeler Admin Backend au lieu de CDP directement
    const result = await this.adminBackendClient.transferUSDC(toAddress, amount);

    if (result.success) {
      this.logger.log(`✅ USDC transferred successfully: ${result.txHash}`);
      
      // Logger dans address_activities
      await this.logUSDCMigration(
        process.env.MASTER_WALLET_ADDRESS!,
        toAddress,
        amount,
        result.txHash!,
      );
    }

    return result;
  } catch (error: any) {
    this.logger.error('❌ USDC transfer failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Remplacer la fonction transferNFTsV2() pour utiliser AdminBackendClient
```

#### **B. OfferService**

**Fichier** : `/cylimit-backend-develop/src/modules/marketplace/services/offer.service.ts`

```typescript
// Remplacer confirmOfferAccepted() pour utiliser AdminBackendClient
public async confirmOfferAccepted(
  offerId: string,
  acceptorId: string,
  txHash: string,
): Promise<any> {
  // ... validations ...

  // Appeler Admin Backend pour finaliser l'offre
  const result = await this.adminBackendClient.finalizeOffer(
    offer.offerId,
    offer.targetId.walletAddress,
    offer.offeredUSDC,
    [...offer.requestedNFTs, ...offer.offeredNFTs],
  );

  // ... mise à jour DB ...
}
```

---

## 📝 **Checklist Migration**

### Admin Backend
- [ ] Créer module `master-wallet`
- [ ] Créer `MasterWalletService`
- [ ] Créer `InternalMarketplaceController`
- [ ] Créer `IPWhitelistGuard`
- [ ] Créer `HMACSignatureGuard`
- [ ] Créer `NonceGuard`
- [ ] Déplacer clés CDP depuis User Backend `.env.local`
- [ ] Ajouter `INTERNAL_API_SECRET` dans `.env.local`
- [ ] Ajouter `ALLOWED_IPS` dans `.env.local`
- [ ] Tester endpoints internes

### User Backend
- [ ] Créer module `admin-backend-client`
- [ ] Créer `AdminBackendClientService`
- [ ] Refactorer `MigrationService.transferUSDC()`
- [ ] Refactorer `MigrationService.transferNFTsV2()`
- [ ] Refactorer `OfferService.confirmOfferAccepted()`
- [ ] Retirer `CoinbaseService` (ou le marquer deprecated)
- [ ] Retirer clés CDP de `.env.local`
- [ ] Ajouter `ADMIN_BACKEND_URL` dans `.env.local`
- [ ] Ajouter `INTERNAL_API_SECRET` dans `.env.local`
- [ ] Tester migrations USDC/NFTs
- [ ] Tester finalisation offers

### Tests
- [ ] Tester migration USDC (testnet)
- [ ] Tester migration NFTs (testnet)
- [ ] Tester finalisation offer (testnet)
- [ ] Tester security : IP non-whitelist (doit échouer)
- [ ] Tester security : HMAC incorrect (doit échouer)
- [ ] Tester security : Nonce replay (doit échouer)
- [ ] Tester security : Timestamp expiré (doit échouer)

---

## ⏱️ **Estimation Temps**

| Tâche | Temps estimé |
|-------|--------------|
| Admin Backend : MasterWalletService | 2 heures |
| Admin Backend : Controllers + Guards | 3 heures |
| User Backend : AdminBackendClient | 2 heures |
| User Backend : Refactoring services | 3 heures |
| Tests + Debugging | 4 heures |
| **TOTAL** | **~14 heures** (~2 jours) |

---

## 🚨 **Rollback Plan**

Si problèmes en production :

1. ✅ **Garder les 2 implémentations en parallèle** (flag feature)
2. ✅ **Feature flag** `USE_ADMIN_BACKEND_FOR_CDP = false` → Retour à l'ancien système
3. ✅ **Logs détaillés** pour identifier rapidement les problèmes
4. ✅ **Monitoring** : Alertes si > 10% d'erreurs sur Admin Backend

---

## 📚 **Variables d'Environnement**

### Admin Backend (`.env.local`)

```bash
# CDP SDK (Master Wallet)
CDP_API_KEY_NAME=xxx
CDP_API_KEY_PRIVATE_KEY=xxx
COINBASE_WALLET_SECRET=xxx
MASTER_WALLET_ADDRESS=0x...

# Internal API Security
INTERNAL_API_SECRET=xxx  # À générer (32 bytes random)
ALLOWED_IPS=10.0.0.5,172.16.0.10  # IPs du User Backend
```

### User Backend (`.env.local`)

```bash
# ❌ RETIRER :
# CDP_API_KEY_NAME=xxx
# CDP_API_KEY_PRIVATE_KEY=xxx
# COINBASE_WALLET_SECRET=xxx

# ✅ AJOUTER :
ADMIN_BACKEND_URL=http://admin-backend:3003  # URL interne
INTERNAL_API_SECRET=xxx  # Même secret que Admin Backend
```

---

## ✅ **Critères de Succès**

1. ✅ User Backend n'a plus accès aux clés CDP
2. ✅ Toutes les migrations USDC/NFTs fonctionnent via Admin Backend
3. ✅ Toutes les finalisations d'offres fonctionnent via Admin Backend
4. ✅ Aucune régression sur les tests existants
5. ✅ Logs d'audit complets pour tous les appels Master Wallet
6. ✅ Rate limiting en place (max 100 req/min)
7. ✅ Guards de sécurité actifs (IP, HMAC, Nonce)

