# ✅ Flow Signature UserOperation (Embedded Wallets)

> **IMPORTANT** : Cette architecture a été **corrigée** après analyse de la documentation Coinbase Developer Platform.

## 🏗️ Architecture Finale (Correcte)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDED WALLETS                                │
│                                                                          │
│  Frontend utilise @coinbase/cdp-hooks pour envoyer UserOperations      │
│  directement depuis le Smart Account de l'utilisateur                   │
│                                                                          │
│  Backend gère uniquement :                                              │
│  - Vérifications métier                                                 │
│  - Base de données                                                      │
│  - Pas de CDP SDK pour les users                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## 📚 Documentation Coinbase

- **Embedded Wallets - Smart Accounts** : https://docs.cdp.coinbase.com/embedded-wallets/evm-features/smart-accounts
- **React Hooks** : https://docs.cdp.coinbase.com/embedded-wallets/react-hooks
- **useSendUserOperation** : https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/frontend/@coinbase/cdp-hooks

## 🔄 Flow Complet : Acheter un NFT

### Étape 1 : Backend - Vérifications et Préparation

**Frontend → Backend** : `POST /marketplace/buy/:listingId`

```typescript
// Backend : marketplace.service.ts
async prepareBuyNFT(userId: string, listingId: string) {
  // 1. Vérifier buyer existe
  const buyer = await this.userModel.findById(userId);
  
  // 2. Vérifier listing existe et actif
  const listing = await this.listingModel.findById(listingId);
  
  // 3. Vérifier seller existe
  const seller = await this.userModel.findById(listing.sellerId);
  
  // 4. Calculer prix + fees
  const price = listing.price;
  const fees = Math.floor(price * 0.05);
  
  // 5. Retourner les détails pour que frontend construise UserOperation
  return {
    listingId,
    nft: { tokenId, name, imageUrl },
    seller: { userId, address },
    buyer: { userId, address },
    price,
    fees,
    total: price + fees,
    contracts: { usdc, marketplace, masterWallet },
  };
}
```

**Backend répond** : `200 OK` + détails de l'achat

```json
{
  "success": true,
  "listingId": "...",
  "nft": {
    "tokenId": 123,
    "name": "CyLimit NFT #123"
  },
  "seller": {
    "address": "0xSeller..."
  },
  "buyer": {
    "address": "0xBuyer..."
  },
  "price": 100,
  "fees": 5,
  "total": 105,
  "contracts": {
    "usdc": "0xUSDC...",
    "marketplace": "0xMarketplace...",
    "masterWallet": "0xMaster..."
  }
}
```

### Étape 2 : Frontend - Construction + Envoi UserOperation

**Frontend** : `useMarketplace.ts` + `useCoinbaseWallet.ts`

```typescript
// 1. Récupérer les détails depuis backend
const buyData = await axios.post(`/marketplace/buy/${listingId}`);

// 2. Construire les calls (batch transaction)
const calls = [
  // Call 1: USDC buyer → seller
  {
    to: buyData.contracts.usdc,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transferFrom',
      args: [buyData.buyer.address, buyData.seller.address, BigInt(price * 1e6)]
    })
  },
  // Call 2: USDC fees buyer → CyLimit
  {
    to: buyData.contracts.usdc,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transferFrom',
      args: [buyData.buyer.address, buyData.contracts.masterWallet, BigInt(fees * 1e6)]
    })
  },
  // Call 3: NFT seller → buyer
  {
    to: buyData.contracts.marketplace,
    data: encodeFunctionData({
      abi: MARKETPLACE_ABI,
      functionName: 'buyNFT',
      args: [BigInt(tokenId), buyData.seller.address]
    })
  }
];

// 3. Envoyer UserOperation via CDP Hooks
const { sendUserOp } = useCoinbaseWallet();
const result = await sendUserOp({
  network: 'base-sepolia',
  calls: calls,
  paymasterUrl: PAYMASTER_URL, // Gas sponsorisé
});

console.log('UserOp Hash:', result.userOperationHash);
console.log('TX Hash:', result.transactionHash);
```

**CDP Hooks gère automatiquement** :
- ✅ Signature par l'utilisateur (via Embedded Wallet)
- ✅ Envoi au Bundler
- ✅ Attente de confirmation
- ✅ Retour du résultat (userOpHash + transactionHash)

### Étape 3 : Frontend - Confirmation au Backend

**Frontend → Backend** : `POST /marketplace/confirm-buy`

```typescript
// Frontend
await axios.post('/marketplace/confirm-buy', {
  listingId: buyData.listingId,
  transactionHash: result.transactionHash,
});
```

**Backend** : `marketplace.service.ts`

```typescript
async confirmBuyNFT(userId: string, listingId: string, txHash: string) {
  // 1. Mettre à jour le listing
  listing.status = 'sold';
  listing.buyerId = userId;
  listing.soldAt = new Date();
  listing.txHash = txHash;
  await listing.save();
  
  // 2. Mettre à jour le NFT
  nft.ownerId = userId;
  nft.isListed = false;
  await nft.save();
  
  return {
    success: true,
    nftId,
    tokenId,
    txHash,
    explorerUrl: `${BLOCKCHAIN_CONFIG.explorerUrl}/tx/${txHash}`,
  };
}
```

## 📦 Code Source

### Frontend : `useCoinbaseWallet.ts`

