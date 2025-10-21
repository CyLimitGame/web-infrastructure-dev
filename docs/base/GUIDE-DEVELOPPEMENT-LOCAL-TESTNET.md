# 🏗️ GUIDE DÉVELOPPEMENT LOCAL (avec Testnet Base Sepolia)

**Date :** 21 Octobre 2025  
**Status :** 📋 GUIDE COMPLET  
**Objectif :** Développer en local comme si c'était la prod, mais en utilisant le testnet

---

## 🎯 PRINCIPE ARCHITECTURE

**On développe TOUT comme pour la production**, mais avec une **variable d'environnement** qui switch entre testnet/mainnet :

```typescript
// config/blockchain.config.ts
const isProduction = process.env.NODE_ENV === 'production';

export const BLOCKCHAIN_CONFIG = {
  network: isProduction ? 'base-mainnet' : 'base-sepolia',
  rpcUrl: isProduction 
    ? process.env.BASE_RPC_URL 
    : process.env.BASE_SEPOLIA_RPC_URL,
  nftContract: isProduction
    ? process.env.NFT_V2_CONTRACT_ADDRESS
    : process.env.TESTNET_NFT_V2_CONTRACT_ADDRESS,
  marketplaceContract: isProduction
    ? process.env.MARKETPLACE_V2_CONTRACT_ADDRESS
    : process.env.TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS,
  usdcContract: isProduction
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC Base Mainnet
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
};
```

**Résultat :**
- ✅ En **développement local** : utilise Base Sepolia (testnet)
- ✅ En **production** : utilise Base Mainnet
- ✅ **Même code** pour les deux !

---

## 📋 PHASES À DÉVELOPPER

### **Phase 5 : Configuration Paymaster** (2 heures)
### **Phase 6 : Backend Services** (2 jours)
### **Phase 7 : Frontend** (3 jours)
### **Phase 8 : Tests Production** (2 jours)

---

## 🔧 PHASE 5 : CONFIGURATION PAYMASTER (CDP)

### **Objectif**
Configurer le Paymaster Coinbase pour **sponsoriser le gas** des transactions users.

### **5.1 Activer Paymaster sur CDP Portal**

1. Va sur https://portal.cdp.coinbase.com/
2. **Paymaster** → **Configuration**
3. **Network** : Base Sepolia (testnet)
4. **Enable Paymaster** : ✅

### **5.2 Allowlist les contrats et fonctions**

**Contrats à allowlist :**

```bash
# NFT Contract (testnet)
0x012ab34A520638C0aA876252161c6039343741A4

Functions allowlistées :
- transferFrom(address,address,uint256)
- safeTransferFrom(address,address,uint256)
- setApprovalForAll(address,bool)
- approve(address,uint256)

# Marketplace Contract (testnet) - À DÉPLOYER
0x... (à compléter après déploiement)

Functions allowlistées :
- escrowUSDC(uint256)
- buyNFT(uint256,address)
- buyMultipleNFTs(uint256[],address[])

# USDC Contract (testnet)
0x036CbD53842c5426634e7929541eC2318f3dCF7e

Functions allowlistées :
- transfer(address,uint256)
- transferFrom(address,address,uint256)
- approve(address,uint256)
```

### **5.3 Configurer les limites**

```bash
Global Limit : $100/mois (testnet)
Per-User Limit : $5/mois (testnet)
```

### **5.4 Obtenir le Paymaster URL**

```bash
# Testnet
PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...

# Mainnet (plus tard)
PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/...
```

### **5.5 Ajouter dans .env**

```bash
# ═══════════════════════════════════════════════════════════════════════
# PAYMASTER (Gas Sponsoring)
# ═══════════════════════════════════════════════════════════════════════

# Testnet (développement)
PAYMASTER_URL_TESTNET=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...

# Mainnet (production)
PAYMASTER_URL_MAINNET=https://api.developer.coinbase.com/rpc/v1/base/...
```

---

