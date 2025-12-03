# 🔐 Configuration Paymaster Coinbase CDP - Allowlist de Contrats

**Date :** Novembre 2024  
**Objectif :** Configurer le paymaster pour sponsoriser uniquement les transactions sur vos contrats CyLimit

---

## 📋 Vue d'ensemble

Le **Paymaster Coinbase CDP** permet de sponsoriser le gas des transactions utilisateurs. Pour la sécurité, il est **fortement recommandé** de configurer une **allowlist de contrats** pour limiter le paymaster à sponsoriser uniquement les transactions sur vos contrats.

**⚠️ IMPORTANT :** Sans allowlist, n'importe qui avec votre clé API paymaster peut sponsoriser n'importe quelle transaction !

### 🔍 Détection Automatique des Fonctions Standard ?

**Réponse courte : NON**, Coinbase CDP ne détecte pas automatiquement les fonctions standard ERC-721/ERC-20 pour créer l'allowlist.

**Détails :**
- **Base Sepolia (Testnet)** : Le paymaster sponsorise automatiquement **toutes les transactions** sans allowlist (pour faciliter les tests)
- **Base Mainnet** : L'allowlist manuelle est **obligatoire** pour la sécurité
- **USDC, CBBTC, EURC** : Ces tokens sont automatiquement sponsorisés par **Coinbase Smart Wallet** (pas le paymaster CDP)
- **Server Wallet SDK** : Supporte nativement ERC-20/ERC-721 sans ABI, mais cela ne crée pas automatiquement l'allowlist du paymaster

**Conclusion :** Vous devez manuellement allowlister chaque contrat et chaque fonction, même les fonctions standard comme `transferFrom`, `approve`, etc.

---

## 🚀 Étapes de Configuration

### 1. Accéder au CDP Portal

1. Aller sur **https://portal.cdp.coinbase.com/**
2. Se connecter avec votre compte Coinbase Developer Platform
3. Sélectionner votre projet (ou en créer un nouveau)
4. Naviguer vers **Onchain Tools > Paymaster** dans le menu de gauche

### 2. Activer le Paymaster

1. Aller dans l'onglet **Configuration**
2. Sélectionner **Base Mainnet** (ou Base Sepolia pour les tests) dans le sélecteur de réseau en haut à droite
3. Activer le Paymaster en cliquant sur le toggle **Enable Paymaster**

### 3. Configurer l'Allowlist de Contrats

Pour chaque contrat que vous voulez sponsoriser, vous devez :

1. Cliquer sur **Add** dans la section **Contract allowlist**
2. Entrer l'**adresse du contrat**
3. Spécifier les **signatures de fonctions** autorisées
4. Cliquer sur **Save**

---

## 📝 Contrats et Fonctions à Allowlister pour CyLimit

### ✅ 1. Contrat NFT (CyLimitNFT_v2)

**Adresse (Base Mainnet) :** `NFT_V2_CONTRACT_ADDRESS` (à remplir dans `.env.cloudrun.staging`)

**Fonctions à allowlister :**

```
transferFrom(address,address,uint256)
setApprovalForAll(address,bool)
safeTransferFrom(address,address,uint256)
safeTransferFrom(address,address,uint256,bytes)
```

**Explication :**
- `transferFrom` : Transfert de NFT (utilisé par le Marketplace)
- `setApprovalForAll` : Autorisation du Marketplace à transférer les NFTs
- `safeTransferFrom` : Transfert sécurisé de NFT (ERC-721 standard)

---

### ✅ 2. Contrat Marketplace (CyLimitMarketplace_v2)

**Adresse (Base Mainnet) :** `MARKETPLACE_V2_CONTRACT_ADDRESS` (à remplir dans `.env.cloudrun.staging`)

**Fonctions à allowlister :**

```
buyNFT(uint256,address)
buyMultipleNFTs(uint256[],address[])
listNFT(uint256,uint256)
unlistNFT(uint256)
createBuyOffer(uint256,uint256)
acceptBuyOffer(uint256)
cancelBuyOffer(uint256)
createSwapOffer(address,uint256[],uint256[],uint256,bool)
acceptSwapOffer(uint256)
cancelSwapOffer(uint256)
```

