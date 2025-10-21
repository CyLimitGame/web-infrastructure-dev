# 📚 INDEX - MIGRATION VERS BASE

**Date :** 21 Octobre 2025  
**Status :** ✅ DOCUMENTATION COMPLÈTE

---

## 🚨 AVERTISSEMENT CRITIQUE : CDP SDK V2 UNIQUEMENT

**⚠️ RÈGLE ABSOLUE : TOUJOURS UTILISER CDP SDK V2**

Avant de commencer, **LIS IMPÉRATIVEMENT** :

📖 **[CDP-SDK-V2-UNIQUEMENT.md](./CDP-SDK-V2-UNIQUEMENT.md)** ← **CRITIQUE** 🔴

**Points clés :**
- ❌ **NE JAMAIS** utiliser `@coinbase/coinbase-sdk` (v1)
- ✅ **TOUJOURS** utiliser `@coinbase/cdp-sdk` (v2)
- ❌ **INTERDIT** : `wallet.invokeContract()`, `Coinbase.configureFromJson()`
- ✅ **CORRECT** : `cdp.evm.sendTransaction()`, `encodeFunctionData()`

**Tests validés :**
✅ **[TESTS-REUSSIS-CDP-V2.md](./TESTS-REUSSIS-CDP-V2.md)** ← Proof of concept testnet

**Tous les exemples ci-dessous utilisent exclusivement CDP SDK v2.**

---

## 🎯 PAR OÙ COMMENCER ?

### 🚀 **Tu veux comprendre la migration complète ?**
1. 📖 **[MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md)** ← **START HERE** 🌟
   - Vue d'ensemble (Étapes 1-6)
   - Création Master Server Wallet
   - Bridge USDC Polygon → Base
   - Mint 31,450 NFTs sur Base
   - Migration auto des users

### 🏪 **Tu veux comprendre le marché primaire (CyLimit → Users) ?**
2. 🛍️ **[PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)**
   - Achat direct (USDC ou CB)
   - Enchères avec auto-bid
   - Batch transactions
   - Paymaster sponsoring

### 🔄 **Tu veux comprendre le marché secondaire (Users ↔ Users) ?**
3. 🤝 **[SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)**
   - Vente classique (listing + achat)
   - Offres 1-to-1 (buy/swap unifiées)
   - Collection offers publiques (filtres)

### 📜 **Tu veux comprendre le smart contract Marketplace ?**
4. 🔐 **[CONTRAT-MARKETPLACE-V2-BASE.md](./CONTRAT-MARKETPLACE-V2-BASE.md)**
   - **Architecture ultra-simple** (3 fonctions escrow)
   - Escrow USDC générique réutilisable
   - Exemples complets (enchères, offers, swaps)
   - Logique métier en backend
   - Checklist déploiement

---

## 📁 DOCUMENTATION PAR THÈME

### 🔑 MIGRATION & SETUP

| Document | Description | Durée |
|----------|-------------|-------|
| **[MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md)** | Guide complet migration Polygon → Base | 3-5 jours |
| **[CONTRAT-MARKETPLACE-V2-BASE.md](./CONTRAT-MARKETPLACE-V2-BASE.md)** | Contrat simplifié (escrow générique) | - |
| **[GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md](./GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md)** | ✨ **Guide dev local (testnet)** | 7 jours |

**Contenu Migration :**
- ✅ Configuration environnement Base
- ✅ Création Master Server Wallet (CDP)
- ✅ Déploiement contrats (NFT v2 + Marketplace)
- ✅ Bridge USDC (Polygon → Base)
- ✅ Mint 31,450 NFTs (GRATUIT avec CDP)
- ✅ Migration auto users (USDC + NFTs)

**Contenu Guide Dev Local :**
- ✅ **Architecture testnet/mainnet** (même code, env variable)
- ✅ **Phase 5 : Paymaster** (2h)
- ✅ **Phase 6 : Backend** (2j) - CoinbaseService, MarketplaceService
- ✅ **Phase 7 : Frontend** (3j) - Config, Hooks, Components
- ✅ **Phase 8 : Tests** (2j) - Plan de tests complet
- ✅ **Passage en production** (checklist)

