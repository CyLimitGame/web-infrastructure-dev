# 📋 Plan d'Implémentation Step-by-Step - Système Wallets CyLimit

**Date :** 6 octobre 2025  
**Version :** 2.0  
**Timeline :** 8 semaines (Phase 1) + 8 semaines (Phase 2)

---

## 📊 Vue d'Ensemble

### Phase 1 : Nouveau Système Wallets (Semaines 1-8)
- Coinbase Smart Accounts
- 3 options de paiement (USDC, Coinbase, Stripe)
- Fees vendeur uniquement : `max(0.05 USDC, 0.05% prix)`
- Migration users existants

### Phase 2 : Abonnements Premium (Semaines 9-16)
- Lancement plans Premium (Pro, Legend)
- Augmentation fees : `max(0.05 USDC, 5% prix)` acheteur + vendeur
- Premium annule fees CyLimit (pas Stripe/Coinbase)

---

## 🗓️ Phase 1 : Nouveau Système (8 semaines)

### Semaine 1 : Setup & Architecture ✅

**Objectifs :**
- Définir architecture technique
- Créer Smart Contract NFT
- Configurer outils de développement

**Actions :**
- [x] Choisir solution wallet (Coinbase Smart Accounts)
- [x] Créer `CyLimitNFT_v2.sol`
- [x] Installer thirdweb CLI
- [x] Créer documentation complète
- [x] Clarifier système de fees (Phase 1 vs Phase 2)

**Livrables :**
- ✅ Smart Contract prêt
- ✅ Documentation complète
- ✅ Architecture validée

---

### Semaine 2 : Déploiement Smart Contract

**Objectifs :**
- Déployer Smart Contract sur Mumbai testnet
- Configurer comptes Coinbase CDP et Alchemy
- Tester déploiement

**Actions :**
- [ ] Créer compte Coinbase CDP
- [ ] Générer API Keys Coinbase
- [ ] Créer app Alchemy Amoy
- [ ] Configurer `.env` backend
- [ ] Déployer contract via `npx thirdweb deploy`
- [ ] Vérifier sur Amoy PolygonScan
- [ ] Tester mint/transfer basique

**Livrables :**
- ✅ Contract déployé sur Amoy
- ✅ Adresse contract notée
- ✅ `.env` configuré

**Fichiers modifiés :**
```
cylimit-backend-develop/
├── .env (ajout variables)
└── contracts/
    └── CyLimitNFT_v2.sol (déployé)
```

---

### Semaine 3-4 : Backend Services

**Objectifs :**
- Créer services wallet et marketplace
- Implémenter calcul fees Phase 1
- Tester transactions atomiques

#### Semaine 3 : Wallet Service

**Actions :**
- [ ] Installer `@coinbase/coinbase-sdk`
- [ ] Créer `CoinbaseWalletService`
  - `createSmartAccount(userId)`
  - `getBalance(walletAddress)`
  - `transferUSDC(from, to, amount)`
  - `sponsorGas(transaction)`
- [ ] Créer `FeeCalculatorService`
  - `calculateFees(price, method, phase)`
  - `getCurrentPhase()`
  - Support Phase 1 et Phase 2
- [ ] Créer module `WalletModule`
- [ ] Tests unitaires (>80% coverage)

**Livrables :**
- ✅ WalletService fonctionnel
- ✅ FeeCalculatorService avec support 2 phases
- ✅ Tests passants

**Fichiers créés :**
```
src/modules/wallet/
├── wallet.module.ts
├── services/
│   ├── coinbase-wallet.service.ts
│   └── fee-calculator.service.ts
├── dto/
│   ├── create-wallet.dto.ts
│   └── transfer-usdc.dto.ts
└── __tests__/
    ├── coinbase-wallet.service.spec.ts
    └── fee-calculator.service.spec.ts
```

#### Semaine 4 : Marketplace Service

**Actions :**
- [ ] Créer `MarketplaceService`
  - `previewFees(nftId, method)` (utilise FeeCalculatorService)
  - `buyNFT(nftId, userId, method)`
  - `listNFT(nftId, price)`
  - `delistNFT(nftId)`
  - Transactions atomiques USDC + NFT
