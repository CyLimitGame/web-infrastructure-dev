# 🔄 Migration NFT V1 → V2 + Embedded Wallets - Polygon Mainnet

**Date de création :** 14 Octobre 2025  
**Statut :** 📋 EN PRÉPARATION

---

## 🎯 Objectif

Migrer l'écosystème CyLimit du contrat NFT v1 vers le contrat NFT v2 sur Polygon Mainnet, avec migration automatique des USDC et NFTs des users vers leurs Embedded Wallets Coinbase.

---

## 📊 Architecture

### Ancien Système (Actuellement en production)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANCIEN SYSTÈME (V1)                          │
└─────────────────────────────────────────────────────────────────┘

Master Old Wallet (0x...)
├─ USDC de CyLimit (~X USDC)
├─ USDC de TOUS les users (stocké en DB: user.totalBalance)
└─ Quelques NFTs v1

Old User Wallets (privateKey en DB)
└─ Certains NFTs v1 détenus directement

Contrat NFT v1: 0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F
├─ 25'000 NFTs mintés
├─ Owners: Master Old Wallet OU Old User Wallets
└─ transferWhitelist: Master Old Wallet autorisé

Base de données:
├─ Collection users:
│  ├─ walletAddress (Old User Wallet)
│  ├─ privateKey (Old User Wallet)
│  └─ totalBalance (USDC du user)
│
└─ Collection nfts:
   ├─ contractAddress: 0xA049a... (v1)
   ├─ tokenId: ID sur blockchain v1
   ├─ ownerId: Propriétaire en DB
   └─ rarity: blue, pink, yellow, white
```

### Nouveau Système (Cible)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NOUVEAU SYSTÈME (V2)                         │
└─────────────────────────────────────────────────────────────────┘

Master New Wallet (à créer)
├─ USDC de CyLimit (~X USDC)
└─ NFTs v2 (temporaire, avant distribution aux users)

Embedded Wallets (Coinbase CDP)
└─ Chaque user:
   ├─ USDC du user (migré depuis Master Old Wallet)
   └─ NFTs v2 (migrés depuis Master New Wallet)

Contrat NFT v2: À déployer sur Polygon Mainnet
├─ 25'000 NFTs remintés (nouveaux tokenIds)
├─ Owner temporaire: Master New Wallet
├─ transferWhitelist: Master New Wallet + Marketplace
└─ Fonction batchMint() pour économiser gas

Contrat Marketplace v2: À déployer sur Polygon Mainnet
├─ Support batch transactions (Smart Accounts)
├─ Ventes classiques + Swaps + Offers
└─ USDC escrow intégré

Base de données (mise à jour):
├─ Collection users:
│  ├─ walletAddress: Embedded Wallet address (Coinbase)
│  ├─ oldWalletAddress: Old User Wallet (historique)
│  ├─ totalBalance: 0 (après migration)
│  ├─ migrationStatus: pending/in_progress/completed/failed
│  └─ migratedAt: Date de migration
│
└─ Collection nfts:
   ├─ contractAddress: <NFT v2 address>
   ├─ tokenId: Nouveau ID sur blockchain v2
   ├─ oldTokenId: Ancien ID v1 (historique)
   ├─ oldContractAddress: 0xA049a... (historique)
   └─ ownerId: Reste inchangé (propriétaire original)
```

---

## 🔑 Adresses des Contrats

### Polygon Mainnet

| Contrat | Adresse | Statut |
|---------|---------|--------|
| **NFT v1** | `0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F` | ✅ Déployé (production actuelle) |
| **USDC Native** | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | ✅ Déployé (Circle) |
| **NFT v2** | `TBD` | 🔄 À déployer |
| **Marketplace v2** | `TBD` | 🔄 À déployer |

### Wallets

| Wallet | Adresse | Détient |
|--------|---------|---------|
| **Master Old Wallet** | `0x4e0B06be61a4347CFA0c393090BbE071Dfa5b96A` | USDC CyLimit + USDC users + NFTs v1 |
| **Master New Wallet** | `TBD` | USDC CyLimit + NFTs v2 (temporaire) |

---

## 📋 Workflow de Migration Complet

### PHASE 1 : Déploiement des Contrats

```
┌───────────────────────────────────────────────────────────────┐
│  1. Déployer NFT v2 sur Polygon Mainnet                      │
│     Owner: Master New Wallet                                  │
│     ↓                                                          │
│  2. Ajouter fonction batchMint() au contrat                   │
│     ↓                                                          │
│  3. Whitelister Master New Wallet (transferWhitelist)        │
│     ↓                                                          │
│  4. Déployer Marketplace v2                                   │
│     Params: NFT v2 address + USDC address                     │
│     ↓                                                          │
│  5. Whitelister Marketplace dans NFT v2                       │
└───────────────────────────────────────────────────────────────┘
```