## 💻 PHASE 6 : BACKEND SERVICES (2 jours)

### **Architecture**

```
cylimit-admin-backend/
├── src/
│   ├── config/
│   │   ├── blockchain.config.ts         ← Config testnet/mainnet
│   │   └── paymaster.config.ts          ← Config Paymaster
│   ├── modules/
│   │   ├── coinbase/                    ← CDP SDK v2
│   │   │   ├── coinbase.service.ts
│   │   │   └── coinbase.module.ts
│   │   ├── marketplace/                 ← Marketplace logic
│   │   │   ├── marketplace.service.ts
│   │   │   ├── marketplace.controller.ts
│   │   │   └── marketplace.module.ts
│   │   ├── nft/                         ← NFT operations
│   │   │   ├── nft.service.ts
│   │   │   └── nft.module.ts
│   │   └── migration/                   ← User migration
│   │       ├── migration.service.ts
│   │       └── migration.module.ts
```

### **6.1 Configuration Blockchain**

**Fichier :** `src/config/blockchain.config.ts`

```typescript
/**
 * OBJECTIF : Configuration blockchain (testnet en dev, mainnet en prod)
 * 
 * POURQUOI :
 * - Permet de développer en local avec testnet
 * - Switch automatique vers mainnet en production
 * - Même code pour les deux environnements
 * 
 * COMMENT :
 * - Utilise NODE_ENV pour déterminer l'environnement
 * - Exporte les bonnes addresses selon l'environnement
 */

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = !isProduction;

export const BLOCKCHAIN_CONFIG = {
  // Network
  network: isProduction ? 'base-mainnet' : 'base-sepolia',
  chainId: isProduction ? 8453 : 84532,
  
  // RPC URLs
  rpcUrl: isProduction 
    ? process.env.BASE_RPC_URL 
    : process.env.BASE_SEPOLIA_RPC_URL,
  
  // Contracts NFT
  nftContract: isProduction
    ? process.env.NFT_V2_CONTRACT_ADDRESS
    : process.env.TESTNET_NFT_V2_CONTRACT_ADDRESS,
  
  // Contracts Marketplace
  marketplaceContract: isProduction
    ? process.env.MARKETPLACE_V2_CONTRACT_ADDRESS
    : process.env.TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS,
  
  // USDC Contract
  usdcContract: isProduction
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC Base Mainnet
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
  
  // Master Wallet
  masterWalletAddress: process.env.MASTER_WALLET_ADDRESS,
  
  // Paymaster
  paymasterUrl: isProduction
    ? process.env.PAYMASTER_URL_MAINNET
    : process.env.PAYMASTER_URL_TESTNET,
  
  // Block Explorer
  explorerUrl: isProduction
    ? 'https://basescan.org'
    : 'https://sepolia.basescan.org',
};

// Helper functions
export const getContractUrl = (address: string) => {
  return `${BLOCKCHAIN_CONFIG.explorerUrl}/address/${address}`;
};

export const getTxUrl = (txHash: string) => {
  return `${BLOCKCHAIN_CONFIG.explorerUrl}/tx/${txHash}`;
};

// Log la configuration au démarrage
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log(`║   BLOCKCHAIN CONFIG - ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}   ║`);
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`Network           : ${BLOCKCHAIN_CONFIG.network}`);
console.log(`Chain ID          : ${BLOCKCHAIN_CONFIG.chainId}`);
console.log(`NFT Contract      : ${BLOCKCHAIN_CONFIG.nftContract}`);
console.log(`Marketplace       : ${BLOCKCHAIN_CONFIG.marketplaceContract}`);
console.log(`USDC              : ${BLOCKCHAIN_CONFIG.usdcContract}`);
console.log(`Paymaster         : ${BLOCKCHAIN_CONFIG.paymasterUrl ? 'Enabled ✅' : 'Disabled ❌'}`);
console.log(`Explorer          : ${BLOCKCHAIN_CONFIG.explorerUrl}\n`);
```

