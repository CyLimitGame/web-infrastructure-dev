# 📜 CONTRAT MARKETPLACE V2 - BASE (SIMPLIFIÉ)

**Date :** 17 Octobre 2025  
**Contrat :** `CyLimitMarketplace_v2_Base.sol`  
**Localisation :** `cylimit-admin-backend/contracts/CyLimitMarketplace_v2_Base.sol`  
**Version :** 2.0.0 - Architecture Finale

---

## 🎯 PHILOSOPHIE

**Contrat ultra-simple = Maximum de flexibilité**

- ✅ **3 fonctions escrow** → Réutilisables pour tout (enchères, offers, swaps)
- ✅ **Logique métier en backend** → Flexibilité totale, pas de limitations blockchain
- ✅ **CyLimit contrôle** → `onlyOwner` pour release/transfer
- ✅ **Gas optimisé** → Pas de storage on-chain pour logique complexe
- ✅ **Approval Standard** → Users font `setApprovalForAll` une fois

---

## 🏗️ ARCHITECTURE

### **Principe Central : Escrow USDC Générique**

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART CONTRACT                           │
│                                                             │
│  1 fonction → escrowUSDC(amount)                           │
│     ↓ User lock USDC dans contrat                         │
│                                                             │
│  2 fonctions CyLimit (onlyOwner) :                        │
│     → releaseUSDC(user, amount)      (refund)             │
│     → transferEscrowedUSDC(from, to) (finalize)           │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    BACKEND (CyLimit)                        │
│                                                             │
│  Gère toute la logique métier :                            │
│  - Enchères (auto-bid en DB)                               │
│  - Buy offers (validation)                                  │
│  - Collection offers (traits matching)                      │
│  - Swaps (ownership checks)                                 │
│                                                             │
│  Appelle smart contract uniquement pour :                  │
│  - Lock USDC (escrowUSDC)                                  │
│  - Unlock USDC (releaseUSDC / transferEscrowedUSDC)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **PRÉ-REQUIS : APPROVAL NFT**

### **Setup Initial (Une fois par user)**

Avant qu'un user puisse vendre/échanger des NFTs, il doit **approuver le Marketplace** :

```typescript
// User fait setApprovalForAll (UNE SEULE FOIS)
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
- ✅ **Permanente** (jusqu'à révocation)
- ✅ User signe **UNE SEULE FOIS** au premier listing

**Ensuite, aucune signature requise pour :**
- Vendre NFT (seller side)
- Accept offer (target side)
- Accept swap (target side)

**Le Marketplace utilise cette approval pour appeler `transferFrom(seller, buyer, tokenId)` automatiquement.**

---

## 📋 FONCTIONS DU CONTRAT

### **1. Escrow USDC (User → Contract)**

```solidity
function escrowUSDC(uint256 amount) external nonReentrant
```

**Appelé par :**
- User qui place enchère (maxBid)
- User qui crée buy offer (price)
- User qui crée collection offer (price)
- User qui crée swap offer avec USDC (usdcAmount)

**Flow :**
```
User → escrowUSDC(200 USDC)
  ↓
Contract stocke : escrowedUSDC[user] = 200 USDC
  ↓
Event : USDCEscrowed(user, 200 USDC)
```

**Exemples :**
```typescript
// Enchère
await marketplaceContract.escrowUSDC(maxBid * 1e6, { from: userAddress });

// Buy offer
await marketplaceContract.escrowUSDC(price * 1e6, { from: buyerAddress });

// Swap offer (si initiator paie)
await marketplaceContract.escrowUSDC(usdcAmount * 1e6, { from: initiatorAddress });
```

---

### **2. Release USDC (Contract → User)**

```solidity
function releaseUSDC(address user, uint256 amount) external onlyOwner nonReentrant
```

**Appelé par :** Backend CyLimit uniquement

**Cas d'usage :**
- ✅ **Refund loser enchère** (quelqu'un a surenchérit avec maxBid plus élevé)
- ✅ **Refund surplus winner enchère** (maxBid 200, currentBid final 181 → refund 19)
- ✅ **Cancel buy offer** (buyer annule)
- ✅ **Cancel collection offer** (buyer annule)
- ✅ **Cancel swap offer** (initiator annule)

**Flow :**
```
Backend appelle → releaseUSDC(user, 200 USDC)
  ↓