**Résultat attendu :**
- ✅ 2 contrats déployés et vérifiés sur Polygonscan
- ✅ Whitelist configurée correctement
- ✅ Gas total : ~$15-25

---

### PHASE 2 : Transfert Manuel USDC CyLimit

```
┌───────────────────────────────────────────────────────────────┐
│  1. Calculer USDC de CyLimit                                  │
│     Balance Master Old Wallet - SUM(users.totalBalance)       │
│     ↓                                                          │
│  2. Double vérification manuelle                              │
│     ↓                                                          │
│  3. Transférer USDC de CyLimit                                │
│     Master Old Wallet → Master New Wallet                     │
│     ⚠️ Laisser USDC des users dans Master Old Wallet         │
└───────────────────────────────────────────────────────────────┘
```

**Résultat attendu :**
- ✅ USDC de CyLimit dans Master New Wallet
- ✅ USDC des users restent dans Master Old Wallet (pour migration automatique)
- ✅ Gas : ~$0.05

---

### PHASE 3 : Reminting des 25'000 NFTs

```
┌───────────────────────────────────────────────────────────────┐
│  1. Préparer données (prepare-nfts-for-remint.js)            │
│     - Récupérer tous les NFTs où ownerId != null             │
│     - Générer JSON avec cid, ownerId, rarity, etc.           │
│     - Total: 25'000 NFTs                                      │
│     ↓                                                          │
│  2. Reminter en batch de 100 (remint-nfts-v2-batch.js)      │
│     - 250 batches × 100 NFTs                                  │
│     - Pour chaque batch:                                      │
│       • batchMint(masterNewWallet, [tokenURI1...100])        │
│       • Récupérer nouveaux tokenIds                           │
│       • Mettre à jour DB:                                     │
│         - contractAddress → NFT v2 address                    │
│         - tokenId → nouveau tokenId                           │
│         - oldTokenId → ancien tokenId v1                      │
│         - oldContractAddress → 0xA049a...                     │
│         - ownerId → RESTE INCHANGÉ ✅                        │
│     ↓                                                          │
│  3. Vérifier reminting (verify-remint.js)                    │
│     - Tous les NFTs ont contractAddress v2                    │
│     - Tous les NFTs ont oldTokenId rempli                     │
│     - totalSupply() on-chain == 25'000                        │
│     - ownerOf(tokenId) == Master New Wallet (pour tous)       │
└───────────────────────────────────────────────────────────────┘
```

**Résultat attendu :**
- ✅ 25'000 NFTs remintés sur contrat v2
- ✅ Owner on-chain : Master New Wallet (tous)
- ✅ Owner en DB : Propriétaires originaux (inchangé)
- ✅ Gas total : ~$1'000 (avec batch, économie 50%)

---

### PHASE 4 : Migration Automatique User (à la connexion)

```
┌───────────────────────────────────────────────────────────────┐
│  User se connecte avec Coinbase Embedded Wallet               │
│  ↓                                                             │
│  Frontend → PATCH /users/me/wallet-address                    │
│  { walletAddress: <Embedded Wallet> }                         │
│  ↓                                                             │
│  Backend: user.controller.ts → syncWalletAddress()            │
│  ↓                                                             │
│  Backend: migration.service.ts → migrateUserAssets()          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Vérifier si migration nécessaire                    │ │
│  │    - user.totalBalance > 0 OU                           │ │
│  │    - nfts.find({ ownerId: userId }).count() > 0        │ │
│  │    ↓                                                     │ │
│  │ 2. Marquer migrationStatus = 'in_progress'             │ │
│  │    ↓                                                     │ │
│  │ 3. Transférer USDC (si totalBalance > 0)               │ │
│  │    Master Old Wallet → Embedded Wallet                  │ │
│  │    Montant: user.totalBalance                           │ │
│  │    ↓                                                     │ │
│  │ 4. Transférer NFTs v2 (si NFTs en DB)                  │ │
│  │    Pour chaque NFT où ownerId == userId:                │ │
│  │    ┌─────────────────────────────────────────────────┐ │ │
│  │    │ IF contractAddress == NFT_V2_ADDRESS:           │ │ │
│  │    │   • Utiliser Master New Wallet (whitelisté)     │ │ │
│  │    │   • transferFrom(masterNewWallet, embeddedWallet│ │ │
│  │    │   • ownerId reste inchangé en DB ✅            │ │ │
│  │    │                                                  │ │ │
│  │    │ IF contractAddress == NFT_V1_ADDRESS:           │ │ │
│  │    │   • ⚠️ NE PAS MIGRER (laisser sur v1)         │ │ │
│  │    │   • Sera burné plus tard                        │ │ │
│  │    └─────────────────────────────────────────────────┘ │ │
│  │    ↓                                                     │ │
│  │ 5. Mettre à jour user en DB                            │ │
│  │    - totalBalance = 0                                   │ │
│  │    - migrationStatus = 'completed'                     │ │
│  │    - migratedAt = Date.now()                           │ │
│  │    - oldWalletAddress = ancien wallet                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ↓                                                             │
│  Retourner résultat migration au frontend                     │
└───────────────────────────────────────────────────────────────┘
```

