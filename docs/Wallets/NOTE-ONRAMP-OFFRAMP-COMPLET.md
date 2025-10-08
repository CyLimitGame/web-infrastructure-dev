# 📚 Note Complète : Coinbase Onramp & Offramp

**Date :** 7 octobre 2025  
**Source :** [docs.cdp.coinbase.com/onramp-offramp](https://docs.cdp.coinbase.com/onramp-offramp) & [Session Token Authentication](https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce que Coinbase Onramp ?

**Coinbase Onramp** permet à tes users d'**acheter des cryptos avec leur carte bancaire** (ou autre moyen de paiement fiat), directement depuis ton app, sans avoir de compte Coinbase.

**Use case CyLimit** :
- User clique "Add Funds" → Widget Coinbase s'ouvre → User paie avec CB → USDC arrive dans son wallet

### Qu'est-ce que Coinbase Offramp ?

**Coinbase Offramp** permet à tes users de **vendre leurs cryptos et recevoir du fiat** (EUR, USD, etc.) sur leur compte bancaire.

**Use case CyLimit** :
- User veut retirer son argent → Widget Coinbase s'ouvre → USDC converti en EUR → Envoyé sur son compte bancaire

---

## 🆚 Deux Modes d'Intégration

### 1. **Embedded Wallets + Widget Onramp** ⭐ RECOMMANDÉ

**Avantages** :
- ✅ **Widget intégré** dans ton app (pas de redirection !)
- ✅ **UX fluide** : User reste dans CyLimit
- ✅ Composants React **prêts à l'emploi**
- ✅ **Automatique** : pas besoin de gérer les session tokens manuellement

**Comment ça marche** :

```typescript
import { OnrampButton } from "@coinbase/cdp-react";
import { useEvmAddress } from "@coinbase/cdp-hooks";

function BuyUSDC() {
  const { evmAddress } = useEvmAddress();

  return (
    <OnrampButton
      destinationAddress={evmAddress}
      network="base" // ou "polygon"
      asset="USDC"
      presetAmount={100}
      onSuccess={(data) => {
        console.log('✅ Achat réussi:', data);
      }}
      onError={(error) => {
        console.error('❌ Erreur:', error);
      }}
    >
      Acheter des USDC
    </OnrampButton>
  );
}
```

**Ce qui se passe** :
1. User clique sur le bouton
2. Widget Coinbase Onramp s'ouvre **dans ton app** (modal ou iframe)
3. User choisit le montant et paie avec CB
4. USDC arrive dans son Embedded Wallet
5. Callback `onSuccess` appelé

**⚠️ IMPORTANT** :
- Nécessite un **Project ID Embedded Wallets** (CDP Portal)
- Domaines **doivent être whitelistés** dans CDP Portal
- **Pas besoin de gérer les session tokens** manuellement (géré par le SDK)

---

### 2. **Server Wallets + Onramp API** (Redirection)

**Inconvénients** :
- ❌ **Redirection** vers Coinbase Pay (user quitte ton app)
- ❌ **Session token requis** (appel API backend pour le générer)
- ❌ **UX moins fluide**

**Avantages** :
- ✅ Fonctionne avec **Server Wallets** (pas d'Embedded Wallets requis)
- ✅ Plus de **contrôle** sur le flow

**Comment ça marche** :

#### Étape 1 : Backend - Générer un lien Onramp

```typescript
// Backend (NestJS)
import axios from 'axios';
import { CoinbaseAuthenticator } from '@coinbase/coinbase-sdk/dist/coinbase/authenticator';

async generateOnrampLink(walletAddress: string, amountUSDC: number): Promise<string> {
  // 1. Créer un JWT pour authentifier l'API call
  const authenticator = new CoinbaseAuthenticator(
    apiKeyName,
    privateKey,
    'cylimit-backend',
    '1.0.0'
  );

  const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/buy/quote';
  const jwt = await authenticator.buildJWT(apiUrl, 'POST');

  // 2. Appeler l'API Buy Quote
  const response = await axios.post(
    apiUrl,
    {
      purchase_currency: 'USDC',
      payment_amount: amountUSDC.toString(),
      payment_currency: 'USD',
      payment_method: 'CARD',
      country: 'US', // ou détecter le pays de l'user
      destination_address: walletAddress,
      purchase_network: 'base-sepolia', // ou 'polygon'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    }
  );

  // 3. Retourner l'URL Onramp
  return response.data.onramp_url;
}
```

#### Étape 2 : Frontend - Rediriger vers le lien

```typescript
// Frontend
const handleBuyUSDC = async () => {
  try {
    // Appeler le backend pour obtenir le lien
    const response = await fetch(`/api/wallet/onramp?address=${walletAddress}&amount=100`);
    const { onrampUrl } = await response.json();

    // Rediriger vers Coinbase Pay
    window.open(onrampUrl, '_blank');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};
```

**⚠️ IMPORTANT** :
- User est **redirigé** vers `pay.coinbase.com`
- User doit **revenir** manuellement sur ton app après l'achat
- **UX moins bonne** que le widget intégré

---

## 💰 Fees & Pricing

### Frais Onramp (Payés par l'User)

| Méthode de paiement | Frais Coinbase | Note |
|---------------------|----------------|------|
| **Carte bancaire (CB)** | ~3.5% | Le plus courant |
| **Virement bancaire (SEPA)** | ~1% | Moins cher mais plus lent |
| **Apple Pay / Google Pay** | ~3.5% | Rapide |

**⚠️ CRITIQUE** :
- CyLimit **ne paie RIEN** (fees payés par l'user)
- CyLimit **ne touche RIEN** (pas de commission pour toi)
- Coinbase prend les fees directement

**Exemple** :
- User veut acheter **100 USDC**
- Coinbase charge **103.50 USD** (100 + 3.5%)
- User paie 103.50 USD avec sa CB
- CyLimit reçoit **100 USDC** (net) dans son wallet

### Frais Offramp (Payés par l'User)

| Méthode de retrait | Frais Coinbase | Délai |
|--------------------|----------------|-------|
| **Virement bancaire (SEPA)** | ~1% | 1-3 jours |
| **Virement instantané** | ~2% | Quelques minutes |

**Exemple** :
- User veut retirer **50 USDC**
- Coinbase déduit **0.50 USD** (50 × 1%)
- User reçoit **49.50 EUR** (ou USD) sur son compte bancaire

---

## 🌐 Réseaux Supportés

### Onramp (Achat Crypto)

| Réseau | USDC supporté | Testnet | Note |
|--------|---------------|---------|------|
| **Base** | ✅ | ✅ Sepolia | Recommandé (low fees) |
| **Ethereum** | ✅ | ✅ Sepolia | Plus cher (gas fees) |
| **Polygon** | ✅ | ✅ Amoy | Low fees aussi |
| **Arbitrum** | ✅ | ✅ | Layer 2, low fees |
| **Optimism** | ✅ | ✅ | Layer 2, low fees |
| **Solana** | ✅ | ✅ Devnet | Fast & cheap |

**Pour CyLimit** : Utilise **Base** ou **Polygon** (low fees, USDC natif).

### Offramp (Vente Crypto)

**Actuellement limité à** :
- ✅ Ethereum Mainnet
- ✅ Polygon Mainnet
- ✅ Base Mainnet

**⚠️ Pas de testnets pour Offramp** (uniquement production).

---

## 🔒 Sécurité & Session Tokens

**⚠️ CRITIQUE POUR LA SÉCURITÉ** : Session tokens sont **OBLIGATOIRES** pour toutes les intégrations Onramp/Offramp via API !

### Pourquoi Session Tokens ?

Les session tokens protègent contre plusieurs attaques :
- ✅ **CSRF (Cross-Site Request Forgery)** : Empêche un site malveillant d'initier un achat
- ✅ **Man-in-the-Middle** : Token unique et éphémère (5 minutes)
- ✅ **Address Spoofing** : Valide que l'adresse de destination appartient bien à ton user
- ✅ **IP Validation** : Vérifie que la requête vient du bon client

### Propriétés des Session Tokens

| Propriété | Valeur |
|-----------|--------|
| **Durée de vie** | 5 minutes |
| **Usage** | **1 seule fois** (single-use) |
| **Génération** | **Backend uniquement** (jamais frontend) |
| **Format** | Base64 string opaque |
| **Validation** | Client IP + Adresse wallet |

---

### Avec Embedded Wallets (Widget)

**Pas besoin de gérer les session tokens manuellement** ! Le SDK `@coinbase/cdp-react` les génère automatiquement côté backend via Coinbase.

**Comment ça marche sous le capot** :
1. User clique sur `<OnrampButton>`
2. SDK fait un appel backend Coinbase (transparent)
3. Coinbase génère un session token
4. Widget s'ouvre avec le token
5. Token validé par Coinbase API

**Tu n'as RIEN à faire** ✅

---

### Avec Server Wallets (API) - Implémentation Complète

**Tu DOIS générer un session token** pour sécuriser l'initialisation Onramp.

#### Étape 1 : Security Requirements Backend

**⚠️ OBLIGATOIRE** : Ton endpoint backend qui génère les session tokens **DOIT** :

1. **Vérifier l'authentification user** :
   ```typescript
   // Exemple avec JWT
   @UseGuards(AuthGuard('jwt'))
   @Get(':address/onramp')
   async generateOnrampLink(@Req() req, @Param('address') address: string) {
     const userId = req.user.id;
     
     // CRITIQUE : Vérifier que l'adresse appartient bien à ce user
     const wallet = await this.walletService.findByUserIdAndAddress(userId, address);
     if (!wallet) {
       throw new UnauthorizedException('Cette adresse ne vous appartient pas');
     }
     
     // Continuer...
   }
   ```

2. **Extraire le vrai IP du client** (pas les headers HTTP !) :
   ```typescript
   // ❌ NE PAS FAIRE (facilement spoofé)
   const clientIp = req.headers['x-forwarded-for'];
   
   // ✅ FAIRE (vrai IP de la connexion TCP)
   const clientIp = req.connection.remoteAddress || req.socket.remoteAddress;
   ```

3. **Configurer CORS correctement** :
   ```typescript
   // main.ts (NestJS)
   app.enableCors({
     origin: [
       'http://localhost:3001', // Dev
       'https://app.cylimit.com', // Prod
     ],
     credentials: true, // Important pour les cookies d'auth
     methods: ['GET', 'POST'],
   });
   ```

4. **Rate limiting** (prévenir abus) :
   ```typescript
   import { ThrottlerGuard } from '@nestjs/throttler';
   
   @UseGuards(ThrottlerGuard) // Max 10 requêtes/minute par IP
   @Get(':address/onramp')
   async generateOnrampLink(...) {
     // ...
   }
   ```

#### Étape 2 : Générer JWT pour authentifier l'API CDP

Coinbase utilise **JWT (JSON Web Token)** pour authentifier les appels API.

**Installation** :
```bash
npm install @coinbase/coinbase-sdk
```

**Code Backend (NestJS)** :

```typescript
import { CoinbaseAuthenticator } from '@coinbase/coinbase-sdk/dist/coinbase/authenticator';

export class CoinbaseWalletService {
  private authenticator: CoinbaseAuthenticator;
  
  constructor(private configService: ConfigService) {
    const apiKeyName = this.configService.get<string>('COINBASE_API_KEY_NAME');
    const privateKey = this.configService.get<string>('COINBASE_API_KEY_PRIVATE_KEY');
    
    // Initialiser l'authenticator
    this.authenticator = new CoinbaseAuthenticator(
      apiKeyName,
      privateKey,
      'cylimit-backend', // Service name
      '1.0.0', // Version
    );
  }
  
  private async buildJWT(apiUrl: string, method: 'GET' | 'POST'): Promise<string> {
    return await this.authenticator.buildJWT(apiUrl, method);
  }
}
```

**Propriétés du JWT** :
- ✅ **Signé avec ta clé privée** CDP (ECDSA)
- ✅ **Expire après 2 minutes**
- ✅ **Contient** : URI, timestamp, nonce
- ✅ **Validé** par Coinbase API

---

#### Étape 3 : Générer un Session Token

**API Endpoint** : `POST https://api.developer.coinbase.com/onramp/v1/token`

**Code Backend complet** :

```typescript
import axios from 'axios';

async generateSessionToken(
  walletAddress: string,
  clientIp: string,
): Promise<{ token: string; channelId: string }> {
  try {
    const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/token';
    
    // 1. Générer JWT
    const jwt = await this.buildJWT(apiUrl, 'POST');
    
    // 2. Appeler l'API Session Token
    const response = await axios.post(
      apiUrl,
      {
        addresses: [
          {
            address: walletAddress,
            blockchains: ['base', 'polygon'], // Réseaux supportés
          },
        ],
        assets: ['USDC', 'ETH'], // Assets supportés
        clientIp: clientIp, // ⚠️ CRITIQUE : vrai IP du client
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`, // JWT dans le header
        },
      },
    );
    
    return {
      token: response.data.token,
      channelId: response.data.channel_id,
    };
  } catch (error: any) {
    this.logger.error('❌ Erreur génération session token:', error?.response?.data || error?.message);
    throw new Error(`Impossible de générer le session token: ${error?.response?.data?.message || error?.message}`);
  }
}
```

**Réponse API** :
```json
{
  "token": "ZWJlNDgwYmItNjBkMi00ZmFiLWIxYTQtMTM3MGI2YjJiNjFh",
  "channel_id": "web-12345678"
}
```

**Paramètres importants** :
- `addresses` : Liste d'adresses de destination (peut en avoir plusieurs)
- `blockchains` : Réseaux supportés (ex: `["base", "ethereum", "polygon"]`)
- `assets` : Tokens supportés (ex: `["USDC", "ETH", "BTC"]`)
- `clientIp` : **OBLIGATOIRE** - IP réel du client (validation sécurité)

---

#### Étape 4 : Construire l'URL Onramp avec le Token

```typescript
async generateOnrampLink(
  walletAddress: string,
  amountUSDC: number,
  clientIp: string,
): Promise<string> {
  // 1. Générer session token
  const { token } = await this.generateSessionToken(walletAddress, clientIp);
  
  // 2. Construire l'URL Onramp
  const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
  const params = new URLSearchParams({
    sessionToken: token, // Token obligatoire
    defaultNetwork: 'base', // Réseau par défaut
    presetFiatAmount: amountUSDC.toString(), // Montant pré-rempli
    defaultAsset: 'USDC', // Asset par défaut
  });
  
  return `${baseUrl}?${params.toString()}`;
}
```

**URL générée** :
```
https://pay.coinbase.com/buy/select-asset?sessionToken=ZWJlNDgwYmItNjBkMi00ZmFiLWIxYTQtMTM3MGI2YjJiNjFh&defaultNetwork=base&presetFiatAmount=100&defaultAsset=USDC
```

---

#### Étape 5 : Controller Endpoint

```typescript
// wallet.controller.ts
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
@Get(':address/onramp')
async generateOnrampLink(
  @Req() req,
  @Param('address') address: string,
  @Query('amount') amount: number = 100,
) {
  const userId = req.user.id;
  const clientIp = req.connection.remoteAddress || req.socket.remoteAddress;
  
  // Vérifier que l'adresse appartient bien à cet user
  const wallet = await this.walletService.findByUserIdAndAddress(userId, address);
  if (!wallet) {
    throw new UnauthorizedException('Cette adresse ne vous appartient pas');
  }
  
  // Générer le lien Onramp
  const onrampUrl = await this.coinbaseWalletService.generateOnrampLink(
    address,
    amount,
    clientIp,
  );
  
  return {
    success: true,
    data: {
      onrampUrl,
      destinationAddress: address,
      suggestedAmount: amount,
      expiresIn: 300, // 5 minutes
    },
  };
}
```

---

#### Étape 6 : Frontend - Ouvrir le lien

```typescript
// Frontend (Next.js)
const handleBuyUSDC = async () => {
  try {
    // Appeler le backend pour obtenir le lien
    const response = await fetch(`/api/wallet/${walletAddress}/onramp?amount=100`, {
      method: 'GET',
      credentials: 'include', // Important pour envoyer les cookies d'auth
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la génération du lien');
    }
    
    const { data } = await response.json();
    
    // Ouvrir dans une nouvelle fenêtre
    const newWindow = window.open(data.onrampUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup bloquée
      toast.error('Popup bloquée ! Autorisez les popups pour ce site.');
    } else {
      toast.info('Redirection vers Coinbase Pay...');
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    toast.error('Impossible de générer le lien Onramp');
  }
};
```

---

### Alternative : API Buy Quote (Sans Session Token séparé)

**Plus simple** : L'API Buy Quote retourne **directement** l'URL Onramp avec le token intégré.

**Endpoint** : `POST https://api.developer.coinbase.com/onramp/v1/buy/quote`

**Code Backend** :

```typescript
// Cette méthode retourne directement l'onramp_url (pas besoin de session token séparé)
const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/buy/quote';
const response = await axios.post(
  apiUrl,
  {
    purchase_currency: 'USDC',
    payment_amount: '100',
    payment_currency: 'USD',
    payment_method: 'CARD',
    country: 'US',
    destination_address: walletAddress,
    purchase_network: 'base-sepolia',
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`, // JWT généré avec CoinbaseAuthenticator
    },
  }
);

