# 🚀 GUIDE DE DÉMARRAGE RAPIDE - MIGRATION V1→V2

**Date :** 14 Octobre 2025  
**Pour :** Valentin @ CyLimit  
**Status :** ✅ Prêt à exécuter

---

## 🎯 CE QUE TU VAS FAIRE

1. ✅ Créer le Master New Wallet (Coinbase Server Wallet)
2. ✅ Transférer du MATIC pour les gas fees
3. ✅ Déployer les contrats NFT v2 et Marketplace v2
4. ✅ Reminter les 25,000 NFTs
5. ✅ Tester la migration avec 1 user

**Temps estimé :** 1 journée

---

## 🔑 PHASE 1 : SETUP MASTER WALLET (30 minutes)

### Étape 1.1 : Vérifier les clés Coinbase CDP

```bash
cd cylimit-admin-backend
cat .env | grep COINBASE
```

**Tu dois avoir :**
```bash
COINBASE_API_KEY_NAME=organizations/.../apiKeys/...
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n..."
```

**Si tu ne les as pas :**
1. Va sur https://portal.cdp.coinbase.com
2. Crée un projet "Server Wallets v2"
3. Génère une API Key
4. Copie dans ton `.env`

---

### Étape 1.2 : Créer le Master New Wallet

```bash
cd cylimit-admin-backend
node scripts/create-master-wallet.js
```

**Résultat attendu :**
```
✅ WALLET CRÉÉ AVEC SUCCÈS !

📍 ADDRESS (Master New Wallet):
   0xABCDEF1234567890ABCDEF1234567890ABCDEF12

🔑 TYPE: Coinbase Smart Account (ERC-4337)
🔐 CLÉS: Secured by Coinbase
```

**Copie l'adresse !**

---

### Étape 1.3 : Ajouter l'adresse dans `.env`

```bash
# cylimit-admin-backend/.env

# Master New Wallet (Coinbase Server Wallet)
MASTER_NEW_WALLET_ADDRESS=0xABCDEF1234567890...  # Ton adresse
```

**⚠️ PAS besoin de `MASTER_NEW_WALLET_PRIVATE_KEY` !**  
Coinbase gère la clé privée automatiquement.

---

### Étape 1.4 : Transférer du MATIC

**Via MetaMask :**
1. Réseau : **Polygon Mainnet**
2. Montant : **50 MATIC**
3. Destination : `0xABCDEF...` (ton Master New Wallet)

**Vérifier sur Polygonscan :**
```
https://polygonscan.com/address/0xABCDEF...
```

Tu dois voir : **Balance : 50 MATIC** ✅

---

## 🚀 PHASE 2 : DÉPLOIEMENT CONTRATS (2 heures)

### Étape 2.1 : Déployer NFT v2

```bash
cd cylimit-admin-backend
NETWORK=polygon node scripts/deploy-nft-v2-mainnet.js
```

**⏱️ Durée :** ~5 minutes

**Résultat attendu :**
```
✅ NFT v2 deployed at: 0x123ABC...
✅ Master Wallet whitelisted
✅ Polygonscan: https://polygonscan.com/address/0x123ABC...
```

**Copie l'adresse du contrat !**

**Ajouter dans `.env` :**
```bash
NFT_V2_CONTRACT_ADDRESS=0x123ABC...
```

---

### Étape 2.2 : Déployer Marketplace v2

```bash
NETWORK=polygon node scripts/deploy-marketplace-v2-mainnet.js
```

**⏱️ Durée :** ~5 minutes

**Résultat attendu :**
```
✅ Marketplace deployed at: 0x456DEF...
✅ Marketplace whitelisted in NFT v2
✅ Polygonscan: https://polygonscan.com/address/0x456DEF...
```

**Ajouter dans `.env` :**
```bash
MARKETPLACE_V2_CONTRACT_ADDRESS=0x456DEF...
```

---

## 💰 PHASE 3 : REMINT DES NFTs (3 heures)

### Étape 3.1 : Calculer USDC CyLimit

```bash
node scripts/calculate-cylimit-usdc.js
```

**Résultat attendu :**
```
Master Old Wallet: 12,500 USDC
SUM(users.totalBalance): 10,000 USDC
USDC CyLimit: 2,500 USDC
```

---

### Étape 3.2 : Transférer USDC CyLimit

