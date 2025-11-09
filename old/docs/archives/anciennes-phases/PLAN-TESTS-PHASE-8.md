# 🧪 PLAN DE TESTS - PHASE 8

**Date :** 21 Octobre 2025  
**Status :** 📋 PRÊT POUR EXÉCUTION

---

## 🎯 OBJECTIF

Valider que tous les composants de la Phase 8 fonctionnent correctement en environnement testnet (Base Sepolia) avant le passage en production.

---

## ✅ PRÉREQUIS

Avant de commencer les tests, vérifier que :

- [x] Contrats déployés sur Base Sepolia :
  - NFT v2 : `0xYourNFTContractAddress`
  - Marketplace v2 : `0xYourMarketplaceAddress`
- [ ] Paymaster configuré et actif
- [ ] Backend Admin démarré (port 3001)
- [ ] Backend User démarré (port 3000)
- [ ] Frontend démarré (port 3005)
- [ ] User test avec :
  - Embedded Wallet créé
  - 100 USDC testnet
  - 1+ NFT possédé

---

## 🧪 TEST 1 : BACKEND ADMIN - Master Wallet

### Objectif :
Vérifier que le Master Wallet fonctionne correctement.

### Steps :

1. **Vérifier connexion CDP** :
   ```bash
   cd cylimit-admin-backend
   node -e "const { CdpClient } = require('@coinbase/cdp-sdk'); const cdp = new CdpClient(); cdp.evm.getOrCreateAccount({ name: 'MasterWalletCyLimitBase' }).then(acc => console.log('✅ Master Wallet:', acc.address));"
   ```

2. **Test Mint NFT** (via Postman ou curl) :
   ```bash
   POST http://localhost:3001/nft/mint
   Headers: { Authorization: "Bearer YOUR_ADMIN_JWT" }
   Body: {
     "toAddress": "0xUserAddress",
     "tokenURI": "ipfs://QmTest123"
   }
   ```

   **Résultat attendu** :
   ```json
   {
     "success": true,
     "tokenId": 1,
     "txHash": "0x...",
     "explorerUrl": "https://sepolia.basescan.org/tx/0x..."
   }
   ```

3. **Vérifier sur Basescan** :
   - Ouvrir `explorerUrl`
   - Vérifier : `From` = Master Wallet, `To` = NFT Contract
   - Vérifier : Gas = $0 (payé par Master Wallet)

**✅ Critères de succès** :
- Master Wallet accessible
- Mint fonctionne
- Gas payé automatiquement
- TX confirmée on-chain

---

## 🧪 TEST 2 : BACKEND USER - List NFT

### Objectif :
Vérifier que le listing d'un NFT fonctionne (DB uniquement, $0 gas).

### Steps :

1. **Créer user test** (si pas déjà fait) :
   ```bash
   POST http://localhost:3000/auth/register
   Body: {
     "email": "test@cylimit.com",
     "password": "Test123!",
     "username": "testuser"
   }
   ```

2. **Login et récupérer JWT** :
   ```bash
   POST http://localhost:3000/auth/login
   Body: {
     "email": "test@cylimit.com",
     "password": "Test123!"
   }
   ```

   Copier le `token` de la réponse.

3. **Lister un NFT** :
   ```bash
   POST http://localhost:3000/marketplace/list
   Headers: { Authorization: "Bearer YOUR_JWT" }
   Body: {
     "nftId": "NFT_ID_FROM_DB",
     "priceUSDC": 100
   }
   ```

   **Résultat attendu** :
   ```json
   {
     "success": true,
     "listingId": "...",
     "nftId": "...",
     "price": 100,
     "message": "NFT listed successfully (no gas cost)"
   }
   ```

4. **Vérifier en DB** :
   ```bash
   # MongoDB
   db.listings.findOne({ _id: ObjectId("listingId") })
   ```

   Vérifier :
   - `status` = "active"
   - `price` = 100
   - `nftId` correspond

**✅ Critères de succès** :
- Listing créé en DB
- $0 gas (pas de blockchain)
- Response instantanée (< 1s)

---

## 🧪 TEST 3 : FRONTEND - Connexion Wallet

### Objectif :
Vérifier que le hook `useCoinbaseWallet` fonctionne.

### Steps :

1. **Ouvrir frontend** : http://localhost:3005

2. **Tester connexion wallet** :
   - Cliquer sur "Connect Wallet"
   - Popup Coinbase Wallet apparaît
   - Se connecter avec email test
   - Vérifier : address affichée

3. **Tester dans console browser** :
   ```javascript
   // Ouvrir DevTools → Console
   const wallet = useCoinbaseWallet();
   console.log('Connected:', wallet.isConnected);
   console.log('Address:', wallet.address);
   ```

**✅ Critères de succès** :
- Popup Coinbase Wallet apparaît
- Connexion réussie
- Address affichée correctement

---

## 🧪 TEST 4 : END-TO-END - Achat NFT avec Signature

### Objectif :
Tester le flow complet : liste → achète → signature → confirmation.

### Steps :

#### Étape 1 : Setup

1. **User A (Seller)** :
   - Possède NFT #123
   - Liste NFT pour 100 USDC