const onrampUrl = response.data.onramp_url;
```

#### Méthode 2 : API Session Token (Alternative)

```typescript
// Étape 1 : Générer un session token
const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/session';
const response = await axios.post(
  apiUrl,
  {
    destination_wallets: [
      {
        address: walletAddress,
        blockchains: ['base-sepolia'],
        assets: ['USDC'],
      },
    ],
    preset_crypto_amount: 100,
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
  }
);

const sessionToken = response.data.session_token;

// Étape 2 : Construire l'URL Onramp avec le token
const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
const params = new URLSearchParams({
  appId: 'cylimit-app',
  sessionToken: sessionToken,
});

const onrampUrl = `${baseUrl}?${params.toString()}`;
```

---

## 🎨 Configuration CDP Portal

### Pour Embedded Wallets (Widget)

1. **Activer Onramp** :
   - CDP Portal > Embedded Wallets > Onramp & Offramp
   - Cliquer "Get started"

2. **Configurer les domaines** :
   - Ajouter `http://localhost:3001` (dev)
   - Ajouter `https://app.cylimit.com` (prod)

3. **Configuration Display Name** :
   - Nom affiché : "CyLimit"
   - Logo : Upload ton logo CyLimit

4. **Limites de test** :
   - 25 transactions max
   - $5 max par transaction
   - **Demander full access** pour production

