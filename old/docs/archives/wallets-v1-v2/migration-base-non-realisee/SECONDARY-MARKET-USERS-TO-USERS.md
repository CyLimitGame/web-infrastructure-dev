# 🔄 MARCHÉ SECONDAIRE - USERS ↔ USERS (Base)

**Date :** 16 Octobre 2025  
**Status :** 📋 SPÉCIFICATIONS COMPLÈTES  
**Marché :** Users échangent des NFTs entre eux

---

## 🎯 VUE D'ENSEMBLE

Le **marché secondaire** permet aux users d'échanger des NFTs entre eux via 3 mécanismes principaux :
1. **Vente classique** → Listing en DB ($0 gas)
2. **Offres 1-to-1** → Buy/Swap avec escrow USDC si nécessaire (fonction générique unifiée)
3. **Collection Offer** → Offres publiques avec filtres NFT

**Architecture :**
- ✅ **Smart contract ultra-simple** : 3 fonctions escrow réutilisables
- ✅ **Logique métier en backend** : Flexibilité maximale
- ✅ **CyLimit contrôle escrow** : Release/transfer USDC
- ✅ **Gas sponsorisé** : Paymaster pour transactions users

**Objectif Base :** Réduire les frais de gas de **~93%** et sponsoriser les transactions via Paymaster.

---

## 📊 COMPARAISON POLYGON vs BASE

| Opération | Polygon | Base (Nouvelle Architecture) |
|-----------|---------|-------------------------------|
| **Listing NFT** | $0.015 | **$0** (DB uniquement) |
| **Buy NFT** | $0.038 | **$0** (sponsorisé) |
| **Escrow USDC** | $0.025 | **$0** (sponsorisé) |
| **Accept Offer** | $0.038 | **$0** (sponsorisé) |
| **Swap P2P** | $0.050 | **$0** (sponsorisé) |
| **Backend operations** | - | **$0.001-0.002** (CyLimit paie) |

**Économie users : 100%** 🎉  
**Coût CyLimit : ~$2-3/mois** (1000 transactions)

---

## 🔐 ARCHITECTURE ESCROW GÉNÉRIQUE

### **Principe : 3 Fonctions Réutilisables**

Toutes les opérations nécessitant une garantie USDC utilisent le même système :

```typescript
// 1. User escrow USDC
await marketplaceContract.escrowUSDC(amount);

// 2a. CyLimit release USDC (refund)
await marketplaceContract.releaseUSDC(userAddress, amount);

// 2b. CyLimit transfer USDC (finalize)
await marketplaceContract.transferEscrowedUSDC(fromAddress, toAddress, amount);
```

**Utilisé pour :**
- ✅ **Buy offers** → Buyer escrow price
- ✅ **Collection offers** → Buyer escrow price
- ✅ **Swaps avec USDC** → Initiator escrow USDC
- ✅ **Enchères** (marché primaire) → Bidder escrow maxBid

**Avantages :**
- 🎯 **Simple** : Pas de logique complexe on-chain
- 🎯 **Flexible** : Backend gère toute la logique métier
- 🎯 **Sécurisé** : CyLimit contrôle via `onlyOwner`
- 🎯 **Transparent** : Users voient balance escrowed on-chain

---

## 🏪 CAS 1 : VENTE CLASSIQUE (Listing + Achat)

### **Flow Base Optimisé (Listing en DB)**

```
┌─────────────────┐
│  USER A (Seller)│
└────────┬────────┘
         │ 1. List NFT #123 à 100 USDC
         ↓
┌──────────────────────────┐
│  FRONTEND                │
│  POST /marketplace/list  │
└────────┬─────────────────┘
         │ 2. Sauvegarder en DB uniquement
         ↓
┌──────────────────────────┐
│  DATABASE (MongoDB)      │
│  listings.create({       │
│    nftId, price, seller  │
│  })                      │
│  - Gas: $0 (pas de BC)   │
└──────────────────────────┘
         
         
┌─────────────────┐
│  USER B (Buyer) │
└────────┬────────┘
         │ 4. Buy NFT #123
         ↓
┌──────────────────────────────────────┐
│  SMART ACCOUNT (Buyer) - BATCH      │
│                                      │
│  Op 1: Transfer 100 USDC → Seller   │
│  Op 2: Transfer 5 USDC → CyLimit    │
│  Op 3: buyNFT(tokenId)               │
│        → NFT transferred             │
│                                      │
│  Gas: $0 (Paymaster sponsorise)     │
└──────────────────────────────────────┘
         ↓
    ✅ COMPLETE
    Buyer reçoit NFT
    Seller reçoit 100 USDC
    CyLimit reçoit 5 USDC (fees)
```