- [ ] Créer `PaymentService`
  - `createStripePayment(amount, userId)`
  - `generateCoinbaseOnrampLink(amount, walletAddress)`
  - Webhooks Stripe
- [ ] Créer module `MarketplaceModule`
- [ ] Tests unitaires + intégration

**Livrables :**
- ✅ MarketplaceService fonctionnel
- ✅ PaymentService avec 3 méthodes
- ✅ Tests passants

**Fichiers créés :**
```
src/modules/marketplace/
├── marketplace.module.ts
├── services/
│   ├── marketplace.service.ts
│   └── payment.service.ts
├── dto/
│   ├── buy-nft.dto.ts
│   ├── list-nft.dto.ts
│   └── preview-fees.dto.ts
└── __tests__/
    ├── marketplace.service.spec.ts
    └── payment.service.spec.ts
```

---

### Semaine 5 : Frontend

**Objectifs :**
- Créer interfaces utilisateur
- Intégrer 3 options de paiement
- Afficher fees clairement

**Actions :**
- [ ] Créer API clients
  - `src/apis/wallet.ts`
  - `src/apis/marketplace.ts`
- [ ] Créer `WalletPage`
  - Affichage balance USDC
  - Bouton "Déposer" (Coinbase Onramp)
  - Bouton "Retirer"
  - Historique transactions
- [ ] Créer `BuyNFTModal`
  - 3 options de paiement (USDC, Coinbase, Stripe)
  - Preview fees en temps réel
  - Affichage clair "+25% frais Stripe"
  - Encourager Coinbase (+3.5% seulement)
- [ ] Créer `MyCollectionPage`
  - Grid NFTs possédés
  - Bouton "Vendre" par NFT
- [ ] Créer `MarketplacePage`
  - Browse NFTs à vendre
  - Filtres (prix, rareté, etc.)
  - Bouton "Acheter"
- [ ] Tests E2E (Cypress)

**Livrables :**
- ✅ UI complète et fonctionnelle
- ✅ 3 options de paiement intégrées
- ✅ Tests E2E passants

**Fichiers créés :**
```
cylimit-frontend-develop/src/
├── apis/
│   ├── wallet.ts
│   └── marketplace.ts
├── features/
│   ├── wallet/
│   │   ├── pages/
│   │   │   └── WalletPage.tsx
│   │   └── components/
│   │       ├── DepositModal.tsx
│   │       └── WithdrawModal.tsx
│   └── marketplace/
│       ├── pages/
│       │   ├── MarketplacePage.tsx
│       │   └── MyCollectionPage.tsx
│       └── components/
│           ├── BuyNFTModal.tsx
│           ├── ListNFTModal.tsx
│           └── NFTCard.tsx
└── __tests__/
    └── e2e/
        ├── wallet.spec.ts
        └── marketplace.spec.ts
```

---

### Semaine 6 : Migration Base de Données

**Objectifs :**
- Migrer users existants vers Smart Accounts
- Migrer NFTs existants
- Backup complet avant migration

**Actions :**
- [ ] **BACKUP COMPLET DB** (OBLIGATOIRE)
  ```bash
  mongodump --db cylimit_dev --out ./backup/$(date +%Y%m%d)
  ```
- [ ] Créer script migration users
  - Créer Smart Account pour chaque user
  - Sauvegarder `walletAddress`, `smartAccountId`
  - Garder anciennes clés privées (temporaire)
- [ ] Créer script migration NFTs
  - Transférer ownership vers Smart Accounts
  - Vérifier sur blockchain
- [ ] Tester migration sur DB de test
- [ ] Exécuter migration sur DB dev
- [ ] Vérifier intégrité données
- [ ] **NE PAS supprimer anciennes clés** (attendre Phase 1 complète)

**Livrables :**
- ✅ Backup DB complet
- ✅ Users migrés vers Smart Accounts
- ✅ NFTs transférés
- ✅ Intégrité vérifiée

**Fichiers créés :**
```
scripts/
├── backup-db.sh
├── migrate-users-to-smart-accounts.js
├── migrate-nfts.js
└── verify-migration.js
```

**⚠️ RÈGLE ABSOLUE :**
> TOUJOURS faire un backup complet AVANT toute migration destructive.
> JAMAIS lancer de script sans --dry-run validé ET backup confirmé.

---

### Semaine 7 : Tests & Validation