### **6.2 Service Coinbase (CDP SDK v2)**

**Fichier :** `src/modules/coinbase/coinbase.service.ts`

```typescript
/**
 * OBJECTIF : Service pour interagir avec CDP SDK v2
 * 
 * POURQUOI :
 * - Centraliser toutes les interactions blockchain
 * - Utiliser CDP SDK v2 exclusivement
 * - Gérer le gas sponsoring via Paymaster
 * 
 * COMMENT :
 * - Initialise CDP Client v2
 * - Fournit des méthodes pour appeler les smart contracts
 * - Utilise viem pour encoder les calls
 * 
 * APPELÉ DEPUIS :
 * - MarketplaceService
 * - NFTService
 * - MigrationService
 * 
 * APPELLE :
 * - CDP SDK v2 (sendTransaction)
 * - Smart contracts (NFT, Marketplace, USDC)
 */

import { Injectable } from '@nestjs/common';
import { CdpClient } from '@coinbase/cdp-sdk';
import { encodeFunctionData } from 'viem';
import { BLOCKCHAIN_CONFIG } from '../../config/blockchain.config';

@Injectable()
export class CoinbaseService {
  private cdp: CdpClient;

  constructor() {
    // CDP SDK v2 charge automatiquement les env vars
    this.cdp = new CdpClient();
  }

  /**
   * Get Master Server Account
   */
  async getMasterAccount() {
    return await this.cdp.evm.getOrCreateAccount({
      name: 'MasterWalletCyLimitBase'
    });
  }

  /**
   * Send a transaction via CDP v2
   * @param accountName - Nom du compte CDP
   * @param to - Adresse du contrat
   * @param data - Data encodée (via viem)
   * @param value - Valeur en wei (optionnel)
   */
  async sendTransaction(params: {
    accountName: string;
    to: string;
    data: string;
    value?: bigint;
  }) {
    const account = await this.cdp.evm.getOrCreateAccount({
      name: params.accountName
    });

    const result = await this.cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: params.to,
        data: params.data,
        value: params.value
      },
      network: BLOCKCHAIN_CONFIG.network
    });

    return {
      transactionHash: result.transactionHash,
      explorerUrl: `${BLOCKCHAIN_CONFIG.explorerUrl}/tx/${result.transactionHash}`
    };
  }

  /**
   * Invoke a contract function
   * @param contractAddress - Adresse du contrat
   * @param abi - ABI du contrat
   * @param functionName - Nom de la fonction
   * @param args - Arguments de la fonction
   */
  async invokeContract(params: {
    accountName: string;
    contractAddress: string;
    abi: any[];
    functionName: string;
    args: any[];
  }) {
    // Encoder le call avec viem
    const callData = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args
    });

    // Envoyer via CDP v2
    return await this.sendTransaction({
      accountName: params.accountName,
      to: params.contractAddress,
      data: callData
    });
  }

  /**
   * Mint NFT (Master Wallet uniquement)
   */
  async mintNFT(params: {
    to: string;
    tokenURI: string;
  }) {
    const NFT_ABI = [
      {
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "tokenURI", "type": "string" }
        ],
        "name": "mint",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    return await this.invokeContract({
      accountName: 'MasterWalletCyLimitBase',
      contractAddress: BLOCKCHAIN_CONFIG.nftContract,
      abi: NFT_ABI,
      functionName: 'mint',
      args: [params.to, params.tokenURI]
    });
  }

  /**
   * Transfer NFT (whitelisted addresses only)
   */
  async transferNFT(params: {
    from: string;
    to: string;
    tokenId: number;
  }) {
    const NFT_ABI = [
      {
        "inputs": [
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "tokenId", "type": "uint256" }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    return await this.invokeContract({
      accountName: 'MasterWalletCyLimitBase',
      contractAddress: BLOCKCHAIN_CONFIG.nftContract,
      abi: NFT_ABI,
      functionName: 'safeTransferFrom',
      args: [params.from, params.to, params.tokenId]
    });
  }
}
```

