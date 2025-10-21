# 📊 État Migration NFT V1 → V2 - Suivi en Temps Réel

**Dernière mise à jour :** 14 Octobre 2025  
**Statut global :** 🟡 EN COURS

---

## 🎯 Vue d'Ensemble

| Phase | Statut | Progression | Coût Gas | Temps estimé |
|-------|--------|-------------|----------|--------------|
| **Phase 1** - Déploiement contrats | 🔴 TODO | 0/5 | $0 / $20 | - |
| **Phase 2** - Transfert USDC CyLimit | 🔴 TODO | 0/2 | $0 / $0.05 | - |
| **Phase 3** - Reminting 25'000 NFTs | 🔴 TODO | 0/25000 | $0 / $1000 | - |
| **Phase 4** - Migration users automatique | 🔴 TODO | 0/1000 | $0 / $500 | - |
| **Phase 5** - Tests staging | 🔴 TODO | 0/10 | $0 / $5 | - |
| **Phase 6** - Production | 🔴 TODO | 0/1000 | $0 / $500 | - |

**Légende :**
- 🔴 TODO : Pas commencé
- 🟡 IN PROGRESS : En cours
- 🟢 DONE : Terminé
- ⚠️ BLOCKED : Bloqué (dépendance)
- ❌ FAILED : Échec (nécessite intervention)

---

## 📋 PHASE 1 : Déploiement des Contrats

### 1.1. Ajouter fonction batchMint au contrat NFT v2

**Statut :** 🔴 TODO  
**Responsable :** Dev Backend  
**Fichier :** `/contracts/CyLimitNFT_v2.sol`

**Tâches :**
- [ ] Ajouter fonction `batchMint(address to, string[] memory tokenURIs)`
- [ ] Limiter à 100 NFTs par batch
- [ ] Tester en local avec Hardhat
- [ ] Vérifier gas estimé (~80k gas par NFT)

**Résultat attendu :**
```solidity
function batchMint(address to, string[] memory tokenURIs) 
    public onlyOwner returns (uint256[] memory)
```

**Notes :**
- Économise ~50% de gas vs mint() individuel
- Permet de reminter 25'000 NFTs en 250 transactions au lieu de 25'000

---

### 1.2. Déployer NFT v2 sur Polygon Mainnet

**Statut :** 🔴 TODO  
**Responsable :** Dev Backend  
**Script :** `/scripts/deploy-nft-v2-mainnet.js`

**Paramètres :**
```javascript
{
  name: "CyLimit V2",
  symbol: "CYLMT",
  initialOwner: "<MASTER_NEW_WALLET_ADDRESS>"
}
```

**Tâches :**
- [ ] Créer Master New Wallet (nouveau wallet Polygon)
- [ ] Créer script de déploiement Hardhat
- [ ] Tester sur Amoy testnet d'abord
- [ ] Déployer sur Polygon Mainnet
- [ ] Vérifier contrat sur Polygonscan
- [ ] Sauvegarder adresse dans `.env` : `NFT_V2_CONTRACT_ADDRESS`

**Résultat :**
- Adresse NFT v2 : `TBD`
- Adresse Master New Wallet : `TBD`
- Gas utilisé : `TBD`
- TxHash : `TBD`

---

### 1.3. Whitelister Master New Wallet dans NFT v2

**Statut :** ⚠️ BLOCKED (dépend de 1.2)  
**Responsable :** Dev Backend  
**Script :** `/scripts/whitelist-master-wallet.js`

**Commande :**
```javascript
await nftV2Contract.setTransferWhitelist(
  MASTER_NEW_WALLET_ADDRESS, 
  true
);
```

**Tâches :**
- [ ] Créer script d'interaction avec contrat
- [ ] Appeler `setTransferWhitelist()`
- [ ] Vérifier avec `isWhitelisted()`
- [ ] Confirmer transaction sur Polygonscan

**Résultat :**
- TxHash : `TBD`
- Gas utilisé : `TBD`
- `isWhitelisted(MASTER_NEW_WALLET) == true` ✅

---

### 1.4. Déployer Marketplace v2 sur Polygon Mainnet

**Statut :** ⚠️ BLOCKED (dépend de 1.2)  
**Responsable :** Dev Backend  
**Script :** `/scripts/deploy-marketplace-v2-mainnet.js`

