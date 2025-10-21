# 🔄 MARKETPLACE CYLIMIT - FLUX COMPLETS

---

## 📋 Note Importante : Double Stockage

**Les listings sont stockés dans 2 endroits :**

1. **Smart Contract (Blockchain)** - Source de vérité
   - Données: `seller`, `price`, `active`, `listedAt`
   - Utilisé lors de l'achat pour vérifier la validité
   - Lecture gratuite (pas de gas)

2. **Base de Données (Backend)** - Cache pour performances
   - Données enrichies: NFT complet (metadata, rarity, image, etc.)
   - Permet recherche/filtrage rapide (par prix, rarity, user)
   - Synchronisé via event listeners du smart contract

**Pourquoi ?**
- 🚀 Frontend ultra-rapide (lecture depuis DB, pas blockchain)
- 🔒 Sécurité maximale (vérification finale depuis smart contract lors de l'achat)
- 📊 Analytics et statistiques possibles

---

## 1️⃣ VENTE CLASSIQUE (Seller → Buyer)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VENTE CLASSIQUE                              │
└─────────────────────────────────────────────────────────────────┘

SELLER                          MARKETPLACE                    BUYER
  │                                  │                           │
  │  1. listNFT(tokenId, 100 USDC)  │                           │
  │─────────────────────────────────>│                           │
  │         ✅ Listing actif         │                           │
  │                                  │                           │
  │                                  │  2. Smart Account batch:  │
  │                                  │     - Transfer 100 USDC   │
  │                                  │     - Transfer 5 USDC fees│
  │                                  │     - buyNFT(tokenId)     │
  │                                  │<──────────────────────────│
  │                                  │                           │
  │       NFT transféré              │                           │
  │<─────────────────────────────────┼───────────────────────────│
  │                                  │         ✅ NFT reçu       │
  │    100 USDC reçu ✅              │                           │
```

**Avantages :**
- ✅ Seller n'a rien à faire au moment de l'achat
- ✅ Buyer signe 1 seule fois (batch)
- ✅ Transfert atomique (USDC + NFT ensemble)

---

## 2️⃣ OFFRE D'ACHAT (Buyer → Seller) 🆕

```
┌─────────────────────────────────────────────────────────────────┐
│              OFFRE D'ACHAT AVEC ESCROW                          │
└─────────────────────────────────────────────────────────────────┘

BUYER                           MARKETPLACE                    SELLER
  │                                  │                           │
  │  1. createBuyOffer(              │                           │
  │     tokenId, 100 USDC            │                           │
  │  )                               │                           │
  │─────────────────────────────────>│                           │
  │                                  │                           │
  │  💰 100 USDC bloqué (escrow)     │                           │
  │  ❌ Ne peut plus les utiliser    │                           │
  │                                  │                           │
  │                                  │  2. acceptBuyOffer(offerId)
  │                                  │<──────────────────────────│
  │                                  │                           │
  │       NFT reçu ✅                │      100 USDC reçu ✅     │
  │<─────────────────────────────────┼───────────────────────────│
  │                                  │      NFT transféré        │
  │  🔓 USDC released                │                           │
```

**OU annulation :**

```
BUYER                           MARKETPLACE
  │                                  │
  │  3. cancelBuyOffer(offerId)      │
  │─────────────────────────────────>│
  │                                  │
  │  💰 100 USDC rendu               │
  │<─────────────────────────────────│
  │  ✅ Fonds récupérés              │
```

**Pourquoi escrow ?**
- ⚠️ **Sans escrow :** Buyer propose 100 USDC, mais peut les dépenser → Seller accepte → Transaction échoue 😡
- ✅ **Avec escrow :** USDC bloqué dans le contrat → Seller garanti de recevoir les fonds

---

## 3️⃣ COLLECTION OFFER (Offre ouverte) 🆕

```
┌─────────────────────────────────────────────────────────────────┐
│           COLLECTION OFFER AVEC TRAITS                          │
└─────────────────────────────────────────────────────────────────┘

BUYER                       MARKETPLACE           BACKEND         SELLER A/B/C
  │                              │                   │                 │
  │  1. createCollectionOffer(   │                   │                 │
  │     100 USDC,                │                   │                 │
  │     ["rarity:rare"]          │                   │                 │
  │  )                           │                   │                 │
  │─────────────────────────────>│                   │                 │
  │                              │                   │                 │
  │  💰 100 USDC bloqué (escrow) │                   │                 │
  │                              │                   │                 │
  │                              │  Event emitted    │                 │
  │                              │──────────────────>│                 │
  │                              │                   │                 │
  │                              │                   │  📧 Notification│
  │                              │                   │  "Offre 100 USDC"
  │                              │                   │  "pour NFT rare"
  │                              │                   │────────────────>│
  │                              │                   │                 │
  │                              │                   │  Seller A accepte
  │                              │                   │<────────────────│
  │                              │                   │                 │
  │                              │                   │  Vérifie traits │
  │                              │                   │  tokenId = 123  │
  │                              │                   │  ✅ rarity=rare │
  │                              │                   │                 │
  │                              │  acceptCollectionOffer(offerId, 123)
  │                              │<──────────────────────────────────────│
  │                              │                   │                 │
  │       NFT #123 reçu ✅       │                   │  100 USDC reçu ✅
  │<─────────────────────────────┼───────────────────┼─────────────────│
  │                              │                   │    NFT transféré│
  │  🔓 USDC released            │                   │                 │
```

**Cas d'usage :**
- "Je veux n'importe quel NFT rare pour 100 USDC"
- "Je veux un NFT bleu niveau >50 pour 200 USDC"
- **Premier seller** qui possède un NFT correspondant peut accepter

---

## 4️⃣ SWAP P2P (NFT ↔ NFT)

```
┌─────────────────────────────────────────────────────────────────┐
│                 SWAP P2P (NFT ↔ NFT)                            │
└─────────────────────────────────────────────────────────────────┘

USER A                       MARKETPLACE                      USER B
  │                              │                               │
  │  1. createSwapOffer(         │                               │
  │     target: User B,          │                               │
  │     offered: [NFT #123],     │                               │
  │     requested: [NFT #456],   │                               │
  │     usdc: 0                  │                               │
  │  )                           │                               │
  │─────────────────────────────>│                               │
  │         ✅ Offre créée       │                               │
  │                              │                               │
  │                              │  2. acceptSwapOffer(swapId)   │
  │                              │<──────────────────────────────│
  │                              │                               │
  │       NFT #456 reçu ✅       │         NFT #123 reçu ✅      │
  │<─────────────────────────────┼───────────────────────────────│
  │                              │                               │
```

**Avec USDC :**

```
USER A                       MARKETPLACE                      USER B
  │                              │                               │
  │  1. createSwapOffer(         │                               │
  │     target: User B,          │                               │
  │     offered: [NFT #123],     │                               │
  │     requested: [NFT #456],   │                               │
  │     usdc: 50 USDC,           │                               │
  │     usdcFromInitiator: true  │                               │
  │  )                           │                               │
  │─────────────────────────────>│                               │
  │         ✅ Offre créée       │                               │
  │                              │                               │
  │                              │  2. Smart Account batch:      │
  │                              │     - Transfer 50 USDC → B    │
  │                              │     - acceptSwapOffer(swapId) │
  │                              │<──────────────────────────────│
  │                              │                               │
  │  NFT #456 reçu ✅            │  NFT #123 reçu ✅             │
  │  -50 USDC ❌                 │  +50 USDC ✅                  │
  │<─────────────────────────────┼───────────────────────────────│
```

**Annulation d'un Swap :**

```
USER A                       MARKETPLACE                      USER B
  │                              │                               │
  │  1. createSwapOffer(...)     │                               │
  │─────────────────────────────>│                               │
  │         ✅ Offre créée       │                               │
  │                              │                               │
  │  (User B ne répond pas)      │                               │
  │                              │                               │
  │  2. cancelSwapOffer(swapId)  │                               │
  │─────────────────────────────>│                               │
  │         ✅ Offre annulée     │                               │
  │                              │                               │
```

**⚠️ Note importante sur les swaps :**
- **Pas d'escrow USDC** : Les USDC ne sont PAS bloqués dans le contrat (contrairement aux buy offers)
- Les NFTs restent chez leurs propriétaires jusqu'à l'acceptation
- L'initiator peut annuler l'offre tant qu'elle n'est pas acceptée
- Une fois acceptée, le swap est atomique et ne peut pas être annulé

**Gestion des USDC dans les swaps :**
- Les USDC sont spécifiés dans l'offre (`usdcAmount`, `usdcFromInitiator`)
- Lors de l'acceptation, le target (celui qui accepte) doit :
  1. Transférer les USDC (si applicable)
  2. Appeler `acceptSwapOffer()`
- Ces 2 actions sont groupées dans une **batch transaction** (Smart Account)
- Le contrat ne gère que les NFTs, pas les USDC (pour réduire la complexité)

---

## 📊 COMPARAISON TYPES D'OFFRES

| Type | Qui propose | Qui accepte | USDC géré | Signatures | Annulation |
|------|-------------|-------------|-----------|------------|------------|
| **Vente classique** | Seller | Buyer | Batch (buyer paie) | 1 (Buyer) | ✅ Seller (`unlistNFT`) |
| **Offre d'achat** | Buyer | Seller | **Escrow** ✅ | 1 (Seller) | ✅ Buyer (`cancelBuyOffer`) |
| **Collection Offer** | Buyer | N'importe quel Seller | **Escrow** ✅ | 1 (Seller) | ✅ Buyer (`cancelCollectionOffer`) |
| **Swap P2P** | User A | User B (ciblé) | Batch (peut inclure USDC) | 1 (User B) | ✅ User A (`cancelSwapOffer`) |

**Légende :**
- **Escrow** : USDC bloqué dans le contrat dès la création de l'offre
- **Batch** : USDC transféré via Smart Account lors de l'acceptation (atomique)

---

## 🔒 SÉCURITÉ ESCROW

### Problème sans escrow

```
❌ SANS ESCROW

Day 1:
Buyer → "Je propose 100 USDC pour ton NFT"
        (Aucun transfert)

Day 2:
Buyer dépense ses 100 USDC ailleurs

Day 3:
Seller → "J'accepte ton offre !"
        ❌ Transaction échoue (Buyer n'a plus les fonds)
        😡 Seller en colère
```

### Solution avec escrow

```
✅ AVEC ESCROW

Day 1:
Buyer → "Je propose 100 USDC pour ton NFT"
        💰 100 USDC transféré au marketplace (bloqué)
        ❌ Buyer ne peut plus les utiliser

Day 2:
Buyer essaie de dépenser ses 100 USDC ailleurs
        ❌ Impossible (déjà bloqués)

Day 3:
Seller → "J'accepte ton offre !"
        ✅ Transaction réussit (fonds garantis)
        💰 100 USDC transféré du marketplace au seller
        🖼️ NFT transféré au buyer
        😊 Tout le monde content
```

---

## 📈 AVANTAGES SYSTÈME COMPLET

### Pour les Users

| Fonctionnalité | Avantage User |
|----------------|---------------|
| **1 signature pour tout** | Expérience fluide (batch transactions) |
| **Escrow USDC** | Sécurité garantie (fonds bloqués) |
| **Swap P2P** | Flexibilité (NFT ↔ NFT, NFT ↔ NFT + USDC) |
| **Collection Offers** | Liquidité (acheter sans cibler 1 NFT) |
| **Transferts atomiques** | Pas de risque (tout ou rien) |

### Pour CyLimit

| Fonctionnalité | Avantage Business |
|----------------|-------------------|
| **Marketplace complet** | Toutes les fonctionnalités d'OpenSea |
| **UX moderne** | Compétitif avec les meilleurs marketplaces |
| **Escrow on-chain** | Pas de gestion manuelle des litiges |
| **Collection Offers** | Plus de liquidité = plus de volume |
| **Smart Accounts** | Gas fees optimisés |

---

## 🚀 NEXT STEPS

1. ✅ **Contrat complété** (Marketplace V2)
2. ⏳ **Déployer sur Polygon Mainnet**
3. ⏳ **Intégrer dans le backend** (listen events, validate traits)
4. ⏳ **Créer interfaces frontend** (modals pour chaque type d'offre)
5. ⏳ **Tester en staging**
6. ⏳ **Déployer en production**

---

## 📝 NOTES IMPORTANTES

### Collection Offers - Validation Traits

⚠️ **Le smart contract ne vérifie PAS les traits !**

**Pourquoi ?**
- Trop coûteux en gas
- Traits stockés en metadata (JSON off-chain)

**Solution :**
1. Backend écoute `CollectionOfferCreated`
2. Backend index l'offre en DB
3. Seller clique "Accepter l'offre"
4. Backend vérifie que `tokenId` correspond aux traits requis
5. Si OK → Frontend appelle `acceptCollectionOffer(offerId, tokenId)`
6. Si KO → Erreur "NFT doesn't match required traits"

### Swap Offers - USDC Transfert

⚠️ **USDC doit être transféré AVANT `acceptSwapOffer()` !**

**Pourquoi ?**
- Swap offers n'utilisent PAS l'escrow (trop complexe)
- USDC transféré manuellement dans le batch

**Solution :**
```typescript
// Smart Account batch
const calls = [
  { to: usdcContract, data: transfer(recipient, amount) },  // Call 1
  { to: marketplace, data: acceptSwapOffer(swapId) }         // Call 2
];

await sendUserOperation({ calls });
```

---

## 🎉 CONCLUSION

Le marketplace CyLimit V2 est maintenant **COMPLET** avec :
- ✅ Vente classique (Seller → Buyer)
- ✅ Batch achat (multi-NFTs en 1 signature)
- ✅ Swap P2P (NFT ↔ NFT avec ou sans USDC)
- ✅ Offre d'achat (Buyer → Seller) avec **escrow USDC**
- ✅ Collection Offer (offre ouverte) avec **escrow USDC**

**Système d'escrow sécurisé** pour garantir les paiements.  
**1 signature pour tout** grâce aux Smart Accounts.  
**Transferts atomiques** pour éliminer les risques.

Le contrat est prêt pour le déploiement ! 🚀

