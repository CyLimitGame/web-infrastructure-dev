# 🚨 CDP SDK V2 UNIQUEMENT - RÈGLE ABSOLUE

**Date :** 21 Octobre 2025  
**Status :** ⚠️ **CRITIQUE - NE JAMAIS UTILISER V1**  
**Priorité :** 🔴 **MAXIMALE**

---

## ⚠️ RÈGLE ABSOLUE

**❌ NE JAMAIS UTILISER `@coinbase/coinbase-sdk` (v1)**  
**✅ TOUJOURS UTILISER `@coinbase/cdp-sdk` (v2)**

Cette règle est **NON-NÉGOCIABLE** et s'applique à **TOUS** les scripts, services, et interactions avec Coinbase Developer Platform.

---

## 📦 PACKAGES

### ❌ À NE JAMAIS UTILISER

```json
{
  "dependencies": {
    "@coinbase/coinbase-sdk": "xxx" // ❌ V1 - INTERDIT
  }
}
```

**Imports à bannir :**
```typescript
// ❌ INTERDIT - V1
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');
```

### ✅ À TOUJOURS UTILISER

```json
{
  "dependencies": {
    "@coinbase/cdp-sdk": "^0.0.16", // ✅ V2 - CORRECT
    "viem": "^2.38.0" // Requis pour encodeFunctionData
  }
}
```

**Imports corrects :**
```typescript
// ✅ CORRECT - V2
import { CdpClient } from '@coinbase/cdp-sdk';
const { CdpClient } = require('@coinbase/cdp-sdk');

// ✅ Pour encoder les calls contract
import { encodeFunctionData } from 'viem';
const { encodeFunctionData } = require('viem');
```

---

## 🔧 CONFIGURATION CDP SDK V2

### Configuration via variables d'environnement

```bash
# .env
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
```

### Initialisation du client

```typescript
// ✅ CORRECT - V2
const { CdpClient } = require('@coinbase/cdp-sdk');

const cdp = new CdpClient();
// Le SDK charge automatiquement les variables d'environnement
```

**⚠️ NOTE :** Pas besoin de `configureFromJson()` avec v2 si les variables d'env sont configurées !

---

## 📝 EXEMPLES D'UTILISATION V2

### 1. Créer ou récupérer un compte

```typescript
// ✅ CORRECT - V2
const cdp = new CdpClient();

// Récupérer ou créer un compte par son nom
const account = await cdp.evm.getOrCreateAccount({
  name: 'MasterWalletCyLimitBase'
});

console.log('Account address:', account.address);
```

### 2. Envoyer une transaction simple

```typescript
// ✅ CORRECT - V2
const { CdpClient } = require('@coinbase/cdp-sdk');
const { parseEther } = require('viem');

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({ name: 'MyAccount' });

const transactionResult = await cdp.evm.sendTransaction({
  address: account.address,
  transaction: {
    to: '0xRecipientAddress',
    value: parseEther('0.001'), // 0.001 ETH
  },
  network: 'base-sepolia'
});

console.log('TX Hash:', transactionResult.transactionHash);
```

### 3. Appeler un smart contract (mint NFT)

```typescript
// ✅ CORRECT - V2
const { CdpClient } = require('@coinbase/cdp-sdk');
const { encodeFunctionData } = require('viem');

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({ name: 'MasterWallet' });

// ABI de la fonction à appeler
const nftAbi = [
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "tokenURI", "type": "string"}
    ],
    "name": "mint",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Encoder le call avec viem
const callData = encodeFunctionData({
  abi: nftAbi,
  functionName: 'mint',
  args: [account.address, 'ipfs://QmYourTokenURI']
});

// Envoyer la transaction
const transactionResult = await cdp.evm.sendTransaction({
  address: account.address,
  transaction: {
    to: '0xNFTContractAddress',
    data: callData
  },
  network: 'base-sepolia'
});

console.log('Mint TX Hash:', transactionResult.transactionHash);
console.log('Basescan:', `https://sepolia.basescan.org/tx/${transactionResult.transactionHash}`);
```

### 4. Créer un Smart Account (ERC-4337)

```typescript
// ✅ CORRECT - V2
const cdp = new CdpClient();

// Créer un compte owner
const ownerAccount = await cdp.evm.createAccount({
  name: 'Owner'
});

// Créer un Smart Account
const smartAccount = await cdp.evm.createSmartAccount({
  owner: ownerAccount,
  enableSpendPermissions: true
});

console.log('Smart Account:', smartAccount.address);
console.log('Owner:', ownerAccount.address);
```

---

## 🔄 MIGRATION V1 → V2

### Avant (V1) ❌

```typescript
// ❌ V1 - NE PLUS UTILISER
const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');

Coinbase.configureFromJson({
  filePath: './cdp_api_key.json'
});

const wallet = await Wallet.create({ networkId: 'base-mainnet' });
const address = await wallet.getDefaultAddress();

const invocation = await wallet.invokeContract({
  contractAddress: '0xNFTContract',
  method: 'mint',
  args: { to: address.getId(), tokenURI: 'ipfs://...' },
  abi: nftAbi
});

await invocation.wait();
const txHash = invocation.getTransactionHash();
```

### Après (V2) ✅

```typescript
// ✅ V2 - CORRECT
const { CdpClient } = require('@coinbase/cdp-sdk');
const { encodeFunctionData } = require('viem');

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({ name: 'MyWallet' });

const callData = encodeFunctionData({
  abi: nftAbi,
  functionName: 'mint',
  args: [account.address, 'ipfs://...']
});

const transactionResult = await cdp.evm.sendTransaction({
  address: account.address,
  transaction: {
    to: '0xNFTContract',
    data: callData
  },
  network: 'base-mainnet'
});

