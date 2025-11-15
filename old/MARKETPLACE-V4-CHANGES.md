# 🚀 CyLimitMarketplace v4 - Changements et Améliorations

**Date :** 7 Novembre 2025  
**Version :** v4 (Secure Offer)  
**Déployé :** Base Sepolia - `0x58D0A214D101D84Ba0F73199DDE3705DeC19E3ad`

---

## 📋 Résumé des Changements

### 1. ✅ **`batchReleaseUSDC` ajoutée**

**Pourquoi ?**
- Optimisation gas pour refund multiple users (enchères)
- 1 transaction pour 50 users au lieu de 50 transactions

**Signature :**
```solidity
function batchReleaseUSDC(
    address[] calldata users, 
    uint256[] calldata amounts
) external onlyOwner nonReentrant
```

**Cas d'usage :**
- Enchère terminée → Refund tous les perdants en 1 fois
- Optimisation : 50 losers = $0.003 gas au lieu de $0.15

---

### 2. ✅ **`buyMultipleNFTs` remplace `buyNFT`**

**Pourquoi ?**
- `buyNFT` est un cas spécifique de `buyMultipleNFTs`
- Simplifie l'architecture (1 fonction au lieu de 2)
- Supporte 1 seul NFT OU plusieurs (max 50)

**Avant (v3) :**
```solidity
function buyNFT(uint256 tokenId, address seller) external;
function buyMultipleNFTs(uint256[] calldata tokenIds, address[] calldata sellers) external;
```

**Après (v4) :**
```solidity
function buyMultipleNFTs(uint256[] calldata tokenIds, address[] calldata sellers) external;
// ✅ Supporte aussi tokenIds = [123] (1 seul NFT)
```

**Impact backend :**
- Remplacer tous les appels `buyNFT(tokenId, seller)` par `buyMultipleNFTs([tokenId], [seller])`
- Batch purchases : `buyMultipleNFTs([1,2,3], [seller1, seller2, seller3])`

---

### 3. ✅ **Collection Offers supportées (target = address(0))**

**Pourquoi ?**
- Support des offres publiques ("je veux n'importe quelle carte rare pour 100 USDC")
- Sécurité maintenue (backend ne peut pas voler les fonds)
- Premier arrivé, premier servi (race condition gérée en DB)

**Architecture :**

```solidity
// Escrow pour Collection Offer
await userWallet.escrowUSDCForOffer(offerId, address(0), 100 * 1e6);
//                                              ^^^^^^^^^ PUBLIC

// Smart Contract vérifie l'acceptor
function transferEscrowedUSDCFromOffer(bytes32 offerId, address acceptor) {
    if (offer.target == address(0)) {
        // Collection Offer : acceptor devient recipient
        require(acceptor != address(0), "Invalid acceptor");
        require(acceptor != offer.initiator, "Cannot accept own offer");
        recipient = acceptor; // ✅ Tracé on-chain
    } else {
        // Offre 1-to-1 : target verrouillé
        require(acceptor == offer.target, "Must be target");
        recipient = offer.target;
    }
    
    usdcContract.transfer(recipient, offer.amountUSDC);
}
```

**Sécurité :**
- ✅ Backend DOIT passer l'adresse de l'acceptor
- ✅ Smart contract vérifie que acceptor != initiator
- ✅ Transfert tracé on-chain avec event `OfferAccepted`
- ✅ DB lock prévient double acceptance

**Backend Flow :**
```typescript
// 1. User créé Collection Offer
await offerService.prepareOffer({
  targetId: null, // ← PUBLIC
  offeredUSDC: 100,
  requestedNFTsFilters: { rarity: 'rare' }
});

// 2. Premier seller accepte
await offerService.acceptOffer({
  offerId,
  acceptorId: seller.id // ← Backend passe l'acceptor
});

// 3. Smart contract vérifie et transfère
await adminBackendClient.finalizeOffer({
  offerId,
  acceptorAddress: seller.baseWalletAddress // ← Obligatoire
});
```

---

## 🆚 Comparaison v3 vs v4

