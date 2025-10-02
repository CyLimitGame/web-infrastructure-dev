# Décision Finale : Architecture Wallet CyLimit

## 🎯 Vision & Public Cible

**Public cible : FANS DE VÉLO uniquement**
- ❌ PAS de crypto-natifs
- ❌ PAS d'exposition OpenSea/Blur
- ❌ PAS de complexité Web3
- ✅ UX simple comme une app mobile classique

**Positionnement : "Cartes de collection digitales" PAS "NFTs crypto"**

---

## ✅ DÉCISION : NFTs Bloqués (Marketplace CyLimit uniquement)

### Pourquoi c'est la BONNE décision pour votre cas

#### 1. **Public Cible Non-Crypto**

Vos utilisateurs sont :
- 🚴 Fans de cyclisme
- 📱 Habitués aux apps mobiles classiques
- 💳 Paient par CB, pas crypto
- ❓ Ne savent pas ce qu'est MetaMask/OpenSea

**Ils n'ont AUCUN intérêt à l'interopérabilité Web3 !**

---

#### 2. **Problèmes de Synchronisation DB ↔ Blockchain**

**Si NFTs ouverts sur OpenSea :**

```
Problème 1 : Sync Owner
- User A vend NFT #123 sur OpenSea à User B
- Votre DB dit toujours : ownerId = userA_id
- Il faut indexer TOUTES les transactions blockchain
- Complexité : écouter events 24/7, gérer les reorgs, etc.

Problème 2 : Acheteur sans compte CyLimit
- User B (0xDEF456...) achète sur OpenSea
- Il n'a PAS de compte CyLimit
- Votre DB : ownerId = ??? (pas d'user_id)
- Le NFT devient "orphelin" dans votre système

Problème 3 : Features Fantasy cassées
- NFT #123 utilisé dans une compétition active
- User vend sur OpenSea pendant la compétition
- Votre système croit qu'il l'a encore
- Fair-play cassé, bugs partout

Problème 4 : Support Client cauchemar
- "Mon NFT n'apparaît plus dans CyLimit"
- "J'ai acheté sur OpenSea mais je ne le vois pas"
- "Comment connecter mon wallet MetaMask ?"
- Vous devenez support technique Web3
```

**C'est une USINE À GAZ comme tu dis ! 😱**

---

#### 3. **Pas Besoin de Marketing OpenSea**

Vous n'avez PAS besoin de crypto-natifs :
- ❌ Ils ne connaissent pas le cyclisme
- ❌ Ils veulent juste trader/flipper
- ❌ Ils ne jouent pas au fantasy
- ❌ Pas votre target

**Votre acquisition :**
- ✅ Communauté cyclisme (Twitter, Strava, forums)
- ✅ Partenariats équipes pro
- ✅ Influenceurs cyclisme
- ✅ SEO "fantasy cyclisme"

**Zero besoin d'OpenSea exposure !**

---

#### 4. **Frais Incontrôlables sur Plateformes Externes**

**Même avec ERC-2981 royalties :**

```
Blur :
- Royalties : 0% (jamais)
- Commission : 0.5%
- Vous recevez : 0%

LooksRare :
- Royalties : optionnelles (0-10%)
- Commission : 2%
- Vous recevez : 0-10% (aléatoire)

X2Y2 :
- Royalties : optionnelles
- Commission : 0.5%
- Vous recevez : 0-10%

Nouveaux marketplaces tous les mois :
- Impossible de tout paramétrer
- Royalties toujours optionnelles
- Course vers 0% fees
```

**Vous NE POUVEZ PAS contrôler 25% de fees sur toutes les plateformes !**

---

## 💎 Solution Recommandée : "Soulbound-Like" NFTs

### Smart Contract avec Whitelist Stricte

```solidity
// CyLimitNFT.sol - Version B2C Non-Crypto
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CyLimitNFT is ERC721, Ownable {
    // Seul le marketplace CyLimit peut transférer
    address public immutable cylimitMarketplace;
    
    // Lock NFTs pendant compétitions
    mapping(uint256 => uint256) public lockUntil;
    
    constructor(address _marketplace) ERC721("CyLimit Riders", "CYLMT") {
        cylimitMarketplace = _marketplace;
    }
    
    // Override transferFrom : BLOQUÉ sauf marketplace
    function transferFrom(address from, address to, uint256 tokenId) 
        public override 
    {
        require(
            msg.sender == cylimitMarketplace || 
            msg.sender == owner(), // Admin emergency
            "Transfers only through CyLimit app"
        );
        
        require(
            block.timestamp > lockUntil[tokenId],
            "Card locked in active competition"
        );
        
        super.transferFrom(from, to, tokenId);
    }
    
    // Pareil pour safeTransferFrom
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public override
    {
        require(
            msg.sender == cylimitMarketplace || 
            msg.sender == owner(),
            "Transfers only through CyLimit app"
        );
        
        require(
            block.timestamp > lockUntil[tokenId],
            "Card locked in active competition"
        );
        
        super.safeTransferFrom(from, to, tokenId, data);
    }
    
    // Lock pour compétition (appelé par backend)
    function lockForCompetition(uint256 tokenId, uint256 endTimestamp) 
        external 
    {
        require(msg.sender == cylimitMarketplace, "Only marketplace");
        lockUntil[tokenId] = endTimestamp;
    }
    
    // Mint (appelé par backend uniquement)
    function mint(address to, uint256 tokenId) external {
        require(msg.sender == owner(), "Only admin");
        _safeMint(to, tokenId);
    }
}
```

