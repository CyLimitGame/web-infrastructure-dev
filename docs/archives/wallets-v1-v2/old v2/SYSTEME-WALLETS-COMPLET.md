# 🎯 Système Wallets & Paiements CyLimit - Documentation Complète

**Date :** 2 octobre 2025  
**Version :** 1.0 Finale  
**Statut :** ✅ Validé et prêt pour développement

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Décisions Finales](#décisions-finales)
3. [Architecture Technique](#architecture-technique)
4. [Système de Paiement](#système-de-paiement)
5. [Système de Fees](#système-de-fees)
6. [Flux Utilisateur Complets](#flux-utilisateur-complets)
7. [Implémentation Technique](#implémentation-technique)
8. [Migration](#migration)
9. [Coûts & Timeline](#coûts--timeline)
10. [FAQ](#faq)

---

## 🎯 Vue d'Ensemble

### Problèmes Actuels

❌ **Système actuel cassé :**
- Ramp/Metamask compliqué pour utilisateurs non-crypto
- Transferts NFT ne fonctionnent pas (Moralis abandonné)
- Paiements Stripe sans transfert blockchain réel
- KYC problématique
- Pas de gestion cohérente des wallets utilisateurs

### Solution Choisie

✅ **Coinbase Developer Platform (CDP) + Smart Accounts**

**Pourquoi Coinbase CDP ?**
- 🔐 Sécurité : Gestion des clés privées dans AWS Nitro Enclaves
- ⚛️ Atomique : Transactions groupées garanties (USDC + NFT ensemble)
- 🚀 Simple : SDK prêt à l'emploi, pas de Solidity custom
- 💰 Économique : Pas d'audit requis (ERC-4337 déjà audité)
- 🌍 Européen : Support CB européennes + MICA compliant
- 🔄 Flexible : Ajout facile de nouvelles fonctionnalités

---

## ✅ Décisions Finales

### 1. Blockchain : Polygon

- ✅ Déjà utilisé par CyLimit
- ✅ Gas fees ultra-bas (~0.01 USDC/transaction)
- ✅ Support USDC natif
- ✅ Compatible Coinbase CDP
- ✅ Pas de migration des NFTs existants nécessaire

### 2. Type de Wallet : Smart Accounts (ERC-4337)

- ✅ Transactions atomiques natives
- ✅ Batch operations (USDC + NFT en 1 TX)
- ✅ Gas sponsoring possible (CyLimit paie le gas)
- ✅ Pas de gestion clés privées côté user
- ✅ Sécurité gérée par Coinbase
- ⚠️ Coût : 0.05 USDC par wallet (une fois, déploiement lazy)

### 3. Options de Paiement : 3 Méthodes

**Ordre recommandé (affiché dans cet ordre à l'user) :**

1. **💰 Solde USDC** (priorité 1)
   - Instant, 0 fee externe
   - Si balance suffisante

2. **🏦 Coinbase Onramp** (priorité 2)
   - CB européenne → USDC automatique
   - Fee : 3.5% (Coinbase)
   - KYC : Géré par Coinbase

3. **💳 Stripe** (priorité 3, fallback)
   - CB classique (Visa/Mastercard)
   - Fee : **25% pour l'acheteur** (non négociable)
   - Aucun KYC requis

### 4. NFTs Bloqués (CyLimit only)

- ✅ Visibles sur OpenSea/MetaMask (lecture seule)
- ❌ Transferts externes bloqués via Smart Contract
- ✅ Mode urgence : Déblocage si CyLimit ferme

### 5. Transferts Atomiques

- ✅ USDC + NFT transférés ensemble (indivisible)
- ✅ Sécurité : ERC-4337 audité par Coinbase
- ✅ Pas de Smart Contract custom à auditer
- ✅ 0 risque d'état incohérent (tout ou rien)

---

## 🏗️ Architecture Technique

### Composants

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Frontend)                          │
│  - Inscription/Connexion (email + OTP)                      │
│  - Achat NFT (3 options : USDC / Coinbase / Stripe)        │
│  - Vente NFT (listing marché)                               │
│  - Retrait USDC (vers wallet externe)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (NestJS)                               │
│  - CoinbaseWalletService (gestion Smart Accounts)          │
│  - MarketplaceService (achats/ventes atomiques)            │
│  - PaymentService (Stripe, fees)                            │
│  - GameLockService (warning si NFT en compétition)         │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Coinbase │ │  Stripe │ │ Alchemy │
    │   CDP   │ │   API   │ │   RPC   │
    │         │ │         │ │Webhooks │
    └────┬────┘ └─────────┘ └────┬────┘
         │                        │
         ▼                        ▼
    ┌─────────────────────────────────┐
    │     POLYGON BLOCKCHAIN          │
    │  - USDC Contract (ERC-20)       │
    │  - CyLimitNFT_v2 (ERC-721)      │
    │  - Smart Accounts (ERC-4337)    │
    └─────────────────────────────────┘
```

### Flux de Données

```
User Inscription
     │
     ├─> Backend crée Smart Account (via CDP)
     │   └─> Coinbase déploie Smart Account sur Polygon
     │       └─> Backend save walletAddress + smartAccountId en DB
     │
     └─> User peut maintenant recevoir USDC et NFTs
```

---

## 💳 Système de Paiement

### Option 1 : Solde USDC (Priorité 1)

**Cas d'usage :**
- User a déjà des USDC dans son wallet CyLimit
- Achat instantané, pas de fee externe

**Flow :**

```typescript
// Frontend
if (userBalance >= nftPrice + fees) {
  // Afficher en priorité cette option
  await buyWithUSDC(nftId);
}
```

**Fees :**
- Acheteur : 0% (actuellement)
- Vendeur : 0.05 USDC (flat fee)
- Gas : Payé par CyLimit (~0.01 USDC)

---

### Option 2 : Coinbase Onramp (Priorité 2)

**Cas d'usage :**
- User n'a pas assez d'USDC
- User veut payer par CB européenne
- Conversion automatique EUR → USDC

**Flow :**

```typescript
// Frontend
const onrampUrl = await backend.generateOnrampLink({
  userId,
  amount: nftPrice + fees,
  destination: userSmartAccount.address,
});

// Redirection vers Coinbase
window.location.href = onrampUrl;

// Webhook Coinbase → Backend
// → Détecte dépôt USDC
// → Exécute achat NFT automatiquement
```

**Fees :**
- Acheteur : 0% CyLimit + 3.5% Coinbase
- Vendeur : 0.05 USDC (flat fee)
- Gas : Payé par CyLimit (~0.01 USDC)
- KYC : Géré par Coinbase (progressive)

**Avantages :**
- ✅ Support CB européennes (Visa, Mastercard, SEPA)
- ✅ Conversion automatique EUR → USDC
- ✅ KYC géré par Coinbase (MICA compliant)
- ✅ Meilleur taux que Stripe

---

### Option 3 : Stripe (Priorité 3, Fallback)

**Cas d'usage :**
- User refuse Coinbase
- User veut payer avec CB classique sans compte crypto
- Solution de secours

**Flow :**

```typescript
// Frontend
const paymentIntent = await backend.createStripePayment({
  nftId,
  userId,
});

// Paiement Stripe classique
const result = await stripe.confirmPayment(paymentIntent);

// Backend reçoit webhook Stripe
// → Achète USDC sur Coinbase (B2B)
// → Transfère USDC + NFT au user
```

**Fees :**
- Acheteur : **25% fee Stripe** (max(25%, 0.35 USDC))
- Vendeur : 0.05 USDC (flat fee)
- Gas : Payé par CyLimit (~0.01 USDC)

**⚠️ IMPORTANT : Premium N'annule PAS les fees Stripe**

```
Stripe facture CyLimit directement (non négociable)
→ Premium annule uniquement les fees CyLimit (0-5%)
→ Premium N'annule PAS les fees externes (Stripe 25%, Coinbase 3.5%)

Donc avec Premium :
✅ USDC Wallet : 0 fee
✅ Coinbase CB : 0 fee CyLimit + 3.5% Coinbase (non annulable)
❌ Stripe CB : 25% fee Stripe (non annulable) + 0 fee CyLimit
```

**Pourquoi 25% ?**
- Stripe charge CyLimit : ~3%
- CyLimit achète USDC sur Coinbase : ~3.5%
- CyLimit doit acheter le NFT pour l'user : prix NFT
- Buffer sécurité + risque volatilité : ~15%
- **Total : ~25%**

**Recommandation UX :**
- Afficher clairement "Stripe : +25% de frais"
- Encourager Coinbase Onramp (seulement +3.5%)

---

## 💰 Système de Fees

### ⚠️ IMPORTANT : Système Actuel vs Nouveau Système

**Système ACTUEL sur le site (à migrer) :**
```javascript
// Appliqué aux DEUX parties (acheteur + vendeur)
fees = max(0.05 USDC, 0.05% du prix)

Exemples :
- NFT à 100 USDC : max(0.05, 0.05) = 0.05 USDC (chacun)
- NFT à 1000 USDC : max(0.05, 0.5) = 0.5 USDC (chacun)
```

---

### Phase 1 : Nouveau Système (Lancement - Semaine 8)

**Objectif :** Faire porter les fees UNIQUEMENT au vendeur

**Configuration :**

```env
# .env - Phase 1
BUYER_FEE_PERCENT=0          # 0% acheteur
SELLER_FEE_PERCENT=0.05      # 0.05% vendeur
SELLER_FEE_FLAT=0.05         # 0.05 USDC minimum
STRIPE_BUYER_FEE_PERCENT=25  # 25% si Stripe
STRIPE_BUYER_FEE_MIN=0.35    # Minimum 0.35 USDC si Stripe
```

**Formule Vendeur (Phase 1) :**

```javascript
sellerFee = max(0.05 USDC, prix × 0.05%)

Exemples :
- NFT à 100 USDC : max(0.05, 0.05) = 0.05 USDC
- NFT à 1000 USDC : max(0.05, 0.5) = 0.5 USDC
- NFT à 10000 USDC : max(0.05, 5) = 5 USDC
```

**Exemples (Phase 1) :**

| NFT Prix | Méthode Paiement | Fee Acheteur | Fee Vendeur | Total Acheteur | Reçu Vendeur |
|----------|------------------|--------------|-------------|----------------|--------------|
| 1 USDC   | USDC Wallet      | 0            | 0.05        | **1 USDC**     | 0.95 USDC    |
| 1 USDC   | Coinbase CB      | 0.035 (CB)   | 0.05        | **1.035 USDC** | 0.95 USDC    |
| 1 USDC   | Stripe CB        | 0.35 (min)   | 0.05        | **1.35 USDC**  | 0.95 USDC    |
| 100 USDC | USDC Wallet      | 0            | 0.05        | **100 USDC**   | 99.95 USDC   |
| 100 USDC | Coinbase CB      | 3.5 (CB)     | 0.05        | **103.5 USDC** | 99.95 USDC   |
| 100 USDC | Stripe CB        | 25 (25%)     | 0.05        | **125 USDC**   | 99.95 USDC   |
| 1000 USDC| USDC Wallet      | 0            | 0.5         | **1000 USDC**  | 999.5 USDC   |
| 1000 USDC| Coinbase CB      | 35 (CB)      | 0.5         | **1035 USDC**  | 999.5 USDC   |
| 1000 USDC| Stripe CB        | 250 (25%)    | 0.5         | **1250 USDC**  | 999.5 USDC   |

**🎯 Action requise :** Dès que le nouveau système est en place, modifier le site actuel pour appliquer ces fees.

---

### Phase 2 : Avec Abonnements Premium (Semaine 16+)

**Objectif :** Augmenter les fees et proposer Premium pour les annuler

**Configuration :**

```env
# .env - Phase 2 (après lancement abonnements)
BUYER_FEE_PERCENT=5          # 5% acheteur (si pas Premium)
SELLER_FEE_PERCENT=5         # 5% vendeur (si pas Premium)
SELLER_FEE_FLAT=0.05         # Minimum 0.05 USDC
STRIPE_BUYER_FEE_PERCENT=25  # 25% si Stripe (toujours)
STRIPE_BUYER_FEE_MIN=0.35    # Minimum 0.35 USDC si Stripe
```

**Formule Vendeur (Phase 2) :**

```javascript
sellerFee = max(0.05 USDC, prix × 5%)  // ⚠️ 5% au lieu de 0.05%

Exemples :
- NFT à 0.5 USDC : max(0.05, 0.025) = 0.05 USDC
- NFT à 1 USDC : max(0.05, 0.05) = 0.05 USDC
- NFT à 2 USDC : max(0.05, 0.10) = 0.10 USDC
- NFT à 10 USDC : max(0.05, 0.50) = 0.50 USDC
- NFT à 100 USDC : max(0.05, 5) = 5 USDC
```

**Formule Acheteur (Phase 2) :**

```javascript
buyerFee = prix × 5%  // Si pas Premium

Exemples :
- NFT à 10 USDC : 0.5 USDC
- NFT à 100 USDC : 5 USDC
```

---

### Plans Premium (Future)

| Plan | Prix | Avantages |
|------|------|-----------|
| **Free** | 0€/mois | Fees normales |
| **Pro** | 9.99€/mois | 0 fee sur cartes Blue/White |
| **Legend** | 29.99€/mois | 0 fee sur toutes cartes (Blue/White/Pink/Yellow) |

**Impact des Abonnements :**

| NFT | Méthode | Sans Premium | Avec Premium Pro | Avec Premium Legend |
|-----|---------|--------------|------------------|---------------------|
| Blue 10 USDC | USDC | 10.5 USDC (5%) | **10 USDC (0%)** ✅ | **10 USDC (0%)** ✅ |
| Pink 50 USDC | USDC | 52.5 USDC (5%) | 52.5 USDC (5%) | **50 USDC (0%)** ✅ |
| Blue 10 USDC | Stripe | 12.5 USDC (25%) | **12.5 USDC (25%)** ❌ | **12.5 USDC (25%)** ❌ |
| Pink 50 USDC | Stripe | 62.5 USDC (25%) | **62.5 USDC (25%)** ❌ | **62.5 USDC (25%)** ❌ |

**🔴 RÈGLE IMPORTANTE : Stripe Fees JAMAIS Annulables**

```
Premium annule SEULEMENT les fees CyLimit internes (0-5%)
Premium N'annule JAMAIS les fees externes :
  - Stripe : 25% (toujours)
  - Coinbase Onramp : 3.5% (toujours)
```

---

## 🔄 Flux Utilisateur Complets

### 1. Inscription User

```
1. User crée compte (email + password)
   └─> Backend : User créé en DB (sans wallet)

2. User fait sa 1ère action (dépôt ou achat)
   └─> Backend détecte : pas de Smart Account
       └─> Appel CDP : createSmartAccount(userId)
           └─> Coinbase déploie Smart Account sur Polygon (coût : 0.05 USDC)
               └─> Backend save : walletAddress, smartAccountId
                   └─> User peut maintenant recevoir USDC/NFTs
```

**Coût CyLimit :** 0.05 USDC par user actif (déploiement lazy)

---

### 2. Dépôt USDC

#### Option A : Via Coinbase Onramp

```
1. User clique "Déposer des USDC"
   └─> Frontend : Affiche montant à déposer

2. User choisit "Carte bancaire"
   └─> Backend génère lien Coinbase Onramp
       └─> Frontend : Redirection vers Coinbase
           └─> User paie en EUR avec sa CB
               └─> Coinbase convertit EUR → USDC
                   └─> Coinbase envoie USDC au Smart Account user
                       └─> Webhook Alchemy détecte dépôt
                           └─> Backend update totalBalance en DB
                               └─> Frontend : Balance mise à jour
```

**Fees :**
- User paie : 3.5% (Coinbase)
- CyLimit paie : 0 (juste gas sponsoring)

#### Option B : Via Wallet Externe (Metamask)

```
1. User a déjà des USDC sur un wallet externe
   └─> User clique "Déposer depuis wallet externe"
       └─> Frontend affiche adresse Smart Account + QR code
           └─> User ouvre Metamask
               └─> User envoie USDC à l'adresse affichée
                   └─> Webhook Alchemy détecte dépôt
                       └─> Backend update totalBalance en DB
                           └─> Frontend : Balance mise à jour
```

**Fees :**
- User paie : Gas Polygon (~0.01 USDC)
- CyLimit paie : 0

---

### 3. Achat NFT - Marché Primaire (CyLimit)

```
1. User browse catalogue NFTs CyLimit
   └─> User clique sur NFT (prix : 10 USDC)

2. Frontend affiche 3 options de paiement :
   
   ┌─────────────────────────────────────────┐
   │  💰 Solde USDC : 10 USDC (Recommandé)  │ ← Priorité 1
   │     Votre solde : 15 USDC               │
   ├─────────────────────────────────────────┤
   │  🏦 Carte bancaire (Coinbase)           │ ← Priorité 2
   │     10.35 USDC (10 + 0.35€ frais CB)    │
   ├─────────────────────────────────────────┤
   │  💳 Carte bancaire (Stripe)             │ ← Priorité 3
   │     12.5 USDC (10 + 25% frais)          │
   │     ⚠️ Frais élevés, privilégier CB     │
   └─────────────────────────────────────────┘

3a. Si user choisit "Solde USDC" :
    └─> Backend exécute transaction atomique :
        
        smartAccount.executeBatch([
          // 1. USDC: User → CyLimit
          transferUSDC(userWallet, cylimitWallet, 10 USDC),
          
          // 2. NFT: CyLimit → User
          mintNFT(userWallet, nftId),
        ]);
        
        └─> Confirmation blockchain (3-5 sec)
            └─> Backend update DB : ownerId = userId
                └─> Frontend : Affiche NFT dans collection

3b. Si user choisit "Coinbase CB" :
    └─> Backend génère lien Onramp (montant : 10 USDC)
        └─> User redirigé vers Coinbase
            └─> User paie 10.35€ avec CB
                └─> Coinbase envoie 10 USDC au Smart Account
                    └─> Webhook détecte dépôt
                        └─> Backend exécute transaction atomique (même que 3a)

3c. Si user choisit "Stripe CB" :
    └─> Backend crée PaymentIntent Stripe (12.5€)
        └─> User paie avec CB classique
            └─> Webhook Stripe confirme paiement
                └─> Backend achète 10 USDC sur Coinbase (B2B)
                    └─> Backend exécute transaction atomique (même que 3a)
```

**Fees (User voit) :**
- USDC : 10 USDC total
- Coinbase : 10.35 USDC total (10 + 3.5%)
- Stripe : 12.5 USDC total (10 + 25%)

**Fees (CyLimit reçoit) :**
- Vendeur (CyLimit) : 0.05 USDC sur les 10 USDC

---

### 4. Achat NFT - Marché Secondaire (User → User)

```
1. User A liste un NFT à 20 USDC
   └─> Backend : Crée listing en DB (status: active)
       └─> Frontend : NFT apparaît sur marketplace

2. User B browse marketplace
   └─> User B clique sur NFT (prix : 20 USDC)

3. Frontend affiche 3 options de paiement (même que primaire)

4. User B choisit "Solde USDC" (balance : 25 USDC)
   └─> Backend exécute transaction atomique :
       
       smartAccount_B.executeBatch([
         // 1. USDC: User B → User A (vendeur)
         transferUSDC(userB_wallet, userA_wallet, 19.95 USDC),
         
         // 2. Fee: User B → CyLimit
         transferUSDC(userB_wallet, cylimit_wallet, 0.05 USDC),
         
         // 3. NFT: User A → User B
         transferNFT(userA_wallet, userB_wallet, tokenId),
       ]);
       
       └─> Confirmation blockchain (3-5 sec)
           └─> Backend update DB :
               - NFT.ownerId = userB_id
               - Listing.status = sold
               └─> Frontend :
                   - User B : NFT dans collection
                   - User A : Balance +19.95 USDC
```

**Fees :**
- Acheteur (User B) : 0 (actuellement)
- Vendeur (User A) : 0.05 USDC
- CyLimit reçoit : 0.05 USDC

**⚠️ Gestion Lock Compétition :**

```typescript
// Avant vente, vérifier si NFT en compétition
const isInActiveGame = await GameTeamService.isNftInActiveGame(nftId);

if (isInActiveGame) {
  // ✅ Afficher WARNING (pas de lock)
  return {
    canSell: true,
    warning: "Ce NFT est dans une équipe en compétition. Si vous le vendez, votre équipe sera invalidée et vous ne recevrez pas de récompenses.",
    confirmRequired: true,
  };
}

// Si user confirme, vente autorisée + invalidation équipe
```

---

### 5. Retrait USDC

```
1. User clique "Retirer des USDC"
   └─> Frontend affiche balance : 50 USDC
       └─> User entre montant : 30 USDC
           └─> User entre adresse wallet Polygon de destination

2. Backend vérifie :
   ├─> Balance suffisante ? ✅
   ├─> Adresse valide ? ✅
   └─> KYC fait ? (requis si > 1000€/mois)

3. Backend exécute transfer :
   
   smartAccount.transfer({
     to: destinationAddress,
     amount: 30 USDC,
     asset: USDC_CONTRACT,
   });
   
   └─> Confirmation blockchain (3-5 sec)
       └─> Backend update DB : totalBalance -= 30
           └─> Frontend : Balance mise à jour (20 USDC restants)
```

**Fees :**
- User paie : 0 (gas sponsorisé par CyLimit)
- CyLimit paie : ~0.01 USDC (gas)

**KYC :**
- Pas requis pour montants < 1000€/mois
- Requis si total retraits > 1000€/mois (Coinbase gère)

---

## 🔄 Synchronisation DB ↔ Blockchain

### Stratégie de Vérification

**Principe :**
- DB MongoDB = Cache pour performance (lecture rapide)
- Blockchain = Source de vérité absolue (ownership réel)
- Smart Contract vérifie automatiquement lors des transactions
- Pas besoin de vérifier à chaque lecture (trop coûteux)

**Niveaux de vérification :**

| Action | Vérification on-chain ? | Raison |
|--------|------------------------|--------|
| **GET /users/:id/nfts** | ❌ Non | Lecture DB uniquement (10-50ms) |
| **GET /marketplace/nfts** | ❌ Non | Lecture DB uniquement (50-100ms) |
| **POST /marketplace/list** | ✅ Oui | Critique - Vérifier ownership avant listing |
| **POST /marketplace/buy** | ❌ Non | Smart Contract vérifie automatiquement |
| **Webhook Alchemy** | ❌ Non | Webhook = preuve du transfert on-chain |
| **Cron job quotidien** | ✅ Oui | Audit complet = filet de sécurité |
| **Admin /sync-nft/:id** | ✅ Oui | Debug manuel |

**Coûts (50 000 NFTs, 1000 TX/mois) :**
- Cron job quotidien : **0€** (Alchemy gratuit, 15M CU/mois sur 300M quota)
- Vérification listing : **0€** (dans quota gratuit)
- Achat marketplace : **10€/mois** (gas Polygon, 0.01€/TX)
- **Total : 10€/mois** ✅

**Service :** `NFTSyncService`
- ✅ Cron job quotidien (3h du matin) : Audit complet
- ✅ Vérification au listing : Check ownership avant mise en vente
- ✅ Endpoint admin : Sync manuel pour debug
- ✅ Logs détaillés : Détection désynchronisations
- ✅ Alertes : Si > 10 désync → Investigation requise

---

## 💻 Implémentation Technique

### 1. Smart Contract NFT v2

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * CyLimitNFT_v2
 * 
 * Fonctionnalités :
 * - Mint NFTs avec metadata IPFS
 * - Transferts restreints (whitelist CyLimit marketplace)
 * - Royalties on-chain (ERC-2981)
 * - Mode urgence (déblocage si CyLimit ferme)
 * - Visibilité OpenSea/MetaMask (lecture seule)
 */
contract CyLimitNFT_v2 is ERC721, ERC2981, Ownable {
    // 🔒 Sécurité : Transferts restreints
    bool public restrictedTransfers = true;
    bool public emergencyMode = false;
    
    // Whitelist : Seuls ces contrats peuvent transférer
    mapping(address => bool) public authorizedContracts;
    
    // Metadata
    string private _baseTokenURI;
    uint256 private _tokenIdCounter;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event EmergencyModeActivated(uint256 timestamp);
    event TransferRestrictionUpdated(bool restricted);
    event AuthorizedContractUpdated(address indexed contractAddress, bool authorized);
    
    constructor(
        string memory baseURI,
        address cylimitMarketplace
    ) ERC721("CyLimit Riders", "CYLMT") {
        _baseTokenURI = baseURI;
        authorizedContracts[cylimitMarketplace] = true;
        
        // Royalties : 5% pour CyLimit (optionnel, pour OpenSea)
        _setDefaultRoyalty(owner(), 500); // 5% = 500 basis points
    }
    
    // 🎨 Mint NFT (seulement owner = backend CyLimit)
    function mint(address to, string memory tokenURI) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        emit NFTMinted(to, tokenId, tokenURI);
        return tokenId;
    }
    
    // 🔒 Override transferFrom : Vérifier whitelist
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        // Mode urgence : Tout débloqué
        if (emergencyMode) {
            super.transferFrom(from, to, tokenId);
            return;
        }
        
        // Mode restreint : Vérifier whitelist
        if (restrictedTransfers) {
            require(
                authorizedContracts[msg.sender] || 
                msg.sender == owner(),
                "CyLimit: Transfers only through authorized contracts"
            );
        }
        
        super.transferFrom(from, to, tokenId);
    }
    
    // 🔒 Override safeTransferFrom : Même logique
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        if (emergencyMode) {
            super.safeTransferFrom(from, to, tokenId, data);
            return;
        }
        
        if (restrictedTransfers) {
            require(
                authorizedContracts[msg.sender] || 
                msg.sender == owner(),
                "CyLimit: Transfers only through authorized contracts"
            );
        }
        
        super.safeTransferFrom(from, to, tokenId, data);
    }
    
    // 🚨 Mode Urgence : Débloquer tous les NFTs (si CyLimit ferme)
    function activateEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated(block.timestamp);
    }
    
    // ⚙️ Gestion whitelist
    function setAuthorizedContract(address contractAddress, bool authorized) 
        external 
        onlyOwner 
    {
        authorizedContracts[contractAddress] = authorized;
        emit AuthorizedContractUpdated(contractAddress, authorized);
    }
    
    // ⚙️ Toggle restrictions (pour tests)
    function setRestrictedTransfers(bool restricted) external onlyOwner {
        restrictedTransfers = restricted;
        emit TransferRestrictionUpdated(restricted);
    }
    
    // 🖼️ Metadata
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    // ♻️ Royalties : Supporter ERC2981 et ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

**Déploiement :**

```bash
# 1. Compiler
npx hardhat compile

# 2. Déployer sur Polygon Mumbai (testnet)
npx hardhat run scripts/deploy-nft-v2.ts --network mumbai

# 3. Vérifier sur PolygonScan
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> "ipfs://base/" "<MARKETPLACE_ADDRESS>"

# 4. Déployer sur Polygon Mainnet (production)
npx hardhat run scripts/deploy-nft-v2.ts --network polygon
```

---

### 2. Backend Service : CoinbaseWalletService

```typescript
// src/modules/wallet/services/coinbase-wallet.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Coinbase, Wallet, SmartAccount } from '@coinbase/coinbase-sdk';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@modules/user/schemas/user.schema';

/**
 * CoinbaseWalletService
 * 
 * Gère les Smart Accounts Coinbase CDP pour chaque user.
 * 
 * Fonctionnalités :
 * - Création Smart Account (lazy, au 1er besoin)
 * - Récupération Smart Account existant
 * - Vérification balance USDC
 * - Transferts USDC (user → user, user → CyLimit, etc.)
 * - Gas sponsoring (CyLimit paie le gas)
 * 
 * Appelé depuis :
 * - MarketplaceService (achats/ventes NFTs)
 * - PaymentService (dépôts/retraits)
 * - UserService (création user)
 */
@Injectable()
export class CoinbaseWalletService {
  private readonly logger = new Logger(CoinbaseWalletService.name);
  private coinbase: Coinbase;
  private cylimitWallet: Wallet;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    // Initialiser Coinbase CDP
    this.coinbase = new Coinbase({
      apiKeyName: this.configService.get('COINBASE_API_KEY_NAME'),
      privateKey: this.configService.get('COINBASE_API_PRIVATE_KEY'),
    });
    
    // Wallet principal CyLimit (pour recevoir fees)
    this.initializeCylimitWallet();
  }

  /**
   * Initialise le wallet principal CyLimit
   * Ce wallet reçoit toutes les fees
   */
  private async initializeCylimitWallet() {
    const walletId = this.configService.get('COINBASE_CYLIMIT_WALLET_ID');
    
    if (walletId) {
      // Récupérer wallet existant
      this.cylimitWallet = await this.coinbase.getWallet(walletId);
      this.logger.log(`CyLimit wallet loaded: ${this.cylimitWallet.address}`);
    } else {
      // Créer nouveau wallet CyLimit (une fois)
      this.cylimitWallet = await this.coinbase.createWallet({
        networkId: 'polygon-mainnet',
      });
      this.logger.warn(
        `New CyLimit wallet created: ${this.cylimitWallet.id}. ` +
        `Add COINBASE_CYLIMIT_WALLET_ID=${this.cylimitWallet.id} to .env`
      );
    }
  }

  /**
   * Crée un Smart Account pour un user
   * Appelé depuis : UserService (au 1er dépôt ou achat)
   * 
   * @param userId - ID MongoDB du user
   * @returns Address du Smart Account créé
   */
  async createSmartAccount(userId: string): Promise<string> {
    try {
      this.logger.log(`Creating Smart Account for user ${userId}`);

      // Créer Smart Account via CDP
      const smartAccount = await this.coinbase.createSmartAccount({
        networkId: 'polygon-mainnet',
        // Optionnel : paymaster pour gas sponsoring
        paymasterOptions: {
          sponsorGas: true, // CyLimit paie le gas
        },
      });

      // Attendre déploiement on-chain
      await smartAccount.deploy();

      const address = smartAccount.address;

      this.logger.log(
        `Smart Account created for user ${userId}: ${address}`
      );

      // Sauvegarder en DB
      await this.userModel.updateOne(
        { _id: userId },
        {
          walletAddress: address,
          smartAccountId: smartAccount.id,
          walletCreatedAt: new Date(),
        }
      );

      return address;
    } catch (error) {
      this.logger.error(
        `Failed to create Smart Account for user ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Récupère le Smart Account d'un user (ou le crée s'il n'existe pas)
   * Appelé depuis : MarketplaceService, PaymentService
   * 
   * @param userId - ID MongoDB du user
   * @returns SmartAccount Coinbase
   */
  async getUserSmartAccount(userId: string): Promise<SmartAccount> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Si pas de Smart Account, le créer (lazy loading)
    if (!user.smartAccountId) {
      await this.createSmartAccount(userId);
      // Recharger user
      const updatedUser = await this.userModel.findById(userId);
      return this.coinbase.getSmartAccount(updatedUser.smartAccountId);
    }

    // Récupérer Smart Account existant
    return this.coinbase.getSmartAccount(user.smartAccountId);
  }

  /**
   * Récupère la balance USDC d'un user
   * Appelé depuis : Frontend (API GET /user/balance)
   * 
   * @param userId - ID MongoDB du user
   * @returns Balance en USDC (number)
   */
  async getUSDCBalance(userId: string): Promise<number> {
    try {
      const smartAccount = await this.getUserSmartAccount(userId);
      
      const balance = await smartAccount.getBalance('USDC');
      
      return parseFloat(balance.toString());
    } catch (error) {
      this.logger.error(`Failed to get balance for user ${userId}`, error);
      return 0;
    }
  }

  /**
   * Transfère des USDC de manière atomique
   * Appelé depuis : MarketplaceService (achats/ventes)
   * 
   * @param fromUserId - ID du sender
   * @param toAddress - Address du receiver (peut être user ou CyLimit)
   * @param amount - Montant en USDC
   * @returns Transaction hash
   */
  async transferUSDC(
    fromUserId: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    try {
      const smartAccount = await this.getUserSmartAccount(fromUserId);
      
      const tx = await smartAccount.transfer({
        to: toAddress,
        amount: amount.toString(),
        asset: 'USDC',
        // Gas sponsoring optionnel
        paymasterOptions: {
          sponsorGas: true,
        },
      });

      await tx.wait();

      this.logger.log(
        `USDC transfer: ${amount} USDC from user ${fromUserId} to ${toAddress}. TX: ${tx.hash}`
      );

      return tx.hash;
    } catch (error) {
      this.logger.error(
        `USDC transfer failed: ${fromUserId} → ${toAddress} (${amount} USDC)`,
        error
      );
      throw error;
    }
  }

  /**
   * Exécute une transaction atomique (batch)
   * Utilisé pour : Achats NFTs (USDC + NFT en 1 TX)
   * 
   * @param userId - ID du user qui signe la TX
   * @param operations - Liste d'opérations à exécuter atomiquement
   * @returns Transaction hash
   */
  async executeBatchTransaction(
    userId: string,
    operations: Array<{
      to: string;
      data: string;
      value?: string;
    }>
  ): Promise<string> {
    try {
      const smartAccount = await this.getUserSmartAccount(userId);

      this.logger.log(
        `Executing batch transaction for user ${userId}: ${operations.length} operations`
      );

      // Exécuter batch atomique
      const tx = await smartAccount.executeBatch(operations, {
        paymasterOptions: {
          sponsorGas: true, // CyLimit paie le gas
        },
      });

      await tx.wait();

      this.logger.log(
        `Batch transaction successful for user ${userId}. TX: ${tx.hash}`
      );

      return tx.hash;
    } catch (error) {
      this.logger.error(
        `Batch transaction failed for user ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Récupère l'adresse du wallet principal CyLimit
   * Utilisé pour : Recevoir fees
   */
  getCylimitWalletAddress(): string {
    return this.cylimitWallet.address;
  }
}
```

---

### 3. Backend Service : MarketplaceService

```typescript
// src/modules/marketplace/services/marketplace.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NFT } from '@modules/nft/schemas/nft.schema';
import { User } from '@modules/user/schemas/user.schema';
import { CoinbaseWalletService } from '@modules/wallet/services/coinbase-wallet.service';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * MarketplaceService
 * 
 * Gère les achats/ventes de NFTs avec transactions atomiques.
 * 
 * Fonctionnalités :
 * - Achat NFT primaire (CyLimit → User)
 * - Achat NFT secondaire (User → User)
 * - Listing/Delisting NFTs
 * - Calcul fees dynamique
 * - Vérification lock compétition (warning)
 * 
 * Appelé depuis :
 * - Frontend (API POST /marketplace/buy, /marketplace/list, etc.)
 * - PaymentService (après paiement Stripe/Coinbase)
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private nftContract: ethers.Contract;

  constructor(
    @InjectModel(NFT.name) private nftModel: Model<NFT>,
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: CoinbaseWalletService,
    private configService: ConfigService,
  ) {
    // Initialiser contract NFT
    const provider = new ethers.providers.JsonRpcProvider(
      this.configService.get('ALCHEMY_POLYGON_RPC_URL')
    );
    
    this.nftContract = new ethers.Contract(
      this.configService.get('NFT_CONTRACT_ADDRESS'),
      NFT_ABI,
      provider
    );
  }

  /**
   * Calcule les fees pour un achat
   * 
   * Logique :
   * - Phase actuelle : 0.05 USDC flat vendeur only
   * - Phase future : max(0.05, 5%) vendeur + 5% acheteur (si pas Premium)
   * - Stripe : Toujours 25% acheteur (même avec Premium)
   * 
   * Appelé depuis : buyNFT, Frontend (preview fees)
   * 
   * @param nftPrices - Liste des prix des NFTs
   * @param nftRarities - Liste des raretés des NFTs
   * @param paymentMethod - 'usdc' | 'coinbase' | 'stripe'
   * @param buyerHasPremium - Le buyer a un abonnement Premium ?
   * @param buyerPremiumPlan - Plan Premium du buyer ('pro' | 'legend')
   * @param sellerHasPremium - Le seller a un abonnement Premium ?
   * @param sellerPremiumPlan - Plan Premium du seller
   * @returns { buyerFee, sellerFee, totalPrice }
   */
  calculateFees(
    nftPrices: number[],
    nftRarities: string[],
    paymentMethod: 'usdc' | 'coinbase' | 'stripe',
    buyerHasPremium = false,
    buyerPremiumPlan?: 'pro' | 'legend',
    sellerHasPremium = false,
    sellerPremiumPlan?: 'pro' | 'legend',
  ): {
    buyerFee: number;
    sellerFee: number;
    totalPrice: number;
  } {
    const totalPrice = nftPrices.reduce((sum, price) => sum + price, 0);

    // Configuration fees (variables d'environnement)
    const BUYER_FEE_PERCENT = parseFloat(
      this.configService.get('BUYER_FEE_PERCENT', '0'), // 0% au lancement
    );
    const SELLER_FEE_PERCENT = parseFloat(
      this.configService.get('SELLER_FEE_PERCENT', '0'), // 0% au lancement
    );
    const SELLER_FEE_FLAT = parseFloat(
      this.configService.get('SELLER_FEE_FLAT', '0.05'), // 0.05 USDC toujours
    );
    const STRIPE_BUYER_FEE_PERCENT = parseFloat(
      this.configService.get('STRIPE_BUYER_FEE_PERCENT', '25'), // 25% toujours
    );
    const STRIPE_BUYER_FEE_MIN = parseFloat(
      this.configService.get('STRIPE_BUYER_FEE_MIN', '0.35'), // 0.35 USDC min
    );

    let buyerFee = 0;
    let sellerFee = 0;

    // 1. Calcul fee acheteur
    if (paymentMethod === 'stripe') {
      // Stripe : 25% (ou min 0.35 USDC)
      // ⚠️ Premium N'annule PAS les fees Stripe
      buyerFee = Math.max(
        totalPrice * (STRIPE_BUYER_FEE_PERCENT / 100),
        STRIPE_BUYER_FEE_MIN
      );
    } else {
      // USDC ou Coinbase : Vérifier Premium
      if (buyerHasPremium && buyerPremiumPlan) {
        // Vérifier si Premium couvre toutes les raretés
        const allCovered = nftRarities.every(rarity =>
          this.isPremiumCoverRarity(buyerPremiumPlan, rarity)
        );
        
        if (allCovered) {
          buyerFee = 0; // Premium annule fees CyLimit
        } else {
          buyerFee = totalPrice * (BUYER_FEE_PERCENT / 100);
        }
      } else {
        buyerFee = totalPrice * (BUYER_FEE_PERCENT / 100);
      }
    }

    // 2. Calcul fee vendeur
    if (sellerHasPremium && sellerPremiumPlan) {
      // Premium : Vérifier par NFT
      sellerFee = nftPrices.reduce((total, price, index) => {
        const rarity = nftRarities[index];
        const isFeeFree = this.isPremiumCoverRarity(sellerPremiumPlan, rarity);
        
        if (isFeeFree) {
          return total; // Pas de fee pour ce NFT
        }
        
        // Fee normale pour ce NFT
        const percentFee = price * (SELLER_FEE_PERCENT / 100);
        const fee = Math.max(SELLER_FEE_FLAT, percentFee);
        return total + fee;
      }, 0);
    } else {
      // Pas de Premium : Fee normale
      sellerFee = nftPrices.reduce((total, price) => {
        const percentFee = price * (SELLER_FEE_PERCENT / 100);
        const fee = Math.max(SELLER_FEE_FLAT, percentFee);
        return total + fee;
      }, 0);
    }

    return {
      buyerFee,
      sellerFee,
      totalPrice: totalPrice + buyerFee,
    };
  }

  /**
   * Vérifie si un plan Premium couvre une rareté
   * 
   * Pro : Blue, White
   * Legend : Toutes (Blue, White, Pink, Yellow)
   */
  private isPremiumCoverRarity(plan: 'pro' | 'legend', rarity: string): boolean {
    if (plan === 'legend') {
      return true; // Legend couvre tout
    }
    
    if (plan === 'pro') {
      return ['blue', 'white'].includes(rarity.toLowerCase());
    }
    
    return false;
  }

  /**
   * Achète un NFT de manière atomique (USDC + NFT ensemble)
   * 
   * Flow :
   * 1. Vérifier balance buyer
   * 2. Calculer fees
   * 3. Vérifier lock compétition (warning)
   * 4. Exécuter transaction atomique :
   *    - Transfer USDC buyer → seller
   *    - Transfer fee buyer → CyLimit
   *    - Transfer NFT seller → buyer (ou mint si primaire)
   * 5. Update DB
   * 
   * Appelé depuis : Frontend (API POST /marketplace/buy/:nftId)
   * 
   * @param buyerId - ID MongoDB du buyer
   * @param nftId - ID MongoDB du NFT
   * @param paymentMethod - 'usdc' | 'coinbase' | 'stripe'
   * @returns Transaction hash + NFT data
   */
  async buyNFT(
    buyerId: string,
    nftId: string,
    paymentMethod: 'usdc' | 'coinbase' | 'stripe'
  ): Promise<{ txHash: string; nft: NFT }> {
    try {
      // 1. Récupérer données
      const buyer = await this.userModel.findById(buyerId);
      const nft = await this.nftModel.findById(nftId);

      if (!buyer || !nft) {
        throw new BadRequestException('Buyer or NFT not found');
      }

      // 2. Vérifier disponibilité
      if (nft.marketType !== 'market' && nft.marketType !== 'primary') {
        throw new BadRequestException('NFT not for sale');
      }

      // 3. Calculer fees
      const { buyerFee, sellerFee, totalPrice } = this.calculateFees(
        [nft.marketPrice],
        [nft.rarity],
        paymentMethod,
        buyer.hasPremium,
        buyer.premiumPlan,
        nft.ownerId ? (await this.userModel.findById(nft.ownerId))?.hasPremium : false,
        nft.ownerId ? (await this.userModel.findById(nft.ownerId))?.premiumPlan : undefined,
      );

      // 4. Vérifier balance (sauf si Stripe/Coinbase, géré après)
      if (paymentMethod === 'usdc') {
        const balance = await this.walletService.getUSDCBalance(buyerId);
        
        if (balance < totalPrice) {
          throw new BadRequestException(
            `Insufficient balance: ${balance} USDC < ${totalPrice} USDC required`
          );
        }
      }

      // 5. Préparer opérations atomiques
      const operations = [];
      const cylimitWalletAddress = this.walletService.getCylimitWalletAddress();

      // Cas 1 : Achat primaire (CyLimit → Buyer)
      if (nft.marketType === 'primary') {
        // Mint NFT pour le buyer
        const mintData = this.nftContract.interface.encodeFunctionData('mint', [
          buyer.walletAddress,
          nft.tokenURI,
        ]);

        operations.push(
          // Op 1 : Transfer USDC buyer → CyLimit (prix - fee)
          {
            to: this.configService.get('USDC_CONTRACT_ADDRESS'),
            data: this.encodeUSDCTransfer(
              buyer.walletAddress,
              cylimitWalletAddress,
              nft.marketPrice
            ),
          },
          // Op 2 : Mint NFT pour buyer
          {
            to: this.configService.get('NFT_CONTRACT_ADDRESS'),
            data: mintData,
          }
        );
      } 
      // Cas 2 : Achat secondaire (User → User)
      else {
        const seller = await this.userModel.findById(nft.ownerId);

        if (!seller) {
          throw new BadRequestException('Seller not found');
        }

        // Transfer NFT existant
        const transferData = this.nftContract.interface.encodeFunctionData(
          'transferFrom',
          [seller.walletAddress, buyer.walletAddress, nft.tokenId]
        );

        operations.push(
          // Op 1 : Transfer USDC buyer → seller (prix - fee)
          {
            to: this.configService.get('USDC_CONTRACT_ADDRESS'),
            data: this.encodeUSDCTransfer(
              buyer.walletAddress,
              seller.walletAddress,
              nft.marketPrice - sellerFee
            ),
          },
          // Op 2 : Transfer fee buyer → CyLimit
          {
            to: this.configService.get('USDC_CONTRACT_ADDRESS'),
            data: this.encodeUSDCTransfer(
              buyer.walletAddress,
              cylimitWalletAddress,
              sellerFee
            ),
          },
          // Op 3 : Transfer NFT seller → buyer
          {
            to: this.configService.get('NFT_CONTRACT_ADDRESS'),
            data: transferData,
          }
        );
      }

      // 6. Exécuter transaction atomique
      this.logger.log(
        `Executing atomic NFT purchase: Buyer ${buyerId}, NFT ${nftId}, ` +
        `Price ${nft.marketPrice} USDC, Fee ${sellerFee} USDC`
      );

      const txHash = await this.walletService.executeBatchTransaction(
        buyerId,
        operations
      );

      // 7. Update DB
      nft.ownerId = buyerId;
      nft.marketType = 'none';
      nft.marketPrice = 0;
      await nft.save();

      this.logger.log(
        `NFT purchase successful: ${nftId} → ${buyerId}. TX: ${txHash}`
      );

      return { txHash, nft };
    } catch (error) {
      this.logger.error(`NFT purchase failed: ${nftId}`, error);
      throw error;
    }
  }

  /**
   * Encode un transfer USDC pour transaction atomique
   */
  private encodeUSDCTransfer(
    from: string,
    to: string,
    amount: number
  ): string {
    const usdcInterface = new ethers.utils.Interface([
      'function transferFrom(address from, address to, uint256 amount)',
    ]);

    // Convertir USDC en unités (6 decimals)
    const amountInUnits = ethers.utils.parseUnits(amount.toString(), 6);

    return usdcInterface.encodeFunctionData('transferFrom', [
      from,
      to,
      amountInUnits,
    ]);
  }

  /**
   * Liste un NFT sur le marché secondaire
   * 
   * Vérifie si le NFT est dans une compétition active
   * Si oui : Affiche warning mais autorise la vente
   * 
   * Appelé depuis : Frontend (API POST /marketplace/list)
   */
  async listNFT(
    userId: string,
    nftId: string,
    price: number
  ): Promise<{ nft: NFT; warning?: string }> {
    const nft = await this.nftModel.findById(nftId);

    if (!nft || nft.ownerId !== userId) {
      throw new BadRequestException('NFT not found or not owned by user');
    }

    // Vérifier si NFT en compétition active
    const isInActiveGame = await this.isNftInActiveGame(nftId);

    if (isInActiveGame) {
      // ✅ Warning mais autoriser la vente
      nft.marketType = 'market';
      nft.marketPrice = price;
      await nft.save();

      return {
        nft,
        warning:
          'Ce NFT est dans une équipe en compétition. Si vous le vendez, ' +
          'votre équipe sera invalidée et vous ne recevrez pas de récompenses.',
      };
    }

    // Pas de problème, listing classique
    nft.marketType = 'market';
    nft.marketPrice = price;
    await nft.save();

    return { nft };
  }

  /**
   * Vérifie si un NFT est dans une compétition active
   */
  private async isNftInActiveGame(nftId: string): Promise<boolean> {
    // TODO: Implémenter la logique avec GameTeamService
    // Vérifier si le NFT est dans une équipe d'une compétition non terminée
    return false;
  }
}
```

---

### 4. Variables d'Environnement

```bash
# .env (cylimit-backend-develop)

# ===========================
# COINBASE CDP
# ===========================
COINBASE_API_KEY_NAME=organizations/{org_id}/apiKeys/{key_id}
COINBASE_API_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----
COINBASE_CYLIMIT_WALLET_ID=<wallet_id_principal>

# ===========================
# BLOCKCHAIN
# ===========================
BLOCKCHAIN_NETWORK=polygon-mainnet
NFT_CONTRACT_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174  # USDC Polygon
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<api_key>
ALCHEMY_WEBHOOK_SECRET=<webhook_secret>

# ===========================
# FEES (Configurable)
# ===========================
# Phase Actuelle (Lancement)
BUYER_FEE_PERCENT=0          # 0% acheteur
SELLER_FEE_PERCENT=0         # 0% vendeur (% désactivé)
SELLER_FEE_FLAT=0.05         # 0.05 USDC flat toujours
STRIPE_BUYER_FEE_PERCENT=25  # 25% si Stripe
STRIPE_BUYER_FEE_MIN=0.35    # Min 0.35 USDC si Stripe

# Phase Future (Après Abonnements)
# BUYER_FEE_PERCENT=5        # 5% acheteur (si pas Premium)
# SELLER_FEE_PERCENT=5       # 5% vendeur (si pas Premium)

# ===========================
# STRIPE
# ===========================
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ===========================
# AUTRES
# ===========================
IPFS_GATEWAY=https://ipfs.io/ipfs/
```

---

## 🔄 Migration

### Étape 1 : Mise à Jour Schema User

```typescript
// src/modules/user/schemas/user.schema.ts

@Schema({ timestamps: true })
export class User {
  // ✅ Existant (garder)
  @Prop()
  walletAddress: string; // Address Ethereum/Polygon
  
  @Prop()
  totalBalance: number; // Balance USDC (mise à jour via webhooks)

  // ✅ NOUVEAU
  @Prop()
  smartAccountId: string; // ID Coinbase Smart Account
  
  @Prop()
  walletCreatedAt: Date; // Date création Smart Account
  
  // Premium (pour fees)
  @Prop({ default: false })
  hasPremium: boolean;
  
  @Prop({ enum: ['pro', 'legend'] })
  premiumPlan: string;
  
  // ❌ SUPPRIMER (sécurité)
  // @Prop()
  // privateKey: string; // ❌ Ne JAMAIS stocker en DB
  
  // @Prop()
  // publicKey: string; // ❌ Inutile avec Coinbase
}
```

**Script Migration :**

```typescript
// scripts/migrate-users-to-smart-accounts.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { UserService } from '@modules/user/services/user.service';
import { CoinbaseWalletService } from '@modules/wallet/services/coinbase-wallet.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const walletService = app.get(CoinbaseWalletService);

  // Récupérer tous les users
  const users = await userService.findAll();

  console.log(`Migrating ${users.length} users to Smart Accounts...`);

  for (const user of users) {
    try {
      // Vérifier si déjà migré
      if (user.smartAccountId) {
        console.log(`User ${user._id} already migrated, skipping`);
        continue;
      }

      // Créer Smart Account
      console.log(`Creating Smart Account for user ${user._id}...`);
      const walletAddress = await walletService.createSmartAccount(user._id);

      console.log(`✅ User ${user._id} migrated: ${walletAddress}`);
      
      // Pause pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user._id}:`, error);
    }
  }

  console.log('Migration complete!');
  await app.close();
}

bootstrap();
```

**Exécution :**

```bash
cd /Users/valentin/Desktop/CyLimit/Code\ web/cylimit-backend-develop
npm run migration:smart-accounts
```

---

### Étape 2 : Déploiement Smart Contract NFT v2

```bash
# 1. Compiler contract
npx hardhat compile

# 2. Déployer sur Mumbai (testnet)
npx hardhat run scripts/deploy-nft-v2.ts --network mumbai

# 3. Tester sur Mumbai
npm run test:marketplace

# 4. Audit (optionnel mais recommandé pour production)
# Contacter : OpenZeppelin, CertiK, ou Trail of Bits
# Coût : 5-10k€

# 5. Déployer sur Polygon Mainnet
npx hardhat run scripts/deploy-nft-v2.ts --network polygon

# 6. Vérifier sur PolygonScan
npx hardhat verify --network polygon <CONTRACT_ADDRESS>
```

---

### Étape 3 : Migration NFTs Existants

```typescript
// scripts/migrate-existing-nfts.ts

/**
 * Migrer les NFTs existants vers le nouveau contract v2
 * 
 * Flow :
 * 1. Pour chaque NFT en DB
 * 2. Si pas encore mint on-chain : mint sur contract v2
 * 3. Si déjà mint : transfer depuis ancien contract vers v2 (impossible si ownership différent)
 * 4. Update DB avec nouveau tokenId/contract
 */

async function migrateNFTs() {
  const nfts = await NFTModel.find({ tokenId: { $exists: false } });

  for (const nft of nfts) {
    try {
      // Mint NFT sur nouveau contract
      const tx = await nftContractV2.mint(
        nft.ownerId.walletAddress,
        nft.tokenURI
      );
      
      await tx.wait();
      
      // Update DB
      nft.tokenId = tx.events.find(e => e.event === 'NFTMinted').args.tokenId;
      nft.contractAddress = NFT_CONTRACT_V2_ADDRESS;
      await nft.save();
      
      console.log(`✅ NFT ${nft._id} migrated`);
    } catch (error) {
      console.error(`❌ NFT ${nft._id} failed:`, error);
    }
  }
}
```

---

### Étape 4 : Tests

```typescript
// test/marketplace.e2e-spec.ts

describe('Marketplace (e2e)', () => {
  it('should buy NFT atomically with USDC', async () => {
    // 1. Créer buyer avec Smart Account
    const buyer = await createTestUser();
    await walletService.createSmartAccount(buyer._id);
    
    // 2. Déposer 100 USDC
    await depositUSDC(buyer.walletAddress, 100);
    
    // 3. Acheter NFT
    const result = await marketplaceService.buyNFT(
      buyer._id,
      nftId,
      'usdc'
    );
    
    // 4. Vérifier résultat
    expect(result.txHash).toBeDefined();
    expect(result.nft.ownerId).toEqual(buyer._id);
    
    // 5. Vérifier on-chain
    const owner = await nftContract.ownerOf(result.nft.tokenId);
    expect(owner).toEqual(buyer.walletAddress);
  });
  
  it('should prevent non-atomic state (all or nothing)', async () => {
    // Simuler erreur pendant TX
    jest.spyOn(nftContract, 'transferFrom').mockRejectedValue(new Error('Gas limit'));
    
    // Essayer achat
    await expect(
      marketplaceService.buyNFT(buyer._id, nftId, 'usdc')
    ).rejects.toThrow();
    
    // Vérifier : RIEN ne s'est passé
    const buyerBalance = await walletService.getUSDCBalance(buyer._id);
    expect(buyerBalance).toEqual(100); // Toujours 100 USDC
    
    const nft = await NFTModel.findById(nftId);
    expect(nft.ownerId).not.toEqual(buyer._id); // Toujours seller
  });
});
```

---

## 💰 Coûts & Timeline

### Coûts

| Poste | Montant | Fréquence | Notes |
|-------|---------|-----------|-------|
| **Développement** | 0€ | Une fois | Interne |
| **Smart Contract Deploy** | ~50€ | Une fois | Gas Polygon mainnet |
| **Smart Account / User** | 0.05 USDC | Par user actif | Déploiement lazy |
| **Gas Sponsoring** | ~0.01 USDC | Par transaction | Optionnel |
| **Coinbase CDP** | 0€ | Mensuel | Gratuit jusqu'à 10k TX/mois |
| **Alchemy RPC** | 0€ | Mensuel | Plan gratuit OK |
| **IPFS (Pinata)** | 20€ | Mensuel | Stockage metadata |
| **Audit (optionnel)** | 5-10k€ | Une fois | Si budget disponible |

**Estimation 1ère année (10 000 users actifs) :**
- Smart Accounts : 10 000 × 0.05 USDC = 500 USDC (~450€)
- Gas sponsoring : 50 000 TX × 0.01 USDC = 500 USDC (~450€)
- IPFS : 20€ × 12 = 240€
- **Total : ~1 140€** (sans audit)

---

### Timeline

| Phase | Durée | Tâches |
|-------|-------|--------|
| **Semaine 1-2** | 2 sem | - Setup Coinbase CDP<br>- Développer CoinbaseWalletService<br>- Tests unitaires |
| **Semaine 3** | 1 sem | - Développer MarketplaceService<br>- Intégrer calcul fees dynamique<br>- Tests atomicité |
| **Semaine 4** | 1 sem | - Développer Smart Contract NFT v2<br>- Déployer sur Mumbai testnet<br>- Tests on-chain |
| **Semaine 5** | 1 sem | - Frontend : Intégrer 3 options paiement<br>- Frontend : UI fees/warnings<br>- Tests E2E |
| **Semaine 6** | 1 sem | - Migration DB (Smart Accounts)<br>- Migration NFTs existants<br>- Tests migration |
| **Semaine 7** | 1 sem | - Déploiement Polygon mainnet<br>- Tests production<br>- Monitoring |
| **Semaine 8** | 1 sem | - Documentation<br>- Formation équipe<br>- Go-live progressif |

**Total : 8 semaines**

---

## ❓ FAQ

### 1. Pourquoi Coinbase CDP plutôt qu'un Smart Contract custom ?

**Réponse :**
- ✅ Sécurité : ERC-4337 déjà audité par Coinbase
- ✅ Rapidité : Pas besoin de coder/auditer Solidity custom
- ✅ Économique : Pas de coût audit (5-10k€ économisés)
- ✅ Flexible : Ajout facile de nouvelles fonctionnalités
- ✅ Support : Documentation + équipe Coinbase

---

### 2. Pourquoi les fees Stripe ne sont pas annulables avec Premium ?

**Réponse :**
Stripe facture CyLimit **directement** (~3% + frais Coinbase pour acheter USDC). Ce n'est pas une fee CyLimit, donc Premium ne peut pas l'annuler.

**Analogie :**
C'est comme un abonnement Netflix qui te donne des films gratuits, mais tu paies quand même ta connexion internet. Netflix ne peut pas annuler les frais de ton FAI.

**Solution :**
Encourager users à utiliser Coinbase Onramp (3.5%) plutôt que Stripe (25%).

---

### 3. Que se passe-t-il si CyLimit ferme ?

**Réponse :**
1. CyLimit active `emergencyMode()` dans le Smart Contract
2. Tous les NFTs deviennent librement transférables
3. Users peuvent :
   - Retirer leurs USDC vers wallet externe
   - Transférer leurs NFTs vers wallet externe
   - Voir leurs NFTs sur OpenSea/MetaMask
   - Potentiellement les vendre sur OpenSea

**Code :**

```solidity
// Activer mode urgence (seulement owner = CyLimit)
function activateEmergencyMode() external onlyOwner {
    emergencyMode = true;
    emit EmergencyModeActivated(block.timestamp);
}

// Après activation : transferFrom/safeTransferFrom libres
```

---

### 4. Les NFTs sont-ils vraiment "sur la blockchain" ?

**Réponse :**
✅ **OUI**, 100% on-chain :
- NFT : ERC-721 standard sur Polygon
- Ownership : Stocké dans le Smart Contract (immutable)
- Metadata : IPFS (décentralisé)
- USDC : ERC-20 standard sur Polygon

La DB MongoDB est juste un **cache** pour performance, mais la source de vérité est la blockchain.

---

### 5. Pourquoi bloquer les transferts externes si les NFTs sont "décentralisés" ?

**Réponse :**
C'est un choix de **design de produit**, pas technique :
- ✅ CyLimit cible les **fans de vélo** (non-crypto)
- ✅ Évite complexité sync DB ↔ OpenSea
- ✅ Évite frais incontrôlables sur autres plateformes
- ✅ Permet système abonnements Premium

**Précédent :** NBA Top Shot (500M$ de volume) fait pareil.

**Mais :**
- ✅ NFTs restent visibles sur OpenSea/MetaMask (lecture seule)
- ✅ Mode urgence permet déblocage si CyLimit ferme
- ✅ Users gardent ownership réel (blockchain)

---

### 6. Comment gérer les remboursements ?

**Réponse :**

**Cas 1 : Remboursement Stripe**
```typescript
// Remboursement classique Stripe
await stripe.refunds.create({
  payment_intent: paymentIntentId,
});

// Pas besoin de rollback blockchain (NFT jamais transféré)
```

**Cas 2 : Remboursement après transaction atomique**
```typescript
// Transaction inverse
await marketplaceService.executeBatchTransaction(sellerId, [
  // 1. Renvoyer USDC seller → buyer
  transferUSDC(seller, buyer, nft.marketPrice),
  
  // 2. Renvoyer NFT buyer → seller
  transferNFT(buyer, seller, tokenId),
]);
```

---

### 7. Peut-on faire des promotions / codes promo ?

**Réponse :**
✅ **OUI**, facilement via backend :

```typescript
// Appliquer code promo
if (promoCode === 'WELCOME10') {
  nft.marketPrice *= 0.9; // -10%
}

// Transaction normale ensuite
await marketplaceService.buyNFT(buyerId, nftId, 'usdc');
```

Pas besoin de modifier le Smart Contract, tout est géré backend.

---

### 8. Peut-on offrir des NFTs gratuits ?

**Réponse :**
✅ **OUI** :

```typescript
// Mint NFT directement pour le user (pas de paiement)
await nftContract.mint(userWalletAddress, tokenURI);

// Update DB
await NFTModel.create({
  ownerId: userId,
  tokenId: ...,
  marketType: 'none',
  marketPrice: 0,
});
```

**Coût CyLimit :** Juste le gas (~0.01 USDC).

---

### 9. Peut-on faire des enchères (auctions) ?

**Réponse :**
✅ **OUI**, mais en **Phase 2** (après lancement) :

```typescript
// Créer enchère
await AuctionModel.create({
  nftId,
  startPrice: 10,
  endDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
});

// Placer enchère
await BidModel.create({
  auctionId,
  bidderId,
  amount: 15,
});

// À la fin : Transaction atomique winner
await marketplaceService.buyNFT(winnerId, nftId, 'usdc');
```

---

### 10. Peut-on faire des packs / bundles ?

**Réponse :**
✅ **OUI**, transaction atomique parfaite pour ça :

```typescript
// Acheter pack de 10 NFTs
await marketplaceService.executeBatchTransaction(buyerId, [
  // 1. Transfer USDC buyer → CyLimit
  transferUSDC(buyer, cylimit, totalPrice),
  
  // 2-11. Mint 10 NFTs pour le buyer
  ...nfts.map(nft => mintNFT(buyer, nft.tokenURI)),
]);

// ✅ Atomique : Soit les 10 NFTs, soit rien
```

---

## 🎉 Conclusion

Ce système offre :
- ✅ **Sécurité maximale** (Coinbase CDP + transactions atomiques)
- ✅ **Simplicité** (pas de Solidity custom, pas d'audit requis)
- ✅ **Flexibilité** (3 options paiement, fees dynamiques, Premium)
- ✅ **UX optimale** (gas sponsoring, pas de clés privées)
- ✅ **Économique** (~1 140€/an pour 10k users)
- ✅ **Évolutif** (enchères, packs, promos facilement ajoutables)

**Prêt pour développement !** 🚀

---

**Document maintenu par :** Valentin  
**Dernière mise à jour :** 2 octobre 2025  
**Version :** 1.0 Finale