**Paramètres :**
```javascript
{
  _nftContract: "<NFT_V2_ADDRESS>",
  _usdcContract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC Native
  initialOwner: "<MASTER_NEW_WALLET_ADDRESS>"
}
```

**Tâches :**
- [ ] Créer script de déploiement Hardhat
- [ ] Tester sur Amoy testnet d'abord
- [ ] Déployer sur Polygon Mainnet
- [ ] Vérifier contrat sur Polygonscan
- [ ] Sauvegarder adresse dans `.env` : `MARKETPLACE_V2_CONTRACT_ADDRESS`

**Résultat :**
- Adresse Marketplace v2 : `TBD`
- Gas utilisé : `TBD`
- TxHash : `TBD`

---

### 1.5. Whitelister Marketplace dans NFT v2

**Statut :** ⚠️ BLOCKED (dépend de 1.4)  
**Responsable :** Dev Backend  
**Script :** `/scripts/whitelist-marketplace.js`

**Commande :**
```javascript
await nftV2Contract.setTransferWhitelist(
  MARKETPLACE_V2_ADDRESS, 
  true
);
```

**Tâches :**
- [ ] Créer script d'interaction
- [ ] Appeler `setTransferWhitelist()`
- [ ] Vérifier avec `isWhitelisted()`

**Résultat :**
- TxHash : `TBD`
- Gas utilisé : `TBD`
- `isWhitelisted(MARKETPLACE_V2) == true` ✅

---

## 📋 PHASE 2 : Transfert USDC CyLimit

### 2.1. Calculer USDC de CyLimit

**Statut :** 🔴 TODO  
**Responsable :** Dev Backend  
**Script :** `/scripts/calculate-cylimit-usdc.js`

**Formule :**
```
USDC_CYLIMIT = Balance_Master_Old_Wallet - SUM(users.totalBalance)
```

**Tâches :**
- [ ] Créer script de calcul
- [ ] Récupérer balance Master Old Wallet on-chain
- [ ] Calculer SUM(users.totalBalance) en DB
- [ ] Calculer différence
- [ ] Double vérification manuelle

**Résultat :**
```json
{
  "masterOldWalletBalance": "TBD USDC",
  "usersTotalBalance": "TBD USDC",
  "cylimitUSDC": "TBD USDC",
  "verification": "OK/WARNING"
}
```

---

### 2.2. Transférer USDC CyLimit

**Statut :** ⚠️ BLOCKED (dépend de 2.1 + 1.2)  
**Responsable :** Dev Backend + Admin  
**Méthode :** Manuel (via MetaMask ou script)

**Transaction :**
- From : Master Old Wallet
- To : Master New Wallet
- Amount : `CYLIMIT_USDC` calculé en 2.1
- Token : USDC Native (0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359)

**Tâches :**
- [ ] Vérifier calcul USDC CyLimit
- [ ] Test avec petit montant (10 USDC)
- [ ] Transférer montant total
- [ ] Vérifier balance Master New Wallet
- [ ] Vérifier balance Master Old Wallet >= SUM(users.totalBalance)

**Résultat :**
- Amount transféré : `TBD USDC`
- TxHash : `TBD`
- Balance Master New Wallet : `TBD USDC` ✅
- Balance Master Old Wallet restante : `TBD USDC` ✅

---

## 📋 PHASE 3 : Reminting 25'000 NFTs

### 3.1. Préparer données pour remint

**Statut :** 🔴 TODO  
**Responsable :** Dev Backend  
**Script :** `/scripts/prepare-nfts-for-remint.js`

**Requête MongoDB :**
```javascript
db.nfts.find({ 
  ownerId: { $ne: null },
  contractAddress: "0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F"
})
```

**Tâches :**
- [ ] Créer script de préparation
- [ ] Récupérer tous les NFTs v1 avec owner
- [ ] Extraire : `_id`, `cid`, `ownerId`, `tokenId`, `rarity`
- [ ] Générer `/scripts/data/nfts-to-remint.json`
- [ ] Vérifier nombre total : 25'000 NFTs

**Résultat :**
```json
{
  "total": 25000,
  "byRarity": {
    "blue": "TBD",
    "pink": "TBD", 
    "yellow": "TBD"
  },
  "nfts": [
    {
      "_id": "...",
      "cid": "Qm...",
      "ownerId": "...",
      "tokenId": "123",
      "rarity": "blue"
    }
  ]
}
```

---

### 3.2. Reminter NFTs en batch

