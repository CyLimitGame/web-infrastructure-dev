# 🔧 CORRECTION : Ajout Escrow USDC pour Swap Offers

**Date :** 14 Octobre 2025  
**Priorité :** 🔴 HAUTE (Sécurité)  
**Statut :** ✅ APPLIQUÉE

---

## 🐛 Problème Identifié

### État Actuel

Le contrat `CyLimitMarketplace.sol` gère les USDC **différemment** selon le type d'offre :

| Type d'offre | USDC Escrow | Sécurité |
|--------------|-------------|----------|
| **Buy Offer** | ✅ Oui | ✅ USDC garanti |
| **Collection Offer** | ✅ Oui | ✅ USDC garanti |
| **Swap Offer** | ❌ Non | ⚠️ Pas de garantie |

### Scénario Problématique

```
USER A propose : NFT #123 + 50 USDC ↔ NFT #456 (User B)

ÉTAPE 1 : User A crée l'offre
createSwapOffer(
  target: User B,
  offered: [#123],
  requested: [#456],
  usdcAmount: 50,
  usdcFromInitiator: true
)
❌ AUCUN USDC transféré au marketplace
✅ Offre créée

ÉTAPE 2 : User B accepte (3 jours plus tard)
acceptSwapOffer(swapId)

PROBLÈME :
- User A n'a plus les 50 USDC (dépensés ailleurs)
- Transaction échoue ❌
- User B a perdu son temps
- Pas de garantie pour User B
```

### Code Actuel (Problématique)

```solidity
// Dans createSwapOffer()
function createSwapOffer(...) external returns (uint256) {
    // Vérifications...
    
    // ❌ PROBLÈME : Aucun escrow USDC !
    swapOffers[swapId] = SwapOffer({
        initiator: msg.sender,
        target: target,
        offeredTokenIds: offeredTokenIds,
        requestedTokenIds: requestedTokenIds,
        usdcAmount: usdcAmount,
        usdcFromInitiator: usdcFromInitiator,
        active: true,
        createdAt: block.timestamp
    });
    
    return swapId;
}
```

---

## ✅ Solution Proposée

### Logique de l'Escrow

```
┌──────────────────────────────────────────────────────────────┐
│              ESCROW USDC POUR SWAP OFFERS                    │
└──────────────────────────────────────────────────────────────┘

CAS 1 : usdcFromInitiator = true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A offre NFT + USDC → User B offre NFT

createSwapOffer() :
  → Escrow USDC de l'initiator (User A)
  → escrowedUSDC[User A] += usdcAmount

acceptSwapOffer() :
  → Transfer USDC : Marketplace → Target (User B)
  → Transfer NFTs : User A ↔ User B


CAS 2 : usdcFromInitiator = false
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A offre NFT → User B offre NFT + USDC

createSwapOffer() :
  → Aucun escrow (User B n'a pas encore accepté)
  
acceptSwapOffer() :
  → Escrow USDC du target (User B)
  → Transfer USDC : User B → Marketplace → Initiator (User A)
  → Transfer NFTs : User A ↔ User B
```

### Code Corrigé