Contract : escrowedUSDC[user] -= 200 USDC
  ↓
Transfer 200 USDC → user
  ↓
Event : USDCReleased(user, 200 USDC)
```

**Exemples :**
```typescript
// Refund loser enchère
await marketplaceContract.releaseUSDC(loserAddress, loserMaxBid * 1e6);

// Refund surplus winner
const surplus = winnerMaxBid - finalBid;
await marketplaceContract.releaseUSDC(winnerAddress, surplus * 1e6);

// Cancel offer
await marketplaceContract.releaseUSDC(buyerAddress, offerPrice * 1e6);
```

---

### **3. Transfer USDC Escrowed (Contract → Recipient)**

```solidity
function transferEscrowedUSDC(address from, address to, uint256 amount) external onlyOwner nonReentrant
```

**Appelé par :** Backend CyLimit uniquement

**Cas d'usage :**
- ✅ **Finalize enchère** → Transfer currentBid (from winner) → CyLimit
- ✅ **Accept buy offer** → Transfer price (from buyer) → Seller
- ✅ **Accept collection offer** → Transfer price (from buyer) → Seller
- ✅ **Accept swap offer** → Transfer USDC (from initiator) → Target

**Flow :**
```
Backend appelle → transferEscrowedUSDC(buyer, seller, 100 USDC)
  ↓
Contract : escrowedUSDC[buyer] -= 100 USDC
  ↓
Transfer 100 USDC → seller
  ↓
Event : USDCTransferred(buyer, seller, 100 USDC)
```

**Exemples :**
```typescript
// Finalize enchère
// Enchère terminée : winner → CyLimit
await marketplaceContract.transferEscrowedUSDC(
  winnerAddress,
  cylimitMasterWallet,
  finalBid * 1e6
);

// Offre acceptée : initiator → target
await marketplaceContract.transferEscrowedUSDC(
  initiatorAddress,
  targetAddress,
  offeredUSDC * 1e6
);
```

---

### **4. Batch Release (Optimisation)**

```solidity
function batchReleaseUSDC(address[] calldata users, uint256[] calldata amounts) external onlyOwner nonReentrant
```

**Appelé par :** Backend CyLimit uniquement

**Cas d'usage :**
- ✅ **Refund multiple losers enchère** en 1 seule transaction

**Exemple :**
```typescript
// 5 users ont bid mais perdu
const losers = [user1, user2, user3, user4, user5];
const amounts = [100e6, 150e6, 180e6, 120e6, 90e6];

await marketplaceContract.batchReleaseUSDC(losers, amounts);
// 1 seule TX au lieu de 5 !
```

---

### **5. Achats Directs (Listings en DB)**

```solidity
function buyNFT(uint256 tokenId, address seller) external nonReentrant
function buyMultipleNFTs(uint256[] calldata tokenIds, address[] calldata sellers) external nonReentrant
```

**Pré-requis :**
- ✅ **Seller doit avoir fait `setApprovalForAll(Marketplace, true)` avant de lister** (une fois)

**Flow :**
```
1. User list NFT en DB (POST /marketplace/list)
   → Vérifier si seller a déjà approuvé Marketplace
   → Si non : demander setApprovalForAll (1× permanent)
   → Si oui : sauvegarder en MongoDB uniquement ($0)

2. User achète :
   → Batch transaction (buyer signe) :
     - Transfer USDC (buyer → seller)
     - Transfer USDC fees (buyer → CyLimit)
     - buyNFT(tokenId, seller) ← Contract
       ↳ Marketplace utilise son approval pour : seller → buyer
