# 🚀 MIGRATION POLYGON → BASE - PLAN COMPLET

**Date :** 16 Octobre 2025  
**Status :** 📋 PLAN DÉTAILLÉ  
**Durée estimée :** 3-5 jours

---

## 🎯 VUE D'ENSEMBLE

Migration complète de l'écosystème CyLimit de Polygon vers Base pour réduire les frais de gas de **~92%** et améliorer l'UX avec les fonctionnalités Coinbase natives.

---

## 📊 COMPARAISON POLYGON vs BASE

| Critère | Polygon (Actuel) | Base (Futur) | Économie |
|---------|------------------|--------------|----------|
| **Coût création offer** | $0.025 | $0.002 | **-92%** |
| **Coût achat NFT** | $0.038 | $0.003 | **-92%** |
| **Migration 1000 users** | $152 | $2.10 | **-98.6%** |
| **Payable en USDC** | ❌ Non (POL requis) | ✅ Oui | ✅ UX++ |
| **Sponsoring gas** | ❌ Non | ✅ Oui (Paymaster) | ✅ UX++ |
| **USDC gratuit** | ❌ Non | ✅ Oui (CDP Wallet) | ✅ $0 |
| **Écosystème Coinbase** | ❌ Non | ✅ Oui | ✅ Intégration native |

**Économie totale : ~$150-200/mois + UX largement améliorée** 🎉

---

## 🗺️ ÉTAPES DE MIGRATION

---

### **ÉTAPE 1 : Passer sur la Blockchain Base** ⚙️

#### **1.1. Configuration Environnement**

```bash
# cylimit-admin-backend/.env
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453

# Pour testnet
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_CHAIN_ID=84532
```

#### **1.2. Mettre à Jour les Dépendances**

```bash
# Installer CDP SDK
npm install @coinbase/coinbase-sdk

# Vérifier versions
npm list ethers viem @coinbase/coinbase-sdk
```

#### **1.3. Configurer Provider Base**

```typescript
// src/config/blockchain.ts
import { ethers } from 'ethers';

export const BASE_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.BASE_RPC_URL || 'https://mainnet.base.org'
);

export const BASE_CHAIN_ID = 8453;

export const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC natif Base
```

---

### **ÉTAPE 2 : Créer Master Wallet (CDP Server Wallet)** 🔑

#### **2.1. Créer CDP API Key**

```bash
1. Aller sur https://portal.cdp.coinbase.com/
2. Projects → Create New Project → "CyLimit Base"
3. API Keys → Create API Key
4. Télécharger cdp_api_key.json
5. Stocker dans cylimit-admin-backend/cdp_api_key.json
6. Ajouter au .gitignore
```

#### **2.2. Créer Master Server Wallet**

```typescript
// scripts/create-master-server-wallet.cjs
const { Coinbase } = require('@coinbase/coinbase-sdk');
const fs = require('fs');

async function createMasterWallet() {
  // Configurer CDP
  const coinbase = Coinbase.configureFromJson({ 
    filePath: './cdp_api_key.json' 
  });

  console.log('🔧 Création Master Server Wallet...');

  // Créer wallet sur Base Mainnet
  const wallet = await coinbase.createWallet({
    networkId: 'base-mainnet'
  });

  const address = await wallet.getDefaultAddress();

  console.log('✅ Master Server Wallet créé !');
  console.log(`   Address: ${address}`);

  // Sauvegarder wallet ID
  fs.writeFileSync('./data/master-wallet-info.json', JSON.stringify({
    walletId: wallet.getId(),
    address: address.getId(),
    network: 'base-mainnet',
    createdAt: new Date().toISOString()
  }, null, 2));

  console.log('💾 Wallet info sauvegardé dans data/master-wallet-info.json');

  // Configurer dans .env
  console.log('\n📝 Ajouter dans .env :');
  console.log(`MASTER_WALLET_ID=${wallet.getId()}`);
  console.log(`MASTER_WALLET_ADDRESS=${address.getId()}`);
}

createMasterWallet().catch(console.error);
```

**Exécution :**

```bash
cd cylimit-admin-backend
node scripts/create-master-server-wallet.cjs
```

#### **2.3. Configuration .env**

```bash
# cylimit-admin-backend/.env
MASTER_WALLET_ID=wallet-id-from-script
MASTER_WALLET_ADDRESS=0x...
CDP_API_KEY_PATH=./cdp_api_key.json
```

