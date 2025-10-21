# 📜 RÉSUMÉ COMPLET - SMART CONTRACTS CYLIMIT V2 (BASE)

**Date :** 17 Octobre 2025  
**Status :** ✅ ARCHITECTURE FINALE VALIDÉE  
**Version :** 2.0.0

---

## 🎯 VUE D'ENSEMBLE

**Architecture ultra-simplifiée** pour maximiser la flexibilité et minimiser les coûts :

| Composant | Rôle | Complexité |
|-----------|------|------------|
| **CyLimitNFT_v2** | Gestion NFTs + Whitelist | ⭐⭐ Simple |
| **CyLimitMarketplace_v2** | Escrow USDC + Achats | ⭐ Ultra-simple |
| **Backend CyLimit** | Logique métier (enchères, offers, swaps) | ⭐⭐⭐ Complexe |

**Principe clé :** Smart contracts = fonctions génériques réutilisables. Backend = intelligence métier.

---

## 🔐 GESTION DES APPROVALS & TRANSFERS

### **Comment fonctionnent les transfers NFT ?**

#### **1. Setup Initial (Une seule fois par user)**

```typescript
// User donne approval au Marketplace pour TOUS ses NFTs
await userEmbeddedWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
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

---

#### **2. Transfers NFT (Ventes/Swaps/Offers)**

Une fois l'approval donnée, **le backend peut orchestrer les transfers** :

```typescript
// EXEMPLE : User B achète NFT de User A pour 100 USDC

// ═══════════════════════════════════════════════════════════════════════
// APPROVALS NÉCESSAIRES
// ═══════════════════════════════════════════════════════════════════════

// 1. User A (Seller) - Approval NFT : DÉJÀ FAIT au premier listing (1× permanent)
// await userA.setApprovalForAll(MARKETPLACE, true);
// ☝️ User A n'a plus rien à signer pour vendre

// 2. User B (Buyer) - Approval USDC : REQUIS avant chaque achat
// ⚠️ IMPORTANT : User B DOIT approuver USDC avant ou pendant l'achat !

// ═══════════════════════════════════════════════════════════════════════
// BATCH TRANSACTION (User B signe)
// ═══════════════════════════════════════════════════════════════════════

const batch = [
  // 1. Approve USDC (inclus dans le batch)
  { to: USDC, data: 'approve(MARKETPLACE, 105 USDC)' },
  
  // 2. Transfer USDC → Seller
  { to: USDC, data: 'transferFrom(userB, userA, 100 USDC)' },
  
  // 3. Transfer USDC fees → CyLimit
  { to: USDC, data: 'transferFrom(userB, cylimit, 5 USDC)' },
  
  // 4. Transfer NFT (Marketplace utilise son approval)
  { to: MARKETPLACE, data: 'buyNFT(tokenId, userA)' }
];

await sendUserOperation(userB.address, batch, PAYMASTER);

// ✅ User A : aucune signature (déjà approuvé le Marketplace)
// ✅ User B : 1 signature (batch approve USDC + achat)
```

**Pourquoi ça marche ?**
1. **User A** a approuvé le Marketplace pour ses NFTs (via `setApprovalForAll`) → **1× permanent**
2. **User B** approuve le Marketplace pour USDC (dans le batch) → **avant chaque achat**
3. **Marketplace** peut transférer : NFT (userA → userB) et USDC (userB → userA)
4. **Atomique** : tout ou rien

---

#### **3. Burn NFT (avec Approval sécurisé)**

```typescript
// ═══════════════════════════════════════════════════════════════════════
// User clique "Détruire mon NFT" dans l'app
// ═══════════════════════════════════════════════════════════════════════

// Flow sécurisé :
// 1. Modal confirmation CyLimit : "⚠️ Action irréversible !"
// 2. User confirme

// 3. User APPROUVE CyLimit pour ce NFT spécifique
await userWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'approve',
  args: {
    to: MASTER_WALLET, // ou MARKETPLACE_CONTRACT
    tokenId: tokenId
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POPUP COINBASE WALLET APPARAÎT
// ═══════════════════════════════════════════════════════════════════════

// User voit :
// ┌────────────────────────────────────────────────────────────┐
// │  🔐 Coinbase Wallet                                        │
// │                                                            │
// │  Autoriser CyLimit à gérer ce NFT ?                       │
// │  NFT #123 - Pogacar Rare                                  │
// │                                                            │
// │  ⚠️  Cette autorisation permet la destruction du NFT       │
// │                                                            │
// │  ⛽ Gas : $0 (sponsorisé)                                  │
// │                                                            │
// │  [Refuser]  [Approuver] ← User clique                     │
// └────────────────────────────────────────────────────────────┘

// ✅ User clique "Approuver" (signature wallet)

// 4. Backend appelle burn (avec l'approval du user)
await masterWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'burn',
  args: { tokenId }
});