### **6.3 Service Marketplace**

**Fichier :** `src/modules/marketplace/marketplace.service.ts`

```typescript
/**
 * OBJECTIF : Gérer les opérations du marketplace (listings, achats, offers)
 * 
 * POURQUOI :
 * - Centraliser la logique marketplace
 * - Gérer les listings en DB (gratuit)
 * - Orchestrer les batch transactions
 * 
 * COMMENT :
 * - Listings stockés en MongoDB ($0 gas)
 * - Achats via batch transaction (USDC + NFT)
 * - Gas sponsorisé via Paymaster
 * 
 * APPELÉ DEPUIS :
 * - MarketplaceController (API endpoints)
 * - Frontend (via HTTP)
 * 
 * APPELLE :
 * - CoinbaseService (blockchain calls)
 * - MongoDB (listings, offers)
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoinbaseService } from '../coinbase/coinbase.service';
import { BLOCKCHAIN_CONFIG } from '../../config/blockchain.config';
import { encodeFunctionData } from 'viem';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel('Listing') private listingModel: Model<any>,
    @InjectModel('NFT') private nftModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private coinbaseService: CoinbaseService,
  ) {}

  /**
   * List NFT on marketplace (DB only, $0 gas)
   */
  async listNFT(params: {
    userId: string;
    nftId: string;
    priceUSDC: number;
  }) {
    const user = await this.userModel.findById(params.userId);
    const nft = await this.nftModel.findById(params.nftId);

    if (!nft || nft.ownerId.toString() !== params.userId) {
      throw new Error('NFT not owned by user');
    }

    // Vérifier que le user a approuvé le Marketplace
    // TODO: Vérifier isApprovedForAll on-chain

    // Créer listing en DB uniquement (pas de blockchain)
    const listing = await this.listingModel.create({
      nftId: params.nftId,
      sellerId: params.userId,
      price: params.priceUSDC,
      status: 'active',
      createdAt: new Date()
    });

    console.log(`✅ NFT listé en DB (Gas: $0)`);

    return {
      success: true,
      listingId: listing._id,
      message: 'NFT listed successfully (no gas cost)'
    };
  }

  /**
   * Buy NFT (batch transaction: USDC + NFT)
   */
  async buyNFT(params: {
    userId: string;
    listingId: string;
  }) {
    const buyer = await this.userModel.findById(params.userId);
    const listing = await this.listingModel.findById(params.listingId)
      .populate('nftId');

    if (listing.status !== 'active') {
      throw new Error('Listing not active');
    }

    const seller = await this.userModel.findById(listing.sellerId);
    const nft = listing.nftId;
    const price = listing.price;
    const fees = price * 0.05; // 5% fees CyLimit

    console.log(`🛒 Achat NFT #${nft.tokenId} pour ${price} USDC`);

    // ABI USDC
    const ERC20_ABI = [
      {
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    // ABI Marketplace
    const MARKETPLACE_ABI = [
      {
        "inputs": [
          { "name": "tokenId", "type": "uint256" },
          { "name": "seller", "type": "address" }
        ],
        "name": "buyNFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    // Batch transaction (3 opérations atomiques)
    const batch = [
      // Op 1 : Transfer USDC → Seller
      {
        to: BLOCKCHAIN_CONFIG.usdcContract,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [seller.baseWalletAddress, BigInt(price * 1e6)]
        })
      },
      // Op 2 : Transfer fees → CyLimit
      {
        to: BLOCKCHAIN_CONFIG.usdcContract,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [BLOCKCHAIN_CONFIG.masterWalletAddress, BigInt(fees * 1e6)]
        })
      },
      // Op 3 : Buy NFT
      {
        to: BLOCKCHAIN_CONFIG.marketplaceContract,
        data: encodeFunctionData({
          abi: MARKETPLACE_ABI,
          functionName: 'buyNFT',
          args: [nft.tokenId, seller.baseWalletAddress]
        })
      }
    ];

    // TODO: Envoyer batch via CDP v2 avec Paymaster
    // Pour l'instant, on simule
    console.log(`📦 Batch transaction préparée (${batch.length} ops)`);
    console.log(`⛽ Gas: $0 (sponsorisé par Paymaster)`);

    // Update DB
    listing.status = 'sold';
    listing.buyerId = params.userId;
    listing.soldAt = new Date();
    await listing.save();

    nft.ownerId = params.userId;
    await nft.save();

    return {
      success: true,
      txHash: '0x...', // TODO: Real tx hash
      explorerUrl: 'https://sepolia.basescan.org/tx/0x...',
      message: 'NFT purchased successfully (gas sponsored)'
    };
  }
}
```

---

## 🎨 PHASE 7 : FRONTEND (3 jours)

### **Architecture Frontend**

```
cylimit-admin-frontend/ (ou cylimit-frontend-develop/)
├── src/
│   ├── config/
│   │   └── blockchain.config.ts         ← Config testnet/mainnet
│   ├── hooks/
│   │   ├── useBlockchain.ts             ← Hook pour blockchain calls
│   │   └── useMarketplace.ts            ← Hook marketplace
│   ├── features/
│   │   ├── marketplace/
│   │   │   ├── ListNFT.tsx
│   │   │   ├── BuyNFT.tsx
│   │   │   └── MyListings.tsx
│   │   └── nft/
│   │       ├── NFTCard.tsx
│   │       └── NFTDetails.tsx
```

### **7.1 Configuration Blockchain Frontend**

**Fichier :** `src/config/blockchain.config.ts`

```typescript
/**
 * OBJECTIF : Configuration blockchain frontend (testnet en dev, mainnet en prod)
 * 
 * POURQUOI :
 * - Même principe que le backend
 * - Switch automatique selon l'environnement
 * 
 * COMMENT :
 * - Utilise NEXT_PUBLIC_ENV ou process.env.NODE_ENV
 */