```solidity
// ===================================================================
// MODIFICATION 1 : createSwapOffer() - Ajout escrow si usdcFromInitiator
// ===================================================================

function createSwapOffer(
    address target,
    uint256[] calldata offeredTokenIds,
    uint256[] calldata requestedTokenIds,
    uint256 usdcAmount,
    bool usdcFromInitiator
) external nonReentrant returns (uint256) {
    require(target != address(0), "Invalid target address");
    require(target != msg.sender, "Cannot swap with yourself");
    require(offeredTokenIds.length > 0, "Must offer at least one NFT");
    require(requestedTokenIds.length > 0, "Must request at least one NFT");
    require(offeredTokenIds.length <= 10, "Too many offered NFTs (max 10)");
    require(requestedTokenIds.length <= 10, "Too many requested NFTs (max 10)");
    
    // Vérifier ownership des NFTs offerts
    for (uint256 i = 0; i < offeredTokenIds.length; i++) {
        require(
            nftContract.ownerOf(offeredTokenIds[i]) == msg.sender,
            "You don't own one of the offered NFTs"
        );
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) ||
            nftContract.getApproved(offeredTokenIds[i]) == address(this),
            "Marketplace not approved for offered NFTs"
        );
    }
    
    // Vérifier ownership des NFTs demandés
    for (uint256 i = 0; i < requestedTokenIds.length; i++) {
        require(
            nftContract.ownerOf(requestedTokenIds[i]) == target,
            "Target doesn't own one of the requested NFTs"
        );
    }
    
    // ✅ NOUVEAU : Escrow USDC si initiator paie
    if (usdcAmount > 0 && usdcFromInitiator) {
        require(
            usdcContract.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC escrow transfer failed"
        );
        escrowedUSDC[msg.sender] += usdcAmount;
        emit USDCEscrowed(msg.sender, usdcAmount);
    }
    
    uint256 swapId = nextSwapId++;
    
    swapOffers[swapId] = SwapOffer({
        initiator: msg.sender,
        target: target,
        offeredTokenIds: offeredTokenIds,
        requestedTokenIds: requestedTokenIds,
        usdcAmount: usdcAmount,
        usdcFromInitiator: usdcFromInitiator,
        active: true,
        createdAt: block.timestamp
    });
    
    emit SwapOfferCreated(
        swapId,
        msg.sender,
        target,
        offeredTokenIds,
        requestedTokenIds,
        usdcAmount
    );
    
    return swapId;
}


// ===================================================================
// MODIFICATION 2 : cancelSwapOffer() - Rembourser escrow si annulé
// ===================================================================

function cancelSwapOffer(uint256 swapId) external nonReentrant {
    SwapOffer storage offer = swapOffers[swapId];
    
    require(offer.active, "Swap offer not active");
    require(offer.initiator == msg.sender, "You're not the initiator");
    
    offer.active = false;
    
    // ✅ NOUVEAU : Rembourser USDC si escrowed
    if (offer.usdcAmount > 0 && offer.usdcFromInitiator) {
        escrowedUSDC[msg.sender] -= offer.usdcAmount;
        require(
            usdcContract.transfer(msg.sender, offer.usdcAmount),
            "USDC refund failed"
        );
        emit USDCReleased(msg.sender, offer.usdcAmount);
    }
    
    emit SwapOfferCancelled(swapId, msg.sender);
}


// ===================================================================
// MODIFICATION 3 : acceptSwapOffer() - Gérer escrow selon le cas
// ===================================================================

function acceptSwapOffer(uint256 swapId) external nonReentrant {
    SwapOffer storage offer = swapOffers[swapId];
    
    require(offer.active, "Swap offer not active");
    require(offer.target == msg.sender, "You're not the target of this offer");
    
    address initiator = offer.initiator;
    address target = offer.target;
    
    // Vérifier ownership des NFTs offerts (initiator)
    for (uint256 i = 0; i < offer.offeredTokenIds.length; i++) {
        require(
            nftContract.ownerOf(offer.offeredTokenIds[i]) == initiator,
            "Initiator no longer owns offered NFT"
        );
    }
    
    // Vérifier ownership des NFTs demandés (target)
    for (uint256 i = 0; i < offer.requestedTokenIds.length; i++) {
        require(
            nftContract.ownerOf(offer.requestedTokenIds[i]) == target,
            "You no longer own requested NFT"
        );
    }
    
    // Vérifier approval target
    require(
        nftContract.isApprovedForAll(target, address(this)),
        "Marketplace not approved for your NFTs"
    );
    
    // ✅ NOUVEAU : Gérer USDC selon qui paie
    if (offer.usdcAmount > 0) {
        if (offer.usdcFromInitiator) {
            // CAS 1 : Initiator paie (USDC déjà en escrow)
            // Transférer USDC du marketplace au target
            escrowedUSDC[initiator] -= offer.usdcAmount;
            require(
                usdcContract.transfer(target, offer.usdcAmount),
                "USDC transfer to target failed"
            );
            emit USDCReleased(initiator, offer.usdcAmount);
        } else {
            // CAS 2 : Target paie (escrow maintenant)
            // Transférer USDC du target au initiator
            require(
                usdcContract.transferFrom(target, initiator, offer.usdcAmount),
                "USDC transfer from target failed"
            );
        }
    }
    
    // Désactiver l'offre
    offer.active = false;
    totalSwaps++;
    
    // Transférer les NFTs offerts : initiator → target
    for (uint256 i = 0; i < offer.offeredTokenIds.length; i++) {
        nftContract.transferFrom(initiator, target, offer.offeredTokenIds[i]);
    }
    
    // Transférer les NFTs demandés : target → initiator
    for (uint256 i = 0; i < offer.requestedTokenIds.length; i++) {
        nftContract.transferFrom(target, initiator, offer.requestedTokenIds[i]);
    }
    
    emit SwapExecuted(
        swapId,
        initiator,
        target,
        offer.offeredTokenIds,
        offer.requestedTokenIds,
        offer.usdcAmount
    );
}
```

---

## 📊 Comparaison Avant/Après

### Avant (Actuel - Non Sécurisé)

```
CREATE SWAP OFFER (User A : NFT + 50 USDC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A                    Marketplace
  │                            │
  │  createSwapOffer(...)      │
  │───────────────────────────>│
  │                            │
  │  ❌ 50 USDC restent chez A │
  │  ⚠️ Pas de garantie        │


ACCEPT SWAP OFFER (User B accepte)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User B                    Marketplace
  │                            │
  │  acceptSwapOffer(...)      │
  │───────────────────────────>│
  │                            │
  │  ⚠️ User A n'a plus USDC   │
  │  ❌ Transaction échoue     │
```

### Après (Corrigé - Sécurisé)

