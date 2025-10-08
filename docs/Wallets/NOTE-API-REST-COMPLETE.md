# 📚 Note Complète : CDP REST API v1

**Date :** 7 octobre 2025  
**Source :** [docs.cdp.coinbase.com/api-reference](https://docs.cdp.coinbase.com/api-reference)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce que CDP REST API ?

L'**API REST CDP v1** permet d'interagir avec tous les services Coinbase Developer Platform via des appels HTTP standards.

**Base URL** : `https://api.cdp.coinbase.com/platform/v1`

**Fonctionnalités** :
- ✅ Gérer les wallets (Server Wallets)
- ✅ Créer des addresses
- ✅ Consulter les balances
- ✅ Envoyer des transactions (transfers)
- ✅ Gérer le staking
- ✅ Faire des trades/swaps
- ✅ Générer des liens Onramp/Offramp
- ✅ Configurer des webhooks

---

## 🔐 Authentification

### Types de Clés API

CDP utilise **2 types de clés** :

#### 1. **Secret API Keys** (Server-side) ⭐ POUR CYLIMIT

**Utilisation** : Backend (NestJS)  
**Format** :
- **API Key Name** : `organizations/{org_id}/apiKeys/{key_id}`
- **Private Key** : PEM format (ECDSA ou Ed25519)

**Où les obtenir** :
1. CDP Portal > API Keys
2. Créer une Secret API Key
3. Sauvegarder le nom + clé privée

**Exemple `.env`** :
```bash
COINBASE_API_KEY_NAME=organizations/12345678-1234-1234-1234-123456789abc/apiKeys/87654321-4321-4321-4321-cba987654321
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEII...\n-----END EC PRIVATE KEY-----"
```

---

#### 2. **Client API Keys** (Frontend)

**Utilisation** : Frontend (Next.js) pour JSON-RPC  
**Format** : Simple string (ex: `abcd1234efgh5678`)

**Où l'obtenir** :
1. CDP Portal > API Keys > Client API Key tab
2. Copier la clé

**Exemple `.env.local`** :
```bash
NEXT_PUBLIC_CDP_CLIENT_API_KEY=abcd1234efgh5678
```

**⚠️ Note** : Pour Embedded Wallets, tu n'as besoin QUE du **Project ID**, pas de Client API Key.

---

### Génération JWT (Secret API Keys)

**Pourquoi JWT ?**
- Authentification sécurisée pour les API calls
- Expire après 2 minutes
- Signé avec ta clé privée

**Installation** :
```bash
npm install @coinbase/coinbase-sdk
```

**Code Backend (NestJS)** :

```typescript
import { CoinbaseAuthenticator } from '@coinbase/coinbase-sdk/dist/coinbase/authenticator';
import { ConfigService } from '@nestjs/config';

export class CoinbaseApiService {
  private authenticator: CoinbaseAuthenticator;

  constructor(private configService: ConfigService) {
    const apiKeyName = this.configService.get<string>('COINBASE_API_KEY_NAME');
    const privateKey = this.configService.get<string>('COINBASE_API_KEY_PRIVATE_KEY');

    this.authenticator = new CoinbaseAuthenticator(
      apiKeyName,
      privateKey,
      'cylimit-backend',
      '1.0.0',
    );
  }

  async buildJWT(apiUrl: string, method: 'GET' | 'POST'): Promise<string> {
    return await this.authenticator.buildJWT(apiUrl, method);
  }
}
```

**Propriétés du JWT** :
```json
{
  "sub": "organizations/.../apiKeys/...",
  "iss": "cdp",
  "nbf": 1696723200,
  "exp": 1696723320,
  "uri": "GET api.cdp.coinbase.com/platform/v1/wallets"
}
```

**Headers HTTP** :
```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

---

## 📍 Endpoints API - Addresses

### 1. Créer une Address dans un Wallet

**Endpoint** : `POST /v1/wallets/{wallet_id}/addresses`

**Use case CyLimit** : Créer une nouvelle adresse pour un Server Wallet.

**Code Backend** :

```typescript
import axios from 'axios';

async createAddress(walletId: string): Promise<string> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      public_key: undefined, // Optionnel : laisse Coinbase générer
      attestation: undefined, // Optionnel
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.address_id; // Ex: "0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a"
}
```

**Réponse** :
```json
{
  "wallet_id": "d91d652b-d020-48d4-bf19-5c5eb5e280c7",
  "network_id": "base-sepolia",
  "public_key": "0x...",
  "address_id": "0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a"
}
```

---

### 2. Récupérer la Balance d'une Address (par Asset)

**Endpoint** : `GET /v1/networks/{network_id}/addresses/{address_id}/balances/{asset_id}`

**Use case CyLimit** : Vérifier la balance USDC d'une adresse.

**Code Backend** :

```typescript
async getAddressBalance(
  networkId: string,
  addressId: string,
  assetId: string,
): Promise<{ amount: string; decimals: number }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/balances/${assetId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    amount: response.data.amount, // Montant en atomic units
    decimals: response.data.asset.decimals, // Ex: 6 pour USDC
  };
}