**Contenu Contrat :**
- ✅ **3 fonctions escrow réutilisables** (simple & flexible)
- ✅ Logique métier en backend (enchères, offers, swaps)
- ✅ Exemples complets TypeScript
- ✅ Security & best practices

**Économie Migration :** ~$1,150 → $4 = **99.7% moins cher !** 🎉  
**Économie Marketplace :** Users paient **$0**, CyLimit ~$2-3/mois 🎉

---

### 🏪 MARCHÉ PRIMAIRE (CyLimit Vend)

| Document | Description | Cas d'usage |
|----------|-------------|-------------|
| **[PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)** | CyLimit vend ses NFTs aux users | Vente directe + Enchères |

**Contenu :**
- ✅ **Achat direct** (prix fixe)
  - Paiement USDC (batch transaction)
  - Paiement CB (Stripe + transfer)
- ✅ **Enchères avec escrow** (auto-bid intelligent)
  - Enchère USDC → Escrow on-chain obligatoire
  - Enchère CB → Pré-autorisation Stripe
  - Système d'enchère max (auto-bid)
  - Refund surplus automatique
  - **Architecture : Enchères = P2P entre User et CyLimit**

**Coût CyLimit :** ~$3.50/mois (1000 ventes + 100 enchères) 🎉

---

### 🔄 MARCHÉ SECONDAIRE (Users ↔ Users)

| Document | Description | Cas d'usage |
|----------|-------------|-------------|
| **[SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)** | Users échangent NFTs entre eux | 5 mécanismes |

**Contenu :**
- ✅ **Vente classique** → **Listing en DB** ($0 gas)
- ✅ **Offres 1-to-1 unifiées** → Buy/Swap (1 fonction générique)
- ✅ **Collection Offers publiques** → Offres ouvertes à tous (filtres)
- ✅ **Architecture escrow générique** → 3 fonctions réutilisables

**Coût Users :** **$0** (100% sponsorisé) 🎉  
**Coût CyLimit :** ~$2-3/mois (1000 transactions) 🎉

---

## 🎯 PAR RÔLE

### 🔧 **Tu es DÉVELOPPEUR BACKEND ?**

**Lis dans cet ordre :**
1. [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md) (sections 1-2)
2. [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)
3. [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)

**Focus sur :**
- Configuration CDP SDK
- Création Server Wallet
- Batch transactions (Smart Accounts)
- Event listeners (marketplace)
- Validation traits (collection offers)

---

### 📜 **Tu es DÉVELOPPEUR SMART CONTRACT ?**

**Lis dans cet ordre :**
1. [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md) (section 3)
2. [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md) (sections escrow)
3. [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md) (section enchères)

**Focus sur :**
- Déploiement sur Base
- Whitelisting (NFT + Marketplace)
- Escrow USDC (buy offers, collection offers)
- Swap P2P (sans escrow)
- Gas optimizations

---

### 🎨 **Tu es DÉVELOPPEUR FRONTEND ?**

**Lis dans cet ordre :**
1. [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)
2. [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)
3. [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md) (section 6)

**Focus sur :**
- Interfaces achat (USDC vs CB)
- Batch transactions (1 signature)
- Auto-bid enchères
- Collection offers (traits)
- Gas sponsorisé (affichage)

---

### 👔 **Tu es ADMIN / OPS ?**

**Lis dans cet ordre :**
1. [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md) ← **Tout lire !**
2. [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md) (section enchères)
3. [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md) (résumé)

**Focus sur :**
- Checklist migration (17 étapes)
- Configuration Paymaster
- Monitoring coûts
- Tests avant production

---

## 📊 COMPARAISON COÛTS

### **Migration 1000 Users**

| Opération | Polygon | Base | Économie |
|-----------|---------|------|----------|
| **Mint 31,450 NFTs** | $1,000 | **$0** | **-100%** 🎉 |
| **Migration USDC** | $38 | **$0** | **-100%** 🎉 |
| **Migration NFTs** | $114 | **$2** | **-98.2%** 🎉 |
| **TOTAL** | **$1,152** | **$2** | **-99.8%** 🎉 |

### **Coûts Mensuels Marketplace**