### **Code Backend**

```typescript
// user-backend/src/modules/marketplace/marketplace.service.ts

/**
 * OBJECTIF : Lister un NFT sur le marketplace
 * 
 * POURQUOI :
 * - Permettre aux users de vendre leurs NFTs
 * - 0 gas pour lister (DB uniquement)
 * 
 * COMMENT :
 * 1. Vérifier que user possède le NFT
 * 2. Sauvegarder listing en DB uniquement
 * 3. Pas d'interaction blockchain (économie gas)
 * 
 * APPELÉ DEPUIS :
 * - POST /marketplace/list (frontend)
 * 
 * APPELLE :
 * - MongoDB (listings.create)
 */
async listNFT(userId: string, tokenId: number, priceUSDC: number) {
  const user = await this.userModel.findById(userId);
  const nft = await this.nftModel.findOne({ tokenId, ownerId: userId });

  if (!nft) throw new Error('NFT not owned by user');

  console.log(`📝 Listing NFT #${tokenId} à ${priceUSDC} USDC`);

  // Sauvegarder en DB uniquement (pas de blockchain)
  const listing = await this.listingModel.create({
    nftId: nft._id,
    sellerId: userId,
    price: priceUSDC,
    status: 'active',
    createdAt: new Date()
  });

  console.log(`✅ NFT listé en DB (Gas: $0 - pas de blockchain) 🎉`);

  return { success: true, listingId: listing._id };
}

/**
 * OBJECTIF : Acheter un NFT listé
 * 
 * POURQUOI :
 * - Permettre aux users d'acheter des NFTs listés
 * - Batch USDC + achat en 1 seule transaction
 * - Sponsoriser le gas via Paymaster
 * 
 * COMMENT :
 * 1. Vérifier listing actif
 * 2. Batch : Transfer USDC + Transfer fees + buyNFT()
 * 3. Atomique (tout ou rien)
 * 
 * APPELÉ DEPUIS :
 * - POST /marketplace/buy/:id (frontend)
 * 
 * APPELLE :
 * - USDC.transfer() (batch)
 * - MarketplaceContract.buyNFT() (batch)
 */
