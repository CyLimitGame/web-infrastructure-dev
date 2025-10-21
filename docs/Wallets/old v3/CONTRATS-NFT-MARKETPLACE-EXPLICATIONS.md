# 🔗 Comment les Contrats NFT et Marketplace Interagissent

**Date :** 14 Octobre 2025  
**Objectif :** Comprendre la communication entre les smart contracts

---

## 🎯 Vue d'Ensemble Simplifiée

```
┌──────────────────────────────────────────────────────────────┐
│                    SYSTÈME À 2 CONTRATS                      │
└──────────────────────────────────────────────────────────────┘

CONTRAT NFT v2                          CONTRAT MARKETPLACE
(CyLimitNFT_v2.sol)                    (CyLimitMarketplace.sol)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adresse: 0xNFT...1234                  Adresse: 0xMARKET...5678

Fonctions principales:                 Fonctions principales:
├─ mint()                              ├─ listNFT()
├─ ownerOf()                           ├─ buyNFT()
├─ transferFrom()                      ├─ createBuyOffer()
├─ setApprovalForAll()                 ├─ acceptBuyOffer()
└─ isWhitelisted()                     └─ createSwapOffer()

Données stockées:                      Données stockées:
├─ NFT owners (qui possède quel NFT)   ├─ Listings (NFTs à vendre)
├─ NFT metadata (tokenURI)             ├─ Offers (offres d'achat)
├─ Whitelist (qui peut transférer)     └─ USDC escrowed (garanties)
└─ Total supply (combien de NFTs)

                  ↕️
            ILS SE PARLENT !
```

---

## 🔑 Concept Clé : Référence de Contrat

### Le Marketplace "connaît" le contrat NFT

```solidity
// Dans CyLimitMarketplace.sol

contract CyLimitMarketplace {
    // 1️⃣ Déclaration : Le marketplace garde une référence au contrat NFT
    IERC721 public nftContract;
    
    // 2️⃣ Initialisation : À la création du marketplace
    constructor(address _nftContract) {
        nftContract = IERC721(_nftContract);  // 0xNFT...1234
    }
    
    // 3️⃣ Utilisation : Le marketplace peut appeler les fonctions du contrat NFT
    function buyNFT(uint256 tokenId) external {
        // Le marketplace appelle le contrat NFT !
        nftContract.transferFrom(seller, buyer, tokenId);
        //    ↑
        //    └─ Appel au contrat NFT à l'adresse 0xNFT...1234
    }
}
```

**Analogie simple :**
```
C'est comme avoir le numéro de téléphone (adresse) d'un ami.
Une fois que tu as son numéro, tu peux l'appeler quand tu veux !

Marketplace a l'adresse du contrat NFT → Peut l'appeler
```

---

## 📞 Exemple Concret : Achat d'un NFT

### Scénario : Alice achète le NFT #123 de Bob pour 100 USDC

```
┌──────────────────────────────────────────────────────────────┐
│              FLUX COMPLET AVEC APPELS DE CONTRATS            │
└──────────────────────────────────────────────────────────────┘

ÉTAPE 1 : Bob liste son NFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bob Wallet                    Marketplace Contract
  │                                  │
  │  marketplace.listNFT(            │
  │    tokenId = 123,                │
  │    price = 100 USDC              │
  │  )                               │
  │─────────────────────────────────>│
  │                                  │
  │                                  │  Marketplace stocke en mémoire:
  │                                  │  listings[123] = {
  │                                  │    seller: Bob,
  │                                  │    price: 100 USDC,
  │                                  │    active: true
  │                                  │  }
  │                                  │
  │  ✅ Listing créé                 │
  │  ❌ NFT reste chez Bob           │


ÉTAPE 2 : Alice achète le NFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alice Wallet             Marketplace              NFT Contract
  │                           │                         │
  │  1. marketplace.buyNFT(123)                        │
  │──────────────────────────>│                         │
  │                           │                         │
  │                           │  Marketplace lit:       │
  │                           │  listing = listings[123]│
  │                           │  seller = Bob           │
  │                           │  price = 100 USDC       │
  │                           │                         │
  │                           │  2. VÉRIFICATION        │
  │                           │  "Bob possède-t-il      │
  │                           │   toujours le NFT ?"    │
  │                           │                         │
  │                           │  nftContract.ownerOf(123)
  │                           │────────────────────────>│
  │                           │                         │
  │                           │  NFT Contract regarde   │
  │                           │  dans sa mémoire:       │
  │                           │  owners[123] = Bob      │
  │                           │                         │
  │                           │  return: Bob            │
  │                           │<────────────────────────│
  │                           │                         │
  │                           │  ✅ Vérification OK     │
  │                           │                         │
  │                           │  3. TRANSFERT NFT       │
  │                           │  "Transfert NFT de Bob  │
  │                           │   vers Alice"           │
  │                           │                         │
  │                           │  nftContract.transferFrom(
  │                           │    from: Bob,           │
  │                           │    to: Alice,           │
  │                           │    tokenId: 123         │
  │                           │  )                      │
  │                           │────────────────────────>│
  │                           │                         │
  │                           │  NFT Contract vérifie:  │
  │                           │  1. Bob est owner ✅    │
  │                           │  2. Marketplace est     │
  │                           │     whitelisté ✅       │
  │                           │                         │
  │                           │  NFT Contract met à jour│
  │                           │  owners[123] = Alice    │
  │                           │                         │
  │                           │  ✅ NFT transféré       │
  │                           │<────────────────────────│
  │                           │                         │
  │  NFT reçu ! ✅            │                         │
  │<──────────────────────────│                         │
```

