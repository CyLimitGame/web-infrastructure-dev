# 📝 Changelog - Marketplace v4 (Étapes 3 & 4)

**Date :** 7 Novembre 2025  
**Version :** v4 (Secure Offer + Collection Offers + Batch Operations)

---

## ✅ Étape 3 : Mise à jour OfferService pour `acceptorAddress`

### Changements

**Fichiers modifiés :**
1. `Admin Backend/src/modules/coinbase/coinbase.service.ts`
2. `Admin Backend/src/modules/internal/internal.controller.ts`
3. `User Backend/src/modules/admin-backend-client/admin-backend-client.service.ts`
4. `User Backend/src/modules/marketplace/services/offer.service.ts`

### Détails

#### 1. Admin Backend - CoinbaseService

**Avant (v3) :**
```typescript
async transferEscrowedUSDCFromOffer(
  offerId: string,
  expectedAmount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }>
```

**Après (v4) :**
```typescript
async transferEscrowedUSDCFromOffer(
  offerId: string,
  acceptorAddress: string, // ✅ NOUVEAU
  expectedAmount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }>
```

**ABI mis à jour :**
```typescript
// ✅ v4 : Ajout paramètre acceptor
const marketplaceAbi = [
  {
    inputs: [
      { name: 'offerId', type: 'bytes32' },
      { name: 'acceptor', type: 'address' }, // ✅ NOUVEAU
    ],
    name: 'transferEscrowedUSDCFromOffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
```

#### 2. Admin Backend - InternalController

**Avant (v3) :**
```typescript
@Post('finalize-offer')
async finalizeOffer(
  @Body() body: {
    offerId: string;
    offeredUSDC: number;
    nftTransfers: Array<{ from: string; to: string; tokenId: string }>;
  },
)
```

**Après (v4) :**
```typescript
@Post('finalize-offer')
async finalizeOffer(
  @Body() body: {
    offerId: string;
    acceptorAddress: string; // ✅ NOUVEAU
    offeredUSDC: number;
    nftTransfers: Array<{ from: string; to: string; tokenId: string }>;
  },
)
```

**Appel mis à jour :**
```typescript
const usdcResult = await this.coinbaseService.transferEscrowedUSDCFromOffer(
  body.offerId,
  body.acceptorAddress, // ✅ NOUVEAU
  body.offeredUSDC,
);
```

#### 3. User Backend - AdminBackendClient

**Avant (v3) :**
```typescript
async finalizeOffer(
  offerId: string,
  offeredUSDC: number,
  nftTransfers: Array<{ from: string; to: string; tokenId: string }>,
)
```

**Après (v4) :**
```typescript
async finalizeOffer(
  offerId: string,
  acceptorAddress: string, // ✅ NOUVEAU
  offeredUSDC: number,
  nftTransfers: Array<{ from: string; to: string; tokenId: string }>,
)
```

**Payload mis à jour :**
```typescript
const payload = {
  offerId,
  acceptorAddress, // ✅ NOUVEAU
  offeredUSDC,
  nftTransfers,
  nonce: crypto.randomUUID(),
  timestamp: Date.now(),
};
```

#### 4. User Backend - OfferService

**Avant (v3) :**
```typescript
result = await this.adminBackendClient.finalizeOffer(
  offer.offerId,
  offer.offeredUSDC,
  nftTransfers,
);
```

**Après (v4) :**
```typescript
// ✅ v4 : Passer acceptorAddress (target wallet)
result = await this.adminBackendClient.finalizeOffer(
  offer.offerId,
  offer.targetId.walletAddress, // ✅ NOUVEAU : acceptor address
  offer.offeredUSDC,
  nftTransfers,
);
```

### Impact

- ✅ **Offres 1-to-1** : `acceptorAddress` = `offer.target` (vérifié on-chain)
- ✅ **Collection Offers** : `acceptorAddress` = premier seller (vérifié on-chain)
- ✅ **Sécurité renforcée** : Smart contract vérifie que `acceptor` est autorisé
- ✅ **Database injection impossible** : Destination verrouillée on-chain

---

## ✅ Étape 4 : Remplacement `buyNFT` → `buyMultipleNFTs`