// Utilisation
const { amount, decimals } = await this.getAddressBalance(
  'base-sepolia',
  '0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a',
  'USDC',
);
const balanceUsdc = Number(amount) / Math.pow(10, decimals);
console.log('Balance USDC:', balanceUsdc);
```

**Réponse** :
```json
{
  "amount": "100000000",
  "asset": {
    "network_id": "base-sepolia",
    "asset_id": "USDC",
    "decimals": 6,
    "contract_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
}
```

---

### 3. Lister toutes les Balances d'une Address

**Endpoint** : `GET /v1/networks/{network_id}/addresses/{address_id}/balances`

**Use case CyLimit** : Récupérer toutes les balances (USDC, ETH, etc.) d'une adresse.

**Code Backend** :

```typescript
async listAddressBalances(
  networkId: string,
  addressId: string,
): Promise<Array<{ assetId: string; amount: string; decimals: number }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/balances`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((balance: any) => ({
    assetId: balance.asset.asset_id,
    amount: balance.amount,
    decimals: balance.asset.decimals,
  }));
}
```

**Réponse** :
```json
{
  "data": [
    {
      "amount": "100000000",
      "asset": {
        "network_id": "base-sepolia",
        "asset_id": "USDC",
        "decimals": 6,
        "contract_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      }
    },
    {
      "amount": "5000000000000000000",
      "asset": {
        "network_id": "base-sepolia",
        "asset_id": "ETH",
        "decimals": 18
      }
    }
  ]
}
```

---

### 4. Récupérer l'Historique des Transactions d'une Address

**Endpoint** : `GET /v1/networks/{network_id}/addresses/{address_id}/transactions`

**Use case CyLimit** : Afficher l'historique des transactions d'un user.

**Code Backend** :

```typescript
interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

async getAddressTransactionHistory(
  networkId: string,
  addressId: string,
  limit: number = 20,
): Promise<Transaction[]> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/transactions?limit=${limit}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((tx: any) => ({
    hash: tx.transaction_hash,
    from: tx.from_address,
    to: tx.to_address,
    value: tx.value,
    status: tx.status,
    timestamp: tx.block_timestamp,
  }));
}
```

**Réponse** :
```json
{
  "data": [
    {
      "transaction_hash": "0x1234567890abcdef...",
      "from_address": "0xABCDEF...",
      "to_address": "0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a",
      "value": "10000000",
      "status": "confirmed",
      "block_timestamp": "2025-10-07T12:34:56Z",
      "block_number": 12345678
    }
  ],
  "has_more": false,
  "next_page": null
}
```

---

### 5. Récupérer l'Historique de Balance (Evolution dans le temps)

**Endpoint** : `GET /v1/networks/{network_id}/addresses/{address_id}/balances/{asset_id}/history`

**Use case CyLimit** : Afficher un graphique de l'évolution de la balance USDC d'un user.

**Code Backend** :

```typescript
interface BalanceSnapshot {
  amount: string;
  timestamp: string;
  blockHeight: number;
}

async getAddressBalanceHistory(
  networkId: string,
  addressId: string,
  assetId: string,
): Promise<BalanceSnapshot[]> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/balances/${assetId}/history`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((snapshot: any) => ({
    amount: snapshot.amount,
    timestamp: snapshot.block_timestamp,
    blockHeight: snapshot.block_height,
  }));
}
```

---

### 6. Lister toutes les Addresses d'un Wallet

**Endpoint** : `GET /v1/wallets/{wallet_id}/addresses`

**Use case CyLimit** : Lister toutes les addresses d'un Server Wallet CyLimit.

**Code Backend** :

```typescript
async listWalletAddresses(walletId: string): Promise<string[]> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((addr: any) => addr.address_id);
}
```

---

### 7. Demander des Fonds Testnet (Faucet)

**Endpoint** : `POST /v1/networks/{network_id}/faucet`

**Use case CyLimit** : Recevoir des ETH testnet pour payer le gas en dev.

**Code Backend** :

```typescript
async requestFaucetFunds(
  networkId: string,
  addressId: string,
): Promise<{ txHash: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/faucet`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      address: addressId,
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    txHash: response.data.transaction_hash,
  };
}

// Utilisation
await this.requestFaucetFunds('base-sepolia', '0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a');
```

---

## 🌐 Réseaux Supportés

### Networks Endpoint

**Endpoint** : `GET /v1/networks`

**Code Backend** :

```typescript
async listNetworks(): Promise<Array<{ id: string; name: string; chainId: number }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((network: any) => ({
    id: network.id,
    name: network.display_name,
    chainId: network.chain_id,
  }));
}
```

**Réseaux Principaux** :

| Network ID | Display Name | Chain ID | Type |
|------------|--------------|----------|------|
| `base-sepolia` | Base Sepolia | 84532 | Testnet |
| `base-mainnet` | Base | 8453 | Mainnet |
| `ethereum-sepolia` | Ethereum Sepolia | 11155111 | Testnet |
| `ethereum-mainnet` | Ethereum | 1 | Mainnet |
| `polygon-amoy` | Polygon Amoy | 80002 | Testnet |
| `polygon-mainnet` | Polygon | 137 | Mainnet |
| `arbitrum-sepolia` | Arbitrum Sepolia | 421614 | Testnet |
| `arbitrum-mainnet` | Arbitrum One | 42161 | Mainnet |
| `optimism-sepolia` | Optimism Sepolia | 11155420 | Testnet |
| `optimism-mainnet` | Optimism | 10 | Mainnet |

**Pour CyLimit** : Utilise **`base-sepolia`** (dev) et **`base-mainnet`** (prod).

---

## 💡 Pattern d'Utilisation Recommandé

### Service Backend Centralisé

**Créer un service réutilisable** :

```typescript
// src/modules/coinbase/coinbase-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinbaseAuthenticator } from '@coinbase/coinbase-sdk/dist/coinbase/authenticator';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class CoinbaseApiService {
  private readonly logger = new Logger(CoinbaseApiService.name);
  private authenticator: CoinbaseAuthenticator;
  private baseUrl = 'https://api.cdp.coinbase.com/platform/v1';

  constructor(private configService: ConfigService) {
    const apiKeyName = this.configService.get<string>('COINBASE_API_KEY_NAME');
    const privateKey = this.configService.get<string>('COINBASE_API_KEY_PRIVATE_KEY');

    this.authenticator = new CoinbaseAuthenticator(
      apiKeyName,
      privateKey,
      'cylimit-backend',
      '1.0.0',
    );
  }

  /**
   * Faire un appel API CDP authentifié
   */
  async apiCall<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${path}`;
      const jwt = await this.authenticator.buildJWT(url, method);

      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        data,
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`❌ API Call failed: ${method} ${path}`, error?.response?.data || error?.message);
      throw new Error(`CDP API Error: ${error?.response?.data?.message || error?.message}`);
    }
  }

  /**
   * GET helper
   */
  async get<T>(path: string): Promise<T> {
    return this.apiCall<T>('GET', path);
  }

  /**
   * POST helper
   */
  async post<T>(path: string, data: any): Promise<T> {
    return this.apiCall<T>('POST', path, data);
  }
}
```

**Utilisation** :

```typescript
// Récupérer une balance
const balance = await this.coinbaseApiService.get<any>(
  `/networks/base-sepolia/addresses/0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a/balances/USDC`
);

// Créer une address
const address = await this.coinbaseApiService.post<any>(
  `/wallets/${walletId}/addresses`,
  {}
);
```

---

## ⚠️ Points d'Attention

### 1. JWT Expiration

**Le JWT expire après 2 minutes** → Ne pas le mettre en cache !

```typescript
// ❌ MAUVAIS : JWT mis en cache
private cachedJwt: string;

async getBalance() {
  if (!this.cachedJwt) {
    this.cachedJwt = await this.buildJWT(...);
  }
  // JWT peut être expiré ici !
}

// ✅ BON : JWT généré à chaque appel
async getBalance() {
  const jwt = await this.buildJWT(...); // Toujours frais
  // Utiliser immédiatement
}
```

### 2. Rate Limiting

**Limites** :
- 100 requêtes/seconde par API key
- 10,000 requêtes/jour (free tier)

**Solution** : Implémenter un cache côté backend.

```typescript
import { CacheModule } from '@nestjs/cache-manager';

