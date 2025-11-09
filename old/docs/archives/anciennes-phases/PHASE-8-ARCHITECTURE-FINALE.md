# ✅ Phase 8 - Architecture Finale (Embedded Wallets)

> **Date** : 2025-10-21  
> **Version** : 3.0 (Architecture finale avec @coinbase/cdp-hooks)  
> **Statut** : ✅ 100% Complété

---

## 🎯 Objectif

Implémenter un marketplace NFT CyLimit sur Base avec :
- ✅ **$0 gas pour les users** (CDP Paymaster)
- ✅ **Architecture simplifiée** (Frontend = transactions, Backend = logique métier)
- ✅ **Embedded Wallets** (Smart Accounts ERC-4337)
- ✅ **Batch transactions** (3 opérations en 1)

---

## 🏗️ Architecture Finale

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDED WALLETS                                │
│                   (@coinbase/cdp-hooks frontend)                         │
│                                                                          │
│  1. Frontend utilise useSendUserOperation directement                   │
│  2. Backend gère uniquement la logique métier + DB                      │
│  3. Pas de CDP SDK côté backend pour les users                         │
└──────────────────────────────────────────────────────────────────────────┘

Frontend (React)                Backend (NestJS)               Blockchain
─────────────────               ──────────────────             ─────────────
useMarketplace                  MarketplaceService             Base Sepolia
  │                               │                             │
  ├─ listNFT() ───────────────────► prepareBuyNFT()            │
  │                               │  (vérifications + DB)       │
  │                               │                             │
  ├─ buyNFT()                     │                             │
  │  ├─ Prepare (backend)         │                             │
  │  ├─ sendUserOp() ─────────────┼─────────────────────────────► UserOp
  │  │  (useCoinbaseWallet)       │                             │  (3 calls)
  │  │                            │                             │
  │  └─ confirmBuyNFT() ──────────► confirmBuyNFT()            │
  │                               │  (update DB)                │
  │                               │                             │
useCoinbaseWallet                 CoinbaseService              CDP Paymaster
  │                               │                             │
  └─ useSendUserOperation         └─ (placeholder)             └─ Sponsors gas
     (@coinbase/cdp-hooks)                                         $0 pour user
```

---

## 📦 Fichiers Créés / Modifiés

### 🟢 Frontend (cylimit-frontend-develop)

#### `src/hooks/useCoinbaseWallet.ts` ✅
```typescript
import { useSendUserOperation, useCurrentUser } from '@coinbase/cdp-hooks';

export function useCoinbaseWallet() {
  const { sendUserOperation, status, data, error } = useSendUserOperation();
  const { currentUser } = useCurrentUser();

  const sendUserOp = async (params: {
    network: 'base-sepolia' | 'base';
    calls: Array<{ to: `0x${string}`; data?: `0x${string}`; value?: bigint }>;
    useCdpPaymaster?: boolean;
  }) => {
    const smartAccount = currentUser?.evmSmartAccounts?.[0];
    return await sendUserOperation({
      evmSmartAccount: smartAccount,
      network: params.network,
      calls: params.calls,
      useCdpPaymaster: params.useCdpPaymaster ?? true,
    });
  };

  return {
    sendUserOp,
    status, // "idle" | "pending" | "success" | "error"
    data,
    error,
    smartAccount: currentUser?.evmSmartAccounts?.[0],
    isConnected: !!currentUser,
  };
}
```

#### `src/hooks/useMarketplace.ts` ✅
```typescript
export const useMarketplace = () => {
  const { sendUserOp } = useCoinbaseWallet();

  const buyNFT = async (listingId: string) => {
    // 1. Backend prépare (vérifications)
    const buyData = await axios.post(`/marketplace/buy/${listingId}`);
    
    // 2. Construire les calls (batch transaction)
    const calls = [
      { to: usdc, data: encodeFunctionData(...) }, // USDC → seller
      { to: usdc, data: encodeFunctionData(...) }, // USDC fees → CyLimit
      { to: marketplace, data: encodeFunctionData(...) } // NFT → buyer
    ];
    
    // 3. Envoyer UserOperation (CDP Hooks)
    const result = await sendUserOp({
      network: 'base-sepolia',
      calls,
      useCdpPaymaster: true,
    });
    
    // 4. Confirmer au backend
    return await axios.post('/marketplace/confirm-buy', {
      listingId,
      transactionHash: result.userOperationHash,
    });
  };
};
```

#### `src/config/blockchain.config.ts` ✅
```typescript
export const BLOCKCHAIN_CONFIG = {
  network: isProduction ? 'base' : 'base-sepolia',
  nftContract: '0x012ab34A520638C0aA876252161c6039343741A4',
  marketplaceContract: '0x38d20a95a930F5187507D9F597bc0a37712E82eb',
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  paymasterUrl: 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/paymaster',
};
```

#### `tsconfig.json` ✅
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // ✅ Changé de "node" à "bundler"
  }
}
```