```
CREATE SWAP OFFER (User A : NFT + 50 USDC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A                    Marketplace
  │                            │
  │  createSwapOffer(...)      │
  │───────────────────────────>│
  │                            │
  │  ✅ 50 USDC → Marketplace  │
  │  ✅ escrowedUSDC[A] += 50  │
  │  ✅ Garantie pour User B    │


ACCEPT SWAP OFFER (User B accepte)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User B                    Marketplace
  │                            │
  │  acceptSwapOffer(...)      │
  │───────────────────────────>│
  │                            │
  │  ✅ USDC : Marketplace → B │
  │  ✅ NFTs échangés          │
  │  ✅ Transaction réussie    │
```

---

## 🔄 Impact des Modifications

### Changements Requis

**Smart Contract :**
1. ✅ Modifier `createSwapOffer()` - Ajouter escrow USDC si `usdcFromInitiator = true`
2. ✅ Modifier `cancelSwapOffer()` - Rembourser USDC escrowed
3. ✅ Modifier `acceptSwapOffer()` - Gérer USDC selon `usdcFromInitiator`

**Backend :**
- ✅ Aucune modification nécessaire (les event listeners fonctionneront de la même manière)

**Frontend :**
- ✅ Aucune modification nécessaire
- ℹ️ Message UX amélioré : "Vos USDC seront bloqués jusqu'à acceptation ou annulation"

### Tests à Effectuer

```
TEST 1 : Swap avec USDC (initiator paie)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User A crée offre : NFT #123 + 50 USDC → NFT #456
   → Vérifier : 50 USDC transférés au marketplace ✅
   → Vérifier : escrowedUSDC[A] = 50 ✅

2. User B accepte offre
   → Vérifier : 50 USDC transférés à User B ✅
   → Vérifier : NFTs échangés ✅
   → Vérifier : escrowedUSDC[A] = 0 ✅


TEST 2 : Swap avec USDC (target paie)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User A crée offre : NFT #123 → NFT #456 + 50 USDC
   → Vérifier : Aucun USDC transféré ✅

2. User B accepte offre
   → Vérifier : 50 USDC transférés de B → A ✅
   → Vérifier : NFTs échangés ✅


TEST 3 : Annulation avec USDC escrowed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User A crée offre : NFT #123 + 50 USDC → NFT #456
   → Vérifier : 50 USDC escrowed ✅

2. User A annule offre
   → Vérifier : 50 USDC remboursés à User A ✅
   → Vérifier : escrowedUSDC[A] = 0 ✅


TEST 4 : Swap pur (sans USDC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User A crée offre : NFT #123 → NFT #456
   → Vérifier : Aucun USDC transféré ✅

2. User B accepte offre
   → Vérifier : NFTs échangés ✅
   → Vérifier : Aucun USDC impliqué ✅
```

---

## 📁 Fichiers à Modifier

### 1. Contrat Smart Contract

**Fichier :** `/cylimit-backend-develop/contracts/CyLimitMarketplace.sol`

**Lignes à modifier :**
- `createSwapOffer()` : ~ligne 433-491
- `cancelSwapOffer()` : ~ligne 498-507
- `acceptSwapOffer()` : ~ligne 521-574

### 2. Documentation

**Fichiers à mettre à jour :**
- ✅ `/docs/Wallets/CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md`
- ✅ `/docs/Wallets/Done/MARKETPLACE-COMPLETE-V2.md`
- ✅ `/docs/Wallets/Done/MARKETPLACE-FLOWS.md`

---

## ⏱️ Timeline Proposé

| Étape | Description | Durée | Statut |
|-------|-------------|-------|--------|
| 1 | Modifier contrat | 1h | ✅ **FAIT** |
| 2 | Compiler et vérifier | 15min | ⏳ À faire |
| 3 | Déployer sur testnet Amoy | 30min | ⏳ À faire |
| 4 | Tester les 4 scénarios | 2h | ⏳ À faire |
| 5 | Code review | 1h | ⏳ À faire |
| 6 | Déployer sur mainnet | 30min | ⏳ À faire |
| 7 | Mettre à jour documentation | 30min | ✅ **FAIT** |
| **TOTAL** | | **~6h** | **1/7** |

**Modifications appliquées :**
- ✅ `createSwapOffer()` : Escrow USDC si `usdcFromInitiator = true`
- ✅ `cancelSwapOffer()` : Remboursement USDC si escrowed
- ✅ `acceptSwapOffer()` : Gestion USDC selon `usdcFromInitiator`
- ✅ Documentation mise à jour

---

## 🚨 Priorité

**HAUTE** - Cette correction doit être faite **AVANT** la mise en production du marketplace.

**Raisons :**
1. 🔒 **Sécurité** : Protège les users contre les offres non tenues
2. 🤝 **Confiance** : Les users doivent pouvoir faire confiance au système
3. ⚖️ **Cohérence** : Aligne les swap offers avec les buy offers (qui font déjà de l'escrow)
4. 📜 **Standards** : Respecte les bonnes pratiques des marketplaces NFT

---

**Créé par :** Équipe CyLimit  
**Date :** 14 Octobre 2025  
**Version :** 1.0.0