```

**Code Backend (listing) :**
```typescript
// 1. Vérifier approval
const isApproved = await nftContract.isApprovedForAll(
  seller.address,
  MARKETPLACE_CONTRACT
);

if (!isApproved) {
  // Demander approval au seller (1× permanent)
  return {
    needsApproval: true,
    message: "Vous devez approuver le marketplace avant de lister"
  };
}

// 2. Sauvegarder listing en DB (pas de blockchain)
await listingModel.create({ nftId, price, sellerId });
```

**Code Backend (achat) :**
```typescript
// ═══════════════════════════════════════════════════════════════════════
// PRÉ-REQUIS : Seller a déjà fait setApprovalForAll(Marketplace, true)
// ═══════════════════════════════════════════════════════════════════════

// Batch transaction sponsorisé (buyer signe)
const calls = [
  // 1. USDC → Seller
  {
    to: USDC_CONTRACT,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [sellerAddress, price * 1e6]
    })
  },
  // 2. USDC fees → CyLimit
  {
    to: USDC_CONTRACT,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [MASTER_WALLET, fees * 1e6]
    })
  },
  // 3. Transfer NFT
  // ☝️ Marketplace utilise son approval pour transférer : seller → buyer
  {
    to: MARKETPLACE_CONTRACT,
    data: encodeFunctionData({
      abi: MARKETPLACE_ABI,
      functionName: 'buyNFT',
      args: [tokenId, sellerAddress]
    })
  }
];

// Envoi sponsorisé (gas: $0)
await sendUserOperation(buyerAddress, calls, PAYMASTER_URL);

// ✅ Seller n'a rien signé (il a juste approuvé le Marketplace au début)
// ✅ Buyer a signé la batch transaction (USDC + achat)
```

---

## 📊 STATE VARIABLES

```solidity
// Contrats
IERC721 public nftContract;
IERC20 public usdcContract;

// Escrow USDC par user
mapping(address => uint256) public escrowedUSDC;

