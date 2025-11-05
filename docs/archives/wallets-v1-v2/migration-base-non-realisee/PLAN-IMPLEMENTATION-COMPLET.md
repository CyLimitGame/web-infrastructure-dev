# 🚀 PLAN IMPLÉMENTATION MIGRATION BASE - COMPLET

**Date :** 16 Octobre 2025  
**Status :** 📋 PLAN DÉTAILLÉ AVEC PINATA + GOOGLE STORAGE

---

## 🎯 VUE D'ENSEMBLE

**Migrations à effectuer :**
1. **Storage** : AWS S3 → Google Cloud Storage + Pinata IPFS (remplacement Fleek)
2. **Blockchain** : Polygon → Base
3. **Wallets** : MetaMask → CDP Embedded Wallets
4. **Marketplace** : Contrat complexe → Contrat simplifié (escrow générique)

**Ordre d'exécution :**
1. Migration images/metadata vers Pinata + Google (AVANT mint)
2. Setup Base (Master Wallet + Deploy contracts)
3. Mint NFTs sur Base (avec nouveaux metadata Pinata)
4. Migration auto users (Embedded Wallet + USDC + NFTs)

---

## 📦 PHASE 1 : ARCHIVAGE POLYGON

### 1.1 Archiver contrats Polygon

**Action :**
- Créer `cylimit-admin-backend/old_polygon/contracts/`
- Déplacer `contracts/CyLimitMarketplace.sol` → `old_polygon/contracts/`
- Garder uniquement dans `/contracts` :
  - `CyLimitMarketplace_v2_Base.sol` (nouveau)
  - `CyLimitNFT_v2.sol` (redéployé sur Base)

### 1.2 Archiver scripts Polygon

**Action :**
- Créer `cylimit-admin-backend/old_polygon/scripts/`
- Déplacer vers `old_polygon/scripts/` :
  - `scripts/prepare-nfts-for-remint.js`
  - `scripts/test-mint-nft-testnet.cjs`
  - Tous scripts mentionnant "polygon" ou "amoy"

### 1.3 Mettre à jour .env

**Ajouter dans `env` et `env.production` :**

```bash
# ═══════════════════════════════════════════════════════════════════════
# BASE NETWORK
# ═══════════════════════════════════════════════════════════════════════
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=8453
USDC_BASE_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ═══════════════════════════════════════════════════════════════════════
# COINBASE CDP (Master Server Wallet)
# ═══════════════════════════════════════════════════════════════════════
MASTER_WALLET_ID=
MASTER_WALLET_ADDRESS=
CDP_API_KEY_PATH=./cdp_api_key.json

# ═══════════════════════════════════════════════════════════════════════
# CONTRACTS BASE
# ═══════════════════════════════════════════════════════════════════════
NFT_V2_CONTRACT_ADDRESS=
MARKETPLACE_V2_CONTRACT_ADDRESS=

# ═══════════════════════════════════════════════════════════════════════
# PAYMASTER (Gas Sponsoring)
# ═══════════════════════════════════════════════════════════════════════
PAYMASTER_URL=

# ═══════════════════════════════════════════════════════════════════════
# GOOGLE CLOUD STORAGE (Remplacement AWS S3)
# ═══════════════════════════════════════════════════════════════════════
GOOGLE_APPLICATION_CREDENTIALS=./cylimit-service-key.json
GOOGLE_STORAGE_BUCKET=cylimit-nfts
GOOGLE_STORAGE_PROJECT_ID=

# ═══════════════════════════════════════════════════════════════════════
# PINATA IPFS (Remplacement Fleek)
# ═══════════════════════════════════════════════════════════════════════
PINATA_JWT=
PINATA_GATEWAY=https://gateway.pinata.cloud

# ═══════════════════════════════════════════════════════════════════════
# OLD POLYGON (DEPRECATED)
# ═══════════════════════════════════════════════════════════════════════
OLD_POLYGON_RPC_URL=https://polygon-rpc.com
OLD_POLYGON_CHAIN_ID=137
OLD_NFT_CONTRACT_ADDRESS=
OLD_MARKETPLACE_CONTRACT_ADDRESS=

# ═══════════════════════════════════════════════════════════════════════
# OLD STORAGE (DEPRECATED)
# ═══════════════════════════════════════════════════════════════════════
OLD_AWS_S3_BUCKET=cylimit-public
OLD_AWS_ACCESS_KEY_ID=AKIATUZUNGSEGQLBEQPE
OLD_AWS_SECRET_ACCESS_KEY=
OLD_FLEEK_API_KEY=
```