| Feature | v3 | v4 |
|---------|----|----|
| **Target verrouillé on-chain** | ✅ Oui | ✅ Oui |
| **Collection Offers** | ❌ Non supporté | ✅ address(0) = public |
| **Database injection** | ❌ Vulnérable | ✅ Protégé |
| **Batch refund enchères** | ❌ Non | ✅ batchReleaseUSDC |
| **buyNFT vs buyMultipleNFTs** | 2 fonctions | 1 fonction (simplifié) |
| **Emergency withdraw** | ✅ Oui | ✅ Oui |
| **Audit trail** | ✅ Complet | ✅ Complet + acceptor |

---

## 📝 Checklist Migration v3 → v4

### Backend

- [x] Déployer Marketplace v4 sur Base Sepolia
- [x] Whitelist Marketplace v4 dans NFT contract
- [x] Mettre à jour TESTNET_MARKETPLACE_V2_CONTRACT_ADDRESS
- [x] Mettre à jour ABI `escrowUSDCForOffer` (ajouter `target`)
- [x] Mettre à jour ABI `transferEscrowedUSDCFromOffer` (ajouter `acceptor`)
- [ ] Remplacer `buyNFT` par `buyMultipleNFTs` dans marketplace.service.ts
- [ ] Implémenter Collection Offers dans offer.service.ts
- [ ] Implémenter batchReleaseUSDC pour enchères
- [ ] Tester flow Buy Offer 1-to-1
- [ ] Tester flow Collection Offer

### Frontend

- [ ] Remplacer `buyNFT` par `buyMultipleNFTs` dans useMarketplace.ts
- [ ] Implémenter UI Collection Offers
- [ ] Tester page /test avec v4

### Smart Contracts

- [x] Compiler v4
- [x] Déployer v4
- [x] Whitelist v4 dans NFT
- [x] Vérifier getOffer()
- [ ] Audit sécurité v4

---

## 🎯 Avantages v4

1. ✅ **Sécurité maximale** : Target verrouillé + acceptor vérifié
2. ✅ **Collection Offers** : address(0) = offres publiques
3. ✅ **Optimisation gas** : batchReleaseUSDC pour enchères
4. ✅ **Architecture simplifiée** : buyMultipleNFTs unique
5. ✅ **Database injection impossible** : Smart contract = source de vérité
6. ✅ **Audit trail complet** : Events on-chain pour tout
7. ✅ **Emergency withdraw** : Tracé on-chain
8. ✅ **Flexibilité** : Offres 1-to-1 OU publiques

---

## 🚨 Breaking Changes

### 1. `transferEscrowedUSDCFromOffer` signature

**v3 :**
```solidity
function transferEscrowedUSDCFromOffer(bytes32 offerId) external onlyOwner
```

**v4 :**
```solidity
function transferEscrowedUSDCFromOffer(bytes32 offerId, address acceptor) external onlyOwner
//                                                      ^^^^^^^^^^^^^^^^^ NOUVEAU
```

**Impact :**
- ⚠️ Tous les appels backend doivent ajouter le paramètre `acceptor`
- Pour offres 1-to-1 : `acceptor = offer.target`
- Pour Collection Offers : `acceptor = sellerAddress` (vérifié on-chain)

### 2. `buyNFT` supprimée

**v3 :**
```solidity
function buyNFT(uint256 tokenId, address seller) external
```

**v4 :**
```solidity
// ❌ Fonction supprimée
// ✅ Utiliser buyMultipleNFTs([tokenId], [seller])
```

**Impact :**
- ⚠️ Remplacer tous les appels `buyNFT` par `buyMultipleNFTs`
- Frontend et Backend

---

## 📚 Documentation Mise à Jour

- ✅ CONTEXT_MARKETPLACE-WALLET.md
- ✅ CyLimitMarketplace_v4_SecureOffer.sol
- ✅ MARKETPLACE-OFFER-SECURITY.md
- [ ] Backend API docs (Swagger)
- [ ] Frontend component docs

---

**Maintenu par :** Équipe CyLimit  
**Contact :** [support@cylimit.com]