### Pour Server Wallets (API)

1. **Activer Onramp API** :
   - CDP Portal > Onramp & Offramp > Enable
   - Répondre au questionnaire :
     - ✅ "Allow users to purchase crypto in their user-controlled wallets"
     - ✅ "Allow users to convert crypto... into fiat" (pour Offramp)
     - ✅ "Allow users to send crypto to others" (marketplace)
     - ❌ "General purpose goods and services"
     - ❌ "Crypto assets and services"
     - ❌ (Tous les autres)

2. **Configurer Domain Allowlist** :
   - Ajouter `https://app.cylimit.com`
   - Ajouter `http://localhost:3001` (si dev)

3. **Générer API Keys** :
   - CDP API Key Name
   - CDP API Key Private Key

---

## 📊 Monitoring & Webhooks

### Webhooks Onramp

**Tu peux recevoir des notifications** quand un user achète des USDC :

```typescript
// CDP Portal > Webhooks > Create Webhook
// URL: https://api.cylimit.com/webhooks/coinbase/onramp

// Événements disponibles:
// - onramp.transaction.initiated
// - onramp.transaction.completed
// - onramp.transaction.failed
```

**Payload webhook** :

```json
{
  "type": "onramp.transaction.completed",
  "data": {
    "transaction_id": "abc123",
    "destination_address": "0x...",
    "asset": "USDC",
    "amount": "100",
    "network": "base-sepolia",
    "user_email": "user@example.com"
  }
}
```

