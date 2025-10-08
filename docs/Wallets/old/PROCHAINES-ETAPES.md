# 🚀 Prochaines Étapes - Système Wallets CyLimit

**Date :** 6 octobre 2025  
**Statut :** ⭐ Guide actionnable - À LIRE EN PREMIER

---

## ✅ Ce qui a été fait (Semaine 1)

- ✅ **Architecture définie** (Coinbase Smart Accounts)
- ✅ **Smart Contract créé** (`CyLimitNFT_v2.sol`)
- ✅ **Documentation complète** (Hardhat remplacé par thirdweb)
- ✅ **Nettoyage effectué** (fichiers Hardhat supprimés)
- ✅ **Système de fees clarifié** (Phase 1 vs Phase 2)

---

## 🚀 Ce qu'il reste à faire

### Étape 1 : Configuration Comptes (30 min)

#### A. Créer compte Coinbase CDP

1. Va sur https://portal.cdp.coinbase.com/
2. Crée un compte Coinbase Developer
3. Crée un projet "CyLimit Dev"
4. Va dans "Settings" > "API Keys"
5. Clique sur "Create API Key"
6. Note les 3 valeurs :
   - **Nickname** (nom de ta clé)
   - **API Key ID** (ex: `organizations/xxx/apiKeys/yyy`)
   - **API Secret** (commence par `-----BEGIN EC PRIVATE KEY-----`)
7. **IMPORTANT** : Garde ces clés en sécurité !

**⚠️ L'API Secret ne sera affiché qu'une seule fois !**

**Ce que tu vas recevoir :**
```
Nickname: cylimit-dev
API Key ID: organizations/xxx/apiKeys/yyy
API Secret: -----BEGIN EC PRIVATE KEY-----
...
-----END EC PRIVATE KEY-----
```

#### B. Configurer Alchemy (si pas déjà fait)

1. Va sur https://www.alchemy.com/
2. Crée une app "CyLimit Dev" sur **Polygon Amoy** (nouveau testnet)
3. Note l'API Key et le RPC URL

**⚠️ IMPORTANT : Mumbai est déprécié, utilise Amoy**

**Ce que tu vas recevoir :**
```
API Key: xxxxxxxxxxxxx
RPC URL: https://polygon-amoy.g.alchemy.com/v2/xxxxxxxxxxxxx
```

---

### Étape 2 : Configuration `.env` (10 min)

**Fichier : `cylimit-backend-develop/.env`**

Ajoute ces nouvelles variables :

```bash
# ===========================
# COINBASE CDP (DEV)
# ===========================
COINBASE_API_KEY_NAME=<TON_API_KEY_ID>  # Ex: organizations/xxx/apiKeys/yyy
COINBASE_API_KEY_PRIVATE_KEY=<TON_API_SECRET>  # Commence par -----BEGIN EC PRIVATE KEY-----
COINBASE_WALLET_ID=  # Vide, sera généré automatiquement

# ===========================
# BLOCKCHAIN (DEV - AMOY)
# ===========================
BLOCKCHAIN_NETWORK=polygon-amoy
NFT_CONTRACT_ADDRESS=  # Vide, sera rempli après déploiement
USDC_CONTRACT_ADDRESS=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
ALCHEMY_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<REMPLACER>
ALCHEMY_WEBHOOK_SECRET=<REMPLACER>

# ===========================
# FEES - PHASE 1 (Vendeur only)
# ===========================
BUYER_FEE_PERCENT=0
SELLER_FEE_PERCENT=0.05  # 0.05% du prix
SELLER_FEE_FLAT=0.05     # 0.05 USDC minimum
STRIPE_BUYER_FEE_PERCENT=25
STRIPE_BUYER_FEE_MIN=0.35

# ===========================
# FEES - PHASE 2 (Premium) - À activer plus tard
# ===========================
# BUYER_FEE_PERCENT=5      # 5% acheteur (désactivé en Phase 1)
# SELLER_FEE_PERCENT=5     # 5% vendeur (désactivé en Phase 1)
# SELLER_FEE_FLAT=0.05     # 0.05 USDC minimum
```