**Avantages CDP Server Wallet :**
- ✅ Transferts USDC **GRATUITS** (pas de gas)
- ✅ Sécurisé (clés dans AWS Nitro Enclave)
- ✅ API simple
- ✅ Multi-réseau (même adresse partout)

---

### **ÉTAPE 3 : Déployer Contrats sur Base** 📜

#### **3.1. Déployer CyLimitNFT_v2**

```bash
# Préparer contrat
cd cylimit-admin-backend

# Déployer sur Base Mainnet
node scripts/deploy-nft-v2-base-mainnet.cjs
```

**Script de déploiement :**

```javascript
// scripts/deploy-nft-v2-base-mainnet.cjs
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');

async function deployNFT() {
  // Provider Base
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  );

  // Wallet (temporaire pour déploiement)
  const deployerWallet = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY,
    provider
  );

  console.log('🚀 Déploiement CyLimitNFT_v2 sur Base...');
  console.log(`   Deployer: ${deployerWallet.address}`);

  // Compiler contrat
  const sourceCode = fs.readFileSync('./contracts/CyLimitNFT_v2.sol', 'utf8');
  // ... (compilation avec solc)

  // Déployer
  const factory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
  const nftContract = await factory.deploy(
    'CyLimit V2',
    'CYLMT',
    process.env.MASTER_WALLET_ADDRESS, // Owner = Master Server Wallet
    {
      gasPrice: ethers.utils.parseUnits('0.001', 'gwei'), // Gas Base très bas
      gasLimit: 5000000
    }
  );

  await nftContract.deployed();

  console.log('✅ CyLimitNFT_v2 déployé !');
  console.log(`   Address: ${nftContract.address}`);
  console.log(`   Explorer: https://basescan.org/address/${nftContract.address}`);

  // Sauvegarder
  fs.writeFileSync('./data/nft-v2-base-deployment.json', JSON.stringify({
    contractAddress: nftContract.address,
    network: 'base-mainnet',
    chainId: 8453,
    deployedAt: new Date().toISOString()
  }, null, 2));
}

deployNFT().catch(console.error);
```

#### **3.2. Déployer CyLimitMarketplace**

```bash
node scripts/deploy-marketplace-v2-base-mainnet.cjs
```

**Configuration après déploiement :**

```bash
# Whitelist Master Wallet dans NFT contract
node scripts/whitelist-master-wallet.cjs

# Whitelist Marketplace dans NFT contract
node scripts/whitelist-marketplace.cjs
```

---

### **ÉTAPE 4 : Transférer USDC de Polygon vers Base** 💸

#### **4.1. Calculer Total USDC à Transférer**

```bash
# Calculer USDC appartenant à CyLimit
node scripts/calculate-cylimit-usdc.cjs

# Output :
# Total users balance: 45,000 USDC
# Master Old Wallet balance: 50,000 USDC
# CyLimit USDC: 5,000 USDC
# À transférer: 50,000 USDC
```

#### **4.2. Bridge Polygon → Base**

**Option A : Bridge Officiel Base (Recommandé)**

```bash
1. Aller sur https://bridge.base.org/
2. Connect Master Old Wallet (Polygon)
3. Token : USDC
4. Amount : 50,000 USDC
5. To : Base Mainnet
6. Destination : Master Server Wallet Address
7. Confirm transaction
8. Attendre ~7 minutes (bridge officiel)
```

**Frais estimés :**
- Gas Polygon : ~$0.05
- Bridge fee : ~$1-2
- **Total : ~$2**

**Option B : Bridge via CDP (Si disponible)**

```typescript
// scripts/bridge-usdc-polygon-to-base.cjs
const { Coinbase } = require('@coinbase/coinbase-sdk');

async function bridgeUSDC() {
  const coinbase = Coinbase.configureFromJson({ 
    filePath: './cdp_api_key.json' 
  });

  // Récupérer Master Wallet
  const wallet = await coinbase.getWallet(process.env.MASTER_WALLET_ID);

  // Bridge USDC
  const bridge = await wallet.bridge({
    amount: 50000,
    token: 'usdc',
    fromNetwork: 'polygon',
    toNetwork: 'base-mainnet'
  });

  await bridge.wait();

  console.log('✅ USDC bridgé de Polygon vers Base !');
}

bridgeUSDC().catch(console.error);
```

#### **4.3. Vérifier Réception**

```bash
node scripts/check-master-wallet-balance.cjs

