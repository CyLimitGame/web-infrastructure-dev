# 📜 CONTRAT CyLimitNFT_v2 - VERSION FINALE

**Date :** 17 Octobre 2025  
**Status :** ✅ READY FOR DEPLOYMENT  
**Fichier :** `cylimit-admin-backend/contracts/CyLimitNFT_v2.sol`  
**Version :** 2.0.0 - Architecture Finale

---

## 🎯 FONCTIONNALITÉS

### ✅ **Fonctionnalités Principales**

| Feature | Description | Implémenté |
|---------|-------------|------------|
| **Transfer Whitelist** | Seules les adresses whitelistées peuvent transférer | ✅ |
| **Batch Mint** | Mint jusqu'à 100 NFTs en une transaction | ✅ |
| **Batch Transfer** | Transfer jusqu'à 50 NFTs en une transaction | ✅ |
| **Burn** | **CyLimit uniquement** peut détruire un NFT (via app) | ✅ |
| **Pause/Unpause** | Arrêt d'urgence des transfers | ✅ |
| **Royalties 10%** | ERC2981 pour marketplaces externes | ✅ |
| **Ownable** | Gestion par owner (Master Wallet) | ✅ |
| **ERC721URIStorage** | Metadata IPFS par token | ✅ |
| **Approval Standard** | `setApprovalForAll` pour Marketplace | ✅ |

### ❌ **Non Implémenté (Volontairement)**

| Feature | Raison |
|---------|--------|
| **MAX_SUPPLY** | Flexibilité pour futures éditions (2025, 2026...) |
| **Enumerable** | Coûte trop de gas, pas nécessaire (tracking en DB) |

---

## 🔥 **NOUVELLES FONCTIONS**

### **1. Burn (Détruire NFT) - Avec Approval Sécurisé**

```solidity
function burn(uint256 tokenId) public whenNotPaused
```

**Qui peut appeler ?**
- ✅ **N'importe qui avec approval** du propriétaire du NFT
- ✅ Typiquement : **Backend CyLimit** (Master Wallet ou Marketplace)
- ✅ **User doit approuver via wallet** (signature explicite)

**Pourquoi Approval + Backend burn ?**
- ✅ **User signe explicitement** (approval via wallet popup)
- ✅ **CyLimit garde le contrôle** (backend appelle burn après approval)
- ✅ **Validation backend possible** (vérifications avant burn)
- ✅ **Sécurité renforcée** (double confirmation : app + wallet)

**Flow dans l'app CyLimit :**
```
1. User clique "Détruire mon NFT" sur l'app
2. Modal de confirmation : "⚠️ Cette action est irréversible !"
3. User confirme

4. User APPROUVE CyLimit pour ce NFT (SIGNATURE WALLET REQUISE)
   → Popup Coinbase Wallet : "Autoriser CyLimit à gérer ce NFT ?"
   → User clique "Approuver"
   
5. Backend CyLimit appelle burn(tokenId) avec l'approval
6. NFT détruit, user reçoit confirmation
```

**Code Frontend + Backend :**
```typescript
// ═══════════════════════════════════════════════════════════════════════
// FRONTEND : User approuve CyLimit
// ═══════════════════════════════════════════════════════════════════════

// User doit SIGNER cette transaction (popup Coinbase Wallet)
await userWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'approve',
  args: {
    to: MASTER_WALLET, // ou MARKETPLACE_CONTRACT
    tokenId: tokenId
  },
  paymasterUrl: PAYMASTER_URL // Gas sponsorisé
});

// ═══════════════════════════════════════════════════════════════════════
// BACKEND : CyLimit brûle avec l'approval
// ═══════════════════════════════════════════════════════════════════════

// Backend peut maintenant brûler car user a approuvé
await masterWallet.invokeContract({
  contractAddress: NFT_V2_CONTRACT,
  method: 'burn',
  args: { tokenId }
});
```

**Cas d'usage :**
- User demande à détruire son NFT (via app + signature wallet)
- CyLimit rachète et brûle un NFT défectueux (après approval user)
- Programme "burn to earn" (détruire pour gagner des points)

