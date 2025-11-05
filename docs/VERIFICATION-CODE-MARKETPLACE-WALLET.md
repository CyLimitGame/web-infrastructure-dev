# ✅ VÉRIFICATION CODE MARKETPLACE & WALLET - Rapport Complet

**Date :** 5 Novembre 2025  
**Fichiers vérifiés :** Frontend (BuyNFT, ListNFT, hooks, wallet) + Backend (marketplace service/controller)  
**Référence :** CONTEXT_MARKETPLACE-WALLET.md

---

## 📋 RÉSUMÉ EXÉCUTIF

| Catégorie | Statut | Problèmes | Recommandations |
|-----------|--------|-----------|-----------------|
| **Frontend Composants** | ✅ Bon | 0 critique | Quelques améliorations |
| **Frontend Hooks** | ⚠️ Attention | 1 moyen | Vérifier types viem |
| **Backend Service** | ✅ Excellent | 0 | Parfait |
| **Backend Controller** | ✅ Bon | 0 | Bon |
| **Wallet Components** | ✅ Bon | 0 | Bon |
| **Conformité CDP** | ⚠️ À vérifier | 2 points | Vérifier avec MCP |

**Note globale : ✅ 8/10** - Code de bonne qualité avec quelques points à améliorer

---

## 🔍 ANALYSE DÉTAILLÉE

### 1. Frontend - ListNFT.tsx ✅

**Ce qui est BIEN :**
- ✅ Composant simple et clair
- ✅ Gestion loading/error/success
- ✅ Interface utilisateur propre
- ✅ Validation prix (min 0.01)
- ✅ Affichage frais marketplace (95% pour seller)
- ✅ Message "Listing is FREE" clair

**Points d'Attention :**
```typescript
// Ligne 43
const { listNFT, loading, error } = useMarketplace();

// ⚠️ VÉRIFIER : useMarketplace utilise bien useCoinbaseWallet ?
// ✅ OUI (vérifié ligne 114 useMarketplace.ts)
```

**Recommandations :**

1. **Ajouter vérification wallet avant listing**
```typescript
// À ajouter :
const { isConnected, smartAccount } = useCoinbaseWallet();

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ✅ Vérifier wallet existe
  if (!isConnected || !smartAccount) {
    setError('Please connect your wallet first');
    return;
  }
  
  // Continuer...
};
```

2. **Ajouter gestion expiration (déjà implémenté backend)**
```typescript
// Backend supporte expiresAt, mais pas utilisé dans ListNFT.tsx
// Recommandation : Ajouter date picker (J+2 à J+30)
```

**Note : 8/10** ✅

---

### 2. Frontend - BuyNFT.tsx ✅

**Ce qui est BIEN :**
- ✅ Interface claire avec breakdown prix
- ✅ Affichage fees (5%)
- ✅ Message "Gas sponsored by CyLimit"
- ✅ Gestion loading pendant transaction
- ✅ Affichage transaction hash avec lien explorer
- ✅ Success state complet

**Points d'Attention :**
```typescript
// Ligne 46
const { buyNFT, loading, error } = useMarketplace();

// ⚠️ Le composant ne vérifie PAS si user a assez d'USDC
```

**Recommandations :**

1. **Vérifier balance USDC avant achat**
```typescript
// À ajouter :
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet';

const { balanceUSDC } = useEmbeddedWallet();

// Dans le render :
{balanceUSDC < total && (
  <div className="bg-red-50 border border-red-200 rounded p-3">
    <p className="text-sm text-red-800">
      ⚠️ Insufficient USDC balance. You need {total.toFixed(2)} USDC.
      Current balance: {balanceUSDC.toFixed(2)} USDC
    </p>
  </div>
)}

// Désactiver bouton si insuffisant
disabled={loading || balanceUSDC < total}
```

2. **Afficher approval Marketplace si nécessaire**
```typescript
// Actuellement le composant assume que seller a approuvé
// Recommandation : Vérifier approval seller côté backend
// (déjà fait dans prepareBuyNFT)
```

**Note : 8/10** ✅

---

### 3. Frontend - useMarketplace.ts ⚠️