// ✅ Backend peut brûler car user a approuvé
// ✅ User a signé explicitement
// ✅ Sécurité maximale
```

**Pourquoi Approval + Backend burn ?**
- ✅ **User signe explicitement** (approval via wallet)
- ✅ **CyLimit garde le contrôle** (backend appelle burn)
- ✅ **Validation backend possible** (vérifications avant burn)
- ✅ **Sécurité renforcée** (double confirmation)

**🔒 SÉCURITÉ CRITIQUE :**
- ✅ **`setApprovalForAll` NE permet PAS de burn** (protection supplémentaire)
- ✅ **Seul `approve(tokenId)` spécifique fonctionne** (approval par NFT)
- ✅ **User DOIT approuver CHAQUE burn individuellement**
- ✅ **Le Marketplace ne peut PAS brûler même avec setApprovalForAll**

---

### **Transfers USDC (Toujours besoin d'approval)**

Les **USDC sont des ERC-20**, mécanisme différent :

```typescript
// ═══════════════════════════════════════════════════════════════════════
// USDC : Approval AVANT CHAQUE utilisation
// ═══════════════════════════════════════════════════════════════════════

// 1. User approve le Marketplace pour X USDC
await usdcContract.approve(
  MARKETPLACE_CONTRACT,
  amount * 1e6
);

// 2. Backend peut transférer jusqu'à X USDC
await usdcContract.transferFrom(
  user.address,
  recipient.address,
  amount * 1e6
);

// 3. Si montant dépassé → nouvelle approval requise
```

**Différence NFT vs USDC :**
| | NFT (ERC-721) | USDC (ERC-20) |
|---|---------------|---------------|
| **Approval** | `setApprovalForAll(operator, true)` | `approve(spender, amount)` |
| **Portée** | TOUS les NFTs du user | Montant spécifique |
| **Durée** | Permanent (jusqu'à révocation) | Jusqu'à épuisement |
| **Fréquence** | 1× (premier listing) | À chaque besoin si insuffisant |

**Récapitulatif Approvals par Cas d'Usage :**

| Cas d'usage | User A (Seller) | User B (Buyer) | Total signatures |
|-------------|-----------------|----------------|------------------|
| **Premier listing** | ✅ `setApprovalForAll(NFT)` | - | 1 |
| **Listings suivants** | ❌ Rien (DB) | - | 0 |
| **Vendre NFT** | ❌ Rien | ✅ `approve(USDC)` + batch | 1 |
| **Swap NFT ↔ NFT** | ❌ Rien | ✅ batch | 1 |
| **Swap NFT+USDC ↔ NFT** | ❌ Rien | ✅ batch | 1 |
| **Swap NFT ↔ NFT+USDC** | ❌ Rien | ✅ `approve(USDC)` + batch | 1 |
| **Burn NFT** | ✅ `approve(tokenId)` | User | 1 |

**🎯 Conclusion :**
- **Seller (User A)** : Signe **1× au début** (`setApprovalForAll`), puis **plus jamais**
- **Buyer (User B)** : Signe **1× par achat** (batch avec `approve(USDC)` si nécessaire)
- **Owner (Burn)** : Signe **1× par burn** (`approve(tokenId)` spécifique)

---

## 📦 CONTRAT 1 : CyLimitNFT_v2.sol

### **Fonctionnalités**

| Fonction | Qui peut appeler ? | Usage |
|----------|-------------------|-------|
| `mint()` | `onlyOwner` (Master Wallet) | Mint 1 NFT |
| `batchMint()` | `onlyOwner` | Mint jusqu'à 100 NFTs |
| `burn()` | Whitelisté OU approuvé | Détruire NFT (requiert approval user) |
| `pause()` / `unpause()` | `onlyOwner` | Arrêt d'urgence |
| `setTransferWhitelist()` | `onlyOwner` | Autoriser adresse à transférer |
| `batchSetTransferWhitelist()` | `onlyOwner` | Whitelist multiple |
| `setDefaultRoyalty()` | `onlyOwner` | Modifier royalties (10% par défaut) |
| `transferFrom()` | Whitelisté OU approuvé | Transfer NFT |
| `setApprovalForAll()` | N'importe qui | Approuver opérateur |

### **Mécanisme Whitelist**

```solidity
// Override de _update() vérifie AVANT CHAQUE transfert :
function _update(address to, uint256 tokenId, address auth) {
    address from = _ownerOf(tokenId);
    
    // Mint : toujours autorisé
    if (from == address(0)) return super._update(...);
    
    // Burn : toujours autorisé
    if (to == address(0)) return super._update(...);
    
    // Transfer : from OU to doit être whitelisté
    require(
        transferWhitelist[from] || transferWhitelist[to],
        "Transfer not allowed"
    );
    
    return super._update(...);
}
```

**Adresses whitelistées :**
1. ✅ **Master Wallet** (backend CyLimit)
2. ✅ **Marketplace Contract** (achats/swaps/offers)

**Résultat :**
- ✅ User A → Marketplace → User B : **Autorisé** (Marketplace whitelisté)
- ❌ User A → User B directement : **Bloqué** (aucun des deux whitelisté)
- ❌ User A → OpenSea : **Bloqué** (pas whitelisté)

---

## 💰 CONTRAT 2 : CyLimitMarketplace_v2_Base.sol

### **Architecture Ultra-Simple**

**3 fonctions escrow génériques réutilisables partout :**

```solidity
// 1. User escrow USDC
function escrowUSDC(uint256 amount) external;

