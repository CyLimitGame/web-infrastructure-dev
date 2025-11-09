# 🏪 MARCHÉ PRIMAIRE - CYLIMIT → USERS (Base)

**Date :** 16 Octobre 2025  
**Status :** 📋 SPÉCIFICATIONS COMPLÈTES  
**Marché :** CyLimit vend ses NFTs aux users

---

## 🎯 VUE D'ENSEMBLE

Le **marché primaire** permet à CyLimit de vendre ses propres NFTs (stockés dans le Master Server Wallet) directement aux users via :
1. **Achat direct** (prix fixe)
2. **Enchères** (prix maximum avec auto-bid)

---

## 💰 MODES DE PAIEMENT

| Mode | Description | Flux |
|------|-------------|------|
| **USDC (Embedded Wallet)** | User paie avec USDC on-chain | Embedded Wallet → Master Wallet |
| **Carte Bancaire (Stripe)** | User paie par CB (fiat) | Stripe → Conversion USDC → Master Wallet |

---

## 📦 CAS 1 : ACHAT DIRECT (Prix Fixe)

### **Scénario**
```
CyLimit vend : NFT #123 (Pogacar rare) à 100 USDC
User achète : Paiement USDC ou CB
```

---

### **Option 1a : Paiement USDC** 💎

#### **Flow Complet**

```
┌─────────────────┐
│  USER (Buyer)   │
└────────┬────────┘
         │ 1. Clic "Acheter 100 USDC"
         ↓
┌──────────────────────────┐
│  FRONTEND (Next.js)      │
│  - Affiche modal achat   │
│  - Vérifie balance USDC  │
└────────┬─────────────────┘
         │ 2. POST /primary-market/buy
         ↓
┌──────────────────────────┐
│  BACKEND (User)          │
│  - Vérifie disponibilité │
│  - Vérifie balance user  │
└────────┬─────────────────┘
         │ 3. Batch Transaction (ERC-4337)
         ↓
┌─────────────────────────────────────────────────┐
│  SMART ACCOUNT (User Embedded Wallet)           │
│                                                 │
│  Batch contient 2 opérations :                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Op 1 : Transfer 100 USDC                 │  │
│  │        From: User Embedded Wallet        │  │
│  │        To: Master Server Wallet          │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ Op 2 : safeTransferFrom(NFT #123)       │  │
│  │        From: Master Wallet               │  │
│  │        To: User Embedded Wallet          │  │
│  │        (Via whitelisted Master Wallet)   │  │
│  └──────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────┘
         │ 4. Tout ou rien (atomique)
         ↓
    ✅ SUCCESS
    User reçoit NFT
    CyLimit reçoit USDC
```

#### **Code Backend**

```typescript
// user-backend/src/modules/primary-market/primary-market.service.ts

async buyNFTWithUSDC(userId: string, nftId: string) {
  const user = await this.userModel.findById(userId);
  const nft = await this.nftModel.findById(nftId);

  // Vérifications
  if (!nft.availableForSale) throw new Error('NFT non disponible');
  if (nft.price > user.usdcBalance) throw new Error('Balance insuffisante');

  console.log(`🛒 Achat NFT #${nft.tokenId} pour ${nft.price} USDC`);

  // Préparer batch transaction
  const batch = [
    // Op 1 : Transfer USDC User → CyLimit
    {
      to: process.env.USDC_BASE_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [process.env.MASTER_WALLET_ADDRESS, nft.price * 1e6]
      })
    },
    // Op 2 : Transfer NFT CyLimit → User (via Master Wallet whitelisté)
    {
      to: process.env.NFT_V2_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'safeTransferFrom',
        args: [
          process.env.MASTER_WALLET_ADDRESS,
          user.baseWalletAddress,
          nft.tokenId
        ]
      })
    }
  ];

  // Exécuter batch via CDP
  const userOperation = await this.coinbaseService.sendUserOperation({
    userAddress: user.baseWalletAddress,
    calls: batch,
    paymasterUrl: process.env.PAYMASTER_URL // ← CyLimit sponsorise le gas !
  });

  await userOperation.wait();

  console.log(`✅ NFT acheté (TX: ${userOperation.hash})`);

  // Mettre à jour DB
  nft.ownerId = userId;
  nft.availableForSale = false;
  await nft.save();

  user.usdcBalance -= nft.price;
  await user.save();

  return {
    success: true,
    txHash: userOperation.hash,
    nftId: nft._id
  };
}
```

**Coût Gas :**
- User : **$0** (sponsorisé par Paymaster)
- CyLimit : **~$0.003** (batch de 2 ops)

**Avantages Batch :**
- ✅ **1 seule signature** user
- ✅ **Atomique** (tout ou rien)
- ✅ **Gas optimisé** (batch < 2 tx séparées)

---

### **Option 1b : Paiement Carte Bancaire** 💳

#### **Flow Complet**

```
┌─────────────────┐
│  USER (Buyer)   │
└────────┬────────┘
         │ 1. Clic "Acheter par CB"
         ↓
