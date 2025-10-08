# 📚 Documentation Frontend - Nouveau Système Wallets

## 🎯 Vue d'ensemble

Ce dossier contient toute la documentation nécessaire pour migrer le frontend CyLimit vers le nouveau système de wallets basé sur Coinbase Smart Accounts.

---

## 📁 Documents disponibles

### 1. [MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md)
**Guide complet de migration**
- Architecture du nouveau système
- Structure des fichiers à créer
- Services API (wallet, marketplace, fees)
- Hooks React (useWallet, useMarketplace, useFees)
- Composants UI (WalletConnect, BuyNFTModal, etc.)
- Plan de migration étape par étape
- Points d'attention et troubleshooting

📖 **À lire en premier** pour comprendre l'architecture globale.

---

### 2. [CHECKLIST-MIGRATION.md](./CHECKLIST-MIGRATION.md)
**Checklist détaillée de migration**
- 8 phases de migration
- Tasks granulaires avec checkboxes
- Estimation de temps (13-14 jours)
- Tests à effectuer
- Métriques de succès
- Troubleshooting

✅ **À utiliser pendant** la migration pour tracker la progression.

---

### 3. [EXEMPLES-CODE-FRONTEND.md](./EXEMPLES-CODE-FRONTEND.md)
**Exemples de code prêts à l'emploi**
- 10 cas d'usage courants avec code complet
- Styles CSS recommandés
- Gestion des erreurs
- Loading states
- Responsive design
- Exemple complet de page Marketplace

💻 **À copier-coller** pendant le développement.

---

## 🚀 Quick Start

### Étape 1 : Lire la documentation
1. Lire [MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md) en entier
2. Parcourir [EXEMPLES-CODE-FRONTEND.md](./EXEMPLES-CODE-FRONTEND.md)
3. Imprimer [CHECKLIST-MIGRATION.md](./CHECKLIST-MIGRATION.md)

### Étape 2 : Setup
```bash
# Ajouter variables d'environnement
echo "NEXT_PUBLIC_API_URL=http://localhost:3002/v1" >> .env.local
echo "NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x28b53123d2C5fFc3aeAc39bd7f05cCDE97b319b3" >> .env.local
echo "NEXT_PUBLIC_NETWORK=base-sepolia" >> .env.local

# Créer la structure de dossiers
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/components/wallet
mkdir -p src/components/marketplace
mkdir -p src/types
```

### Étape 3 : Créer les services
Copier les services depuis [MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md) :
- `src/services/wallet.service.ts`
- `src/services/marketplace.service.ts`

### Étape 4 : Créer les hooks
Copier les hooks depuis [MIGRATION-FRONTEND.md](./MIGRATION-FRONTEND.md) :
- `src/hooks/useWallet.ts`
- `src/hooks/useMarketplace.ts`
- `src/hooks/useFees.ts`

### Étape 5 : Créer les composants
Utiliser les exemples de [EXEMPLES-CODE-FRONTEND.md](./EXEMPLES-CODE-FRONTEND.md) :
- `src/components/wallet/WalletConnect.tsx`
- `src/components/wallet/DepositModal.tsx`
- `src/components/marketplace/BuyNFTModal.tsx`
- etc.

### Étape 6 : Tester
```bash
# Démarrer le backend
cd cylimit-backend-develop
npm run start:dev

# Démarrer le frontend
cd cylimit-frontend-develop
npm run dev

# Tester les endpoints
curl http://localhost:3002/v1/wallet/health
```

---

## 🔗 Liens utiles

### Documentation Backend
- [SYSTEME-WALLETS-COMPLET.md](./SYSTEME-WALLETS-COMPLET.md) - Documentation complète du système
- [PROCHAINES-ETAPES.md](./PROCHAINES-ETAPES.md) - Guide d'implémentation backend
- [GUIDE-DEPLOIEMENT.md](./GUIDE-DEPLOIEMENT.md) - Guide de déploiement