---

## 🖼️ PHASE 2 : MIGRATION STORAGE (AWS + Fleek → Pinata + Google)

### 2.1 Script migration images (AWS → Pinata + Google)

**Fichier :** `scripts/base/1-migrate-images-dual-storage.cjs`

**Workflow :**
1. Query MongoDB : `NFT.find({ imageUrl: /amazonaws\.com/ })`
2. Pour chaque NFT :
   - Télécharger image depuis AWS (`nft.imageUrl`)
   - **Upload sur Pinata** → obtenir `imageCID`
   - **Upload sur Google Cloud Storage** → obtenir `imageUrlGoogle`
   - Update DB :
     ```javascript
     {
       imageUrlPinata: `https://gateway.pinata.cloud/ipfs/${imageCID}`,
       imageUrlGoogle: `https://storage.googleapis.com/${bucket}/nft/${nftId}.png`,
       imageCID: imageCID,
       oldImageUrl: nft.imageUrl // Archive AWS
     }
     ```

**Code :**
```javascript
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

async function migrateImages() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Query NFTs avec images AWS
  const NFT = mongoose.model('NFT');
  const nfts = await NFT.find({
    imageUrl: { $regex: /amazonaws\.com/ }
  }).lean();

  console.log(`Found ${nfts.length} NFTs with AWS images`);

  // Init Google Cloud Storage
  const storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_STORAGE_PROJECT_ID
  });
  const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET);

  let processed = 0;

  for (const nft of nfts) {
    try {
      console.log(`\n[${++processed}/${nfts.length}] Processing NFT ${nft._id}...`);

      // 1. Télécharger image depuis AWS
      const awsResponse = await axios.get(nft.imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000
      });
      const imageBuffer = Buffer.from(awsResponse.data);
      const fileName = `${nft._id}.png`;

      console.log(`   Downloaded from AWS (${imageBuffer.length} bytes)`);

      // 2. Upload sur Pinata (IPFS)
      const formData = new FormData();
      formData.append('file', imageBuffer, { 
        filename: fileName,
        contentType: 'image/png'
      });

      const pinataResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.PINATA_JWT}`
          },
          maxBodyLength: Infinity
        }
      );

      const imageCID = pinataResponse.data.IpfsHash;
      const pinataUrl = `${process.env.PINATA_GATEWAY}/ipfs/${imageCID}`;

      console.log(`   Pinata: ${imageCID}`);

      // 3. Upload sur Google Cloud Storage (backup)
      const gcsFile = bucket.file(`nft/${fileName}`);
      await gcsFile.save(imageBuffer, {
        contentType: 'image/png',
        public: true,
        metadata: {
          cacheControl: 'public, max-age=31536000'
        }
      });

      const googleUrl = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET}/nft/${fileName}`;

      console.log(`   Google: ${googleUrl}`);

      // 4. Update MongoDB
      await NFT.findByIdAndUpdate(nft._id, {
        imageUrlPinata: pinataUrl,
        imageUrlGoogle: googleUrl,
        imageCID: imageCID,
        oldImageUrl: nft.imageUrl
      });

      console.log(`   ✅ DB updated`);

      // Rate limiting Pinata (180 req/min max)
      await new Promise(resolve => setTimeout(resolve, 350));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      // Continue avec le prochain NFT
    }
  }

  console.log(`\n✅ Migration images complete: ${processed} NFTs`);
}