# Output :
# Base Mainnet - USDC Balance: 50,000 USDC ✅
```

---

### **ÉTAPE 5 : Mint tous les NFTs sur Base** 🎨

#### **5.1. Préparer Données NFT**

```bash
# Extraire tous les NFTs depuis MongoDB
node scripts/prepare-nfts-for-base-remint.cjs

# Output :
# ✅ 31,450 NFTs préparés
# ✅ Data saved: data/nfts-to-remint-base.json
```

**Script de préparation :**

```javascript
// scripts/prepare-nfts-for-base-remint.cjs
const mongoose = require('mongoose');
const fs = require('fs');

async function prepareNFTs() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('📝 Extraction NFTs depuis MongoDB...');

  // Récupérer TOUS les NFTs
  const nfts = await NFT.find({
    ownerId: { $exists: true, $ne: null },
    tokenId: { $exists: true, $ne: null },
    cid: { $exists: true, $ne: null }
  }).lean();

  console.log(`✅ ${nfts.length} NFTs trouvés`);

  // Préparer données pour remint
  const remintData = nfts.map(nft => ({
    _id: nft._id.toString(),
    oldTokenId: nft.tokenId,
    oldContractAddress: nft.contractAddress,
    tokenURI: nft.cid ? `ipfs://${nft.cid}` : nft.metadata,
    ownerId: nft.ownerId.toString(),
    rarity: nft.rarity,
    serialNumber: nft.serialNumber
  }));

  // Grouper par batches de 100
  const batches = [];
  for (let i = 0; i < remintData.length; i += 100) {
    batches.push(remintData.slice(i, i + 100));
  }

  // Sauvegarder
  fs.writeFileSync('./data/nfts-to-remint-base.json', JSON.stringify({
    totalNFTs: nfts.length,
    batches: batches,
    network: 'base-mainnet',
    preparedAt: new Date().toISOString()
  }, null, 2));

  console.log(`✅ ${batches.length} batches préparés`);
  console.log(`💾 Sauvegardé dans data/nfts-to-remint-base.json`);
}

prepareNFTs().catch(console.error);
```

#### **5.2. Mint NFTs en Batch sur Base**

```bash
# Mint tous les NFTs (31,450 en ~315 batches)
node scripts/remint-nfts-base-batch.cjs

# Durée estimée : 1-2 heures
# Coût gas estimé : ~$0 (Master Server Wallet = gasless) 🎉
```

**Script de remint :**

```javascript
// scripts/remint-nfts-base-batch.cjs
const { Coinbase } = require('@coinbase/coinbase-sdk');
const mongoose = require('mongoose');
const fs = require('fs');

async function remintNFTs() {
  // Configurer CDP
  const coinbase = Coinbase.configureFromJson({ 
    filePath: './cdp_api_key.json' 
  });

  // Charger données
  const data = JSON.parse(fs.readFileSync('./data/nfts-to-remint-base.json'));
  const batches = data.batches;

  console.log(`🚀 Remint de ${data.totalNFTs} NFTs en ${batches.length} batches...`);

  // Récupérer Master Wallet
  const wallet = await coinbase.getWallet(process.env.MASTER_WALLET_ID);

  // Contract NFT
  const NFT_CONTRACT_ADDRESS = process.env.NFT_V2_CONTRACT_ADDRESS;

  // MongoDB
  await mongoose.connect(process.env.MONGODB_URI);

  // Traiter chaque batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} NFTs)`);

    try {
      // Préparer tokenURIs
      const tokenURIs = batch.map(nft => nft.tokenURI);

      // Mint via batchMint() - GRATUIT avec Server Wallet ! 🎉
      const invocation = await wallet.invokeContract({
        contractAddress: NFT_CONTRACT_ADDRESS,
        method: 'batchMint',
        args: {
          to: wallet.getDefaultAddress().getId(),
          tokenURIs: tokenURIs
        }
      });

      await invocation.wait();

      console.log(`   ✅ ${batch.length} NFTs mintés`);
      console.log(`   TX: https://basescan.org/tx/${invocation.getTransactionHash()}`);

      // Récupérer les nouveaux tokenIds depuis les events
      const receipt = invocation.getTransaction().getReceipt();
      const startTokenId = data.totalNFTs - (batches.length - i) * 100;

      // Mettre à jour MongoDB
      for (let j = 0; j < batch.length; j++) {
        const nft = batch[j];
        const newTokenId = startTokenId + j;

        await NFT.findByIdAndUpdate(nft._id, {
          contractAddress: NFT_CONTRACT_ADDRESS,
          tokenId: newTokenId.toString(),
          oldTokenId: nft.oldTokenId,
          oldContractAddress: nft.oldContractAddress,
          network: 'base-mainnet',
          // ownerId reste inchangé ✅
        });
      }

      console.log(`   ✅ MongoDB mis à jour`);

    } catch (error) {
      console.error(`   ❌ Erreur batch ${i + 1}:`, error.message);
      // Sauvegarder progression
      fs.writeFileSync('./data/remint-progress.json', JSON.stringify({
        lastCompletedBatch: i - 1,
        error: error.message
      }));
      throw error;
    }

    // Pause entre batches (rate limiting)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ REMINT COMPLET !');
  console.log(`   Total mintés: ${data.totalNFTs} NFTs`);
  console.log(`   Coût gas: $0 (CDP Server Wallet gasless) 🎉`);
}