---

## 🗄️ Listings : Smart Contract vs Base de Données

### Pourquoi un double stockage ?

```
┌──────────────────────────────────────────────────────────────┐
│              LISTINGS : 2 SOURCES DE STOCKAGE                │
└──────────────────────────────────────────────────────────────┘

SMART CONTRACT (Blockchain)          BASE DE DONNÉES (Backend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Source de vérité                  ✅ Cache pour performances
✅ Immuable et sécurisé               ✅ Recherche et filtrage rapides
✅ Vérifié lors de l'achat            ✅ Métadonnées enrichies
✅ Décentralisé                       ✅ Analytics et statistiques

Données stockées:                    Données stockées:
├─ seller (address)                  ├─ seller (address)
├─ price (uint256)                   ├─ price (nombre)
├─ active (bool)                     ├─ active (bool)
└─ listedAt (timestamp)              ├─ listedAt (date)
                                     ├─ nft (object complet)
                                     │   ├─ tokenId
                                     │   ├─ rarity (Common, Rare, Epic)
                                     │   ├─ serialNumber
                                     │   ├─ imageUrl
                                     │   └─ metadata complet
                                     └─ stats
                                         ├─ viewCount
                                         ├─ favoriteCount
                                         └─ lastSoldPrice

LECTURE:                             LECTURE:
Lent (appel RPC blockchain)          Rapide (query MongoDB)
Gas: 0 (lecture gratuite)            Instantané, pas de gas
Limité aux données contract          Toutes les métadonnées

ÉCRITURE:                            ÉCRITURE:
Coûte du gas                         Gratuit
Permanent                            Peut être mis à jour
Décentralisé                         Centralisé (backend CyLimit)
```

### Flux Complet : Listing d'un NFT

```
┌──────────────────────────────────────────────────────────────┐
│              LISTING NFT : DOUBLE ÉCRITURE                   │
└──────────────────────────────────────────────────────────────┘

Bob Wallet          Backend API          Smart Contract      Database
  │                      │                      │                 │
  │ 1. POST /api/nft/list                      │                 │
  │    {tokenId: 123,                          │                 │
  │     price: 100}                            │                 │
  │─────────────────────>│                      │                 │
  │                      │                      │                 │
  │                      │ 2. Vérifier ownership│                 │
  │                      │    (Bob possède NFT?)│                 │
  │                      │─────────────────────>│                 │
  │                      │    ownerOf(123)      │                 │
  │                      │<─────────────────────│                 │
  │                      │    return: Bob ✅     │                 │
  │                      │                      │                 │
  │                      │ 3. Créer signature   │                 │
  │                      │    pour transaction  │                 │
  │                      │                      │                 │
  │ 4. Signer transaction│                      │                 │
  │    marketplace.listNFT(123, 100)           │                 │
  │<─────────────────────│                      │                 │
  │                      │                      │                 │
  │ 5. Envoyer tx signée │                      │                 │
  │─────────────────────>│                      │                 │
  │                      │                      │                 │
  │                      │ 6. Broadcast tx      │                 │
  │                      │─────────────────────>│                 │
  │                      │                      │                 │
  │                      │ Smart Contract stocke│                 │
  │                      │ listings[123] = {    │                 │
  │                      │   seller: Bob,       │                 │
  │                      │   price: 100 USDC,   │                 │
  │                      │   active: true,      │                 │
  │                      │   listedAt: now      │                 │
  │                      │ }                    │                 │
  │                      │                      │                 │
  │                      │ 7. Tx confirmée ✅    │                 │
  │                      │<─────────────────────│                 │
  │                      │                      │                 │
  │                      │ 8. Enregistrer en DB │                 │
  │                      │──────────────────────────────────────>│
  │                      │    {                 │                 │
  │                      │      tokenId: 123,   │                 │
  │                      │      contractAddress,│                 │
  │                      │      seller: Bob,    │                 │
  │                      │      price: 100,     │                 │
  │                      │      active: true,   │                 │
  │                      │      txHash,         │                 │
  │                      │      nft: {...},     │                 │
  │                      │    }                 │                 │
  │                      │<─────────────────────────────────────│
  │                      │                      │                 │
  │ 9. Réponse API       │                      │                 │
  │    {success: true,   │                      │                 │
  │     listingId}       │                      │                 │
  │<─────────────────────│                      │                 │


RÉSULTAT:
- Smart Contract: Listing vérifié et sécurisé ✅
- Base de données: Cache pour affichage frontend ✅
```

### Affichage du Marketplace (Frontend)

```
┌──────────────────────────────────────────────────────────────┐
│          AFFICHAGE MARKETPLACE : LECTURE DEPUIS DB           │
└──────────────────────────────────────────────────────────────┘

Frontend            Backend API          Database      Smart Contract
  │                      │                   │                 │
  │ GET /api/listings?   │                   │                 │
  │   page=1&            │                   │                 │
  │   rarity=Rare&       │                   │                 │
  │   minPrice=50&       │                   │                 │
  │   maxPrice=200       │                   │                 │
  │─────────────────────>│                   │                 │
  │                      │                   │                 │
  │                      │ Query avec filtres│                 │
  │                      │ (rapide)          │                 │
  │                      │──────────────────>│                 │
  │                      │                   │                 │
  │                      │ Return 20 listings│                 │
  │                      │ avec NFT metadata │                 │
  │                      │<──────────────────│                 │
  │                      │                   │                 │
  │ JSON avec listings   │                   │                 │
  │ + images + metadata  │                   │                 │
  │<─────────────────────│                   │                 │
  │                      │                   │                 │
  │ Affichage < 100ms ✅  │                   │                 │
  │                      │                   │                 │

⚠️ Si on lisait depuis le Smart Contract:
1. Appeler contract.getListing(tokenId) pour CHAQUE NFT
2. Appeler contract.tokenURI(tokenId) pour métadonnées
3. Fetch IPFS pour chaque image
4. Pas de filtrage par rarity/price sans lire TOUS les NFTs
5. Temps d'affichage: 5-10 secondes ❌
6. Coût: Nombreux appels RPC (peut coûter sur certains providers)
```