migrateImages().catch(console.error);
```

**Durée estimée :** 31,450 NFTs × 350ms = ~3 heures

---

### 2.2 Script rebuild metadata (Pinata + Google)

**Fichier :** `scripts/base/2-rebuild-metadata-dual-storage.cjs`

**Workflow (format EXACT de `mint.py` lignes 148-162) :**
1. Query MongoDB : `NFT.find().populate('riderId teamId')`
2. Pour chaque NFT :
   - Récupérer Rider et Team
   - **Calculer age exactement comme `mint.py` ligne 79** : `age = currentYear - birthYear - 1`
   - **Construire metadata JSON identique à `mint.py` lignes 148-162** :
     ```javascript
     {
       attributes: [
         { trait_type: "age", value: age },
         { trait_type: "gender", value: "male" },
         { trait_type: "yearOfEdition", value: nft.yearOfEdition },
         { trait_type: "rarity", value: nft.rarity },
         { trait_type: "serialNumber", value: nft.serialNumber },
         { trait_type: "lastSerialNumber", value: nft.lastSerialNumber },
         { trait_type: "nationality", value: rider.nationality },
         { trait_type: "team", value: team.name }
       ],
       description: "Collect, trade & play on app.cylimit.com with official cards in limited editions",
       name: `${rider.name} ${nft.yearOfEdition} ${nft.rarity} ${nft.serialNumber}/${nft.lastSerialNumber}`,
       image: nft.imageUrlPinata
     }
     ```
   - Upload metadata JSON sur **Pinata** → obtenir `metadataCID`
   - Upload metadata JSON sur **Google Cloud Storage** → backup
   - Update DB :
     ```javascript
     {
       metadataUrlPinata: `https://gateway.pinata.cloud/ipfs/${metadataCID}`,
       metadataUrlGoogle: `https://storage.googleapis.com/.../metadata/${nftId}.json`,
       metadataCID: metadataCID,
       oldCid: nft.cid // Archive Fleek
     }
     ```
3. Sauvegarder `data/nfts-to-mint-base.json` avec `tokenURI: ipfs://${metadataCID}`

**Code :**
```javascript
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
require('dotenv').config();

async function rebuildMetadata() {
  await mongoose.connect(process.env.MONGODB_URI);

  const NFT = mongoose.model('NFT');
  const Rider = mongoose.model('Rider');
  const Team = mongoose.model('Team');

  // Récupérer NFTs avec images Pinata déjà uploadées
  const nfts = await NFT.find({
    imageUrlPinata: { $exists: true },
    ownerId: { $exists: true, $ne: null }
  }).lean();

  console.log(`Found ${nfts.length} NFTs to process`);

  // Init Google Cloud Storage
  const storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_STORAGE_PROJECT_ID
  });
  const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET);

  const remintData = [];
  let processed = 0;

  for (const nft of nfts) {
    try {
      console.log(`\n[${++processed}/${nfts.length}] Processing NFT ${nft._id}...`);

      // Récupérer Rider et Team
      const rider = await Rider.findById(nft.riderId).lean();
      const team = await Team.findById(nft.teamId).lean();

      if (!rider || !team) {
        console.warn(`   ⚠️  Skipping: missing rider or team`);
        continue;
      }

      // Calculer age (EXACTEMENT comme mint.py ligne 79)
      const birthDate = new Date(rider.dob);
      const currentYear = new Date().getFullYear();
      const birthYear = birthDate.getFullYear();
      const age = currentYear - birthYear - 1;

      // Construire metadata (FORMAT EXACT mint.py lignes 148-162)
      const metadata = {
        attributes: [
          { trait_type: "age", value: age },
          { trait_type: "gender", value: "male" },
          { trait_type: "yearOfEdition", value: nft.yearOfEdition },
          { trait_type: "rarity", value: nft.rarity },
          { trait_type: "serialNumber", value: nft.serialNumber },
          { trait_type: "lastSerialNumber", value: nft.lastSerialNumber },
          { trait_type: "nationality", value: rider.nationality },
          { trait_type: "team", value: team.name }
        ],
        description: "Collect, trade & play on app.cylimit.com with official cards in limited editions",
        name: `${rider.name} ${nft.yearOfEdition} ${nft.rarity} ${nft.serialNumber}/${nft.lastSerialNumber}`,
        image: nft.imageUrlPinata
      };

      const metadataJSON = JSON.stringify(metadata, null, 2);

      console.log(`   Metadata: ${metadata.name}`);

      // 1. Upload sur Pinata
      const formData = new FormData();
      formData.append('file', Buffer.from(metadataJSON), { 
        filename: `${nft._id}.json`,
        contentType: 'application/json'
      });

      const pinataResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.PINATA_JWT}`
          }
        }
      );

      const metadataCID = pinataResponse.data.IpfsHash;
      const metadataUrlPinata = `${process.env.PINATA_GATEWAY}/ipfs/${metadataCID}`;
      const tokenURI = `ipfs://${metadataCID}`;

      console.log(`   Pinata metadata: ${metadataCID}`);

      // 2. Upload sur Google Cloud Storage (backup)
      const gcsFile = bucket.file(`nft/metadata/${nft._id}.json`);
      await gcsFile.save(metadataJSON, {
        contentType: 'application/json',
        public: true
      });

      const metadataUrlGoogle = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET}/nft/metadata/${nft._id}.json`;

      console.log(`   Google metadata: ${metadataUrlGoogle}`);

      // 3. Update MongoDB
      await NFT.findByIdAndUpdate(nft._id, {
        metadataUrlPinata: metadataUrlPinata,
        metadataUrlGoogle: metadataUrlGoogle,
        metadataCID: metadataCID,
        oldCid: nft.cid
      });

      // 4. Préparer pour mint
      remintData.push({
        _id: nft._id.toString(),
        oldTokenId: nft.tokenId,
        tokenURI: tokenURI, // ipfs://{metadataCID}
        ownerId: nft.ownerId.toString()
      });

      console.log(`   ✅ Metadata uploaded (Pinata + Google)`);

      // Rate limiting Pinata (180 req/min)
      await new Promise(resolve => setTimeout(resolve, 350));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Créer batches de 100
  const batches = [];
  for (let i = 0; i < remintData.length; i += 100) {
    batches.push(remintData.slice(i, i + 100));
  }

  // Sauvegarder pour mint
  fs.writeFileSync('./data/nfts-to-mint-base.json', JSON.stringify({
    totalNFTs: remintData.length,
    batches: batches,
    preparedAt: new Date().toISOString()
  }, null, 2));

  console.log(`\n✅ Metadata rebuild complete: ${processed} NFTs`);
  console.log(`   Batches created: ${batches.length}`);
  console.log(`   Saved: data/nfts-to-mint-base.json`);
}

rebuildMetadata().catch(console.error);
```