---

### Marketplace Contract Simplifié

```solidity
// CyLimitMarketplace.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CyLimitNFT.sol";

contract CyLimitMarketplace is Ownable {
    CyLimitNFT public nftContract;
    IERC20 public usdc;
    address public treasury;
    
    uint256 public constant COMMISSION_BPS = 1000; // 10% total
    
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }
    
    mapping(uint256 => Listing) public listings;
    
    constructor(address _nft, address _usdc, address _treasury) {
        nftContract = CyLimitNFT(_nft);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }
    
    // Lister un NFT (appelé depuis app CyLimit uniquement)
    function listNFT(uint256 tokenId, uint256 price) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Invalid price");
        
        // Transfer NFT to marketplace (escrow)
        nftContract.transferFrom(msg.sender, address(this), tokenId);
        
        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    // Acheter un NFT
    function buyNFT(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not for sale");
        
        uint256 commission = (listing.price * COMMISSION_BPS) / 10000;
        uint256 sellerAmount = listing.price - commission;
        
        // Transferts USDC
        usdc.transferFrom(msg.sender, listing.seller, sellerAmount); // 90%
        usdc.transferFrom(msg.sender, treasury, commission);         // 10%
        
        // Transfer NFT
        nftContract.transferFrom(address(this), msg.sender, tokenId);
        
        listings[tokenId].active = false;
        
        emit NFTSold(tokenId, listing.seller, msg.sender, listing.price);
    }
    
    // Cancel listing
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Not active");
        
        nftContract.transferFrom(address(this), msg.sender, tokenId);
        listings[tokenId].active = false;
        
        emit ListingCancelled(tokenId);
    }
    
    events...
}
```

---

## ✅ Résultat Final

### Ce qui se passe :

```
1. User A veut vendre NFT #123 sur OpenSea
   → Clique "Transfer to MetaMask" dans son wallet
   → Transaction blockchain : REVERT ❌
   → Message : "Transfers only through CyLimit app"
   → Il NE PEUT PAS

2. User A ouvre MetaMask
   → Voit son NFT #123 ✅
   → Essaie de le transférer
   → Transaction : REVERT ❌
   
3. User A va sur OpenSea
   → Collection apparaît (détection auto)
   → NFT #123 visible
   → Clique "List for sale"
   → Transaction : REVERT ❌
   → Message OpenSea : "This collection does not allow external transfers"

4. User A va sur CyLimit app
   → Clique "Vendre mon NFT"
   → Prix : 50 USDC
   → Transaction : SUCCESS ✅
   → Commission : 10% (5 USDC)
   → Vendeur reçoit : 45 USDC
```

**NFT visible partout (MetaMask, OpenSea) MAIS transférable uniquement sur CyLimit !**

---

## 📊 Avantages pour CyLimit

### 1. **Contrôle Total**

✅ **100% des transactions sur votre plateforme**
- Commission garantie : 10%
- Pas de contournement possible
- Toutes données dans votre DB

✅ **Pas de sync blockchain complexe**
- Pas d'indexation events
- Pas de gestion wallets externes
- DB = source de vérité unique

✅ **Fair-play garanti**
- Lock NFT pendant compétitions actives
- Impossible de vendre mid-game
- Intégrité fantasy préservée

---

### 2. **UX Simple (Non-Crypto)**

✅ **Utilisateurs ne savent même pas que c'est blockchain**
- Pas besoin de comprendre "wallet", "gas", "blockchain"
- Comme acheter une skin dans un jeu mobile
- Paiement CB classique (via Stripe ou Coinbase Onramp)

✅ **Pas de questions support complexes**
- "Comment connecter MetaMask ?" → N/A
- "Pourquoi mon NFT n'apparaît pas ?" → N/A
- "Comment payer les gas fees ?" → N/A

✅ **Storytelling simple**
- "Cartes de collection digitales"
- "Utilisez vos cartes en fantasy"
- "Échangez dans notre marketplace"
- Mot "NFT" optionnel (ou "cartes blockchain")

---

### 3. **Revenus Optimaux**

```
Scénario avec NFTs bloqués :

Volume mensuel : 10,000 USDC
- 100% sur CyLimit
- Commission 10% = 1,000 USDC/mois

Pas de fuite de volume !
Pas de royalties perdues !
Revenus prévisibles !
```

---