┌──────────────────────────┐
│  FRONTEND (Next.js)      │
│  - Affiche Stripe modal  │
└────────┬─────────────────┘
         │ 2. POST /primary-market/buy-with-card
         ↓
┌──────────────────────────┐
│  BACKEND (User)          │
│  - Créer PaymentIntent   │
└────────┬─────────────────┘
         │ 3. Paiement CB
         ↓
┌──────────────────────────┐
│  STRIPE                  │
│  - User paie 100€        │
│  - Webhook payment_intent.succeeded
└────────┬─────────────────┘
         │ 4. Webhook → Backend
         ↓
┌──────────────────────────┐
│  BACKEND (Webhook)       │
│  - Convertir 100€ → USDC │
│  - Transfer NFT          │
└────────┬─────────────────┘
         │ 5. Transfer NFT (gasless)
         ↓
┌──────────────────────────┐
│  MASTER SERVER WALLET    │
│  - safeTransferFrom()    │
│  - GRATUIT (CDP)         │
└────────┬─────────────────┘
         ↓
    ✅ SUCCESS
    User reçoit NFT
    CyLimit reçoit €
```

#### **Code Backend**

```typescript
// user-backend/src/modules/primary-market/primary-market.service.ts

async buyNFTWithCard(userId: string, nftId: string) {
  const user = await this.userModel.findById(userId);
  const nft = await this.nftModel.findById(nftId);

  // Créer PaymentIntent Stripe
  const paymentIntent = await this.stripeService.paymentIntents.create({
    amount: nft.priceEUR * 100, // Centimes
    currency: 'eur',
    metadata: {
      userId: userId,
      nftId: nftId,
      type: 'primary_market_buy'
    },
    description: `Achat NFT ${nft.name}`
  });

  console.log(`💳 PaymentIntent créé: ${paymentIntent.id}`);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}

// Webhook Stripe
async handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    const { userId, nftId } = paymentIntent.metadata;

    console.log(`✅ Paiement CB réussi: ${paymentIntent.amount / 100}€`);
    console.log(`🎨 Transfer NFT #${nftId} → User ${userId}`);

    // Transfer NFT via Master Server Wallet (GRATUIT !)
    const transfer = await this.masterWallet.invokeContract({
      contractAddress: process.env.NFT_V2_CONTRACT_ADDRESS,
      method: 'safeTransferFrom',
      args: {
        from: this.masterWallet.getDefaultAddress().getId(),
        to: user.baseWalletAddress,
        tokenId: nft.tokenId
      }
      // Pas de paymasterUrl : CDP Server Wallet = gasless automatique !
    });

    await transfer.wait();

    console.log(`✅ NFT transféré (TX: ${transfer.getTransactionHash()})`);

    // Mettre à jour DB
    nft.ownerId = userId;
    nft.availableForSale = false;
    nft.paymentMethod = 'card';
    await nft.save();
  }
}
```

**Coût Gas :**
- User : **$0** (pas de wallet interaction)
- CyLimit : **$0** (CDP Server Wallet gasless) 🎉

**Avantages CB :**
- ✅ User n'a pas besoin d'USDC
- ✅ Conversion fiat → NFT invisible
- ✅ 0 friction crypto

---

## 🎯 CAS 2 : ENCHÈRES (Auto-Bid avec Escrow)

### **Concept : Enchère Maximum avec Auto-Bid**

```
User définit son enchère MAXIMALE : 200 USDC