// Cache les balances pendant 30 secondes
@Injectable()
export class BalanceService {
  constructor(
    private coinbaseApi: CoinbaseApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getBalance(address: string): Promise<number> {
    const cacheKey = `balance:${address}`;
    
    // Vérifier le cache
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Appeler l'API
    const balance = await this.coinbaseApi.get(`/networks/base-sepolia/addresses/${address}/balances/USDC`);
    const balanceUsdc = Number(balance.amount) / 1e6;

    // Mettre en cache pendant 30 secondes
    await this.cacheManager.set(cacheKey, balanceUsdc, 30000);

    return balanceUsdc;
  }
}
```

### 3. Gestion d'Erreurs

**Codes d'erreur HTTP** :

| Code | Signification | Solution |
|------|---------------|----------|
| `400` | Bad Request | Vérifier les paramètres |
| `401` | Unauthorized | JWT invalide ou expiré |
| `403` | Forbidden | Permissions API key insuffisantes |
| `404` | Not Found | Ressource inexistante |
| `429` | Too Many Requests | Rate limit atteint |
| `500` | Internal Server Error | Réessayer plus tard |

**Implémenter un retry** :

```typescript
import { retry } from 'axios-retry';

retry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000, // 1s, 2s, 3s
  retryCondition: (error) => {
    return error.response?.status === 429 || error.response?.status >= 500;
  },
});
```

---

## 🔗 Liens Documentation

- [Introduction](https://docs.cdp.coinbase.com/api-reference/introduction)
- [Authentication](https://docs.cdp.coinbase.com/api-reference/authentication)
- [Networks](https://docs.cdp.coinbase.com/api-reference/networks)
- [Addresses API](https://docs.cdp.coinbase.com/api-reference/rest-api/addresses)
- [Wallets API](https://docs.cdp.coinbase.com/api-reference/rest-api/wallets)
- [Transfers API](https://docs.cdp.coinbase.com/api-reference/rest-api/transfers)
- [Webhooks API](https://docs.cdp.coinbase.com/api-reference/rest-api/webhooks)

---

**Note créée par :** Claude (Assistant IA)  
**Pour :** Valentin @ CyLimit  
**Date :** 7 octobre 2025

**✅ Cette note API sera complétée au fur et à mesure avec le reste de la doc !**

---

## 🎨 Assets API

### Récupérer les Détails d'un Asset

**Endpoint** : `GET /v1/networks/{network_id}/assets/{asset_id}`

**Use case CyLimit** : Récupérer les détails USDC (decimals, contract address).

**Code Backend** :

```typescript
interface AssetDetails {
  networkId: string;
  assetId: string;
  decimals: number;
  contractAddress?: string;
}

async getAssetDetails(
  networkId: string,
  assetId: string,
): Promise<AssetDetails> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/assets/${assetId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    networkId: response.data.network_id,
    assetId: response.data.asset_id,
    decimals: response.data.decimals,
    contractAddress: response.data.contract_address,
  };
}

// Utilisation
const usdcDetails = await this.getAssetDetails('base-sepolia', 'USDC');
console.log('USDC Contract:', usdcDetails.contractAddress);
console.log('USDC Decimals:', usdcDetails.decimals); // 6
```

**Réponse** :
```json
{
  "network_id": "base-sepolia",
  "asset_id": "USDC",
  "decimals": 6,
  "contract_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

**Assets principaux pour CyLimit** :

| Asset ID | Name | Decimals | Contract (Base Sepolia) |
|----------|------|----------|-------------------------|
| `USDC` | USD Coin | 6 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `ETH` | Ethereum | 18 | Native (pas de contract) |
| `WETH` | Wrapped ETH | 18 | `0x...` |

---

## 🌐 Networks API (Détails)

### Récupérer les Détails d'un Réseau

**Endpoint** : `GET /v1/networks/{network_id}`

**Use case CyLimit** : Vérifier les features supportées par un réseau.

**Code Backend** :

```typescript
interface NetworkDetails {
  id: string;
  displayName: string;
  chainId: number;
  protocolFamily: 'evm' | 'solana';
  isTestnet: boolean;
  nativeAsset: AssetDetails;
  featureSet: {
    faucet: boolean;
    serverSigner: boolean;
    transfer: boolean;
    trade: boolean;
    stake: boolean;
    gaslessSend: boolean;
  };
}

async getNetworkDetails(networkId: string): Promise<NetworkDetails> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    id: response.data.id,
    displayName: response.data.display_name,
    chainId: response.data.chain_id,
    protocolFamily: response.data.protocol_family,
    isTestnet: response.data.is_testnet,
    nativeAsset: response.data.native_asset,
    featureSet: response.data.feature_set,
  };
}

// Utilisation
const baseSepoliaDetails = await this.getNetworkDetails('base-sepolia');
console.log('Chain ID:', baseSepoliaDetails.chainId); // 84532
console.log('Faucet disponible:', baseSepoliaDetails.featureSet.faucet); // true
console.log('Gasless send:', baseSepoliaDetails.featureSet.gaslessSend); // true
```

**Réponse** :
```json
{
  "id": "base-sepolia",
  "display_name": "Base Sepolia",
  "chain_id": 84532,
  "protocol_family": "evm",
  "is_testnet": true,
  "native_asset": {
    "network_id": "base-sepolia",
    "asset_id": "ETH",
    "decimals": 18
  },
  "feature_set": {
    "faucet": true,
    "server_signer": true,
    "transfer": true,
    "trade": true,
    "stake": false,
    "gasless_send": true
  }
}
```

**Features importantes** :
- `faucet` : Peut recevoir des ETH testnet gratuits
- `server_signer` : Support Server Wallets
- `transfer` : Support transferts
- `trade` : Support swaps
- `stake` : Support staking (ETH, SOL)
- `gasless_send` : Support gas sponsorship (Smart Accounts)

---

## 📜 Smart Contracts API

**⚠️ Note** : Cette API est utile si tu veux monitorer les événements de ton smart contract NFT CyLimit. Pour la plupart des cas, les Server Wallets SDK suffisent.

### 1. Enregistrer un Smart Contract

**Endpoint** : `POST /v1/smart_contracts`

**Use case CyLimit** : Enregistrer ton contrat NFT `CyLimitNFT_v2` pour recevoir des webhooks sur les events (Transfer, Mint, Burn).

**Code Backend** :

```typescript
async registerSmartContract(
  networkId: string,
  contractAddress: string,
  contractName: string,
): Promise<string> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/smart_contracts`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      network_id: networkId,
      contract_address: contractAddress,
      contract_name: contractName,
      abi: [], // Optionnel : ABI du contrat
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.id; // Contract ID
}