**Statut :** ⚠️ BLOCKED (dépend de 3.1 + 1.2)  
**Responsable :** Dev Backend  
**Script :** `/scripts/remint-nfts-v2-batch.js`

**Paramètres :**
- Batch size : 100 NFTs
- Total batches : 250
- Gas price max : 50 gwei (pause si > 50)

**Tâches :**
- [ ] Créer script de remint batch
- [ ] Implémenter point de reprise (progress.json)
- [ ] Monitorer gas price (pause si trop élevé)
- [ ] Pour chaque batch de 100 :
  - [ ] Préparer array tokenURIs (ipfs://...)
  - [ ] Appeler `batchMint(masterNewWallet, tokenURIs)`
  - [ ] Récupérer nouveaux tokenIds
  - [ ] Mettre à jour DB :
    ```javascript
    {
      contractAddress: NFT_V2_ADDRESS,
      tokenId: newTokenId,
      oldTokenId: oldTokenId,
      oldContractAddress: "0xA049a..."
      // ownerId : RESTE INCHANGÉ
    }
    ```
  - [ ] Logger progression
  - [ ] Sauvegarder point de reprise
- [ ] Notification Slack fin de remint

**Progression :**
```
Batches: 0/250 (0%)
NFTs: 0/25000 (0%)
Gas total: 0 MATIC ($0)
Temps écoulé: 0h 0m
Temps estimé restant: TBD
```

**Résultat attendu :**
- 25'000 NFTs remintés ✅
- Gas total : ~$1'000 (avec gas à 30 gwei)
- Durée : ~2-3 heures

---

### 3.3. Vérifier reminting

**Statut :** ⚠️ BLOCKED (dépend de 3.2)  
**Responsable :** Dev Backend  
**Script :** `/scripts/verify-remint.js`

**Vérifications :**
- [ ] Tous les NFTs ont `contractAddress == NFT_V2_ADDRESS`
- [ ] Tous les NFTs ont `tokenId` rempli (nouveau)
- [ ] Tous les NFTs ont `oldTokenId` rempli (ancien)
- [ ] Tous les NFTs ont `oldContractAddress == 0xA049a...`
- [ ] `ownerId` est resté inchangé pour tous
- [ ] On-chain : `totalSupply() == 25000`
- [ ] On-chain : `ownerOf(tokenId) == MASTER_NEW_WALLET` (pour tous)

**Résultat :**
```json
{
  "nftsInDB": 25000,
  "nftsWithV2Address": 25000,
  "nftsWithOldTokenId": 25000,
  "totalSupplyOnChain": 25000,
  "allOwnedByMasterNewWallet": true,
  "verification": "PASSED ✅"
}
```

---

## 📋 PHASE 4 : Migration Automatique User

### 4.1. Modifier migration.service.ts

**Statut :** ⚠️ BLOCKED (dépend de Phase 3 complète)  
**Responsable :** Dev Backend  
**Fichier :** `/src/modules/user/services/migration.service.ts`

**Modifications :**

**1. Transfert USDC (ligne 204-210) :**
- ✅ Conserver logique actuelle (Master Old Wallet → Embedded Wallet)
- ✅ Montant : `user.totalBalance`

**2. Transfert NFTs (ligne 220-270) :**
- ❌ SUPPRIMER : Logique de transfert NFTs v1 depuis Old User Wallet
- ✅ AJOUTER : Logique de transfert NFTs v2 depuis Master New Wallet

**Nouveau code :**
```typescript
// Dans transferNFTs()
const userNfts = await this.nftModel.find({ 
  ownerId: userIdObj 
}).lean();

const nftsV2ToTransfer = userNfts.filter(
  nft => nft.contractAddress === NFT_V2_CONTRACT_ADDRESS
);

this.logger.log(
  `📦 User ${userId} has ${nftsV2ToTransfer.length} NFTs v2 to migrate`
);

for (const nft of nftsV2ToTransfer) {
  try {
    // Utiliser Master New Wallet (whitelisté) pour transférer
    await this.ethersNftService.transferNFT(
      MASTER_NEW_WALLET_PRIVATE_KEY,
      nft.tokenId,
      newWalletAddress
    );
    
    result.nftsTransferred++;
    this.logger.log(
      `✅ NFT v2 #${nft.tokenId} transferred to ${newWalletAddress}`
    );
  } catch (error) {
    result.nftsFailed++;
    result.errors.push(
      `NFT v2 #${nft.tokenId}: ${error.message}`
    );
    this.logger.error(
      `❌ Failed to transfer NFT v2 #${nft.tokenId}`,
      error
    );
  }
}