remintNFTs().catch(console.error);
```

**Résultat attendu :**
- ✅ 31,450 NFTs mintés sur Base
- ✅ Owner = Master Server Wallet (tous les NFTs)
- ✅ MongoDB mis à jour (`contractAddress`, `tokenId`, `oldTokenId`, `network`)
- ✅ `ownerId` inchangé (traçabilité préservée)
- ✅ **Coût total : $0** (gasless avec CDP Server Wallet) 🎉

---

### **ÉTAPE 6 : Migration Auto des Users** 👥

#### **6.1. Créer Embedded Wallet lors Reconnexion**

```typescript
// user-backend/src/modules/auth/auth.service.ts

async login(email: string) {
  const user = await this.userModel.findOne({ email });

  // Si pas encore de wallet Base
  if (!user.baseWalletAddress) {
    console.log('🔧 Création Embedded Wallet Base...');

    // Créer Embedded Wallet via CDP
    const wallet = await this.coinbaseService.createEmbeddedWallet({
      userId: user._id.toString(),
      email: user.email,
      accountType: 'smart-account', // ERC-4337 pour Paymaster
      networkId: 'base-mainnet'
    });

    // Sauvegarder
    user.baseWalletAddress = wallet.address;
    user.migrationStatus = 'pending'; // Prêt pour migration
    await user.save();

    console.log(`✅ Embedded Wallet créé: ${wallet.address}`);
  }

  return { user, token: this.generateJWT(user) };
}
```

#### **6.2. Migration Automatique USDC**

```typescript
// user-backend/src/modules/migration/migration.service.ts

async migrateUserUSDC(userId: string) {
  const user = await this.userModel.findById(userId);

  if (user.totalBalance <= 0) {
    console.log('⏭️  Pas d\'USDC à migrer');
    return { transferred: 0 };
  }

  console.log(`💸 Migration USDC: ${user.totalBalance} USDC → ${user.baseWalletAddress}`);

  // Transfer USDC depuis Master Server Wallet - GRATUIT ! 🎉
  const transfer = await this.masterWallet.transfer({
    to: user.baseWalletAddress,
    amount: user.totalBalance,
    token: 'usdc',
    network: 'base-mainnet',
    gasless: true // ← GRATUIT avec CDP Server Wallet !
  });

  await transfer.wait();

  console.log(`✅ USDC transférés (TX: ${transfer.getTransactionHash()})`);

  // Mettre à jour DB
  user.totalBalance = 0;
  user.migrationStatus = 'usdc_transferred';
  await user.save();

  return { 
    transferred: user.totalBalance,
    txHash: transfer.getTransactionHash()
  };
}
```

**Coût : $0** (gasless avec CDP Server Wallet) 🎉

#### **6.3. Migration Automatique NFTs**

```typescript
// user-backend/src/modules/migration/migration.service.ts