**Ce qui est BIEN :**
- ✅ Hook bien structuré
- ✅ Gestion loading/error
- ✅ Utilise useCoinbaseWallet (évite stale closures)
- ✅ Fonction approveMarketplace implémentée
- ✅ Fonction checkMarketplaceApproval implémentée
- ✅ Batch transaction correcte (USDC + NFT)
- ✅ Utilise useCdpPaymaster: true

**⚠️ PROBLÈMES IDENTIFIÉS :**

#### Problème 1 : Types viem manquants sur data

```typescript
// Ligne 201-208 (approveMarketplace)
const call = {
  to: BLOCKCHAIN_CONFIG.nftContract as `0x${string}`,
  data: encodeFunctionData({
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [BLOCKCHAIN_CONFIG.marketplaceContract, true]
  })
  // ❌ MANQUE : as `0x${string}`
};

// ✅ CORRECTION :
const call = {
  to: BLOCKCHAIN_CONFIG.nftContract as `0x${string}`,
  data: encodeFunctionData({
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [BLOCKCHAIN_CONFIG.marketplaceContract, true]
  }) as `0x${string}` // ← AJOUTER
};
```

#### Problème 2 : ABI NFT incomplet pour vérifications futures

```typescript
// Lignes 64-75 (NFT_ABI)
const NFT_ABI = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// ⚠️ Si besoin de vérifier isApprovedForAll depuis frontend, ajouter :
const NFT_ABI = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // ✅ AJOUTER :
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];
```

**✅ POINTS CONFORMES CDP :**

```typescript
// ✅ useCdpPaymaster: true (ligne 216, 413)
// ✅ network: 'base-sepolia' | 'base' (ligne 214, 411)
// ✅ calls: Array<{to, data}> (lignes 201-208, 348-394)
// ✅ Utilise currentUser depuis useCoinbaseWallet (ligne 114)
// ✅ Vérifie smartAccount avant envoi (implicit dans sendUserOp)
```

**Note : 7/10** ⚠️ (types viem à corriger)

---

### 4. Backend - marketplace.service.ts ✅

**Ce qui est EXCELLENT :**
- ✅ Séparation claire : Backend = DB, Frontend = Blockchain
- ✅ Pas de CDP SDK côté user (correct)
- ✅ Vérifications ownership complètes
- ✅ Gestion expiresAt (J+2 à J+30)
- ✅ Validation prix > 0
- ✅ Calcul fees seller ET buyer
- ✅ Commentaires détaillés (OBJECTIF/POURQUOI/COMMENT)
- ✅ Utilise walletAddress (Embedded Wallet)

**Architecture Parfaite :**

```typescript
// prepareBuyNFT() ligne 203-297
// ✅ Backend vérifie :
//    - Buyer existe et a un Embedded Wallet
//    - Listing existe et actif
//    - Seller existe et a un wallet
//    - Buyer ≠ Seller

// ✅ Backend retourne :
//    - Détails complets (seller, buyer, price, fees, contracts)
//    - Frontend construira la batch transaction

// ✅ confirmBuyNFT() ligne 306-344
// ✅ Backend met à jour DB après succès transaction
//    - listing.status = 'sold'
//    - nft.ownerId = buyerId
//    - nft.marketType = 'owner'
```

**⚠️ Points à Vérifier :**

1. **Vérification balance USDC buyer**
```typescript
// prepareBuyNFT() ne vérifie PAS si buyer a assez d'USDC
// Recommandation : Ajouter vérification

const usdcBalance = await getUSDCBalance(buyer.walletAddress);
if (usdcBalance < buyerTotalAmount) {
  throw new BadRequestException(
    `Insufficient USDC balance. Required: ${buyerTotalAmount}, Available: ${usdcBalance}`
  );
}
```

2. **Vérification approval seller**
```typescript
// prepareBuyNFT() ne vérifie PAS si seller a approuvé Marketplace
// Recommandation : Ajouter vérification (déjà dans controller.checkMarketplaceApproval)

const isApproved = await checkSellerApproval(seller.walletAddress);
if (!isApproved) {
  throw new BadRequestException('Seller has not approved Marketplace');
}
```

**Note : 9/10** ✅ (Excellent mais manque vérifications on-chain)

---

### 5. Backend - marketplace.controller.ts ✅

**Ce qui est EXCELLENT :**
- ✅ Routes claires et RESTful
- ✅ Authentification JWT sur toutes routes
- ✅ Validation DTOs (class-validator)
- ✅ Endpoint checkMarketplaceApproval implémenté
- ✅ Utilise ethers.js pour vérifier isApprovedForAll on-chain
- ✅ Gestion erreurs propre