// ℹ️ NFTs v1 ne sont PAS migrés (restent où ils sont)
```

**Tâches :**
- [ ] Modifier `transferNFTs()` comme ci-dessus
- [ ] Supprimer références à Old User Wallet privateKey
- [ ] Ajouter constante `NFT_V2_CONTRACT_ADDRESS` depuis env
- [ ] Ajouter constante `MASTER_NEW_WALLET_PRIVATE_KEY` depuis env
- [ ] Tester en local avec NFTs mockés

---

### 4.2. Créer script de test migration single user

**Statut :** ⚠️ BLOCKED (dépend de 4.1)  
**Responsable :** Dev Backend  
**Script :** `/scripts/test-migration-single-user.js`

**User de test :**
- Email : `test-migration@cylimit.com`
- totalBalance : 50 USDC
- NFTs v2 en DB : 3 NFTs (mais owner on-chain = Master New Wallet)

**Tâches :**
- [ ] Créer user de test en DB
- [ ] Assigner 3 NFTs v2 au user (`ownerId`)
- [ ] Créer Embedded Wallet pour le user
- [ ] Appeler `POST /users/me/wallet-address` avec Embedded Wallet
- [ ] Vérifier logs backend (migration automatique)
- [ ] Vérifier résultat :
  - [ ] USDC dans Embedded Wallet (50 USDC)
  - [ ] 3 NFTs v2 dans Embedded Wallet
  - [ ] `migrationStatus == 'completed'`
  - [ ] `totalBalance == 0`

**Résultat :**
```json
{
  "success": true,
  "userId": "test-migration@cylimit.com",
  "migration": {
    "usdcTransferred": true,
    "usdcAmount": 50,
    "nftsTransferred": 3,
    "nftsFailed": 0,
    "errors": []
  },
  "verification": "PASSED ✅"
}
```

---

## 📋 PHASE 5 : Tests Staging

### 5.1. Sélectionner 10 users pilotes

**Statut :** ⚠️ BLOCKED (dépend de 4.2)  
**Responsable :** Product Owner + Dev Backend

**Profils :**
- 5 users avec USDC uniquement (pas de NFTs)
- 3 users avec NFTs v2 uniquement (pas d'USDC)
- 2 users avec USDC + NFTs v2

**Tâches :**
- [ ] Identifier 10 users réels (ou créer test users)
- [ ] Vérifier leurs données en DB
- [ ] Contacter users pour tests (si réels)
- [ ] Préparer environnement staging

**Users pilotes :**
1. User A : 100 USDC, 0 NFTs
2. User B : 50 USDC, 0 NFTs
3. User C : 25 USDC, 0 NFTs
4. User D : 10 USDC, 0 NFTs
5. User E : 5 USDC, 0 NFTs
6. User F : 0 USDC, 5 NFTs v2
7. User G : 0 USDC, 10 NFTs v2
8. User H : 0 USDC, 2 NFTs v2
9. User I : 75 USDC, 8 NFTs v2
10. User J : 30 USDC, 3 NFTs v2

---

### 5.2. Lancer migrations staging

**Statut :** ⚠️ BLOCKED (dépend de 5.1)  
**Responsable :** Dev Backend + QA

**Tâches :**
- [ ] Inviter users à se connecter avec Coinbase
- [ ] Monitorer logs backend en temps réel
- [ ] Pour chaque user :
  - [ ] Noter temps de migration
  - [ ] Vérifier USDC transférés (Polygonscan)
  - [ ] Vérifier NFTs transférés (Polygonscan)
  - [ ] Vérifier `migrationStatus == 'completed'`
  - [ ] Demander feedback user (si réel)

**Résultats :**
```
User A: ✅ PASSED (30s)
User B: ✅ PASSED (25s)
User C: ✅ PASSED (22s)
User D: ✅ PASSED (20s)
User E: ✅ PASSED (18s)
User F: ✅ PASSED (35s)
User G: ✅ PASSED (45s)
User H: ✅ PASSED (28s)
User I: ✅ PASSED (50s)
User J: ✅ PASSED (40s)