const isProduction = process.env.NEXT_PUBLIC_ENV === 'production';

export const BLOCKCHAIN_CONFIG = {
  network: isProduction ? 'base-mainnet' : 'base-sepolia',
  chainId: isProduction ? 8453 : 84532,
  
  nftContract: isProduction
    ? process.env.NEXT_PUBLIC_NFT_CONTRACT
    : process.env.NEXT_PUBLIC_TESTNET_NFT_CONTRACT,
  
  marketplaceContract: isProduction
    ? process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT
    : process.env.NEXT_PUBLIC_TESTNET_MARKETPLACE_CONTRACT,
  
  usdcContract: isProduction
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  explorerUrl: isProduction
    ? 'https://basescan.org'
    : 'https://sepolia.basescan.org',
};

// Log en développement
if (!isProduction) {
  console.log('🔧 Development Mode - Using Base Sepolia Testnet');
  console.log('NFT Contract:', BLOCKCHAIN_CONFIG.nftContract);
  console.log('Marketplace:', BLOCKCHAIN_CONFIG.marketplaceContract);
}
```

### **7.2 Variables d'environnement Frontend**

**Fichier :** `.env.local` (développement)

```bash
# Environment
NEXT_PUBLIC_ENV=development

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Blockchain (Testnet)
NEXT_PUBLIC_TESTNET_NFT_CONTRACT=0x012ab34A520638C0aA876252161c6039343741A4
NEXT_PUBLIC_TESTNET_MARKETPLACE_CONTRACT=0x... (à compléter)
```

**Fichier :** `.env.production` (production)

```bash
# Environment
NEXT_PUBLIC_ENV=production

# Backend API
NEXT_PUBLIC_API_URL=https://api.cylimit.com