| Opération | Polygon | Base | Économie |
|-----------|---------|------|----------|
| **Marché primaire** | $25 | **$3.50** | **-86%** |
| **Marché secondaire** | $44 | **$3** | **-93%** |
| **TOTAL/MOIS** | **$69** | **$6.50** | **-91%** |

**Économie annuelle : ~$750/an** 💰

**Bonus :**
- ✅ **Listings en DB** → $0 (pas de blockchain)
- ✅ **Escrow USDC sécurisé** → Smart contract

---

## 🔄 WORKFLOWS CLÉS

### **1. Migration Complète (1 fois)**

```bash
# Étape 1 : Configuration
cd cylimit-admin-backend
npm install @coinbase/coinbase-sdk

# Étape 2 : Créer Master Wallet
node scripts/create-master-server-wallet.cjs

# Étape 3 : Déployer contrats
node scripts/deploy-nft-v2-base-mainnet.cjs
node scripts/deploy-marketplace-v2-base-mainnet.cjs

# Étape 4 : Bridge USDC
# Via https://bridge.base.org/ (manuel)

# Étape 5 : Mint NFTs
node scripts/prepare-nfts-for-base-remint.cjs
node scripts/remint-nfts-base-batch.cjs

# Durée totale : 3-5 jours
# Coût total : $4 (au lieu de $1,152 sur Polygon)
```

### **2. Achat Direct User (Quotidien)**

```typescript
// User paie USDC (batch)
POST /primary-market/buy
{
  nftId: "507f1f77bcf86cd799439011",
  paymentMethod: "usdc"
}

// Résultat :
// - 1 signature user
// - USDC + NFT en 1 batch
// - Gas : $0 (sponsorisé)
// - Durée : ~5 secondes
```

### **3. Enchère Auto-Bid (Ponctuel)**

```typescript
// User définit enchère max
POST /auctions/:id/bid
{
  maxBid: 200, // USDC ou EUR
  paymentMethod: "usdc" // ou "card"
}

// Système auto-bid :
// - Si quelqu'un enchérit 180 → Auto-bid 181
// - Si quelqu'un enchérit 210 → User dépassé
// - Si user gagne à 181 → Refund 19 USDC/EUR
```

### **4. Swap P2P (Ponctuel)**

```typescript
// User A propose swap
POST /marketplace/swap/create
{
  offeredNFTs: [123],
  requestedNFTs: [456],
  usdcAmount: 50,
  usdcFromInitiator: true,
  targetUserId: "507f..."
}

// User B accepte (batch)
POST /marketplace/swap/accept/:id
// → USDC + NFTs échangés en 1 tx
// → Gas : $0 (sponsorisé)
```

---

## ✅ CHECKLIST COMPLÈTE

### **Phase 1 : Préparation** (1 jour)
- [ ] Créer compte CDP (portal.cdp.coinbase.com)
- [ ] Obtenir API Keys CDP
- [ ] Installer dépendances (@coinbase/coinbase-sdk)
- [ ] Configurer .env avec variables Base

### **Phase 2 : Setup Wallet** (2 heures)
- [ ] Créer Master Server Wallet (CDP)
- [ ] Sauvegarder Wallet ID
- [ ] Financer wallet testnet (tests)
- [ ] Vérifier connexion CDP

### **Phase 3 : Déploiement Contrats** (4 heures)
- [x] Déployer CyLimitNFT_v2 sur Base testnet
- [ ] **⚠️ VÉRIFIER IMMÉDIATEMENT le NFT sur Basescan (plugin Remix)** ← CRITIQUE !
- [ ] Déployer CyLimitMarketplace_v2_Base sur Base testnet
- [ ] **⚠️ VÉRIFIER IMMÉDIATEMENT le Marketplace sur Basescan (plugin Remix)** ← CRITIQUE !
- [ ] Tester toutes fonctions (buy, swap, offers, auctions)
- [ ] Vérifier escrow USDC
- [ ] Déployer sur Base mainnet
- [ ] **🔴 VÉRIFIER IMMÉDIATEMENT le NFT mainnet sur Basescan** ← CRITIQUE !
- [ ] **🔴 VÉRIFIER IMMÉDIATEMENT le Marketplace mainnet sur Basescan** ← CRITIQUE !
- [ ] Whitelist Master Wallet + Marketplace
- [ ] Double-check que les contrats sont bien vérifiés publiquement