### 4. **Compliance Simplifiée**

✅ **KYC garanti sur chaque transaction**
- Tous users ont compte CyLimit
- KYC vérifié avant achat/vente
- Traçabilité complète

✅ **Pas de risque blanchiment**
- Impossible de vendre à wallet anonyme
- Tous destinataires identifiés
- Conformité AML parfaite

✅ **TVA gérée facilement**
- Toutes transactions passent par votre backend
- Calcul TVA automatique
- Export comptable simplifié

---

## ⚠️ Limitations Assumées

### Ce que vous PERDEZ (volontairement) :

❌ **Pas de crédibilité "Web3 native"**
- Crypto-natifs diront "ce n'est pas un vrai NFT"
- Pas de listings sur Dune Analytics, NFT marketplaces rankings
- Mais vous n'EN VOULEZ PAS !

❌ **Pas d'interopérabilité**
- Users ne peuvent pas prêter NFT à un ami via MetaMask
- Pas de composability DeFi (prêts, staking externe)
- Mais vos users ne savent même pas ce que c'est !

⚠️ **"Propriété limitée" mais récupérable**
- Transfers bloqués TANT QUE CyLimit est actif
- Si CyLimit ferme : possibilité de déverrouiller avant fermeture
- NFTs existent sur blockchain publique = preuve permanente
- Autre plateforme peut reconnaître ownership historique

**Voir section "Exit Strategy & Continuité" ci-dessous pour détails**

**Trade-off acceptable pour votre public cible !**

---

## 🔓 Exit Strategy & Continuité (Important !)

### ✅ Propriété Réelle Malgré Restrictions

**Point crucial : NFTs bloqués ≠ NFTs inexistants**

Même avec les restrictions de transfert, les users possèdent VRAIMENT leurs NFTs :

```
Comparaison :

❌ Base de données classique (ex: FIFA Ultimate Team)
   - Cartes stockées en DB centralisée
   - Si EA ferme : cartes disparaissent à jamais
   - Aucune preuve de possession en dehors du système
   - Propriété = illusion totale

✅ NFTs blockchain (même bloqués)
   - Tokens existent sur Base blockchain publique
   - Ownership enregistré on-chain
   - Si CyLimit ferme : NFTs existent toujours
   - Preuve de possession = permanente
   - Propriété = réelle mais restreinte
```

---

### Scénario : CyLimit Ferme - Que se passe-t-il ?

#### Option 1 : Déverrouillage Avant Fermeture (Recommandé)

**Smart Contract avec fonction d'urgence :**

```solidity
contract CyLimitNFT is ERC721, Ownable {
    bool public restrictedTransfers = true;
    bool public emergencyMode = false; // Exit strategy
    
    function transferFrom(...) override {
        // En mode urgence : transfers libres
        if (emergencyMode) {
            super.transferFrom(...);
            return;
        }
        
        // Sinon : restrictions normales
        if (restrictedTransfers) {
            require(msg.sender == cylimitMarketplace, "CyLimit only");
        }
        super.transferFrom(...);
    }
    
    // Admin active mode urgence avant fermeture
    function activateEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated(block.timestamp);
    }
}
```

**Workflow de fermeture :**

```
1. Mois M-3 : Annonce fermeture CyLimit
   → Communication transparente aux users
   → "Vos NFTs resteront accessibles"

2. Mois M-2 : Migration préparée
   → Guide : "Comment exporter vos NFTs"
   → Support actif pour questions

3. Mois M-1 : Activation emergencyMode
   → Smart Contract : emergencyMode = true
   → NFTs deviennent librement transférables
   → Users peuvent déplacer vers wallets personnels

4. Mois M : Fermeture CyLimit
   → App/Backend arrêtés
   → NFTs toujours sur blockchain (permanents)
   → Users gardent propriété complète
```

**Communication aux users :**
```
Email : "CyLimit ferme ses portes"

Chers fans de cyclisme,

Après X années, nous fermons CyLimit. Mais BONNE NOUVELLE :
vos cartes vous appartiennent vraiment !

Actions à faire :
1. Récupérez vos cartes dans votre wallet Coinbase
2. Vos NFTs restent sur la blockchain (permanents)
3. Vous pouvez les conserver comme souvenirs
4. Ou les vendre sur OpenSea si vous souhaitez

Guide complet : cylimit.com/migration
Support : support@cylimit.com

Merci pour votre fidélité !
L'équipe CyLimit
```

---

#### Option 2 : Reconnaissance par Autre Plateforme

**Scénario : Concurrent/Successeur reconnaît vos NFTs**

**Exemple : "NewCyclingApp" reprend après CyLimit**

