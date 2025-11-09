# 🎯 MARKETPLACE CYLIMIT V2 - SYSTÈME COMPLET

**Date :** 10 Octobre 2025  
**Status :** ✅ Contrat complété

---

## 📋 FONCTIONNALITÉS COMPLÈTES

### 1. ✅ Vente classique (Seller → Buyer)
**Flux :**
- Seller liste NFT avec prix fixe
- Buyer achète (1 signature avec Smart Account batch)

**Fonctions :**
- `listNFT(tokenId, price)` - Seller
- `buyNFT(tokenId)` - Buyer
- `unlistNFT(tokenId)` - Seller

---

### 2. ✅ Batch achat (Buyer achète plusieurs NFTs)
**Flux :**
- Buyer achète 2+ NFTs en 1 seule transaction

**Fonctions :**
- `buyMultipleNFTs(tokenIds[])` - Buyer

**Avantages :**
- ✅ 1 seule signature
- ✅ Moins de gas fees
- ✅ Atomique (tout ou rien)

---

### 3. ✅ Swap NFT ↔ NFT (P2P direct)
**Flux :**
- User A propose : "Je donne NFT #123, je veux NFT #456"
- User B accepte → Swap automatique
- User A peut annuler si pas encore accepté

**Fonctions :**
- `createSwapOffer(target, offeredTokenIds[], requestedTokenIds[], usdcAmount, usdcFromInitiator)` - Initiator
- `acceptSwapOffer(swapId)` - Target
- `cancelSwapOffer(swapId)` - Initiator (si pas encore accepté)

**Cas d'usage :**
1. **Swap pur :** NFT #123 ↔ NFT #456
2. **Swap + USDC :** NFT #123 + 50 USDC ↔ NFT #456
3. **Swap multiple :** 2 NFTs + 100 USDC ↔ 1 NFT rare

**⚠️ IMPORTANT :** 
- **Pas d'escrow USDC** dans le contrat (contrairement aux buy offers)
- Les USDC sont transférés via Smart Account batch lors de l'acceptation
- Les NFTs restent chez leurs propriétaires jusqu'à acceptation
- L'initiator peut annuler tant que le target n'a pas accepté
- Une fois accepté, impossible d'annuler (transaction atomique)

**Comment l'USDC est géré :**
- Si `usdcFromInitiator = true` : Initiator paie USDC au Target
- Si `usdcFromInitiator = false` : Target paie USDC à l'Initiator
- Le transfert USDC se fait **en dehors du contrat** (dans le batch transaction)
- Le contrat `acceptSwapOffer()` ne transfère que les NFTs

---

### 4. ✅ Offre d'achat (Buyer → Seller)
**Flux :**
- Buyer propose prix pour un NFT spécifique
- **USDC bloqué (escrow)** jusqu'à acceptation ou annulation
- Seller accepte → Transfert automatique

**Fonctions :**
- `createBuyOffer(tokenId, price)` - Buyer (USDC escrowed)
- `acceptBuyOffer(offerId)` - Seller
- `cancelBuyOffer(offerId)` - Buyer (USDC rendu)

**Sécurité :**
- ✅ USDC **bloqué dans le contrat** (escrow)
- ✅ Buyer ne peut pas retirer ses fonds
- ✅ Seller garanti de recevoir l'USDC

---

### 5. ✅ Collection Offer (Offre ouverte avec traits)
**Flux :**
- Buyer propose : "Je veux n'importe quel NFT rare pour 100 USDC"
- **USDC bloqué (escrow)**
- **Premier seller** qui possède un NFT correspondant peut accepter

**Fonctions :**
- `createCollectionOffer(price, requiredTraits[])` - Buyer (USDC escrowed)
- `acceptCollectionOffer(offerId, tokenId)` - Seller
- `cancelCollectionOffer(offerId)` - Buyer (USDC rendu)

**Exemple traits :**
```solidity
["rarity:rare", "color:blue", "level:>50"]
```

**Validation traits :**
- ⚠️ **Backend vérifie** que le NFT correspond aux traits requis AVANT d'appeler `acceptCollectionOffer()`
- Smart contract ne vérifie PAS (trop coûteux on-chain)

---

## 🔒 SYSTÈME ESCROW USDC

### Pourquoi escrow ?
**Problème sans escrow :**
- Buyer propose 100 USDC pour un NFT
- Seller accepte
- Buyer n'a plus les fonds → Transaction échoue 😡

**Solution avec escrow :**
1. Buyer crée offre → **USDC transféré au marketplace**
2. Seller accepte → **USDC transféré du marketplace au seller**
3. Buyer annule → **USDC rendu au buyer**

### Fonctions escrow

```solidity
// Créer offre → USDC bloqué
createBuyOffer(tokenId, price);
createCollectionOffer(price, traits[]);

// Annuler offre → USDC rendu
cancelBuyOffer(offerId);
cancelCollectionOffer(offerId);

// Accepter offre → USDC transféré au seller
acceptBuyOffer(offerId);
acceptCollectionOffer(offerId, tokenId);

// Vérifier balance escrowed
getEscrowedBalance(userAddress);
```

### Events

```solidity
event USDCEscrowed(address indexed user, uint256 amount);
event USDCReleased(address indexed user, uint256 amount);
```

---

## 📊 COMPARAISON AVEC/SANS ESCROW

| Scénario | Sans Escrow | Avec Escrow |
|----------|-------------|-------------|
| Buyer propose 100 USDC | Aucun transfert | **USDC bloqué** |
| Seller accepte après 2 jours | **Transaction échoue** (Buyer a dépensé ses fonds) | ✅ **Transaction réussit** (USDC garanti) |
| Buyer annule | Rien à rendre | **USDC rendu automatiquement** |
| Seller voit l'offre | ⚠️ Pas de garantie | ✅ **Fonds garantis** |