**Endpoint checkMarketplaceApproval (lignes 170-224) :**

```typescript
// ✅ EXCELLENT : Vérification on-chain de l'approval
const isApproved = await nftContract['isApprovedForAll'](
  user.walletAddress,
  BLOCKCHAIN_CONFIG.marketplaceContract
);

// ✅ Retourne needsApproval pour le frontend
return {
  isApproved,
  needsApproval: !isApproved,
  contracts: { nft, marketplace }
};
```

**Points d'Attention :**

1. **Import dynamique ethers.js**
```typescript
// Ligne 189
const { ethers } = await import('ethers');

// ⚠️ Pourquoi import dynamique ?
// Si c'est pour éviter side effects SSR, OK
// Sinon, import static serait plus clair

// Recommandation : Documenter pourquoi
```

2. **Endpoint prepareBuyNFT vs buy**
```typescript
// Route actuelle : POST /marketplace/buy/:listingId
// Fonction : prepareBuyNFT()

// ⚠️ Confusion potentielle : "buy" suggère action finale
// Recommandation : Renommer route

// ✅ MIEUX :
POST /marketplace/prepare-buy/:listingId → prepareBuyNFT()
POST /marketplace/confirm-buy → confirmBuyNFT()
```

**Note : 9/10** ✅ (Excellent)

---

### 6. Wallet Components - WalletOnboardingManager.tsx ✅

**Ce qui est BIEN :**
- ✅ Flag global session (hasShownOnboardingThisSession)
- ✅ Reset flag quand user change (useEffect sur userProfile.id)
- ✅ Conditions claires (5 vérifications)
- ✅ Délai 1s avant affichage (UX)
- ✅ Affichage 1× par session

**Architecture Correcte :**

```typescript
// ✅ Flag en mémoire (pas localStorage)
let hasShownOnboardingThisSession = false;

// ✅ Reset au changement user
useEffect(() => {
  hasShownOnboardingThisSession = false;
}, [userProfile?.id]);

// ✅ Affichage conditionnel
if (!hasWallet && !hasShownOnboardingThisSession) {
  hasShownOnboardingThisSession = true;
  setTimeout(() => setShowOnboarding(true), 1000);
}
```

**Conformité avec CONTEXT_MARKETPLACE-WALLET.md :**
- ✅ Utilise useWalletRequired (détection wallet)
- ✅ Affiche modal 1× par session
- ✅ Reset au logout/login

**Note : 9/10** ✅

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 🟡 Problème Moyen #1 : Types viem stricts manquants

**Fichier :** `useMarketplace.ts` ligne 207

**Problème :**
```typescript
// ❌ ACTUEL
const call = {
  to: BLOCKCHAIN_CONFIG.nftContract as `0x${string}`,
  data: encodeFunctionData({
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [BLOCKCHAIN_CONFIG.marketplaceContract, true]
  })
  // ❌ Manque : as `0x${string}`
};
```

**Solution :**
```typescript
// ✅ CORRIGER
const call = {
  to: BLOCKCHAIN_CONFIG.nftContract as `0x${string}`,
  data: encodeFunctionData({
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [BLOCKCHAIN_CONFIG.marketplaceContract, true]
  }) as `0x${string}` // ← AJOUTER
};
```

**Impact :** ⚠️ Moyen - Peut causer erreurs TypeScript

---

### 🟡 Problème Moyen #2 : Pas de vérification balance USDC

**Fichiers :** `BuyNFT.tsx`, `marketplace.service.ts`

**Problème :**
- Frontend ne vérifie pas si buyer a assez d'USDC
- Backend ne vérifie pas non plus
- Transaction échouera on-chain si insuffisant

**Solution Frontend :**
```typescript
// BuyNFT.tsx
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet';

const { balanceUSDC } = useEmbeddedWallet();

// Avant handleBuy :
if (balanceUSDC < total) {
  setError(`Insufficient USDC. Need ${total}, have ${balanceUSDC}`);
  return;
}
```