Auto-bid system :
- Si quelqu'un enchérit 150 → System auto-bid 151 pour le user
- Si quelqu'un enchérit 180 → System auto-bid 181 pour le user
- Si quelqu'un enchérit 210 → User est dépassé (max 200)

Résultat :
- Si user gagne à 181 USDC → On lui rembourse 19 USDC (200 - 181)
- Si user perd → On lui rembourse 200 USDC
```

**Architecture :**
- ✅ **Enchères = P2P entre User et CyLimit**
- ✅ **Escrow USDC obligatoire** (comme buy offers)
- ✅ **Garantie pour l'user** (remboursement automatique)
- ✅ **Smart contract gère l'escrow** (sécurité maximale)

---

### **Option 2a : Enchère USDC (On-Chain Escrow)** 💎

#### **Flow Complet**

```
┌─────────────────┐
│  USER A         │
└────────┬────────┘
         │ 1. Enchère max: 200 USDC
         ↓
┌──────────────────────────┐
│  FRONTEND                │
│  - Modal "Enchère max"   │
└────────┬─────────────────┘
         │ 2. POST /auctions/:id/bid
         ↓
┌──────────────────────────────────────┐
│  BACKEND (Auto-Bid Logic)            │
│  - Escrow 200 USDC (smart contract)  │
│  - Save maxBid=200 en DB             │
│  - currentBid = 100 (starting bid)   │
└────────┬─────────────────────────────┘
         │
         │ 3. User B enchérit max: 150 USDC (< 200)
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  - Compare maxBids: 150 < 200        │
│  - ❌ Bid rejeté (PAS D'ESCROW)      │
│  - Auto-increment currentBid = 151   │
│  - Winner reste User A               │
└────────┬─────────────────────────────┘
         │
         │ 4. User C enchérit max: 250 USDC (> 200)
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  - Compare maxBids: 250 > 200        │
│  - ✅ Nouveau winner = User C        │
│  - Escrow 250 USDC (nouveau winner)  │
│  - Refund 200 USDC → User A          │
│  - currentBid = 250                  │
└────────┬─────────────────────────────┘
         │
         │ 5. Enchère terminée
         ↓
┌──────────────────────────────────────┐
│  BACKEND                             │
│  - Transfer 201 USDC → CyLimit       │
│  - Refund surplus 49 USDC → User C   │
│  - Transfer NFT → User C             │
└──────────────────────────────────────┘
```

#### **Code Backend (Auto-Bid Logic)**

```typescript
// user-backend/src/modules/auction/auction.service.ts

/**
 * OBJECTIF : Gérer enchère avec auto-bid logic
 * 
 * POURQUOI :
 * - Flexibilité totale (logique en DB, pas on-chain)
 * - Escrow USDC sécurisé (smart contract simple)
 * - Refunds automatiques gérés par CyLimit
 * 
 * COMMENT :
 * 1. User escrow son maxBid via smart contract
 * 2. Backend compare maxBids et auto-increment currentBid
 * 3. Refund losers immédiatement
 * 4. Finalize : transfer USDC + refund surplus + transfer NFT
 */

async placeBid(auctionId: string, userId: string, maxBid: number) {
  const auction = await this.auctionModel.findById(auctionId);
  const user = await this.userModel.findById(userId);
  
  if (!auction.active) throw new Error('Auction not active');
  if (new Date() > auction.endTime) throw new Error('Auction ended');
  if (maxBid <= auction.currentBid) throw new Error('Bid too low');
  
  console.log(`🎯 ${user.email} bid maxBid=${maxBid} USDC (current=${auction.currentBid})`);
  
  // 1. Vérifier AVANT d'escrow
  if (maxBid > auction.currentWinnerMaxBid) {
    // ✅ Nouveau winner → ESCROW UNIQUEMENT maintenant
    console.log(`🏆 Nouveau winner ! ${user.email}`);
    
    // Escrow USDC
    await this.marketplaceContract.escrowUSDC(maxBid * 1e6, {
      from: user.baseWalletAddress
    });
    
    console.log(`✅ Escrow ${maxBid} USDC on-chain`);
    
    // Refund ancien winner
    if (auction.currentWinner) {
      const oldWinner = await this.userModel.findById(auction.currentWinner);
      
      console.log(`💸 Refund ${oldWinner.email}: ${auction.currentWinnerMaxBid} USDC`);
      
      await this.marketplaceContract.releaseUSDC(
        oldWinner.baseWalletAddress,
        auction.currentWinnerMaxBid * 1e6
      );
    }
    
    // Update DB
    auction.currentBid = maxBid;
    auction.currentWinner = userId;
    auction.currentWinnerMaxBid = maxBid;
    auction.bids.push({ userId, maxBid, timestamp: new Date() });
    await auction.save();
    
    console.log(`📊 Auction updated: currentBid=${maxBid}, winner=${user.email}`);
    
  } else {
    // ❌ maxBid ≤ ancien maxBid → User a perdu (PAS D'ESCROW)
    console.log(`❌ Bid perdu (max actuel: ${auction.currentWinnerMaxBid})`);
    console.log(`⚠️  Pas d'escrow car bid rejeté`);
    
    // Auto-increment currentBid
    const newCurrentBid = Math.min(maxBid + 1, auction.currentWinnerMaxBid);
    
    // Update currentBid (winner inchangé)
    auction.currentBid = newCurrentBid;
    auction.bids.push({ userId, maxBid, status: 'outbid', timestamp: new Date() });
    await auction.save();
    
    console.log(`📊 CurrentBid updated: ${newCurrentBid}, winner unchanged`);
    // Note: Pas de refund car pas d'escrow
  }
}

async finalizeAuction(auctionId: string) {
  const auction = await this.auctionModel.findById(auctionId);
  
  if (!auction.currentWinner) throw new Error('No bids');
  
  const winner = await this.userModel.findById(auction.currentWinner);
  
  console.log(`🎉 Finalize: Winner=${winner.email}, FinalPrice=${auction.currentBid}`);
  
  // 1. Transfer USDC escrowed → CyLimit
  await this.marketplaceContract.transferEscrowedUSDC(
    winner.baseWalletAddress,
    process.env.MASTER_WALLET_ADDRESS,
    auction.currentBid * 1e6
  );
  
  console.log(`💰 ${auction.currentBid} USDC → CyLimit`);
  
  // 2. Refund surplus
  const surplus = auction.currentWinnerMaxBid - auction.currentBid;
  if (surplus > 0) {
    await this.marketplaceContract.releaseUSDC(
      winner.baseWalletAddress,
      surplus * 1e6
    );
    
    console.log(`💸 Refund surplus ${surplus} USDC → ${winner.email}`);
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

**Coût Gas (avec Paymaster) :**
- User escrow : **$0** (sponsorisé)
- Backend release/transfer : **$0.001-0.002** par opération
- CyLimit finalize : **$0.003** total

---

### **Option 2b : Enchère Carte Bancaire (Off-Chain)** 💳

#### **Flow Complet**

```
┌─────────────────┐
│  USER A         │
└────────┬────────┘
         │ 1. Enchère max: 200€
         ↓
┌──────────────────────────┐
│  FRONTEND                │
│  - Stripe pre-auth 200€  │
└────────┬─────────────────┘
         │ 2. POST /auctions/:id/bid-card
         ↓
┌──────────────────────────┐
│  STRIPE                  │
│  - Hold 200€ (pre-auth)  │
│  - Pas encore capturé    │
└────────┬─────────────────┘
         │ 3. Save pre-auth
         ↓
┌──────────────────────────────────┐
│  DATABASE                        │
│  - auction_bids table            │
│  - maxBid: 200€                  │
│  - stripePaymentIntentId: xxx    │
│  - status: 'pre_authorized'      │
└────────┬─────────────────────────┘
         │
         │ 4. User B enchérit 210€ (> max User A)
         ↓
┌──────────────────────────────────┐
│  BACKEND (Auto-bid Logic)        │
│  - Cancel pre-auth User A (200€) │
│  - Pre-auth User B (210€)        │
└────────┬─────────────────────────┘
         │
         │ 5. Enchère terminée
         ↓
┌──────────────────────────────────┐
│  BACKEND (Finalize)              │
│  - Capture payment User B (210€) │
│  - Transfer NFT → User B         │
└──────────────────────────────────┘
```

#### **Code Backend**

```typescript
// user-backend/src/modules/auctions/auctions.service.ts

async bidWithCard(userId: string, auctionId: string, maxBidEUR: number) {
  const user = await this.userModel.findById(userId);
  const auction = await this.auctionModel.findById(auctionId);

  console.log(`💳 Enchère CB: ${maxBidEUR}€ (max) par User ${userId}`);

  // Créer pre-authorization Stripe (hold funds)
  const paymentIntent = await this.stripeService.paymentIntents.create({
    amount: maxBidEUR * 100,
    currency: 'eur',
    capture_method: 'manual', // ← Pre-auth uniquement
    metadata: {
      userId: userId,
      auctionId: auctionId,
      type: 'auction_bid',
      maxBid: maxBidEUR
    }
  });

  console.log(`✅ Pre-auth créé: ${paymentIntent.id} (${maxBidEUR}€)`);

  // Sauvegarder bid
  const bid = await this.bidModel.create({
    auctionId: auctionId,
    userId: userId,
    maxBid: maxBidEUR,
    currentBid: auction.currentBid + 1, // Auto-bid +1€
    stripePaymentIntentId: paymentIntent.id,
    status: 'pre_authorized'
  });

  // Refund ancien bidder si nécessaire
  if (auction.currentBidderId) {
    const oldBid = await this.bidModel.findOne({
      auctionId: auctionId,
      userId: auction.currentBidderId,
      status: 'pre_authorized'
    });

    if (oldBid) {
      // Cancel pre-auth
      await this.stripeService.paymentIntents.cancel(oldBid.stripePaymentIntentId);
      oldBid.status = 'cancelled';
      await oldBid.save();

      console.log(`♻️ Pre-auth annulé pour User ${auction.currentBidderId}`);
    }
  }

  // Mettre à jour enchère
  auction.currentBid = bid.currentBid;
  auction.currentBidderId = userId;
  auction.maxBid = maxBidEUR;
  await auction.save();

  return {
    success: true,
    bidId: bid._id,
    clientSecret: paymentIntent.client_secret
  };
}

// Finaliser enchère
async finalizeAuction(auctionId: string) {
  const auction = await this.auctionModel.findById(auctionId);
  const winningBid = await this.bidModel.findOne({
    auctionId: auctionId,
    userId: auction.currentBidderId,
    status: 'pre_authorized'
  });

  console.log(`🏆 Finalisation enchère: Winner = User ${auction.currentBidderId}`);

  // Capture payment (montant final, pas le max)
  const captureAmount = auction.currentBid * 100; // Centimes
  await this.stripeService.paymentIntents.capture(
    winningBid.stripePaymentIntentId,
    { amount_to_capture: captureAmount }
  );

  console.log(`✅ Payment capturé: ${auction.currentBid}€`);

  // Refund surplus (max - final)
  const surplus = winningBid.maxBid - auction.currentBid;
  if (surplus > 0) {
    console.log(`♻️ Surplus remboursé: ${surplus}€`);
  }

  // Transfer NFT (GRATUIT avec Master Server Wallet)
  const transfer = await this.masterWallet.invokeContract({
    contractAddress: process.env.NFT_V2_CONTRACT_ADDRESS,
    method: 'safeTransferFrom',
    args: {
      from: this.masterWallet.getDefaultAddress().getId(),
      to: user.baseWalletAddress,
      tokenId: auction.nftTokenId
    }
  });

  await transfer.wait();

  console.log(`✅ NFT transféré (TX: ${transfer.getTransactionHash()})`);

  // Mettre à jour DB
  auction.status = 'completed';
  auction.winnerTxHash = transfer.getTransactionHash();
  await auction.save();
}
```

**Coût Gas :**
- User : **$0** (paiement CB hors-chain)
- CyLimit : **$0** (transfer NFT gasless) 🎉

**Avantages CB :**
- ✅ Pre-authorization (hold funds)
- ✅ Capture uniquement le montant final
- ✅ Refund automatique du surplus
- ✅ 0 interaction blockchain pour user

---

## 📊 COMPARAISON MODES PAIEMENT

### **Achat Direct**

| Critère | USDC (On-Chain) | Carte Bancaire |
|---------|-----------------|----------------|
| **Friction** | ⚠️ Moyenne (approve USDC) | ✅ Faible (CB classique) |
| **Gas** | $0.003 (sponsorisé) | $0 |
| **Délai** | Instantané | Instantané |
| **Conversion** | Aucune | EUR → USDC (backend) |
| **Target** | Users crypto | Users grand public |

### **Enchères**

| Critère | USDC (Escrow SC) | Carte Bancaire (Pre-Auth) |
|---------|------------------|---------------------------|
| **Friction** | ⚠️ Moyenne (escrow) | ✅ Faible (hold CB) |
| **Gas** | $0.005 (sponsorisé) | $0 |
| **Auto-Bid** | On-chain | Off-chain (backend) |
| **Refund** | Automatique (SC) | Automatique (Stripe) |
| **Target** | Users crypto | Users grand public |

---

## 🎯 STRATÉGIE RECOMMANDÉE

### **Pour Achat Direct**

```typescript
// Frontend : Proposer les 2 options
<Button onClick={() => buyWithUSDC()}>
  Payer avec USDC (0 frais)
</Button>

<Button onClick={() => buyWithCard()}>
  Payer par Carte Bancaire
</Button>
```

**Recommandation :**
- ✅ Mettre en avant **USDC** (0 frais, plus rapide)
- ✅ Proposer **CB** en fallback (users sans crypto)

### **Pour Enchères**

```typescript
// Frontend : Auto-détection
if (user.hasUSDC && user.usdcBalance > minBid) {
  // Proposer USDC (on-chain)
  bidWithUSDC(maxBid);
} else {
  // Proposer CB (off-chain)
  bidWithCard(maxBid);
}
```

**Recommandation :**
- ✅ **USDC** si user a balance suffisante
- ✅ **CB** sinon (onboarding users sans crypto)

---

## ✅ RÉSUMÉ MARCHÉ PRIMAIRE

### **Fonctionnalités**

| Feature | USDC | CB | Gas | Batch |
|---------|------|-----|-----|-------|
| **Achat direct** | ✅ | ✅ | $0.003 | ✅ (2 ops) |
| **Enchère max** | ✅ | ✅ | $0.005 | ❌ |
| **Auto-bid** | ✅ On-chain | ✅ Off-chain | Variable | N/A |
| **Refund surplus** | ✅ Auto (SC) | ✅ Auto (Stripe) | $0 | N/A |

### **Coûts pour CyLimit**

```
Achat direct (1000/mois) :
- USDC : 1000 × $0.003 = $3 (sponsorisé)
- CB : 1000 × $0 = $0 (gasless)

Enchères (100/mois) :
- USDC : 100 × $0.005 = $0.50 (sponsorisé)
- CB : 100 × $0 = $0 (gasless)

TOTAL : $3.50/mois 🎉
```

### **UX User**

```
Achat direct USDC :
1. Clic "Acheter"
2. 1 signature (batch)
3. NFT reçu instantanément
→ 3 étapes, ~5 secondes

Achat direct CB :
1. Clic "Acheter par CB"
2. Paiement Stripe
3. NFT reçu instantanément
→ 3 étapes, ~10 secondes

Enchère USDC :
1. Définir max bid
2. 1 signature (escrow)
3. Auto-bid actif
4. Si gagne : NFT + refund surplus
→ 4 étapes, automatique

Enchère CB :
1. Définir max bid
2. Pre-auth CB
3. Auto-bid actif
4. Si gagne : Capture + NFT
→ 4 étapes, automatique
```

---

**Date de mise à jour :** 16 Octobre 2025  
**Status :** 📋 SPÉCIFICATIONS COMPLÈTES

