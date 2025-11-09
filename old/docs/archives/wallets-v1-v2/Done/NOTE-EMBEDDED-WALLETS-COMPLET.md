# 📚 Note Complète : Embedded Wallets Coinbase CDP

**Date :** 7 octobre 2025  
**Source :** [docs.cdp.coinbase.com/embedded-wallets](https://docs.cdp.coinbase.com/embedded-wallets)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce qu'un Embedded Wallet ?

Un **Embedded Wallet** est un portefeuille crypto **self-custodial** intégré directement dans ton app, permettant aux users de :
- ✅ Se connecter avec **email/SMS/OAuth** (pas de seed phrases)
- ✅ Créer un wallet en **< 500ms**
- ✅ Garder le **contrôle total** de leurs assets
- ✅ **Multi-device** (jusqu'à 5 appareils)
- ✅ **Aucune extension** navigateur requise

**Différence avec Server Wallets** :
| Feature | Embedded Wallet | Server Wallet |
|---------|----------------|---------------|
| **Custody** | User | Developer |
| **Auth** | Email OTP, social | API keys |
| **UI** | Frontend React components | Backend API only |
| **Use case** | Users finaux | Backend automation, fees |

---

## 📦 Installation

### Packages NPM (PUBLICS ✅)

```bash
# Packages principaux
npm install @coinbase/cdp-react @coinbase/cdp-core @coinbase/cdp-hooks

# Si Next.js
npm install @coinbase/cdp-nextjs

# Si React Native
npm install @coinbase/cdp-react-native
```

**Note importante** : Ces packages sont **publics** et disponibles sur npm !

---

## 🏗️ Étape 1 : Configuration CDP Portal

### 1.1 Créer un projet

1. Aller sur [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
2. Créer un nouveau projet "Embedded Wallets"
3. Récupérer le **Project ID** (format : `<uuid>`)

### 1.2 Configurer les domaines

**CRITIQUE** : Tu DOIS ajouter tes domaines dans le portail, sinon les wallets ne fonctionneront pas !

**Pour le développement** :
- `http://localhost:3001` (ton frontend Next.js)
- `http://localhost:3000` (si port différent)

**Pour la production** :
- `https://app.cylimit.com` (ou ton domaine)
- **⚠️ NE PAS** ajouter `localhost` en production (risque de sécurité)

**Où configurer** :
`CDP Portal > Ton projet > Domains Configuration > Add domain`

---

## 🔧 Étape 2 : Setup React/Next.js

### 2.1 Wrapper ton app avec CDPReactProvider

**Fichier : `pages/_app.tsx` (Next.js) ou `App.tsx` (React)**

```typescript
import { CDPReactProvider } from "@coinbase/cdp-react";

function App({ Component, pageProps }) {
  return (
    <CDPReactProvider 
      config={{
        projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID, // Depuis CDP Portal
        
        // Configuration EVM (Ethereum, Base, Polygon, etc.)
        ethereum: {
          createOnLogin: "smart" // "smart" pour Smart Accounts, "eoa" pour EOA classique
        },
        
        // Configuration Solana (optionnel)
        solana: {
          createOnLogin: true // Créer automatiquement un wallet Solana
        },
        
        appName: "CyLimit", // Nom affiché dans l'UI auth
      }}
    >
      <Component {...pageProps} />
    </CDPReactProvider>
  );
}

export default App;
```

**Variables d'environnement** :

```bash
# .env.local (Frontend)
NEXT_PUBLIC_CDP_PROJECT_ID=<ton-project-id-depuis-portal>
```

---

## 🔐 Étape 3 : Authentification User

### Option A : Utiliser AuthButton (RECOMMANDÉ ✅)

**Le plus simple** : Composant tout-en-un qui gère tout le flow auth.

```typescript
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useIsSignedIn } from "@coinbase/cdp-hooks";

function WalletAuth() {
  const { isSignedIn } = useIsSignedIn();

  return (
    <div>
      {isSignedIn ? (
        <div>✅ Connecté !</div>
      ) : (
        <div>
          <h2>Connecte-toi pour continuer</h2>
          <AuthButton />
        </div>
      )}
    </div>
  );
}
```

**Ce que fait `AuthButton` automatiquement** :
1. Affiche un bouton "Sign in with Email"
2. User entre son email
3. User reçoit un code OTP par email
4. User entre le code OTP
5. Wallet créé instantanément (< 500ms)
6. User est authentifié ✅

---

### Option B : Custom Auth UI (Si tu veux contrôler l'UX)

```typescript
import { 
  useSignInWithEmail, 
  useVerifyEmailOTP, 
  useIsSignedIn 
} from "@coinbase/cdp-hooks";
import { useState } from "react";

function CustomAuth() {
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { isSignedIn } = useIsSignedIn();
  
  const [flowId, setFlowId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Étape 1 : Envoyer OTP
  const handleEmailSubmit = async () => {
    try {
      const result = await signInWithEmail({ email });
      setFlowId(result.flowId); // Garder le flowId pour l'étape 2
    } catch (error) {
      console.error("Erreur envoi OTP:", error);
    }
  };

  // Étape 2 : Vérifier OTP
  const handleOtpSubmit = async () => {
    if (!flowId) return;
    
    try {
      const { user } = await verifyEmailOTP({ flowId, otp });
      console.log("✅ User connecté, wallet créé:", user.evmAccounts?.[0]);
    } catch (error) {
      console.error("Erreur vérification OTP:", error);
    }
  };

  if (isSignedIn) {
    return <div>✅ Connecté !</div>;
  }

  return (
    <div>
      {flowId ? (
        // Étape 2 : Entrer le code OTP
        <div>
          <h2>Entre le code reçu par email</h2>
          <input 
            type="text" 
            value={otp} 
            onChange={(e) => setOtp(e.target.value)} 
            placeholder="Code OTP (6 chiffres)" 
          />
          <button onClick={handleOtpSubmit}>Vérifier</button>
        </div>
      ) : (
        // Étape 1 : Entrer l'email
        <div>
          <h2>Connecte-toi avec ton email</h2>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="ton@email.com" 
          />
          <button onClick={handleEmailSubmit}>Envoyer le code</button>
        </div>
      )}
    </div>
  );
}
```

---

## 💰 Étape 4 : Afficher la Balance & Adresse

```typescript
import { useEvmAddress, useBalance } from "@coinbase/cdp-hooks";

function WalletInfo() {
  const { evmAddress } = useEvmAddress(); // Adresse Ethereum/Polygon/Base
  const { balance, isLoading } = useBalance({
    address: evmAddress,
    network: "base-sepolia", // ou "polygon", "ethereum", etc.
    asset: "USDC" // ou "ETH", "MATIC", etc.
  });

  if (!evmAddress) {
    return <div>Wallet pas encore créé...</div>;
  }

  return (
    <div>
      <h3>Ton Wallet</h3>
      <p>Adresse : {evmAddress}</p>
      <p>Balance : {isLoading ? "..." : `${balance} USDC`}</p>
    </div>
  );
}
```

---

## 🚀 Étape 5 : Envoyer des Transactions

### 5.1 Avec le composant (SIMPLE ✅)

```typescript
import { SendEvmTransactionButton } from "@coinbase/cdp-react";
import { useEvmAddress } from "@coinbase/cdp-hooks";

function SendTransaction() {
  const { evmAddress } = useEvmAddress();

  return (
    <SendEvmTransactionButton
      account={evmAddress}
      network="base-sepolia"
      transaction={{
        to: "0xDestinataire...",
        value: 1000000n, // Montant en wei (USDC : 6 decimals)
        chainId: 84532, // Base Sepolia
        type: "eip1559",
      }}
      onSuccess={(hash) => {
        console.log('✅ TX réussie:', hash);
      }}
      onError={(error) => {
        console.error('❌ TX échouée:', error);
      }}
      pendingLabel="Envoi en cours..."
    />
  );
}
```

### 5.2 Avec le hook (PLUS DE CONTRÔLE)

```typescript
import { useSendEvmTransaction } from "@coinbase/cdp-hooks";

function CustomSendTransaction() {
  const { sendTransaction, isPending } = useSendEvmTransaction();

  const handleSend = async () => {
    try {
      const hash = await sendTransaction({
        account: evmAddress,
        network: "base-sepolia",
        transaction: {
          to: "0xDestinataire...",
          value: 1000000n,
          chainId: 84532,
          type: "eip1559",
        }
      });
      
      console.log('✅ TX Hash:', hash);
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  return (
    <button onClick={handleSend} disabled={isPending}>
      {isPending ? "Envoi..." : "Envoyer USDC"}
    </button>
  );
}
```

---

## 💵 Étape 6 : Intégrer Coinbase Onramp (Acheter des USDC)

**SUPER IMPORTANT** : Embedded Wallets a un widget Onramp **intégré** ! Pas de redirection !

### 6.1 Avec le composant (SIMPLE ✅)

```typescript
import { OnrampButton } from "@coinbase/cdp-react";
import { useEvmAddress } from "@coinbase/cdp-hooks";

function BuyUSDC() {
  const { evmAddress } = useEvmAddress();

  return (
    <OnrampButton
      destinationAddress={evmAddress}
      network="base" // ou "polygon", "ethereum"
      asset="USDC"
      presetAmount={100} // Montant par défaut
      onSuccess={(data) => {
        console.log('✅ Achat réussi:', data);
      }}
      onError={(error) => {
        console.error('❌ Achat échoué:', error);
      }}
    >
      Acheter des USDC
    </OnrampButton>
  );
}
```

**Ce qui se passe** :
1. User clique sur le bouton
2. Widget Coinbase Onramp s'ouvre **DANS ton app** (pas de redirection !)
3. User entre le montant et paie avec sa CB
4. USDC arrive dans son Embedded Wallet
5. Callback `onSuccess` appelé

### 6.2 Avec le hook (CUSTOM UI)

```typescript
import { useOnramp } from "@coinbase/cdp-hooks";

function CustomBuyUSDC() {
  const { evmAddress } = useEvmAddress();
  const { openOnramp, isLoading } = useOnramp();

  const handleBuy = async () => {
    try {
      await openOnramp({
        destinationAddress: evmAddress,
        network: "base",
        asset: "USDC",
        presetAmount: 100,
      });
    } catch (error) {
      console.error('❌ Erreur Onramp:', error);
    }
  };

  return (
    <button onClick={handleBuy} disabled={isLoading}>
      {isLoading ? "Ouverture..." : "Acheter 100 USDC"}
    </button>
  );
}
```

---

## 🔑 Hooks Disponibles

### Auth & User

| Hook | Description |
|------|-------------|
| `useIsSignedIn()` | Vérifie si user est connecté |
| `useSignInWithEmail()` | Envoie OTP par email |
| `useVerifyEmailOTP()` | Vérifie le code OTP |
| `useUser()` | Infos du user authentifié |
| `useSignOut()` | Déconnecter le user |

### Wallets & Addresses

| Hook | Description |
|------|-------------|
| `useEvmAddress()` | Adresse EVM (Ethereum, Polygon, Base) |
| `useSolanaAddress()` | Adresse Solana |
| `useBalance()` | Balance d'un asset (USDC, ETH, etc.) |

### Transactions

| Hook | Description |
|------|-------------|
| `useSendEvmTransaction()` | Envoyer une TX EVM |
| `useSendSolanaTransaction()` | Envoyer une TX Solana |

### Onramp/Offramp

| Hook | Description |
|------|-------------|
| `useOnramp()` | Ouvrir widget Coinbase Onramp |
| `useOfframp()` | Ouvrir widget Coinbase Offramp |

---

## 🎨 Composants UI Disponibles

### Auth

- `<AuthButton />` : Bouton complet sign in/sign out
- `<SignInButton />` : Bouton sign in uniquement
- `<SignOutButton />` : Bouton sign out uniquement

### Transactions

- `<SendEvmTransactionButton />` : Bouton pour envoyer TX EVM
- `<SendSolanaTransactionButton />` : Bouton pour envoyer TX Solana

### Onramp/Offramp

- `<OnrampButton />` : Bouton pour acheter crypto (widget intégré)
- `<OfframpButton />` : Bouton pour vendre crypto vers fiat

### Display

- `<WalletAddress />` : Affiche l'adresse (avec copy)
- `<BalanceDisplay />` : Affiche la balance

---

## 🔒 Smart Accounts vs EOA

**Tu peux choisir le type de wallet créé** :

```typescript
<CDPReactProvider 
  config={{
    projectId: "...",
    ethereum: {
      createOnLogin: "smart" // 👈 CHOIX ICI
      // Options:
      // - "smart" : Smart Account (ERC-4337) - RECOMMANDÉ
      // - "eoa" : Compte classique (Externally Owned Account)
    }
  }}
>
```

**Recommandation** : Utilise **"smart"** (Smart Accounts) car :
- ✅ Gas sponsoring possible
- ✅ Batch transactions (atomique)
- ✅ Plus flexible
- ✅ Meilleure UX

---

## 💻 Architecture Hybride pour CyLimit

### Setup Recommandé

```
┌─────────────────────────────────────┐
│  FRONTEND (Next.js)                 │
│  - Embedded Wallets (users)         │
│  - Auth email/OTP                   │
│  - Widget Onramp intégré            │
│  - Smart Accounts (ERC-4337)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  BACKEND (NestJS)                   │
│  - Server Wallets (CyLimit)         │
│  - Master Wallet (fees)             │
│  - Rewards automatiques             │
│  - API-driven                       │
└─────────────────────────────────────┘
```

**Pourquoi Hybride ?**

1. **Embedded Wallets pour les users** :
   - UX simple (email/OTP)
   - Widget Onramp intégré
   - Pas de redirection
   - Multi-device

2. **Server Wallets pour CyLimit** :
   - Collecter les fees
   - Payer les rewards
   - Contrôle backend total
   - Automation

---

## 🌐 Réseaux Supportés

### EVM (Ethereum Virtual Machine)

- ✅ Ethereum (Mainnet + Sepolia testnet)
- ✅ **Base** (Mainnet + Sepolia testnet) ← RECOMMANDÉ pour CyLimit
- ✅ **Polygon** (Mainnet + Amoy testnet) ← Actuellement utilisé
- ✅ Arbitrum
- ✅ Optimism
- ✅ Tous les réseaux EVM-compatible

### Non-EVM

- ✅ Solana (Mainnet + Devnet)

**Pour CyLimit** : Utilise **Base** ou **Polygon** pour les faibles gas fees et support USDC natif.

---

## 💰 Pricing

**Embedded Wallets** :
- ✅ **GRATUIT** pour les 10,000 premières wallets actives/mois
- ✅ **GRATUIT** pour les 50,000 premières transactions/mois
- Après : $0.02 par wallet actif supplémentaire

**Onramp fees** :
- ✅ Coinbase prend ~3.5% (payé par l'user)
- ✅ CyLimit ne paie rien

---

## 🎨 Theming (Customisation UI)

Tu peux personnaliser les composants UI :

```typescript
<CDPReactProvider 
  config={{
    projectId: "...",
    theme: {
      colors: {
        primary: "#1E40AF", // Bleu CyLimit
        background: "#FFFFFF",
        text: "#000000",
      },
      fonts: {
        body: "Inter, sans-serif",
      },
    }
  }}
>
```

---

## 🔐 Sécurité

### Custody Model

- ✅ **User-custodied** : L'user garde le contrôle total
- ✅ **Export privé key** : User peut exporter ses clés à tout moment
- ✅ **Multi-device** : Jusqu'à 5 appareils synchronisés
- ✅ **Encrypted backup** : Backup chiffré chez Coinbase

### Coinbase ne peut PAS :

- ❌ Accéder aux clés privées
- ❌ Signer des transactions sans consentement user
- ❌ Voler les fonds

### Architecture Sécurité

1. Clés privées **fragmentées** (MPC - Multi-Party Computation)
2. Fragments stockés dans **AWS Nitro Enclaves** (hardware-secured)
3. Signature nécessite **authentification user** (OTP)
4. Coinbase ne peut **jamais** reconstruire la clé complète

---

## ⚠️ Points d'Attention

### 1. Domaines DOIVENT être configurés

Sans configuration domaine dans CDP Portal :
- ❌ Wallets ne se créeront pas
- ❌ Auth échouera
- ❌ Erreur CORS

**Solution** : Ajouter `http://localhost:3001` ET ton domaine prod dans CDP Portal.

### 2. Variables d'environnement

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CDP_PROJECT_ID=<depuis-portal>

# Backend (.env) - pour Server Wallets
COINBASE_API_KEY_NAME=<depuis-portal>
COINBASE_API_KEY_PRIVATE_KEY=<depuis-portal>
```

### 3. Next.js : "use client" requis

Les composants Embedded Wallets utilisent React hooks (state, effects) :

```typescript
"use client"; // 👈 OBLIGATOIRE en haut du fichier

import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

export default function Page() {
  return <AuthButton />;
}
```

### 4. Network ID vs Chain ID

**Network ID** (pour les hooks CDP) :
- `"base-sepolia"`, `"polygon"`, `"ethereum"`, etc.

**Chain ID** (pour les transactions) :
- Base Sepolia : `84532`
- Polygon Mainnet : `137`
- Ethereum Mainnet : `1`

---

## 📚 Liens Documentation

- [Welcome](https://docs.cdp.coinbase.com/embedded-wallets/welcome)
- [Quickstart](https://docs.cdp.coinbase.com/embedded-wallets/quickstart)
- [React Hooks](https://docs.cdp.coinbase.com/embedded-wallets/react-hooks)
- [React Components](https://docs.cdp.coinbase.com/embedded-wallets/react-components)
- [Onramp Integration](https://docs.cdp.coinbase.com/embedded-wallets/onramp-integration)
- [Smart Accounts](https://docs.cdp.coinbase.com/embedded-wallets/smart-accounts)
- [Security & Export](https://docs.cdp.coinbase.com/embedded-wallets/security-export)

---

## ✅ Checklist Implémentation CyLimit

### Setup Initial

- [ ] Créer projet CDP Portal
- [ ] Récupérer Project ID
- [ ] Configurer domaines (localhost + prod)
- [ ] Installer packages npm

### Frontend

- [ ] Wrapper app avec `<CDPReactProvider>`
- [ ] Configurer Smart Accounts (`createOnLogin: "smart"`)
- [ ] Ajouter auth avec `<AuthButton>` ou custom UI
- [ ] Afficher wallet info (adresse, balance)
- [ ] Intégrer widget Onramp avec `<OnrampButton>`
- [ ] Tester achat USDC

### Backend (Server Wallets)

- [ ] Garder `CoinbaseWalletService` existant
- [ ] Master Wallet pour collecter fees
- [ ] API pour rewards automatiques

### Tests

- [ ] Auth email/OTP fonctionne
- [ ] Wallet créé instantanément
- [ ] Balance affichée correctement
- [ ] Onramp widget s'ouvre (pas de redirection)
- [ ] Achat USDC fonctionne
- [ ] Transaction USDC fonctionne

---

## 🎯 Prochaines Étapes

1. **Lire la doc Server Wallets** pour comprendre le backend
2. **Lire la doc Onramp/Offramp API** pour les options avancées
3. **Lire la doc API REST** pour les intégrations backend/frontend

---

**Note créée par :** Claude (Assistant IA)  
**Pour :** Valentin @ CyLimit  
**Date :** 7 octobre 2025

**✅ Cette note est complète et prête pour implémentation !**