async migrateUserNFTs(userId: string) {
  const user = await this.userModel.findById(userId);

  // Récupérer NFTs user
  const nfts = await this.nftModel.find({
    ownerId: userId,
    network: 'base-mainnet'
  });

  if (nfts.length === 0) {
    console.log('⏭️  Pas de NFTs à migrer');
    return { transferred: 0 };
  }

  console.log(`🎨 Migration ${nfts.length} NFTs → ${user.baseWalletAddress}`);

  // Option 1 : Batch transfers via Paymaster (sponsorisé)
  const tokenIds = nfts.map(nft => nft.tokenId);

  const invocation = await this.masterWallet.invokeContract({
    contractAddress: process.env.NFT_V2_CONTRACT_ADDRESS,
    method: 'batchTransfer',
    args: {
      from: this.masterWallet.getDefaultAddress().getId(),
      to: user.baseWalletAddress,
      tokenIds: tokenIds
    },
    paymasterUrl: process.env.PAYMASTER_URL // ← CyLimit paie le gas
  });

  await invocation.wait();

  console.log(`✅ ${nfts.length} NFTs transférés`);

  // Mettre à jour DB
  user.migrationStatus = 'completed';
  user.migratedAt = new Date();
  await user.save();

  return {
    transferred: nfts.length,
    txHash: invocation.getTransactionHash()
  };
}
```

**Coût avec Paymaster :**
- 1 user × 3 NFTs moyens = ~$0.002
- 1000 users = **$2** (payé par CyLimit)

**Sans Paymaster (users payent) :**
- Users payent en USDC directement sur Base
- Coût : ~$0.002/user (acceptable)

---

## 📊 RÉCAPITULATIF COÛTS

### **Migration Complète 1000 Users**

| Opération | Polygon (Ancien) | Base (Nouveau) | Économie |
|-----------|------------------|----------------|----------|
| **Bridge USDC** | N/A | $2 | One-time |
| **Mint 31,450 NFTs** | $1,000 | **$0** | **-100%** 🎉 |
| **Migration USDC (1000 users)** | $38 | **$0** | **-100%** 🎉 |
| **Migration NFTs (1000 users)** | $114 | $2 (sponsorisé) | **-98.2%** 🎉 |
| **TOTAL MIGRATION** | **$1,152** | **$4** | **-99.7%** 🎉 |

### **Coûts Mensuels Marketplace**

| Opération | Polygon | Base | Économie |
|-----------|---------|------|----------|
| **1000 buy offers/mois** | $25 | $2 | **-92%** |
| **500 ventes/mois** | $19 | $1.50 | **-92%** |
| **TOTAL/MOIS** | **$44** | **$3.50** | **-92%** |

**Économie annuelle : ~$500/an** 💰

---

## ✅ CHECKLIST MIGRATION

### **Préparation**
- [ ] Créer compte CDP (portal.cdp.coinbase.com)
- [ ] Obtenir API Keys CDP
- [ ] Configurer .env avec variables Base
- [ ] Installer dépendances (@coinbase/coinbase-sdk)

### **Setup Wallet**
- [ ] Créer Master Server Wallet (CDP)
- [ ] Sauvegarder Wallet ID
- [ ] Financer wallet testnet (tests)

### **Déploiement Contrats**
- [ ] Déployer CyLimitNFT_v2 sur Base
- [ ] Déployer CyLimitMarketplace sur Base
- [ ] Whitelist Master Wallet
- [ ] Whitelist Marketplace
- [ ] Vérifier sur Basescan

### **Migration Données**
- [ ] Bridge USDC (Polygon → Base)
- [ ] Préparer données NFTs (MongoDB)
- [ ] Mint 31,450 NFTs sur Base
- [ ] Vérifier totalSupply on-chain
- [ ] Mettre à jour MongoDB (contractAddress, tokenId)

### **Configuration Paymaster**
- [ ] Activer Paymaster sur CDP Portal
- [ ] Allowlist CyLimitNFT_v2 (batchTransfer)
- [ ] Allowlist CyLimitMarketplace (buy, acceptOffer, etc.)
- [ ] Configurer limites ($100/mois)

### **Tests Migration Users**
- [ ] Tester création Embedded Wallet
- [ ] Tester migration USDC (1 user)
- [ ] Tester migration NFTs (1 user)
- [ ] Tester achat NFT avec Paymaster
- [ ] Valider taux succès > 95%

### **Production**
- [ ] Activer migration automatique
- [ ] Monitorer logs (Slack alerts)
- [ ] Suivre métriques (dashboard)
- [ ] Support users si erreurs

---

## 🎉 AVANTAGES BASE

1. ✅ **Coûts réduits de 92-99%**
2. ✅ **Transferts USDC gratuits** (CDP Server Wallet)
3. ✅ **Mint NFTs gratuit** (CDP Server Wallet)
4. ✅ **Migration users quasi-gratuite** ($2 pour 1000 users)
5. ✅ **Paymaster disponible** (sponsoring gas)
6. ✅ **Paiement gas en USDC** (pas besoin d'ETH)
7. ✅ **Écosystème Coinbase natif** (Embedded Wallets intégrés)
8. ✅ **UX largement améliorée** (moins de friction)

---

**Date de mise à jour :** 16 Octobre 2025  
**Status :** 📋 PLAN PRÊT POUR EXÉCUTION

