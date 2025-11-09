# 📝 Logging des Activités de Migration et Transferts USDC

## 🎯 Objectif

Cette mise à jour ajoute le logging automatique de toutes les activités de migration (USDC et NFTs) ainsi que des transferts USDC manuels dans la collection `address_activities` de MongoDB pour assurer une traçabilité complète.

## ✅ Modifications Apportées

### 1. Script Admin : Transfert USDC Master → User

**Fichier:** `cylimit-admin-backend/scripts/wallet/transfer-usdc-to-user.cjs`

**Fonctionnalités :**
- Transfert USDC depuis le Master Wallet vers un Embedded Wallet utilisateur
- Validation de l'utilisateur et vérification de la balance
- Logging automatique dans `address_activities` avec type `ADMIN_TRANSFER`
- Affichage du lien explorer pour suivre la transaction

**Usage :**
```bash
cd cylimit-admin-backend
node scripts/wallet/transfer-usdc-to-user.cjs user@example.com 10.5
```

**Documentation complète :** Voir `cylimit-admin-backend/scripts/wallet/README.md`

---

### 2. Service de Migration : Logging USDC

**Fichier:** `cylimit-backend-develop/src/modules/user/services/migration.service.ts`

**Modifications :**
- Ajout de la méthode `logUSDCMigration()` pour logger les transferts USDC
- Appel automatique après chaque transfert USDC réussi dans `transferUSDC()`
- Type d'activité : `MIGRATION_USDC`

**Format du log :**
```typescript
{
  webhookId: 'migration-automatic',
  rawId: 'migration-usdc-{txHash}-{timestamp}',
  type: 'MIGRATION_USDC',
  event: {
    network: 'base' | 'base-sepolia',
    activity: [{
      category: 'erc20_transfer',
      fromAddress: masterWalletAddress,
      toAddress: userEmbeddedWalletAddress,
      rawContract: {
        rawValue: amountInUnits, // USDC en unités (6 decimals)
        address: usdcContractAddress,
        decimals: '6'
      },
      log: {
        removed: false,
        address: usdcContractAddress,
        data: txHash,
        topics: ['migration_usdc', 'from:...', 'to:...', 'amount:...']
      }
    }]
  }
}
```

---

### 3. Service de Migration : Logging NFT

**Fichier:** `cylimit-backend-develop/src/modules/user/services/migration.service.ts`

**Modifications :**
- Ajout de la méthode `logNFTMigration()` pour logger les transferts NFT en batch
- Appel automatique après chaque batch transfert réussi dans `transferNFTsV2()`
- Type d'activité : `MIGRATION_NFT_BATCH`
- Log de tous les NFTs du batch avec leurs tokenIds

**Format du log :**
```typescript
{
  webhookId: 'migration-automatic',
  rawId: 'migration-nft-batch-{txHash}-{timestamp}',
  type: 'MIGRATION_NFT_BATCH',
  event: {
    network: 'base' | 'base-sepolia',
    activity: [
      // Un élément par NFT du batch
      {
        category: 'erc721_transfer',
        fromAddress: masterWalletAddress,
        toAddress: userEmbeddedWalletAddress,
        erc721TokenId: tokenId,
        rawContract: {
          rawValue: '1',
          address: nftContractAddress,
          decimals: '0'
        },
        log: {
          removed: false,
          address: nftContractAddress,
          data: txHash,
          topics: ['migration_nft', 'from:...', 'to:...', 'tokenId:...']
        }
      }
    ]
  }
}
```

---

### 4. Module User : Injection AddressActivityService

**Fichier:** `cylimit-backend-develop/src/modules/user/user.module.ts`

**Modifications :**
- Import du `AddressActivityModule`
- Ajout dans les imports du `UserModule`
- Injection du `AddressActivityService` dans le `MigrationService`

---

## 🔍 Types d'Activités Loggées