// 2. CyLimit release USDC (refund)
function releaseUSDC(address user, uint256 amount) external onlyOwner;

// 3. CyLimit transfer USDC (finalize)
function transferEscrowedUSDC(address from, address to, uint256 amount) external onlyOwner;
```

**Utilisé pour :**
- ✅ Enchères (escrow maxBid)
- ✅ Buy offers (escrow price)
- ✅ Swap offers avec USDC (escrow USDC offert)
- ✅ Collection offers (escrow price)

---

### **Fonctions Achat Direct**

```solidity
// Achat 1 NFT
function buyNFT(uint256 tokenId, address seller) external;

// Achat multiple (batch)
function buyMultipleNFTs(uint256[] tokenIds, address[] sellers) external;
```

**Flow batch transaction (achat) :**
```
User clique "Acheter 100 USDC"
     ↓
Backend prépare batch :
1. usdc.transfer(seller, 95 USDC)
2. usdc.transfer(cylimit, 5 USDC fees)
3. marketplace.buyNFT(tokenId, seller)
     ↓
Smart Account exécute batch (1 signature)
     ↓
✅ NFT transféré au buyer
✅ USDC transféré au seller
✅ Fees transférées à CyLimit
```

1. SETUP (1× au premier listing)
   ↓
   Seller approuve Marketplace : setApprovalForAll(Marketplace, true)
   Seller liste en DB (pas blockchain)

2. BUYER CLIQUE "ACHETER"
   ↓
   Frontend → Backend

3. BACKEND VÉRIFIE
   ↓
   - Seller a toujours approval ? ✅
   - Seller possède toujours le NFT ? ✅
   - Buyer a assez d'USDC ? ✅

4. BACKEND PRÉPARE LE BATCH
   ↓
   Op 1: USDC → Seller
   Op 2: USDC fees → CyLimit
   Op 3: marketplace.buyNFT()

5. BUYER SIGNE LE BATCH
   ↓
   userOperation.sign() par Buyer
   (1 seule signature pour tout)

6. BATCH EXÉCUTÉ ON-CHAIN (atomique)
   ↓
   Step 1: USDC transféré (Buyer → Seller + CyLimit)
   Step 2: marketplace.buyNFT() appelé
     ↓
     Step 2.1: Marketplace appelle nft.safeTransferFrom()
       ↓
       Step 2.1.1: Vérifie isApprovedForAll(Seller, Marketplace) ✅
       Step 2.1.2: Vérifie transferWhitelist[Marketplace] ✅
       Step 2.1.3: Transfer NFT : Seller → Buyer
     ↓
     Step 2.2: totalSales++
     Step 2.3: emit NFTBought()

7. BACKEND UPDATE DB
   ↓
   listing.status = 'sold'
   nft.ownerId = buyerId

**Note :** Seller a déjà fait `setApprovalForAll(Marketplace, true)` lors de son premier listing.

---

### **Mapping Escrow**

```solidity
mapping(address => uint256) public escrowedUSDC;
```

**Tracking allocation (géré en backend) :**
```typescript
// User A a 200 USDC escrowed
// - Offer 1 : 100 USDC alloué
// - Offer 2 : 50 USDC alloué
// Disponible : 50 USDC

// Si User A veut créer Offer 3 (80 USDC) :
// → Escrow additionnel requis : 30 USDC
```

---

## 🔄 CAS D'USAGE COMPLETS

### **1. Listing NFT (DB uniquement)**

```typescript
// POST /marketplace/list