### Synchronisation : DB ↔ Smart Contract

```
┌──────────────────────────────────────────────────────────────┐
│            MAINTENIR LA COHÉRENCE DES DONNÉES                │
└──────────────────────────────────────────────────────────────┘

ÉVÉNEMENT                     ACTION BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NFT listé                     ✅ Créer listing en DB
(event NFTListed)             

NFT acheté                    ✅ Marquer listing.active = false
(event NFTSold)               ✅ Enregistrer sale en DB
                              ✅ Mettre à jour ownerId

NFT unlisté                   ✅ Marquer listing.active = false
(event NFTUnlisted)           

NFT transféré                 ✅ Mettre à jour ownerId en DB
(event Transfer)              ✅ Désactiver listings si applicable

Offre d'achat créée           ✅ Enregistrer offer en DB
(event BuyOfferCreated)       

Offre acceptée                ✅ Mettre à jour ownerId
(event BuyOfferAccepted)      ✅ Marquer offer.accepted = true


MÉCANISME: Event Listeners
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Backend NestJS
marketplaceContract.on('NFTListed', async (tokenId, seller, price) => {
  await Listing.create({
    tokenId,
    seller,
    price,
    active: true,
    nft: await getNFTMetadata(tokenId)
  });
});

marketplaceContract.on('NFTSold', async (tokenId, seller, buyer, price) => {
  await Listing.updateOne(
    { tokenId, active: true },
    { $set: { active: false } }
  );
  await Sale.create({ tokenId, seller, buyer, price, soldAt: Date.now() });
});
```

### Avantages du Double Stockage