# Blockchain (Mainnet)
NEXT_PUBLIC_NFT_CONTRACT=0x... (à compléter après déploiement mainnet)
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x... (à compléter après déploiement mainnet)
```

### **7.3 Hook useMarketplace**

**Fichier :** `src/hooks/useMarketplace.ts`

```typescript
/**
 * OBJECTIF : Hook React pour interagir avec le marketplace
 * 
 * POURQUOI :
 * - Centraliser les calls marketplace
 * - Gérer le loading/error state
 * - Réutilisable dans tous les composants
 * 
 * COMMENT :
 * - Appelle l'API backend
 * - Backend gère la blockchain
 * 
 * APPELÉ DEPUIS :
 * - ListNFT.tsx
 * - BuyNFT.tsx
 * - MyListings.tsx
 */

import { useState } from 'react';
import axios from 'axios';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useMarketplace = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List NFT on marketplace
   */
  const listNFT = async (params: {
    nftId: string;
    priceUSDC: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/marketplace/list`, params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to list NFT');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buy NFT from listing
   */
  const buyNFT = async (listingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/marketplace/buy/${listingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to buy NFT');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get my listings
   */
  const getMyListings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch listings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    listNFT,
    buyNFT,
    getMyListings,
    loading,
    error
  };
};
```

### **7.4 Composant ListNFT**

**Fichier :** `src/features/marketplace/ListNFT.tsx`

```typescript
/**
 * OBJECTIF : Formulaire pour lister un NFT sur le marketplace
 * 
 * POURQUOI :
 * - Permettre aux users de vendre leurs NFTs
 * - Interface simple et intuitive
 * 
 * COMMENT :
 * - Formulaire avec prix en USDC
 * - Appelle useMarketplace.listNFT()
 * - Affiche le statut (loading, success, error)
 * 
 * APPELÉ DEPUIS :
 * - Page NFT Details
 * - Page My NFTs
 */

import { useState } from 'react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { BLOCKCHAIN_CONFIG } from '../../config/blockchain.config';

interface ListNFTProps {
  nftId: string;
  onSuccess?: () => void;
}

export const ListNFT: React.FC<ListNFTProps> = ({ nftId, onSuccess }) => {
  const [price, setPrice] = useState('');
  const { listNFT, loading, error } = useMarketplace();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    try {
      await listNFT({
        nftId,
        priceUSDC: parseFloat(price)
      });

      setSuccess(true);
      setPrice('');
      onSuccess?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">List NFT for Sale</h2>

      {!BLOCKCHAIN_CONFIG.network.includes('mainnet') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            🔧 Development Mode - Using <strong>Base Sepolia Testnet</strong>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter price in USDC"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            ⛽ Listing is FREE (stored in database, no gas cost)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-sm text-green-800">
              ✅ NFT listed successfully! No gas cost.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !price}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? 'Listing...' : 'List NFT for Sale'}
        </button>
      </form>
    </div>
  );
};
```

### **7.5 Composant BuyNFT**

**Fichier :** `src/features/marketplace/BuyNFT.tsx`

```typescript
/**
 * OBJECTIF : Bouton pour acheter un NFT listé
 * 
 * POURQUOI :
 * - Permettre aux users d'acheter des NFTs
 * - Afficher le prix et les fees
 * 
 * COMMENT :
 * - Bouton "Buy Now"
 * - Appelle useMarketplace.buyNFT()
 * - Affiche transaction en cours et résultat
 */

import { useState } from 'react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { BLOCKCHAIN_CONFIG } from '../../config/blockchain.config';

interface BuyNFTProps {
  listingId: string;
  price: number;
  nftName: string;
  onSuccess?: () => void;
}

export const BuyNFT: React.FC<BuyNFTProps> = ({ 
  listingId, 
  price, 
  nftName, 
  onSuccess 
}) => {
  const { buyNFT, loading, error } = useMarketplace();
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fees = price * 0.05; // 5% fees
  const total = price + fees;

  const handleBuy = async () => {
    setSuccess(false);
    setTxHash(null);

    try {
      const result = await buyNFT(listingId);
      setSuccess(true);
      setTxHash(result.txHash);
      onSuccess?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Buy {nftName}</h2>

      {!BLOCKCHAIN_CONFIG.network.includes('mainnet') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            🔧 Development Mode - Using <strong>Base Sepolia Testnet</strong>
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Price</span>
          <span className="font-medium">{price} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fees (5%)</span>
          <span className="font-medium">{fees.toFixed(2)} USDC</span>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="font-bold">Total</span>
          <span className="font-bold text-lg">{total.toFixed(2)} USDC</span>
        </div>
        <div className="text-xs text-green-600">
          ⛽ Gas sponsored by CyLimit ($0 for you!)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && txHash && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-sm text-green-800 mb-2">
            ✅ NFT purchased successfully!
          </p>
          <a
            href={`${BLOCKCHAIN_CONFIG.explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View transaction →
          </a>
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? 'Processing...' : `Buy Now for ${total.toFixed(2)} USDC`}
      </button>
    </div>
  );
};
```

---

## 🧪 PHASE 8 : TESTS EN LOCAL (2 jours)

### **8.1 Setup environnement de test**

**Fichier :** `cylimit-admin-backend/.env.test`

```bash
# ═══════════════════════════════════════════════════════════════════════
# ENVIRONNEMENT DE TEST (LOCAL avec Testnet Base Sepolia)
# ═══════════════════════════════════════════════════════════════════════