### Documentation externe
- [Coinbase CDP Docs](https://docs.cdp.coinbase.com/)
- [Coinbase Onramp Docs](https://docs.cdp.coinbase.com/onramp/docs/welcome)
- [Smart Accounts Guide](https://docs.cdp.coinbase.com/smart-accounts/docs/welcome)

---

## 📊 Architecture du nouveau système

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   useWallet  │  │useMarketplace│  │   useFees    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │              Services API                           │    │
│  │  (wallet.service.ts, marketplace.service.ts)       │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼──────────────────────────────────┐
│                        BACKEND                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │WalletController│ │MarketplaceCtrl│ │FeeCalculator │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │              Services Layer                         │    │
│  │  (CoinbaseWalletService, MarketplaceService)       │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                   COINBASE CDP API                          │
│              (Smart Accounts, Transfers)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux d'une transaction

```
1. User clique "Acheter NFT"
   ↓
2. Frontend : useMarketplace.purchaseNFT()
   ↓
3. Frontend : Affiche FeePreview (useFees)
   ↓
4. User confirme
   ↓
5. Frontend → Backend : POST /marketplace/purchase
   ↓
6. Backend : Vérifie balance
   ↓
7. Backend : Calcule fees (FeeCalculatorService)
   ↓
8. Backend : Transfert USDC vendeur (CoinbaseWalletService)
   ↓
9. Backend : Transfert fees plateforme
   ↓
10. Backend : [TODO] Transfert NFT
   ↓
11. Backend → Frontend : Résultat transaction
   ↓
12. Frontend : Affiche succès + rafraîchit balance
```

---

## 💡 Différences clés avec l'ancien système

| Aspect | Ancien (MetaMask) | Nouveau (Coinbase) |
|--------|-------------------|-------------------|
| **Connexion** | MetaMask popup | Création automatique |
| **Clés privées** | User les gère | Serveur les gère |
| **Gas fees** | User paie | Sponsorisé (gasless) |
| **Réseau** | Polygon Mumbai | Base Sepolia |
| **Approbations** | 2 transactions | 1 transaction atomique |
| **UX** | Complexe | Simple |
| **Sécurité** | Risque phishing | Plus sécurisé |

---

## ⚠️ Points d'attention

### 1. Migration des users existants
Les users avec des wallets MetaMask devront créer un nouveau Smart Account. Prévois :
- Message d'explication clair
- Guide de migration
- Support pour questions

### 2. Gestion des erreurs
Prévois des messages clairs pour :
- Balance insuffisante → "Déposez des USDC"
- Service indisponible → "Réessayez plus tard"
- NFT déjà vendu → "Ce NFT n'est plus disponible"

### 3. Performance
- Cache les balances (30s)
- Debounce les calculs de fees
- Loading states partout
- Optimistic UI quand possible

### 4. Sécurité
- Valider côté backend
- Ne jamais exposer les clés privées
- Rate limiting
- HTTPS obligatoire en prod

---

## 🧪 Tests recommandés

### Tests unitaires
```bash
# Services
npm test src/services/wallet.service.test.ts
npm test src/services/marketplace.service.test.ts

# Hooks
npm test src/hooks/useWallet.test.ts
npm test src/hooks/useMarketplace.test.ts

# Composants
npm test src/components/wallet/WalletConnect.test.tsx
```

### Tests d'intégration
```bash
# E2E avec Playwright/Cypress
npm run test:e2e
```

### Tests manuels
- [ ] Créer un wallet
- [ ] Déposer 50 USDC via Coinbase Onramp
- [ ] Acheter un NFT avec USDC
- [ ] Acheter un NFT avec Stripe
- [ ] Mettre un NFT en vente
- [ ] Annuler une vente

---

## 📞 Support

### Problèmes backend
```bash
# Vérifier les logs
cd cylimit-backend-develop
npm run start:dev
# Regarder les logs dans le terminal
```

### Problèmes frontend
```bash
# Ouvrir DevTools Console (F12)
# Vérifier les erreurs réseau (onglet Network)
# Vérifier les erreurs React (onglet Console)
```

### Problèmes API
```bash
# Tester les endpoints
curl http://localhost:3002/v1/wallet/health
curl http://localhost:3002/v1/wallet/phase
```

---

## 📈 Métriques à surveiller

### Technique
- Temps de réponse API < 500ms
- Taux de succès transactions > 95%
- Taux d'erreur < 5%
- Uptime > 99.9%

### Business
- Nombre de wallets créés
- Nombre de transactions
- Montant total transféré
- Taux de conversion (vue → achat)
- Taux d'abandon panier

---

## 🎓 Formation de l'équipe

### Développeurs
1. Lire toute la documentation
2. Tester les API avec Postman
3. Créer un wallet de test
4. Faire un achat de test
5. Comprendre le flow complet

### QA
1. Checklist de tests
2. Scénarios edge cases
3. Tests de régression
4. Tests de performance

### Support
1. FAQ pour les users
2. Guide de troubleshooting
3. Procédures d'escalade

---

## 🚀 Roadmap

### Phase 1 : MVP (Semaine 1-2)
- Services API
- Hooks de base
- Composants essentiels
- Tests unitaires

### Phase 2 : Intégration (Semaine 2-3)
- Intégration dans les pages
- Tests d'intégration
- Polish UX/UI

### Phase 3 : Production (Semaine 3-4)
- Tests en staging
- Déploiement production
- Monitoring
- Support users

---

## 📝 Changelog

### Version 1.0.0 (2025-10-06)
- ✅ Documentation complète créée
- ✅ Backend implémenté
- ✅ API REST opérationnelle
- ⏳ Frontend en cours de migration

---

**Bon courage pour la migration ! 🚀**

Si tu as des questions, consulte d'abord la documentation, puis n'hésite pas à demander de l'aide.