**Durée estimée :** 31,450 NFTs × 350ms = ~3 heures

---

## ⛓️ PHASE 3 : SETUP BASE (Blockchain)

### 3.1 Script Master Wallet (CDP SDK v2)

**⚠️ IMPORTANT : TOUJOURS UTILISER CDP SDK V2 !**

**Fichier :** `scripts/base/3-create-master-server-wallet-v2.cjs`

```javascript
const { CdpClient } = require('@coinbase/cdp-sdk');
const fs = require('fs');
require('dotenv').config();

async function createMasterWallet() {
  console.log('🔧 Creating Master Server Account on Base (CDP v2)...');

  // Initialiser CDP Client v2 (charge auto les env vars)
  const cdp = new CdpClient();

  // Créer ou récupérer le compte Master avec nom persistant
  const account = await cdp.evm.getOrCreateAccount({
    name: 'MasterWalletCyLimitBase'
  });

  console.log('✅ Master Server Account created/retrieved!');
  console.log(`   Address: ${account.address}`);
  console.log(`   Network: Multi-network (Base, Polygon, Ethereum, etc.)`);

  // Sauvegarder info
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }

  fs.writeFileSync('./data/master-account-v2-info.json', JSON.stringify({
    address: account.address,
    name: 'MasterWalletCyLimitBase',
    network: 'multi-network',
    createdAt: new Date().toISOString(),
    type: 'cdp-v2-evm-account'
  }, null, 2));

  console.log('\n📝 Add to .env:');
  console.log(`MASTER_WALLET_ADDRESS=${account.address}`);
  console.log('\n💡 Ce compte fonctionne sur TOUS les réseaux EVM avec la même adresse !');
}

createMasterWallet().catch(console.error);
```

---

### 3.2 Script déploiement NFT v2

**Fichier :** `scripts/base/4-deploy-nft-v2-base.cjs`