**Résultat attendu (par user) :**
- ✅ USDC transférés dans Embedded Wallet
- ✅ NFTs v2 transférés dans Embedded Wallet
- ✅ NFTs v1 restent où ils sont (ne sont PAS migrés)
- ✅ Gas par user : ~$0.04 (USDC) + ~$0.04 × nb_NFTs_v2
- ✅ Durée : < 30 secondes

---

## 🔐 Sécurité

### Whitelist NFT v2

**Adresses whitelistées :**
1. Master New Wallet (pour migration automatique)
2. Marketplace v2 (pour ventes/achats)

**Règles de transfert :**
- ✅ Master New Wallet peut transférer n'importe quel NFT
- ✅ Marketplace peut transférer NFTs lors ventes
- ❌ Users ne peuvent PAS transférer directement entre eux
- ❌ Users ne peuvent PAS transférer vers wallets externes

### Gestion des clés privées

**Master Old Wallet :**
- ⚠️ Détient USDC de tous les users
- ⚠️ Clé privée stockée dans `.env` backend (chiffré), à garder uniquement dans la partie admin
- ⚠️ Utilisé uniquement pour migration USDC

**Master New Wallet :**
- ⚠️ Détient NFTs v2 temporairement
- ⚠️ Clé privée stockée dans `.env` backend (chiffré), à supprimer dès que la migration aura été effectuée par 100% des users
- ⚠️ Utilisé pour migration NFTs v2 + collecter fees CyLimit + collecter chiffre d'affaires lors de ventes de NFTs

**Old User Wallets :**
- ⚠️ privateKey stockée en DB (chiffré)
- ⚠️ NE PLUS UTILISER après migration v2
- ℹ️ NFTs v1 restent sur ces wallets (seront burnés plus tard)

---

## 📊 Métriques de Migration

### Données à suivre

```javascript
{
  "nfts": {
    "total": 25000,
    "reminted_v2": 0,      // NFTs remintés sur v2
    "pending_remint": 25000
  },
  "users": {
    "total": 1000,
    "with_usdc": 800,      // Users avec totalBalance > 0
    "with_nfts_v1": 150,   // Users avec NFTs v1
    "with_nfts_v2": 850,   // Users avec NFTs v2 (après remint)
    "migrated": 0,         // Users migrés (migrationStatus = 'completed')
    "in_progress": 0,
    "failed": 0,
    "pending": 1000
  },
  "costs": {
    "nft_v2_deploy": "TBD",
    "marketplace_deploy": "TBD",
    "remint_batch": "TBD",
    "migrations_total": "TBD"
  }
}
```

---

## ⚠️ Risques et Mitigations

### Risque 1 : Échec de remint à mi-parcours

**Impact :** 🔴 CRITIQUE  
**Probabilité :** 🟡 MOYEN

**Scénario :**
- Script plante après 10'000 NFTs remintés
- NFTs déjà remintés OK, mais 15'000 restants non traités

**Mitigation :**
- ✅ Script avec point de reprise (fichier `progress.json`)
- ✅ Logs détaillés de chaque batch
- ✅ Relancer le script reprend où il s'est arrêté
- ✅ Dry-run avant le vrai remint

---

### Risque 2 : Gas fees trop élevés

**Impact :** 🟡 MOYEN  
**Probabilité :** 🟡 MOYEN

**Scénario :**
- Gas price monte à 200 gwei pendant le remint
- Coût passe de $1'000 à $5'000

**Mitigation :**
- ✅ Monitorer gas price avant lancement
- ✅ Attendre gas < 50 gwei (via Polygonscan API)
- ✅ Script pause automatique si gas > 100 gwei
- ✅ Notification Slack si gas trop élevé

---

### Risque 3 : NFTs perdus pendant migration user