**Objectifs :**
- Tests complets end-to-end
- Validation sécurité
- Performance testing

**Actions :**
- [ ] Tests fonctionnels
  - [ ] Créer compte → Smart Account créé
  - [ ] Déposer USDC via Coinbase Onramp
  - [ ] Acheter NFT avec USDC → Transaction atomique OK
  - [ ] Vérifier NFT dans collection
  - [ ] Lister NFT sur marché
  - [ ] Acheter NFT d'un autre user
  - [ ] Retirer USDC vers wallet externe
  - [ ] Vérifier fees vendeur uniquement (Phase 1)
- [ ] Tests sécurité
  - [ ] Tentative double-spend
  - [ ] Tentative manipulation fees
  - [ ] Tentative vol NFT
- [ ] Tests performance
  - [ ] 100 transactions simultanées
  - [ ] Temps réponse < 2s
- [ ] Tests beta avec 10-20 users réels
- [ ] Monitoring actif (Sentry, logs)

**Livrables :**
- ✅ Tous tests passants
- ✅ Beta validée
- ✅ Monitoring configuré

---

### Semaine 8 : Production & Modification Site Actuel

**Objectifs :**
- Déployer en production
- Modifier site actuel pour fees Phase 1
- Lancement progressif

**Actions :**
- [ ] Déployer Smart Contract Polygon Mainnet
- [ ] Configurer `.env` production
- [ ] Déployer backend production
- [ ] Déployer frontend production
- [ ] **Modifier site actuel** pour fees Phase 1
  - Changer `fees = max(0.05, 0.05%)` des deux côtés
  - Vers `sellerFee = max(0.05, 0.05%)` vendeur only
  - Mettre `buyerFee = 0`
- [ ] Lancement progressif
  - 10% users (jour 1)
  - 50% users (jour 3)
  - 100% users (jour 7)
- [ ] Monitoring actif
- [ ] Support client prêt

**Livrables :**
- ✅ Production déployée
- ✅ Site actuel modifié (fees Phase 1)
- ✅ Lancement progressif réussi
- ✅ Monitoring actif

**Fichiers modifiés :**
```
cylimit-backend-develop/
├── .env (production)
└── src/modules/marketplace/services/
    └── fee-calculator.service.ts (Phase 1 active)

cylimit-frontend-develop/
└── src/features/marketplace/components/
    └── BuyNFTModal.tsx (affichage fees Phase 1)
```

---

## 🗓️ Phase 2 : Abonnements Premium (8 semaines)

### Semaine 9-10 : Backend Premium

**Objectifs :**
- Créer système d'abonnements
- Implémenter logique Premium dans fees

**Actions :**
- [ ] Créer `SubscriptionService`
  - Plans (Free, Pro, Legend)
  - Paiement Stripe récurrent
  - Gestion statut Premium
- [ ] Modifier `FeeCalculatorService`
  - Activer Phase 2 (via `.env`)
  - Vérifier statut Premium user
  - Appliquer fees selon plan
- [ ] Créer webhooks Stripe abonnements
- [ ] Tests unitaires

**Livrables :**
- ✅ SubscriptionService fonctionnel
- ✅ FeeCalculatorService Phase 2 prêt
- ✅ Tests passants

---

### Semaine 11-12 : Frontend Premium

**Objectifs :**
- Créer pages abonnements
- Afficher avantages Premium

**Actions :**
- [ ] Créer `SubscriptionPage`
  - Affichage plans (Free, Pro, Legend)
  - Comparaison avantages
  - Bouton "S'abonner"
- [ ] Modifier `BuyNFTModal`
  - Afficher économies avec Premium
  - CTA "Devenir Premium"
- [ ] Créer `MyAccountPage`
  - Affichage plan actuel
  - Bouton "Changer de plan"
  - Historique paiements
- [ ] Tests E2E

**Livrables :**
- ✅ UI Premium complète
- ✅ Tests E2E passants

---

### Semaine 13-14 : Migration Fees Phase 2

**Objectifs :**
- Activer fees Phase 2
- Communiquer changement aux users

**Actions :**
- [ ] Communication users (email, notification)
  - Expliquer nouveaux fees
  - Présenter plans Premium
  - Période de grâce 2 semaines
