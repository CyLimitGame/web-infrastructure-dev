# 🚀 Guide Complet : Migration NFT V1 → V2 + Embedded Wallets

**Date :** 14 Octobre 2025  
**Version :** 1.0.0  
**Statut :** 📋 Prêt pour déploiement

---

## 📖 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Documents de référence](#documents-de-référence)
4. [Scripts disponibles](#scripts-disponibles)
5. [Guide d'exécution](#guide-dexécution)
6. [Suivi de progression](#suivi-de-progression)
7. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

### Objectif

Migrer l'écosystème CyLimit du contrat NFT v1 vers le nouveau contrat v2 sur Polygon Mainnet, avec migration automatique des USDC et NFTs des users vers leurs Embedded Wallets Coinbase.

### Chiffres clés

- **25'000 NFTs** à reminter sur contrat v2
- **1'000 users** à migrer automatiquement
- **~$1'500 gas total** estimé (avec optimisations batch)
- **Durée estimée** : 1 semaine (avec tests)

### Workflow simplifié

```
1. Déployer contrats (NFT v2 + Marketplace) sur Polygon Mainnet
2. Transférer USDC CyLimit vers Master New Wallet
3. Reminter 25'000 NFTs sur contrat v2 (batch de 100)
4. Activer migration automatique users
5. Users se connectent → migration USDC + NFTs v2 automatique
```

---

## 🏗️ Architecture

### Avant (V1)

```
Master Old Wallet
├─ USDC CyLimit + USDC users
└─ Quelques NFTs v1

Old User Wallets (privateKey en DB)
└─ Certains NFTs v1

NFT Contract v1: 0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F
```

### Après (V2)

```
Master New Wallet
├─ USDC CyLimit
└─ NFTs v2 (temporaire, avant distribution)

Embedded Wallets (Coinbase CDP)
└─ Chaque user : USDC + NFTs v2

NFT Contract v2: [À déployer]
Marketplace v2: [À déployer]
```

---

## 📚 Documents de référence

### Documentation principale

| Document | Description |
|----------|-------------|
| [`MIGRATION-V1-V2-MAINNET.md`](./MIGRATION-V1-V2-MAINNET.md) | Architecture complète, workflow détaillé, risques |
| [`ETAT-MIGRATION-V1-V2.md`](./ETAT-MIGRATION-V1-V2.md) | Checklist de progression, statuts en temps réel |

### Contrats Solidity

| Fichier | Description |
|---------|-------------|
| `contracts/CyLimitNFT_v2.sol` | Contrat NFT v2 avec `batchMint()` et `batchTransfer()` |
| `contracts/CyLimitMarketplace.sol` | Marketplace avec batch, swaps, offers |

### Code Backend

| Fichier | Description |
|---------|-------------|
| `src/modules/user/services/migration.service.ts` | Service de migration automatique |
| `src/modules/user/schemas/user.schema.ts` | Schéma User avec `migrationStatus` |
| `src/modules/nft/schemas/nft.schema.ts` | Schéma NFT avec `oldTokenId`, `oldContractAddress` |

---

## 🛠️ Scripts disponibles

### Phase 1 : Déploiement

| Script | Commande | Description |
|--------|----------|-------------|
| `deploy-nft-v2-mainnet.js` | `node scripts/deploy-nft-v2-mainnet.js` | Déployer NFT v2 sur Polygon Mainnet |
| `deploy-marketplace-v2-mainnet.js` | `node scripts/deploy-marketplace-v2-mainnet.js` | Déployer Marketplace v2 |

### Phase 2 : USDC CyLimit

| Script | Commande | Description |
|--------|----------|-------------|
| `calculate-cylimit-usdc.js` | `node scripts/calculate-cylimit-usdc.js` | Calculer USDC de CyLimit à transférer |

### Phase 3 : Remint NFTs

| Script | Commande | Description |
|--------|----------|-------------|
| `prepare-nfts-for-remint.js` | `node scripts/prepare-nfts-for-remint.js` | Préparer données pour remint |
| `remint-nfts-v2-batch.js` | `node scripts/remint-nfts-v2-batch.js` | Reminter 25'000 NFTs en batch |
| `verify-remint.js` | `node scripts/verify-remint.js` | Vérifier remint complet |

### Phase 4 : Tests

| Script | Commande | Description |
|--------|----------|-------------|
| `test-migration-single-user.js` | `node scripts/test-migration-single-user.js` | Tester migration avec 1 user |

---

## 🚀 Guide d'exécution

### Prérequis

1. **Master New Wallet créé** (nouveau wallet Polygon)
   ```bash
   # Générer nouveau wallet
   node -e "console.log(require('ethers').Wallet.createRandom().address)"
   ```

2. **Variables d'environnement configurées**
   ```bash
   MASTER_NEW_WALLET_ADDRESS=0x...
   MASTER_NEW_WALLET_PRIVATE_KEY=0x...
   MASTER_OLD_WALLET_ADDRESS=0x...
   ALCHEMY_POLYGON_API_KEY=xxx
   MONGODB_URI=mongodb://...
   ```

3. **Master New Wallet financé**
   - Transférer ~50 MATIC pour gas fees

4. **Backup DB effectué**
   ```bash
   mongodump --uri="mongodb://..." --out=backup-$(date +%Y%m%d)
   ```

---

### Étape 1 : Déployer NFT v2

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# Tester sur Amoy d'abord (optionnel)
NETWORK=amoy node scripts/deploy-nft-v2-mainnet.js

# Déployer sur Polygon Mainnet
NETWORK=polygon node scripts/deploy-nft-v2-mainnet.js
```

**Résultat attendu :**
```
✅ Contrat déployé : 0x...
✅ Vérifié sur Polygonscan
✅ Master New Wallet whitelisté
```

**Sauvegarder l'adresse** :
```bash
export NFT_V2_CONTRACT_ADDRESS=0x...
```

---

### Étape 2 : Déployer Marketplace v2

```bash
NETWORK=polygon node scripts/deploy-marketplace-v2-mainnet.js
```

**Résultat attendu :**
```
✅ Marketplace déployé : 0x...
✅ Marketplace whitelisté dans NFT v2
```

**Sauvegarder l'adresse** :
```bash
export MARKETPLACE_V2_CONTRACT_ADDRESS=0x...
```

---

### Étape 3 : Transférer USDC CyLimit

```bash
# Calculer montant à transférer
node scripts/calculate-cylimit-usdc.js

# Vérifier résultat
cat scripts/cylimit-usdc-calculation.json
```

**Transfert manuel (MetaMask ou script) :**
- From : Master Old Wallet
- To : Master New Wallet
- Amount : [Montant calculé]
- Token : USDC Native (0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359)

---

### Étape 4 : Préparer données remint

```bash
node scripts/prepare-nfts-for-remint.js
```

**Résultat attendu :**
```
✅ 25'000 NFTs préparés
✅ Fichier généré : scripts/data/nfts-to-remint.json
```

---

### Étape 5 : Reminter NFTs v2

```bash
# Vérifier gas price avant lancement
# https://polygonscan.com/gastracker

# Lancer remint
node scripts/remint-nfts-v2-batch.js
```

**Résultat attendu :**
```
✅ 25'000 NFTs remintés
✅ 250 batches traités
✅ Gas total : ~$1'000
✅ Durée : ~2-3 heures
```

**Point de reprise automatique** si erreur :
- Le script sauvegarde la progression dans `scripts/data/remint-progress.json`
- Relancer le script reprend automatiquement où il s'est arrêté

---

### Étape 6 : Vérifier remint

```bash
node scripts/verify-remint.js
```

**Résultat attendu :**
```
✅ 25'000 NFTs v2 en DB
✅ 25'000 NFTs v2 on-chain (totalSupply)
✅ Ownership correct : 100/100 échantillon
✅ Rapport : scripts/data/verification-report.json
```

---

### Étape 7 : Tester migration (1 user)

```bash
node scripts/test-migration-single-user.js
```

**Résultat attendu :**
```
✅ USDC transférés : 50 USDC
✅ NFTs v2 transférés : 3 NFTs
✅ migrationStatus = 'completed'
✅ totalBalance = 0
```

---

### Étape 8 : Migration en staging (10 users)

1. Sélectionner 10 users pilotes en DB
2. Les inviter à se connecter avec Coinbase
3. Observer logs backend :
   ```bash
   tail -f backend.log | grep "Migration"
   ```

**Critères de validation :**
- Taux de succès > 95%
- Temps moyen < 60s
- Aucune perte de fonds/NFTs

---

### Étape 9 : Migration en production (1000 users)

1. **Activer migration automatique** dans le code backend (déjà fait)
2. **Publier annonce** frontend : "Nouvelle version wallet disponible"
3. **Monitorer migrations** en temps réel (dashboard Slack)
4. **Support** : Préparer FAQ et email support

---

## 📊 Suivi de progression

### Dashboard en temps réel

Consulter [`ETAT-MIGRATION-V1-V2.md`](./ETAT-MIGRATION-V1-V2.md) pour :
- ✅ Checklist de chaque étape
- 📊 Progression (NFTs remintés, users migrés)
- ❌ Problèmes rencontrés
- 📈 Métriques (coûts, temps)

### Commandes MongoDB

```javascript
// Compter users par migrationStatus
db.users.aggregate([
  { $group: { _id: "$migrationStatus", count: { $sum: 1 } } }
])

// NFTs v2 vs v1
db.nfts.countDocuments({ contractAddress: NFT_V2_ADDRESS })
db.nfts.countDocuments({ contractAddress: "0xA049a..." })

// Users avec erreur migration
db.users.find({ migrationStatus: "failed" })
```

---

## 🔧 Dépannage

### Problème : Script remint plante

**Solution :**
1. Vérifier `scripts/data/remint-progress.json`
2. Relancer le script (reprend automatiquement)
3. Si erreur persiste : vérifier gas price, balance wallet, connexion RPC

### Problème : Gas price trop élevé

**Solution :**
- Le script pause automatiquement si gas > 100 gwei
- Attendre que gas redescende < 50 gwei
- Forcer continuation : modifier `MAX_GAS_PRICE_GWEI` dans le script

### Problème : Migration user échoue

**Solution :**
1. Consulter logs backend : `grep "Migration failed" backend.log`
2. Vérifier balance Master Old Wallet (USDC)
3. Vérifier balance Master New Wallet (MATIC pour gas)
4. Relancer manuellement : endpoint admin `/admin/users/:id/force-migrate`

### Problème : NFT ownership incorrect après migration

**Solution :**
1. Vérifier sur Polygonscan : `https://polygonscan.com/token/[NFT_V2_ADDRESS]?a=[tokenId]`
2. Si NFT encore sur Master New Wallet : relancer transfert manuellement
3. Si NFT perdu : contacter admin pour investigation

---

## 📞 Support

### Pour l'équipe

- **Logs backend** : `tail -f backend.log | grep "Migration"`
- **Dashboard Slack** : `#migration-v2`
- **MongoDB** : `mongodb://...`
- **Polygonscan** : `https://polygonscan.com`

### Pour les users

- **FAQ** : `/docs/FAQ-MIGRATION.md` (à créer)
- **Email** : support@cylimit.com
- **Discord** : #support

---

## ✅ Checklist finale

Avant de lancer en production :

- [ ] NFT v2 déployé et vérifié sur Polygonscan
- [ ] Marketplace v2 déployé et vérifié
- [ ] Whitelist configurée (Master New Wallet + Marketplace)
- [ ] USDC CyLimit transférés au Master New Wallet
- [ ] 25'000 NFTs remintés et vérifiés (verify-remint.js PASSED)
- [ ] Migration testée avec 1 user (test OK)
- [ ] Migration testée avec 10 users staging (taux succès > 95%)
- [ ] Backup DB effectué
- [ ] Monitoring Slack configuré
- [ ] FAQ migration publiée
- [ ] Équipe support briefée
- [ ] Variables d'env production configurées :
  - [ ] `NFT_V2_CONTRACT_ADDRESS`
  - [ ] `MARKETPLACE_V2_CONTRACT_ADDRESS`
  - [ ] `MASTER_NEW_WALLET_ADDRESS`
  - [ ] `MASTER_NEW_WALLET_PRIVATE_KEY`

---

## 🎉 Après la migration

### Tâches de clôture

1. **Burn NFTs v1** (après 100% users migrés)
2. **Désactiver ancien contrat v1**
3. **Archiver Master Old Wallet** (une fois USDC users = 0)
4. **Mettre à jour documentation**
5. **Post-mortem** : Leçons apprises

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 14 Octobre 2025  
**Version :** 1.0.0

**Bonne migration ! 🚀**