```typescript
// NewCyclingApp backend
async function recognizeCyLimitNFTs(userWalletAddress: string) {
  // 1. Scanner blockchain Base pour NFTs CyLimit
  const cyLimitContract = "0xCyLimitNFTAddress";
  const nfts = await scanWalletForNFTs(userWalletAddress, cyLimitContract);
  
  // 2. Vérifier ownership historique
  const ownedNFTs = nfts.filter(nft => 
    nft.currentOwner === userWalletAddress
  );
  
  // 3. Créer équivalents dans nouveau système
  for (const nft of ownedNFTs) {
    const metadata = await fetchNFTMetadata(nft.tokenId);
    
    // Option A : Airdrop nouveaux NFTs équivalents
    await mintEquivalentNFT({
      to: userWalletAddress,
      rarity: metadata.rarity,
      rider: metadata.rider,
      year: metadata.year,
      note: `Migré depuis CyLimit #${nft.tokenId}`
    });
    
    // Option B : Système de reconnaissance
    await createMigrationRecord({
      userId: user.id,
      originalContract: cyLimitContract,
      originalTokenId: nft.tokenId,
      recognized: true,
      bonus: "10% discount sur premiers achats" // Goodwill
    });
  }
  
  return {
    recognizedNFTs: ownedNFTs.length,
    bonusApplied: true,
    message: "Bienvenue ancien fan CyLimit !"
  };
}
```

**Flow User :**

```
1. User possède 5 NFTs CyLimit
   → Wallet : 0xABC123...
   → NFTs : tokenId [12, 45, 78, 156, 234]

2. CyLimit ferme

3. User découvre "NewCyclingApp"
   → S'inscrit avec son wallet Coinbase

4. NewCyclingApp détecte NFTs CyLimit
   → "Nous avons détecté 5 cartes CyLimit !"
   → "Voulez-vous les migrer ?"

5. User accepte
   → NewCyclingApp airdrop 5 NFTs équivalents
   → Ou : active bonus fidélité
   → Ou : permet d'utiliser originaux en fantasy

6. User continue avec ses cartes
   → Continuité de sa collection
   → Historique préservé
```

---

#### Option 3 : Preuve de Possession pour Collectionneurs

**Même sans migration active, NFTs = preuve permanente**

**Use Case : Collection historique**

```
Scénario 2030 :

User : "J'étais early adopter CyLimit en 2025"

Preuve blockchain :
- Wallet : 0xABC123...
- NFT CyLimit #12 (Pogačar Legendary)
- Mint date : 15 Jan 2025
- Prix payé : 50 USDC
- Transactions : 3 (achat, vente, rachat)

→ NFT = preuve digitale permanente
→ Comme un ticket de concert vintage
→ Valeur sentimentale + historique

User peut :
- Garder comme souvenir digital
- Vendre sur OpenSea (si déverrouillé)
- Prouver ancienneté dans communauté cyclisme
- Utiliser pour accès à événements futurs
```

**Exemple : Autre plateforme cyclisme**

```
"CyclingDAO" (futur) :

"Prouvez que vous étiez fan avant 2026 !"

Vérification :
- Possédez-vous un NFT CyLimit ?
- Date de mint < 2026 ?
→ OUI : Access VIP gratuit à vie
→ NON : Abonnement payant

Code :
const hasCyLimitNFT = await checkNFTOwnership(
  userWallet,
  "0xCyLimitContract",
  { mintedBefore: "2026-01-01" }
);

if (hasCyLimitNFT) {
  grantVIPAccess(user);
}
```

---

### Comparaison avec Concurrents

#### Sorare (Modèle Ouvert)

```
✅ Avantage :
- NFTs libres dès le début
- Si Sorare ferme : NFTs utilisables ailleurs immédiatement

❌ Inconvénient :
- Complexité énorme maintenant
- Sync DB/blockchain continu
- Support client Web3
```

#### NBA Top Shot (Modèle Fermé comme vous)

```
⚠️ Risque :
- NFTs sur Flow blockchain
- Si Dapper Labs ferme : ?
- Pas de plan exit public

Amélioration CyLimit :
✅ emergencyMode dans contract
✅ Plan exit documenté
✅ Communication transparente
```

---

### Recommandations Exit Strategy

#### 1. **Fonction Emergency Mode (OBLIGATOIRE)**

Ajouter dans Smart Contract :

```solidity
bool public emergencyMode = false;

function activateEmergencyMode() external onlyOwner {
    emergencyMode = true;
    restrictedTransfers = false;
    emit EmergencyModeActivated(block.timestamp);
}
```

**Pourquoi :**
- ✅ Sécurité juridique (vous ne "séquestrez" pas les NFTs)
- ✅ Éthique (users gardent propriété réelle)
- ✅ Marketing ("vos NFTs sont vraiment à vous")

---

#### 2. **Documentation Exit Plan**

Créer document public :

```
"Que se passe-t-il si CyLimit ferme ?"

1. Nous activerons le mode urgence (emergencyMode)
2. Vos NFTs deviendront librement transférables
3. Vous pourrez les déplacer vers n'importe quel wallet
4. Ils resteront sur la blockchain Base (permanents)
5. Vous gardez propriété complète