### Changements

**Fichier modifié :**
- `User Frontend/src/hooks/useMarketplace.ts`

### Détails

#### Frontend - useMarketplace.ts

**ABI Avant (v3) :**
```typescript
const MARKETPLACE_ABI = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'seller', type: 'address' }
    ],
    name: 'buyNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];
```

**ABI Après (v4) :**
```typescript
const MARKETPLACE_ABI = [
  {
    inputs: [
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'sellers', type: 'address[]' }
    ],
    name: 'buyMultipleNFTs',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];
```

**Appel Avant (v3) :**
```typescript
// Call 3: Buy NFT (marketplace transfère le NFT)
calls.push({
  to: buyData.contracts.marketplace as `0x${string}`,
  data: encodeFunctionData({
    abi: MARKETPLACE_ABI,
    functionName: 'buyNFT',
    args: [BigInt(buyData.nft.tokenId), buyData.seller.address]
  })
});
```

**Appel Après (v4) :**
```typescript
// Call 3: Buy Multiple NFTs (marketplace transfère les NFTs)
// ✅ v4 : buyMultipleNFTs supporte 1 seul NFT
calls.push({
  to: buyData.contracts.marketplace as `0x${string}`,
  data: encodeFunctionData({
    abi: MARKETPLACE_ABI,
    functionName: 'buyMultipleNFTs',
    args: [
      [BigInt(buyData.nft.tokenId)], // tokenIds array (1 seul)
      [buyData.seller.address]        // sellers array (1 seul)
    ]
  })
});
```

### Impact

- ✅ **Architecture simplifiée** : 1 seule fonction au lieu de 2
- ✅ **Supporte 1 seul NFT** : `buyMultipleNFTs([123], [seller])`
- ✅ **Batch purchases prêt** : `buyMultipleNFTs([1,2,3], [s1,s2,s3])`
- ✅ **Économie gas** : Optimisé pour plusieurs NFTs

---

## 📊 Résumé des Modifications

| Composant | Fichiers modifiés | Lignes changées | Status |
|-----------|-------------------|-----------------|--------|
| **Admin Backend** | 2 fichiers | ~60 lignes | ✅ Complété |
| **User Backend** | 2 fichiers | ~40 lignes | ✅ Complété |
| **User Frontend** | 1 fichier | ~20 lignes | ✅ Complété |
| **Total** | **5 fichiers** | **~120 lignes** | ✅ **100%** |

---

## 🧪 Tests Requis

### Test 1 : Buy Offer 1-to-1 (via /test page)

- [ ] Step 1 : Créer offre (buyer)
- [ ] Step 2 : Escrow USDC on-chain (buyer signe)
- [ ] Step 3 : Confirmer création (backend vérifie escrow)
- [ ] Step 4 : Accepter offre (seller)
- [ ] Step 5 : Exécuter accept batch (seller signe si USDC requis)
- [ ] Step 6 : Finaliser offre (Master Wallet transferts)
  - Vérifier `acceptorAddress` = target wallet ✅
  - Vérifier USDC transféré au bon destinataire ✅
  - Vérifier NFTs transférés ✅

### Test 2 : Buy NFT classique (1 seul)

- [ ] Lister un NFT en DB
- [ ] Acheter avec `buyMultipleNFTs([tokenId], [seller])`
- [ ] Vérifier transaction réussie
- [ ] Vérifier ownership mis à jour

### Test 3 : Collection Offer (futur)

- [ ] Créer offre avec `target = address(0)`
- [ ] Premier seller accepte
- [ ] Vérifier `acceptorAddress` = seller wallet
- [ ] Vérifier smart contract vérifie `acceptor != initiator`

---

## 🚀 Prochaines Étapes

1. ✅ **Étape 3 & 4 complétées**
2. ⏳ **Tester via /test page** (Step 1-6)
3. ⏳ **Vérifier on-chain** (offerId, target, initiator)
4. ⏳ **Implémenter Collection Offers** (backend logic)
5. ⏳ **Déployer sur mainnet**

---

**Maintenu par :** Équipe CyLimit  
**Date :** 7 Novembre 2025 - 12h00