// Utilisation
const contractId = await this.registerSmartContract(
  'base-sepolia',
  '0xYourNFTContract...',
  'CyLimitNFT_v2',
);
```

---

### 2. Lister les Smart Contracts Enregistrés

**Endpoint** : `GET /v1/smart_contracts`

**Code Backend** :

```typescript
async listSmartContracts(): Promise<Array<{ id: string; address: string; name: string }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/smart_contracts`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((contract: any) => ({
    id: contract.id,
    address: contract.contract_address,
    name: contract.contract_name,
  }));
}
```

---

### 3. Lister les Events d'un Smart Contract

**Endpoint** : `GET /v1/networks/{network_id}/smart_contracts/{contract_address}/events`

**Use case CyLimit** : Récupérer tous les événements `Transfer` de ton NFT.

**Code Backend** :

```typescript
interface ContractEvent {
  eventName: string;
  blockHeight: number;
  blockTime: string;
  txHash: string;
  data: any;
}

async listContractEvents(
  networkId: string,
  contractAddress: string,
  eventName: string,
  fromBlock: number,
  toBlock: number,
): Promise<ContractEvent[]> {
  const params = new URLSearchParams({
    protocol_name: 'cylimit', // Ton protocole
    contract_name: 'CyLimitNFT_v2',
    event_name: eventName,
    from_block_height: fromBlock.toString(),
    to_block_height: toBlock.toString(),
  });

  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/smart_contracts/${contractAddress}/events?${params}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((event: any) => ({
    eventName: event.event_name,
    blockHeight: event.block_height,
    blockTime: event.block_time,
    txHash: event.tx_hash,
    data: JSON.parse(event.data),
  }));
}

// Utilisation : Récupérer tous les Transfer NFT
const transfers = await this.listContractEvents(
  'base-sepolia',
  '0xYourNFTContract...',
  'Transfer',
  0,
  999999999,
);

transfers.forEach((transfer) => {
  console.log(`NFT #${transfer.data.tokenId} : ${transfer.data.from} → ${transfer.data.to}`);
});
```

**Réponse** :
```json
{
  "data": [
    {
      "event_name": "Transfer",
      "sig": "Transfer(address,address,uint256)",
      "contract_address": "0x...",
      "block_height": 12345678,
      "block_time": "2025-10-07T12:34:56Z",
      "tx_hash": "0x1234567890abcdef...",
      "data": "{\"from\":\"0x0000...\",\"to\":\"0xABCD...\",\"tokenId\":\"123\"}"
    }
  ],
  "has_more": false,
  "next_page": null
}
```

---

## 💎 Staking API

**⚠️ Note pour CyLimit** : Le staking n'est probablement pas nécessaire pour ton use case (marketplace NFT). Cette section est documentée pour référence.

### Fonctionnalités Staking

L'API Staking permet de :
- ✅ **Stake ETH** sur Ethereum 2.0
- ✅ **Stake SOL** sur Solana
- ✅ Récupérer les **rewards** de staking
- ✅ Unstake et withdrawal

**Réseaux supportés** :
- `ethereum-mainnet` (ETH staking)
- `solana-mainnet` (SOL staking)

---

### 1. Construire une Opération de Staking

**Endpoint** : `POST /v1/networks/{network_id}/addresses/{address_id}/staking_operations`

**Use case** : Stake 1 ETH depuis un Server Wallet.

**Code Backend** :

```typescript
async buildStakingOperation(
  networkId: string,
  addressId: string,
  validatorId: string,
  amountWei: string,
): Promise<{ unsigned_tx: string; staking_operation_id: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/staking_operations`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      action: 'stake',
      validator_id: validatorId,
      amount: {
        value: amountWei,
        currency: 'ETH',
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    unsigned_tx: response.data.unsigned_tx,
    staking_operation_id: response.data.id,
  };
}
```

---

### 2. Récupérer les Staking Rewards

**Endpoint** : `GET /v1/networks/{network_id}/addresses/{address_id}/staking_rewards`

**Use case** : Afficher les rewards de staking d'un user.

**Code Backend** :

```typescript
interface StakingReward {
  amount: string;
  asset: string;
  timestamp: string;
}

async getStakingRewards(
  networkId: string,
  addressId: string,
): Promise<StakingReward[]> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/addresses/${addressId}/staking_rewards`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((reward: any) => ({
    amount: reward.amount,
    asset: reward.asset_id,
    timestamp: reward.timestamp,
  }));
}
```

---

### 3. Lister les Validators

**Endpoint** : `GET /v1/networks/{network_id}/validators`

**Use case** : Choisir un validator pour le staking ETH.

**Code Backend** :

```typescript
interface Validator {
  id: string;
  name: string;
  address: string;
  commission: number;
}

async listValidators(networkId: string): Promise<Validator[]> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/networks/${networkId}/validators`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((validator: any) => ({
    id: validator.id,
    name: validator.name,
    address: validator.address,
    commission: validator.commission,
  }));
}
```

---

---

## 💱 Trades API (Swaps)

**Use case CyLimit** : Échanger des tokens (ex: ETH → USDC, USDC → ETH).

### Flow Complet d'un Trade

```
1. Create Trade → Génère unsigned_payload
2. Sign payload (avec Server Wallet SDK)
3. Broadcast Trade → Envoie la TX sur la blockchain
4. Get Trade Status → Vérifier si completed
```

---

### 1. Créer un Trade (Swap)

**Endpoint** : `POST /v1/wallets/{wallet_id}/addresses/{address_id}/trades`

**Use case** : Swap 0.01 ETH → USDC.

**Code Backend** :

```typescript
interface CreateTradeResponse {
  tradeId: string;
  fromAmount: string;
  fromAsset: string;
  toAmount: string;
  toAsset: string;
  unsignedPayload: string;
  approveTransactionUnsignedPayload?: string; // Pour ERC20
}

async createTrade(
  walletId: string,
  addressId: string,
  fromAssetId: string,
  toAssetId: string,
  amountAtomic: string,
): Promise<CreateTradeResponse> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/trades`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      from_asset_id: fromAssetId,
      to_asset_id: toAssetId,
      amount: amountAtomic, // Montant en atomic units
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    tradeId: response.data.trade_id,
    fromAmount: response.data.from_amount,
    fromAsset: response.data.from_asset.asset_id,
    toAmount: response.data.to_amount,
    toAsset: response.data.to_asset.asset_id,
    unsignedPayload: response.data.transaction.unsigned_payload,
    approveTransactionUnsignedPayload: response.data.approve_transaction?.unsigned_payload,
  };
}

