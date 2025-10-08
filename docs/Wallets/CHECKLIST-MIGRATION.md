# ✅ Checklist Migration Frontend

## 📦 Phase 1 : Setup & Services (Jour 1-2)

### Services API
- [ ] Créer `src/services/wallet.service.ts`
  - [ ] `createWallet(userId)`
  - [ ] `getBalance(address)`
  - [ ] `getOnrampLink(address, amount)`
  - [ ] `previewFees(...)`
  - [ ] `getCurrentPhase()`
  - [ ] `healthCheck()`

- [ ] Créer `src/services/marketplace.service.ts`
  - [ ] `purchaseNFT(request)`
  - [ ] `listNFT(request)`
  - [ ] `cancelListing(listingId, address)`
  - [ ] `getListing(listingId)`
  - [ ] `getActiveListings()`

### Types TypeScript
- [ ] Créer `src/types/wallet.types.ts`
- [ ] Créer `src/types/marketplace.types.ts`

### Configuration
- [ ] Ajouter variables d'environnement dans `.env.local`
  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:3002/v1
  NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x28b53123d2C5fFc3aeAc39bd7f05cCDE97b319b3
  NEXT_PUBLIC_NETWORK=base-sepolia
  ```

### Tests API
- [ ] Tester `POST /wallet/create` avec Postman
- [ ] Tester `GET /wallet/:address/balance`
- [ ] Tester `POST /wallet/preview-fees`
- [ ] Tester `POST /marketplace/purchase`

---

## 🎣 Phase 2 : Hooks React (Jour 2-3)

### Hook Wallet
- [ ] Créer `src/hooks/useWallet.ts`
  - [ ] État : `wallet`, `balance`, `loading`, `error`
  - [ ] Fonction : `createWallet()`
  - [ ] Fonction : `refreshBalance()`
  - [ ] Fonction : `getDepositLink(amount)`
  - [ ] Auto-refresh balance (30s)

### Hook Marketplace
- [ ] Créer `src/hooks/useMarketplace.ts`
  - [ ] État : `purchasing`, `listing`, `error`
  - [ ] Fonction : `purchaseNFT(request)`
  - [ ] Fonction : `listNFT(...)`
  - [ ] Gestion erreurs

### Hook Fees
- [ ] Créer `src/hooks/useFees.ts`
  - [ ] État : `fees`, `loading`
  - [ ] Auto-calcul quand params changent
  - [ ] Gestion cache

---

## 🎨 Phase 3 : Composants Wallet (Jour 3-5)

### WalletConnect
- [ ] Créer `src/components/wallet/WalletConnect.tsx`
  - [ ] Bouton "Créer mon wallet" si pas de wallet
  - [ ] Affichage adresse (format court)
  - [ ] Affichage balance USDC
  - [ ] Bouton refresh
  - [ ] Loading states
  - [ ] Gestion erreurs

### WalletBalance
- [ ] Créer `src/components/wallet/WalletBalance.tsx`
  - [ ] Affichage balance USDC
  - [ ] Affichage balance MATIC (si nécessaire)
  - [ ] Icône refresh
  - [ ] Animation loading

### DepositModal
- [ ] Créer `src/components/wallet/DepositModal.tsx`
  - [ ] Input montant USDC
  - [ ] Validation montant > 0
  - [ ] Bouton "Déposer avec Coinbase"
  - [ ] Ouverture Coinbase Onramp (nouvelle fenêtre)
  - [ ] Loading state
  - [ ] Message succès

### Styling
- [ ] Design responsive
- [ ] Dark mode (si applicable)
- [ ] Animations
- [ ] Icônes

---

## 🏪 Phase 4 : Composants Marketplace (Jour 5-8)

### FeePreview
- [ ] Créer `src/components/marketplace/FeePreview.tsx`
  - [ ] Affichage prix NFT
  - [ ] Affichage fees acheteur (si Phase 2)
  - [ ] Affichage fees vendeur
  - [ ] Affichage fees Stripe/Coinbase
  - [ ] Total à payer (gros et visible)
  - [ ] Badge "Phase 1" ou "Phase 2"

### BuyNFTModal
- [ ] Créer `src/components/marketplace/BuyNFTModal.tsx`
  - [ ] Affichage info NFT
  - [ ] Sélection méthode paiement (USDC/Coinbase/Stripe)
  - [ ] Intégration `FeePreview`
  - [ ] Vérification balance
  - [ ] Alert si balance insuffisante
  - [ ] Bouton "Acheter"
  - [ ] Loading pendant achat
  - [ ] Message succès/erreur
  - [ ] Fermeture auto après succès

### SellNFTModal
- [ ] Créer `src/components/marketplace/SellNFTModal.tsx`
  - [ ] Input prix USDC
  - [ ] Validation prix > 0.01
  - [ ] Prévisualisation fees vendeur
  - [ ] Montant net reçu
  - [ ] Bouton "Mettre en vente"
  - [ ] Loading pendant listing
  - [ ] Message succès/erreur

### ListingCard
- [ ] Mettre à jour composant existant
  - [ ] Nouveau bouton "Acheter" → ouvre `BuyNFTModal`
  - [ ] Affichage prix + fees estimées
  - [ ] Badge "Gasless" ou "Sans frais de gas"

---

## 📄 Phase 5 : Intégration Pages (Jour 8-10)

### Page Marketplace
- [ ] Remplacer ancien système MetaMask
- [ ] Intégrer `WalletConnect` dans header
- [ ] Intégrer `BuyNFTModal` sur chaque NFT
- [ ] Filtres (prix, rareté, etc.)
- [ ] Pagination
- [ ] Loading skeletons

### Page Profile
- [ ] Section "Mon Wallet"
  - [ ] Afficher adresse
  - [ ] Afficher balance
  - [ ] Bouton "Déposer des USDC"
  - [ ] Historique transactions (TODO backend)

### Page NFT Details
- [ ] Bouton "Acheter" → `BuyNFTModal`
- [ ] Bouton "Vendre" → `SellNFTModal` (si owner)
- [ ] Affichage fees estimées
- [ ] Historique ventes

### Page Settings
- [ ] Section "Wallet & Paiements"
  - [ ] Afficher wallet address
  - [ ] Copier adresse
  - [ ] QR Code (optionnel)
  - [ ] Lien vers Coinbase Onramp

---

## 🧹 Phase 6 : Nettoyage (Jour 10-11)

### Supprimer ancien code
- [ ] Supprimer composants MetaMask
- [ ] Supprimer hooks Web3
- [ ] Supprimer dépendances inutiles
  - [ ] `ethers` (si plus utilisé)
  - [ ] `@web3-react/core`
  - [ ] `@metamask/sdk`
- [ ] Supprimer anciens services
- [ ] Nettoyer imports

### Mise à jour documentation
- [ ] README.md
- [ ] CHANGELOG.md
- [ ] Commentaires code

---

## 🧪 Phase 7 : Tests (Jour 11-13)

### Tests unitaires
- [ ] Tests services API
- [ ] Tests hooks
- [ ] Tests composants (Jest + React Testing Library)

### Tests d'intégration
- [ ] Scénario : Créer wallet
- [ ] Scénario : Déposer USDC
- [ ] Scénario : Acheter NFT (USDC)
- [ ] Scénario : Acheter NFT (Stripe)
- [ ] Scénario : Vendre NFT
- [ ] Scénario : Annuler vente

### Tests manuels
- [ ] Tester sur Chrome
- [ ] Tester sur Firefox
- [ ] Tester sur Safari
- [ ] Tester sur mobile (iOS)
- [ ] Tester sur mobile (Android)

### Tests edge cases
- [ ] Balance insuffisante
- [ ] Service Coinbase down
- [ ] Erreur réseau
- [ ] NFT déjà vendu
- [ ] Prix négatif
- [ ] Montant trop élevé

---

## 🚀 Phase 8 : Déploiement (Jour 13-14)

### Préparation
- [ ] Vérifier variables d'environnement PROD
- [ ] Tester sur staging
- [ ] Backup base de données
- [ ] Plan de rollback

### Déploiement
- [ ] Déployer backend
- [ ] Déployer frontend
- [ ] Vérifier health checks
- [ ] Tester en production

### Communication
- [ ] Annoncer la migration aux users
- [ ] Guide de migration
- [ ] FAQ
- [ ] Support disponible

### Monitoring
- [ ] Surveiller logs backend
- [ ] Surveiller erreurs frontend (Sentry)
- [ ] Surveiller métriques (transactions, wallets créés)
- [ ] Feedback users

---

## 📊 Métriques de succès

### Technique
- [ ] 0 erreur critique
- [ ] Temps de réponse API < 500ms
- [ ] Taux de succès transactions > 95%
- [ ] Uptime > 99.9%

### Business
- [ ] X wallets créés (semaine 1)
- [ ] X transactions réussies (semaine 1)
- [ ] Taux d'abandon < 20%
- [ ] Satisfaction users > 4/5

---

## 🆘 Troubleshooting

### Problèmes courants

**Wallet ne se crée pas**
- [ ] Vérifier API backend accessible
- [ ] Vérifier credentials Coinbase CDP
- [ ] Vérifier logs backend

**Balance à 0 après dépôt**
- [ ] Attendre confirmation blockchain (1-2 min)
- [ ] Vérifier adresse wallet correcte
- [ ] Vérifier réseau (Base Sepolia)

**Achat échoue**
- [ ] Vérifier balance suffisante
- [ ] Vérifier NFT toujours disponible
- [ ] Vérifier logs backend
- [ ] Vérifier service Coinbase disponible

**Fees incorrectes**
- [ ] Vérifier phase actuelle (Phase 1 ou 2)
- [ ] Vérifier statut Premium user
- [ ] Vérifier méthode paiement

---

## 📞 Support

**Backend issues** : Consulter logs avec `npm run start:dev`
**Frontend issues** : Ouvrir DevTools Console
**API issues** : Tester avec curl/Postman
**Coinbase issues** : Vérifier [Status Page](https://status.coinbase.com/)

---

**Temps estimé total : 13-14 jours**

Bonne chance ! 🚀