| Aspect | Smart Contract Seul | DB Seule | Les Deux (CyLimit) |
|--------|---------------------|----------|-------------------|
| **Sécurité** | ✅ Décentralisé | ❌ Centralisé | ✅ Décentralisé |
| **Performance** | ❌ Lent (RPC) | ✅ Rapide | ✅ Rapide |
| **Filtrage/Recherche** | ❌ Impossible | ✅ Facile | ✅ Facile |
| **Métadonnées** | ❌ Limitées | ✅ Complètes | ✅ Complètes |
| **Source de vérité** | ✅ Blockchain | ❌ Backend | ✅ Blockchain (vérifié à l'achat) |
| **Coût** | 0 (lecture) | 0 | 0 |
| **Analytics** | ❌ Difficile | ✅ Facile | ✅ Facile |

**Stratégie CyLimit :**
- **DB** : Affichage, recherche, filtres (UX optimale)
- **Smart Contract** : Vérification finale lors de l'achat (sécurité maximale)

---

## 🔐 Sécurité : Le système de Whitelist

### Pourquoi le Marketplace peut-il transférer les NFTs ?

```
┌──────────────────────────────────────────────────────────────┐
│                  SYSTÈME DE WHITELIST EXPLIQUÉ               │
└──────────────────────────────────────────────────────────────┘

PROBLÈME SANS WHITELIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NFT Contract (règle par défaut ERC-721):
"Seul le propriétaire peut transférer son NFT"

Marketplace essaie de transférer NFT de Bob → Alice
❌ BLOQUÉ : Marketplace n'est pas le propriétaire !


SOLUTION AVEC WHITELIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NFT Contract (règle CyLimit v2):
"Seul le propriétaire OU une adresse whitelistée peut transférer"

// Dans CyLimitNFT_v2.sol
mapping(address => bool) public transferWhitelist;

function _update(address to, uint256 tokenId, address auth) {
    address from = _ownerOf(tokenId);
    
    // Si c'est un transfert (pas un mint/burn)
    if (from != address(0) && to != address(0)) {
        // Vérifier whitelist
        require(
            transferWhitelist[from] || transferWhitelist[to],
            "Transfer not allowed"
        );
    }
    
    // Continuer le transfert
    return super._update(to, tokenId, auth);
}

RÉSULTAT:
Marketplace whitelisté → ✅ Peut transférer les NFTs
```

### Configuration de la Whitelist

```solidity
// À faire UNE FOIS après déploiement

// 1. Whitelister le Marketplace
nftContract.setTransferWhitelist(0xMARKET...5678, true);

// 2. Whitelister le Master New Wallet (pour migration)
nftContract.setTransferWhitelist(0xMASTER...9ABC, true);

// Maintenant ces 2 adresses peuvent transférer N'IMPORTE QUEL NFT !
```

---

## 🔄 Approbations : setApprovalForAll()

### Alternative à la Whitelist (Standard ERC-721)

```
┌──────────────────────────────────────────────────────────────┐
│                  APPROBATIONS INDIVIDUELLES                  │
└──────────────────────────────────────────────────────────────┘

MÉTHODE 1 : setApprovalForAll() (Standard ERC-721)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bob Wallet                    NFT Contract
  │                                 │
  │  nftContract.setApprovalForAll( │
  │    operator: Marketplace,       │
  │    approved: true               │
  │  )                              │
  │────────────────────────────────>│
  │                                 │
  │                                 │  NFT Contract stocke:
  │                                 │  approvals[Bob][Marketplace] = true
  │                                 │
  │  ✅ Marketplace peut maintenant │
  │     transférer TOUS les NFTs    │
  │     de Bob                      │

RÉSULTAT:
- Bob a donné permission GLOBALE au Marketplace
- Marketplace peut transférer NFT #123, #456, #789, etc.
- Bob garde la propriété des NFTs


MÉTHODE 2 : transferWhitelist (CyLimit v2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Owner NFT Contract            NFT Contract
  │                                 │
  │  nftContract.setTransferWhitelist(
  │    account: Marketplace,        │
  │    status: true                 │
  │  )                              │
  │────────────────────────────────>│
  │                                 │
  │                                 │  NFT Contract stocke:
  │                                 │  transferWhitelist[Marketplace] = true
  │                                 │
  │  ✅ Marketplace peut maintenant │
  │     transférer N'IMPORTE QUEL   │
  │     NFT de N'IMPORTE QUI        │

RÉSULTAT:
- Permission GLOBALE pour TOUS les users
- Marketplace peut transférer les NFTs de Bob, Alice, Charlie, etc.
- Plus restrictif (uniquement certaines adresses de confiance)
```

### Comparaison des Deux Méthodes

| Aspect | setApprovalForAll() | transferWhitelist |
|--------|---------------------|-------------------|
| **Qui donne permission ?** | Chaque user individuellement | Owner du contrat (CyLimit) |
| **Scope** | NFTs d'un user | NFTs de TOUS les users |
| **Révocable par user ?** | ✅ Oui | ❌ Non (seulement owner) |
| **Sécurité** | ⚠️ User doit faire confiance | ✅ Contrôle total par CyLimit |
| **UX** | ⚠️ Chaque user doit signer | ✅ Configuration une fois |

**CyLimit utilise les DEUX :**
- `setApprovalForAll()` : Users approuvent le Marketplace (standard ERC-721)
- `transferWhitelist` : CyLimit whitelist Marketplace + Master Wallet (sécurité supplémentaire)

---

## 💰 Interaction avec USDC

### Le Marketplace gère aussi les USDC (3 contrats !)

```
┌──────────────────────────────────────────────────────────────┐
│              SYSTÈME À 3 CONTRATS (avec USDC)                │
└──────────────────────────────────────────────────────────────┘

NFT Contract        Marketplace         USDC Contract
0xNFT...1234       0xMARKET...5678     0xUSDC...9ABC
     │                   │                    │
     │                   │                    │
     │  Le Marketplace connaît les 2 autres  │
     │                   │                    │
     │    nftContract ───┘                    │
     │    usdcContract ───────────────────────┘
     │                   │
     │  Peut appeler:    │  Peut appeler:
     │  - ownerOf()      │  - transferFrom()
     │  - transferFrom() │  - balanceOf()
     │                   │  - approve()


EXEMPLE : Alice achète NFT de Bob
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alice → Marketplace.buyNFT(123)
           │
           ├─ 1. Marketplace appelle USDC Contract
           │     usdcContract.transferFrom(
           │       Alice → Bob, 100 USDC
           │     )
           │
           ├─ 2. Marketplace appelle USDC Contract
           │     usdcContract.transferFrom(
           │       Alice → CyLimit, 5 USDC fees
           │     )
           │
           └─ 3. Marketplace appelle NFT Contract
                 nftContract.transferFrom(
                   Bob → Alice, NFT #123
                 )

RÉSULTAT:
- Alice : -105 USDC, +1 NFT
- Bob : +100 USDC, -1 NFT
- CyLimit : +5 USDC
- Marketplace : rien (juste facilite la transaction)
```

---

## 🔒 Escrow USDC dans le Marketplace

### Cas spécial : Buy Offers

```
┌──────────────────────────────────────────────────────────────┐
│                   ESCROW USDC EXPLIQUÉ                       │
└──────────────────────────────────────────────────────────────┘

ÉTAPE 1 : Alice crée une offre d'achat
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alice Wallet        Marketplace         USDC Contract
  │                      │                     │
  │  marketplace.createBuyOffer(              │
  │    tokenId: 123,                          │
  │    price: 100 USDC                        │
  │  )                   │                     │
  │─────────────────────>│                     │
  │                      │                     │
  │                      │  1. Marketplace transfère USDC
  │                      │     usdcContract.transferFrom(
  │                      │       Alice,        │
  │                      │       Marketplace,  │  ← Le Marketplace reçoit !
  │                      │       100 USDC      │
  │                      │     )               │
  │                      │────────────────────>│
  │                      │                     │
  │                      │  USDC Contract:     │
  │                      │  balance[Alice] -= 100
  │                      │  balance[Marketplace] += 100
  │                      │                     │
  │                      │  ✅ USDC transféré  │
  │                      │<────────────────────│
  │                      │                     │
  │                      │  2. Marketplace stocke
  │                      │  escrowedUSDC[Alice] = 100
  │                      │  buyOffers[offerId] = {
  │                      │    buyer: Alice,
  │                      │    tokenId: 123,
  │                      │    price: 100
  │                      │  }
  │                      │                     │
  │  -100 USDC           │  +100 USDC          │
  │  (bloqué dans        │  (en escrow)        │
  │   marketplace)       │                     │


ÉTAPE 2 : Bob accepte l'offre
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bob Wallet          Marketplace         USDC + NFT Contracts
  │                      │                     │
  │  marketplace.acceptBuyOffer(offerId)      │
  │─────────────────────>│                     │
  │                      │                     │
  │                      │  1. Marketplace transfère USDC
  │                      │     usdcContract.transfer(
  │                      │       Bob,          │
  │                      │       100 USDC      │
  │                      │     )               │
  │                      │────────────────────>│
  │                      │                     │
  │                      │  USDC Contract:     │
  │                      │  balance[Marketplace] -= 100
  │                      │  balance[Bob] += 100│
  │                      │                     │
  │  +100 USDC           │  -100 USDC          │
  │<─────────────────────│<────────────────────│
  │                      │                     │
  │                      │  2. Marketplace transfert NFT
  │                      │     nftContract.transferFrom(
  │                      │       Bob,          │
  │                      │       Alice,        │
  │                      │       tokenId: 123  │
  │                      │     )               │
  │                      │────────────────────>│
  │                      │                     │
  │  -NFT #123           │  ✅ NFT transféré   │
  │                      │                     │
  │                      │  3. Marketplace met à jour
  │                      │  escrowedUSDC[Alice] = 0
  │                      │  buyOffers[offerId].active = false
  │                      │                     │

RÉSULTAT FINAL:
- Alice: -100 USDC, +NFT #123
- Bob: +100 USDC, -NFT #123
- Marketplace: 0 USDC (juste transit)
```

---

## 📊 Récapitulatif : Qui Fait Quoi ?

### Contrat NFT (CyLimitNFT_v2.sol)

| Fonction | Description | Appelé par |
|----------|-------------|------------|
| `mint(to, tokenURI)` | Créer un nouveau NFT | Owner (CyLimit backend) |
| `ownerOf(tokenId)` | Qui possède ce NFT ? | Marketplace, backend |
| `transferFrom(from, to, tokenId)` | Transférer un NFT | Marketplace (whitelisté) |
| `setApprovalForAll(operator, approved)` | Autoriser un opérateur | Users (une fois) |
| `setTransferWhitelist(account, status)` | Whitelister une adresse | Owner (CyLimit) |
| `isWhitelisted(account)` | Vérifier whitelist | Marketplace, backend |

**Données stockées :**
- `owners[tokenId]` → Qui possède quel NFT
- `tokenURIs[tokenId]` → Métadonnées IPFS
- `transferWhitelist[address]` → Qui peut transférer
- `_tokenIdCounter` → Prochain ID disponible

---

### Contrat Marketplace (CyLimitMarketplace.sol)

| Fonction | Description | Appelle |
|----------|-------------|---------|
| `listNFT(tokenId, price)` | Lister un NFT à vendre | Rien (juste stocke en mémoire) |
| `unlistNFT(tokenId)` | Retirer un listing | Rien (juste met `active = false`) |
| `buyNFT(tokenId)` | Acheter un NFT listé | `nftContract.transferFrom()` + `usdcContract.transferFrom()` |
| `createBuyOffer(tokenId, price)` | Créer offre d'achat | `usdcContract.transferFrom()` (escrow) |
| `acceptBuyOffer(offerId)` | Accepter offre | `usdcContract.transfer()` + `nftContract.transferFrom()` |
| `cancelBuyOffer(offerId)` | Annuler offre d'achat | `usdcContract.transfer()` (rembourse USDC) |
| `createSwapOffer(...)` | Proposer swap NFT | Rien (juste stocke) |
| `acceptSwapOffer(swapId)` | Accepter swap | `nftContract.transferFrom()` (x2) |
| `cancelSwapOffer(swapId)` | Annuler swap | Rien (juste met `active = false`) |

**Données stockées :**
- `listings[tokenId]` → NFTs à vendre
- `buyOffers[offerId]` → Offres d'achat
- `escrowedUSDC[address]` → USDC en garantie
- `swapOffers[swapId]` → Propositions de swap

**⚠️ IMPORTANT : Listings en DB (Backend)**
Les listings sont **également stockés en base de données** par le backend CyLimit pour :
- ✅ Recherche et filtrage rapides (par prix, rarity, user, etc.)
- ✅ Affichage sans appels blockchain coûteux
- ✅ Statistiques et analytics
- ✅ Cache pour performances

**Double stockage :**
- Smart Contract : Source de vérité (active/inactive, seller, prix)
- Base de données : Cache + métadonnées enrichies

**Références aux autres contrats :**
- `nftContract` → 0xNFT...1234
- `usdcContract` → 0xUSDC...9ABC

---

### Contrat USDC (Standard ERC-20)

| Fonction | Description | Appelé par |
|----------|-------------|------------|
| `transfer(to, amount)` | Envoyer USDC | Marketplace, users |
| `transferFrom(from, to, amount)` | Transférer pour quelqu'un | Marketplace (avec approval) |
| `approve(spender, amount)` | Autoriser dépenses | Users → Marketplace |
| `balanceOf(account)` | Solde USDC | Marketplace, backend |

**Données stockées :**
- `balances[address]` → Combien d'USDC chacun a
- `allowances[owner][spender]` → Qui peut dépenser pour qui

---

## 🎯 Exemple Complet : Tous les Appels

```solidity
// ════════════════════════════════════════════════════════════
// SCÉNARIO COMPLET : Alice achète NFT #123 de Bob pour 100 USDC
// ════════════════════════════════════════════════════════════

// SETUP (Une fois par user)
// ─────────────────────────────────────────────────────────────

// 1. Bob autorise Marketplace pour ses NFTs
nftContract.setApprovalForAll(marketplace, true);
// Called by: Bob
// Stored in: NFT Contract
// Result: approvals[Bob][Marketplace] = true

// 2. Alice autorise Marketplace pour son USDC
usdcContract.approve(marketplace, UNLIMITED);
// Called by: Alice
// Stored in: USDC Contract
// Result: allowances[Alice][Marketplace] = UNLIMITED


// LISTING
// ─────────────────────────────────────────────────────────────

// 3. Bob liste son NFT
marketplace.listNFT(tokenId=123, price=100 USDC);
// Called by: Bob
// Stored in: Marketplace
// Result: listings[123] = {seller: Bob, price: 100, active: true}


// ACHAT
// ─────────────────────────────────────────────────────────────

// 4. Alice achète le NFT
marketplace.buyNFT(tokenId=123);
// Called by: Alice

    // 4a. Marketplace vérifie le owner
    address owner = nftContract.ownerOf(123);
    // Called by: Marketplace → NFT Contract
    // Returns: Bob
    
    // 4b. Marketplace vérifie que Bob possède toujours le NFT
    require(owner == listing.seller, "Seller no longer owns NFT");
    
    // 4c. Marketplace transfère USDC au seller
    usdcContract.transferFrom(Alice, Bob, 100 USDC);
    // Called by: Marketplace → USDC Contract
    // Uses: allowances[Alice][Marketplace]
    // Result: balance[Alice] -= 100, balance[Bob] += 100
    
    // 4d. Marketplace transfère fees à CyLimit
    usdcContract.transferFrom(Alice, CyLimit, 5 USDC);
    // Called by: Marketplace → USDC Contract
    // Result: balance[Alice] -= 5, balance[CyLimit] += 5
    
    // 4e. Marketplace transfère le NFT
    nftContract.transferFrom(Bob, Alice, 123);
    // Called by: Marketplace → NFT Contract
    // Uses: approvals[Bob][Marketplace] = true
    // OR: transferWhitelist[Marketplace] = true
    // Result: owners[123] = Alice
    
    // 4f. Marketplace marque listing inactif
    listings[123].active = false;
    // Stored in: Marketplace


// RÉSULTAT FINAL
// ─────────────────────────────────────────────────────────────

// Alice:
// - USDC: -105 (100 à Bob + 5 fees)
// - NFT #123: +1 (reçu de Bob)

// Bob:
// - USDC: +100 (reçu d'Alice)
// - NFT #123: -1 (transféré à Alice)

// CyLimit:
// - USDC: +5 (fees)

// Marketplace:
// - USDC: 0 (juste transit)
// - NFT: 0 (juste transit)
```

---

## 🔐 Sécurité : Qui Peut Appeler Quoi ?

```
┌──────────────────────────────────────────────────────────────┐
│                  MATRICE DES PERMISSIONS                     │
└──────────────────────────────────────────────────────────────┘

CONTRAT NFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fonction                          Qui peut appeler ?
──────────────────────────────────────────────────────────────
mint()                            ✅ Owner (CyLimit)
setTransferWhitelist()            ✅ Owner (CyLimit)
transferFrom() [whitelisté]       ✅ Marketplace, Master Wallet
transferFrom() [non-whitelisté]   ❌ Bloqué
setApprovalForAll()               ✅ Chaque user pour lui-même
ownerOf()                         ✅ Tout le monde (lecture)


CONTRAT MARKETPLACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fonction                          Qui peut appeler ?
──────────────────────────────────────────────────────────────
listNFT()                         ✅ Propriétaire du NFT
unlistNFT()                       ✅ Propriétaire du NFT listé
buyNFT()                          ✅ N'importe qui (avec USDC)
buyMultipleNFTs()                 ✅ N'importe qui (avec USDC)
createBuyOffer()                  ✅ N'importe qui (avec USDC)
acceptBuyOffer()                  ✅ Propriétaire du NFT ciblé
cancelBuyOffer()                  ✅ Créateur de l'offre
createSwapOffer()                 ✅ Propriétaire des NFTs offerts
acceptSwapOffer()                 ✅ Cible du swap uniquement
cancelSwapOffer()                 ✅ Créateur de l'offre swap


CONTRAT USDC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fonction                          Qui peut appeler ?
──────────────────────────────────────────────────────────────
transfer()                        ✅ Propriétaire des fonds
transferFrom()                    ✅ Si approved (ex: Marketplace)
approve()                         ✅ Propriétaire des fonds
```

---

## 💱 Swap Offers avec USDC : Comment ça marche ?

### ✅ NOTE : Cette section décrit la version CORRIGÉE (appliquée)

**État actuel :** Le contrat fait maintenant de l'escrow USDC ✅  
**Documentation :** `/docs/Wallets/CORRECTION-SWAP-USDC-ESCROW.md`

---

### Différence clé : Escrow pour TOUS les types d'offres (version corrigée)

```
┌──────────────────────────────────────────────────────────────┐
│       BUY OFFER vs SWAP OFFER (avec USDC) - CORRIGÉ         │
└──────────────────────────────────────────────────────────────┘

BUY OFFER (Escrow)              SWAP OFFER (Escrow) ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Création:                    1. Création:
   Buyer → Marketplace             User A crée offre
   USDC transféré au contrat       SI usdcFromInitiator = true:
   USDC bloqué (escrow) ✅           USDC transféré au contrat ✅
                                     USDC bloqué (escrow) ✅

2. Acceptation:                 2. Acceptation:
   Seller accepte                  User B accepte
   Marketplace libère USDC         SI usdcFromInitiator = true:
   + transfère NFT                   Marketplace libère USDC → B
                                   SI usdcFromInitiator = false:
                                     B transfère USDC → A
                                   + transfère NFTs

3. Annulation:                  3. Annulation:
   Buyer récupère USDC             User A annule
   (remboursé depuis escrow)       SI USDC escrowed:
                                     Remboursé à User A ✅

SÉCURITÉ:                       SÉCURITÉ:
✅ USDC garanti                 ✅ USDC garanti (si initiator paie)
✅ Seller protégé               ✅ Target protégé
                                ✅ Cohérent avec buy offers
```

### Exemple Concret : Swap avec USDC (VERSION CORRIGÉE)

**Scénario :** Alice veut échanger son NFT #123 + 50 USDC contre le NFT #456 de Bob

```
┌──────────────────────────────────────────────────────────────┐
│    ALICE SWAP NFT #123 + 50 USDC ↔ BOB NFT #456 (CORRIGÉ)   │
└──────────────────────────────────────────────────────────────┘

ÉTAPE 1 : Alice crée l'offre (VERSION CORRIGÉE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alice                   Marketplace Contract    USDC Contract
  │                            │                      │
  │  createSwapOffer(          │                      │
  │    target: Bob,            │                      │
  │    offered: [#123],        │                      │
  │    requested: [#456],      │                      │
  │    usdcAmount: 50,         │                      │
  │    usdcFromInitiator: true │  ← Alice paie 50 USDC│
  │  )                         │                      │
  │───────────────────────────>│                      │
  │                            │                      │
  │                            │  ✅ ESCROW USDC      │
  │                            │  transferFrom(       │
  │                            │    Alice,            │
  │                            │    Marketplace,      │
  │                            │    50 USDC           │
  │                            │  )                   │
  │                            │─────────────────────>│
  │                            │                      │
  │                            │  USDC Contract:      │
  │                            │  balance[Alice] -= 50│
  │                            │  balance[Marketplace] += 50
  │                            │                      │
  │                            │  ✅ USDC transféré   │
  │                            │<─────────────────────│
  │                            │                      │
  │                            │  Marketplace stocke: │
  │                            │  swapOffers[1] = {   │
  │                            │    initiator: Alice, │
  │                            │    target: Bob,      │
  │                            │    offered: [#123],  │
  │                            │    requested: [#456],│
  │                            │    usdcAmount: 50,   │
  │                            │    usdcFromInitiator: true
  │                            │  }                   │
  │                            │  escrowedUSDC[Alice] = 50
  │                            │                      │
  │  ✅ Offre créée            │  ✅ 50 USDC en escrow│
  │  -50 USDC (bloqué)         │     (sécurisé)       │


ÉTAPE 2 : Bob accepte (VERSION CORRIGÉE - PLUS DE BATCH USDC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bob                     Marketplace         USDC Contract    NFT Contract
  │                           │                   │                │
  │  acceptSwapOffer(1)       │                   │                │
  │──────────────────────────>│                   │                │
  │                           │                   │                │
  │                           │  Marketplace vérifie:              │
  │                           │  - offer.target == Bob ✅           │
  │                           │  - Alice possède #123 ✅            │
  │                           │  - Bob possède #456 ✅              │
  │                           │                   │                │
  │                           │  1. Transfer USDC (depuis escrow)  │
  │                           │  transfer(Bob, 50)│                │
  │                           │──────────────────>│                │
  │                           │                   │                │
  │                           │  USDC Contract:   │                │
  │                           │  balance[Marketplace] -= 50        │
  │                           │  balance[Bob] += 50                │
  │                           │                   │                │
  │                           │  ✅ USDC transféré│                │
  │                           │<──────────────────│                │
  │                           │                   │                │
  │                           │  escrowedUSDC[Alice] -= 50         │
  │                           │                   │                │
  │  2. Transfer NFTs         │                   │                │
  │  (géré par marketplace)   │                   │                │
  │                           │                 │                 │
  │                           │  Marketplace vérifie:             │
  │                           │  - offer.target == Bob ✅          │
  │                           │  - Alice possède #123 ✅           │
  │                           │  - Bob possède #456 ✅             │
  │                           │                 │                 │
  │                           │  Transfer NFT #123 (Alice → Bob)  │
  │                           │─────────────────────────────────>│
  │                           │                 │                 │
  │                           │  NFT Contract:  │                 │
  │                           │  owners[123] = Bob                │
  │                           │                 │                 │
  │                           │  Transfer NFT #456 (Bob → Alice)  │
  │                           │─────────────────────────────────>│
  │                           │                 │                 │
  │                           │  NFT Contract:  │                 │
  │                           │  owners[456] = Alice              │
  │                           │                 │                 │
  │                           │  offer.active = false             │
  │                           │                 │                 │
  │  ✅ Tout complété          │                 │                 │
  │<──────────────────────────┴─────────────────┴─────────────────│


RÉSULTAT FINAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alice:
- USDC: -50 (payé à Bob)
- NFT #123: -1 (donné à Bob)
- NFT #456: +1 (reçu de Bob)

Bob:
- USDC: +50 (reçu d'Alice)
- NFT #123: +1 (reçu d'Alice)
- NFT #456: -1 (donné à Alice)

Marketplace:
- USDC: 0 (jamais touché)
- NFT: 0 (juste facilite le transfert)


⚠️ IMPORTANT:
- Si Alice ne transfère pas les USDC dans le batch, la transaction ÉCHOUE
- Tout est atomique : soit tout réussit, soit tout échoue
- Le Marketplace ne voit jamais les USDC (plus simple, moins de gas)
```

### Pourquoi pas d'escrow pour les swaps ?

**Raisons de design :**

1. **Complexité réduite** : Le contrat Marketplace n'a pas besoin de gérer les USDC
2. **Gas optimisé** : Moins d'appels au contrat USDC
3. **Atomicité garantie** : Smart Account batch = tout réussit ou tout échoue
4. **Flexibilité** : L'USDC peut aller dans les 2 sens (initiator → target ou inverse)

**Trade-off :**
- ✅ Plus simple, moins cher en gas
- ✅ Atomique lors de l'acceptation (sécurisé)
- ⚠️ Nécessite Smart Account (batch transactions)
- ⚠️ Pas de garantie USDC avant acceptation

### Comparaison des Méthodes de Gestion USDC

| Type d'offre | USDC Escrow | Quand USDC transféré | Garantie |
|--------------|-------------|----------------------|----------|
| **Buy Offer** | ✅ Oui | À la création (buyer → marketplace) | ✅ USDC bloqué |
| **Collection Offer** | ✅ Oui | À la création (buyer → marketplace) | ✅ USDC bloqué |
| **Vente classique** | ❌ Non | À l'achat (buyer → seller) | ⚠️ Atomique (batch) |
| **Swap Offer** (initiator paie) | ✅ Oui | À la création (initiator → marketplace) | ✅ USDC bloqué |
| **Swap Offer** (target paie) | ❌ Non | À l'acceptation (target → initiator) | ⚠️ Atomique |

---

## 🎉 Conclusion : La Communication Entre Contrats

### Points Clés à Retenir

1. **Adresses = Numéros de téléphone**
   - Le Marketplace connaît l'adresse du contrat NFT
   - Peut l'appeler quand il veut

2. **Whitelist = VIP Pass**
   - Marketplace whitelisté → Peut transférer tous les NFTs
   - Master Wallet whitelisté → Peut migrer les NFTs

3. **Approvals = Autorisation Bancaire**
   - User approve Marketplace pour USDC → Marketplace peut dépenser
   - User approve Marketplace pour NFT → Marketplace peut transférer

4. **Escrow = Compte de Garantie**
   - USDC bloqué dans Marketplace jusqu'à acceptation/annulation
   - Sécurise les offres d'achat

5. **3 Contrats, 1 Système**
   - NFT Contract : Propriété des NFTs
   - USDC Contract : Propriété des fonds
   - Marketplace : Orchestre tout

### Analogie Finale

```
C'est comme une vente immobilière :

NFT Contract = Cadastre
  → Sait qui possède quelle maison (NFT)

USDC Contract = Banque
  → Gère l'argent de tout le monde

Marketplace = Notaire
  → Organise la transaction
  → Vérifie que le vendeur possède la maison (ownerOf)
  → Transfère l'argent (USDC)
  → Transfère la propriété (NFT)
  → Tout en une seule signature !
```

---

## 📝 Changelog

**Version 1.3.0** - 14 Octobre 2025 ✅
- 🐛 **BUG IDENTIFIÉ ET CORRIGÉ** : Swap offers font maintenant de l'escrow USDC
- ✅ **CORRECTION APPLIQUÉE** : Ajout escrow USDC pour swap offers
- 📄 Document de correction : `CORRECTION-SWAP-USDC-ESCROW.md`
- 🔧 Modifications apportées à `CyLimitMarketplace.sol` :
  - `createSwapOffer()` : Escrow USDC si `usdcFromInitiator = true`
  - `cancelSwapOffer()` : Remboursement USDC si escrowed
  - `acceptSwapOffer()` : Gestion automatique USDC selon `usdcFromInitiator`

**Version 1.2.0** - 14 Octobre 2025
- ✅ Ajout section majeure "Swap Offers avec USDC : Comment ça marche ?"
- ✅ Clarification : Les swaps PEUVENT inclure des USDC (via batch transaction)
- ✅ Schéma complet : Escrow (buy offers) vs Batch (swap offers)
- ✅ Exemple détaillé : Alice swap NFT + 50 USDC ↔ Bob NFT
- ✅ Tableau comparatif des méthodes de gestion USDC
- ✅ Explication des raisons de design (pourquoi pas d'escrow pour swaps)

**Version 1.1.0** - 14 Octobre 2025
- ✅ Ajout section complète "Listings : Smart Contract vs Base de Données"
- ✅ Ajout fonction `cancelSwapOffer()` dans la documentation
- ✅ Ajout fonctions `unlistNFT()` et `buyMultipleNFTs()`
- ✅ Clarification du système de double stockage (blockchain + DB)
- ✅ Ajout schémas de flux complets pour listing et affichage marketplace
- ✅ Ajout mécanisme de synchronisation via event listeners
- ✅ Tableau comparatif amélioré avec colonne "Annulation"

**Version 1.0.0** - 14 Octobre 2025
- 🎉 Version initiale du document d'explications

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 14 Octobre 2025  
**Version :** 1.3.0

---

## ✅ CORRECTION APPLIQUÉE

**État du contrat (corrigé) :**
- ✅ Les swap offers avec USDC font maintenant de l'escrow
- ✅ Sécurité : Les USDC sont bloqués lors de la création de l'offre
- ✅ Cohérent avec les buy offers

**Prochaines étapes :**
- ⏳ Compiler et tester le contrat
- ⏳ Déployer sur testnet Amoy pour validation
- ⏳ Code review avant déploiement mainnet
- 📄 Détails : `/docs/Wallets/CORRECTION-SWAP-USDC-ESCROW.md`