// Stats
uint256 public totalSales;
```

---

## 🔔 EVENTS

```solidity
event NFTBought(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
event USDCEscrowed(address indexed user, uint256 amount);
event USDCReleased(address indexed user, uint256 amount);
event USDCTransferred(address indexed from, address indexed to, uint256 amount);
```

---

## 💡 EXEMPLES COMPLETS

### **Cas 1 : Enchère avec Auto-Bid**

```typescript
// ═══════════════════════════════════════════════════════════════════════
// BACKEND SERVICE : AuctionService
// ═══════════════════════════════════════════════════════════════════════

async placeBid(auctionId: string, userId: string, maxBid: number) {
  const auction = await this.auctionModel.findById(auctionId);
  const user = await this.userModel.findById(userId);
  
  if (!auction.active) throw new Error('Auction not active');
  if (new Date() > auction.endTime) throw new Error('Auction ended');
  if (maxBid <= auction.currentBid) throw new Error('Bid too low');
  
  console.log(`🎯 User ${user.email} bid ${maxBid} USDC (current: ${auction.currentBid})`);
  
  // 1. Vérifier AVANT d'escrow
  if (maxBid > auction.currentWinnerMaxBid) {
    // ✅ Nouveau winner → ESCROW UNIQUEMENT maintenant
    console.log(`🏆 Nouveau winner ! (ancien: ${auction.currentWinner?.email})`);
    
    // Escrow USDC
    await this.marketplaceContract.escrowUSDC(maxBid * 1e6, {
      from: user.baseWalletAddress
    });
    
    console.log(`✅ USDC escrowed: ${maxBid} USDC`);
    
    // Refund ancien winner (si existe)
    if (auction.currentWinner) {
      const oldWinner = await this.userModel.findById(auction.currentWinner);
      
      console.log(`💸 Refund ${oldWinner.email}: ${auction.currentWinnerMaxBid} USDC`);
      
      await this.marketplaceContract.releaseUSDC(
        oldWinner.baseWalletAddress,
        auction.currentWinnerMaxBid * 1e6
      );
    }
    
    // Update auction en DB
    auction.currentBid = maxBid;
    auction.currentWinner = userId;
    auction.currentWinnerMaxBid = maxBid;
    auction.bids.push({
      userId,
      maxBid,
      timestamp: new Date()
    });
    await auction.save();
    
    console.log(`📊 Auction updated: currentBid=${maxBid}, winner=${user.email}`);
    
  } else {
    // ❌ maxBid ≤ ancien maxBid → User a perdu (PAS D'ESCROW)
    console.log(`❌ Bid trop bas (max actuel: ${auction.currentWinnerMaxBid})`);
    console.log(`⚠️  Pas d'escrow car bid rejeté`);
    
    // Auto-increment currentBid jusqu'au maxBid du user
    const newCurrentBid = Math.min(maxBid + 1, auction.currentWinnerMaxBid);
    
    // Update currentBid (winner reste le même)
    auction.currentBid = newCurrentBid;
    auction.bids.push({
      userId,
      maxBid,
      status: 'outbid',
      timestamp: new Date()
    });
    await auction.save();
    
    console.log(`📊 CurrentBid updated: ${newCurrentBid}, winner unchanged`);
    // Note: Pas de refund car pas d'escrow
  }
}

async finalizeAuction(auctionId: string) {
  const auction = await this.auctionModel.findById(auctionId);
  
  if (!auction.currentWinner) {
    throw new Error('No winner (no bids)');
  }
  
  const winner = await this.userModel.findById(auction.currentWinner);
  
  console.log(`🎉 Finalizing auction: Winner=${winner.email}, Price=${auction.currentBid}`);
  
  // 1. Transfer USDC escrowed (currentBid) → CyLimit
  await this.marketplaceContract.transferEscrowedUSDC(
    winner.baseWalletAddress,
    process.env.MASTER_WALLET_ADDRESS,
    auction.currentBid * 1e6
  );
  
  console.log(`💰 ${auction.currentBid} USDC → CyLimit`);
  
  // 2. Refund surplus (maxBid - currentBid)
  const surplus = auction.currentWinnerMaxBid - auction.currentBid;
  if (surplus > 0) {
    await this.marketplaceContract.releaseUSDC(
      winner.baseWalletAddress,
      surplus * 1e6
    );
    
    console.log(`💸 Refund surplus: ${surplus} USDC → ${winner.email}`);
  }
  
  // 3. Transfer NFT → Winner
  await this.nftContract.transferFrom(
    process.env.MASTER_WALLET_ADDRESS,
    winner.baseWalletAddress,
    auction.nftTokenId
  );
  
  console.log(`🎨 NFT #${auction.nftTokenId} → ${winner.email}`);
  
  // 4. Update DB
  auction.status = 'finalized';
  auction.finalPrice = auction.currentBid;
  auction.finalizedAt = new Date();
  await auction.save();
  
  console.log(`✅ Auction finalized !`);
}
```

---

### **Cas 2 : Offers (Buy + Swap fusionnés)**

**Principe :** Buy offer = 1 NFT, Swap offer = N NFTs. Même logique !

```typescript
// ═══════════════════════════════════════════════════════════════════════
// BACKEND SERVICE : OfferService (BUY + SWAP fusionnés)
// ═══════════════════════════════════════════════════════════════════════

/**
 * OBJECTIF : Créer une offer (buy = 1 NFT, swap = N NFTs + USDC bidirectionnel)
 * 
 * PARAMÈTRES :
 * - initiatorId : User qui crée l'offer
 * - targetId : User qui recevra l'offer
 * - offeredNFTs : NFTs proposés par initiator ([] pour buy offer)
 * - offeredUSDC : USDC proposé par initiator (0 si pas d'USDC)
 * - requestedNFTs : NFTs demandés (1+ NFTs)
 * - requestedUSDC : USDC demandé au target (0 si pas d'USDC)
 * 
 * EXEMPLES :
 * - Buy offer : offeredNFTs=[], offeredUSDC=100, requestedNFTs=[123], requestedUSDC=0
 * - Swap : offeredNFTs=[111,222], offeredUSDC=50, requestedNFTs=[333], requestedUSDC=0
 * - Swap inverse : offeredNFTs=[111], offeredUSDC=0, requestedNFTs=[333,444], requestedUSDC=30
 */
async createOffer(
  initiatorId: string,
  targetId: string,
  offeredNFTs: number[],
  offeredUSDC: number,
  requestedNFTs: number[],
  requestedUSDC: number
) {
  const initiator = await this.userModel.findById(initiatorId);
  const target = await this.userModel.findById(targetId);
  
  // Vérifications : Au moins 1 NFT doit être échangé
  if (offeredNFTs.length === 0 && requestedNFTs.length === 0) {
    throw new Error('Must offer or request at least 1 NFT (USDC-only transfers not allowed)');
  }
  
  // Vérifications ownership offered NFTs (DB uniquement, blockchain à l'acceptation)
  for (const tokenId of offeredNFTs) {
    const nft = await this.nftModel.findOne({ tokenId });
    if (!nft) throw new Error(`NFT #${tokenId} not found`);
    if (nft.ownerId !== initiatorId) throw new Error(`You don't own NFT #${tokenId} (DB)`);
  }
  
  // Vérifications ownership requested NFTs (DB uniquement)
  for (const tokenId of requestedNFTs) {
    const nft = await this.nftModel.findOne({ tokenId });
    if (!nft) throw new Error(`NFT #${tokenId} not found`);
    if (nft.ownerId !== targetId) throw new Error(`Target doesn't own NFT #${tokenId} (DB)`);
  }
  
  const offerType = offeredNFTs.length === 0 ? 'buy' : 'swap';
  
  console.log(`📝 Creating ${offerType} offer:`);
  console.log(`   Offered: ${offeredNFTs.length} NFTs + ${offeredUSDC} USDC`);
  console.log(`   Requested: ${requestedNFTs.length} NFTs + ${requestedUSDC} USDC`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // ESCROW USDC (si initiator offre USDC)
  // ═══════════════════════════════════════════════════════════════════════
  
  if (offeredUSDC > 0) {
    // Vérifier balance USDC
    const usdcBalance = await this.usdcContract.balanceOf(initiator.baseWalletAddress);
    if (usdcBalance < offeredUSDC * 1e6) {
      throw new Error('Insufficient USDC balance');
    }
    
    // Vérifier allocation escrow disponible
    const contractEscrow = await this.marketplaceContract.getEscrowedBalance(initiator.baseWalletAddress);
    const activeOffers = await this.offerModel.find({
      initiatorId,
      status: 'active',
      offeredUSDC: { $gt: 0 }
    });
    
    const totalAllocated = activeOffers.reduce((sum, o) => sum + o.offeredUSDC, 0);
    const availableEscrow = (contractEscrow / 1e6) - totalAllocated;
    
    console.log(`   Current escrow: ${contractEscrow / 1e6} USDC`);
    console.log(`   Already allocated: ${totalAllocated} USDC`);
    console.log(`   Available: ${availableEscrow} USDC`);
    
    const needsEscrow = offeredUSDC - availableEscrow;
    
    if (needsEscrow > 0) {
      console.log(`   Escrowing additional: ${needsEscrow} USDC`);
      
      await this.marketplaceContract.escrowUSDC(needsEscrow * 1e6, {
        from: initiator.baseWalletAddress
      });
      
      console.log(`✅ USDC escrowed: ${needsEscrow} USDC`);
    } else {
      console.log(`✅ Using existing escrow (no additional escrow needed)`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // SAVE EN DB
  // ═══════════════════════════════════════════════════════════════════════
  
  const offer = await this.offerModel.create({
    type: offerType,
    initiatorId,
    targetId,
    offeredNFTs,
    offeredUSDC,
    requestedNFTs,
    requestedUSDC,
    status: 'active',
    createdAt: new Date()
  });
  
  console.log(`✅ ${offerType} offer created: ${offer._id}`);
  
  return offer;
}

/**
 * OBJECTIF : Accepter une offer
 * 
 * VÉRIFICATIONS CRITIQUES :
 * - Ownership DB + Blockchain pour TOUS les NFTs
 * - Balance escrow suffisante (si USDC)
 */
async acceptOffer(offerId: string, targetId: string) {
  const offer = await this.offerModel.findById(offerId);
  const initiator = await this.userModel.findById(offer.initiatorId);
  const target = await this.userModel.findById(targetId);
  
  if (offer.targetId !== targetId) throw new Error('Not your offer');
  if (offer.status !== 'active') throw new Error('Offer not active');
  
  console.log(`✅ Accepting ${offer.type} offer: ${offer._id}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // VÉRIFICATIONS CRITIQUES
  // ═══════════════════════════════════════════════════════════════════════
  
  // 1. Vérifier ownership offered NFTs (DB + Blockchain)
  for (const tokenId of offer.offeredNFTs) {
    const nft = await this.nftModel.findOne({ tokenId });
    if (nft.ownerId !== offer.initiatorId) {
      throw new Error(`Initiator no longer owns NFT #${tokenId} (DB)`);
    }
    
    const onChainOwner = await this.nftContract.ownerOf(tokenId);
    if (onChainOwner.toLowerCase() !== initiator.baseWalletAddress.toLowerCase()) {
      throw new Error(`Initiator no longer owns NFT #${tokenId} (Blockchain)`);
    }
  }
  
  // 2. Vérifier ownership requested NFTs (DB + Blockchain)
  for (const tokenId of offer.requestedNFTs) {
    const nft = await this.nftModel.findOne({ tokenId });
    if (nft.ownerId !== targetId) {
      throw new Error(`You no longer own NFT #${tokenId} (DB)`);
    }
    
    const onChainOwner = await this.nftContract.ownerOf(tokenId);
    if (onChainOwner.toLowerCase() !== target.baseWalletAddress.toLowerCase()) {
      throw new Error(`You no longer own NFT #${tokenId} (Blockchain)`);
    }
  }
  
  // 3. Vérifier escrow USDC (si offeredUSDC)
  if (offer.offeredUSDC > 0) {
    const escrowedBalance = await this.marketplaceContract.getEscrowedBalance(initiator.baseWalletAddress);
    if (escrowedBalance < offer.offeredUSDC * 1e6) {
      throw new Error('Insufficient escrowed USDC in contract');
    }
  }
  
  // 4. Vérifier balance USDC target (si requestedUSDC)
  if (offer.requestedUSDC > 0) {
    const targetUSDCBalance = await this.usdcContract.balanceOf(target.baseWalletAddress);
    if (targetUSDCBalance < offer.requestedUSDC * 1e6) {
      throw new Error('Target has insufficient USDC balance');
    }
  }
  
  console.log(`✅ All verifications passed`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // EXÉCUTION BATCH ATOMIQUE (USDC + NFTs)
  // ═══════════════════════════════════════════════════════════════════════
  
  const calls = [];
  
  // 1. Transfer offeredUSDC (escrowed) → Target
  if (offer.offeredUSDC > 0) {
    calls.push({
      to: process.env.MARKETPLACE_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: MARKETPLACE_ABI,
        functionName: 'transferEscrowedUSDC',
        args: [initiator.baseWalletAddress, target.baseWalletAddress, offer.offeredUSDC * 1e6]
      })
    });
    
    console.log(`💰 Will transfer ${offer.offeredUSDC} USDC (escrowed) → ${target.email}`);
  }
  
  // 2. Transfer requestedUSDC (non-escrowed) : Target → Initiator
  if (offer.requestedUSDC > 0) {
    calls.push({
      to: process.env.USDC_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transferFrom',
        args: [target.baseWalletAddress, initiator.baseWalletAddress, offer.requestedUSDC * 1e6]
      })
    });
    
    console.log(`💰 Will transfer ${offer.requestedUSDC} USDC (from ${target.email} → ${initiator.email})`);
  }
  
  // 3. Transfer offered NFTs → Target
  for (const tokenId of offer.offeredNFTs) {
    calls.push({
      to: process.env.NFT_V2_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'transferFrom',
        args: [initiator.baseWalletAddress, target.baseWalletAddress, tokenId]
      })
    });
  }
  
  // 4. Transfer requested NFTs → Initiator
  for (const tokenId of offer.requestedNFTs) {
    calls.push({
      to: process.env.NFT_V2_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'transferFrom',
        args: [target.baseWalletAddress, initiator.baseWalletAddress, tokenId]
      })
    });
  }
  
  console.log(`📦 Batch transaction: ${calls.length} operations (USDC + NFTs)`);
  
  // Execute batch atomique (sponsorisé)
  await sendUserOperation(target.baseWalletAddress, calls, process.env.PAYMASTER_URL);
  
  console.log(`✅ Batch executed successfully`);
  
  // 3. Update DB
  offer.status = 'accepted';
  offer.acceptedAt = new Date();
  await offer.save();
  
  // Update ownership
  for (const tokenId of offer.offeredNFTs) {
    await this.nftModel.updateOne({ tokenId }, { ownerId: targetId });
  }
  for (const tokenId of offer.requestedNFTs) {
    await this.nftModel.updateOne({ tokenId }, { ownerId: offer.initiatorId });
  }
  
  console.log(`✅ ${offer.type} offer accepted !`);
}