// Utilisation : Swap 0.01 ETH → USDC
const trade = await this.createTrade(
  walletId,
  addressId,
  'ETH',
  'USDC',
  '10000000000000000', // 0.01 ETH en wei
);

console.log(`Trade créé : ${trade.fromAmount} ${trade.fromAsset} → ${trade.toAmount} ${trade.toAsset}`);
```

**Réponse** :
```json
{
  "trade_id": "abc123",
  "from_amount": "10000000000000000",
  "from_asset": {
    "asset_id": "ETH",
    "decimals": 18
  },
  "to_amount": "25000000",
  "to_asset": {
    "asset_id": "USDC",
    "decimals": 6,
    "contract_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  "transaction": {
    "unsigned_payload": "0x1234567890abcdef..."
  }
}
```

---

### 2. Broadcast Trade (Exécuter le Swap)

**Endpoint** : `POST /v1/wallets/{wallet_id}/addresses/{address_id}/trades/{trade_id}/broadcast`

**Code Backend** :

```typescript
async broadcastTrade(
  walletId: string,
  addressId: string,
  tradeId: string,
  signedPayload: string,
  approveTransactionSignedPayload?: string,
): Promise<{ txHash: string; status: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/trades/${tradeId}/broadcast`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      signed_payload: signedPayload,
      approve_transaction_signed_payload: approveTransactionSignedPayload,
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    txHash: response.data.transaction.transaction_hash,
    status: response.data.transaction.status,
  };
}
```

---

### 3. Récupérer le Statut d'un Trade

**Endpoint** : `GET /v1/wallets/{wallet_id}/addresses/{address_id}/trades/{trade_id}`

**Code Backend** :

```typescript
async getTradeStatus(
  walletId: string,
  addressId: string,
  tradeId: string,
): Promise<{ status: string; txHash: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/trades/${tradeId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    status: response.data.transaction.status, // 'pending' | 'confirmed' | 'failed'
    txHash: response.data.transaction.transaction_hash,
  };
}
```

---

### 4. Lister tous les Trades d'une Address

**Endpoint** : `GET /v1/wallets/{wallet_id}/addresses/{address_id}/trades`

**Code Backend** :

```typescript
async listTrades(
  walletId: string,
  addressId: string,
): Promise<Array<{ tradeId: string; fromAsset: string; toAsset: string; status: string }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/trades`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((trade: any) => ({
    tradeId: trade.trade_id,
    fromAsset: trade.from_asset.asset_id,
    toAsset: trade.to_asset.asset_id,
    status: trade.transaction.status,
  }));
}
```

---

## 📤 Transfers API ⭐ CRITIQUE POUR CYLIMIT

**Use case CyLimit** : Envoyer des USDC entre addresses (fees, rewards, marketplace).

### Flow Complet d'un Transfer

```
1. Create Transfer → Génère unsigned_payload
2. Sign payload (avec Server Wallet SDK)
3. Broadcast Transfer → Envoie la TX sur la blockchain
4. Get Transfer Status → Vérifier si completed
```

---

### 1. Créer un Transfer

**Endpoint** : `POST /v1/wallets/{wallet_id}/addresses/{address_id}/transfers`

**Use case CyLimit** : Envoyer 10 USDC à un user.

**Code Backend** :

```typescript
interface CreateTransferResponse {
  transferId: string;
  amount: string;
  assetId: string;
  destination: string;
  unsignedPayload: string;
}

async createTransfer(
  walletId: string,
  addressId: string,
  destinationAddress: string,
  assetId: string,
  amountAtomic: string,
): Promise<CreateTransferResponse> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/transfers`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      destination: destinationAddress,
      asset_id: assetId,
      amount: amountAtomic, // Montant en atomic units
      gasless: false, // true pour gas sponsorship (Smart Accounts only)
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    transferId: response.data.transfer_id,
    amount: response.data.amount,
    assetId: response.data.asset_id,
    destination: response.data.destination,
    unsignedPayload: response.data.transaction.unsigned_payload,
  };
}

// Utilisation : Envoyer 10 USDC
const transfer = await this.createTransfer(
  walletId,
  addressId,
  '0xUserAddress...',
  'USDC',
  '10000000', // 10 USDC (6 decimals)
);

console.log(`Transfer créé : ${transfer.amount} ${transfer.assetId} → ${transfer.destination}`);
```

**Réponse** :
```json
{
  "transfer_id": "def456",
  "network_id": "base-sepolia",
  "wallet_id": "d91d652b-d020-48d4-bf19-5c5eb5e280c7",
  "address_id": "0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a",
  "destination": "0xUserAddress...",
  "asset_id": "USDC",
  "amount": "10000000",
  "transaction": {
    "unsigned_payload": "0xabcdef1234567890...",
    "status": "pending"
  }
}
```

---

### 2. Broadcast Transfer (Exécuter l'Envoi)

**Endpoint** : `POST /v1/wallets/{wallet_id}/addresses/{address_id}/transfers/{transfer_id}/broadcast`

**Code Backend** :

```typescript
async broadcastTransfer(
  walletId: string,
  addressId: string,
  transferId: string,
  signedPayload: string,
): Promise<{ txHash: string; status: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/transfers/${transferId}/broadcast`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      signed_payload: signedPayload,
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    txHash: response.data.transaction.transaction_hash,
    status: response.data.transaction.status,
  };
}
```

---

### 3. Récupérer le Statut d'un Transfer

**Endpoint** : `GET /v1/wallets/{wallet_id}/addresses/{address_id}/transfers/{transfer_id}`

**Code Backend** :

```typescript
async getTransferStatus(
  walletId: string,
  addressId: string,
  transferId: string,
): Promise<{ status: string; txHash: string; txLink: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/transfers/${transferId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    status: response.data.transaction.status, // 'pending' | 'confirmed' | 'failed'
    txHash: response.data.transaction.transaction_hash,
    txLink: response.data.transaction.transaction_link, // Lien Basescan/Etherscan
  };
}

// Utilisation
const status = await this.getTransferStatus(walletId, addressId, transferId);
console.log('Transfer status:', status.status);
console.log('Basescan link:', status.txLink);
```

---

### 4. Lister tous les Transfers d'une Address

**Endpoint** : `GET /v1/wallets/{wallet_id}/addresses/{address_id}/transfers`

**Code Backend** :

```typescript
async listTransfers(
  walletId: string,
  addressId: string,
): Promise<Array<{ transferId: string; amount: string; destination: string; status: string }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/addresses/${addressId}/transfers`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((transfer: any) => ({
    transferId: transfer.transfer_id,
    amount: transfer.amount,
    destination: transfer.destination,
    status: transfer.transaction.status,
  }));
}
```

---