Engagement : 
- Préavis minimum : 3 mois
- Support actif : 6 mois post-fermeture
- Documentation migration complète
```

**Héberger sur :**
- Site CyLimit : /exit-strategy
- GitHub : public repo
- IPFS : version permanente

**Effet marketing :**
- ✅ Différenciation vs concurrents
- ✅ Trust augmenté
- ✅ Argument de vente : "propriété réelle"

---

#### 3. **Multisig Owner**

Smart Contract owner = multisig wallet :

```
Owner = 3/5 multisig
- Fondateur 1
- Fondateur 2  
- Conseiller juridique
- Investisseur clé
- Community representative

Raison :
- Sécurité (pas de single point of failure)
- Décentralisation partielle
- Confiance communauté
```

---

#### 4. **Timelock Emergency Mode**

Protection supplémentaire :

```solidity
uint256 public emergencyModeDelay = 7 days;
uint256 public emergencyModeRequestedAt;

function requestEmergencyMode() external onlyOwner {
    emergencyModeRequestedAt = block.timestamp;
    emit EmergencyModeRequested(block.timestamp);
}

function activateEmergencyMode() external onlyOwner {
    require(
        emergencyModeRequestedAt > 0,
        "Must request first"
    );
    require(
        block.timestamp >= emergencyModeRequestedAt + emergencyModeDelay,
        "Must wait 7 days"
    );
    
    emergencyMode = true;
    emit EmergencyModeActivated(block.timestamp);
}
```

**Avantages :**
- ✅ Users ont 7 jours pour réagir
- ✅ Transparence totale (event blockchain)
- ✅ Protection contre hack owner

---

### 🎯 Résumé Exit Strategy

| Scénario | Solution | Résultat User |
|----------|----------|---------------|
| **CyLimit ferme volontairement** | Activation emergencyMode | NFTs déverrouillés, transférables partout |
| **Concurrent reprend** | Reconnaissance NFTs CyLimit | Migration vers nouveau système |
| **Aucune reprise** | NFTs restent on-chain | Preuve de possession permanente |
| **Collection historique** | Metadata sur IPFS | Souvenirs digitaux + preuve ancienneté |

**Message clé : Vos NFTs sont VRAIMENT à vous, blockchain = preuve permanente**

---

## 🎯 Comparaison avec Concurrents

### Sorare (Votre Concurrent Direct)

**Sorare 2024 :**
- NFTs sur Ethereum (ouvert)
- Vendables sur OpenSea, Blur, etc.
- Interopérabilité complète
- Public : mix crypto + sport

**Mais :**
- ⚠️ Complexité support énorme
- ⚠️ Sync DB/blockchain complexe
- ⚠️ Users perdent NFTs, bugs, etc.
- ⚠️ Régulation complexe (Pays-Bas les a bannis)

---

### NBA Top Shot (Modèle Fermé)

**NBA Top Shot (Dapper Labs) :**
- NFTs sur Flow blockchain
- **BLOQUÉS : uniquement vendables sur leur marketplace**
- Public : fans de basket (non-crypto)
- UX ultra-simple

**Résultat :**
- ✅ Des millions d'utilisateurs non-crypto
- ✅ Revenus massifs (peak 200M$/mois)
- ✅ Pas de complexité Web3
- ⚠️ Baisse post-hype (mais modèle validé)

**C'est EXACTEMENT votre modèle ! 🎯**

---

## 📋 Architecture Technique Finale

### Stack Recommandée

```
┌─────────────────────────────────────────────┐
│         FRONTEND (Next.js)                  │
│  - Coinbase Embedded Wallet (invisible)     │
│  - UI : "Mes Cartes", "Marketplace"         │
│  - Paiement : CB via Coinbase Onramp        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         BACKEND (NestJS)                    │
│  - API REST classique                       │
│  - MongoDB (source de vérité)               │
│  - Coinbase Server Wallet (mint, transfer)  │
│  - Service TVA (3 sources)                  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      BLOCKCHAIN (Base L2)                   │
│  - Smart Contract NFT (whitelist)           │
│  - Smart Contract Marketplace               │
│  - Transactions on-chain (traçabilité)      │
└─────────────────────────────────────────────┘
```

---

### Flux Utilisateur Type

```
1. INSCRIPTION
   User → Email + Password → Compte créé
   Backend → Coinbase Embedded Wallet créé (transparent)
   DB → { userId, email, walletAddress }

2. ACHAT NFT (Marché Primaire)
   User → Clique "Acheter Pogačar - 50€"
   Frontend → Widget Coinbase Onramp
   User → Entre CB, paie 60€ TTC (50€ + 10€ TVA)
   Coinbase → Convertit 60€ → ~57 USDC → wallet user
   Backend → Détecte dépôt USDC
   Backend → Appelle Smart Contract : mint(userAddress, tokenId)
   Blockchain → NFT mint, owner = userAddress
   DB → { tokenId, ownerId: userId, price: 50, createdAt }
   Frontend → "Félicitations ! Vous possédez Pogačar"