---

### Étape 3 : Déployer Smart Contract (15 min)

#### Option A : Via Interface thirdweb (Recommandé pour débuter)

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Lancer déploiement interactif
npx thirdweb deploy
```

**Ce qui va se passer :**
1. Une page web s'ouvre dans ton navigateur
2. On te demande de connecter MetaMask
3. Tu choisis le réseau **Polygon Amoy**
4. Tu remplis les paramètres :
   - `name`: "CyLimit Dev"
   - `symbol`: "CYLMT"
   - `baseURI`: "ipfs://"
5. Tu cliques sur "Deploy"
6. MetaMask te demande de confirmer (tu paies les gas fees en MATIC testnet)
7. thirdweb te donne l'adresse du contract déployé

#### Option B : Via Script

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

./scripts/deploy-nft-thirdweb.sh mumbai
```

**Après déploiement :**

1. Note l'adresse du contract (ex: `0x1234...`)
2. Ajoute-la dans ton `.env` :
   ```bash
   NFT_CONTRACT_ADDRESS=0x1234...
   ```
3. Vérifie sur Amoy PolygonScan : https://amoy.polygonscan.com/address/0x1234...

---

### Étape 4 : Développer Backend Services (Semaine 3-4)

#### A. Installer SDK Coinbase

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop
npm install @coinbase/coinbase-sdk
```

#### B. Créer les services

**Fichiers à créer :**

1. `src/modules/wallet/services/coinbase-wallet.service.ts`
   - Gestion Smart Accounts
   - Création wallet par user
   - Balance USDC
   - Transferts atomiques

2. `src/modules/wallet/services/fee-calculator.service.ts`
   - Calcul fees Phase 1 vs Phase 2
   - Détection phase active
   - Support Premium (Phase 2)

3. `src/modules/marketplace/services/marketplace.service.ts`
   - Achat NFT (primaire/secondaire)
   - Vente NFT
   - Calcul fees
   - Transactions atomiques USDC + NFT

4. `src/modules/wallet/wallet.module.ts`
   - Module NestJS pour wallet

5. `src/modules/marketplace/marketplace.module.ts`
   - Module NestJS pour marketplace

**Code complet disponible dans :** `SYSTEME-WALLETS-COMPLET.md`

---

### Étape 5 : Développer Frontend (Semaine 5)

#### A. Créer API clients

**Fichiers à créer :**

1. `src/apis/wallet.ts`
   - `createSmartAccount()`
   - `getBalance()`
   - `generateOnrampLink()`
   - `withdraw()`

2. `src/apis/marketplace.ts`
   - `previewFees()`
   - `buyNFT()`
   - `listNFT()`
   - `delistNFT()`

#### B. Créer composants UI

1. `src/features/marketplace/components/BuyNFTModal.tsx`
   - Affiche 3 options de paiement (USDC, Coinbase, Stripe)
   - Preview fees
   - Confirmation achat

2. `src/features/wallet/pages/WalletPage.tsx`
   - Affiche balance USDC
   - Bouton "Déposer"
   - Bouton "Retirer"
   - Historique transactions

---

### Étape 6 : Migration Base de Données (Semaine 6)

#### A. Migrer users vers Smart Accounts

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Backup DB
mongodump --db cylimit_dev --out ./backup/$(date +%Y%m%d)

# Migrer
npm run migration:smart-accounts

# Vérifier
mongo cylimit_dev --eval "db.users.find({ smartAccountId: { \$exists: true } }).count()"
```

#### B. Supprimer clés privées (APRÈS tests complets)

```bash
# ⚠️ DANGER : Ne faire qu'après validation complète
npm run migration:remove-keys
```

---

### Étape 7 : Modifier Site Actuel (Semaine 8)

**⚠️ IMPORTANT : Dès que le nouveau système est en place**

Modifier le site actuel pour appliquer les fees Phase 1 :

**Avant (actuel) :**
```javascript
// Appliqué aux DEUX parties
fees = max(0.05 USDC, 0.05% du prix)
```