Taux de succès: 10/10 (100%) ✅
Temps moyen: 31.3s
Gas moyen: $0.15/user
```

---

### 5.3. Valider métriques

**Statut :** ⚠️ BLOCKED (dépend de 5.2)  
**Responsable :** Dev Backend

**Critères de validation :**
- [ ] Taux de succès : **> 95%** (10/10 = 100% ✅)
- [ ] Temps moyen : **< 60s** (31.3s ✅)
- [ ] Gas moyen : **< $1/user** ($0.15 ✅)
- [ ] Aucune perte de fonds/NFTs
- [ ] Logs clairs et détaillés
- [ ] Erreurs bien gérées (retry, logging)

**Décision :**
- ✅ Validation OK → Passer en Phase 6 (Production)
- ❌ Validation KO → Corriger problèmes et relancer Phase 5

---

## 📋 PHASE 6 : Production

### 6.1. Activer migration automatique

**Statut :** ⚠️ BLOCKED (dépend de Phase 5 validée)  
**Responsable :** Dev Backend + DevOps

**Tâches :**
- [ ] Backup complet DB avant activation
- [ ] Déployer code backend avec migration.service.ts modifié
- [ ] Vérifier variables d'env production :
  - `NFT_V2_CONTRACT_ADDRESS`
  - `MASTER_NEW_WALLET_PRIVATE_KEY`
  - `MASTER_OLD_WALLET_PRIVATE_KEY` (pour USDC)
- [ ] Activer flag : `MIGRATION_ENABLED=true`
- [ ] Publier annonce frontend : "Nouvelle version wallet disponible"
- [ ] Notification Slack : "Migration automatique ACTIVÉE"

**Monitoring :**
```bash
# Suivre migrations en temps réel
tail -f backend.log | grep "Migration"

# Dashboard Slack :
# - X/1000 users migrés
# - Taux de succès
# - Gas total dépensé
```

---

### 6.2. Suivi migration progressive

**Statut :** ⚠️ BLOCKED (dépend de 6.1)  
**Responsable :** Dev Backend + Product Owner

**Métriques à suivre :**

```json
{
  "timestamp": "2025-10-14T10:00:00Z",
  "users": {
    "total": 1000,
    "migrated": 0,
    "in_progress": 0,
    "failed": 0,
    "pending": 1000
  },
  "successRate": "0%",
  "gasSpent": "$0",
  "averageTime": "0s"
}
```

**Tâches :**
- [ ] Monitorer migrations toutes les heures
- [ ] Analyser logs d'erreurs
- [ ] Contacter users avec `migrationStatus = 'failed'`
- [ ] Relancer migrations échouées manuellement si nécessaire
- [ ] Mettre à jour dashboard Slack

**Objectif :**
- **1000 users migrés en 1 mois** (naturellement, au fur et à mesure qu'ils se connectent)

---

## 🐛 Problèmes Rencontrés

### Problème #1

**Date :** TBD  
**Phase :** TBD  
**Statut :** 🔴 OUVERT

**Description :**
TBD

**Impact :**
TBD

**Solution :**
TBD

**Résolu le :** TBD

---

## 📊 Métriques Finales

### Coûts Gas

| Action | Quantité | Gas/unité | Total |
|--------|----------|-----------|-------|
| NFT v2 deploy | 1 | TBD | TBD |
| Marketplace deploy | 1 | TBD | TBD |
| Batch remint | 250 | TBD | TBD |
| USDC transfers | 1000 | TBD | TBD |
| NFT v2 transfers | ~10000 | TBD | TBD |
| **TOTAL** | | | **TBD** |

---

### Timeline

| Date | Événement | Durée |
|------|-----------|-------|
| TBD | Démarrage Phase 1 | - |
| TBD | Contrats déployés | TBD |
| TBD | Remint complété | TBD |
| TBD | Migration automatique activée | TBD |
| TBD | 50% users migrés | TBD |
| TBD | 100% users migrés | TBD |

---

## ✅ Actions Requises Maintenant

**Prochaines étapes immédiates :**

1. ⚠️ **URGENT** : Ajouter fonction `batchMint()` au contrat NFT v2
2. ⚠️ **URGENT** : Déployer NFT v2 sur Polygon Mainnet
3. ⚠️ **URGENT** : Créer Master New Wallet
4. Créer tous les scripts de la Phase 1
5. Tester déploiement sur Amoy testnet d'abord

---

**Maintenu par :** Équipe CyLimit  
**Mise à jour automatique :** Toutes les heures pendant migration active  
**Version :** 1.0.0