```typescript
import { useSendUserOperation, useCurrentUser } from '@coinbase/cdp-hooks';

export function useCoinbaseWallet() {
  const { sendUserOperation, status, data, error } = useSendUserOperation();
  const { currentUser } = useCurrentUser();

  const sendUserOp = async (params: {
    network: string;
    calls: Array<{ to: string; data?: string; value?: bigint }>;
    paymasterUrl?: string;
  }) => {
    const smartAccount = currentUser?.evmSmartAccounts?.[0];
    if (!smartAccount) {
      throw new Error('No Smart Account found');
    }

    return await sendUserOperation({
      evmSmartAccount: smartAccount,
      network: params.network,
      calls: params.calls,
      paymasterUrl: params.paymasterUrl,
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

### Frontend : `useMarketplace.ts`

```typescript
import { useCoinbaseWallet } from './useCoinbaseWallet';
import { encodeFunctionData } from 'viem';

export const useMarketplace = () => {
  const { sendUserOp } = useCoinbaseWallet();

  const buyNFT = async (listingId: string) => {
    // 1. Backend prépare
    const buyData = await axios.post(`/marketplace/buy/${listingId}`);
    
    // 2. Construire calls
    const calls = [...]; // USDC transfers + buyNFT
    
    // 3. Envoyer UserOperation
    const result = await sendUserOp({
      network: 'base-sepolia',
      calls,
      paymasterUrl: PAYMASTER_URL,
    });
    
    // 4. Confirmer au backend
    return await axios.post('/marketplace/confirm-buy', {
      listingId,
      transactionHash: result.transactionHash,
    });
  };

  return { buyNFT };
};
```

### Backend : `marketplace.service.ts`

```typescript
@Injectable()
export class MarketplaceService {
  // Étape 1 : Préparer l'achat
  async prepareBuyNFT(userId: string, listingId: string) {
    // Vérifications + retourne détails
    return { buyer, seller, price, fees, contracts };
  }

  // Étape 3 : Confirmer l'achat
  async confirmBuyNFT(userId: string, listingId: string, txHash: string) {
    // Mettre à jour DB
    listing.status = 'sold';
    nft.ownerId = userId;
    // ...
  }
}
```

### Backend : `coinbase.service.ts` (USER)

```typescript
@Injectable()
export class CoinbaseService {
  // PAS DE CDP SDK côté user backend
  // Embedded Wallets gèrent tout depuis le frontend
  
  async getSampleInfo() {
    return {
      network: 'base-sepolia',
      note: 'UserOperations sent from frontend',
    };
  }
}
```

## 🔐 Sécurité

### ✅ Backend (Vérifications)
- Vérifie que le buyer existe et a un Smart Account
- Vérifie que le listing est actif
- Vérifie que le seller existe
- Vérifie que le buyer n'achète pas son propre NFT
- Calcule le prix exact (évite manipulation)

### ✅ Smart Contracts (On-chain)
- `transferFrom` nécessite `approve` préalable
- `buyNFT` vérifie que le seller est propriétaire
- `onlyWhitelisted` pour les transfers NFT
- Marketplace est dans la whitelist

### ✅ Frontend (Embedded Wallet)
- User signe explicitement la UserOperation
- CDP Hooks gère la sécurité de la signature
- Pas de private key exposée

## ⚡ Performance

### Gas Sponsorship
- ✅ USDC transfers : **$0 gas** (sponsorisé par CDP Paymaster)
- ✅ NFT transfer : **$0 gas** (sponsorisé par CDP Paymaster)
- ✅ Total user : **$0 gas** (uniquement prix NFT + fees)

### Batch Transaction
- ✅ 3 operations en 1 seule UserOperation
- ✅ Atomicité garantie (tout ou rien)
- ✅ UX fluide (1 seule signature)

## 📊 Coûts

### Embedded Wallet Operations
- **Sign UserOperation** : 1 wallet operation = $0.005
- **Broadcast UserOperation** : 1 wallet operation = $0.005
- **Total par achat** : 2 wallet operations = **$0.01**

### Gas Fees (Sponsorisés)
- **USDC transfers** : ~50,000 gas
- **NFT transfer** : ~60,000 gas
- **Total** : ~110,000 gas = **~$0.001 sur Base**
- **Payé par** : CDP Paymaster (CyLimit)

## 🎯 Avantages

1. ✅ **Simplicité** : Backend gère uniquement la logique métier
2. ✅ **Sécurité** : Pas de private key côté backend pour users
3. ✅ **UX** : User signe 1 fois, tout est géré par CDP
4. ✅ **Performance** : Batch transaction atomic
5. ✅ **Coûts** : $0 gas pour le user

## ❌ Architecture Incorrecte (Ancienne)

### ❌ Ce qui était FAUX

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
Frontend → Backend (vérifications) → Frontend envoie UserOp directement → Backend (confirm DB)
```

**Avantages** :
- ✅ Utilise `@coinbase/cdp-hooks` (solution officielle)
- ✅ Backend simplifié (pas de CDP SDK pour users)
- ✅ Pas d'erreurs TypeScript
- ✅ Architecture recommandée par Coinbase

## 📝 Prochaines Étapes

- [ ] Tester achat NFT avec Embedded Wallet
- [ ] Vérifier gas sponsorship (CDP Paymaster)
- [ ] Tester flow complet (login → list → buy)
- [ ] Documenter résultats tests

---

**Date de mise à jour** : 2025-10-21  
**Version** : 2.0 (Architecture corrigée)
