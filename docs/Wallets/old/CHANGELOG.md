# 📝 Changelog - Système Wallets CyLimit

## 🔄 6 Octobre 2025 - Mise à jour Coinbase CDP API

### ⚠️ Changement format API Keys Coinbase

**Raison :** Coinbase CDP utilise maintenant un nouveau format pour les API Keys

**Changements :**
- ❌ Ancien : `API Key Name` + `Private Key` (fichier .pem)
- ✅ Nouveau : `API Key ID` + `API Secret` (directement dans le portail)

**Nouveau format :**
```bash
COINBASE_API_KEY_NAME=<API_KEY_ID>  # Ex: organizations/xxx/apiKeys/yyy
COINBASE_API_KEY_PRIVATE_KEY=<API_SECRET>  # Commence par -----BEGIN EC PRIVATE KEY-----
COINBASE_WALLET_ID=  # Généré automatiquement
```

**⚠️ IMPORTANT :** L'API Secret n'est affiché qu'une seule fois lors de la création !

### 📄 Fichiers mis à jour

1. **GUIDE-DEPLOIEMENT.md** - Instructions Coinbase CDP mises à jour
2. **PROCHAINES-ETAPES.md** - Format API Keys mis à jour

---

## 🔄 6 Octobre 2025 - Migration Mumbai → Amoy

### ⚠️ Changement de testnet

**Raison :** Polygon Mumbai a été déprécié et remplacé par Polygon Amoy

**Changements :**
- ❌ Mumbai (Chain ID 80001) - Déprécié
- ✅ Amoy (Chain ID 80002) - Nouveau testnet officiel

**Impact :**
- Tous les documents mis à jour pour utiliser Amoy
- Adresse USDC testnet mise à jour : `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- RPC URL Alchemy : `https://polygon-amoy.g.alchemy.com/v2/...`
- Block Explorer : `https://amoy.polygonscan.com/`

### 📄 Fichiers mis à jour

1. **GUIDE-DEPLOIEMENT.md** - Mumbai → Amoy partout
2. **PROCHAINES-ETAPES.md** - Mumbai → Amoy partout
3. **PLAN-IMPLEMENTATION-STEP-BY-STEP.md** - Mumbai → Amoy
4. **deploy-nft-thirdweb.sh** - Mumbai → Amoy dans le script

---

## 🔄 6 Octobre 2025 - Clarification Système de Fees

### ✏️ Mise à jour majeure

**Clarification du système de fees actuel vs nouveau système**

#### Avant (documentation incorrecte)
```
Fees actuelles = 0.05 USDC vendeur only
```

#### Après (documentation corrigée)
```
Système ACTUEL sur le site :
  fees = max(0.05 USDC, 0.05% du prix)
  Appliqué aux DEUX parties (acheteur + vendeur)

Phase 1 (Semaine 8) :
  sellerFee = max(0.05 USDC, 0.05% du prix)
  buyerFee = 0
  Appliqué UNIQUEMENT au vendeur

Phase 2 (Semaine 16+) :
  sellerFee = max(0.05 USDC, 5% du prix)
  buyerFee = 5% du prix
  Sauf si Premium (0 fees CyLimit)
```

### 📄 Fichiers mis à jour

1. **SYSTEME-WALLETS-COMPLET.md**
   - Section "Système de Fees" complètement réécrite
   - Ajout distinction claire : Actuel / Phase 1 / Phase 2
   - Exemples de calcul mis à jour

2. **README.md**
   - Tableau "Décisions Finales" mis à jour
   - Ajout 3 lignes pour fees : Actuelles / Phase 1 / Phase 2

3. **PROCHAINES-ETAPES.md** ✨ (nouveau)
   - Guide actionnable étape par étape
   - Configuration `.env` avec fees Phase 1
   - Rappel système de fees en fin de document

4. **PLAN-IMPLEMENTATION-STEP-BY-STEP.md** ✨ (nouveau)
   - Timeline complète 16 semaines (Phase 1 + Phase 2)
   - Détail semaine par semaine
   - Checklist complète
   - Points d'attention sécurité

### 🎯 Impact

**Action requise (Semaine 8) :**
Dès que le nouveau système est en place, modifier le site actuel pour appliquer les fees Phase 1 :

```javascript
// Avant (actuel)
fees = max(0.05 USDC, 0.05% du prix)  // Acheteur + Vendeur

// Après (Phase 1)
sellerFee = max(0.05 USDC, 0.05% du prix)  // Vendeur only
buyerFee = 0
```

**Fichiers backend à créer :**
- `src/modules/marketplace/services/fee-calculator.service.ts`
  - Support Phase 1 et Phase 2
  - Détection automatique phase active via `.env`
  - Calcul fees selon phase et statut Premium

---

## 🧹 3 Octobre 2025 - Nettoyage et Simplification

### ❌ Supprimé (Hardhat)

**Fichiers supprimés :**
- `cylimit-backend-develop/hardhat.config.ts`
- `cylimit-backend-develop/hardhat.config.mjs`
- `cylimit-backend-develop/scripts/deploy-nft-v2.ts`
- `cylimit-backend-develop/test/contracts/CyLimitNFT_v2.test.ts`
- `cylimit-backend-develop/cache/` (dossier)
- `cylimit-backend-develop/artifacts/` (dossier)
- `cylimit-backend-develop/blockchain/` (dossier)
- `cylimit-backend-develop/test/contracts/` (dossier)