## 💼 Wallets API ⭐ CRITIQUE POUR CYLIMIT

**Use case CyLimit** : Créer et gérer les Server Wallets (Master Wallet, Rewards Wallet, etc.).

---

### 1. Créer un Wallet

**Endpoint** : `POST /v1/wallets`

**Use case CyLimit** : Créer le Master Wallet pour collecter les fees.

**Code Backend** :

```typescript
interface CreateWalletResponse {
  walletId: string;
  networkId: string;
  defaultAddress: string;
}

async createWallet(
  networkId: string,
  name: string,
): Promise<CreateWalletResponse> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      wallet: {
        network_id: networkId,
        name: name,
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    walletId: response.data.id,
    networkId: response.data.network_id,
    defaultAddress: response.data.default_address.address_id,
  };
}

// Utilisation : Créer le Master Wallet CyLimit
const masterWallet = await this.createWallet('base-sepolia', 'CyLimit Master Wallet');
console.log('Master Wallet créé:', masterWallet.walletId);
console.log('Adresse:', masterWallet.defaultAddress);
```

**Réponse** :
```json
{
  "id": "d91d652b-d020-48d4-bf19-5c5eb5e280c7",
  "network_id": "base-sepolia",
  "name": "CyLimit Master Wallet",
  "default_address": {
    "address_id": "0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a",
    "wallet_id": "d91d652b-d020-48d4-bf19-5c5eb5e280c7",
    "network_id": "base-sepolia"
  }
}
```

---

### 2. Récupérer un Wallet par ID

**Endpoint** : `GET /v1/wallets/{wallet_id}`

**Code Backend** :

```typescript
async getWallet(walletId: string): Promise<{ name: string; networkId: string; defaultAddress: string }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    name: response.data.name,
    networkId: response.data.network_id,
    defaultAddress: response.data.default_address.address_id,
  };
}
```

---

### 3. Lister tous les Wallets

**Endpoint** : `GET /v1/wallets`

**Use case CyLimit** : Lister tous les wallets CyLimit (Master, Rewards, Operations).

**Code Backend** :

```typescript
async listWallets(): Promise<Array<{ walletId: string; name: string; networkId: string; defaultAddress: string }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((wallet: any) => ({
    walletId: wallet.id,
    name: wallet.name,
    networkId: wallet.network_id,
    defaultAddress: wallet.default_address.address_id,
  }));
}

// Utilisation
const wallets = await this.listWallets();
wallets.forEach((wallet) => {
  console.log(`${wallet.name}: ${wallet.defaultAddress}`);
});
```

---

### 4. Récupérer la Balance d'un Wallet (Asset spécifique)

**Endpoint** : `GET /v1/wallets/{wallet_id}/balances/{asset_id}`

**Use case CyLimit** : Vérifier la balance USDC du Master Wallet.

**Code Backend** :

```typescript
async getWalletAssetBalance(
  walletId: string,
  assetId: string,
): Promise<{ amount: string; decimals: number }> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/balances/${assetId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    amount: response.data.amount,
    decimals: response.data.asset.decimals,
  };
}

// Utilisation
const { amount, decimals } = await this.getWalletAssetBalance(masterWalletId, 'USDC');
const balanceUsdc = Number(amount) / Math.pow(10, decimals);
console.log('Master Wallet USDC balance:', balanceUsdc);
```

---

### 5. Lister toutes les Balances d'un Wallet

**Endpoint** : `GET /v1/wallets/{wallet_id}/balances`

**Code Backend** :

```typescript
async getWalletBalances(
  walletId: string,
): Promise<Array<{ assetId: string; amount: string; decimals: number }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/wallets/${walletId}/balances`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((balance: any) => ({
    assetId: balance.asset.asset_id,
    amount: balance.amount,
    decimals: balance.asset.decimals,
  }));
}
```

---

## 🔔 Webhooks API

**Use case CyLimit** : Recevoir des notifications en temps réel quand un event blockchain se produit.

### Events Supportés

| Event Type | Description |
|------------|-------------|
| `wallet:created` | Nouveau wallet créé |
| `wallet:transfer:created` | Transfer initié |
| `wallet:transfer:completed` | Transfer confirmé on-chain |
| `wallet:transfer:failed` | Transfer échoué |
| `wallet:trade:created` | Trade (swap) initié |
| `wallet:trade:completed` | Trade confirmé on-chain |
| `onramp:transaction:completed` | User a acheté des USDC via Onramp |
| `smart_contract:event:emitted` | Event émis par ton contrat NFT |

---

### 1. Créer un Webhook

**Endpoint** : `POST /v1/webhooks`

**Use case CyLimit** : Recevoir une notification quand un user achète des USDC via Onramp.

**Code Backend** :

```typescript
async createWebhook(
  url: string,
  eventType: string,
  eventFilters?: any[],
): Promise<string> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/webhooks`;
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      url: url, // Ton endpoint backend
      event_type: eventType,
      event_filters: eventFilters,
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.id; // Webhook ID
}

// Utilisation : Webhook pour Onramp completed
const webhookId = await this.createWebhook(
  'https://api.cylimit.com/webhooks/coinbase/onramp',
  'onramp:transaction:completed',
  [{ network_id: 'base-sepolia' }],
);

console.log('Webhook créé:', webhookId);
```

---

### 2. Lister tous les Webhooks

**Endpoint** : `GET /v1/webhooks`

**Code Backend** :