async buyNFT(userId: string, listingId: string) {
  const user = await this.userModel.findById(userId);
  const listing = await this.listingModel.findById(listingId).populate('nftId');

  if (listing.status !== 'active') throw new Error('Listing not active');

  const seller = await this.userModel.findById(listing.sellerId);
  const price = listing.price;
  const fees = price * 0.05; // 5% fees CyLimit

  console.log(`🛒 Achat NFT #${listing.nftId.tokenId} pour ${price} USDC`);

  // Batch transaction (3 opérations atomiques)
  const batch = [
    // Op 1 : Transfer USDC → Seller
    {
      to: process.env.USDC_BASE_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [seller.baseWalletAddress, price * 1e6]
      })
    },
    // Op 2 : Transfer fees → CyLimit
    {
      to: process.env.USDC_BASE_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [process.env.MASTER_WALLET_ADDRESS, fees * 1e6]
      })
    },
    // Op 3 : Buy NFT
    {
      to: process.env.MARKETPLACE_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: MARKETPLACE_ABI,
        functionName: 'buyNFT',
        args: [listing.nftId.tokenId]
      })
    }
  ];

  // Exécuter batch (sponsorisé)
  const buyOp = await this.coinbaseService.sendUserOperation({
    userAddress: user.baseWalletAddress,
    calls: batch,
    paymasterUrl: process.env.PAYMASTER_URL // ← Sponsorisé !
  });

  await buyOp.wait();

  console.log(`✅ NFT acheté (TX: ${buyOp.hash})`);
  console.log(`   Gas: $0 (sponsorisé par CyLimit) 🎉`);

  // Mettre à jour DB
  listing.status = 'sold';
  listing.buyerId = userId;
  listing.soldAt = new Date();
  await listing.save();

  listing.nftId.ownerId = userId;
  await listing.nftId.save();

  return { success: true, txHash: buyOp.hash };
}
```

**Coût Gas :**
- **Seller list :** **$0** (DB uniquement, pas de blockchain)
- **Buyer achète :** **$0** (sponsorisé)
- **CyLimit :** ~$0.003 total (achat uniquement)

**Avantages :**
- ✅ Listing gratuit instantané (DB)
- ✅ 1 seule signature buyer
- ✅ Atomique (tout ou rien)
- ✅ Gas sponsorisé (UX parfaite)

---

## 🔄 CAS 2 : OFFRES 1-TO-1 (Architecture Unifiée)

**Note :** Dans la pratique, les users achètent les NFTs **un par un**. Pas besoin de batch achat multiple.

Si besoin ultérieur, la fonction `buyMultipleNFTs()` existe dans le contrat pour des cas spécifiques (ex: achats programmatiques par le backend).

---

### **Architecture Offres Unifiées**

**Tous les types d'offres 1-to-1** utilisent la **même fonction générique** `OfferService.createOffer()` :

**Champs disponibles :**
- `initiatorId: string` → Celui qui crée l'offre
- `targetId: string` → User spécifique ciblé (not null)
- `offeredNFTs: number[]` → NFTs offerts par l'initiator
- `offeredUSDC: number` → USDC offerts par l'initiator
- `requestedNFTs: number[]` → NFTs demandés au target
- `requestedUSDC: number` → USDC demandés au target

**Types d'offres possibles :**
| Type | offeredNFTs | offeredUSDC | requestedNFTs | requestedUSDC |
|------|-------------|-------------|---------------|---------------|
| **Buy Offer** | `[]` | `100` | `[123]` | `0` |
| **Swap NFT ↔ NFT** | `[123]` | `0` | `[456]` | `0` |
| **Swap NFT + USDC ↔ NFT** | `[123]` | `50` | `[456]` | `0` |
| **Swap NFT ↔ NFT + USDC** | `[123]` | `0` | `[456]` | `50` |
| **Swap complexe** | `[123, 124]` | `30` | `[456]` | `20` |

**Création Offer :**
- ✅ **Sauvegardé en DB uniquement** (pas de blockchain)
- ✅ **Si `offeredUSDC` > 0 → Escrow on-chain** (garantie pour target)
- ✅ **Pas d'escrow blockchain** si aucun USDC offert
- ✅ **Au moins 1 NFT obligatoire** (pas de transfert USDC pur)

**Acceptation Offer :**
- ✅ **Vérifications ownership** (DB + Blockchain)
- ✅ **Vérification escrow balance** (si applicable)
- ✅ **Batch atomique** (USDC + NFTs en une transaction)
- ✅ **Sponsorisé via Paymaster**

### **Flow Base Optimisé (Swap NFT + USDC)**

```
┌─────────────────┐
│  USER A         │
└────────┬────────┘
         │ 1. Propose offer :
         │    - offeredNFTs: [123]
         │    - offeredUSDC: 0
         │    - requestedNFTs: [456]
         │    - requestedUSDC: 50
         ↓
┌──────────────────────────┐
│  BACKEND                 │
│  OfferService            │
│  - Save en DB            │
│  - Pas d'escrow (0 USDC) │
└──────────────────────────┘
         
         
┌─────────────────┐
│  USER B         │
└────────┬────────┘
         │ 2. Accept offer (BATCH atomique)
         ↓