**Via MetaMask :**
1. Wallet : **Master Old Wallet**
2. Token : **USDC** (0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
3. Montant : **2,500 USDC** (montant calculé)
4. Destination : **Master New Wallet** (0xABCDEF...)

**Vérifier :**
```bash
# Balance USDC Master New Wallet doit être 2,500 USDC
```

---

### Étape 3.3 : Préparer les données de remint

```bash
node scripts/prepare-nfts-for-remint.js
```

**⏱️ Durée :** ~2 minutes

**Résultat attendu :**
```
✅ 25,000 NFTs trouvés
✅ 250 batches créés
✅ Fichier créé : data/nfts-to-remint.json
```

---

### Étape 3.4 : Reminter les 25,000 NFTs

```bash
node scripts/remint-nfts-v2-batch.js
```

**⏱️ Durée :** ~2-3 heures

**⚠️ NE PAS FERMER LE TERMINAL !**

**Résultat attendu (en cours) :**
```
Batch 1/250 (NFTs 0-99)
  ✅ Minté ! TX: 0xabc...
  ✅ DB mise à jour

Batch 2/250 (NFTs 100-199)
  ✅ Minté ! TX: 0xdef...
  ...
```

**Si le script crash, relance-le → il reprend où il s'est arrêté !**

---

### Étape 3.5 : Vérifier le remint

```bash
node scripts/verify-remint.js
```

**Résultat attendu :**
```
Vérification DB:
  ✅ 25,000 NFTs avec contractAddress = NFT_V2
  ✅ Tous ont tokenId
  ✅ Tous ont oldTokenId

Vérification Blockchain:
  ✅ totalSupply() = 25,000
  ✅ ownerOf() = Master New Wallet

🎉 STATUS: PASSED
```

---

## 🧪 PHASE 4 : TEST MIGRATION (1 heure)

### Étape 4.1 : Tester avec 1 user

```bash
node scripts/test-migration-single-user.js
```

**Ce que le script fait :**
1. Crée un user de test
2. Lui assigne 50 USDC + 3 NFTs v2 en DB
3. Génère une Embedded Wallet
4. Déclenche la migration
5. Vérifie que tout est transféré

**Résultat attendu :**
```
✅ User créé : test@cylimit.com
✅ Wallet créé : 0xTEST...
✅ Migration réussie !

Vérifications:
  ✅ USDC: 50 USDC transférés
  ✅ NFTs: 3/3 transférés
  ✅ DB: migrationStatus = completed

🎉 TEST RÉUSSI !
```

---

## ✅ CHECKLIST FINALE

**Avant de passer en production :**

- [ ] Master New Wallet créé et configuré
- [ ] 50 MATIC transférés au Master New Wallet
- [ ] NFT v2 déployé et vérifié sur Polygonscan
- [ ] Marketplace v2 déployé et vérifié
- [ ] USDC CyLimit transféré vers Master New Wallet
- [ ] 25,000 NFTs remintés
- [ ] Vérification remint : PASSED
- [ ] Test migration 1 user : RÉUSSI
- [ ] Toutes les adresses dans `.env` du user backend

---

## 🎉 PHASE 5 : PRODUCTION

**Une fois tous les tests validés :**

1. **Activer l'auto-migration** (déjà dans le code !)
   - Quand un user login avec Coinbase → migration automatique

2. **Monitorer via dashboard admin :**
   ```bash
   curl -X GET "http://localhost:3000/admin/migration/stats" \
     -H "Authorization: Bearer $ADMIN_JWT" | jq
   ```

3. **Surveiller les logs backend :**
   ```bash
   tail -f backend.log | grep "Migration"
   ```

---

## 📊 VARIABLES D'ENVIRONNEMENT FINALES

**`cylimit-admin-backend/.env` :**
```bash
# Coinbase CDP
COINBASE_API_KEY_NAME=organizations/.../apiKeys/...
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n..."

# Master Wallets
MASTER_NEW_WALLET_ADDRESS=0xABCDEF...
MASTER_OLD_WALLET_ADDRESS=0x123456...  # Existant

# Contrats v2
NFT_V2_CONTRACT_ADDRESS=0x123ABC...
MARKETPLACE_V2_CONTRACT_ADDRESS=0x456DEF...

# Polygon
ALCHEMY_POLYGON_API_KEY=xxx
```

**`cylimit-backend-develop/.env` :**
```bash
# Même config que admin backend (pour la migration auto)
MASTER_NEW_WALLET_ADDRESS=0xABCDEF...
NFT_V2_CONTRACT_ADDRESS=0x123ABC...
MARKETPLACE_V2_CONTRACT_ADDRESS=0x456DEF...
```

---

## 🆘 EN CAS DE PROBLÈME

### Erreur : "CDP Client not initialized"
**Solution :** Vérifier que `COINBASE_API_KEY_NAME` et `COINBASE_API_KEY_PRIVATE_KEY` sont dans `.env`

### Erreur : "Insufficient funds"
**Solution :** Transférer plus de MATIC au Master New Wallet

### Remint script crash
**Solution :** Relancer le script → il reprend automatiquement où il s'est arrêté

### Balance USDC incorrecte
**Solution :** Vérifier que le transfert depuis Master Old Wallet est confirmé sur Polygonscan

---

## 📞 AIDE

**Documentation complète :**
- `docs/Wallets/ARCHITECTURE-FINALE-CORRECTE.md` : Architecture
- `docs/Wallets/INDEX-DOCUMENTATION.md` : Index complet
- `cylimit-admin-backend/scripts/README-BLOCKCHAIN.md` : Scripts

**Monitoring :**
- Portal CDP : https://portal.cdp.coinbase.com
- Polygonscan : https://polygonscan.com

---

**Prêt à démarrer ?** 🚀

**Première commande à lancer :**
```bash
cd cylimit-admin-backend
node scripts/create-master-wallet.js
```

**Bonne chance ! 🎉**