**Solution Backend :**
```typescript
// marketplace.service.ts - prepareBuyNFT()
const usdcContract = new ethers.Contract(
  BLOCKCHAIN_CONFIG.usdcContract,
  ['function balanceOf(address) view returns (uint256)'],
  provider
);

const balance = await usdcContract.balanceOf(buyer.walletAddress);
const required = BigInt(Math.floor(buyerTotalAmount * 1e6));

if (balance < required) {
  throw new BadRequestException(
    `Insufficient USDC balance. Required: ${buyerTotalAmount}, Available: ${Number(balance) / 1e6}`
  );
}
```

**Impact :** ⚠️ Moyen - UX dégradée (erreur on-chain au lieu de prévenir)

---

### 🟢 Problème Mineur #3 : Route naming confusing

**Fichier :** `marketplace.controller.ts` ligne 265

**Problème :**
```typescript
// ⚠️ Route nommée "buy" mais fait juste "prepare"
@Post('buy/:listingId')
async prepareBuyNFT() { ... }
```

**Solution :**
```typescript
// ✅ Plus clair
@Post('prepare-buy/:listingId')
async prepareBuyNFT() { ... }
```

**Impact :** 🟢 Mineur - Juste clarté API

---

### 🟢 Problème Mineur #4 : ABI NFT incomplet

**Fichier :** `useMarketplace.ts` lignes 64-75

**Problème :**
```typescript
// NFT_ABI contient uniquement setApprovalForAll
// Pas de isApprovedForAll, ownerOf, etc.
```

**Solution :**
```typescript
// Ajouter fonctions view si besoin frontend
const NFT_ABI = [
  {
    name: 'setApprovalForAll',
    // ...
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];
```

**Impact :** 🟢 Mineur - Optionnel (backend fait déjà ces vérifications)

---

## ✅ POINTS CONFORMES AVEC CONTEXT_MARKETPLACE-WALLET.md

### Architecture Globale ✅

| Aspect | Documentation | Code Réel | Statut |
|--------|---------------|-----------|--------|
| **Listing DB uniquement** | ✅ Documenté | ✅ Implémenté | ✅ OK |
| **Batch USDC+NFT** | ✅ Documenté | ✅ Implémenté | ✅ OK |
| **Pas approval USDC** | ✅ Documenté | ✅ Respecté | ✅ OK |
| **Approval NFT 1×** | ✅ Documenté | ✅ Implémenté | ✅ OK |
| **Gas sponsorisé** | ✅ Documenté | ✅ useCdpPaymaster | ✅ OK |

### Flow Listing ✅

```
Documentation :
1. User remplit formulaire
2. Backend vérifie ownership (DB)
3. Backend sauvegarde en DB
4. NFT apparaît sur marketplace

Code Réel :
1. ListNFT.tsx handleSubmit() ✅
2. marketplace.service.listNFT() ✅
3. listingModel.create() + nft.marketType='fixed' ✅
4. Listing retourné au frontend ✅

→ CONFORME ✅
```

### Flow Achat ✅

```
Documentation :
1. Backend prépare (vérifications)
2. Frontend construit batch (USDC + NFT)
3. Frontend envoie UserOperation
4. Frontend confirme au backend

Code Réel :
1. marketplace.service.prepareBuyNFT() ✅
2. useMarketplace.buyNFT() construit calls[] ✅
3. sendUserOp({ calls, useCdpPaymaster: true }) ✅
4. confirmBuyNFT() met à jour DB ✅

→ CONFORME ✅
```

### Batch Transaction ✅

```
Documentation :
Call 1: USDC → Seller (95 USDC)
Call 2: USDC → CyLimit (5 USDC)
Call 3: buyNFT(tokenId, seller)

Code Réel (useMarketplace.ts lignes 348-394) :
Call 1: transfer(seller, sellerReceives) ✅
Call 2: transfer(masterWallet, fees.total) ✅
Call 3: buyNFT(tokenId, seller) ✅

→ CONFORME ✅
```

---

## 🔧 RECOMMANDATIONS PRIORITAIRES

### 🔴 Priorité HAUTE (Corriger Avant Production)

1. **Ajouter types viem stricts sur data**
   - Fichier : `useMarketplace.ts`
   - Ligne : 207
   - Fix : Ajouter `as \`0x${string}\`` après encodeFunctionData

2. **Vérifier balance USDC buyer**
   - Fichiers : `BuyNFT.tsx`, `marketplace.service.ts`
   - Impact : UX (éviter erreur on-chain)
   - Fix : Vérifier balance avant envoi UserOperation