┌──────────────────────────────────────┐
│  SMART ACCOUNT (User B) - BATCH     │
│                                      │
│  Op 1: usdc.transferFrom(           │
│          B → A, 50 USDC)             │
│  Op 2: nft.transferFrom(             │
│          A → B, NFT #123)            │
│  Op 3: nft.transferFrom(             │
│          B → A, NFT #456)            │
│                                      │
│  Gas: $0 (Paymaster sponsorise)     │
│  Atomique (tout ou rien)            │
└──────────────────────────────────────┘
```

### **Code Backend (Fonction Générique Unifiée)**

Voir le code complet dans `CONTRAT-MARKETPLACE-V2-BASE.md` → Section "OfferService".

**Exemple d'utilisation pour un swap NFT + USDC :**

```typescript
// 1. User A crée une offre : "Je donne NFT #123, je veux NFT #456 + 50 USDC"
await offerService.createOffer(
  userAId,              // initiatorId
  userBId,              // targetId
  [123],                // offeredNFTs
  0,                    // offeredUSDC (pas d'USDC offert)
  [456],                // requestedNFTs
  50                    // requestedUSDC (demande 50 USDC)
);

// 2. User B accepte l'offre (BATCH atomique : USDC + NFTs)
await offerService.acceptOffer(offerId, userBId);
```

**Avantages :**
- ✅ **1 seule fonction** pour tous les types d'offres
- ✅ **Flexibilité maximale** (combinaisons infinies)
- ✅ **Vérifications complètes** (DB + Blockchain ownership)
- ✅ **Batch atomique** (USDC + NFTs en une transaction)
- ✅ **Escrow tracking** (backend gère l'allocation)

**Coût Gas :**
- **Create offer :** $0 (DB uniquement, escrow si USDC offert)
- **Accept offer :** $0 (sponsorisé)
- **CyLimit :** ~$0.002-0.004 total

**Note :** Le CAS 4 (Buy Offer) est maintenant intégré dans le CAS 3 ci-dessus, car c'est simplement un cas spécifique d'offre 1-to-1 où seul USDC est offert contre un NFT.

---

## 🎨 CAS 3 : COLLECTION OFFER (Offre Publique avec Filtres)

### **Architecture Offre Publique**

Les **collection offers** sont des **offres publiques ouvertes** où :
- `targetId: null` → N'importe quel seller peut accepter
- `requestedNFTsFilters: {}` → Critères au lieu de tokenIds spécifiques
- **Premier seller qui match → Gagne l'offre**
- **USDC escrowed immédiatement** (si `offeredUSDC > 0`)

**Différences vs Offres 1-to-1 :**
| Critère | Offre 1-to-1 (CAS 3/4) | Collection Offer (CAS 5) |
|---------|------------------------|--------------------------|
| `targetId` | User spécifique | `null` (public) |
| `requestedNFTs` | TokenIds spécifiques | `null` |
| `requestedNFTsFilters` | N/A | Critères (rarity, year, etc.) |
| Acceptation | Uniquement le target | N'importe quel seller matching |
| Visibilité | Privée (1 user) | Publique (tous sellers) |

**Avantages :**
- 🎯 **Offre publique** (accessible à tous les sellers)
- 🎯 **Filtrage flexible** (rarity, year, team, etc.)
- 🎯 **Premier arrivé, premier servi** (race condition gérée backend)
- 🎯 **Escrow sécurisé** (USDC bloqué jusqu'à acceptation)

### **Flow Base Optimisé (Exemple : USDC contre NFT rare)**

```
┌─────────────────┐
│  USER A (Buyer) │
└────────┬────────┘
         │ 1. "Je veux n'importe quelle carte rare pour 100 USDC"
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  createCollectionOffer(              │
│    userAId,                          │
│    targetId: null,  ← OFFRE PUBLIQUE │
│    offeredNFTs: [],                  │
│    offeredUSDC: 100,                 │
│    requestedNFTsFilters: {           │
│      rarity: "rare"                  │
│    },                                │
│    requestedUSDC: 0                  │
│  )                                   │
│  → Escrow 100 USDC immédiatement     │
│  → Save offer en DB (status: active) │
│  → Notify ALL sellers avec carte rare│
└──────────────────────────────────────┘
         │
         │ 2. TOUS les sellers avec carte rare voient l'offre
         ↓
┌──────────────────────────────────────┐
│  FRONTEND (Marketplace Public)       │
│  - User B voit : "100 USDC pour      │
│    n'importe quelle carte rare"      │
│  - User C voit la même offre         │
│  - User D voit la même offre         │
└──────────────────────────────────────┘
         │
         │ 3. User B (premier) accepte avec son NFT #789
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  acceptCollectionOffer(              │
│    offerId, userBId, tokenId: 789    │
│  )                                   │
│  1. Vérifie NFT #789 match (rare ✅) │
│  2. Vérifie ownership (DB + BC)      │
│  3. Lock offer (prevent double)      │
│  4. Batch atomique :                 │
│     - transferEscrowedUSDC(A→B, 100) │
│     - nft.transferFrom(B→A, #789)    │
│  → Gas: $0 (sponsorisé)              │
└──────────────────────────────────────┘
         │
         │ 4. User C essaie d'accepter (trop tard)
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  ❌ Error: "Offer already accepted"  │
└──────────────────────────────────────┘
```

### **Code Backend (Offre Publique)**

```typescript
/**
 * OBJECTIF : Créer une collection offer publique
 * 
 * DIFFÉRENCES vs createOffer() :
 * - targetId: null (offre publique)
 * - requestedNFTs: null
 * - requestedNFTsFilters: {} (critères)
 */
async createCollectionOffer(
  initiatorId: string,
  offeredNFTs: number[],
  offeredUSDC: number,
  requestedNFTsFilters: {
    rarity?: string;
    yearOfEdition?: number;
    team?: string;
    // ... autres critères
  },
  requestedUSDC: number
) {
  const initiator = await this.userModel.findById(initiatorId);
  
  console.log(`🎨 Creating public collection offer:`);
  console.log(`   Offered: ${offeredNFTs.length} NFTs + ${offeredUSDC} USDC`);
  console.log(`   Requested: NFTs matching filters + ${requestedUSDC} USDC`);
  console.log(`   Filters:`, requestedNFTsFilters);
  
  // ═══════════════════════════════════════════════════════════════════════
  // VÉRIFICATIONS & ESCROW
  // ═══════════════════════════════════════════════════════════════════════
  
  // Vérifier ownership offered NFTs
  for (const tokenId of offeredNFTs) {
    const nft = await this.nftModel.findOne({ tokenId });
    if (nft.ownerId !== initiatorId) throw new Error(`You don't own NFT #${tokenId}`);
  }
  
  // Escrow USDC si offert
  if (offeredUSDC > 0) {
    await this.marketplaceContract.escrowUSDC(offeredUSDC * 1e6, {
      from: initiator.baseWalletAddress
    });
    console.log(`✅ Escrowed ${offeredUSDC} USDC`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // SAVE EN DB (offre publique)
  // ═══════════════════════════════════════════════════════════════════════
  
  const offer = await this.collectionOfferModel.create({
    type: 'collection',
    initiatorId,
    targetId: null,  // ← OFFRE PUBLIQUE
    offeredNFTs,
    offeredUSDC,
    requestedNFTs: null,  // ← Pas de tokenIds spécifiques
    requestedNFTsFilters,  // ← Critères à la place
    requestedUSDC,
    status: 'active',
    createdAt: new Date()
  });
  
  // ═══════════════════════════════════════════════════════════════════════
  // NOTIFIER TOUS LES SELLERS MATCHING
  // ═══════════════════════════════════════════════════════════════════════
  
  const matchingNFTs = await this.nftModel.find({
    ...requestedNFTsFilters,
    ownerId: { $exists: true, $ne: null }
  });
  
  const sellerIds = [...new Set(matchingNFTs.map(nft => nft.ownerId))];
  
  console.log(`📢 Notifying ${sellerIds.length} sellers with matching NFTs`);
  
  await this.notificationService.notifyMultiple(
    sellerIds,
    `New public offer: ${offeredUSDC} USDC for your ${requestedNFTsFilters.rarity || 'matching'} NFT`,
    { offerId: offer._id }
  );
  
  console.log(`✅ Collection offer created: ${offer._id}`);
  
  return offer;
}

/**
 * OBJECTIF : Accepter une collection offer publique
 * 
 * WORKFLOW :
 * 1. Seller propose un NFT spécifique
 * 2. Backend vérifie que le NFT match les filtres
 * 3. Backend lock l'offre (prevent double acceptance)
 * 4. Exécute batch atomique
 */
async acceptCollectionOffer(
  offerId: string,
  sellerId: string,
  tokenId: number
) {
  const offer = await this.collectionOfferModel.findById(offerId);
  const seller = await this.userModel.findById(sellerId);
  const nft = await this.nftModel.findOne({ tokenId });
  
  // ═══════════════════════════════════════════════════════════════════════
  // VÉRIFICATIONS CRITIQUES
  // ═══════════════════════════════════════════════════════════════════════
  
  // 1. Offre encore active ?
  if (offer.status !== 'active') throw new Error('Offer not active');
  
  // 2. Lock offre (prevent double acceptance - race condition)
  const lockResult = await this.collectionOfferModel.updateOne(
    { _id: offerId, status: 'active' },
    { status: 'processing' }
  );
  
  if (lockResult.modifiedCount === 0) {
    throw new Error('Offer already being processed or accepted');
  }
  
  console.log(`✅ Offer locked for processing`);
  
  try {
    // 3. Vérifier NFT ownership (DB + Blockchain)
    if (nft.ownerId !== sellerId) {
      throw new Error(`You don't own NFT #${tokenId} (DB)`);
    }
    
    const onChainOwner = await this.nftContract.ownerOf(tokenId);
    if (onChainOwner.toLowerCase() !== seller.baseWalletAddress.toLowerCase()) {
      throw new Error(`You don't own NFT #${tokenId} (Blockchain)`);
    }
    
    // 4. Vérifier que le NFT match les filtres
    const matchesFilters = this.validateNFTFilters(nft, offer.requestedNFTsFilters);
    if (!matchesFilters) {
      throw new Error(`NFT #${tokenId} does not match offer filters`);
    }
    
    console.log(`✅ NFT matches filters`);
    
    // 5. Vérifier escrow balance (si offeredUSDC)
    if (offer.offeredUSDC > 0) {
      const initiator = await this.userModel.findById(offer.initiatorId);
      const escrowedBalance = await this.marketplaceContract.getEscrowedBalance(
        initiator.baseWalletAddress
      );
      
      if (escrowedBalance < offer.offeredUSDC * 1e6) {
        throw new Error('Insufficient escrowed USDC');
      }
    }
    
    // 6. Vérifier USDC balance seller (si requestedUSDC)
    if (offer.requestedUSDC > 0) {
      const sellerUSDC = await this.usdcContract.balanceOf(seller.baseWalletAddress);
      if (sellerUSDC < offer.requestedUSDC * 1e6) {
        throw new Error('Insufficient USDC balance');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // BATCH ATOMIQUE (USDC + NFTs)
    // ═══════════════════════════════════════════════════════════════════════
    
    const calls = [];
    const initiator = await this.userModel.findById(offer.initiatorId);
    
    // 1. Transfer offeredUSDC (escrowed) → Seller
    if (offer.offeredUSDC > 0) {
      calls.push({
        to: process.env.MARKETPLACE_CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: MARKETPLACE_ABI,
          functionName: 'transferEscrowedUSDC',
          args: [initiator.baseWalletAddress, seller.baseWalletAddress, offer.offeredUSDC * 1e6]
        })
      });
    }
    
    // 2. Transfer requestedUSDC : Seller → Initiator
    if (offer.requestedUSDC > 0) {
      calls.push({
        to: process.env.USDC_CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transferFrom',
          args: [seller.baseWalletAddress, initiator.baseWalletAddress, offer.requestedUSDC * 1e6]
        })
      });
    }
    
    // 3. Transfer offered NFTs → Seller
    for (const offeredTokenId of offer.offeredNFTs) {
      calls.push({
        to: process.env.NFT_V2_CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: NFT_ABI,
          functionName: 'transferFrom',
          args: [initiator.baseWalletAddress, seller.baseWalletAddress, offeredTokenId]
        })
      });
    }
    
    // 4. Transfer accepted NFT → Initiator
    calls.push({
      to: process.env.NFT_V2_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'transferFrom',
        args: [seller.baseWalletAddress, initiator.baseWalletAddress, tokenId]
      })
    });
    
    console.log(`📦 Executing batch: ${calls.length} operations`);
    
    // Execute batch atomique (sponsorisé)
    await sendUserOperation(seller.baseWalletAddress, calls, process.env.PAYMASTER_URL);
    
    console.log(`✅ Batch executed successfully`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE DB
    // ═══════════════════════════════════════════════════════════════════════
    
    offer.status = 'accepted';
    offer.acceptedBySellerId = sellerId;
    offer.acceptedWithTokenId = tokenId;
    offer.acceptedAt = new Date();
    await offer.save();
    
    // Update ownership
    for (const offeredTokenId of offer.offeredNFTs) {
      await this.nftModel.updateOne({ tokenId: offeredTokenId }, { ownerId: sellerId });
    }
    await this.nftModel.updateOne({ tokenId }, { ownerId: offer.initiatorId });
    
    console.log(`✅ Collection offer accepted!`);
    
  } catch (error) {
    // Rollback lock si erreur
    await this.collectionOfferModel.updateOne(
      { _id: offerId },
      { status: 'active' }
    );
    throw error;
  }
}