3. UTILISATION FANTASY
   User → Crée équipe pour Tour de France
   User → Ajoute Pogačar dans son équipe
   Backend → Lock NFT jusqu'à fin TDF
   Blockchain → lockUntil[tokenId] = TDF_END_DATE
   DB → { teamId, nftIds: [tokenId_pogacar], locked: true }

4. VENTE (Marché Secondaire)
   User → Clique "Vendre Pogačar - 80 USDC"
   Backend → Vérifie unlocked
   Frontend → Confirm
   Backend → Appelle Smart Contract : listNFT(tokenId, 80)
   Blockchain → NFT transféré à marketplace contract
   DB → { listingId, tokenId, sellerId, price: 80, active: true }
   
5. ACHAT (Autre User)
   UserB → Clique "Acheter Pogačar - 80 USDC"
   Backend → Vérifie solde UserB >= 80 USDC
   Backend → Appelle Smart Contract : buyNFT(listingId)
   Blockchain → USDC : UserB → UserA (72 USDC) + CyLimit (8 USDC)
   Blockchain → NFT : marketplace → UserB
   DB → { tokenId, ownerId: userB_id, previousOwnerId: userA_id }
   Frontend → "Pogačar est maintenant dans votre collection"

6. RETRAIT FONDS
   User → Clique "Retirer 100€ vers ma banque"
   Frontend → Widget Coinbase Offramp
   User → Entre IBAN
   Coinbase → KYC check (si > 1000€)
   Coinbase → Convertit USDC → EUR → virement SEPA
   User → Reçoit 100€ sous 1-3 jours
```

---

### Base de Données (MongoDB)

```typescript
// Schema User
interface User {
  _id: ObjectId;
  email: string;
  password: string; // hashed
  walletAddress: string; // Coinbase Embedded Wallet
  walletCreatedAt: Date;
  kycStatus: 'none' | 'pending' | 'verified';
  usdcBalance: number; // cache, sync avec blockchain
  createdAt: Date;
}

// Schema NFT
interface NFT {
  _id: ObjectId;
  tokenId: number; // On-chain token ID
  riderId: ObjectId; // Reference to Rider
  rarity: 'legendary' | 'rare' | 'common';
  yearOfEdition: number;
  serialNumber: number;
  
  // Ownership
  ownerId: ObjectId; // Current owner (source de vérité)
  ownerAddress: string; // Wallet address (sync avec blockchain)
  
  // Marketplace
  listedForSale: boolean;
  listingPrice?: number;
  
  // Lock
  lockedUntil?: Date;
  lockedReason?: string; // "competition", "transfer_pending"
  
  // History
  mintedAt: Date;
  mintTransactionHash: string;
  lastTransferAt?: Date;
  lastTransferHash?: string;
  
  // Metadata
  metadataURI: string; // ipfs://...
}

// Schema Listing
interface Listing {
  _id: ObjectId;
  tokenId: number;
  nftId: ObjectId;
  sellerId: ObjectId;
  sellerAddress: string;
  price: number; // USDC
  active: boolean;
  createdAt: Date;
  soldAt?: Date;
  buyerId?: ObjectId;
  transactionHash?: string;
}

// Schema Transaction (TVA)
interface Transaction {
  _id: ObjectId;
  type: 'purchase' | 'sale';
  nftId: ObjectId;
  buyerId: ObjectId;
  sellerId?: ObjectId; // null si marché primaire
  
  // Prix
  priceHT: number;
  vatRate: number;
  vatAmount: number;
  priceTTC: number;
  
  // TVA Compliance
  country: string;
  vatSources: {
    ip: string;
    card_bin: string;
    coinbase_user: string;
  };
  
  // Blockchain
  transactionHash: string;
  blockNumber: number;
  
  createdAt: Date;
}
```

---

## 💰 Modèle Économique

### Revenus

```
Sources de revenus :

1. Ventes Marché Primaire (CyLimit vend)
   - Prix HT : 100%
   - Coût mint/transfer : ~$0.02
   - Marge : ~99.98%

2. Ventes Marché Secondaire (User → User)
   - Commission : 10%
   - Dont : 7.5% "royalties" + 2.5% fees
   - 100% garanti (pas optionnel)

3. Packs & Bundles
   - Pack 3 cartes : Prix premium
   - Bundle Edition Limitée : Prix collector

4. Abonnements Premium (optionnel futur)
   - Marketplace fees réduits (5% au lieu de 10%)
   - Accès early à nouveaux drops
   - Staking NFT avec APY
```

### Coûts

```
Coûts mensuels (1000 users actifs) :

Infrastructure :
- Coinbase CDP : $150/mois
- IPFS Pinata : $50/mois
- MaxMind GeoIP : $50/mois
- Gas fees Base : $50/mois (si sponsorisé)
TOTAL : $300/mois