NODE_ENV=development

# MongoDB (local)
MONGODB_URI=mongodb://localhost:27017/cylimit-test

# Blockchain (Testnet Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
TESTNET_NFT_V2_CONTRACT_ADDRESS=0x012ab34A520638C0aA876252161c6039343741A4
TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS=0x... (à compléter)

# USDC Testnet
USDC_TESTNET_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Master Wallet
MASTER_WALLET_ADDRESS=0x214FB13515453265713E408D59f1819474F1f873

# CDP API Keys
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...

# Paymaster (Testnet)
PAYMASTER_URL_TESTNET=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...
```

### **8.2 Plan de Tests**

#### **Test 1 : Vérifier configuration blockchain**

```bash
# Démarrer le backend en mode test
cd cylimit-admin-backend
npm run start:dev

# Vérifier les logs
# Tu devrais voir :
# ╔════════════════════════════════════════════════════════════╗
# ║   BLOCKCHAIN CONFIG - DEVELOPMENT                          ║
# ╚════════════════════════════════════════════════════════════╝
# Network           : base-sepolia
# Chain ID          : 84532
# NFT Contract      : 0x012ab34A520638C0aA876252161c6039343741A4
# ...
```

#### **Test 2 : Lire les NFTs mintés sur testnet**

```bash
# Script de test
node scripts/base/testnet/3-read-nft-metadata.cjs
```

**Résultat attendu :**
```
✅ NFT #0
   Owner: 0x214FB13515453265713E408D59f1819474F1f873
   Token URI: ipfs://QmXxx...
   Metadata: { name: "...", image: "...", attributes: [...] }
```

#### **Test 3 : Lister un NFT sur le marketplace**

**Endpoint :** `POST /marketplace/list`

```json
{
  "nftId": "507f1f77bcf86cd799439011",
  "priceUSDC": 100
}
```

**Résultat attendu :**
```json
{
  "success": true,
  "listingId": "507f1f77bcf86cd799439012",
  "message": "NFT listed successfully (no gas cost)"
}
```

**Vérifications :**
- ✅ Listing créé en MongoDB
- ✅ Pas de transaction blockchain (gas $0)
- ✅ Status : `active`

#### **Test 4 : Acheter un NFT listé** (⚠️ Nécessite USDC testnet)

**Endpoint :** `POST /marketplace/buy/:listingId`

**Résultat attendu :**
```json
{
  "success": true,
  "txHash": "0x...",
  "explorerUrl": "https://sepolia.basescan.org/tx/0x...",
  "message": "NFT purchased successfully (gas sponsored)"
}
```

**Vérifications :**
- ✅ Transaction sur Basescan Sepolia
- ✅ USDC transféré (buyer → seller + fees)
- ✅ NFT transféré (seller → buyer)
- ✅ Gas sponsorisé ($0 pour le user)
- ✅ Listing status : `sold` en DB
- ✅ NFT ownerId mis à jour en DB

#### **Test 5 : Frontend end-to-end**

```bash
# Démarrer le frontend
cd cylimit-admin-frontend
npm run dev