**Event émis :**
```solidity
event NFTBurned(uint256 indexed tokenId, address indexed burner);
```
_(burner = propriétaire du NFT au moment du burn)_

**Sécurité :**
- ✅ User **DOIT signer** l'approval via son wallet
- ✅ Backend ne peut **PAS** brûler sans approval user
- ✅ Gas sponsorisé ($0 pour le user)

**🔒 SÉCURITÉ CRITIQUE :**
- ✅ **`setApprovalForAll` NE permet PAS de burn** (protection supplémentaire)
- ✅ **Seul `approve(tokenId)` spécifique fonctionne** (approval par NFT)
- ✅ **User DOIT approuver CHAQUE burn individuellement**
- ✅ **Le Marketplace ne peut PAS brûler même avec setApprovalForAll**

**Voir documentation détaillée :** [SECURITE-BURN-APPROVALS.md](./SECURITE-BURN-APPROVALS.md)

---

### **2. Pause/Unpause (Sécurité)**

```solidity
function pause() public onlyOwner
function unpause() public onlyOwner
```

**Qui peut appeler ?** CyLimit uniquement (Master Wallet)

**Cas d'usage :**
- Bug critique détecté → pause immédiatement
- Maintenance contrat → arrêt temporaire
- Attaque en cours → protection des NFTs

**Effet :**
- ❌ Plus aucun transfer possible (mint/burn/transfer bloqués)
- ✅ Lecture toujours disponible (tokenURI, balanceOf, etc.)

---

### **3. Royalties 10% (ERC2981)**

```solidity
function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner
```

**Configuration actuelle :**
- **10% (1000 basis points)** → CyLimit
- Appliqué sur marketplaces externes (OpenSea, Blur, etc.)
- **N'affecte PAS** le marketplace CyLimit interne

**Modification possible :**
```javascript
// Changer à 5%
await nftContract.setDefaultRoyalty(MASTER_WALLET, 500);

// Changer à 2.5%
await nftContract.setDefaultRoyalty(MASTER_WALLET, 250);
```

**⚠️ Important :**
- Les royalties ne fonctionnent que si les NFTs sont transférables sur marketplaces externes
- Actuellement, les NFTs sont **whitelistés** donc **pas vendables sur OpenSea**
- Si tu whitelist OpenSea plus tard, les royalties s'activeront automatiquement

---

## 🔄 **APPROVALS & TRANSFERS**

### **Comment ça marche ?**

#### **Setup Initial (Une fois par user)**

Lorsqu'un user veut vendre/échanger des NFTs, il doit approuver le Marketplace **une seule fois** :

```typescript
// User donne approval au Marketplace pour TOUS ses NFTs
await userEmbeddedWallet.invokeContract({
  contractAddress: NFT_V2_CONTRACT,
  method: 'setApprovalForAll',
  args: {
    operator: MARKETPLACE_CONTRACT,
    approved: true
  }
});
```

