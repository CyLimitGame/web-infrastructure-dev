# 📚 Note Complète : Server Wallets v2 Coinbase CDP

**Date :** 7 octobre 2025  
**Source :** [docs.cdp.coinbase.com/server-wallets/v2](https://docs.cdp.coinbase.com/server-wallets/v2)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce qu'un Server Wallet v2 ?

Un **Server Wallet v2** est un portefeuille crypto **programmatique** géré côté backend, permettant aux développeurs de :
- ✅ Créer et gérer des comptes crypto **automatiquement** via API
- ✅ Signer des transactions **sans gérer les clés privées** (secured by Coinbase)
- ✅ Automatiser des paiements, fees, rewards, swaps
- ✅ Utiliser **un seul secret** pour tous les comptes (EVM + Solana)
- ✅ Support **multi-réseaux** (Ethereum, Polygon, Base, Solana)

**Différence avec Embedded Wallets** :
| Feature | Server Wallet v2 | Embedded Wallet |
|---------|------------------|-----------------|
| **Custody** | Developer | User |
| **Contrôle** | Backend API | Frontend UI + User auth |
| **Clés privées** | Secured by Coinbase (TEE) | User-controlled (exportables) |
| **Auth** | API Key + Wallet Secret | Email OTP / Social login |
| **Use case** | Automation, fees, rewards | User wallets, UX |
| **UI** | Aucune (backend only) | Components React intégrés |

---

## 🆚 Server Wallet v1 vs v2

| Feature              | v1 🔴    | v2 🟢 |
| -------------------- | -------- | ----- |
| **Sécurité**         | Complexe | Simplifiée (TEE) |
| **Clés privées**     | Developer-managed | Secured in AWS Nitro Enclave |
| **Auth**             | 1 secret par account | **1 seul secret** pour tous |
| **Support réseaux**  | EVM only | **EVM + Solana** |
| **EVM scope**        | 1 réseau EVM | **Multi-réseaux EVM** |
| **Transaction batching** | ❌ | ✅ |
| **Gas sponsorship**  | ❌ | ✅ |
| **Spend permissions** | ❌ | ✅ |
| **viem compatibility** | ❌ | ✅ |
| **Smart Accounts (ERC-4337)** | ❌ | ✅ |

**⚠️ IMPORTANT** : Pour CyLimit, on utilise **v2** !

---

## 🔐 Sécurité & Authentification

### Trusted Execution Environment (TEE)

Les **clés privées** sont **JAMAIS exposées** à personne (pas même Coinbase ou AWS) :
- ✅ Stockées dans **AWS Nitro Enclaves** (hardware-secured)
- ✅ Signature des transactions **dans le TEE** (isolated environment)
- ✅ Impossible d'extraire les clés du TEE

**Schéma simplifié** :

```
┌──────────────────────────────────────┐
│  TON BACKEND (NestJS)                │
│  - API Key                           │
│  - Wallet Secret                     │
└────────────┬─────────────────────────┘
             │ HTTPS API Call
             ▼
┌──────────────────────────────────────┐
│  COINBASE CDP API                    │
│  - Vérifie API Key                   │
│  - Vérifie Wallet Secret             │
└────────────┬─────────────────────────┘
             │ Authorized
             ▼
┌──────────────────────────────────────┐
│  AWS NITRO ENCLAVE (TEE)             │
│  🔒 Private Keys JAMAIS sorties      │
│  ✍️  Signature TX à l'intérieur      │
└────────────┬─────────────────────────┘
             │ Signed Transaction
             ▼
┌──────────────────────────────────────┐
│  BLOCKCHAIN (Base, Polygon, etc.)    │
│  - TX broadcastée                    │
└──────────────────────────────────────┘
```

### Authentification : 2 Secrets

Pour utiliser Server Wallet v2, tu as besoin de **2 secrets** :

#### 1. **CDP API Key** (Public + Private Key)

- **Format** : `organizations/{org_id}/apiKeys/{key_id}`
- **Où l'obtenir** : CDP Portal > API Keys > Create API Key
- **Utilisation** : Authentifier les requêtes API CDP

**Exemple** :
```bash
CDP_API_KEY_NAME=organizations/12345678-1234-1234-1234-123456789abc/apiKeys/87654321-4321-4321-4321-cba987654321
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEII...\n-----END EC PRIVATE KEY-----
```

#### 2. **Wallet Secret**

- **Format** : String opaque (ex: `A1B2C3D4E5F6...`)
- **Où l'obtenir** : CDP Portal > Server Wallets > Generate Wallet Secret
- **Utilisation** : Décrypter et signer les transactions avec les comptes

**⚠️ CRITIQUE** :
- **UN SEUL** Wallet Secret pour **TOUS** tes comptes (EVM + Solana)
- Si compromis, tu peux le **rotate** sans perdre les comptes

**Exemple** :
```bash
COINBASE_WALLET_SECRET=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6
```

### Rotation du Wallet Secret

Si ton secret est compromis :

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

// Rotate le secret
const newSecret = await cdp.rotateWalletSecret();
console.log('Nouveau secret:', newSecret);

// ⚠️ Mettre à jour COINBASE_WALLET_SECRET dans ton .env immédiatement
```

**Ce qui se passe** :
1. Ancien secret **invalide** immédiatement
2. Nouveau secret généré
3. Tous les comptes **restent accessibles** avec le nouveau secret

---

## 📦 Installation

### Packages NPM (PUBLICS ✅)

```bash
# Package principal
npm install @coinbase/cdp-sdk

# Si tu veux utiliser viem (recommandé)
npm install viem

# Si tu veux utiliser web3.py (Python)
pip install cdp-sdk
```

**Note importante** : Ces packages sont **publics** et disponibles sur npm/pypi !

---

## 🏗️ Configuration Backend (NestJS)

### Étape 1 : Variables d'environnement

**Fichier : `.env` (Backend)**

```bash
# CDP API Key (depuis CDP Portal)
COINBASE_API_KEY_NAME=organizations/12345678-1234-1234-1234-123456789abc/apiKeys/87654321-4321-4321-4321-cba987654321
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEII...\n-----END EC PRIVATE KEY-----"

# Wallet Secret (depuis CDP Portal)
COINBASE_WALLET_SECRET=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6

# Réseau par défaut (optionnel)
COINBASE_NETWORK=base-sepolia
```

### Étape 2 : Initialiser le client CDP

**Fichier : `coinbase-wallet.service.ts`**

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CdpClient } from '@coinbase/cdp-sdk';

@Injectable()
export class CoinbaseWalletService implements OnModuleInit {
  private readonly logger = new Logger(CoinbaseWalletService.name);
  private cdp: CdpClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Récupérer les credentials depuis .env
      const apiKeyName = this.configService.get<string>('COINBASE_API_KEY_NAME');
      const privateKey = this.configService.get<string>('COINBASE_API_KEY_PRIVATE_KEY');
      const walletSecret = this.configService.get<string>('COINBASE_WALLET_SECRET');

      // Initialiser le client CDP
      this.cdp = new CdpClient({
        apiKeyName,
        privateKey,
        walletSecret,
      });

      this.logger.log('✅ CDP Client initialisé avec succès');
    } catch (error) {
      this.logger.error('❌ Erreur initialisation CDP Client:', error);
      throw error;
    }
  }

  getCdpClient(): CdpClient {
    if (!this.cdp) {
      throw new Error('CDP Client non initialisé');
    }
    return this.cdp;
  }
}
```

---

## 💼 Types de Comptes Supportés

### 1. **EOA (Externally Owned Account)**

**C'est quoi ?**
- Compte crypto "classique" contrôlé par une clé privée
- Compatible avec **TOUS** les réseaux EVM (Ethereum, Polygon, Base, Arbitrum, etc.)

**Quand l'utiliser ?**
- ✅ Simple et rapide
- ✅ Compatible partout
- ✅ Pas de frais de déploiement

**Limites** :
- ❌ Pas de batch transactions
- ❌ Pas de gas sponsorship
- ❌ Pas de spend permissions

**Créer un EOA** :

```typescript
const account = await this.cdp.evm.createAccount({
  type: 'eoa', // Externally Owned Account
});

console.log('EOA créé:', account.address);
// Exemple: 0x3c0D84055994c3062819Ce8730869D0aDeA4c3Bf
```

### 2. **Smart Account (ERC-4337)** ⭐ RECOMMANDÉ

**C'est quoi ?**
- Compte crypto basé sur un **smart contract** (pas une clé privée)
- Implémente le standard **EIP-4337** (Account Abstraction)

**Avantages ÉNORMES** :
- ✅ **Batch transactions** : plusieurs TX dans une seule (atomique)
- ✅ **Gas sponsorship** : tu paies le gas pour l'user (UX++)
- ✅ **Spend permissions** : limiter les montants/destinataires
- ✅ **Policies** : règles custom (time-based, amount-based, etc.)
- ✅ **Sécurité renforcée** : recovery, multi-sig possible

**Réseaux supportés** :
- ✅ Base (Mainnet + Sepolia)
- ✅ Ethereum (Mainnet + Sepolia)
- ✅ Polygon (Mainnet + Amoy)
- ✅ Arbitrum
- ✅ Optimism
- ✅ Zora
- ✅ BNB Chain
- ✅ Avalanche

**⚠️ IMPORTANT** : Pour CyLimit, utilise **Smart Accounts** !

**Créer un Smart Account** :

```typescript
const account = await this.cdp.evm.createAccount({
  type: 'smart', // Smart Account (ERC-4337)
});

console.log('Smart Account créé:', account.address);
// Exemple: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
```

---

## 🚀 Opérations de Base

### 1. Créer un Compte

**EOA** :
```typescript
const eoaAccount = await this.cdp.evm.createAccount({
  type: 'eoa',
});
console.log('EOA:', eoaAccount.address);
```

**Smart Account** :
```typescript
const smartAccount = await this.cdp.evm.createAccount({
  type: 'smart',
});
console.log('Smart Account:', smartAccount.address);
```

### 2. Lister tous les Comptes

```typescript
const accounts = await this.cdp.evm.listAccounts();

accounts.forEach((account) => {
  console.log(`- ${account.address} (type: ${account.type})`);
});
```

### 3. Récupérer un Compte existant

```typescript
const account = await this.cdp.evm.getAccount({
  address: '0x3c0D84055994c3062819Ce8730869D0aDeA4c3Bf',
});

console.log('Account:', account);
```

### 4. Récupérer la Balance

```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Balance ETH (native)
const balanceWei = await publicClient.getBalance({
  address: account.address,
});
const balanceEth = Number(balanceWei) / 1e18;
console.log('Balance ETH:', balanceEth);

// Balance USDC (ERC-20)
const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC Base Sepolia
const usdcBalance = await publicClient.readContract({
  address: usdcAddress,
  abi: [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }],
    },
  ],
  functionName: 'balanceOf',
  args: [account.address],
});
const balanceUsdc = Number(usdcBalance) / 1e6; // USDC a 6 decimals
console.log('Balance USDC:', balanceUsdc);
```

### 5. Envoyer une Transaction (Simple)

**EOA - Envoyer ETH** :

```typescript
const txHash = await this.cdp.evm.sendTransaction({
  from: account.address,
  to: '0xDestinataireAddress...',
  value: 1000000000000000n, // 0.001 ETH (en wei)
  network: 'base-sepolia',
  chainId: 84532,
});

console.log('TX Hash:', txHash);
```

**Smart Account - Envoyer USDC** :

```typescript
import { encodeFunctionData } from 'viem';

const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Encoder l'appel à transfer(address,uint256)
const data = encodeFunctionData({
  abi: [
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: 'success', type: 'bool' }],
    },
  ],
  functionName: 'transfer',
  args: ['0xDestinataireAddress...', 10_000000n], // 10 USDC (6 decimals)
});

const txHash = await this.cdp.evm.sendTransaction({
  from: account.address,
  to: usdcAddress,
  data,
  network: 'base-sepolia',
  chainId: 84532,
});

console.log('TX Hash:', txHash);
```

### 6. Batch Transactions (Smart Account uniquement)

**SUPER PUISSANT** : Envoyer plusieurs TX dans une seule !

```typescript
const batchResult = await this.cdp.evm.sendBatchTransactions({
  from: smartAccount.address,
  transactions: [
    // TX 1 : Envoyer 5 USDC à Alice
    {
      to: usdcAddress,
      data: encodeFunctionData({
        abi: [/* ... */],
        functionName: 'transfer',
        args: ['0xAliceAddress...', 5_000000n],
      }),
    },
    // TX 2 : Envoyer 3 USDC à Bob
    {
      to: usdcAddress,
      data: encodeFunctionData({
        abi: [/* ... */],
        functionName: 'transfer',
        args: ['0xBobAddress...', 3_000000n],
      }),
    },
  ],
  network: 'base-sepolia',
  chainId: 84532,
});

console.log('Batch TX Hash:', batchResult.userOpHash);
```

**Avantage** :
- ✅ **Atomique** : soit toutes les TX passent, soit aucune
- ✅ **Gas optimisé** : 1 seule TX blockchain
- ✅ **Simplifie la logique** : pas besoin de gérer les nonces

---

## 💸 Gas Sponsorship (Smart Account uniquement)

**Concept** : **Tu paies le gas** pour que l'user n'ait pas à le payer !

**Use case CyLimit** :
- User vend une carte → tu lui envoies les USDC **sans qu'il ait d'ETH** pour payer le gas
- User reçoit un reward → pareil

**Comment l'activer** :

```typescript
const txHash = await this.cdp.evm.sendTransaction({
  from: smartAccount.address,
  to: usdcAddress,
  data: transferData,
  network: 'base-sepolia',
  chainId: 84532,
  gasSponsorship: true, // 👈 TU paies le gas
});
```

**⚠️ IMPORTANT** :
- Tu paies le gas en ETH (sur ton compte Coinbase)
- L'user **n'a pas besoin d'ETH** sur son wallet
- **Limites** : Max 0.001 ETH par TX (configurable dans CDP Portal)

---

## 🔒 Policies & Spend Permissions (Smart Account uniquement)

**Concept** : Définir des **règles** pour limiter ce qu'un account peut faire.

**Use cases** :
- Limiter le montant max par TX
- Limiter les destinataires autorisés
- Limiter les assets transférables
- Time-based rules (ex: max 100 USDC/jour)

**Exemple : Limiter à 50 USDC par transaction** :

```typescript
await this.cdp.evm.setPolicy({
  account: smartAccount.address,
  policy: {
    type: 'spend_limit',
    asset: usdcAddress,
    maxAmountPerTransaction: 50_000000n, // 50 USDC
  },
});

// Maintenant, toute TX > 50 USDC sera rejetée
```

**Exemple : Whitelist de destinataires** :

```typescript
await this.cdp.evm.setPolicy({
  account: smartAccount.address,
  policy: {
    type: 'whitelist',
    allowedRecipients: [
      '0xAliceAddress...',
      '0xBobAddress...',
      '0xCyLimitMasterWallet...', // Ton wallet CyLimit
    ],
  },
});

// Maintenant, le compte ne peut envoyer qu'à ces adresses
```

---

## 💱 Swaps (Tokens Exchange)

**Concept** : Échanger un token contre un autre (ex: ETH → USDC).

**Use case CyLimit** : Peut-être pas besoin, mais utile si tu veux :
- Accepter des paiements en ETH et les convertir en USDC
- Payer des rewards en ETH à partir de ton pool USDC

**Exemple : Swap 0.01 ETH → USDC** :

```typescript
const swapResult = await this.cdp.evm.swap({
  from: account.address,
  fromToken: 'ETH', // Native token
  toToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
  amount: 10000000000000000n, // 0.01 ETH
  network: 'base-sepolia',
  chainId: 84532,
});

console.log('Swap TX:', swapResult.transactionHash);
console.log('USDC reçus:', swapResult.outputAmount);
```

---

## 📊 Token Balances (Multi-assets)

**Récupérer les balances de TOUS les tokens** :

```typescript
const balances = await this.cdp.evm.getTokenBalances({
  address: account.address,
  network: 'base-sepolia',
});

balances.forEach((balance) => {
  console.log(`${balance.symbol}: ${balance.balance} (${balance.address})`);
});

// Output:
// ETH: 0.1 (native)
// USDC: 250 (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
// DAI: 50 (0x...)
```

---

## 💰 USDC Rewards (4.1% APY)

**INCROYABLE** : Coinbase te paie **4.1% APY** sur tous tes USDC stockés dans tes Server Wallets !

**Comment ça marche** :
- ✅ **Automatique** : pas besoin de s'inscrire
- ✅ **Agrégé** : calculé sur la **somme totale** de USDC dans tous tes comptes
- ✅ **Payé mensuellement** : rewards ajoutés automatiquement
- ✅ **Tous les réseaux EVM** : Base, Polygon, Ethereum, etc.

**Exemple** :

```
Tu as :
- 10,000 USDC sur Base (Master Wallet)
- 5,000 USDC sur Polygon (Fees Wallet)
= 15,000 USDC total

Rewards annuels : 15,000 × 4.1% = 615 USDC/an
Rewards mensuels : 615 / 12 = 51.25 USDC/mois
```

**⚠️ Conditions** :
- USDC seulement (pas ETH, pas DAI, etc.)
- Réseaux EVM uniquement (pas Solana pour l'instant)
- Minimum 1 USDC pour être éligible

---

## 💵 Pricing (Server Wallets v2)

**Bonne nouvelle** : **GRATUIT** jusqu'à un certain seuil !

| Feature | Free Tier | Au-delà |
|---------|-----------|---------|
| **Comptes créés** | ✅ 1,000/mois | $0.02/compte |
| **Transactions** | ✅ 10,000/mois | $0.01/TX |
| **Gas sponsorship** | ❌ Payant dès la 1ère | Prix du gas |
| **API calls** | ✅ Illimité | Gratuit |
| **USDC Rewards** | ✅ Toujours gratuit | 4.1% APY |

**Pour CyLimit** :
- Si < 1,000 comptes/mois et < 10,000 TX/mois → **100% GRATUIT**
- Gas sponsorship : tu paies le prix du gas (ETH)

---

## 🌐 Réseaux Supportés

### EVM Networks (Multi-réseaux !)

**Un seul compte EVM = utilisable sur TOUS ces réseaux** :

| Network | Mainnet | Testnet | Smart Accounts |
|---------|---------|---------|----------------|
| **Base** | ✅ | ✅ Sepolia | ✅ |
| **Ethereum** | ✅ | ✅ Sepolia | ✅ |
| **Polygon** | ✅ | ✅ Amoy | ✅ |
| **Arbitrum** | ✅ | ✅ Sepolia | ✅ |
| **Optimism** | ✅ | ✅ Sepolia | ✅ |
| **Zora** | ✅ | ✅ Testnet | ✅ |
| **BNB Chain** | ✅ | ✅ Testnet | ✅ |
| **Avalanche** | ✅ | ✅ Fuji | ✅ |

**Tous les autres réseaux EVM** (avec EOA uniquement) :
- ✅ Linea
- ✅ zkSync
- ✅ Scroll
- ✅ Mantle
- ✅ Etc.

### Solana

- ✅ Solana Mainnet
- ✅ Solana Devnet

**⚠️ Note** : Comptes Solana sont **séparés** des comptes EVM (adresses différentes).

---

## 🔧 Export/Import Accounts

### Export

**Tu peux exporter les clés privées** (pour backup ou migration) :

```typescript
const exportedKey = await this.cdp.evm.exportAccount({
  address: account.address,
});

console.log('Private Key:', exportedKey.privateKey);
// ⚠️ À garder SECRET et sécurisé !
```

### Import

**Tu peux importer un compte existant** (ex: depuis MetaMask) :

```typescript
const importedAccount = await this.cdp.evm.importAccount({
  privateKey: '0x1234567890abcdef...',
});

console.log('Account importé:', importedAccount.address);
```

---

## 🛠️ Intégration avec viem (RECOMMANDÉ)

**viem** est la lib Ethereum moderne et type-safe (alternative à ethers.js).

**Server Wallets v2 est 100% compatible avec viem !**

### Créer un Custom Account

```typescript
import { createWalletClient, http, publicActions } from 'viem';
import { baseSepolia } from 'viem/chains';

// 1. Créer un CDP account
const cdpAccount = await this.cdp.evm.createAccount({ type: 'smart' });

// 2. Wrapper dans viem
const viemClient = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account: {
    address: cdpAccount.address,
    signMessage: async ({ message }) => {
      return await this.cdp.evm.signMessage({
        address: cdpAccount.address,
        message,
      });
    },
    signTransaction: async (transaction) => {
      return await this.cdp.evm.signTransaction({
        address: cdpAccount.address,
        transaction,
      });
    },
    signTypedData: async (typedData) => {
      return await this.cdp.evm.signTypedData({
        address: cdpAccount.address,
        typedData,
      });
    },
  },
}).extend(publicActions);

// 3. Utiliser comme un wallet viem normal
const hash = await viemClient.sendTransaction({
  to: '0x...',
  value: 1000000000000000n,
});
```

---

## 🔐 Signing (EIP-191 & EIP-712)

### EIP-191 : Sign Message

**Signer un message texte** (pour authentification, etc.) :

```typescript
const signature = await this.cdp.evm.signMessage({
  address: account.address,
  message: 'Hello CyLimit!',
});

console.log('Signature:', signature);
// 0x1234567890abcdef...
```

### EIP-712 : Sign Typed Data

**Signer des données structurées** (pour contrats, etc.) :

```typescript
const signature = await this.cdp.evm.signTypedData({
  address: account.address,
  domain: {
    name: 'CyLimit Marketplace',
    version: '1',
    chainId: 84532,
    verifyingContract: '0xContractAddress...',
  },
  types: {
    Sale: [
      { name: 'nftId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'seller', type: 'address' },
    ],
  },
  primaryType: 'Sale',
  message: {
    nftId: 123,
    price: 50000000n, // 50 USDC
    seller: '0xSellerAddress...',
  },
});

console.log('Signature:', signature);
```

---

## 🏗️ Architecture Recommandée pour CyLimit

### Setup Hybride : Embedded (Users) + Server (CyLimit)

```
┌────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                            │
│  ┌──────────────────────────────────────────┐  │
│  │  EMBEDDED WALLETS (Users)                │  │
│  │  - Auth email/OTP                        │  │
│  │  - Smart Accounts (ERC-4337)             │  │
│  │  - Widget Onramp intégré                 │  │
│  │  - User contrôle ses fonds               │  │
│  └──────────────────────────────────────────┘  │
└────────────┬───────────────────────────────────┘
             │ API calls
             ▼
┌────────────────────────────────────────────────┐
│  BACKEND (NestJS)                              │
│  ┌──────────────────────────────────────────┐  │
│  │  SERVER WALLETS (CyLimit)                │  │
│  │  - Master Wallet (collecter fees)       │  │
│  │  - Rewards Wallet (payer rewards)       │  │
│  │  - Smart Accounts (batch TX)            │  │
│  │  - Gas sponsorship                       │  │
│  │  - Automation complète                   │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Wallets CyLimit Recommandés

**1. Master Wallet (Fees Collection)** :
- Type : **Smart Account** (pour batch TX)
- Fonction : Collecter **toutes** les fees marketplace
- Balance typique : 10,000+ USDC
- Rewards USDC : **4.1% APY** 💰

**2. Rewards Wallet (Payer Users)** :
- Type : **Smart Account** (pour gas sponsorship)
- Fonction : Payer les rewards users automatiquement
- Balance typique : 5,000 USDC
- Gas sponsorship activé : Users n'ont pas besoin d'ETH

**3. Operations Wallet (Divers)** :
- Type : **EOA** (simple et rapide)
- Fonction : Paiements divers, tests
- Balance typique : 500 USDC

---

## ✅ Checklist Implémentation CyLimit (Backend)

### Setup Initial

- [ ] Créer compte CDP Portal
- [ ] Générer CDP API Key
- [ ] Générer Wallet Secret
- [ ] Configurer `.env` backend
- [ ] Installer `@coinbase/cdp-sdk`
- [ ] Créer `CoinbaseWalletService`

### Wallets CyLimit

- [ ] Créer Master Wallet (Smart Account)
- [ ] Créer Rewards Wallet (Smart Account)
- [ ] Tester création/récupération accounts
- [ ] Tester balance USDC

### Marketplace Fees

- [ ] Implémenter `collectFees()` : transfert USDC vers Master Wallet
- [ ] Implémenter calcul fees (0.05 USDC min, 5% max)
- [ ] Tester batch transaction (plusieurs fees à la fois)

### Rewards Automatiques

- [ ] Implémenter `payReward(userId, amount)` depuis Rewards Wallet
- [ ] Activer gas sponsorship (users sans ETH)
- [ ] Tester paiement automatique

### Monitoring

- [ ] Créer endpoint `/wallet/balance` (check Master Wallet)
- [ ] Créer endpoint `/wallet/accounts` (lister tous les comptes)
- [ ] Logs pour chaque transaction

### Production

- [ ] Migrer vers Mainnet (Base ou Polygon)
- [ ] Rotate Wallet Secret (backup)
- [ ] Configurer alerts (balance < 1000 USDC)

---

## 🔗 Liens Documentation

- [Welcome](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/welcome)
- [Quickstart](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart)
- [Accounts](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/accounts)
- [Security](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/security)
- [Smart Accounts](https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/smart-accounts)
- [Gas Sponsorship](https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/gas-sponsorship)
- [Policies](https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/policies/overview)
- [USDC Rewards](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/usdc-rewards)

---

## 🎯 Différences Clés : Embedded vs Server

| Critère | Embedded Wallet | Server Wallet v2 |
|---------|-----------------|------------------|
| **Pour qui** | Users finaux | CyLimit (backend) |
| **Custody** | User | Developer |
| **Clés privées** | Exportables par user | Secured by TEE (AWS Nitro) |
| **Auth** | Email/OTP, social login | API Key + Wallet Secret |
| **UI** | Components React | Aucune (backend API) |
| **Onramp** | Widget intégré | Via API séparée |
| **Automation** | ❌ | ✅ Totale |
| **Gas sponsorship** | ❌ | ✅ (Smart Accounts) |
| **Batch TX** | ❌ | ✅ (Smart Accounts) |
| **Use case CyLimit** | Wallets des users | Master Wallet, Rewards, Fees |

---

**Note créée par :** Claude (Assistant IA)  
**Pour :** Valentin @ CyLimit  
**Date :** 7 octobre 2025

**✅ Cette note est complète et prête pour implémentation backend !**