async cancelOffer(offerId: string, userId: string) {
  const offer = await this.offerModel.findById(offerId);
  const user = await this.userModel.findById(userId);
  
  if (offer.initiatorId !== userId) throw new Error('Not your offer');
  if (offer.status !== 'active') throw new Error('Offer not active');
  
  console.log(`❌ Cancelling ${offer.type} offer: ${offer._id}`);
  
  // Refund USDC (si applicable)
  if (offer.usdcAmount > 0) {
    await this.marketplaceContract.releaseUSDC(
      user.baseWalletAddress,
      offer.usdcAmount * 1e6
    );
    
    console.log(`💸 Refund ${offer.usdcAmount} USDC → ${user.email}`);
  }
  
  // Update DB
  offer.status = 'cancelled';
  offer.cancelledAt = new Date();
  await offer.save();
  
  console.log(`✅ ${offer.type} offer cancelled`);
}
```

**Exemples d'utilisation :**

```typescript
// ═══════════════════════════════════════════════════════════════════════
// CAS 1 : Buy offer (USDC → NFT)
// ═══════════════════════════════════════════════════════════════════════
await offerService.createOffer(
  buyerId,
  sellerId,
  [], // Pas d'NFT offert
  100, // 100 USDC offert
  [123], // 1 NFT demandé
  0 // Pas d'USDC demandé
);