/**
 * OBJECTIF : Valider que NFT correspond aux filtres
 */
private validateNFTFilters(nft: any, filters: any): boolean {
  if (filters.rarity && nft.rarity !== filters.rarity) return false;
  if (filters.yearOfEdition && nft.yearOfEdition !== filters.yearOfEdition) return false;
  if (filters.team && nft.team !== filters.team) return false;
  // ... autres filtres
  
  return true;
}
```

**Avantages :**
- ✅ **Offre publique** (`targetId: null`)
- ✅ **Race condition gérée** (lock via `status: 'processing'`)
- ✅ **Validation filtres backend** (impossible de tricher)
- ✅ **Batch atomique** (tout ou rien)
- ✅ **Escrow sécurisé** (bloqué jusqu'à acceptation)

**Coût Gas :**
- **Create offer :** $0 (escrow sponsorisé)
- **Accept offer :** $0 (sponsorisé)
- **CyLimit :** ~$0.002-0.004 total

---

## 📊 RÉCAPITULATIF COMPLET

### **Coûts Gas par Opération (Base)**

| Opération | User Paie | Sponsorisé | Économie vs Polygon |
|-----------|-----------|------------|---------------------|
| **List NFT** | $0.001 | **$0** | **-93%** ($0.015 → $0) |
| **Buy NFT** | $0.003 | **$0** | **-92%** ($0.038 → $0) |
| **Batch 3 NFTs** | $0.004 | **$0** | **-90%** ($0.040 → $0) |
| **Create Swap** | $0.002 | **$0** | **-96%** ($0.050 → $0) |
| **Accept Swap** | $0.004 | **$0** | **-90%** ($0.040 → $0) |
| **Create Buy Offer** | $0.002 | **$0** | **-92%** ($0.025 → $0) |
| **Accept Buy Offer** | $0.003 | **$0** | **-92%** ($0.038 → $0) |
| **Create Collection Offer** | $0.002 | **$0** | **-92%** ($0.025 → $0) |
| **Accept Collection Offer** | $0.003 | **$0** | **-92%** ($0.038 → $0) |

### **Coûts Mensuels CyLimit (Sponsoring)**

```
Hypothèse : 1000 transactions/mois