**Backend (NestJS) - Gérer le webhook** :

```typescript
@Post('webhooks/coinbase/onramp')
async handleOnrampWebhook(@Body() payload: any) {
  if (payload.type === 'onramp.transaction.completed') {
    const { destination_address, amount, asset } = payload.data;
    
    // Mettre à jour la balance user dans ta DB
    await this.userService.updateBalance(destination_address, parseFloat(amount));
    
    this.logger.log(`✅ User a acheté ${amount} ${asset}`);
  }
  
  return { success: true };
}
```

---

## 🚀 Implémentation Recommandée pour CyLimit

### Option A : Embedded Wallets + Widget (RECOMMANDÉ ✅)

**Architecture** :

```
┌─────────────────────────────────────┐
│  FRONTEND (Next.js)                 │
│  - Embedded Wallets (users)         │
│  - <OnrampButton> composant         │
│  - Widget intégré (pas redirection) │
└─────────────────────────────────────┘
```

**Avantages** :
- ✅ **UX parfaite** : User reste dans CyLimit
- ✅ **Simplicité** : Pas de backend Onramp à gérer
- ✅ **Maintenance** : Coinbase gère tout

**Code Frontend** :

```typescript
// src/features/AddFund/index.tsx
import { OnrampButton } from "@coinbase/cdp-react";
import { useEvmAddress } from "@coinbase/cdp-hooks";

const AddFund = () => {
  const { evmAddress } = useEvmAddress();
  const [amount, setAmount] = useState(100);

  return (
    <div>
      <h2>Ajouter des fonds</h2>
      <input 
        type="number" 
        value={amount} 
        onChange={(e) => setAmount(Number(e.target.value))}
        min={10}
      />
      <OnrampButton
        destinationAddress={evmAddress}
        network="base"
        asset="USDC"
        presetAmount={amount}
        onSuccess={(data) => {
          console.log('✅ Achat réussi:', data);
          // Rafraîchir la balance
        }}
        onError={(error) => {
          console.error('❌ Erreur:', error);
        }}
      >
        Acheter {amount} USDC
      </OnrampButton>
    </div>
  );
};
```