// ═══════════════════════════════════════════════════════════════════════
// CAS 2 : Swap offer (NFTs + USDC → NFTs)
// ═══════════════════════════════════════════════════════════════════════
await offerService.createOffer(
  initiatorId,
  targetId,
  [111, 222], // 2 NFTs offerts
  50, // + 50 USDC offert
  [333, 444, 555], // 3 NFTs demandés
  0 // Pas d'USDC demandé
);

// ═══════════════════════════════════════════════════════════════════════
// CAS 3 : Swap inverse (NFTs → NFTs + USDC)
// ═══════════════════════════════════════════════════════════════════════
await offerService.createOffer(
  initiatorId,
  targetId,
  [111], // 1 NFT offert
  0, // Pas d'USDC offert
  [333, 444], // 2 NFTs demandés
  30 // + 30 USDC demandé au target
);

// ═══════════════════════════════════════════════════════════════════════
// CAS 4 : Collection offer PUBLIQUE (USDC → NFTs avec filtres)
// ═══════════════════════════════════════════════════════════════════════

// NOUVELLE ARCHITECTURE : Offre publique visible par TOUS les sellers
await collectionOfferService.createCollectionOffer(
  buyerId,
  targetId: null, // ← OFFRE PUBLIQUE (pas user-specific)
  [], // Pas d'NFT offert
  200, // 200 USDC offert (escrowed immédiatement)
  {
    rarity: 'legendary',
    team: 'UAE Team Emirates'
  }, // Filtres au lieu de tokenIds
  0 // Pas d'USDC demandé
);