```javascript
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
require('dotenv').config();

async function deployNFT() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('🚀 Deploying CyLimitNFT_v2 on Base Mainnet...');
  console.log(`   Deployer: ${deployerWallet.address}`);
  console.log(`   Owner: ${process.env.MASTER_WALLET_ADDRESS}`);

  // Lire contrat
  const sourceCode = fs.readFileSync('./contracts/CyLimitNFT_v2.sol', 'utf8');

  // Compiler
  const input = {
    language: 'Solidity',
    sources: { 'CyLimitNFT_v2.sol': { content: sourceCode } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };

  console.log('⚙️  Compiling contract...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      throw new Error('Contract compilation failed');
    }
  }

  const contract = output.contracts['CyLimitNFT_v2.sol']['CyLimitNFT_v2'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Contract compiled');

  // Déployer
  const factory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
  const nftContract = await factory.deploy(
    'CyLimit V2',
    'CYLMT',
    process.env.MASTER_WALLET_ADDRESS,
    {
      gasPrice: ethers.utils.parseUnits('0.001', 'gwei'),
      gasLimit: 5000000
    }
  );

  console.log('⏳ Waiting for deployment...');
  await nftContract.deployed();

  console.log('✅ CyLimitNFT_v2 deployed!');
  console.log(`   Address: ${nftContract.address}`);
  console.log(`   Basescan: https://basescan.org/address/${nftContract.address}`);

  // Sauvegarder
  fs.writeFileSync('./data/nft-v2-base-deployment.json', JSON.stringify({
    contractAddress: nftContract.address,
    network: 'base-mainnet',
    chainId: 8453,
    owner: process.env.MASTER_WALLET_ADDRESS,
    deployedAt: new Date().toISOString(),
    deployer: deployerWallet.address
  }, null, 2));

  console.log('\n📝 Add to .env:');
  console.log(`NFT_V2_CONTRACT_ADDRESS=${nftContract.address}`);
}

deployNFT().catch(console.error);
```

---

### 3.3 Script déploiement Marketplace

**Fichier :** `scripts/base/5-deploy-marketplace-v2-base.cjs`

```javascript
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
require('dotenv').config();

async function deployMarketplace() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('🚀 Deploying CyLimitMarketplace_v2_Base on Base Mainnet...');
  console.log(`   Deployer: ${deployerWallet.address}`);

  // Lire contrat
  const sourceCode = fs.readFileSync('./contracts/CyLimitMarketplace_v2_Base.sol', 'utf8');

  // Compiler
  const input = {
    language: 'Solidity',
    sources: { 'CyLimitMarketplace_v2_Base.sol': { content: sourceCode } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };

  console.log('⚙️  Compiling contract...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      throw new Error('Contract compilation failed');
    }
  }

  const contract = output.contracts['CyLimitMarketplace_v2_Base.sol']['CyLimitMarketplace'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Contract compiled');

  // Déployer avec constructor
  const factory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
  const marketplaceContract = await factory.deploy(
    process.env.NFT_V2_CONTRACT_ADDRESS,
    process.env.USDC_BASE_ADDRESS,
    process.env.MASTER_WALLET_ADDRESS,
    {
      gasPrice: ethers.utils.parseUnits('0.001', 'gwei'),
      gasLimit: 3000000
    }
  );

  console.log('⏳ Waiting for deployment...');
  await marketplaceContract.deployed();

  console.log('✅ CyLimitMarketplace_v2_Base deployed!');
  console.log(`   Address: ${marketplaceContract.address}`);
  console.log(`   Basescan: https://basescan.org/address/${marketplaceContract.address}`);

  // Sauvegarder
  fs.writeFileSync('./data/marketplace-v2-base-deployment.json', JSON.stringify({
    contractAddress: marketplaceContract.address,
    nftContract: process.env.NFT_V2_CONTRACT_ADDRESS,
    usdcContract: process.env.USDC_BASE_ADDRESS,
    owner: process.env.MASTER_WALLET_ADDRESS,
    network: 'base-mainnet',
    chainId: 8453,
    deployedAt: new Date().toISOString()
  }, null, 2));

  console.log('\n📝 Add to .env:');
  console.log(`MARKETPLACE_V2_CONTRACT_ADDRESS=${marketplaceContract.address}`);
}

