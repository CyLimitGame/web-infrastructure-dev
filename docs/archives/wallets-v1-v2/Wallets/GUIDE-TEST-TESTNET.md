# 🧪 GUIDE - TEST SUR POLYGON AMOY TESTNET

**Date :** 15 Octobre 2025  
**Objectif :** Tester les contrats NFT v2 et Marketplace v2 sur testnet AVANT le déploiement mainnet  
**Status :** ✅ Recommandé

---

## 🎯 POURQUOI TESTER SUR TESTNET ?

### ✅ Avantages

1. **Zéro risque financier** : Les tokens testnet n'ont aucune valeur
2. **Test des fonctionnalités** : `batchMint()`, `batchTransfer()`, marketplace
3. **Estimation gas costs** : Coûts réels avant mainnet
4. **Validation logique** : Détecter bugs avant production
5. **Apprentissage** : Se familiariser avec le processus

### ⚠️ Inconvénients

- Temps supplémentaire : ~1-2 heures
- Configuration testnet requise

**Verdict : ✅ FORTEMENT RECOMMANDÉ pour un projet avec 25,000 NFTs !**

---

## 📋 PRÉREQUIS

### 1. Obtenir des POL testnet (gratuit)

**Faucets disponibles :**

#### Option A : Polygon Faucet (recommandé)
```
URL : https://faucet.polygon.technology/
```
1. Sélectionner **Amoy Testnet**
2. Coller ton adresse : `0x2d1280ed2C6630980E293A972dAD2eE77E9Bed4B`
3. Compléter le CAPTCHA
4. Recevoir **0.2 POL testnet** (suffisant !)

#### Option B : Alchemy Faucet
```
URL : https://www.alchemy.com/faucets/polygon-amoy
```
1. Se connecter avec GitHub/Twitter
2. Coller ton adresse
3. Recevoir **0.5 POL testnet**

---

### 2. Vérifier la configuration Hardhat

**Fichier : `cylimit-admin-backend/hardhat.config.js`**

```javascript
networks: {
  amoy: {
    url: process.env.ALCHEMY_POLYGON_TESTNET_RPC_URL || 
         'https://rpc-amoy.polygon.technology/',
    accounts: [process.env.MASTER_NEW_WALLET_PRIVATE_KEY],
    chainId: 80002,
  },
  polygon: {
    url: process.env.ALCHEMY_POLYGON_API_KEY
      ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_API_KEY}`
      : 'https://polygon-rpc.com',
    accounts: [process.env.MASTER_NEW_WALLET_PRIVATE_KEY],
    chainId: 137,
  },
}
```

**⚠️ PROBLÈME : Tu utilises un Coinbase Server Wallet !**

Le Master New Wallet est géré par Coinbase (pas de private key accessible).

**Solutions :**

#### Option 1 : Créer un wallet temporaire pour tests (RECOMMANDÉ)
```bash
cd cylimit-admin-backend
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey); console.log('Mnemonic:', w.mnemonic.phrase);"
```

**Résultat :**
```
Address: 0xTEST...
Private Key: 0xabc123...
Mnemonic: word1 word2 ... word24
```

**Actions :**
1. Copier la **Private Key** dans `.env` :
   ```bash
   TEST_WALLET_PRIVATE_KEY=0xabc123...
   ```
2. Obtenir POL testnet pour cette adresse via faucet
3. Utiliser ce wallet pour les tests testnet

#### Option 2 : Utiliser CDP SDK pour testnet (plus complexe)
```javascript
// Créer un account testnet via CDP
const testAccount = await cdp.evm.createAccount({
  name: 'Test-Wallet-Amoy'
});
```

**Verdict : Option 1 est plus simple pour les tests !**

---

## 🚀 PROCESSUS DE TEST

### Étape 1 : Créer wallet de test

```bash
cd cylimit-admin-backend
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Test Wallet Address:', w.address); console.log('Test Wallet Private Key:', w.privateKey);"
```

**Copier dans `.env` :**
```bash
# Test wallet (Amoy testnet only)
TEST_WALLET_ADDRESS=0xTEST...
TEST_WALLET_PRIVATE_KEY=0xabc123...
```

---

### Étape 2 : Obtenir POL testnet

1. **Aller sur :** https://faucet.polygon.technology/
2. **Réseau :** Amoy Testnet
3. **Adresse :** `0xTEST...` (ton test wallet)
4. **Recevoir :** 0.2 POL testnet

**Vérifier balance :**
```bash
node -e "const ethers = require('ethers'); const p = new ethers.providers.JsonRpcProvider('https://rpc-amoy.polygon.technology/'); p.getBalance('0xTEST...').then(b => console.log('Balance:', ethers.utils.formatEther(b), 'POL'));"
```

---

### Étape 3 : Modifier le script de déploiement pour testnet

**Créer `hardhat.config.testnet.js` :**
```javascript
require('dotenv').config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: 'https://rpc-amoy.polygon.technology/',
      accounts: [process.env.TEST_WALLET_PRIVATE_KEY],
      chainId: 80002,
    },
  },
};
```

---

### Étape 4 : Déployer NFT v2 sur testnet

```bash
cd cylimit-admin-backend
HARDHAT_CONFIG=hardhat.config.testnet.js node scripts/deploy-nft-v2-testnet.js
```

**Résultat attendu :**
```
🧪 DÉPLOIEMENT CyLimitNFT_v2 sur POLYGON AMOY TESTNET
======================================================================

📋 Vérifications préliminaires...

✅ Deployer address : 0xTEST...
✅ Deployer balance  : 0.2 POL (testnet)
✅ Network           : amoy (TESTNET)