// 1. User fait setApprovalForAll(Marketplace, true) si pas déjà fait
if (!await nftContract.isApprovedForAll(user.address, MARKETPLACE)) {
  await userWallet.invokeContract({
    contractAddress: NFT_CONTRACT,
    method: 'setApprovalForAll',
    args: { operator: MARKETPLACE, approved: true }
  });
}

// 2. Backend enregistre en DB uniquement (pas de blockchain)
await listingModel.create({ nftId, price, sellerId });

// Gas : $0 (pas de blockchain)
```

---

### **2. Achat NFT Listé**

```typescript
// POST /marketplace/buy/:id

// Batch transaction (1 signature user) :
const batch = [
  { to: USDC, data: 'transfer(seller, 95 USDC)' },
  { to: USDC, data: 'transfer(cylimit, 5 USDC)' },
  { to: MARKETPLACE, data: 'buyNFT(tokenId, seller)' }
];

await sendUserOperation(buyer.address, batch, PAYMASTER);

// Gas : $0 (sponsorisé)
```

---

### **3. Enchère avec Auto-Bid**

```typescript
// POST /auctions/:id/bid

// User bid maxBid = 200 USDC

// Backend compare :
if (maxBid > currentWinnerMaxBid) {
  // ✅ Nouveau winner
  // Escrow USDC
  await marketplace.escrowUSDC(maxBid * 1e6);
  
  // Refund ancien winner
  if (previousWinner) {
    await marketplace.releaseUSDC(previousWinner, previousMaxBid * 1e6);
  }
  
  // Update DB
  auction.currentWinner = userId;
  auction.currentWinnerMaxBid = maxBid;
  auction.currentBid = maxBid; // ou min(maxBid, previousMaxBid + 1)
} else {
  // ❌ Bid perdu (pas d'escrow)
  auction.currentBid = Math.min(maxBid + 1, currentWinnerMaxBid);
}

// Finalize (fin enchère) :
await marketplace.transferEscrowedUSDC(winner, cylimit, finalBid * 1e6);
await marketplace.releaseUSDC(winner, (maxBid - finalBid) * 1e6); // refund surplus
await nftContract.transferFrom(cylimit, winner, tokenId);
```

---

### **4. Offer 1-to-1 (Buy/Swap unifié)**

```typescript
// POST /offers/create

// Fonction générique :
await offerService.createOffer(
  initiatorId,
  targetId,
  offeredNFTs,    // [] pour buy offer, [123] pour swap
  offeredUSDC,    // 100 pour buy offer, 0 ou X pour swap
  requestedNFTs,  // [456]
  requestedUSDC   // 0 ou X
);

// Si offeredUSDC > 0 :
await marketplace.escrowUSDC(offeredUSDC * 1e6);

// Acceptation (batch atomique) :
const batch = [
  // Transfer escrowed USDC (si applicable)
  { to: MARKETPLACE, data: 'transferEscrowedUSDC(initiator, target, X)' },
  
  // Transfer requested USDC (si applicable)
  { to: USDC, data: 'transferFrom(target, initiator, Y)' },
  
  // Transfer NFTs
  { to: NFT, data: 'transferFrom(initiator, target, nft1)' },
  { to: NFT, data: 'transferFrom(target, initiator, nft2)' }
];

await sendUserOperation(target.address, batch, PAYMASTER);
```

**Note :** Chaque user doit avoir fait `setApprovalForAll` avant que ses NFTs puissent être transférés.

---

### **5. Collection Offer (Publique)**

```typescript
// POST /collection-offers/create

await collectionOfferService.create(
  buyerId,
  targetId: null,  // ← Offre publique
  offeredNFTs: [],
  offeredUSDC: 100,
  requestedNFTsFilters: { rarity: 'rare' },
  requestedUSDC: 0
);

// Escrow immédiat
await marketplace.escrowUSDC(100 * 1e6);

// Notification TOUS les sellers avec NFTs matching