const txHash = transactionResult.transactionHash;
```

---

## 📚 DIFFÉRENCES CLÉS V1 vs V2

| Feature | V1 (❌ Interdit) | V2 (✅ Correct) |
|---------|------------------|-----------------|
| **Package** | `@coinbase/coinbase-sdk` | `@coinbase/cdp-sdk` |
| **Client** | `Coinbase.configureFromJson()` | `new CdpClient()` |
| **Wallet/Account** | `Wallet.create()` | `cdp.evm.createAccount()` |
| **Multi-network** | Non (1 wallet = 1 network) | ✅ Oui (1 account = tous networks) |
| **Invoke Contract** | `wallet.invokeContract()` | `cdp.evm.sendTransaction()` + `encodeFunctionData()` |
| **Smart Accounts** | Non | ✅ Oui (ERC-4337) |
| **Gas Sponsorship** | Partiel | ✅ Complet (Paymaster natif) |
| **Sécurité** | Developer-managed keys | ✅ AWS Nitro Enclave TEE |

---

## 🚨 ERREURS FRÉQUENTES À ÉVITER

### ❌ Erreur 1 : Utiliser v1 au lieu de v2

```typescript
// ❌ ERREUR
const { Coinbase } = require('@coinbase/coinbase-sdk');
```

**✅ Solution :**
```typescript
// ✅ CORRECT
const { CdpClient } = require('@coinbase/cdp-sdk');
```

### ❌ Erreur 2 : Utiliser `invokeContract()` avec v2

```typescript
// ❌ ERREUR - invokeContract n'existe pas en v2
await account.invokeContract({ ... });
```

**✅ Solution :**
```typescript
// ✅ CORRECT - Utiliser sendTransaction + encodeFunctionData
const callData = encodeFunctionData({ abi, functionName, args });
await cdp.evm.sendTransaction({ address, transaction: { to, data: callData }, network });
```

### ❌ Erreur 3 : Utiliser `cdp.evm.invokeContract()`

```typescript
// ❌ ERREUR - Cette méthode n'existe pas
await cdp.evm.invokeContract({ ... });
```

**✅ Solution :**
```typescript
// ✅ CORRECT
const callData = encodeFunctionData({ abi, functionName, args });
await cdp.evm.sendTransaction({ address, transaction: { to, data: callData }, network });
```

---

## 📖 RESSOURCES OFFICIELLES

### Documentation v2

- **Doc officielle v2** : https://docs.cdp.coinbase.com/server-wallets/v2/
- **Quickstart v2** : https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart
- **SDK Reference** : https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/

### Migration guide

- **Import v1 wallets → v2** : https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/import-accounts

### MCP Coinbase Developer

Utilise la fonction `mcp_Coinbase_Developer_SearchCoinbaseDeveloper` pour rechercher dans la doc officielle :

```typescript
// Exemple de recherche
mcp_Coinbase_Developer_SearchCoinbaseDeveloper({
  query: "CDP SDK v2 send transaction smart contract EVM"
});
```

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de commit du code utilisant CDP :

- [ ] Utilise `@coinbase/cdp-sdk` (v2) ✅
- [ ] N'utilise PAS `@coinbase/coinbase-sdk` (v1) ❌
- [ ] Utilise `new CdpClient()` pour initialiser
- [ ] Utilise `cdp.evm.getOrCreateAccount()` pour les comptes
- [ ] Utilise `encodeFunctionData()` (viem) pour les calls contract
- [ ] Utilise `cdp.evm.sendTransaction()` pour envoyer les TX
- [ ] Pas de `wallet.invokeContract()` (v1 uniquement)
- [ ] Pas de `Coinbase.configureFromJson()` (v1 uniquement)

---

## 🎯 EXEMPLES RÉELS DU PROJET

### Script de test complet

Voir : `cylimit-admin-backend/scripts/base/2-rebuild-metadata-dual-storage.cjs`

**Fonctionnalités démontrées :**
- ✅ Utilisation CDP SDK v2
- ✅ `getOrCreateAccount()` avec nom persistant
- ✅ `encodeFunctionData()` pour mint NFT
- ✅ `sendTransaction()` sur Base Sepolia
- ✅ Transaction confirmée sur testnet

**TX de test réussie :**  
https://sepolia.basescan.org/tx/0xd2851640a49a443716b34b480bff8373e2c2cb4bae4dff635989f4f271de2aa8

---

## 📝 NOTES IMPORTANTES

1. **Pas de seed/private key à gérer** : CDP v2 gère tout dans AWS Nitro Enclave
2. **Comptes multi-network** : Un compte v2 = même adresse sur tous les networks EVM
3. **Noms persistants** : Utilise `name` pour récupérer le même compte entre sessions
4. **Gas sponsorship natif** : Intégration Paymaster simplifiée
5. **Smart Accounts ERC-4337** : Support natif pour batch transactions et spend permissions

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 21 Octobre 2025  
**Version doc :** 1.0.0

---

## 🚀 EN CAS DE DOUTE

**SI TU VOIS DU CODE V1 → REMPLACE-LE IMMÉDIATEMENT PAR V2**

**Aide-mémoire rapide :**
```bash
# ❌ Si tu vois ça → STOP
@coinbase/coinbase-sdk
Coinbase.configureFromJson
wallet.invokeContract
Wallet.create

# ✅ Remplace par ça
@coinbase/cdp-sdk
new CdpClient()
cdp.evm.sendTransaction + encodeFunctionData
cdp.evm.createAccount
```

---

**⚠️ Cette documentation est CRITIQUE pour la migration vers Base. Tout code utilisant v1 doit être refactoré en v2 AVANT le déploiement en production.**

