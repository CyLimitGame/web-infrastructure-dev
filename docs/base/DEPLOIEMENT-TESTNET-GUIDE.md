# 🚀 GUIDE DÉPLOIEMENT BASE SEPOLIA TESTNET

**Date :** 17 Octobre 2025  
**Réseau :** Base Sepolia  
**Méthode :** Remix IDE (Recommandé)

---

## ✅ PRÉ-REQUIS

### 1. ETH Testnet sur Base Sepolia

Tu dois avoir **~0.01 ETH** sur un wallet pour payer le gas de déploiement.

**Obtenir de l'ETH testnet :**

🔗 **Coinbase Faucet (Recommandé)** :  
https://portal.cdp.coinbase.com/products/faucet
- Login avec ton compte CDP
- Sélectionne "Base Sepolia"
- Colle l'adresse de ton wallet de déploiement
- Demande 0.05 ETH

🔗 **Alchemy Faucet** :  
https://sepoliafaucet.com/
- Connecte ton wallet
- Sélectionne "Base Sepolia"

**Quelle adresse utiliser ?**
- ✅ Importe la clé privée de ton Master Wallet dans MetaMask
- ✅ Ou utilise un wallet de déploiement dédié (puis tu changes l'owner après)

---

## 📝 ÉTAPE 1 : CONFIGURATION METAMASK

### Ajouter Base Sepolia à MetaMask

**Network Settings :**
```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

**Vérifier balance :**
- Ouvre MetaMask
- Sélectionne "Base Sepolia"
- Tu dois voir ~0.01 ETH ou plus

---

## 🎨 ÉTAPE 2 : DÉPLOYER CONTRAT NFT (CyLimitNFT_v2)

### 2.1 Ouvrir Remix IDE

🔗 https://remix.ethereum.org

### 2.2 Créer le fichier contrat

1. Clique sur "File Explorer" (icône dossier, en haut à gauche)
2. Clique sur "Create New File"
3. Nom : `CyLimitNFT_v2.sol`

### 2.3 Copier le code du contrat

Copie tout le contenu de :
```
cylimit-admin-backend/contracts/CyLimitNFT_v2.sol
```

Et colle-le dans Remix.

### 2.4 Compiler le contrat

1. Clique sur "Solidity Compiler" (icône avec S, barre latérale gauche)
2. Compiler Version : Sélectionne **0.8.20**
3. EVM Version : **paris** (par défaut)
4. Optimizer : **Enabled (200 runs)**
5. Clique sur **"Compile CyLimitNFT_v2.sol"**

**Vérification :**
- ✅ Aucune erreur rouge
- ⚠️ Warnings OK (ignorables)
- ✅ Green checkmark sur l'icône compiler

### 2.5 Déployer le contrat

1. Clique sur "Deploy & Run Transactions" (icône Ethereum avec flèche)
2. **Environment** : Sélectionne **"Injected Provider - MetaMask"**
3. MetaMask popup → Confirme la connexion
4. **Contract** : Sélectionne **"CyLimitNFT_v2"**
5. **Constructor Parameters** (développe en cliquant sur ▼) :
   ```
   name: "CyLimit V2 Testnet"
   symbol: "CYLMT-TEST"
   initialOwner: 0x214FB13515453265713E408D59f1819474F1f873
   ```

**⚠️ IMPORTANT :** Vérifie bien l'adresse `initialOwner` (ton Master Wallet CDP).

6. Clique sur **"Deploy"** (bouton orange)
7. MetaMask popup → **Confirme la transaction**
8. Attends ~10-30 secondes

**Résultat :**
- ✅ Contrat déployé apparaît en bas (section "Deployed Contracts")
- ✅ Tu verras une adresse : `0xNFT_CONTRACT_ADDRESS`

### 2.6 Sauvegarder l'adresse NFT

**📋 Copie l'adresse du contrat déployé :**
```
NFT_V2_CONTRACT_ADDRESS_TESTNET = 0x...
```

**Ajoute dans `.env` :**
```bash
# Base Sepolia Testnet
TESTNET_NFT_V2_CONTRACT_ADDRESS=0x...
```

**Vérifier sur Basescan :**
```
https://sepolia.basescan.org/address/0xNFT_CONTRACT_ADDRESS
```

---

## 🏪 ÉTAPE 3 : DÉPLOYER CONTRAT MARKETPLACE

### 3.1 Adresse USDC Base Sepolia

**✅ USDC Officiel sur Base Sepolia :**

```
USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

**Vérifié via :**
- 🔗 Coinbase Developer Platform Documentation
- 🔗 CDP SDK supporte nativement "usdc" sur Base Sepolia
- 🔗 Basescan Sepolia : https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e

**Caractéristiques :**
- ✅ Token ERC-20 standard
- ✅ 6 décimales (comme USDC mainnet)
- ✅ Compatible EIP-3009 (`transferWithAuthorization`)
- ✅ Transactions USDC **gasless** avec CDP Server Wallet 🎉

**Comment obtenir de l'USDC testnet ?**

Tu peux utiliser les **CDP Faucet** ou demander via Discord :
- 🔗 https://portal.cdp.coinbase.com/products/faucet
- 🔗 Discord CDP #faucet channel

### 3.2 Créer le fichier Marketplace

1. Create New File : `CyLimitMarketplace_v2_Base.sol`
2. Copie tout le contenu de :
   ```
   cylimit-admin-backend/contracts/CyLimitMarketplace_v2_Base.sol
   ```

### 3.3 Compiler le Marketplace

1. Solidity Compiler
2. Version : **0.8.20**
3. Compile

### 3.4 Déployer le Marketplace

1. Deploy & Run Transactions
2. Contract : **"CyLimitMarketplace"**
3. Constructor Parameters :
   ```
   _nftContract: 0xNFT_CONTRACT_ADDRESS (copié de l'étape 2.6)
   _usdcContract: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
   initialOwner: 0x214FB13515453265713E408D59f1819474F1f873
   ```
4. Deploy
5. Confirme dans MetaMask

**Résultat :**
```
MARKETPLACE_V2_CONTRACT_ADDRESS_TESTNET = 0x...
```

**Ajoute dans `.env` :**
```bash
TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS=0x...
TESTNET_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

---

## ⚙️ ÉTAPE 4 : CONFIGURATION INITIALE

### 4.1 Whitelist le Marketplace dans le contrat NFT

**Dans Remix, section "Deployed Contracts" :**

1. Développe **CyLimitNFT_v2** (contrat déployé)
2. Trouve la fonction **`setTransferWhitelist`**
3. Paramètres :
   ```
   account: 0xMARKETPLACE_CONTRACT_ADDRESS
   status: true
   ```
4. Clique **"transact"**
5. Confirme dans MetaMask

**Vérification :**
- Appelle `isWhitelisted(0xMARKETPLACE_ADDRESS)`
- Résultat doit être : `true`

### 4.2 Whitelist le Master Wallet (déjà fait dans constructor)

Vérifie :
```
isWhitelisted(0x214FB13515453265713E408D59f1819474F1f873)
→ true ✅
```

---

## 🧪 ÉTAPE 5 : TESTS BASIQUES

### Test 1 : Mint un NFT

**Dans CyLimitNFT_v2 déployé :**

1. Fonction : **`mint`**
2. Paramètres :
   ```
   to: 0x214FB13515453265713E408D59f1819474F1f873
   tokenURI: ipfs://QmTest123
   ```
3. Transact
4. Confirme MetaMask

**Vérification :**
```
ownerOf(0) → 0x214FB...873 ✅
tokenURI(0) → ipfs://QmTest123 ✅
totalSupply() → 1 ✅
```

### Test 2 : Escrow USDC (avec USDC testnet officiel)

#### **Étape 2.1 : Obtenir de l'USDC testnet**

🔗 **CDP Faucet** : https://portal.cdp.coinbase.com/products/faucet
1. Connecte-toi à ton compte CDP
2. Sélectionne "Base Sepolia"
3. Colle ton adresse : `0x214FB13515453265713E408D59f1819474F1f873`
4. **Sélectionne "USDC"** dans le menu déroulant
5. Clique "Request"
6. Attends quelques secondes

**💰 Montant reçu :** 10 USDC par jour maximum (largement suffisant pour tester !)

**Vérifier réception :**
- Tu peux vérifier sur Basescan : https://sepolia.basescan.org/address/0x214FB13515453265713E408D59f1819474F1f873
- Ou directement dans Remix (voir ci-dessous)

---

#### **Étape 2.2 : Charger le contrat USDC dans Remix**

**✅ MÉTHODE SIMPLIFIÉE : Utiliser IERC20 (Interface standard)**

**Tu as raison !** On peut utiliser `IERC20` directement car c'est l'interface standard ERC-20 qui contient toutes les fonctions nécessaires (`approve`, `balanceOf`, `transfer`, etc.).

**Dans Remix :**

1. **Va dans "Deploy & Run Transactions"** (icône Ethereum avec flèche, barre latérale gauche)

2. **Assure-toi que :**
   - **Environment** : "Injected Provider - MetaMask" ✅
   - **Account** : Ton compte connecté (`0x214FB...873`)
   - **Network** (dans MetaMask) : Base Sepolia ✅

3. **Dans le menu déroulant "CONTRACT" :**
   - Cherche et sélectionne **"IERC20"** 
   - ⚠️ **NE CLIQUE PAS sur "Deploy" !** ← Tu verras une erreur "abstract contract"
   - **IGNORE le bouton "Deploy"** complètement

4. **DESCENDS en bas de la page (scroll down) pour trouver "At Address" :**
   
   **⚠️ C'EST ICI QUE TU DOIS ALLER :**
   ```
   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │  [Deploy] ← IGNORE CE BOUTON (erreur normale)  │
   │                                                 │
   │  ────────────────────────────                  │
   │                                                 │
   │  Load contract from Address  ← VA ICI          │
   │                                                 │
   │  At Address                                     │
   │  [0x036CbD53842c5426634e7929541eC2318f3dCF7e]  │
   │  [At Address] ← CLIQUE ICI                     │
   │                                                 │
   └─────────────────────────────────────────────────┘
   ```

5. **Dans le champ "At Address" :**
   - Colle : `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Clique sur le bouton rose/orange **"At Address"** (sous le champ)

6. **Résultat : Le contrat USDC apparaît** dans "Deployed Contracts"
   ```
   ┌─────────────────────────────────────────────┐
   │ > IERC20 at 0x036C...CF7e (Base Sepolia)   │  ← Clique sur >
   └─────────────────────────────────────────────┘
   ```

7. **Développe-le en cliquant sur `>`**
   
   **Tu verras les fonctions ERC-20 standard :**
   - 🔵 `balanceOf` (bleu = lecture)
   - 🟠 `approve` (orange = écriture)
   - 🔵 `allowance` (bleu)
   - 🟠 `transfer` (orange)
   - 🔵 `totalSupply` (bleu)
   - ... et d'autres

✅ **Le contrat USDC est maintenant chargé et prêt à être utilisé !**

**📚 Confirmé par Coinbase Developer Platform :**
L'adresse `0x036CbD53842c5426634e7929541eC2318f3dCF7e` est bien l'USDC officiel sur Base Sepolia avec 6 décimales.

---

#### **Étape 2.3 : Vérifier ta balance USDC (Optionnel)**

**Dans le contrat USDC déployé :**

1. Trouve la fonction **`balanceOf`** (bouton bleu)
2. Entre ton adresse : `0x214FB13515453265713E408D59f1819474F1f873`
3. Clique **"call"**
4. Résultat affiché :
   ```
   uint256: 10000000 (si tu as reçu 10 USDC du faucet)
   ```
   _Note : 10000000 = 10 USDC (6 décimales)_

---

#### **Étape 2.4 : Approuver le Marketplace pour dépenser ton USDC**

**Pourquoi cette étape ?**
- Le Marketplace doit avoir la permission de transférer tes USDC
- C'est le mécanisme standard ERC-20

**Dans le contrat USDC déployé :**

1. Trouve la fonction **`approve`** (bouton orange)
2. **Paramètres :**
   ```
   spender: 0xTON_MARKETPLACE_ADDRESS
   amount: 5000000
   ```
   _Note : 5000000 = 5 USDC (6 décimales)_
   
   **💡 Pourquoi 5 USDC ?**
   - Tu as reçu 10 USDC du faucet
   - On teste avec 5 USDC pour garder de la marge
   - C'est largement suffisant pour tester l'escrow !

3. Clique **"transact"** (bouton orange)
4. **MetaMask popup** → Confirme la transaction
5. Attends la confirmation (~5-10 secondes)

**Résultat attendu :**
```
status: true (transaction réussie)
```

---

#### **Étape 2.5 : Vérifier l'approbation (Optionnel)**

**Dans le contrat USDC déployé :**

1. Trouve la fonction **`allowance`** (bouton bleu)
2. **Paramètres :**
   ```
   owner: 0x214FB13515453265713E408D59f1819474F1f873
   spender: 0xTON_MARKETPLACE_ADDRESS
   ```
3. Clique **"call"**
4. **Résultat attendu :**
   ```
   uint256: 5000000 ✅ (5 USDC)
   ```

---

#### **Étape 2.6 : Escrow USDC dans le Marketplace**

**Dans le contrat Marketplace déployé :**

1. Trouve la fonction **`escrowUSDC`** (bouton orange)
2. **Paramètre :**
   ```
   amount: 5000000 (5 USDC)
   ```
3. Clique **"transact"**
4. MetaMask popup → Confirme
5. Attends la confirmation

**Résultat attendu :**
```
Event USDCEscrowed émis :
- user: 0x214FB...873
- amount: 5000000 (5 USDC)
```

---

#### **Étape 2.7 : Vérifier l'escrow**

**Dans le contrat Marketplace déployé :**

1. Trouve la fonction **`escrowedUSDC`** (bouton bleu)
2. **Paramètre :**
   ```
   address: 0x214FB13515453265713E408D59f1819474F1f873
   ```
3. Clique **"call"**
4. **Résultat attendu :**
   ```
   uint256: 5000000 ✅ (5 USDC)
   ```

**✅ Ton USDC est maintenant escrowed dans le Marketplace !**

---

#### **📋 Récapitulatif complet**

| Étape | Action | Résultat |
|-------|--------|----------|
| 1 | Obtenir USDC testnet (faucet) | Balance = 10 USDC |
| 2 | Charger USDC dans Remix | Contrat visible |
| 3 | `balanceOf(ton_adresse)` | 10000000 (10 USDC) |
| 4 | `approve(marketplace, 5 USDC)` | Allowance = 5 USDC |
| 5 | `allowance(toi, marketplace)` | 5000000 ✅ |
| 6 | `escrowUSDC(5 USDC)` | USDC transféré au contrat |
| 7 | `escrowedUSDC(ton_adresse)` | 5000000 ✅ |

---

#### **⚠️ Troubleshooting**

**Erreur : "ERC20: insufficient allowance"**
- ❌ Tu n'as pas appelé `approve()` ou le montant est insuffisant
- ✅ Appelle `approve(marketplace, 100000000)` d'abord

**Erreur : "ERC20: transfer amount exceeds balance"**
- ❌ Tu n'as pas assez d'USDC dans ton wallet
- ✅ Demande plus d'USDC au faucet CDP

**Le contrat USDC ne charge pas dans Remix**
- ❌ L'adresse est incorrecte
- ✅ Vérifie : `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- ✅ Vérifie que tu es sur Base Sepolia dans MetaMask

### Test 3 : Transfer NFT (via Marketplace)

**Setup :**
1. Mint NFT #1 pour Master Wallet
2. setApprovalForAll(Marketplace, true) dans NFT

**Test buyNFT :**
```
buyNFT(
  tokenId: 1,
  seller: 0x214FB...873
)
```

**Résultat attendu :**
- NFT transféré au buyer (msg.sender)
- totalSales = 1

---

## ✅ CHECKLIST FINALE TESTNET

- [ ] NFT Contract déployé : `0x...`
- [ ] Marketplace Contract déployé : `0x...`
- [ ] USDC testnet officiel : `0x036CbD53842c5426634e7929541eC2318f3dCF7e` ✅
- [ ] Marketplace whitelisté dans NFT
- [ ] Test mint : ✅
- [ ] Test escrow USDC : ✅
- [ ] Test buyNFT : ✅
- [ ] Adresses sauvegardées dans `.env`
- [ ] Contrats vérifiés sur Basescan (optionnel)

---

## 📝 ADDRESSES À SAUVEGARDER

```bash
# Base Sepolia Testnet Contracts
TESTNET_NFT_V2_CONTRACT_ADDRESS=
TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS=
TESTNET_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Basescan Links
TESTNET_NFT_BASESCAN=https://sepolia.basescan.org/address/...
TESTNET_MARKETPLACE_BASESCAN=https://sepolia.basescan.org/address/...
TESTNET_USDC_BASESCAN=https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

---

## 🚨 TROUBLESHOOTING

### Erreur : "Gas estimation failed"
- **Solution :** Vérifie que tu as assez d'ETH testnet

### Erreur : "Invalid address"
- **Solution :** Vérifie que les adresses commencent par `0x` et ont 42 caractères

### Erreur : "Transfer not allowed"
- **Solution :** Vérifie que le Marketplace est whitelisté via `setTransferWhitelist`

### Contrat ne se déploie pas
- **Solution :** Vérifie la version Solidity (0.8.20) et l'optimizer activé

---

## 🎉 PROCHAINES ÉTAPES

Une fois le testnet déployé et testé :

1. ✅ Valider l'architecture avec Coinbase (ton RDV)
2. ✅ Tests complets sur testnet (tous les flows)
3. ✅ Déploiement mainnet Base
4. ✅ Migration des 31k NFTs

---

**Bonne chance pour le déploiement ! 🚀**

Tiens-moi au courant si tu rencontres des problèmes !