**Impact :** 🔴 CRITIQUE  
**Probabilité :** 🟢 FAIBLE

**Scénario :**
- Transfert NFT échoue mais DB marquée comme migrée
- User perd l'accès à ses NFTs

**Mitigation :**
- ✅ Transaction atomique : transfert + update DB ensemble
- ✅ Si transfert échoue, DB n'est PAS mise à jour
- ✅ Retry automatique (3 tentatives)
- ✅ Logs détaillés avec txHash
- ✅ migrationStatus = 'failed' si erreur persistante
- ✅ Admin peut relancer migration manuellement

---

### Risque 4 : USDC mal calculé (CyLimit vs users)

**Impact :** 🔴 CRITIQUE  
**Probabilité :** 🟢 FAIBLE

**Scénario :**
- Calcul incorrect : transférer trop ou pas assez d'USDC CyLimit
- Master Old Wallet n'a plus assez pour migrations users

**Mitigation :**
- ✅ Double vérification manuelle du calcul
- ✅ Test avec petit montant d'abord (10 USDC)
- ✅ Vérifier balance Master Old Wallet après transfert
- ✅ Balance restante >= SUM(users.totalBalance)

---

### Risque 5 : User se connecte pendant le remint

**Impact :** 🟡 MOYEN  
**Probabilité :** 🟡 MOYEN

**Scénario :**
- User se connecte avant que tous ses NFTs soient remintés
- Certains NFTs v2 pas encore mintés

**Mitigation :**
- ✅ Remint d'abord TOUS les NFTs (Phase 3 complète)
- ✅ Activer migration automatique APRÈS remint complet
- ✅ Flag en DB : `remint_completed = true`
- ✅ Migration bloquée si remint pas terminé

---

## 🔄 Rollback Plan

### Si problème critique détecté

```
┌───────────────────────────────────────────────────────────────┐
│  1. SUSPENDRE MIGRATIONS AUTOMATIQUES                         │
│     - Flag en DB: MIGRATION_ENABLED = false                   │
│     - Annonce frontend: "Maintenance en cours"                │
│     ↓                                                          │
│  2. ANALYSER LOGS D'ERREURS                                   │
│     - Identifier users en migrationStatus = 'failed'          │
│     - Vérifier txHash des transactions échouées               │
│     - Identifier la cause racine                              │
│     ↓                                                          │
│  3. CORRIGER LE PROBLÈME                                      │
│     - Patcher migration.service.ts si nécessaire              │
│     - Redéployer backend                                      │
│     ↓                                                          │
│  4. REPRENDRE MIGRATIONS                                       │
│     - Relancer migration pour users 'failed'                  │
│     - Réactiver flag: MIGRATION_ENABLED = true                │
│     ↓                                                          │
│  5. MIGRATION MANUELLE (si nécessaire)                        │
│     - Admin endpoint: POST /admin/users/:id/force-migrate     │
│     - Logs détaillés pour traçabilité                         │
└───────────────────────────────────────────────────────────────┘
```

---

## 📞 Support

### Pour les Users

**FAQ Migration** : `/docs/FAQ-MIGRATION.md` (à créer)

**Questions courantes :**
- "Où sont mes NFTs ?" → Dans ton Embedded Wallet (vérifier sur Polygonscan)
- "Combien de temps ça prend ?" → < 30 secondes
- "Mes NFTs v1 ?" → Restent où ils sont, seront retirés plus tard

**Support Email :** support@cylimit.com

---

### Pour l'Équipe

**Logs Backend :**
```bash
# Suivre migrations en temps réel
tail -f backend.log | grep "Migration"

# Compter migrations réussies
grep "Migration completed" backend.log | wc -l

# Voir erreurs
grep "Migration failed" backend.log
```

**Vérifier état migration :**
```javascript
// Dans MongoDB
db.users.aggregate([
  {
    $group: {
      _id: "$migrationStatus",
      count: { $sum: 1 }
    }
  }
])
```

---

## ✅ Checklist Finale

Avant de lancer en production :

- [ ] NFT v2 déployé et vérifié sur Polygonscan
- [ ] Marketplace v2 déployé et vérifié
- [ ] Whitelist configurée correctement
- [ ] 25'000 NFTs remintés et vérifiés
- [ ] USDC CyLimit transférés au Master New Wallet
- [ ] Migration testée avec 1 user pilote (succès)
- [ ] Migration testée avec 10 users staging (taux succès > 95%)
- [ ] Backup DB effectué
- [ ] Monitoring Slack configuré
- [ ] FAQ migration publiée
- [ ] Équipe support briefée

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 14 Octobre 2025  
**Version :** 1.0.0