```typescript
async listWebhooks(): Promise<Array<{ id: string; url: string; eventType: string }>> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/webhooks`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((webhook: any) => ({
    id: webhook.id,
    url: webhook.url,
    eventType: webhook.event_type,
  }));
}
```

---

### 3. Supprimer un Webhook

**Endpoint** : `DELETE /v1/webhooks/{webhook_id}`

**Code Backend** :

```typescript
async deleteWebhook(webhookId: string): Promise<void> {
  const apiUrl = `https://api.cdp.coinbase.com/platform/v1/webhooks/${webhookId}`;
  const jwt = await this.buildJWT(apiUrl, 'DELETE');

  await axios.delete(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });
}
```

---

### 4. Gérer les Webhooks dans NestJS

**Code Backend (Controller)** :

```typescript
// webhooks.controller.ts
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Controller('webhooks/coinbase')
export class CoinbaseWebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('onramp')
  async handleOnrampWebhook(
    @Body() payload: any,
    @Headers('x-coinbase-signature') signature: string,
  ) {
    // 1. Vérifier la signature (sécurité)
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 2. Traiter l'event
    if (payload.event_type === 'onramp:transaction:completed') {
      const { destination_address, amount, asset } = payload.data;
      
      // Mettre à jour la balance user dans ta DB
      await this.webhookService.handleOnrampCompleted(
        destination_address,
        parseFloat(amount),
        asset,
      );
      
      console.log(`✅ User a acheté ${amount} ${asset}`);
    }

    return { success: true };
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }
}
```

**Payload Webhook Onramp Completed** :
```json
{
  "event_type": "onramp:transaction:completed",
  "data": {
    "transaction_id": "abc123",
    "destination_address": "0xUserAddress...",
    "asset": "USDC",
    "amount": "100",
    "network": "base-sepolia",
    "user_email": "user@example.com",
    "timestamp": "2025-10-07T12:34:56Z"
  }
}
```

---

## 💳 Onramp/Offramp API ⭐ CRITIQUE POUR CYLIMIT

**Use case CyLimit** : Permettre aux users d'acheter/vendre des USDC avec leur CB.

---

### 1. Create Buy Quote (Obtenir un Devis d'Achat)

**Endpoint** : `POST /onramp/v1/buy/quote`

**Use case CyLimit** : Calculer combien ça coûte pour acheter 100 USDC avec une CB française.

**⚠️ SÉCURITÉ CRITIQUE** : Le `clientIp` doit être **la vraie IP du client**, pas celle du serveur ! Utiliser `req.ip` (NestJS) ou `req.headers['x-forwarded-for']` (si derrière un proxy).

**Code Backend** :

```typescript
interface BuyQuoteResponse {
  quoteId: string;
  onrampUrl: string; // URL prête pour redirection
  paymentTotal: { currency: string; value: string }; // Montant total à payer
  purchaseAmount: { currency: string; value: string }; // Montant USDC reçu
  coinbaseFee: { currency: string; value: string }; // Fee Coinbase
  networkFee: { currency: string; value: string }; // Gas
}

async createBuyQuote(
  clientIp: string,
  destinationAddress: string,
  paymentAmount: number,
  country: string = 'FR',
  paymentMethod: 'CARD' | 'ACH_BANK_ACCOUNT' | 'APPLE_PAY' = 'CARD',
): Promise<BuyQuoteResponse> {
  const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/buy/quote';
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      clientIp: clientIp, // ⚠️ CRITIQUE : Vraie IP du client
      destinationAddress: destinationAddress,
      paymentAmount: paymentAmount.toString(),
      paymentCurrency: 'EUR', // EUR pour France
      paymentMethod: paymentMethod,
      purchaseCurrency: 'USDC',
      purchaseNetwork: 'base-sepolia',
      country: country,
      subdivision: null, // Requis uniquement pour US (ex: 'NY')
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    quoteId: response.data.quote_id,
    onrampUrl: response.data.onramp_url, // URL prête pour redirection
    paymentTotal: response.data.payment_total,
    purchaseAmount: response.data.purchase_amount,
    coinbaseFee: response.data.coinbase_fee,
    networkFee: response.data.network_fee,
  };
}

// Utilisation dans NestJS Controller
@Post('onramp/quote')
async getOnrampQuote(
  @Body() dto: { destinationAddress: string; amount: number },
  @Req() req: Request,
) {
  // ⚠️ Récupérer la vraie IP du client
  const clientIp = req.ip || req.headers['x-forwarded-for'] as string;
  
  const quote = await this.walletService.createBuyQuote(
    clientIp,
    dto.destinationAddress,
    dto.amount,
  );
  
  return {
    success: true,
    data: {
      onrampUrl: quote.onrampUrl, // Redirection prête
      totalCost: `${quote.paymentTotal.value} ${quote.paymentTotal.currency}`,
      usdcReceived: `${quote.purchaseAmount.value} ${quote.purchaseAmount.currency}`,
      coinbaseFee: `${quote.coinbaseFee.value} ${quote.coinbaseFee.currency}`,
    },
  };
}
```

**Réponse Exemple** :
```json
{
  "quote_id": "abc123-def456",
  "onramp_url": "https://pay.coinbase.com/buy?quoteId=abc123-def456",
  "payment_total": {
    "currency": "EUR",
    "value": "103.50"
  },
  "purchase_amount": {
    "currency": "USDC",
    "value": "100.00"
  },
  "coinbase_fee": {
    "currency": "EUR",
    "value": "3.50"
  },
  "network_fee": {
    "currency": "EUR",
    "value": "0.10"
  }
}
```

---

### 2. Create Session Token (Sécurité Avancée)

**Endpoint** : `POST /onramp/v1/token`

**Use case CyLimit** : Créer un token sécurisé pour initialiser l'Onramp widget.

**⚠️ NOTE IMPORTANTE** : Après tests, l'API `create-buy-quote` retourne déjà un `onramp_url` prêt à l'emploi. Le session token n'est **pas obligatoire** si tu utilises `create-buy-quote`.

**Code Backend (si nécessaire)** :

```typescript
async createSessionToken(
  walletAddress: string,
  clientIp: string,
): Promise<{ token: string; channelId: string }> {
  const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/token';
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      addresses: [
        {
          address: walletAddress,
          blockchains: ['base-sepolia', 'polygon'],
          assets: ['USDC', 'ETH'],
        },
      ],
      clientIp: clientIp, // ⚠️ CRITIQUE : Vraie IP du client
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    token: response.data.token,
    channelId: response.data.channel_id,
  };
}
```

---

### 3. Get All Onramp Transactions (Historique Achats)

**Endpoint** : `GET /onramp/v1/transactions`

**Use case CyLimit** : Lister tous les achats USDC d'un user.

**Code Backend** :

```typescript
async getAllOnrampTransactions(
  userAddress?: string,
  limit: number = 50,
): Promise<Array<{
  transactionId: string;
  status: string;
  amount: string;
  asset: string;
  createdAt: string;
}>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  
  if (userAddress) {
    params.append('address', userAddress);
  }

  const apiUrl = `https://api.developer.coinbase.com/onramp/v1/transactions?${params}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return response.data.data.map((tx: any) => ({
    transactionId: tx.transaction_id,
    status: tx.status, // 'pending' | 'completed' | 'failed'
    amount: tx.purchase_amount.value,
    asset: tx.purchase_amount.currency,
    createdAt: tx.created_at,
  }));
}

// Utilisation : Afficher historique dans frontend
@Get('user/:userId/onramp-history')
async getOnrampHistory(@Param('userId') userId: string) {
  const user = await this.userService.findById(userId);
  const history = await this.walletService.getAllOnrampTransactions(user.walletAddress);
  
  return {
    success: true,
    data: history,
  };
}
```

---

### 4. Get Onramp Transaction by ID (Vérifier Statut)

**Endpoint** : `GET /onramp/v1/transactions/{transaction_id}`

**Use case CyLimit** : Vérifier si un achat USDC est complété.