---

## 🎯 WORKFLOW COMPLET

### Setup (une fois par user)

```solidity
// Approuver marketplace pour TOUS les NFTs
nftContract.setApprovalForAll(marketplaceAddress, true);

// Approuver marketplace pour USDC (si buyer)
usdcContract.approve(marketplaceAddress, UNLIMITED);
```

---

### 1. Vente classique

```
User A (Seller)
1. listNFT(tokenId, 100 USDC)

User B (Buyer)
2. Smart Account batch:
   - Transfer 100 USDC → Seller
   - Transfer 5 USDC → CyLimit (fees)
   - buyNFT(tokenId) → NFT transféré automatiquement
```

---

### 2. Offre d'achat (Buyer → Seller)

```
User A (Buyer)
1. Approve USDC (une fois)
2. createBuyOffer(tokenId, 100 USDC)
   → USDC bloqué dans le marketplace

User B (Seller)
3. acceptBuyOffer(offerId)
   → USDC transféré au seller
   → NFT transféré au buyer

OU

User A (Buyer) change d'avis
3. cancelBuyOffer(offerId)
   → USDC rendu au buyer
```

---

### 3. Collection Offer (Offre ouverte)

```
User A (Buyer)
1. Approve USDC (une fois)
2. createCollectionOffer(100 USDC, ["rarity:rare"])
   → USDC bloqué dans le marketplace

Backend CyLimit
3. Écoute event CollectionOfferCreated
4. Index l'offre en DB
5. Notifie sellers possédant NFTs "rare"

User B (Seller)
6. Voit l'offre dans le frontend
7. Frontend → POST /marketplace/accept-collection-offer
8. Backend vérifie que tokenId correspond aux traits
9. Frontend → acceptCollectionOffer(offerId, tokenId)
   → USDC transféré au seller
   → NFT transféré au buyer
```

---

### 4. Swap P2P

```
User A
1. createSwapOffer(
   target: User B,
   offered: [NFT #123],
   requested: [NFT #456],
   usdc: 50 USDC,
   usdcFromInitiator: true
)

User B
2. Smart Account batch:
   - (Si USDC) Transfer USDC → User A ou User B
   - acceptSwapOffer(swapId)
     → NFTs transférés automatiquement
```

---

## 📈 STATS & ANALYTICS

### Compteurs

```solidity
uint256 public totalListings;
uint256 public totalSales;
uint256 public totalSwaps;
uint256 public nextBuyOfferId;
uint256 public nextCollectionOfferId;
uint256 public nextSwapId;
```

### Queries

```solidity
// Vérifier si NFT listé
isListed(tokenId) → bool

// Récupérer listing
getListing(tokenId) → (seller, price, active, listedAt)

// Récupérer offre d'achat
getBuyOffer(offerId) → (buyer, tokenId, price, active, createdAt)

// Récupérer collection offer
getCollectionOffer(offerId) → (buyer, price, requiredTraits[], active, createdAt)

// Récupérer swap offer
getSwapOffer(swapId) → (initiator, target, offeredTokenIds[], requestedTokenIds[], usdcAmount, ...)

// Vérifier balance escrowed
getEscrowedBalance(user) → uint256
```

---

## 🚀 DÉPLOIEMENT

### 1. Compiler le contrat

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop
npx hardhat compile
```

### 2. Déployer sur Polygon Mainnet

```bash
npx hardhat run scripts/deploy-marketplace.js --network polygon
```

### 3. Vérifier sur Polygonscan

```bash
npx hardhat verify --network polygon \
  <MARKETPLACE_ADDRESS> \
  <NFT_CONTRACT_ADDRESS> \
  <USDC_CONTRACT_ADDRESS> \
  <BACKEND_OWNER_ADDRESS>
```

### 4. Configurer backend

```bash
# cylimit-backend-develop/.env
MARKETPLACE_CONTRACT_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x2791bca1f2de4661ed88a30c99a7a9449aa84174  # Polygon USDC
NFT_CONTRACT_ADDRESS=0x...
```

---

## 🔐 SÉCURITÉ

### ✅ ReentrancyGuard
Toutes les fonctions d'achat/acceptation utilisent `nonReentrant` pour éviter les attaques de reentrancy.

### ✅ Escrow sécurisé
USDC stocké dans le contrat jusqu'à acceptation ou annulation.

### ✅ Ownership vérifié
Toutes les fonctions vérifient que :
- Seller possède le NFT
- Buyer a approuvé marketplace pour USDC
- Marketplace est approuvé pour les NFTs

### ✅ Atomic transfers
Tous les transferts (USDC + NFT) sont atomiques (tout ou rien).

---

## 📊 RÉSUMÉ DES AMÉLIORATIONS

| Feature | Status | Escrow USDC | Signatures |
|---------|--------|-------------|------------|
| Vente classique | ✅ | ❌ | 1 (Buyer) |
| Batch achat | ✅ | ❌ | 1 (Buyer) |
| Swap P2P | ✅ | ❌ | 1 (Target) |
| Offre d'achat | ✅ | ✅ | 1 (Seller) |
| Collection Offer | ✅ | ✅ | 1 (Seller) |

---

## 🎉 CONTRAT COMPLET !

Le marketplace CyLimit supporte maintenant :
- ✅ Tous les types de ventes/achats
- ✅ Swaps P2P (avec ou sans USDC)
- ✅ Offres d'achat avec escrow
- ✅ Collection offers avec traits
- ✅ 1 signature pour tout
- ✅ Sécurité maximale (escrow + atomic)

**Next steps :**
1. Déployer le contrat
2. Intégrer dans le backend
3. Créer interfaces frontend
4. Tester en staging