// Premier seller qui accepte :
// 1. Lock offre (prevent double acceptance)
// 2. Vérifie NFT match filtres (backend)
// 3. Batch atomique (USDC + NFT)
```

---

## 📊 RÉCAPITULATIF APPROVALS

### **Setup Initial par User (Une fois)**

| Action | Signature requise ? | Fréquence |
|--------|-------------------|-----------|
| `setApprovalForAll(Marketplace, true)` | ✅ Oui | 1× (premier listing) |
| `approve(Marketplace, X USDC)` | ✅ Oui | Chaque fois si insuffisant |

### **Actions Ultérieures**

| Action | Signature requise ? | Backend peut faire ? |
|--------|-------------------|---------------------|
| **Vendre NFT (listing)** | ❌ Non (DB) | ✅ Oui |
| **Acheter NFT** | ✅ Oui (batch USDC + buyNFT) | ❌ Non |
| **Transfer NFT (offer acceptée)** | ✅ Oui (batch) | ❌ Non |
| **Escrow USDC** | ✅ Oui | ❌ Non |
| **Release USDC** | ❌ Non | ✅ Oui (onlyOwner) |
| **Burn NFT** | ✅ Oui (approve) | ✅ Oui (avec approval) |

---

## 💡 AVANTAGES ARCHITECTURE

### **1. Ultra-Simple**
- ✅ 3 fonctions escrow réutilisables
- ✅ 2 fonctions achat
- ✅ Pas de structs complexes on-chain
- ✅ Pas de mappings multiples

### **2. Flexible**
- ✅ Logique métier en backend
- ✅ Modifications sans redéploiement contrat
- ✅ Ajout de nouveaux cas d'usage facile

### **3. Gas Optimisé**
- ✅ Listings en DB ($0)
- ✅ Escrow générique réutilisable
- ✅ Batch transactions (ERC-4337)
- ✅ Sponsoring via Paymaster

### **4. Sécurisé**
- ✅ CyLimit contrôle release/transfer USDC
- ✅ Escrow transparent on-chain
- ✅ Users voient balance escrowed
- ✅ Whitelist NFT empêche ventes externes
- ✅ `onlyOwner` pour burn (évite accidents)

### **5. UX Parfaite**
- ✅ **1 approval NFT** au premier listing (permanente)
- ✅ **Aucune signature** au moment de la vente (seller)
- ✅ **1 signature batch** pour l'achat (buyer)
- ✅ **Gas sponsorisé** ($0 pour users)
- ✅ **Burn via app** (pas de wallet interaction)

---

## 🔒 SÉCURITÉ SI MASTER WALLET HACKÉ

### **Ce que le hacker PEUT faire :**

1. ❌ **Mint NFTs illimités** (pas de MAX_SUPPLY)
2. ❌ **Burn n'importe quel NFT**
3. ❌ **Modifier whitelist** (ajouter OpenSea, etc.)
4. ❌ **Pause/Unpause contrat**
5. ❌ **Modifier royalties**
6. ❌ **Transfer ownership** (perte contrôle permanent)
7. ❌ **Release/Transfer USDC escrowed**

### **Ce que le hacker NE PEUT PAS faire :**

1. ✅ **Voler NFTs des users** (seul le Marketplace peut transférer via approval)
2. ✅ **Voler USDC des users** (sauf si escrowed)

### **SOLUTIONS SÉCURITÉ** (voir conversation précédente) :

1. ✅ **Supprimer `transferOwnership`** (ou timelock 24h)
2. ✅ **2-phase whitelist** (setup rapide + modifications timelockées)
3. ✅ **Multi-sig** pour Master Wallet (3-of-5)
4. ✅ **Monitoring temps réel** (alertes functions onlyOwner)
5. ✅ **Rate limiting** (max X operations/jour)

---

## 📋 CHECKLIST DÉPLOIEMENT

### **Testnet (Base Sepolia)**
- [ ] Compiler CyLimitNFT_v2 (Solidity 0.8.20)
- [ ] Compiler CyLimitMarketplace_v2 (Solidity 0.8.20)
- [ ] Déployer NFT avec Master Wallet
- [ ] Déployer Marketplace avec NFT + USDC testnet
- [ ] Whitelist Marketplace dans NFT
- [ ] Tester escrowUSDC / releaseUSDC / transferEscrowedUSDC
- [ ] Tester buyNFT / buyMultipleNFTs
- [ ] Tester setApprovalForAll + transfer
- [ ] Tester burn (onlyOwner)
- [ ] Tester pause/unpause
- [ ] Vérifier events émis

### **Mainnet (Base)**
- [ ] Déployer NFT v2 sur Base
- [ ] Déployer Marketplace v2 sur Base
- [ ] Whitelist Marketplace + Master Wallet
- [ ] Vérifier sur Basescan
- [ ] Tester 1 escrow/release réel
- [ ] Activer Paymaster (allowlist contrats)
- [ ] Monitorer logs
- [ ] Setup multi-sig (3-of-5)

---

**Équipe CyLimit**  
**Version :** 2.0.0 - Architecture Finale Validée  
**Date :** 17 Octobre 2025