**Packages npm désinstallés :**
- `hardhat`
- `@nomicfoundation/hardhat-toolbox`
- `@nomicfoundation/hardhat-ethers`
- `@nomiclabs/hardhat-ethers`
- `@nomiclabs/hardhat-waffle`
- `ethereum-waffle`

**Raison :** Conflit ESM/CommonJS avec NestJS. Hardhat 3.x nécessite ESM (`"type": "module"`) ce qui casse le projet NestJS existant.

---

### ✅ Ajouté (thirdweb)

**Packages npm installés :**
- `@thirdweb-dev/cli` (déjà présent : `@thirdweb-dev/sdk`)
- `@openzeppelin/contracts`

**Fichiers créés :**
- ✅ `contracts/CyLimitNFT_v2.sol` (Smart Contract NFT)
- ✅ `scripts/deploy-nft-thirdweb.sh` (Script déploiement)

**Documentation créée :**
- ✅ `SYSTEME-WALLETS-COMPLET.md` (documentation technique complète)
- ✅ `README.md` (index documentation)
- ✅ `Wallet-users-DECISION-FINALE.md` (historique décisions)

**Raison :** thirdweb est plus simple, ne nécessite pas de configuration complexe, et est déjà présent dans le projet.

---

## ✅ Avantages de thirdweb vs Hardhat

| Critère | Hardhat | thirdweb |
|---------|---------|----------|
| **Installation** | Complexe (ESM/CommonJS) | ✅ Simple (CLI NPM) |
| **Configuration** | Fichier config TypeScript | ✅ Pas de config |
| **Déploiement** | Script TS + CLI | ✅ Interface web |
| **Vérification** | Manuelle (polygonscan) | ✅ Automatique |
| **Tests** | Écrire tests en TS | Dashboard web |
| **Compatibilité NestJS** | ❌ Conflit ESM | ✅ Aucun conflit |
| **Courbe apprentissage** | Moyenne | ✅ Faible |

---

## 📦 État Actuel du Projet

### Fichiers Smart Contract

```
cylimit-backend-develop/
├── contracts/
│   └── CyLimitNFT_v2.sol ✅ (créé)
├── scripts/
│   └── deploy-nft-thirdweb.sh ✅ (créé)
└── package.json (thirdweb CLI installé ✅)
```

### Documentation

```
cylimit-infrastructure/docs/Wallets/
├── README.md ✅ (mis à jour 6 oct)
├── SYSTEME-WALLETS-COMPLET.md ✅ (mis à jour 6 oct)
├── PLAN-IMPLEMENTATION-STEP-BY-STEP.md ✅ (créé 6 oct)
├── PROCHAINES-ETAPES.md ✅ (créé 6 oct)
├── CHANGELOG.md ✅ (ce fichier)
├── Wallet-users-DECISION-FINALE.md (historique)
├── Wallet-users-COMPLEMENT.md (historique)
├── Wallet-users.md (historique)
└── COMPARAISON-POLYGON-VS-BASE.md (historique)
```

---

## 🎯 Prochaines Actions

**Phase actuelle :** Setup terminé ✅

**Phase suivante :** Déploiement Smart Contract (Semaine 2)

**À faire maintenant :**
1. Créer compte Coinbase CDP
2. Configurer `.env`
3. Déployer Smart Contract via `npx thirdweb deploy`

**Voir :** [PROCHAINES-ETAPES.md](./PROCHAINES-ETAPES.md) pour les instructions détaillées.

---

## 📚 Historique des Décisions

### Pourquoi thirdweb plutôt que Hardhat ?

**Tentative initiale :** Installation de Hardhat

**Problème rencontré :**
```
Error: Hardhat only supports ESM projects.
Please make sure you have "type": "module" in your package.json.
```

**Solutions envisagées :**
1. ❌ Ajouter `"type": "module"` → Casse NestJS
2. ❌ Créer projet séparé → Complexité inutile
3. ❌ Downgrade Hardhat 2.x → Ancien, moins maintenu
4. ✅ **Utiliser thirdweb** → Déjà installé, pas de conflit

**Décision finale :** thirdweb CLI + Dashboard web

**Validé par :** Valentin (3 octobre 2025)

---

### Pourquoi Coinbase Smart Accounts ?

**Alternatives considérées :**
1. ❌ Metamask + Ramp → Trop compliqué pour users non-crypto
2. ❌ Custodial wallets custom → Risque sécurité, audit requis
3. ❌ Magic.link → Pas de transactions atomiques
4. ✅ **Coinbase Smart Accounts (ERC-4337)** → Atomique, sécurisé, simple

**Décision finale :** Coinbase Smart Accounts

**Validé par :** Valentin (2 octobre 2025)

---

### Pourquoi Polygon plutôt que Base ?

**Alternatives considérées :**
1. ✅ **Polygon** → Déjà utilisé, NFTs existants, gas ultra-bas
2. ❌ Base → Migration NFTs complexe, coûts migration élevés

**Décision finale :** Polygon (pas de migration)

**Validé par :** Valentin (2 octobre 2025)

**Voir :** [COMPARAISON-POLYGON-VS-BASE.md](./COMPARAISON-POLYGON-VS-BASE.md) pour détails.

---

## 🔄 Versions

| Version | Date | Changements |
|---------|------|-------------|
| **2.0** | 6 oct 2025 | Clarification fees (Actuel / Phase 1 / Phase 2) |
| **1.0** | 3 oct 2025 | Migration Hardhat → thirdweb |
| **0.9** | 2 oct 2025 | Documentation complète initiale |

---

**Document maintenu par :** Valentin  
**Dernière mise à jour :** 6 octobre 2025