---

### 🔵 Backend User (cylimit-backend-develop)

#### `src/modules/marketplace/marketplace.service.ts` ✅
```typescript
@Injectable()
export class MarketplaceService {
  // ✅ Listing NFT ($0 gas, DB uniquement)
  async listNFT(userId, nftId, priceUSDC) {
    // Vérifications
    // Créer listing en DB
    return { success: true, listingId, message: 'NFT listed (no gas)' };
  }

  // ✅ Préparer achat (backend vérifications)
  async prepareBuyNFT(userId, listingId) {
    // Vérifier buyer, seller, listing
    // Retourner détails pour frontend
    return {
      seller: { address, userId },
      buyer: { address, userId },
      price, fees, total,
      contracts: { usdc, marketplace, masterWallet },
    };
  }

  // ✅ Confirmer achat (après UserOp réussie)
  async confirmBuyNFT(userId, listingId, txHash) {
    // Mettre à jour DB
    listing.status = 'sold';
    nft.ownerId = userId;
    return { success: true, txHash, explorerUrl };
  }
}
```

#### `src/modules/marketplace/marketplace.controller.ts` ✅
```typescript
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  // POST /marketplace/list
  async listNFT(@Body() body: ListNFTDto) {
    return this.marketplaceService.listNFT(userId, body.nftId, body.priceUSDC);
  }

  // POST /marketplace/buy/:listingId (prépare)
  async prepareBuyNFT(@Param('listingId') listingId) {
    return this.marketplaceService.prepareBuyNFT(userId, listingId);
  }

  // POST /marketplace/confirm-buy (confirme après UserOp)
  async confirmBuyNFT(@Body() body: ConfirmBuyNFTDto) {
    return this.marketplaceService.confirmBuyNFT(
      userId, body.listingId, body.transactionHash
    );
  }
}
```

#### `src/modules/coinbase/coinbase.service.ts` ✅
```typescript
@Injectable()
export class CoinbaseService {
  // ✅ PAS DE CDP SDK pour les users
  // Embedded Wallets gèrent tout depuis le frontend
  
  constructor() {
    this.logger.log('🔧 CoinbaseService USER initialisé');
    this.logger.warn('⚠️  UserOperations gérées côté frontend');
  }

  async getSampleInfo() {
    return {
      network: 'base-sepolia',
      note: 'UserOperations sent from frontend via Embedded Wallets',
    };
  }
}
```

#### `src/config/blockchain.config.ts` ✅
```typescript
export const BLOCKCHAIN_CONFIG = {
  network: isDevelopment ? 'base-sepolia' : 'base-mainnet',
  nftContract: process.env.TESTNET_NFT_V2_CONTRACT_ADDRESS,
  marketplaceContract: process.env.TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS,
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};
```

---

### 🔴 Backend Admin (cylimit-admin-backend)

#### `src/modules/coinbase/coinbase.service.ts` ✅
```typescript
@Injectable()
export class CoinbaseService {
  private cdp: CdpClient;

  constructor() {
    this.cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
    });
  }

  // ✅ ADMIN UNIQUEMENT : invokeContract avec Master Wallet
  async invokeContract(params: {
    contractAddress: string;
    method: string;
    args: any[];
    abi: any[];
  }) {
    const masterWallet = await this.getMasterWallet();
    return await this.cdp.evm.invokeContract({ ... });
  }
}
```

