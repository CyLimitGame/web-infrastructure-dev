# 🚀 Guide de Déploiement - Smart Contract CyLimitNFT_v2

**Date :** 6 octobre 2025  
**Statut :** ✅ Prêt pour déploiement

---

## ✅ Ce qui a été préparé

### 1. Smart Contract
- ✅ `CyLimitNFT_v2.sol` créé dans `cylimit-backend-develop/contracts/`
- ✅ Contrôle des transferts (whitelist)
- ✅ Compatible Coinbase Smart Accounts
- ✅ Commentaires détaillés en français

### 2. Script de déploiement
- ✅ `deploy-nft-thirdweb.sh` créé dans `cylimit-backend-develop/scripts/`
- ✅ Exécutable (`chmod +x`)
- ✅ Guide interactif Mumbai/Polygon

### 3. Dépendances
- ✅ `@openzeppelin/contracts` installé
- ✅ `@thirdweb-dev/cli` installé
- ✅ `@thirdweb-dev/sdk` déjà présent

### 4. Documentation
- ✅ `SYSTEME-WALLETS-COMPLET.md` mis à jour
- ✅ `PROCHAINES-ETAPES.md` créé
- ✅ `PLAN-IMPLEMENTATION-STEP-BY-STEP.md` créé
- ✅ `CHANGELOG.md` créé

---

## 🎯 Étapes de Déploiement

### Étape 1 : Créer compte Coinbase CDP (30 min)

**⚠️ À FAIRE EN PREMIER**

1. Va sur https://portal.cdp.coinbase.com/
2. Crée un compte Coinbase Developer
3. Crée un projet "CyLimit Dev"
4. Va dans "Settings" > "API Keys"
5. Clique sur "Create API Key"
6. Note les 3 valeurs :
   - **Nickname** (nom de ta clé, ex: "cylimit-dev")
   - **API Key ID** (ex: `organizations/xxx/apiKeys/yyy`)
   - **API Secret** (ex: `-----BEGIN EC PRIVATE KEY-----...`)
7. **GARDE CES CLÉS EN SÉCURITÉ !**

**⚠️ IMPORTANT :** L'API Secret ne sera affiché qu'une seule fois. Copie-le immédiatement !

**Tu vas recevoir :**
```
Nickname: cylimit-dev
API Key ID: organizations/xxx/apiKeys/yyy
API Secret: -----BEGIN EC PRIVATE KEY-----
...
-----END EC PRIVATE KEY-----
```

---

### Étape 2 : Créer app Alchemy (10 min)

**Si pas déjà fait**

1. Va sur https://www.alchemy.com/
2. Crée une app "CyLimit Dev" sur **Polygon Amoy** (nouveau testnet)
3. Note l'API Key et le RPC URL

**⚠️ IMPORTANT : Mumbai est déprécié, utilise Amoy**

**Tu vas recevoir :**
```
API Key: xxxxxxxxxxxxx
RPC URL: https://polygon-amoy.g.alchemy.com/v2/xxxxxxxxxxxxx
```

---

### Étape 3 : Configurer `.env` (5 min)

**Fichier : `cylimit-backend-develop/env`**

Ajoute ces lignes à la fin du fichier :

```bash
# ===========================
# COINBASE CDP (DEV)
# ===========================
COINBASE_API_KEY_NAME=<TON_API_KEY_ID>  # Ex: organizations/xxx/apiKeys/yyy
COINBASE_API_KEY_PRIVATE_KEY=<TON_API_SECRET>  # Commence par -----BEGIN EC PRIVATE KEY-----
COINBASE_WALLET_ID=  # Vide, sera généré automatiquement au premier usage

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
```

**Remplace :**
- `<TON_API_KEY_ID>` par ton **API Key ID** Coinbase (ex: `organizations/xxx/apiKeys/yyy`)
- `<TON_API_SECRET>` par ton **API Secret** Coinbase (commence par `-----BEGIN EC PRIVATE KEY-----`)
- `<REMPLACER>` par ton API Key Alchemy
- `<REMPLACER>` par ton webhook secret Alchemy

**💡 Astuce :** Pour l'API Secret, copie-le tel quel avec les retours à la ligne. Si tu veux le mettre sur une seule ligne, remplace les retours à la ligne par `\n`

---

### Étape 4 : Préparer MetaMask (10 min)

**Prérequis pour déploiement**

1. **Installer MetaMask** (si pas déjà fait)
   - Extension Chrome/Firefox : https://metamask.io/

2. **Ajouter réseau Amoy**
   - Va sur https://chainlist.org
   - Recherche "Amoy"
   - Clique "Add to MetaMask"
   
   Ou ajoute manuellement :
   ```
   Network Name: Polygon Amoy
   RPC URL: https://rpc-amoy.polygon.technology/
   Chain ID: 80002
   Currency Symbol: MATIC
   Block Explorer: https://amoy.polygonscan.com/
   ```