One-Time :
- Audit Smart Contracts : 5,000-10,000€
- Migration NFTs (si existants) : 3,000€
TOTAL : 8,000-13,000€

Break-even :
- Volume nécessaire : ~3,000 USDC/mois (commission 10%)
- Soit ~60 NFTs à 50 USDC vendus/mois
- Très atteignable !
```

---

## 🚀 Plan d'Implémentation (8 semaines)

### Phase 1 : Setup (Semaine 1-2)

**Actions :**
1. Créer compte Coinbase Developer Platform
2. Obtenir API keys (Embedded + Server Wallet)
3. Développer Smart Contracts :
   - CyLimitNFT.sol (whitelist)
   - CyLimitMarketplace.sol
4. Déployer sur Base Sepolia testnet
5. Setup IPFS (Pinata) pour metadata
6. Tests unitaires Smart Contracts

**Livrables :**
- ✅ Contracts déployés testnet
- ✅ Tests passants
- ✅ Documentation technique

---

### Phase 2 : Backend (Semaine 3-4)

**Actions :**
1. Intégrer Coinbase Server Wallet SDK
2. Service Wallet :
   - Créer Embedded Wallet user
   - Mint NFT
   - Transfer NFT
   - Lock/Unlock NFT
3. Service TVA (3 sources)
4. Service Marketplace :
   - List NFT
   - Buy NFT
   - Cancel listing
5. Webhooks Coinbase (dépôts USDC)
6. Migration schéma MongoDB

**Livrables :**
- ✅ API REST complète
- ✅ Tests intégration
- ✅ DB migrée

---

### Phase 3 : Frontend (Semaine 5-6)

**Actions :**
1. Intégrer Coinbase Embedded Wallet SDK
2. Pages :
   - Wallet (solde USDC, historique)
   - Ma Collection (grid NFTs)
   - Marketplace (browse, search, filter)
   - Détail NFT (view, sell)
3. Widgets :
   - Coinbase Onramp (dépôt)
   - Coinbase Offramp (retrait)
4. UX "non-crypto" (cacher jargon Web3)

**Livrables :**
- ✅ UI complète
- ✅ Tests E2E
- ✅ UX validation

---

### Phase 4 : Beta & Production (Semaine 7-8)

**Actions :**
1. Déployer Smart Contracts Base Mainnet
2. Audit sécurité (OpenZeppelin ou similaire)
3. Tests beta avec 10-20 users réels
4. Monitoring :
   - Transactions réussies/échouées
   - Coûts gas réels
   - TVA par pays
5. Documentation utilisateurs
6. Support client setup
7. Lancement production progressif

**Livrables :**
- ✅ Production déployée
- ✅ Beta testée
- ✅ Monitoring actif
- ✅ Support prêt

---

## ✅ Checklist Technique

### Smart Contracts
- [ ] CyLimitNFT.sol (whitelist transfers)
- [ ] CyLimitMarketplace.sol (buy/sell)
- [ ] Tests unitaires (>90% coverage)
- [ ] Audit sécurité (OpenZeppelin)
- [ ] Deploy Base testnet
- [ ] Deploy Base mainnet

### Backend
- [ ] Service Coinbase Server Wallet
- [ ] Service TVA (3 sources)
- [ ] Service Marketplace
- [ ] Webhooks Coinbase
- [ ] Indexation events blockchain (minimal)
- [ ] Lock/Unlock NFT pendant compétitions
- [ ] API REST complète
- [ ] Tests intégration

### Frontend
- [ ] Coinbase Embedded Wallet SDK
- [ ] Page Wallet (balance USDC)
- [ ] Page Ma Collection
- [ ] Page Marketplace
- [ ] Page Détail NFT
- [ ] Widget Onramp (dépôt CB)
- [ ] Widget Offramp (retrait IBAN)
- [ ] UX "cartes digitales" (pas "NFTs crypto")

### Database
- [ ] Schema User (avec walletAddress)
- [ ] Schema NFT (avec ownership on/off-chain)
- [ ] Schema Listing
- [ ] Schema Transaction (TVA compliance)
- [ ] Indexes optimisés
- [ ] Migration existant (si applicable)

### DevOps
- [ ] Monitoring Sentry
- [ ] Logs Datadog/LogRocket
- [ ] Alertes (failed transactions, low balance, etc.)
- [ ] Backup DB quotidien
- [ ] CI/CD GitHub Actions

### Legal & Compliance
- [ ] CGU/CGV mis à jour (mention blockchain)
- [ ] Politique confidentialité (données wallet)
- [ ] TVA setup (déclaration par pays)
- [ ] KYC process (via Coinbase)

---

## 🎯 KPIs à Suivre

### Adoption
- Nouveaux wallets créés / jour
- Taux conversion : signup → 1er dépôt
- Taux conversion : dépôt → 1er achat NFT

### Engagement
- Nombre transactions / user / mois
- Valeur moyenne transaction
- Taux rétention 30 jours

### Revenus
- Volume ventes marché primaire
- Volume ventes marché secondaire
- Commission totale collectée
- Royalties collectées (marché secondaire)

### Technique
- Taux succès transactions blockchain
- Temps moyen transaction
- Coût gas moyen
- Coût gas sponsorisé / mois

### Support
- Tickets support / semaine
- Temps résolution moyen
- Satisfaction client (NPS)

---

## 📚 Ressources

### Documentation
- Coinbase Developer Platform : https://portal.cdp.coinbase.com/
- Base L2 : https://docs.base.org/
- OpenZeppelin Contracts : https://docs.openzeppelin.com/contracts/

### Audit Smart Contracts
- OpenZeppelin : https://openzeppelin.com/security-audits/
- Trail of Bits : https://www.trailofbits.com/
- Consensys Diligence : https://consensys.io/diligence/

### Tools
- Hardhat : https://hardhat.org/ (dev Smart Contracts)
- Foundry : https://book.getfoundry.sh/ (testing)
- Pinata : https://www.pinata.cloud/ (IPFS)
- MaxMind : https://www.maxmind.com/ (GeoIP TVA)

---

## ❓ FAQ

### Q : "Les users verront quand même leurs NFTs dans MetaMask ?"

**R : OUI**, mais c'est une BONNE chose :
- ✅ Preuve de propriété réelle (pas juste pixels dans une app)
- ✅ Sécurité perçue augmentée ("c'est vraiment à moi")
- ✅ Possibilité de déplacer vers hardware wallet (Ledger) pour sécurité ultime
- ⚠️ Mais ils ne pourront PAS les transférer (message erreur blockchain)

**Communication :** "Vos cartes sont stockées sur la blockchain pour une sécurité maximale"

---

### Q : "Et si je veux ouvrir plus tard ?"

**R : Impossible de déverrouiller** sans redéployer un nouveau contract.

**Solutions :**
1. **Migrer vers nouveau contract** (complexe, cher)
2. **Assumer le choix** : le modèle fermé est votre ADN

**Recommandation :** Assumer et communiquer clairement dès le début :
- "Marketplace CyLimit uniquement"
- "Contrôle et sécurité garantis"
- "Pas de risque de perte sur plateformes tierces"

---

### Q : "Quid de la régulation (MICA, MiCA) ?"

**R : Modèle fermé = MOINS de risques réglementaires** :
- ✅ Vous contrôlez tous les participants (KYC)
- ✅ Pas de ventes anonymes peer-to-peer
- ✅ Traçabilité complète
- ✅ Conformité AML/KYC garantie

**Comparé à modèle ouvert :**
- ⚠️ Ventes sur OpenSea = potentiellement à wallets anonymes
- ⚠️ Risque blanchiment
- ⚠️ Régulation plus stricte (voir Sorare banni aux Pays-Bas)

---

### Q : "Pourquoi utiliser blockchain si c'est fermé ?"

**R : Avantages réels malgré modèle fermé** :

1. **Preuve de propriété inaltérable**
   - Impossible pour CyLimit de "reprendre" un NFT
   - Historique transparent
   - Confiance augmentée

2. **Sécurité infrastructure**
   - Clés privées gérées par Coinbase (HSM)
   - Pas de risque hack base de données = perte ownership
   - Backup automatique (blockchain publique)

3. **Audit trail parfait**
   - Toutes transactions on-chain
   - Traçabilité comptable
   - Compliance facilitée

4. **Évolutivité future**
   - Si changement stratégie : code déjà prêt
   - Possibilité d'ajouter features (staking, prêts, etc.)
   - Standard ERC-721 = compatible écosystème

5. **Marketing & crédibilité**
   - "Basé sur blockchain Base (Coinbase)"
   - Technologie moderne
   - Différenciation vs Sorare/concurrents

---

## 🎯 Conclusion

### ✅ DÉCISION FINALE : NFTs Bloqués (Marketplace CyLimit uniquement)

**Justification :**
1. ✅ Public cible : fans de vélo (pas crypto)
2. ✅ Contrôle total : 100% transactions sur CyLimit
3. ✅ Pas de complexité : DB = source de vérité unique
4. ✅ Revenus optimaux : 10% garantis, pas de fuite
5. ✅ Fair-play : lock pendant compétitions
6. ✅ Compliance : KYC/AML facilité
7. ✅ Support : pas de questions Web3 complexes

**Trade-offs assumés :**
- ❌ Pas de crypto-natifs (vous n'en voulez pas)
- ❌ Pas d'interopérabilité (vos users s'en fichent)
- ❌ "Propriété limitée" (comme tous les jeux mobiles)

**Modèle validé :** NBA Top Shot, Nike RTFKT, Gods Unchained (pour assets in-game)

**Budget :** 8-13k€ one-time + $300/mois  
**Timeline :** 8 semaines  
**ROI :** Break-even à 60 NFTs vendus/mois (~3k USDC volume)

---

**Prêt à commencer l'implémentation ? 🚀**