deployMarketplace().catch(console.error);
```

---

### 3.4 Script whitelist

**Fichier :** `scripts/base/6-setup-whitelists.cjs`

```javascript
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function setupWhitelists() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  // Charger NFT contract ABI
  const nftDeployment = JSON.parse(fs.readFileSync('./data/nft-v2-base-deployment.json'));
  const nftABI = [
    'function setTransferWhitelist(address account, bool status) external',
    'function isWhitelisted(address account) external view returns (bool)'
  ];

  const nftContract = new ethers.Contract(
    process.env.NFT_V2_CONTRACT_ADDRESS,
    nftABI,
    deployerWallet
  );

  console.log('🔧 Setting up whitelists...');

  // 1. Whitelist Master Wallet
  console.log('\n1. Whitelisting Master Wallet...');
  const tx1 = await nftContract.setTransferWhitelist(
    process.env.MASTER_WALLET_ADDRESS,
    true,
    { gasLimit: 100000 }
  );
  await tx1.wait();
  console.log(`   ✅ Master Wallet whitelisted`);

  // 2. Whitelist Marketplace
  console.log('\n2. Whitelisting Marketplace...');
  const tx2 = await nftContract.setTransferWhitelist(
    process.env.MARKETPLACE_V2_CONTRACT_ADDRESS,
    true,
    { gasLimit: 100000 }
  );
  await tx2.wait();
  console.log(`   ✅ Marketplace whitelisted`);

  // Vérifications
  console.log('\n✅ Verifying whitelists...');
  const isMasterWhitelisted = await nftContract.isWhitelisted(process.env.MASTER_WALLET_ADDRESS);
  const isMarketplaceWhitelisted = await nftContract.isWhitelisted(process.env.MARKETPLACE_V2_CONTRACT_ADDRESS);

  console.log(`   Master Wallet: ${isMasterWhitelisted}`);
  console.log(`   Marketplace: ${isMarketplaceWhitelisted}`);
}

