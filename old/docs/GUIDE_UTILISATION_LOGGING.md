# 📝 Guide Rapide : Utilisation du Système de Logging

## 🎯 Objectif

Ce guide explique comment utiliser le nouveau système de logging des activités USDC et NFT.

---

## 🔧 1. Script Admin : Transférer USDC Manuellement

### Usage

```bash
cd cylimit-admin-backend
node scripts/wallet/transfer-usdc-to-user.cjs <email> <montant>
```

### Exemples

```bash
# Transférer 10.5 USDC à un utilisateur
node scripts/wallet/transfer-usdc-to-user.cjs user@example.com 10.5

# Transférer 100 USDC
node scripts/wallet/transfer-usdc-to-user.cjs user@example.com 100
```

### Ce que fait le script

1. ✅ Valide que l'utilisateur existe dans la base de données
2. ✅ Vérifie que l'utilisateur a un Embedded Wallet
3. ✅ Vérifie la balance du Master Wallet
4. ✅ Effectue le transfert (gasless sur Base)
5. ✅ Logue la transaction dans `address_activities`
6. ✅ Affiche le lien explorer

### Log créé

```javascript
{
  type: 'ADMIN_TRANSFER',
  webhookId: 'admin-manual-transfer',
  rawId: 'admin-transfer-{txHash}-{timestamp}',
  event: {
    network: 'base' | 'base-sepolia',
    activity: [{ /* détails transaction */ }]
  }
}
```

---

## 🤖 2. Logging Automatique des Migrations

### Quand ça se déclenche ?

Automatiquement lors de la **création d'un Embedded Wallet** (première connexion).

### Workflow

```
User crée Embedded Wallet
  ↓
Backend appelle MigrationService.migrateUserAssets()
  ↓
Transfert USDC (si totalBalance > 0)
  ├─ Transaction on-chain
  └─ Log dans address_activities (type: MIGRATION_USDC)
  ↓
Transfert NFTs (si NFTs trouvés)
  ├─ Transaction batch on-chain
  └─ Log dans address_activities (type: MIGRATION_NFT_BATCH)
  ↓
✅ Migration terminée + loggée
```

### Logs créés

#### Migration USDC
```javascript
{
  type: 'MIGRATION_USDC',
  webhookId: 'migration-automatic',
  rawId: 'migration-usdc-{txHash}-{timestamp}',
  event: {
    network: 'base' | 'base-sepolia',
    activity: [{
      category: 'erc20_transfer',
      fromAddress: masterWalletAddress,
      toAddress: userWalletAddress,
      rawContract: {
        rawValue: amountInUnits, // 6 decimals
        address: usdcContractAddress,
        decimals: '6'
      }
    }]
  }
}
```

#### Migration NFT
```javascript
{
  type: 'MIGRATION_NFT_BATCH',
  webhookId: 'migration-automatic',
  rawId: 'migration-nft-batch-{txHash}-{timestamp}',
  event: {
    network: 'base' | 'base-sepolia',
    activity: [
      // 1 élément par NFT du batch
      {
        category: 'erc721_transfer',
        fromAddress: masterWalletAddress,
        toAddress: userWalletAddress,
        erc721TokenId: tokenId,
        // ...
      }
    ]
  }
}
```

---

## 📊 3. Consulter les Logs

### Via MongoDB

#### Tous les transferts admin
```javascript
db.address_activities.find({ 
  type: 'ADMIN_TRANSFER' 
}).sort({ createdAt: -1 })
```

#### Toutes les migrations USDC
```javascript
db.address_activities.find({ 
  type: 'MIGRATION_USDC' 
}).sort({ createdAt: -1 })
```

#### Toutes les migrations NFT
```javascript
db.address_activities.find({ 
  type: 'MIGRATION_NFT_BATCH' 
}).sort({ createdAt: -1 })
```

#### Activités d'un utilisateur
```javascript
db.address_activities.find({
  'event.activity.toAddress': '0x...' // adresse user (lowercase)
}).sort({ createdAt: -1 })
```

#### Statistiques
```javascript
db.address_activities.aggregate([
  { $match: { 
    type: { $in: ['ADMIN_TRANSFER', 'MIGRATION_USDC', 'MIGRATION_NFT_BATCH'] } 
  }},
  { $group: {
    _id: '$type',
    count: { $sum: 1 }
  }}
])
```

---

## 🔍 4. Vérifier une Transaction

### À partir d'un txHash

```javascript
db.address_activities.findOne({
  'event.activity.log.data': '0x...' // votre txHash
})
```

### À partir d'un tokenId NFT

```javascript
db.address_activities.find({
  'event.activity.erc721TokenId': '123' // votre tokenId
})
```

---

## 🛡️ 5. Sécurité et Traçabilité

### Avantages

- ✅ **Audit complet** : Toutes les transactions sont tracées
- ✅ **Réconciliation** : Vérification DB vs blockchain
- ✅ **Détection fraudes** : Identification activités suspectes
- ✅ **Debugging** : Investigation facilitée
- ✅ **Conformité** : Format standardisé

### Format Standardisé

Tous les logs suivent le format Coinbase CDP webhooks :
- `rawId` unique pour éviter doublons
- `txHash` dans `log.data` pour vérification blockchain
- `topics` pour metadata additionnelle

### Gestion d'Erreurs

Si le logging échoue :
- ❌ L'erreur est loggée dans les logs serveur
- ✅ La transaction/migration **n'est PAS annulée**
- ✅ Les opérations critiques ne sont pas bloquées

---

## 📖 Documentation Complète

- [LOGGING_ACTIVITES_MIGRATION.md](./LOGGING_ACTIVITES_MIGRATION.md) - Documentation technique complète
- [scripts/wallet/README.md](../../cylimit-admin-backend/scripts/wallet/README.md) - Documentation script admin
- [ETAT_PROJET.md](./ETAT_PROJET.md) - État du projet
- [PROCHAINES_ETAPES.md](./PROCHAINES_ETAPES.md) - Roadmap

---

## 🚀 Prochaines Fonctionnalités

1. Dashboard admin pour visualiser les activités
2. Alertes Slack pour les gros transferts
3. Export CSV pour l'audit comptable
4. Statistiques de migration (succès/échecs)

---

**Date :** 4 Novembre 2025  
**Version :** 1.0.0  
**Statut :** ✅ Opérationnel