Listings : 200 × $0 = $0
Achats : 300 × $0 = $0
Swaps : 100 × $0 = $0
Offers : 400 × $0 = $0

TOTAL SPONSORISÉ : ~$3-5/mois 🎉

Économie vs Polygon : ~$40-50/mois
```

### **Configuration Paymaster Requise**

```bash
# Sur CDP Portal : https://portal.cdp.coinbase.com/

Allowlist functions :
- NFT_V2_CONTRACT
  ✅ transferFrom(address,address,uint256)
  ✅ safeTransferFrom(address,address,uint256)

- MARKETPLACE_CONTRACT
  ✅ escrowUSDC(uint256)
  ✅ buyNFT(uint256,address)
  ✅ buyMultipleNFTs(uint256[],address[])

- USDC_CONTRACT
  ✅ transfer(address,uint256)
  ✅ transferFrom(address,address,uint256)
  ✅ approve(address,uint256)

Limits :
- Global : $100/mois
- Per-User : $5/mois

Note: Les fonctions releaseUSDC et transferEscrowedUSDC 
sont onlyOwner (backend CyLimit) donc pas dans le Paymaster.
```

---

## ✅ CHECKLIST IMPLÉMENTATION

### **Smart Contracts**
- [ ] Déployer CyLimitNFT_v2 sur Base
- [ ] Déployer CyLimitMarketplace_v2_Base (contrat simplifié)
- [ ] Whitelist Marketplace dans NFT
- [ ] Tester escrowUSDC / releaseUSDC / transferEscrowedUSDC
- [ ] Tester buyNFT / buyMultipleNFTs

### **Backend Services**
- [ ] Implémenter OfferService (fonction générique unifiée)
- [ ] Implémenter AuctionService (enchères avec escrow)
- [ ] Implémenter escrow allocation tracking
- [ ] Implémenter validation ownership (DB + Blockchain)
- [ ] Implémenter filtrage collection offers
- [ ] Implémenter notifications sellers

### **Paymaster**
- [ ] Activer Paymaster sur CDP Portal
- [ ] Allowlist escrowUSDC, buyNFT, buyMultipleNFTs
- [ ] Allowlist USDC (transfer, transferFrom, approve)
- [ ] Allowlist NFT (transferFrom, safeTransferFrom)
- [ ] Configurer limites sponsoring ($100/mois global)
- [ ] Tester sponsoring sur testnet

### **Frontend**
- [ ] Interface listing NFTs (DB uniquement, $0)
- [ ] Interface achat simple
- [ ] Interface création offres 1-to-1 (form générique : offeredNFTs/USDC + requestedNFTs/USDC)
- [ ] Interface création collection offers (filtres publics + offre publique)
- [ ] Interface acceptation offres (vérifications avant batch)
- [ ] Affichage gas sponsorisé ($0 pour user)

### **Tests**
- [ ] Test listing + achat classique
- [ ] Test offres 1-to-1 (buy, swap, swap+USDC)
- [ ] Test collection offers publiques (race condition)
- [ ] Test escrow USDC + allocation tracking
- [ ] Test vérifications ownership (DB + Blockchain)
- [ ] Test batch atomique (USDC + NFTs)
- [ ] Test lock offres publiques (prevent double acceptance)
- [ ] Valider taux succès > 95%

---

## 🎉 AVANTAGES BASE MARCHÉ SECONDAIRE

1. ✅ **Architecture ultra-simplifiée** (3 fonctions escrow réutilisables)
2. ✅ **Fonction offer générique** (1 seule fonction pour tous types)
3. ✅ **Logique métier backend** (flexibilité maximale)
4. ✅ **Gas réduit de 92%** (vs Polygon)
5. ✅ **Sponsoring possible** (UX parfaite, $0 pour users)
6. ✅ **Batch transactions** (1 signature pour USDC + NFTs)
7. ✅ **Escrow sécurisé** (USDC garanti, tracking allocation)
8. ✅ **Collection offers** (filtrage backend, sans on-chain)
9. ✅ **Coût CyLimit dérisoire** ($2-3/mois pour 1000 TX)
10. ✅ **Debugging facile** (logique en backend, pas on-chain)

---

**Date de mise à jour :** 16 Octobre 2025  
**Status :** 📋 SPÉCIFICATIONS COMPLÈTES

