# 📝 RÉSUMÉ - DÉVELOPPEMENT LOCAL (Testnet Base Sepolia)

**Date :** 21 Octobre 2025  
**Status :** ✅ READY TO START  
**Guide complet :** [GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md](./GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md)

---

## 🎯 PRINCIPE CLÉ

**On développe EXACTEMENT comme pour la production**, mais avec une **variable d'environnement** qui bascule automatiquement entre testnet et mainnet :

```typescript
const isProduction = process.env.NODE_ENV === 'production';

const nftContract = isProduction
  ? process.env.NFT_V2_CONTRACT_ADDRESS      // Mainnet
  : process.env.TESTNET_NFT_V2_CONTRACT_ADDRESS; // Testnet
```

**Résultat :**
- ✅ En **dev local** : Testnet Base Sepolia (`0x012ab34...`)
- ✅ En **production** : Mainnet Base (après déploiement)
- ✅ **Même code** pour les deux !

---

## 📋 PHASES À DÉVELOPPER

| Phase | Durée | Description |
|-------|-------|-------------|
| **Phase 5 : Paymaster** | 2h | Configurer gas sponsoring CDP Portal |
| **Phase 6 : Backend** | 2j | Services (Coinbase, Marketplace, NFT) |
| **Phase 7 : Frontend** | 3j | Config, Hooks, Components |
| **Phase 8 : Tests** | 2j | Tests E2E en local avec testnet |
| **TOTAL** | **7 jours** | Développement complet |

---

## ✅ STATUS ACTUEL

### **✅ Déjà fait**
- [x] NFT v2 déployé sur testnet (`0x012ab34A520638C0aA876252161c6039343741A4`)
- [x] 3 NFTs mintés sur testnet (tests)
- [x] Métadonnées sur Pinata IPFS
- [x] Documentation complète

### **🚧 À faire maintenant**
- [ ] **Déployer Marketplace v2 sur testnet** (Remix IDE)
- [ ] **⚠️ VÉRIFIER IMMÉDIATEMENT sur Basescan** (plugin Remix)
- [ ] **Configurer Paymaster** (CDP Portal)
- [ ] **Développer backend** (Phase 6)
- [ ] **Développer frontend** (Phase 7)
- [ ] **Tester E2E** (Phase 8)

---

## 🔧 PHASE 5 : PAYMASTER (2 heures)

**Objectif :** Sponsoriser le gas des users

### **Étapes**

1. **Activer Paymaster** sur https://portal.cdp.coinbase.com/
   - Network : Base Sepolia
   - Enable Paymaster : ✅

2. **Allowlist les contrats**
   ```
   NFT Contract : 0x012ab34A520638C0aA876252161c6039343741A4
   - transferFrom()
   - safeTransferFrom()
   - setApprovalForAll()
   
   Marketplace : 0x... (après déploiement)
   - escrowUSDC()
   - buyNFT()
   
   USDC : 0x036CbD53842c5426634e7929541eC2318f3dCF7e
   - transfer()
   - transferFrom()
   - approve()
   ```

3. **Limites**
   - Global : $100/mois (testnet)
   - Per-User : $5/mois

4. **Obtenir Paymaster URL**
   ```
   PAYMASTER_URL_TESTNET=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...
   ```

---

## 💻 PHASE 6 : BACKEND (2 jours)

**Objectif :** Services blockchain + API marketplace

### **Fichiers à créer**

```
cylimit-admin-backend/src/
├── config/
│   └── blockchain.config.ts       ← Config testnet/mainnet
├── modules/
│   ├── coinbase/
│   │   ├── coinbase.service.ts    ← CDP SDK v2
│   │   └── coinbase.module.ts
│   └── marketplace/
│       ├── marketplace.service.ts ← Listings + Achats
│       ├── marketplace.controller.ts
│       └── marketplace.module.ts
```

### **Endpoints API**

