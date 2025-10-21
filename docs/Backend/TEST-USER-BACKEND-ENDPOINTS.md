# 🧪 Tests Endpoints User Backend (Wallet Module)

## ✅ Prérequis
1. Backend user en cours d'exécution (port 3000)
2. Token JWT valide (voir commande ci-dessous)

---

## 🔐 1. Obtenir un JWT Token

```bash
# Login admin (ou user existant)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@cylimit.com",
    "password": "admin-dev@cylimit.com"
  }'
```

**Copier le `access_token` retourné et l'utiliser dans les tests ci-dessous.**

---

## 🟢 2. Tests Marketplace

### 2.1 Calculer les fees (public, sans auth)

```bash
curl -X POST http://localhost:3000/v1/marketplace/calculate-fees \
  -H "Content-Type: application/json" \
  -d '{
    "nftPrice": 100,
    "buyerIsPremium": false,
    "sellerIsPremium": false
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "nftPrice": 100,
    "buyerFee": 0,
    "sellerFee": 5,
    "totalCostForBuyer": 100,
    "totalReceivedBySeller": 95,
    "feesBreakdown": {
      "buyerFeesPercentage": 0,
      "sellerFeesPercentage": 5,
      "buyerIsPremium": false,
      "sellerIsPremium": false
    }
  }
}
```

---

### 2.2 Préparer un achat NFT (avec auth)

```bash
# Remplacer YOUR_JWT_TOKEN par le token obtenu ci-dessus
curl -X POST http://localhost:3000/v1/marketplace/prepare-purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "nftPrice": 100,
    "buyerAddress": "0xBuyerWalletAddress",
    "sellerAddress": "0xSellerWalletAddress",
    "tokenId": "12345",
    "buyerIsPremium": false,
    "sellerIsPremium": false
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Transaction préparée. Exécuter les transactions dans l'ordre depuis le frontend.",
  "data": {
    "nftPrice": 100,
    "totalCost": 100,
    "feesBreakdown": { ... },
    "transactions": [
      {
        "order": 1,
        "type": "USDC_TRANSFER_TO_SELLER",
        "from": "0xBuyerWalletAddress",
        "to": "0xSellerWalletAddress",
        "amount": 95,
        "description": "Paiement au vendeur (95 USDC)"
      },
      {
        "order": 2,
        "type": "USDC_TRANSFER_TO_CYLIMIT",
        "from": "0xBuyerWalletAddress",
        "to": "0xMasterWalletAddress",
        "amount": 5,
        "description": "Frais CyLimit (5 USDC)"
      },
      {
        "order": 3,
        "type": "NFT_TRANSFER",
        "from": "0xSellerWalletAddress",
        "to": "0xBuyerWalletAddress",
        "tokenId": "12345",
        "contractAddress": "0xNFTContractAddress",
        "description": "Transfert NFT #12345"
      }
    ],
    "instructions": "..."
  }
}
```

---

### 2.3 Préparer un listing NFT (avec auth)

```bash
curl -X POST http://localhost:3000/v1/marketplace/prepare-listing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tokenId": "12345",
    "price": 100,
    "sellerAddress": "0xSellerWalletAddress"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Listing préparé. Le NFT peut être mis en vente.",
  "data": {
    "tokenId": "12345",
    "price": 100,
    "sellerAddress": "0xSellerWalletAddress",
    "estimatedSellerFee": 5,
    "estimatedSellerReceives": 95,
    "listingValid": true
  }
}
```

---

## 🟣 3. Tests Onramp/Offramp

### 3.1 Générer un lien Onramp (acheter USDC) (avec auth)

```bash
curl -X POST http://localhost:3000/v1/onramp/generate-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destinationAddress": "0xUserWalletAddress",
    "amountEUR": 50
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Lien Onramp généré. Rediriger le user vers l'URL.",
  "data": {
    "onrampUrl": "https://pay.coinbase.com/buy/select-asset?...",
    "destinationAddress": "0xUserWalletAddress",
    "amount": "50 EUR",
    "expiresAt": "..."
  }
}
```

---

### 3.2 Générer un lien Offramp (retirer EUR) (avec auth)

```bash
curl -X POST http://localhost:3000/v1/offramp/generate-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sourceAddress": "0xUserWalletAddress",
    "amountUSDC": 50,
    "redirectUrl": "https://app.cylimit.com/wallet/withdraw/success"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Lien Offramp généré. Rediriger le user vers l'URL.",
  "data": {
    "offrampUrl": "https://pay.coinbase.com/...",
    "sourceAddress": "0xUserWalletAddress",
    "amount": "50 USDC",
    "redirectUrl": "..."
  }
}
```

---

### 3.3 Vérifier le statut d'une transaction Onramp (avec auth)

```bash
# Remplacer TRANSACTION_ID par un ID réel
curl -X GET http://localhost:3000/v1/onramp/transaction/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "transactionId": "TRANSACTION_ID",
    "status": "completed",
    "amount": "50 USDC",
    "destinationAddress": "0x...",
    "completedAt": "..."
  }
}
```

---

## 📊 Résumé des Endpoints

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/v1/marketplace/calculate-fees` | POST | ❌ | Calculer fees preview (public) |
| `/v1/marketplace/prepare-purchase` | POST | ✅ | Préparer achat NFT |
| `/v1/marketplace/prepare-listing` | POST | ✅ | Préparer listing NFT |
| `/v1/onramp/generate-link` | POST | ✅ | Générer lien achat USDC |
| `/v1/offramp/generate-link` | POST | ✅ | Générer lien retrait EUR |
| `/v1/onramp/transaction/:id` | GET | ✅ | Vérifier statut transaction |

---

## ⚠️ Notes Importantes

1. **JWT Token** : Expire après 24h par défaut. Re-login si erreur 401.
2. **Adresses Wallet** : Pour les tests, utiliser des adresses Ethereum valides (format `0x...`).
3. **Coinbase API Keys** : Les endpoints Onramp/Offramp nécessitent `COINBASE_API_KEY_NAME` et `COINBASE_API_KEY_PRIVATE_KEY` configurés dans `.env`.
4. **Network** : Base Sepolia testnet par défaut. Configurer `BLOCKCHAIN_NETWORK` dans `.env` si besoin.

---

## 🎯 Prochaine Étape

Une fois les tests OK, tu peux passer à l'intégration frontend :
- Créer les hooks React (`useOnramp`, `useMarketplace`)
- Créer les composants UI (modals, boutons)
- Intégrer avec les Embedded Wallets