#### `src/modules/nft/services/nft-admin.service.ts` ✅
```typescript
@Injectable()
export class NftAdminService {
  // ✅ Mint (ADMIN uniquement)
  async mintNFT(tokenId, metadataUri) {
    return await this.coinbaseService.invokeContract({
      contractAddress: BLOCKCHAIN_CONFIG.nftContract,
      method: 'mint',
      args: [recipient, tokenId, metadataUri],
    });
  }

  // ✅ Burn (ADMIN uniquement)
  async burnNFT(tokenId) { ... }

  // ✅ Whitelist (ADMIN uniquement)
  async setTransferWhitelist(addresses, allowed) { ... }
}
```

---

## 🔐 Sécurité

### ✅ Backend (Vérifications)
- ✅ Vérifie que le buyer existe et a un Smart Account
- ✅ Vérifie que le listing est actif
- ✅ Vérifie que le seller existe
- ✅ Vérifie que le buyer n'achète pas son propre NFT
- ✅ Calcule le prix exact (évite manipulation)

### ✅ Smart Contracts (On-chain)
- ✅ `transferFrom` nécessite `approve` préalable
- ✅ `buyNFT` vérifie que le seller est propriétaire
- ✅ `onlyWhitelisted` pour les transfers NFT
- ✅ Marketplace est dans la whitelist

### ✅ Frontend (Embedded Wallet)
- ✅ User signe explicitement la UserOperation
- ✅ CDP Hooks gère la sécurité de la signature
- ✅ Pas de private key exposée

---

## ⚡ Performance & Coûts

### Gas Sponsorship
- ✅ USDC transfers : **$0 gas** (sponsorisé par CDP Paymaster)
- ✅ NFT transfer : **$0 gas** (sponsorisé par CDP Paymaster)
- ✅ Total user : **$0 gas** (uniquement prix NFT + 5% fees)

### Embedded Wallet Operations
- **Sign UserOperation** : 1 wallet operation = $0.005
- **Broadcast UserOperation** : 1 wallet operation = $0.005
- **Total par achat** : 2 wallet operations = **$0.01**

### Gas Fees (Payés par CyLimit via Paymaster)
- **USDC transfers** : ~50,000 gas
- **NFT transfer** : ~60,000 gas
- **Total** : ~110,000 gas = **~$0.001 sur Base**

---

## 🔄 Flow Complet : Acheter un NFT

### Étape 1 : Backend Prépare (Vérifications)
```
Frontend → POST /marketplace/buy/:listingId
          ↓
Backend vérifications :
  - Buyer existe ?
  - Listing actif ?
  - Seller existe ?
  - Buyer ≠ Seller ?
          ↓
Backend répond : { seller, buyer, price, fees, contracts }
```

### Étape 2 : Frontend Envoie UserOperation
```
Frontend construit calls :
  1. transferFrom(USDC, buyer → seller)
  2. transferFrom(USDC, buyer → CyLimit)
  3. buyNFT(tokenId, seller)
          ↓
useSendUserOperation() :
  - User signe (CDP Hooks)
  - Envoie au Bundler
  - Paymaster sponsorise gas
          ↓
Frontend reçoit : { userOperationHash, transactionHash }
```

### Étape 3 : Frontend Confirme au Backend
```
Frontend → POST /marketplace/confirm-buy
           { listingId, transactionHash }
          ↓
Backend met à jour DB :
  - listing.status = 'sold'
  - nft.ownerId = buyerId
          ↓
Backend répond : { success, txHash, explorerUrl }
```

---

## 🎯 Avantages de cette Architecture

1. ✅ **Simplicité** : Backend gère uniquement la logique métier
2. ✅ **Sécurité** : Pas de private key côté backend pour users
3. ✅ **UX** : User signe 1 fois, tout est géré par CDP
4. ✅ **Performance** : Batch transaction atomic (3 calls en 1)
5. ✅ **Coûts** : $0 gas pour le user ($0.01 wallet ops)
6. ✅ **Maintenabilité** : Code clair, séparation admin/user