# Ouvrir http://localhost:3000
```

**Scénario :**
1. Login avec compte test
2. Voir "🔧 Development Mode - Using Base Sepolia Testnet"
3. Aller sur "My NFTs"
4. Lister un NFT à 50 USDC
5. Voir le listing créé instantanément ($0 gas)
6. Avec un autre compte, acheter le NFT
7. Voir la transaction sur Basescan Sepolia
8. Vérifier que le NFT a changé de propriétaire

---

## ✅ CHECKLIST COMPLÈTE

### **Phase 5 : Paymaster**
- [ ] Activer Paymaster sur CDP Portal (testnet)
- [ ] Allowlist NFT Contract
- [ ] Allowlist Marketplace Contract
- [ ] Allowlist USDC Contract
- [ ] Configurer limites ($100/mois testnet)
- [ ] Obtenir Paymaster URL testnet
- [ ] Ajouter dans .env

### **Phase 6 : Backend**
- [ ] Créer `blockchain.config.ts`
- [ ] Créer `CoinbaseService` (CDP v2)
- [ ] Créer `MarketplaceService`
- [ ] Créer `NFTService`
- [ ] Endpoints API `/marketplace/list`
- [ ] Endpoints API `/marketplace/buy/:id`
- [ ] Endpoints API `/marketplace/my-listings`
- [ ] Tester avec Postman/Insomnia

### **Phase 7 : Frontend**
- [ ] Créer `blockchain.config.ts`
- [ ] Créer hook `useMarketplace`
- [ ] Variables .env.local (testnet)
- [ ] Composant `ListNFT`
- [ ] Composant `BuyNFT`
- [ ] Composant `MyListings`
- [ ] Banner "Development Mode"
- [ ] Tester en local

### **Phase 8 : Tests**
- [ ] Test 1 : Config blockchain
- [ ] Test 2 : Lire NFTs testnet
- [ ] Test 3 : Lister NFT (DB)
- [ ] Test 4 : Acheter NFT (blockchain)
- [ ] Test 5 : Frontend E2E
- [ ] Valider taux succès > 95%

---

## 🚀 PASSAGE EN PRODUCTION

**Quand tout fonctionne en local avec testnet :**

### **1. Déployer les contrats sur mainnet**

```bash
# Déployer NFT v2 sur Base Mainnet
# Déployer Marketplace v2 sur Base Mainnet
# ⚠️ VÉRIFIER IMMÉDIATEMENT sur Basescan (plugin Remix)
```

### **2. Mettre à jour .env.production**

```bash
NODE_ENV=production
NFT_V2_CONTRACT_ADDRESS=0x... (mainnet)
MARKETPLACE_V2_CONTRACT_ADDRESS=0x... (mainnet)
PAYMASTER_URL_MAINNET=https://api.developer.coinbase.com/rpc/v1/base/...
```

### **3. Tester sur mainnet** (avec 1 NFT réel)

- [ ] Mint 1 NFT de test
- [ ] Lister à 1 USDC
- [ ] Acheter avec compte test
- [ ] Vérifier transaction sur Basescan
- [ ] ✅ Si OK → Lancer migration complète

### **4. Migration complète**

- [ ] Mint 31,450 NFTs sur Base Mainnet
- [ ] Activer migration automatique users
- [ ] Monitorer logs et erreurs
- [ ] Support users

---

**🎉 C'est parti pour le développement ! Le guide est complet et prêt à être suivi ! 🚀**


