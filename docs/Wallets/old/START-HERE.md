# 🚀 START HERE - Migration Frontend

## ⚡ Quick Start (5 minutes)

### 1. Setup environnement

```bash
cd cylimit-frontend-develop

# Variables d'environnement
cat >> .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3002/v1
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x28b53123d2C5fFc3aeAc39bd7f05cCDE97b319b3
NEXT_PUBLIC_NETWORK=base-sepolia
EOF

# Créer la structure
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/components/wallet
mkdir -p src/components/marketplace
mkdir -p src/types
```

### 2. Vérifier que le backend tourne

```bash
# Dans un autre terminal
cd cylimit-backend-develop
npm run start:dev

# Tester
curl http://localhost:3002/v1/wallet/health
# Devrait retourner: {"success":true,"data":{"coinbaseService":"available"}}
```

### 3. Créer les fichiers de base

**Copie ces 3 fichiers depuis [MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md) :**

1. `src/services/wallet.service.ts` (lignes 28-96)
2. `src/services/marketplace.service.ts` (lignes 98-162)
3. `src/hooks/useWallet.ts` (lignes 166-215)

### 4. Tester

Importe `useWallet` dans n'importe quel composant :

```typescript
import { useWallet } from '@/hooks/useWallet';

export const TestComponent = () => {
  const { wallet, createWallet } = useWallet('user-123');
  
  return (
    <button onClick={createWallet}>
      Test Create Wallet
    </button>
  );
};
```

---

## 📚 Documentation complète

### 🎯 Documentation Système Global

- **[SYSTEME-WALLETS-COMPLET.md](./SYSTEME-WALLETS-COMPLET.md)** - Document de référence complet du système actuel (Server Wallets + Onramp)
- **[NOTE-SYNTHESE-FINALE.md](./NOTE-SYNTHESE-FINALE.md)** ⭐ **NOUVEAU** - Note de synthèse finale pour implémenter le système complet (Server Wallets pour CyLimit + Users, Onramp/Offramp)
- **[GUIDE-DEPLOIEMENT.md](./GUIDE-DEPLOIEMENT.md)** - Guide détaillé pour le déploiement du smart contract
- **[PLAN-IMPLEMENTATION-STEP-BY-STEP.md](./PLAN-IMPLEMENTATION-STEP-BY-STEP.md)** - Plan d'implémentation détaillé étape par étape
- **[PROCHAINES-ETAPES.md](./PROCHAINES-ETAPES.md)** - Prochaines étapes et plan d'action

### 📖 Documentation Technique Coinbase CDP

- **[NOTE-EMBEDDED-WALLETS-COMPLET.md](./NOTE-EMBEDDED-WALLETS-COMPLET.md)** ⭐ - Guide complet sur les Embedded Wallets (WaaS déprécié, OnchainKit, Smart Accounts)
- **[NOTE-SERVER-WALLETS-COMPLET.md](./NOTE-SERVER-WALLETS-COMPLET.md)** ⭐ - Guide complet sur les Server Wallets (MPC, Smart Accounts, EOAs, eth-account compatibility)
- **[NOTE-ONRAMP-OFFRAMP-COMPLET.md](./NOTE-ONRAMP-OFFRAMP-COMPLET.md)** ⭐ - Guide complet sur Coinbase Onramp & Offramp (Buy/Sell Quotes, Session Token, Webhooks)
- **[NOTE-API-REST-COMPLETE.md](./NOTE-API-REST-COMPLETE.md)** ⭐ - Documentation complète de toutes les APIs REST Coinbase CDP (Addresses, Assets, Networks, Smart Contracts, Staking, Trades, Transfers, Wallets, Webhooks, Onramp/Offramp)

### 📝 Frontend Migration & Historique

- **[README-FRONTEND.md](./README-FRONTEND.md)** - Vue d'ensemble
- **[MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md)** - Guide complet
- **[CHECKLIST-MIGRATION.md](./CHECKLIST-MIGRATION.md)** - Suivi progression
- **[EXEMPLES-CODE-FRONTEND.md](./EXEMPLES-CODE-FRONTEND.md)** - Exemples de code
- **[RECAP-WALLET-CONNECT.md](./RECAP-WALLET-CONNECT.md)** - Récapitulatif de la création du composant WalletConnect
- **[C-EST-FAIT.md](./C-EST-FAIT.md)** - Célébration de l'intégration WalletConnect
- **[RECAP-FINAL.md](./RECAP-FINAL.md)** - Récapitulatif final de la session

---

## 🎯 Ordre de développement recommandé

### Jour 1-2 : Services & Hooks
1. ✅ `wallet.service.ts`
2. ✅ `marketplace.service.ts`
3. ✅ `useWallet.ts`
4. ✅ `useMarketplace.ts`
5. ✅ `useFees.ts`

### Jour 3-5 : Composants Wallet
6. ✅ `WalletConnect.tsx` - **FAIT !** ([Documentation](./COMPOSANT-WALLET-CONNECT.md))
7. ✅ `SmartWalletModal.tsx` - **FAIT !** (Remplace WalletBalance + DepositModal)
8. ✅ Intégrer dans le Header - **FAIT !** ([Documentation](./INTEGRATION-HEADER.md))

### Jour 5-8 : Composants Marketplace
9. ✅ `FeePreview.tsx`
10. ✅ `BuyNFTModal.tsx`
11. ✅ `SellNFTModal.tsx`

### Jour 8-10 : Intégration
12. ✅ Intégrer dans Header
13. ✅ Intégrer dans Marketplace
14. ✅ Intégrer dans Profile

---

## 🆘 Problèmes courants

### Backend ne répond pas
```bash
cd cylimit-backend-develop
npm run start:dev
# Vérifier les logs
```

### Erreur CORS
Ajoute dans `main.ts` (backend) :
```typescript
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
});
```

### Wallet ne se crée pas
Vérifie que `COINBASE_WALLET_ID` est dans `.env` du backend

---

## ✅ Checklist Jour 1

- [ ] Variables d'environnement configurées
- [ ] Backend qui tourne (`npm run start:dev`)
- [ ] Structure de dossiers créée
- [ ] `wallet.service.ts` créé et testé
- [ ] `marketplace.service.ts` créé
- [ ] `useWallet.ts` créé et testé
- [ ] Premier test réussi (création wallet)

---

**C'est parti ! 🚀**

Commence par créer `wallet.service.ts` et teste-le avec curl ou Postman avant de passer aux hooks.