| Type | Description | Déclencheur |
|------|-------------|-------------|
| `ADMIN_TRANSFER` | Transfert USDC manuel par admin | Script `transfer-usdc-to-user.cjs` |
| `MIGRATION_USDC` | Migration automatique USDC | Création Embedded Wallet (première connexion) |
| `MIGRATION_NFT_BATCH` | Migration automatique NFT (batch) | Création Embedded Wallet (première connexion) |

---

## 📊 Requêtes MongoDB Utiles

### Voir tous les transferts admin
```javascript
db.address_activities.find({ 
  type: 'ADMIN_TRANSFER' 
}).sort({ createdAt: -1 })
```

### Voir toutes les migrations USDC
```javascript
db.address_activities.find({ 
  type: 'MIGRATION_USDC' 
}).sort({ createdAt: -1 })
```

### Voir toutes les migrations NFT
```javascript
db.address_activities.find({ 
  type: 'MIGRATION_NFT_BATCH' 
}).sort({ createdAt: -1 })
```

### Voir les activités d'un utilisateur spécifique
```javascript
db.address_activities.find({
  'event.activity.toAddress': '0x...' // adresse du user (lowercase)
}).sort({ createdAt: -1 })
```

### Statistiques de migration
```javascript
db.address_activities.aggregate([
  { $match: { type: { $in: ['MIGRATION_USDC', 'MIGRATION_NFT_BATCH'] } } },
  { $group: {
    _id: '$type',
    count: { $sum: 1 }
  }}
])
```

---

## 🛡️ Sécurité et Traçabilité

### Avantages du logging
- ✅ **Audit complet** : Toutes les transactions USDC et NFT sont tracées
- ✅ **Réconciliation** : Vérification des montants transférés vs base de données
- ✅ **Détection de fraudes** : Identification rapide d'activités suspectes
- ✅ **Debugging** : Facilite l'investigation en cas de problème
- ✅ **Conformité** : Respect des exigences réglementaires de traçabilité

### Format standardisé
- Format compatible avec les webhooks Coinbase CDP
- Champs standardisés pour faciliter l'intégration future
- `rawId` unique pour éviter les doublons

### Gestion d'erreurs
- Si le logging échoue, la migration/transfert n'est **pas annulé**
- Les erreurs de logging sont simplement loggées dans les logs serveur
- Permet de ne pas bloquer les opérations critiques

---

## 🚀 Prochaines Étapes Suggérées

1. **Dashboard Admin** : Créer une interface pour visualiser les activités
2. **Alertes** : Configurer des alertes Slack pour les gros transferts
3. **Export CSV** : Ajouter une fonction d'export pour l'audit comptable
4. **Statistiques** : Créer des rapports de migration (succès/échecs)
5. **Webhook Replay** : Permettre de rejouer des événements en cas de problème

---

## 📖 Documentation Connexe

- [Migration Service](../src/modules/user/services/migration.service.ts)
- [Address Activity Schema](../src/modules/address-activity/schemas/address-activity.schema.ts)
- [Script Transfer USDC](../../cylimit-admin-backend/scripts/wallet/transfer-usdc-to-user.cjs)
- [CDP Server Wallets Documentation](https://docs.cdp.coinbase.com/server-wallets/)

---

## ✨ Résumé des Fichiers Modifiés

### Admin Backend
- ✅ **Nouveau** : `scripts/wallet/transfer-usdc-to-user.cjs`
- ✅ **Nouveau** : `scripts/wallet/README.md`

### User Backend
- ✅ **Modifié** : `src/modules/user/services/migration.service.ts`
  - Ajout `logUSDCMigration()`
  - Ajout `logNFTMigration()`
  - Injection `AddressActivityService`
- ✅ **Modifié** : `src/modules/user/user.module.ts`
  - Import `AddressActivityModule`

---

**Date de mise à jour :** 4 Novembre 2025  
**Version :** 1.0.0  
**Statut :** ✅ Implémenté et testé