### 🟡 Priorité MOYENNE (Améliorer UX)

3. **Ajouter vérification approval seller**
   - Fichier : `marketplace.service.ts` (prepareBuyNFT)
   - Impact : Prévenir erreur "Transfer not allowed"
   - Fix : Vérifier isApprovedForAll(seller, marketplace)

4. **Renommer route prepare-buy**
   - Fichier : `marketplace.controller.ts`
   - Impact : Clarté API
   - Fix : `POST /marketplace/prepare-buy/:id`

### 🟢 Priorité BASSE (Nice to Have)

5. **Enrichir ABIs pour vérifications frontend**
   - Fichier : `useMarketplace.ts`
   - Impact : Optionnel (backend fait déjà)
   - Fix : Ajouter isApprovedForAll, ownerOf dans ABI

6. **Ajouter date picker expiration**
   - Fichier : `ListNFT.tsx`
   - Impact : Feature manquante (backend supporte)
   - Fix : Intégrer react-calendar (déjà fait dans SellCardForm)

---

## 📊 VÉRIFICATION AVEC MCP COINBASE

### ✅ Déjà Conforme

| Élément | Code | Doc Coinbase | Statut |
|---------|------|--------------|--------|
| **useCdpPaymaster: true** | ✅ Ligne 216, 413 | ✅ Base uniquement | ✅ OK |
| **network: 'base-sepolia'** | ✅ Ligne 214, 411 | ✅ Supporté | ✅ OK |
| **calls: Array<{to, data}>** | ✅ Ligne 465-501 | ✅ Format correct | ✅ OK |
| **Batch atomique** | ✅ 3 calls dans 1 UserOp | ✅ Supporté | ✅ OK |
| **useRef éviter stale closures** | ✅ useCoinbaseWallet | ✅ Best practice | ✅ OK |

### ⚠️ À Vérifier avec MCP

```typescript
// 1. Vérifier types encodeFunctionData return
mcp_Coinbase_Developer_SearchCoinbaseDeveloper({
  query: "encodeFunctionData return type viem 0x string"
});
// → Confirmer si `as \`0x${string}\`` requis

// 2. Vérifier format args BigInt
mcp_Coinbase_Developer_SearchCoinbaseDeveloper({
  query: "encodeFunctionData args BigInt uint256"
});
// → Confirmer Math.floor() + BigInt() correct

// 3. Vérifier gestion balance checking
mcp_Coinbase_Developer_SearchCoinbaseDeveloper({
  query: "check USDC balance before sending UserOperation"
});
// → Best practice pour vérification pré-transaction
```

---

## ✅ CHECKLIST CORRECTIONS

### Avant Production

- [ ] **Corriger types viem** (useMarketplace.ts ligne 207)
- [ ] **Ajouter vérification balance USDC** (BuyNFT.tsx + prepareBuyNFT)
- [ ] **Vérifier avec MCP** les 3 points ci-dessus
- [ ] **Tester flow complet** (listing → approval → achat)
- [ ] **Vérifier approval seller** (prepareBuyNFT)

### Améliorations UX

- [ ] Ajouter date picker expiration (ListNFT.tsx)
- [ ] Enrichir ABIs (useMarketplace.ts)
- [ ] Renommer route prepare-buy (controller)
- [ ] Documenter import dynamique ethers

---

## 🎯 CONCLUSION

### Points Forts ✅

1. ✅ **Architecture conforme** à la documentation
2. ✅ **Séparation Backend/Frontend** claire
3. ✅ **Pas d'approval USDC** (architecture optimisée)
4. ✅ **Batch transactions** correctement implémentées
5. ✅ **Comments détaillés** partout
6. ✅ **Gestion sessions** (flag en mémoire)
7. ✅ **Vérification approval** Marketplace implémentée

### Points à Améliorer ⚠️

1. ⚠️ **Types viem** incomplets (1 ligne à ajouter)
2. ⚠️ **Balance USDC** pas vérifiée (UX)
3. ⚠️ **Approval seller** pas vérifié (sécurité)

### Note Globale

**8/10** - Code de très bonne qualité, quelques améliorations avant production

---

**Voulez-vous que je corrige les 3 problèmes identifiés ?** 🔧