**Après (Phase 1) :**
```javascript
// Appliqué UNIQUEMENT au vendeur
sellerFee = max(0.05 USDC, 0.05% du prix)
buyerFee = 0
```

**Fichiers à modifier :**
- Backend : `src/modules/marketplace/services/fee-calculator.service.ts`
- Frontend : `src/features/marketplace/components/BuyNFTModal.tsx`

---

### Étape 8 : Tests (Semaine 7)

#### Tests à effectuer

- [ ] Créer compte → Smart Account créé
- [ ] Déposer USDC via Coinbase Onramp
- [ ] Acheter NFT avec USDC → Transaction atomique OK
- [ ] Vérifier NFT dans collection
- [ ] Lister NFT sur marché
- [ ] Acheter NFT d'un autre user
- [ ] Retirer USDC vers wallet externe
- [ ] Vérifier NFT sur Amoy PolygonScan
- [ ] Vérifier fees vendeur uniquement (Phase 1)

---

## 📊 Timeline Globale

| Semaine | Phase | Livrable |
|---------|-------|----------|
| **1** ✅ | Setup | Smart Contract + docs |
| **2** 🔵 | Déploiement | Contract sur Amoy |
| **3-4** 🔵 | Backend | WalletService + MarketplaceService + FeeCalculator |
| **5** 🔵 | Frontend | UI 3 options paiement |
| **6** 🔵 | Migration | Users migrés |
| **7** 🔵 | Tests | Validation complète |
| **8** 🔵 | Production | Déploiement prod + Modification site actuel |
| **16+** 🔵 | Phase 2 | Lancement Premium + Fees Phase 2 |

**Légende :**
- ✅ Terminé
- 🔵 À faire
- ⚠️ En attente

---

## 🎯 Prochaine Action Immédiate

**TU DOIS FAIRE MAINTENANT :**

1. ✅ **Créer compte Coinbase CDP** (30 min)
   - https://portal.cdp.coinbase.com/
   
2. ✅ **Configurer `.env`** (10 min)
   - Ajouter COINBASE_API_KEY_NAME (ton API Key ID)
   - Ajouter COINBASE_API_KEY_PRIVATE_KEY (ton API Secret)
   - Ajouter ALCHEMY_AMOY_RPC_URL

3. ✅ **Déployer Smart Contract** (15 min)
   - `npx thirdweb deploy`
   - Choisir Amoy
   - Noter l'adresse

4. ✅ **Mettre à jour `.env`** (2 min)
   - Ajouter NFT_CONTRACT_ADDRESS

**Après ça, on passe au développement des Backend Services !** 🚀

---

## 📚 Documents de Référence

- 📄 **SYSTEME-WALLETS-COMPLET.md** : Documentation technique complète
- 📄 **PLAN-IMPLEMENTATION-STEP-BY-STEP.md** : Plan détaillé phase par phase
- 📄 **PROCHAINES-ETAPES.md** : Ce document (résumé actionnable)

---

## ❓ Questions / Problèmes ?

Si tu rencontres un problème, vérifie :

1. ✅ thirdweb CLI installé ? → `npx thirdweb --version`
2. ✅ MetaMask connecté à Amoy ? → https://chainlist.org (recherche "Amoy")
3. ✅ As-tu des MATIC testnet ? → https://faucet.polygon.technology/
4. ✅ Smart Contract dans `contracts/` ? → `ls -la contracts/`

---

## 🔄 Rappel : Système de Fees

### Système ACTUEL (à migrer)
```javascript
// Appliqué aux DEUX parties
fees = max(0.05 USDC, 0.05% du prix)
```

### Phase 1 (Semaine 8)
```javascript
// Vendeur uniquement
sellerFee = max(0.05 USDC, 0.05% du prix)
buyerFee = 0
```

### Phase 2 (Semaine 16+)
```javascript
// Avec Premium
sellerFee = max(0.05 USDC, 5% du prix)  // Si pas Premium
buyerFee = 5% du prix  // Si pas Premium
```

---

**Prêt à démarrer ? Let's go ! 🚀**