// → Tous les sellers avec NFTs matching reçoivent notification
// → Premier seller qui accepte gagne l'offre (race condition gérée)

// ═══════════════════════════════════════════════════════════════════════
// CAS 5 : Swap complexe (NFTs + USDC ↔ NFTs + USDC)
// ═══════════════════════════════════════════════════════════════════════
await offerService.createOffer(
  initiatorId,
  targetId,
  [111, 222], // 2 NFTs offerts
  50, // + 50 USDC offert
  [333], // 1 NFT demandé
  20 // + 20 USDC demandé (donc net: initiator paie 30 USDC)
);
```

---

## 🔐 SÉCURITÉ

### **Protections Implémentées**

1. ✅ **ReentrancyGuard** : Toutes fonctions critiques
2. ✅ **Ownable** : `releaseUSDC` / `transferEscrowedUSDC` admin uniquement
3. ✅ **Ownership checks** : `buyNFT` vérifie seller = owner
4. ✅ **Balance checks** : `require(escrowedUSDC[user] >= amount)`
5. ✅ **Transfer checks** : `require(transfer success)`

### **Limites**

- 🔒 **Max 50 NFTs** dans `buyMultipleNFTs()`
- 🔒 **Max 50 users** dans `batchReleaseUSDC()`

---

## 📈 AVANTAGES

### **1. Ultra-Simple**
- 3 fonctions escrow réutilisables
- Pas de structs complexes
- Pas de mappings multiples

### **2. Flexible**
- Logique métier en backend
- Modifications sans redéploiement contrat
- Ajout de nouveaux cas d'usage facile

### **3. Gas Optimisé**
- Pas de storage on-chain inutile
- Batch operations
- Sponsoring via Paymaster

### **4. Sécurisé**
- CyLimit contrôle release/transfer
- Escrow transparent on-chain
- Users voient leur balance escrowed

---

## 📋 CHECKLIST DÉPLOIEMENT

### **Testnet (Base Sepolia)**
- [ ] Compiler Solidity 0.8.20
- [ ] Déployer avec Master Server Wallet
- [ ] Constructor : `CyLimitNFT_v2`, `USDC testnet`, `Master Wallet`
- [ ] Tester escrowUSDC()
- [ ] Tester releaseUSDC()
- [ ] Tester transferEscrowedUSDC()
- [ ] Tester batchReleaseUSDC()
- [ ] Tester buyNFT()
- [ ] Tester buyMultipleNFTs()
- [ ] Vérifier events émis
- [ ] Vérifier balances escrow

### **Mainnet (Base)**
- [ ] Déployer avec Master Server Wallet
- [ ] Constructor : `CyLimitNFT_v2 mainnet`, `USDC Base`, `Master Wallet`
- [ ] Vérifier sur Basescan
- [ ] Tester 1 escrow/release réel
- [ ] Activer Paymaster (allowlist contract)
- [ ] Monitorer logs

---

## 📞 RÉFÉRENCES

- **Migration complète :** [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md)
- **Marché primaire :** [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)
- **Marché secondaire :** [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)
- **Index général :** [INDEX-BASE-MIGRATION.md](./INDEX-BASE-MIGRATION.md)

---

**Maintenu par :** Équipe CyLimit  
**Date :** 16 Octobre 2025  
**Version :** 2.1.0 (Simplifié)