**Explication :**
- `buyNFT` : Achat d'un NFT listé
- `buyMultipleNFTs` : Achat de plusieurs NFTs en batch
- `listNFT` : Lister un NFT à vendre
- `unlistNFT` : Retirer un listing
- `createBuyOffer` : Créer une offre d'achat
- `acceptBuyOffer` : Accepter une offre d'achat
- `cancelBuyOffer` : Annuler une offre d'achat
- `createSwapOffer` : Créer une offre de swap NFT ↔ NFT
- `acceptSwapOffer` : Accepter une offre de swap
- `cancelSwapOffer` : Annuler une offre de swap

---

### ✅ 3. Contrat USDC (Base Mainnet)

**Adresse :** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**Fonctions à allowlister :**

```
transfer(address,uint256)
transferFrom(address,address,uint256)
approve(address,uint256)
```

**Explication :**
- `transfer` : Transfert USDC direct (utilisé dans les batch transactions)
- `transferFrom` : Transfert USDC avec approval (pour les offres d'achat avec escrow)
- `approve` : Autorisation de dépense USDC (pour le Marketplace)

**⚠️ NOTE :** USDC est déjà sponsorisé automatiquement par Coinbase sur Base Mainnet, mais il est recommandé de l'allowlister quand même pour être explicite.

---

## 🔍 Comment Trouver les Signatures de Fonctions

### Méthode 1 : Depuis le contrat Solidity

La signature de fonction est : `nomFonction(type1,type2,...)`

Exemples :
- `buyNFT(uint256,address)` → `buyNFT(tokenId, seller)`
- `transfer(address,uint256)` → `transfer(to, amount)`
- `buyMultipleNFTs(uint256[],address[])` → `buyMultipleNFTs(tokenIds[], sellers[])`

### Méthode 2 : Depuis Basescan

1. Aller sur **https://basescan.org/address/CONTRACT_ADDRESS#code**
2. Ouvrir l'onglet **Contract**
3. Voir les fonctions dans la section **Write Contract**
4. La signature est affichée au format : `functionName(type1,type2)`

### Méthode 3 : Depuis le code

```typescript
import { encodeFunctionData } from 'viem';

// La signature est dans l'ABI
const MARKETPLACE_ABI = [
  {
    name: 'buyNFT',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'seller', type: 'address' }
    ],
    // → Signature : buyNFT(uint256,address)
  }
];
```

---

## 📸 Exemple de Configuration dans le Portal

```
Contract Address: 0x1234...5678 (NFT Contract)
Functions:
  - transferFrom(address,address,uint256)
  - setApprovalForAll(address,bool)
  - safeTransferFrom(address,address,uint256)
  - safeTransferFrom(address,address,uint256,bytes)

Contract Address: 0xabcd...ef01 (Marketplace Contract)
Functions:
  - buyNFT(uint256,address)
  - buyMultipleNFTs(uint256[],address[])
  - listNFT(uint256,uint256)
  - unlistNFT(uint256)
  - createBuyOffer(uint256,uint256)
  - acceptBuyOffer(uint256)
  - cancelBuyOffer(uint256)
  - createSwapOffer(address,uint256[],uint256[],uint256,bool)
  - acceptSwapOffer(uint256)
  - cancelSwapOffer(uint256)

Contract Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC)
Functions:
  - transfer(address,uint256)
  - transferFrom(address,address,uint256)
  - approve(address,uint256)
```

---

## 🔒 Sécurité Supplémentaire

### 1. Limites de Sponsorship

Configurez des limites dans l'onglet **Gas Policy** :

- **Per UserOperation limit** : Montant maximum par transaction sponsorisée
- **Per User limit** : Montant maximum par utilisateur (par jour/mois)
- **Global limit** : Montant maximum total sponsorisé (par mois)

**Recommandations :**
- Per UserOperation : $0.50 - $1.00
- Per User (daily) : $5.00 - $10.00
- Global (monthly) : Selon votre budget

### 2. Paymaster Proxy (Recommandé)

Pour une sécurité maximale, créez un **Paymaster Proxy** sur votre backend :

- Protège votre clé API paymaster
- Permet d'ajouter des validations supplémentaires
- Empêche l'abus du paymaster

**Documentation :** https://docs.cdp.coinbase.com/paymaster/guides/paymaster-proxy

### 3. IP Whitelisting

Dans **API Keys > Manage > Edit Key > API restrictions** :

- Ajoutez les IPs de vos serveurs backend
- Limite les requêtes paymaster à vos serveurs uniquement

---

## ✅ Checklist de Configuration

- [ ] Paymaster activé sur Base Mainnet
- [ ] Contrat NFT allowlisté avec toutes les fonctions
- [ ] Contrat Marketplace allowlisté avec toutes les fonctions
- [ ] Contrat USDC allowlisté (optionnel mais recommandé)
- [ ] Limites de sponsorship configurées
- [ ] Paymaster Proxy configuré (recommandé)
- [ ] IP Whitelisting activé sur les API keys (recommandé)
- [ ] URL du Paymaster copiée dans `.env.cloudrun.staging`

---

## 🔗 URLs du Paymaster

Après configuration, vous obtiendrez une URL du type :

```
Base Mainnet:
https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY

Base Sepolia:
https://api.developer.coinbase.com/rpc/v1/base-sepolia/YOUR_API_KEY
```

**À ajouter dans `.env.cloudrun.staging` :**
```bash
PAYMASTER_URL_MAINNET=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
PAYMASTER_URL_TESTNET=https://api.developer.coinbase.com/rpc/v1/base-sepolia/YOUR_API_KEY
```

---

## 🐛 Dépannage

### Erreur : "target address not in allowed contracts"

**Cause :** Le contrat appelé n'est pas dans l'allowlist.

**Solution :** Ajouter le contrat et la fonction dans la configuration du Paymaster.

### Erreur : "method not in allowed methods"

**Cause :** La fonction appelée n'est pas dans l'allowlist du contrat.

**Solution :** Ajouter la signature de fonction exacte dans l'allowlist.

### Erreur : "rejected due to max per user op spend limit exceeded"

**Cause :** Le coût du gas dépasse la limite par transaction.

**Solution :** Augmenter la limite "Per UserOperation limit" dans Gas Policy.

### Erreur : "request denied - max address transaction sponsorship count reached" (Code -32002)

**Cause :** L'adresse a atteint la limite maximale de transactions sponsorisées configurée dans la politique "Per User Limit" du Paymaster.

**Solution :** 
1. Aller sur **https://portal.cdp.coinbase.com/**
2. Sélectionner votre projet
3. Naviguer vers **Onchain Tools > Paymaster**
4. Aller dans l'onglet **Gas Policy**
5. Dans la section **Per User Limit**, augmenter :
   - Le nombre maximum de UserOperations par utilisateur
   - OU le montant maximum en USD par utilisateur
6. Ajuster le cycle de reset (daily, weekly, monthly) si nécessaire
7. Sauvegarder les modifications

**Note :** Les changements peuvent prendre quelques minutes pour être effectifs.

---

## 📚 Ressources

- **Documentation Paymaster :** https://docs.cdp.coinbase.com/paymaster/introduction/welcome
- **Guide Allowlist :** https://docs.cdp.coinbase.com/paymaster/guides/paymaster-masterclass
- **Sécurité Paymaster :** https://docs.cdp.coinbase.com/paymaster/reference-troubleshooting/security
- **Paymaster Proxy :** https://docs.cdp.coinbase.com/paymaster/guides/paymaster-proxy

---

## 💡 Notes Importantes

1. **Base Sepolia** : Le paymaster sponsorise automatiquement toutes les transactions (pas besoin d'allowlist pour les tests). C'est pourquoi vous voyez peut-être des fonctions pré-enregistrées sur le testnet - c'est normal, le testnet est plus permissif.

2. **Base Mainnet** : L'allowlist est **obligatoire** pour la sécurité. Même les fonctions standard ERC-721/ERC-20 doivent être allowlistées manuellement.

3. **USDC** : Déjà sponsorisé automatiquement par **Coinbase Smart Wallet** (pas le paymaster CDP), mais l'allowlister dans votre paymaster est recommandé pour être explicite.

4. **Batch Transactions** : Tous les contrats appelés dans un batch doivent être allowlistés.

5. **Fonctions Standard** : Même si le SDK CDP reconnaît automatiquement les interfaces ERC-20/ERC-721, le paymaster nécessite une allowlist manuelle. Vous devez ajouter chaque fonction (`transferFrom`, `approve`, `safeTransferFrom`, etc.) manuellement dans le Portal.

---

**Dernière mise à jour :** Novembre 2024