🔨 Compilation du contrat...
✅ Contrat compilé

⛽ Estimation du gas...
Gas price actuel : 30 gwei
Coût estimé : 0.09 POL (testnet)

🚀 Démarrage du déploiement...
⏳ Attente de la confirmation de déploiement...
✅ Contrat déployé avec succès !

📍 Adresse du contrat :
   0xNFT_V2_TESTNET...

🔗 LIENS UTILES :
   Polygonscan Amoy : https://amoy.polygonscan.com/address/0xNFT_V2_TESTNET...
```

---

### Étape 5 : Tester batchMint()

**Créer `scripts/test-batch-mint-testnet.js` :**
```javascript
const hre = require('hardhat');

async function main() {
  const nftAddress = '0xNFT_V2_TESTNET...'; // Depuis déploiement
  const nft = await hre.ethers.getContractAt('CyLimitNFT_v2', nftAddress);

  // Test batch mint de 10 NFTs
  const tokenURIs = Array.from({ length: 10 }, (_, i) => 
    `ipfs://QmTest${i}/metadata.json`
  );

  console.log('⏳ Minting 10 NFTs...');
  const tx = await nft.batchMint(
    '0xTEST...', // ton test wallet
    tokenURIs
  );
  await tx.wait();

  console.log('✅ 10 NFTs mintés !');
  console.log('TX:', tx.hash);
}

main().catch(console.error);
```

**Exécuter :**
```bash
HARDHAT_CONFIG=hardhat.config.testnet.js node scripts/test-batch-mint-testnet.js
```

---

### Étape 6 : Vérifier sur Polygonscan Amoy

```
https://amoy.polygonscan.com/address/0xNFT_V2_TESTNET...
```

**Vérifications :**
- ✅ Contrat déployé
- ✅ 10 NFTs mintés
- ✅ Owner = test wallet
- ✅ Gas cost raisonnable

---

### Étape 7 : Tester batchTransfer()

**Créer un 2ème wallet de test :**
```bash
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Wallet 2:', w.address);"
```

**Test transfer :**
```javascript
// scripts/test-batch-transfer-testnet.js
const nft = await hre.ethers.getContractAt('CyLimitNFT_v2', nftAddress);

// Whitelist les 2 wallets
await nft.addToWhitelist('0xTEST1...');
await nft.addToWhitelist('0xTEST2...');

// Transfer 5 NFTs
const tx = await nft.batchTransfer(
  '0xTEST1...', // from
  '0xTEST2...', // to
  [0, 1, 2, 3, 4] // tokenIds
);
await tx.wait();

console.log('✅ 5 NFTs transférés !');
```

---

### Étape 8 : Estimer les coûts pour 25,000 NFTs

**Calcul :**
```
Coût 10 NFTs (testnet) : X POL
Coût 25,000 NFTs = (X / 10) * 25,000

Exemple :
- 10 NFTs = 0.01 POL
- 25,000 NFTs = 25 POL (sur mainnet)
```

**Comparer avec le budget :**
- Balance actuelle : 50 POL
- Estimation mainnet : ~25 POL
- ✅ Suffisant !

---

## ✅ CHECKLIST DE VALIDATION

**Avant de passer au mainnet, vérifier :**

- [ ] NFT v2 déployé sur testnet
- [ ] `batchMint()` fonctionne (test avec 10-100 NFTs)
- [ ] `batchTransfer()` fonctionne
- [ ] Whitelisting fonctionne
- [ ] Gas costs raisonnables
- [ ] Marketplace v2 déployé sur testnet (optionnel)
- [ ] Marketplace fonctionne (listing, buy, offers)
- [ ] Tous les tests passent ✅

**Une fois validé :**
```bash
# Déployer sur mainnet
cd cylimit-admin-backend
NETWORK=polygon node scripts/deploy-nft-v2-mainnet.js
```

---

## 🆘 TROUBLESHOOTING

### Erreur : "insufficient funds"
**Solution :** Obtenir plus de POL testnet via faucet

### Erreur : "nonce too low"
**Solution :** Attendre 30 secondes et réessayer

### Contrat non vérifié sur Polygonscan
**Solution :** 
```bash
npx hardhat verify --network amoy 0xNFT_V2_TESTNET... "CyLimit Riders V2 (TEST)" "CYLMT-TEST" "0xTEST..."
```

---

## 🎯 RECOMMANDATION FINALE

**Pour CyLimit avec 25,000 NFTs :**

✅ **TESTER SUR TESTNET EST FORTEMENT RECOMMANDÉ**

**Raisons :**
1. Volume important de NFTs (25,000)
2. Première utilisation de `batchMint()`
3. Budget gas significatif (~25-50 POL)
4. Migration critique pour users

**Temps requis :**
- Setup testnet : 30 minutes
- Tests : 1 heure
- **Total : 1h30**

**Bénéfices :**
- ✅ Confiance 100% avant mainnet
- ✅ Estimation gas précise
- ✅ Bugs détectés avant production
- ✅ Économie potentielle si bugs trouvés

---

## 📝 ALTERNATIVE : SKIP TESTNET (NON RECOMMANDÉ)

**Si tu veux skip le testnet :**

**Raisons valables :**
- Contrat déjà testé sur autre projet
- Urgence production
- Budget gas très faible (< 5 POL)

**Précautions :**
- ✅ Vérifier 3 fois le code
- ✅ Audit du contrat
- ✅ Backup de la DB avant remint
- ✅ Test avec 1 NFT sur mainnet d'abord

---

**Décision finale : Tester sur testnet ou passer directement au mainnet ? 🤔**