3. **Obtenir MATIC testnet**
   - Va sur https://faucet.polygon.technology/
   - Connecte ton wallet
   - Demande des MATIC (gratuit)
   - Attends 1-2 minutes

4. **Vérifier balance**
   - Ouvre MetaMask
   - Vérifie que tu as au moins 0.1 MATIC

---

### Étape 5 : Déployer le Smart Contract (15 min)

**Commande à exécuter :**

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Option 1 : Via script (recommandé)
./scripts/deploy-nft-thirdweb.sh

# Option 2 : Directement via thirdweb
npx thirdweb deploy
```

**Ce qui va se passer :**

1. Une page web s'ouvre dans ton navigateur
2. On te demande de connecter MetaMask
3. Tu choisis le réseau **Polygon Amoy**
4. Tu remplis les paramètres du contract :
   ```
   name: CyLimit Dev
   symbol: CYLMT
   initialOwner: <TON_ADRESSE_BACKEND>
   ```
   
   **⚠️ IMPORTANT : `initialOwner`**
   - Utilise l'adresse du wallet qui contrôlera le contract
   - Ce sera l'adresse du backend CyLimit
   - Tu peux utiliser ton adresse MetaMask pour l'instant

5. Tu cliques sur "Deploy"
6. MetaMask te demande de confirmer
7. Tu paies les gas fees (environ 0.01 MATIC)
8. Attends 30 secondes
9. **NOTE L'ADRESSE DU CONTRACT** (ex: `0x1234...`)

---

### Étape 6 : Mettre à jour `.env` (2 min)

**Après déploiement réussi**

1. Copie l'adresse du contract déployé
2. Ouvre `cylimit-backend-develop/env`
3. Remplace :
   ```bash
   NFT_CONTRACT_ADDRESS=  # Vide
   ```
   Par :
   ```bash
   NFT_CONTRACT_ADDRESS=0x1234...  # TON ADRESSE
   ```

---

### Étape 7 : Vérifier le déploiement (5 min)

**Vérifications à faire**

1. **Sur Amoy PolygonScan**
   - Va sur https://amoy.polygonscan.com/address/<TON_ADRESSE>
   - Vérifie que le contract existe
   - Vérifie que tu es le owner

2. **Tester les fonctions**
   - Va sur l'onglet "Contract" > "Read Contract"
   - Teste `name()` → devrait retourner "CyLimit Dev"
   - Teste `symbol()` → devrait retourner "CYLMT"
   - Teste `owner()` → devrait retourner ton adresse
   - Teste `totalSupply()` → devrait retourner 0

3. **Sur thirdweb Dashboard**
   - Va sur https://thirdweb.com/dashboard
   - Connecte-toi
   - Tu devrais voir ton contract déployé

---

## 🎉 Félicitations !

Ton Smart Contract est déployé ! 🚀

### Prochaines étapes

1. **Semaine 3-4 : Développer Backend Services**
   - `CoinbaseWalletService`
   - `FeeCalculatorService`
   - `MarketplaceService`

2. **Semaine 5 : Développer Frontend**
   - `WalletPage`
   - `BuyNFTModal`
   - `MarketplacePage`

3. **Semaine 6 : Migration Base de Données**
   - Migrer users vers Smart Accounts
   - Migrer NFTs existants

**Voir :** [PROCHAINES-ETAPES.md](./PROCHAINES-ETAPES.md) pour le plan complet.

---

## ❓ Problèmes Courants

### Erreur : "Insufficient funds"
**Solution :** Obtiens plus de MATIC testnet sur https://faucet.polygon.technology/

### Erreur : "Network not supported"
**Solution :** Vérifie que MetaMask est sur Amoy (Chain ID 80002)

### Erreur : "Contract deployment failed"
**Solution :** 
1. Vérifie que tu as des MATIC
2. Augmente le gas limit
3. Réessaye

### Le contract n'apparaît pas sur PolygonScan
**Solution :** Attends 1-2 minutes, puis rafraîchis la page

---

## 📞 Contact

**Questions ?** Vérifie d'abord :
1. [PROCHAINES-ETAPES.md](./PROCHAINES-ETAPES.md)
2. [SYSTEME-WALLETS-COMPLET.md](./SYSTEME-WALLETS-COMPLET.md)
3. [FAQ dans SYSTEME-WALLETS-COMPLET.md](./SYSTEME-WALLETS-COMPLET.md#faq)

---

**Maintenu par :** Valentin  
**Dernière mise à jour :** 6 octobre 2025