setupWhitelists().catch(console.error);
```

---

### 3.5 Script mint NFTs Base (CDP SDK v2)

**⚠️ IMPORTANT : TOUJOURS UTILISER CDP SDK V2 !**

**Fichier :** `scripts/base/7-mint-nfts-base-batch.cjs`

```javascript
const { CdpClient } = require('@coinbase/cdp-sdk');
const { encodeFunctionData } = require('viem');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function mintNFTs() {
  // Configurer CDP v2
  const cdp = new CdpClient();

  // Charger données
  const data = JSON.parse(fs.readFileSync('./data/nfts-to-mint-base.json'));
  
  console.log(`🚀 Minting ${data.totalNFTs} NFTs in ${data.batches.length} batches...`);

  // Récupérer Master Account v2
  const account = await cdp.evm.getOrCreateAccount({
    name: 'MasterWalletCyLimitBase'
  });
  
  console.log(`   Master Account: ${account.address}`);

  // MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  const NFT = mongoose.model('NFT');

  // ABI pour batchMint
  const nftAbi = [{
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "tokenURIs", "type": "string[]"}
    ],
    "name": "batchMint",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }];

  // Traiter chaque batch
  for (let i = 0; i < data.batches.length; i++) {
    const batch = data.batches[i];
    
    console.log(`\n📦 Batch ${i + 1}/${data.batches.length} (${batch.length} NFTs)`);

    try {
      // Extraire tokenURIs
      const tokenURIs = batch.map(nft => nft.tokenURI);

      // Encoder le call batchMint avec viem
      const callData = encodeFunctionData({
        abi: nftAbi,
        functionName: 'batchMint',
        args: [account.address, tokenURIs]
      });

      // Mint via CDP SDK v2
      const transactionResult = await cdp.evm.sendTransaction({
        address: account.address,
        transaction: {
          to: process.env.NFT_V2_CONTRACT_ADDRESS,
          data: callData
        },
        network: 'base-mainnet'
      });

      const txHash = transactionResult.transactionHash;
      
      console.log(`   ✅ ${batch.length} NFTs minted`);
      console.log(`   TX: https://basescan.org/tx/${txHash}`);

      // Calculer nouveaux tokenIds (séquentiels)
      const startTokenId = i * 100;

      // Update MongoDB
      for (let j = 0; j < batch.length; j++) {
        const nft = batch[j];
        const newTokenId = startTokenId + j;

        await NFT.findByIdAndUpdate(nft._id, {
          contractAddress: process.env.NFT_V2_CONTRACT_ADDRESS,
          tokenId: newTokenId.toString(),
          oldTokenId: nft.oldTokenId,
          network: 'base-mainnet',
          mintedOnBase: true,
          baseMintTxHash: txHash
        });
      }

      console.log(`   ✅ MongoDB updated`);

      // Sauvegarder progression
      fs.writeFileSync('./data/mint-progress.json', JSON.stringify({
        lastCompletedBatch: i,
        totalBatches: data.batches.length,
        nftsMinted: (i + 1) * 100,
        lastUpdate: new Date().toISOString()
      }, null, 2));

    } catch (error) {
      console.error(`   ❌ Error batch ${i + 1}:`, error.message);
      
      // Sauvegarder erreur
      fs.writeFileSync('./data/mint-error.json', JSON.stringify({
        failedBatch: i,
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      throw error;
    }

    // Pause entre batches (rate limiting)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ MINT COMPLET !');
  console.log(`   Total mintés: ${data.totalNFTs} NFTs`);
  console.log(`   Coût gas: Très faible sur Base 🎉`);
}

mintNFTs().catch(console.error);
```

---

## 🔧 PHASE 4 : BACKEND SERVICES (cylimit-admin-backend)

### 4.1 CoinbaseService (CDP SDK v2)

**⚠️ IMPORTANT : TOUJOURS UTILISER CDP SDK V2 !**

**Fichier :** `src/modules/coinbase/coinbase.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { CdpClient } from '@coinbase/cdp-sdk';
import { encodeFunctionData } from 'viem';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoinbaseService {
  private cdp: CdpClient;

  constructor(private configService: ConfigService) {
    // CDP SDK v2 charge automatiquement les env vars
    this.cdp = new CdpClient();
  }

  async getMasterAccount() {
    // Récupérer le Master Account par son nom
    return await this.cdp.evm.getOrCreateAccount({
      name: 'MasterWalletCyLimitBase'
    });
  }

  async createEmbeddedWallet(params: {
    userId: string;
    email: string;
  }) {
    // Créer un compte EVM pour l'utilisateur
    const account = await this.cdp.evm.createAccount({
      name: `user-${params.userId}`
    });

    return {
      address: account.address
    };
  }

  async sendTransaction(params: {
    accountName: string;
    to: string;
    data?: string;
    value?: bigint;
    network: string;
  }) {
    const account = await this.cdp.evm.getOrCreateAccount({
      name: params.accountName
    });

    const transactionResult = await this.cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: params.to,
        data: params.data,
        value: params.value
      },
      network: params.network
    });

    return {
      transactionHash: transactionResult.transactionHash
    };
  }

  async invokeContract(params: {
    accountName: string;
    contractAddress: string;
    abi: any[];
    functionName: string;
    args: any[];
    network: string;
  }) {
    const account = await this.cdp.evm.getOrCreateAccount({
      name: params.accountName
    });

    // Encoder le call avec viem
    const callData = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args
    });

    // Envoyer la transaction
    const transactionResult = await this.cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: params.contractAddress,
        data: callData
      },
      network: params.network
    });

    return {
      transactionHash: transactionResult.transactionHash
    };
  }
}
```

### 4.2 MigrationService

**Fichier :** `src/modules/migration/migration.service.ts`

**Implémentation complète selon `MIGRATION-POLYGON-BASE.md` lignes 507-627**

Fonctions :
- `createEmbeddedWallet(userId)` → Smart Account Base
- `migrateUserUSDC(userId)` → Transfer gasless Master → User
- `migrateUserNFTs(userId)` → Batch transfer NFTs
- `autoMigrateOnLogin(userId)` → Orchestration complète

---

## 📊 PHASE 5 : MODELS MONGODB

### 5.1 Update User Schema

**Fichiers à modifier :**
- `cylimit-admin-backend/src/admin/users/users.schema.ts`
- `cylimit-backend-develop/src/modules/user/schemas/user.schema.ts`

**Ajouter :**
```typescript
// Base Wallet
baseWalletAddress: { type: String, default: null },

// Migration Status
migrationStatus: { 
  type: String, 
  enum: ['pending', 'usdc_transferred', 'nfts_transferred', 'completed'],
  default: null
},
migratedAt: { type: Date, default: null }
```

### 5.2 Update NFT Schema

**Fichiers à modifier :**
- `cylimit-admin-backend/src/admin/nfts/nfts.schema.ts`
- `cylimit-backend-develop/src/modules/nft/schemas/nft.schema.ts`

**Ajouter :**
```typescript
// Base Blockchain
network: { type: String, enum: ['polygon', 'base-mainnet'], default: 'polygon' },
oldTokenId: { type: String, default: null },
oldContractAddress: { type: String, default: null },
mintedOnBase: { type: Boolean, default: false },
baseMintTxHash: { type: String, default: null },

// Storage Pinata (remplacement Fleek)
imageUrlPinata: { type: String, default: null },
imageCID: { type: String, default: null },
metadataUrlPinata: { type: String, default: null },
metadataCID: { type: String, default: null },