- [ ] Modifier `.env` production
  ```bash
  BUYER_FEE_PERCENT=5
  SELLER_FEE_PERCENT=5
  ```
- [ ] Déployer backend/frontend
- [ ] Monitoring actif (taux conversion Premium)

**Livrables :**
- ✅ Fees Phase 2 activés
- ✅ Communication envoyée
- ✅ Monitoring actif

---

### Semaine 15-16 : Optimisation & Support

**Objectifs :**
- Optimiser conversion Premium
- Support client renforcé
- Ajustements selon feedback

**Actions :**
- [ ] Analyser taux conversion Premium
- [ ] A/B testing pages abonnements
- [ ] Ajuster pricing si nécessaire
- [ ] Support client formé
- [ ] Documentation utilisateurs
- [ ] FAQ Premium

**Livrables :**
- ✅ Taux conversion optimisé
- ✅ Support prêt
- ✅ Documentation complète

---

## 📊 Récapitulatif Timeline

| Phase | Semaines | Objectif | Fees |
|-------|----------|----------|------|
| **Phase 1** | 1-8 | Nouveau système wallets | Vendeur only : `max(0.05 USDC, 0.05%)` |
| **Phase 2** | 9-16 | Abonnements Premium | Acheteur + Vendeur : `max(0.05 USDC, 5%)` (sauf Premium) |

---

## 🎯 Checklist Complète

### Smart Contracts
- [x] CyLimitNFT_v2.sol créé
- [ ] Déployé Amoy testnet
- [ ] Testé mint/transfer
- [ ] Déployé Polygon mainnet
- [ ] Vérifié sur PolygonScan

### Backend Phase 1
- [ ] CoinbaseWalletService
- [ ] FeeCalculatorService (Phase 1 + 2)
- [ ] MarketplaceService
- [ ] PaymentService (3 méthodes)
- [ ] Webhooks Stripe/Alchemy
- [ ] Tests unitaires (>80%)
- [ ] Tests intégration

### Backend Phase 2
- [ ] SubscriptionService
- [ ] FeeCalculatorService Phase 2 activé
- [ ] Webhooks Stripe abonnements
- [ ] Tests unitaires

### Frontend Phase 1
- [ ] WalletPage
- [ ] BuyNFTModal (3 options)
- [ ] MyCollectionPage
- [ ] MarketplacePage
- [ ] Tests E2E

### Frontend Phase 2
- [ ] SubscriptionPage
- [ ] MyAccountPage
- [ ] BuyNFTModal (économies Premium)
- [ ] Tests E2E

### Database
- [ ] Backup complet
- [ ] Migration users Smart Accounts
- [ ] Migration NFTs
- [ ] Vérification intégrité
- [ ] Schema Subscription (Phase 2)

### DevOps
- [ ] Monitoring Sentry
- [ ] Logs Datadog
- [ ] Alertes transactions échouées
- [ ] Backup DB quotidien
- [ ] CI/CD GitHub Actions

### Documentation
- [x] SYSTEME-WALLETS-COMPLET.md
- [x] PROCHAINES-ETAPES.md
- [x] PLAN-IMPLEMENTATION-STEP-BY-STEP.md
- [ ] Documentation API
- [ ] Documentation utilisateurs
- [ ] FAQ Premium

---

## 🚨 Points d'Attention

### Sécurité
- ⚠️ TOUJOURS backup DB avant migration
- ⚠️ JAMAIS skip --dry-run sur scripts migration
- ⚠️ Garder anciennes clés privées jusqu'à validation complète
- ⚠️ Tester transactions atomiques en profondeur

### Performance
- ⚠️ Monitoring coûts gas Polygon
- ⚠️ Optimiser batch operations
- ⚠️ Cache balance USDC (refresh toutes les 30s)

### UX
- ⚠️ Afficher clairement fees Stripe (+25%)
- ⚠️ Encourager Coinbase Onramp (+3.5% seulement)
- ⚠️ Expliquer Premium clairement (n'annule pas Stripe/Coinbase)
- ⚠️ Période de grâce 2 semaines avant Phase 2

---

## 📞 Contact

**Maintenu par :** Valentin  
**Dernière mise à jour :** 6 octobre 2025  
**Version :** 2.0

---

**🎉 Plan complet et prêt pour exécution !**