2. **User B (Buyer)** :
   - Possède 150 USDC
   - Va acheter NFT #123

#### Étape 2 : Lister NFT (User A)

1. Login User A
2. POST `/marketplace/list`
   ```json
   {
     "nftId": "NFT_ID_123",
     "priceUSDC": 100
   }
   ```
3. Vérifier : Listing créé

#### Étape 3 : Acheter NFT (User B)

1. Login User B
2. Connecter Coinbase Wallet (frontend)
3. Cliquer "Acheter" sur listing

**Frontend (`useMarketplace.buyNFT`)** :

```typescript
// 1. Préparer UserOperation
const prepareResponse = await axios.post('/marketplace/buy/LISTING_ID');
// Response: { userOpHash: "0x...", status: "prepared" }

// 2. Signer userOpHash
const signature = await signUserOperation(userOpHash);
// Popup Coinbase Wallet → User clique "Sign"

// 3. Finaliser
const finalizeResponse = await axios.post('/marketplace/finalize-user-operation', {
  userOpHash,
  signature
});
// Response: { transactionHash: "0x...", explorerUrl: "..." }
```

#### Étape 4 : Vérifications

1. **Vérifier transaction on-chain** :
   - Ouvrir `explorerUrl`
   - Vérifier : NFT transféré (Seller → Buyer)
   - Vérifier : USDC transféré (Buyer → Seller + Fees)
   - Vérifier : Gas = $0 (sponsorisé par Paymaster)

2. **Vérifier DB** :
   ```javascript
   // Listing updated
   db.listings.findOne({ _id: listingId })
   // → status: "sold", buyerId: userB._id

   // NFT updated
   db.nfts.findOne({ _id: nftId })
   // → ownerId: userB._id, isListed: false
   ```

3. **Vérifier balances** :
   ```javascript
   // User B
   db.users.findOne({ _id: userB._id })
   // → usdcBalance decreased by 105 (100 + 5 fees)

   // User A
   db.users.findOne({ _id: userA._id })
   // → usdcBalance increased by 100
   ```

**✅ Critères de succès** :
- ✅ Popup signature apparaît
- ✅ User signe via wallet
- ✅ Transaction confirmée on-chain
- ✅ NFT transféré (Seller → Buyer)
- ✅ USDC transféré (Buyer → Seller + Fees)
- ✅ Gas = $0 pour user
- ✅ DB updated correctement
- ✅ Atomicité (tout ou rien)

---

## 🧪 TEST 5 : ERROR HANDLING

### Objectif :
Vérifier que les erreurs sont gérées correctement.

### Scénarios à tester :

1. **User rejette signature** :
   - Acheter NFT → Popup → Cliquer "Reject"
   - **Attendu** : Error message affiché, transaction annulée

2. **Balance insuffisante** :
   - User avec 50 USDC essaye d'acheter NFT à 100 USDC
   - **Attendu** : Error "Insufficient balance"

3. **NFT déjà vendu** :
   - Deux users essayent d'acheter le même NFT simultanément
   - **Attendu** : Premier réussit, second reçoit "NFT no longer available"

4. **Timeout blockchain** :
   - Simuler réseau lent
   - **Attendu** : Message "Transaction taking longer than expected..."

**✅ Critères de succès** :
- Erreurs détectées et affichées
- Pas de state corrompu en DB
- UX claire (loading, error messages)

---

## 📊 CHECKLIST FINALE

Avant de passer en production, vérifier :

### Tests Backend ✅
- [ ] Master Wallet fonctionne
- [ ] Mint NFT fonctionne
- [ ] List NFT fonctionne (DB)
- [ ] Buy NFT prepare UserOperation
- [ ] Finalize UserOperation avec signature
- [ ] Error handling

### Tests Frontend ✅
- [ ] useCoinbaseWallet connecte wallet
- [ ] useCoinbaseWallet signe userOpHash
- [ ] useMarketplace list NFT
- [ ] useMarketplace buy NFT (flow complet)
- [ ] Loading states affichés
- [ ] Error messages clairs

### Tests End-to-End ✅
- [ ] Flow complet : liste → achète → confirmé
- [ ] Gas sponsorisé ($0 pour user)
- [ ] Atomicité (tout ou rien)
- [ ] DB synchronized avec blockchain
- [ ] Explorer links fonctionnent

### Tests Non-Fonctionnels ✅
- [ ] Performance (< 30s pour achat)
- [ ] UX (popups, loading, errors)
- [ ] Sécurité (JWT, signatures)
- [ ] Logs backend (Slack notifications)

---

## 🚀 PASSAGE EN PRODUCTION

Une fois tous les tests validés :

1. ✅ Déployer contrats sur Base Mainnet
2. ✅ Vérifier contrats sur Basescan
3. ✅ Configurer Paymaster mainnet
4. ✅ Mettre à jour variables `env.production`
5. ✅ Tester 1 transaction réelle (petit montant)
6. ✅ Monitorer logs (24h)
7. ✅ Activer pour tous les users

---

**Maintenu par :** Équipe CyLimit  
**Date :** 21 Octobre 2025  
**Version :** 1.0.0