---

## ❌ Erreurs Corrigées

### ❌ Ancienne Architecture (Incorrecte)
```
Frontend → Backend prépare UserOp → Frontend signe → Backend finalise
```

**Problèmes** :
- ❌ Backend ne peut pas gérer Smart Accounts créés par Embedded Wallets
- ❌ CDP SDK v2 Server Wallet != Embedded Wallets
- ❌ Complexité inutile (JWT, REST API, polling)
- ❌ Erreurs TypeScript insurmontables

### ✅ Architecture Correcte (Actuelle)
```
Frontend → Backend (vérifications) → Frontend envoie UserOp → Backend (confirm DB)
```

**Avantages** :
- ✅ Utilise `@coinbase/cdp-hooks` (solution officielle)
- ✅ Backend simplifié (pas de CDP SDK pour users)
- ✅ Pas d'erreurs TypeScript
- ✅ Architecture recommandée par Coinbase

---

## 📝 Prochaines Étapes (Tests)

### Test 3 : Lister un NFT ⏳
```bash
POST /marketplace/list
{
  "nftId": "...",
  "priceUSDC": 100
}

Expected:
- ✅ Listing créé en DB
- ✅ $0 gas
- ✅ Instantané
```

### Test 4 : Acheter un NFT ⏳
```bash
# 1. Préparer
POST /marketplace/buy/:listingId

# 2. Frontend envoie UserOperation
useSendUserOperation({ network, calls, useCdpPaymaster: true })

# 3. Confirmer
POST /marketplace/confirm-buy
{ listingId, transactionHash }

Expected:
- ✅ Batch transaction (3 calls)
- ✅ Gas sponsorisé ($0 pour user)
- ✅ NFT transféré
- ✅ DB mise à jour
```

### Test 5 : Frontend End-to-End ⏳
```bash
1. Login → Embedded Wallet créée
2. List NFT → DB uniquement
3. Buy NFT → UserOperation + confirmation
4. Vérifier propriété NFT
```

---

## 📊 Récapitulatif

| Fonctionnalité | Statut | Fichiers |
|----------------|--------|----------|
| Config Blockchain (Frontend) | ✅ | `blockchain.config.ts` |
| Config Blockchain (Backend User) | ✅ | `blockchain.config.ts` |
| Config Blockchain (Backend Admin) | ✅ | `blockchain.config.ts` |
| Hook `useCoinbaseWallet` | ✅ | `useCoinbaseWallet.ts` |
| Hook `useMarketplace` | ✅ | `useMarketplace.ts` |
| Service Marketplace (User) | ✅ | `marketplace.service.ts` |
| Controller Marketplace (User) | ✅ | `marketplace.controller.ts` |
| Service Coinbase (User) | ✅ | `coinbase.service.ts` (simplifié) |
| Service Coinbase (Admin) | ✅ | `coinbase.service.ts` (Master Wallet) |
| Service NFT Admin | ✅ | `nft-admin.service.ts` |
| TypeScript Errors | ✅ | 0 erreurs |
| Documentation | ✅ | `FLOW-SIGNATURE-USEROPERATION.md` |

---

## 🚀 Conclusion

✅ **Phase 8 : 100% Complétée**

L'architecture est maintenant **correcte**, **simple**, et **conforme** à la documentation Coinbase Developer Platform.

**Points clés** :
1. ✅ Frontend utilise `@coinbase/cdp-hooks` directement
2. ✅ Backend user = logique métier uniquement (pas de CDP SDK)
3. ✅ Backend admin = Master Wallet (invokeContract)
4. ✅ $0 gas pour les users (CDP Paymaster)
5. ✅ Batch transactions (3 calls en 1)
6. ✅ 0 erreurs TypeScript

**Prêt pour les tests !** 🎉

---

**Date de mise à jour** : 2025-10-21  
**Version** : 3.0 (Architecture finale avec Embedded Wallets)