// Storage Google Cloud (remplacement AWS)
imageUrlGoogle: { type: String, default: null },
metadataUrlGoogle: { type: String, default: null },

// Old Storage (deprecated)
oldImageUrl: { type: String, default: null }, // Archive AWS
oldCid: { type: String, default: null } // Archive Fleek
```

---

## 📝 PHASE 6 : DOCUMENTATION

### 6.1 README Scripts

**Fichier :** `scripts/base/README.md`

```markdown
# Scripts Migration Base

## Ordre d'exécution

### Phase 1 : Migration Storage (AVANT blockchain)
1. `1-migrate-images-dual-storage.cjs` (AWS → Pinata + Google)
2. `2-rebuild-metadata-dual-storage.cjs` (Format mint.py)

Durée : ~6 heures (31,450 NFTs)

### Phase 2 : Setup Base
3. `3-create-master-server-wallet.cjs`
4. `4-deploy-nft-v2-base.cjs`
5. `5-deploy-marketplace-v2-base.cjs`
6. `6-setup-whitelists.cjs`

Durée : ~1 heure

### Phase 3 : Mint NFTs
7. `7-mint-nfts-base-batch.cjs` (315 batches)

Durée : ~2 heures
Coût : $0 (gasless)

## Prérequis

- CDP API Key (`cdp_api_key.json`)
- Google Service Account Key (`cylimit-service-key.json`)
- Pinata JWT token
- DEPLOYER_PRIVATE_KEY (wallet MetaMask pour deploy)
- MongoDB accessible

## Variables .env requises

Voir section 1.3 du plan principal.
```

---

## 📋 LISTE COMPLÈTE DES FICHIERS À CRÉER

### Scripts (7 fichiers)
1. `scripts/base/1-migrate-images-dual-storage.cjs` - Migration images AWS → Pinata + Google
2. `scripts/base/2-rebuild-metadata-dual-storage.cjs` - Rebuild metadata format mint.py
3. `scripts/base/3-create-master-server-wallet.cjs` - Création Master Wallet CDP
4. `scripts/base/4-deploy-nft-v2-base.cjs` - Déploiement NFT v2 sur Base
5. `scripts/base/5-deploy-marketplace-v2-base.cjs` - Déploiement Marketplace sur Base
6. `scripts/base/6-setup-whitelists.cjs` - Whitelist Master + Marketplace
7. `scripts/base/7-mint-nfts-base-batch.cjs` - Mint 31,450 NFTs

### Services Backend (6 modules)
1. `src/modules/coinbase/coinbase.service.ts` - CDP SDK wrapper
2. `src/modules/coinbase/coinbase.module.ts`
3. `src/modules/migration/migration.service.ts` - Migration auto users
4. `src/modules/migration/migration.controller.ts`
5. `src/modules/migration/migration.module.ts`
6. `src/modules/marketplace/services/auction.service.ts` - Enchères auto-bid
7. `src/modules/marketplace/services/offer.service.ts` - Offres 1-to-1 unifiées
8. `src/modules/marketplace/services/collection-offer.service.ts` - Offres publiques

### Documentation
1. `scripts/base/README.md` - Guide exécution scripts

### Dossiers Archive
1. `old_polygon/contracts/` - Anciens contrats Polygon
2. `old_polygon/scripts/` - Anciens scripts Polygon

---

## ⏱️ DURÉE ESTIMÉE TOTALE

| Phase | Durée |
|-------|-------|
| Migration images (31,450) | 3h |
| Rebuild metadata (31,450) | 3h |
| Setup Base (wallets + deploy) | 1h |
| Mint NFTs (315 batches) | 2h |
| Backend services | 1-2 jours |
| Tests | 1 jour |
| **TOTAL** | **3-4 jours** |

---

## 💰 COÛTS ESTIMÉS

| Opération | Coût |
|-----------|------|
| Pinata (31,450 fichiers × 2) | $0 (plan gratuit < 1GB) |
| Google Storage (31,450 × 2) | ~$0.50/mois |
| Deploy NFT v2 | ~$0.10 |
| Deploy Marketplace | ~$0.08 |
| Whitelist (2 tx) | ~$0.02 |
| Mint 31,450 NFTs | **$0** (gasless CDP) |
| **TOTAL** | **~$0.20 + $0.50/mois** |

---

**Prêt pour exécution !** 🚀