- `POST /marketplace/list` - Lister NFT (DB, $0 gas)
- `POST /marketplace/buy/:id` - Acheter NFT (batch, sponsorisé)
- `GET /marketplace/my-listings` - Mes listings

---

## 🎨 PHASE 7 : FRONTEND (3 jours)

**Objectif :** Interface marketplace

### **Composants à créer**

```
cylimit-admin-frontend/src/
├── config/
│   └── blockchain.config.ts       ← Config testnet/mainnet
├── hooks/
│   └── useMarketplace.ts          ← Hook API
└── features/
    └── marketplace/
        ├── ListNFT.tsx            ← Formulaire listing
        ├── BuyNFT.tsx             ← Bouton achat
        └── MyListings.tsx         ← Liste des listings
```

### **Variables .env.local**

```bash
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_TESTNET_NFT_CONTRACT=0x012ab34A520638C0aA876252161c6039343741A4
NEXT_PUBLIC_TESTNET_MARKETPLACE_CONTRACT=0x... (après déploiement)
```

---

## 🧪 PHASE 8 : TESTS (2 jours)

**Objectif :** Valider tout en local avec testnet

### **Plan de tests**

1. **Test 1 : Config blockchain** ✅
   - Vérifier logs backend (network, contracts)

2. **Test 2 : Lire NFTs testnet** ✅
   - Script : `scripts/base/testnet/3-read-nft-metadata.cjs`

3. **Test 3 : Lister NFT** ($0 gas)
   - API : `POST /marketplace/list`
   - Vérif : MongoDB uniquement, pas de blockchain

4. **Test 4 : Acheter NFT** (sponsorisé)
   - API : `POST /marketplace/buy/:id`
   - Vérif : Transaction Basescan Sepolia

5. **Test 5 : Frontend E2E**
   - Login → Lister → Acheter
   - Vérifier changement ownership

---

## 🚀 PASSAGE EN PRODUCTION

**Quand tous les tests passent :**

### **1. Déployer sur mainnet**
```bash
# Déployer NFT v2 sur Base Mainnet
# Déployer Marketplace v2 sur Base Mainnet
# ⚠️ VÉRIFIER IMMÉDIATEMENT sur Basescan !
```

### **2. Update .env.production**
```bash
NODE_ENV=production
NFT_V2_CONTRACT_ADDRESS=0x... (mainnet)
MARKETPLACE_V2_CONTRACT_ADDRESS=0x... (mainnet)
```

### **3. Tester avec 1 NFT réel**
- [ ] Mint 1 NFT test
- [ ] Lister à 1 USDC
- [ ] Acheter
- [ ] ✅ Si OK → Migration complète

---

## 📊 CHECKLIST RAPIDE

### **🔴 Urgent (avant de coder)**
- [ ] Déployer Marketplace v2 testnet
- [ ] Vérifier contrat Basescan
- [ ] Configurer Paymaster CDP
- [ ] Tester Paymaster URL

### **🟡 Backend (2j)**
- [ ] Config blockchain
- [ ] CoinbaseService (CDP v2)
- [ ] MarketplaceService
- [ ] 3 endpoints API

### **🟢 Frontend (3j)**
- [ ] Config blockchain
- [ ] Hook useMarketplace
- [ ] Composant ListNFT
- [ ] Composant BuyNFT

### **🔵 Tests (2j)**
- [ ] Tests 1-5 validés
- [ ] Taux succès > 95%

---

## 💡 POINTS CLÉS

1. **✅ Même code dev/prod** → Variable d'environnement
2. **✅ Testnet gratuit** → Tests illimités
3. **✅ Paymaster** → Gas sponsorisé ($0 pour users)
4. **✅ Listings DB** → $0 pour lister
5. **✅ 7 jours** → Développement complet

---

**🎯 Prochaine étape : Déployer Marketplace v2 sur testnet ! 🚀**

**Guide complet :** [GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md](./GUIDE-DEVELOPPEMENT-LOCAL-TESTNET.md)