**Résultat :**
- ✅ Le Marketplace peut transférer **tous** les NFTs du user
- ✅ Utilisé pour : ventes, swaps, offers acceptées
- ✅ **User signe UNE SEULE FOIS** au premier listing
- ✅ **Permanente** (jusqu'à révocation)

---

#### **Transfers Automatiques**

Une fois l'approval donnée, **aucune signature requise** pour les transfers ultérieurs :

```typescript
// EXEMPLE : User B achète NFT de User A

// User A a déjà fait setApprovalForAll(Marketplace, true) lors de son premier listing
// User B n'a PAS besoin d'approval (il reçoit simplement le NFT)

// Backend appelle :
await marketplaceContract.buyNFT(tokenId, userA.address);

// ☝️ Le Marketplace utilise son approval pour transférer : userA → userB
// Aucune signature requise !
```

**Pourquoi ça marche ?**
1. **User A** a approuvé le Marketplace (via `setApprovalForAll`)
2. **Marketplace** peut donc appeler `transferFrom(userA, userB, tokenId)`
3. **Aucune signature requise** au moment de l'achat
4. **User B reçoit** le NFT automatiquement

---

#### **Burn NFT (avec Approval Sécurisé)**

```typescript
// ═══════════════════════════════════════════════════════════════════════
// Flow sécurisé avec approval explicite
// ═══════════════════════════════════════════════════════════════════════

// 1. User clique "Détruire mon NFT" dans l'app
// 2. Modal de confirmation : "⚠️ Action irréversible !"
// 3. User confirme

// 4. User APPROUVE spécifiquement pour ce NFT
await userWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'approve',
  args: {
    to: MASTER_WALLET,
    tokenId: tokenId
  },
  paymasterUrl: PAYMASTER_URL // Gas sponsorisé
});

// ☝️ POPUP COINBASE WALLET apparaît ici
// User voit : "Autoriser CyLimit à gérer ce NFT ?"
// "⚠️ Cette autorisation permet la destruction du NFT"

// 5. Backend appelle burn() avec l'approval
await masterWallet.invokeContract({
  contractAddress: NFT_V2_CONTRACT,
  method: 'burn',
  args: { tokenId }
});
```

**Pourquoi Approval + Backend burn ?**
- ✅ User signe explicitement via wallet (sécurité maximale)
- ✅ CyLimit garde le contrôle (backend appelle burn)
- ✅ Validation backend avant destruction
- ✅ `setApprovalForAll` ne suffit PAS (protection supplémentaire)

---

#### **Récapitulatif Approvals**

| Action | Signature requise ? | Fréquence |
|--------|-------------------|-----------|
| **Premier listing** : `setApprovalForAll` | ✅ Oui | 1× |
| **Listings suivants** | ❌ Non (DB) | ∞× |
| **Vendre NFT** (seller) | ❌ Non | ∞× |
| **Acheter NFT** (buyer) | ✅ Oui (batch USDC) | ∞× |
| **Transfer (swap/offer)** | ✅ Oui (batch) | ∞× |
| **Burn NFT** | ✅ Oui (`approve(tokenId)`) | 1× par NFT |

---

## 🔐 **SÉCURITÉ**

### **Mécanismes de Protection**

1. ✅ **Ownable** : Seul le Master Wallet peut modifier le contrat
2. ✅ **Pausable** : Arrêt d'urgence possible
3. ✅ **Whitelist** : Contrôle total des transfers
4. ✅ **NonReentrant** : Protection contre les attaques de réentrance (via OpenZeppelin)
5. ✅ **Address(0) checks** : Validation des adresses

### **Audits & Standards**

- ✅ **OpenZeppelin 5.0.0** : Librairies auditées et sécurisées
- ✅ **Solidity 0.8.20** : Protection overflow/underflow native
- ✅ **ERC721** : Standard officiel Ethereum
- ✅ **ERC2981** : Standard royalties officiel
- ✅ **ERC165** : Interface detection

---

## 📊 **COMPATIBILITÉ**

### **Marketplaces Externes**

| Marketplace | Compatible | Notes |
|-------------|-----------|-------|
| **OpenSea** | ⚠️ Partiel | NFTs non transférables (whitelist), mais royalties détectées |
| **Blur** | ⚠️ Partiel | Idem OpenSea |
| **Rarible** | ⚠️ Partiel | Idem OpenSea |
| **LooksRare** | ⚠️ Partiel | Idem OpenSea |

**Pour activer les ventes externes :**
```solidity
// Whitelist OpenSea
nftContract.setTransferWhitelist("0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC", true);

// Whitelist Blur
nftContract.setTransferWhitelist("0x000000000000Ad05Ccc4F10045630fb830B95127", true);
```

---

## 💰 **COÛTS ESTIMÉS**

### **Déploiement**

| Réseau | Gas estimé | Coût (ETH) | Coût (USD) |
|--------|-----------|------------|------------|
| **Base Mainnet** | ~3,500,000 | 0.0035 ETH | ~$8 |
| **Base Sepolia (testnet)** | ~3,500,000 | 0.0 ETH (faucet) | $0 |

### **Opérations**

| Opération | Gas | Coût Base |
|-----------|-----|-----------|
| Mint 1 NFT | ~80,000 | ~$0.0002 |
| Batch Mint 100 NFTs | ~5,000,000 | ~$0.012 |
| Transfer 1 NFT | ~50,000 | ~$0.00012 |
| Burn 1 NFT | ~30,000 | ~$0.00007 |
| Pause | ~30,000 | ~$0.00007 |
| Whitelist 1 address | ~45,000 | ~$0.0001 |

---

## 🚀 **DÉPLOIEMENT**

### **Prérequis**

1. ✅ Master Wallet CDP v2 créé : `0x214FB13515453265713E408D59f1819474F1f873`
2. ✅ ETH testnet sur Base Sepolia (pour testnet)
3. ✅ Contrat compilé (Remix IDE ou Hardhat)

### **Paramètres Constructor**

```solidity
constructor(
    string memory name,        // "CyLimit V2"
    string memory symbol,      // "CYLMT"
    address initialOwner       // 0x214FB13515453265713E408D59f1819474F1f873
)
```

### **Étapes Déploiement**

#### **Option A : Remix IDE (Recommandé)** ✅

1. Aller sur https://remix.ethereum.org
2. Créer `contracts/CyLimitNFT_v2.sol`
3. Copier le contrat depuis `cylimit-admin-backend/contracts/CyLimitNFT_v2.sol`
4. Compiler avec Solidity 0.8.20
5. Deploy & Run :
   - Environment : "Injected Provider - MetaMask"
   - Network : Base Sepolia (testnet) ou Base Mainnet (prod)
   - Constructor params :
     - `name` : "CyLimit V2 Testnet" (ou "CyLimit V2")
     - `symbol` : "CYLMT-TEST" (ou "CYLMT")
     - `initialOwner` : `0x214FB13515453265713E408D59f1819474F1f873`
6. Cliquer "Deploy"
7. Copier l'adresse du contrat déployé

#### **Option B : Hardhat (Si configuré)**

```bash
npx hardhat compile
npx hardhat run scripts/base/testnet/1-deploy-nft-v2-sepolia-hardhat.cjs --network baseSepolia
```

---

## 📝 **POST-DÉPLOIEMENT**

### **1. Sauvegarder l'adresse**

Ajouter dans `.env` :
```bash
# Testnet
TESTNET_NFT_V2_CONTRACT_ADDRESS=0x...

# Mainnet (plus tard)
NFT_V2_CONTRACT_ADDRESS=0x...
```

### **2. ⚠️ CRITIQUE : Vérifier le contrat sur Basescan (IMMÉDIATEMENT après déploiement)**

**🔴 À FAIRE DANS LES 5 MINUTES SUIVANT LE DÉPLOIEMENT ! 🔴**

**Pourquoi c'est critique ?**
- ✅ Vérifier que le code source correspond EXACTEMENT au bytecode déployé
- ✅ Éviter les problèmes de vérification plus tard (modifications du code)
- ✅ Transparence publique du contrat
- ✅ Permet aux users d'interagir directement via Basescan

**Méthode recommandée : Plugin Remix Contract Verification**

1. **Dans Remix (encore ouvert après le déploiement) :**
   - Clique sur 🔌 **Plugin Manager**
   - Active **"Contract Verification - Etherscan"**
   
2. **Configure l'API Key :**
   - Obtiens une API Key gratuite : https://basescan.org/myapikey
   - Dans le plugin, clique **"Enable"**
   - Entre ton API Key
   - Sélectionne : **Base Mainnet** (ou Base Sepolia pour testnet)

3. **Vérifie le contrat :**
   - **Chain** : `Base Mainnet` (ou `Base Sepolia`)
   - **Contract Address** : L'adresse que tu viens de déployer
   - **Contract Name** : `CyLimitNFT_v2`
   - **Constructor Arguments** :
     - `name` : `CyLimit V2` (exactement comme lors du déploiement)
     - `symbol` : `CYLMT` (exactement comme lors du déploiement)
     - `initialOwner` : `0x214FB13515453265713E408D59f1819474F1f873`
   - ✅ Coche **"Verify on Etherscan"**
   - Clique **Verify**

4. **Confirmation :**
   - Tu devrais voir un ✅ vert après ~30 secondes
   - Va sur Basescan : https://basescan.org/address/[TON_ADRESSE]#code
   - Tu devrais voir "Contract Source Code Verified (Exact Match)" ✅

**⚠️ Si la vérification échoue :**
- ❌ **NE MODIFIE PLUS LE CODE DU CONTRAT !**
- Le bytecode déployé est maintenant la référence
- Si tu modifies le code, il ne correspondra plus jamais

**📖 Documentation :**
https://docs.etherscan.io/contract-verification/verify-with-remix

---

### **3. Whitelist les adresses essentielles**

```javascript
// Whitelist Marketplace
await nftContract.setTransferWhitelist(MARKETPLACE_CONTRACT_ADDRESS, true);

// Whitelist Master Wallet (déjà fait dans constructor)
// await nftContract.setTransferWhitelist(MASTER_WALLET_ADDRESS, true);
```

### **4. Vérifier sur Basescan**

```
Testnet : https://sepolia.basescan.org/address/0x...
Mainnet : https://basescan.org/address/0x...
```

**✅ Le contrat doit afficher "Contract Source Code Verified" !**

### **5. Enregistrer dans CDP Portal**

1. Aller sur https://portal.cdp.coinbase.com/
2. Onchain Tools → Data → Smart Contracts
3. Register Smart Contract
4. Remplir :
   - Address : `0x...`
   - Network : `base-mainnet` (ou `base-sepolia`)
   - Name : "CyLimitNFT_v2"
   - ABI : Copier depuis Remix ou `artifacts/`

---

## 🧪 **TESTS**

### **Tests Essentiels**

```javascript
// 1. Mint
const tx1 = await nftContract.mint(
    userAddress,
    "ipfs://QmTest123"
);

// 2. Transfer (doit échouer si pas whitelisté)
const tx2 = await nftContract.transferFrom(
    userAddress,
    otherAddress,
    tokenId
); // ❌ Revert: "Transfer not allowed"

// 3. Whitelist + Transfer
await nftContract.setTransferWhitelist(userAddress, true);
const tx3 = await nftContract.transferFrom(
    userAddress,
    otherAddress,
    tokenId
); // ✅ Success

// 4. Burn (par CyLimit uniquement)
const tx4 = await masterWallet.invokeContract({
    contractAddress: NFT_CONTRACT,
    method: 'burn',
    args: { tokenId }
});
// User ne peut PAS appeler burn() directement

// 5. Pause
await nftContract.pause();
const tx5 = await nftContract.mint(userAddress, "ipfs://..."); // ❌ Revert: "Pausable: paused"

// 6. Unpause
await nftContract.unpause();
const tx6 = await nftContract.mint(userAddress, "ipfs://..."); // ✅ Success

// 7. Royalties
const royaltyInfo = await nftContract.royaltyInfo(tokenId, 1000000); // 1 USDC
// royaltyInfo[0] = receiver (Master Wallet)
// royaltyInfo[1] = royalty amount (100000 = 10%)
```

---

## 📞 **SUPPORT & QUESTIONS**

### **Changelog**

- **v2.0.0** (17 Oct 2025) : Version finale avec burn, pause, royalties
- **v1.0.0** (15 Oct 2025) : Version initiale (whitelist uniquement)

### **Contact**

- Discord CDP : https://discord.gg/cdp
- Documentation OpenZeppelin : https://docs.openzeppelin.com/contracts/5.x/

---

**Status :** ✅ **READY FOR DEPLOYMENT**  
**Prochaine étape :** Déployer sur Base Sepolia (testnet) avec Remix IDE