---

### Option B : Server Wallets + API (Alternative)

**Architecture** :

```
┌─────────────────────────────────────┐
│  FRONTEND (Next.js)                 │
│  - Appel API backend                │
│  - Redirection vers Coinbase Pay    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  BACKEND (NestJS)                   │
│  - Générer JWT                      │
│  - Appeler Buy Quote API            │
│  - Retourner onramp_url             │
└─────────────────────────────────────┘
```

**Avantages** :
- ✅ Fonctionne avec Server Wallets (pas d'Embedded Wallets requis)
- ✅ Plus de contrôle backend

**Inconvénients** :
- ❌ Redirection (user quitte l'app)
- ❌ Plus de code backend à maintenir

**Code Backend** :

```typescript
// src/modules/wallet/controllers/wallet.controller.ts
@Get(':address/onramp')
async generateOnrampLink(
  @Param('address') address: string,
  @Query('amount') amount: number = 100,
) {
  const link = await this.coinbaseWalletService.generateOnrampLink(address, amount);
  return {
    success: true,
    data: {
      onrampUrl: link,
      destinationAddress: address,
      suggestedAmount: amount,
    },
  };
}
```

**Code Frontend** :

```typescript
// src/features/AddFund/index.tsx
const handleBuyUSDC = async () => {
  try {
    const response = await fetch(`/api/wallet/${walletAddress}/onramp?amount=${amount}`);
    const { onrampUrl } = await response.json();
    
    window.open(onrampUrl, '_blank');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};
```

---

## 🎯 Comparaison des Deux Options

| Critère | Embedded Wallets + Widget | Server Wallets + API |
|---------|---------------------------|----------------------|
| **UX** | ⭐⭐⭐⭐⭐ Widget intégré | ⭐⭐ Redirection |
| **Simplicité** | ⭐⭐⭐⭐⭐ Composant React | ⭐⭐⭐ Code backend requis |
| **Maintenance** | ⭐⭐⭐⭐⭐ Coinbase gère | ⭐⭐⭐ Tu gères |
| **Contrôle** | ⭐⭐⭐ SDK gère tout | ⭐⭐⭐⭐⭐ Full contrôle |
| **Session tokens** | ✅ Automatique | ❌ Manuel (JWT) |
| **Compatibilité** | Embedded Wallets requis | Server Wallets OK |

**Recommandation pour CyLimit** : **Option A (Embedded Wallets + Widget)** ! 🎯

---

## ✅ Checklist Implémentation (Option A)

### Setup Initial

- [ ] Créer projet CDP Portal (Embedded Wallets)
- [ ] Activer Onramp & Offramp
- [ ] Configurer domaines (localhost + prod)
- [ ] Configurer Display Name & Logo

### Frontend

- [ ] Installer `@coinbase/cdp-react` et `@coinbase/cdp-hooks`
- [ ] Wrapper app avec `<CDPReactProvider>`
- [ ] Créer composant `AddFund` avec `<OnrampButton>`
- [ ] Tester widget Onramp en dev

### Tests

- [ ] Acheter 5 USDC avec CB (testnet)
- [ ] Vérifier que les USDC arrivent dans l'Embedded Wallet
- [ ] Vérifier callback `onSuccess`
- [ ] Tester erreur (CB refusée)

### Production

- [ ] Demander full access Onramp (CDP Portal)
- [ ] Migrer vers Mainnet (Base ou Polygon)
- [ ] Configurer webhooks (optionnel)

---

## 🔗 Liens Documentation

- [Onramp Overview](https://docs.cdp.coinbase.com/onramp-offramp/introduction)
- [Embedded Wallets Onramp Integration](https://docs.cdp.coinbase.com/embedded-wallets/onramp-integration)
- [API Buy Quote](https://docs.cdp.coinbase.com/api-reference/onramp-offramp/create-buy-quote)
- [API Session Token](https://docs.cdp.coinbase.com/api-reference/onramp-offramp/create-session-token)
- [Webhooks](https://docs.cdp.coinbase.com/webhooks)

---

**Note créée par :** Claude (Assistant IA)  
**Pour :** Valentin @ CyLimit  
**Date :** 7 octobre 2025

**✅ Cette note est complète et prête pour implémentation Onramp !**