**Code Backend** :

```typescript
async getOnrampTransactionStatus(
  transactionId: string,
): Promise<{ status: string; amount: string; asset: string }> {
  const apiUrl = `https://api.developer.coinbase.com/onramp/v1/transactions/${transactionId}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    status: response.data.status,
    amount: response.data.purchase_amount.value,
    asset: response.data.purchase_amount.currency,
  };
}

// Utilisation : Polling après redirection Coinbase Pay
@Get('onramp/status/:txId')
async checkOnrampStatus(@Param('txId') txId: string) {
  const status = await this.walletService.getOnrampTransactionStatus(txId);
  
  return {
    success: true,
    data: {
      isCompleted: status.status === 'completed',
      status: status.status,
      amount: `${status.amount} ${status.asset}`,
    },
  };
}
```

---

### 5. Create Sell Quote (Offramp - Retrait USDC)

**Endpoint** : `POST /onramp/v1/sell/quote`

**Use case CyLimit** : User veut vendre 50 USDC et recevoir de l'EUR sur son compte bancaire.

**Code Backend** :

```typescript
interface SellQuoteResponse {
  quoteId: string;
  offrampUrl: string; // URL prête pour redirection
  cashoutTotal: { currency: string; value: string }; // EUR reçus
  sellAmount: { currency: string; value: string }; // USDC vendus
  coinbaseFee: { currency: string; value: string };
}

async createSellQuote(
  clientIp: string,
  sourceAddress: string,
  sellAmount: number,
  partnerUserId: string,
  redirectUrl: string,
  country: string = 'FR',
  paymentMethod: 'ACH_BANK_ACCOUNT' | 'PAYPAL' = 'ACH_BANK_ACCOUNT',
): Promise<SellQuoteResponse> {
  const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/sell/quote';
  const jwt = await this.buildJWT(apiUrl, 'POST');

  const response = await axios.post(
    apiUrl,
    {
      clientIp: clientIp,
      sourceAddress: sourceAddress,
      sellAmount: sellAmount.toString(),
      sellCurrency: 'USDC',
      sellNetwork: 'base-sepolia',
      cashoutCurrency: 'EUR',
      paymentMethod: paymentMethod,
      country: country,
      partnerUserId: partnerUserId, // ID user CyLimit
      redirectUrl: redirectUrl, // URL de retour après Offramp
    },
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    quoteId: response.data.quote_id,
    offrampUrl: response.data.offramp_url,
    cashoutTotal: response.data.cashout_total,
    sellAmount: response.data.sell_amount,
    coinbaseFee: response.data.coinbase_fee,
  };
}

// Utilisation dans NestJS Controller
@Post('offramp/quote')
async getOfframpQuote(
  @Body() dto: { sourceAddress: string; amount: number; userId: string },
  @Req() req: Request,
) {
  const clientIp = req.ip || req.headers['x-forwarded-for'] as string;
  
  const quote = await this.walletService.createSellQuote(
    clientIp,
    dto.sourceAddress,
    dto.amount,
    dto.userId,
    'https://app.cylimit.com/withdraw/success',
  );
  
  return {
    success: true,
    data: {
      offrampUrl: quote.offrampUrl,
      eurReceived: `${quote.cashoutTotal.value} ${quote.cashoutTotal.currency}`,
      usdcSold: `${quote.sellAmount.value} ${quote.sellAmount.currency}`,
      coinbaseFee: `${quote.coinbaseFee.value} ${quote.coinbaseFee.currency}`,
    },
  };
}
```

---

### 6. Get Buy Config (Pays/Devises Supportés)

**Endpoint** : `GET /onramp/v1/buy/config`

**Use case CyLimit** : Vérifier quels pays/devises sont supportés pour Onramp.

**Code Backend** :

```typescript
async getBuyConfig(): Promise<{
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedNetworks: string[];
}> {
  const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/buy/config';
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    supportedCountries: response.data.countries.map((c: any) => c.id),
    supportedCurrencies: response.data.payment_currencies.map((c: any) => c.id),
    supportedNetworks: response.data.networks.map((n: any) => n.id),
  };
}

// Utilisation : Valider pays user
@Get('onramp/config')
async getOnrampConfig() {
  const config = await this.walletService.getBuyConfig();
  
  return {
    success: true,
    data: config,
  };
}
```

---

### 7. Get Buy Options (Méthodes de Paiement Disponibles)

**Endpoint** : `GET /onramp/v1/buy/options`

**Use case CyLimit** : Vérifier quelles méthodes de paiement sont disponibles pour un user français.

**Code Backend** :

```typescript
async getBuyOptions(
  country: string,
  subdivision?: string,
): Promise<{
  paymentMethods: Array<{ id: string; name: string; fee: string }>;
}> {
  const params = new URLSearchParams({
    country: country,
  });
  
  if (subdivision) {
    params.append('subdivision', subdivision);
  }

  const apiUrl = `https://api.developer.coinbase.com/onramp/v1/buy/options?${params}`;
  const jwt = await this.buildJWT(apiUrl, 'GET');

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  return {
    paymentMethods: response.data.payment_methods.map((pm: any) => ({
      id: pm.id,
      name: pm.name,
      fee: pm.fee,
    })),
  };
}

// Utilisation : Afficher options dans frontend
@Get('onramp/options')
async getOnrampOptions(@Query('country') country: string = 'FR') {
  const options = await this.walletService.getBuyOptions(country);
  
  return {
    success: true,
    data: options,
  };
}
```

---

### Résumé des Endpoints Onramp/Offramp pour CyLimit

| Endpoint | Méthode | Use Case CyLimit | Priorité |
|----------|---------|------------------|----------|
| `/buy/quote` | POST | Générer lien d'achat USDC | ⭐⭐⭐ Critique |
| `/buy/config` | GET | Vérifier pays/devises supportés | ⭐⭐ Important |
| `/buy/options` | GET | Vérifier méthodes de paiement | ⭐⭐ Important |
| `/transactions` | GET | Historique achats USDC | ⭐⭐ Important |
| `/transactions/{id}` | GET | Statut d'un achat | ⭐⭐ Important |
| `/sell/quote` | POST | Générer lien de retrait EUR | ⭐ Optionnel (Phase 2) |
| `/sell/config` | GET | Vérifier pays Offramp | ⭐ Optionnel (Phase 2) |
| `/sell/options` | GET | Méthodes de retrait | ⭐ Optionnel (Phase 2) |
| `/token` | POST | Session token sécurisé | ⚠️ Pas nécessaire si `buy/quote` utilisé |

---

## ✅ Documentation Complète

Toutes les sections API sont maintenant documentées ! 🎉