### **Phase 4 : Migration Données** (1 jour)
- [ ] Bridge USDC (Polygon → Base)
- [ ] Préparer données NFTs (MongoDB)
- [ ] Mint 31,450 NFTs sur Base
- [ ] Vérifier totalSupply on-chain
- [ ] Mettre à jour MongoDB

### **Phase 5 : Configuration Paymaster** (2 heures)
- [ ] Activer Paymaster sur CDP Portal
- [ ] Allowlist CyLimitNFT_v2 (toutes fonctions)
- [ ] Allowlist CyLimitMarketplace (toutes fonctions)
- [ ] Configurer limites ($100/mois)
- [ ] Tester sponsoring sur testnet

### **Phase 6 : Backend Services** (2 jours)
- [ ] Implémenter MarketplaceService
- [ ] Implémenter PrimaryMarketService
- [ ] Implémenter AuctionService
- [ ] Implémenter event listeners
- [ ] Implémenter validation traits
- [ ] Tester tous endpoints

### **Phase 7 : Frontend** (3 jours)
- [ ] Interfaces marché primaire (achat + enchères)
- [ ] Interfaces marché secondaire (5 cas)
- [ ] Affichage gas sponsorisé
- [ ] Tests E2E
- [ ] UX mobile

### **Phase 8 : Tests Production** (2 jours)
- [ ] Tester migration 1 user
- [ ] Tester achat direct (USDC + CB)
- [ ] Tester enchère auto-bid
- [ ] Tester swap P2P
- [ ] Tester buy offer
- [ ] Tester collection offer
- [ ] Valider taux succès > 95%

### **Phase 9 : Production** (1 jour)
- [ ] Activer migration automatique
- [ ] Publier annonce frontend
- [ ] Monitorer logs (Slack alerts)
- [ ] Suivre métriques (dashboard)
- [ ] Support users

---

## 🎉 RÉSUMÉ DES AVANTAGES BASE

### **Économies**
1. ✅ **Migration : -99.8%** ($1,152 → $2)
2. ✅ **Marketplace : -91%** ($69/mois → $6.50/mois)
3. ✅ **Économie annuelle : ~$750**

### **Fonctionnalités**
4. ✅ **USDC gratuit** (CDP Server Wallet)
5. ✅ **NFTs gratuits** (mint + transfers)
6. ✅ **Paymaster** (sponsoring gas)
7. ✅ **Batch transactions** (1 signature)
8. ✅ **Paiement gas en USDC** (pas d'ETH requis)
9. ✅ **Listings en DB** ($0 gas pour lister)
10. ✅ **Escrow USDC générique** (3 fonctions réutilisables)
11. ✅ **Logique métier backend** (flexibilité maximale)

### **UX**
12. ✅ **Embedded Wallets** (email/social login)
13. ✅ **Smart Accounts** (ERC-4337)
14. ✅ **0 friction** (gas sponsorisé)
15. ✅ **Écosystème Coinbase natif**

---

## 📞 SUPPORT

**Questions sur la migration ?**
→ [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md)

**Questions sur le marché primaire ?**
→ [PRIMARY-MARKET-CYLIMIT-USERS.md](./PRIMARY-MARKET-CYLIMIT-USERS.md)

**Questions sur le marché secondaire ?**
→ [SECONDARY-MARKET-USERS-TO-USERS.md](./SECONDARY-MARKET-USERS-TO-USERS.md)

**Questions sur le smart contract ?**
→ [CONTRAT-MARKETPLACE-V2-BASE.md](./CONTRAT-MARKETPLACE-V2-BASE.md)

**Questions sur Paymaster ?**
→ https://docs.cdp.coinbase.com/paymaster/

**Questions sur CDP SDK ?**
→ https://docs.cdp.coinbase.com/

---

**Maintenu par :** Équipe CyLimit  
**Date :** 16 Octobre 2025  
**Version :** 1.0.0

---

## 🚀 PRÊT À DÉMARRER ?

**Étape suivante :** Lire [MIGRATION-POLYGON-BASE.md](./MIGRATION-POLYGON-BASE.md) en entier ! 🌟

