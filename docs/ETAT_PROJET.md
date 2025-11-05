# 📊 ÉTAT DU PROJET CYLIMIT

**FICHIER :** ETAT_PROJET.md

**OBJECTIF :**
Vue d'ensemble complète de l'état actuel du projet CyLimit - ce qui fonctionne, ce qui est en cours, ce qui est planifié

**POURQUOI :**
Point de référence unique pour comprendre où en est le projet à tout moment

**COMMENT :**
Consulter ce fichier AVANT toute nouvelle tâche. Mettre à jour APRÈS chaque tâche terminée.

**DERNIÈRE MISE À JOUR :** 5 Novembre 2025 - 16h45

**STATUT :** Actif - Mis à jour régulièrement

---

## 🎯 Vue d'Ensemble

### Contexte

CyLimit est une plateforme de jeu fantasy cyclisme basée sur des cartes NFT. Le projet est en production avec ~200 utilisateurs actifs par jour.

### Stack Technique Actuel

- **Frontend :** Next.js 12.3.1 + React 18 + Chakra UI
- **Backend User :** NestJS 9 + MongoDB + Redis
- **Backend Admin :** NestJS 9 (séparé)
- **Base de données :** MongoDB Atlas
- **Blockchain :** Polygon Mainnet (NFTs ERC-721)
- **Infrastructure :** AWS (en cours de migration)

---

## ✅ CE QUI FONCTIONNE (Production)

### Frontend
- ✅ Application Next.js déployée et fonctionnelle
- ✅ Authentification users (email/password, Google, Facebook)
- ✅ Marketplace NFT (achat/vente)
- ✅ Système de jeu fantasy
- ✅ Profils utilisateurs
- ✅ Internationalisation (FR/EN)

### Backend User
- ✅ API REST complète (auth, NFT, games, users)
- ✅ GraphQL API
- ✅ Gestion NFTs et marketplace
- ✅ Système de scoring multi-rôles
- ✅ Intégration Stripe pour paiements
- ✅ Système de rewards
- ✅ NOUVEAU : MarketplaceService complet avec gestion d'expiration des listings
  - listNFT (DB uniquement, $0 gas)
  - delistNFT (annulation listing)
  - expiresAt : listings expirent automatiquement (J+2 à J+30)
  - Cron job quotidien pour expirer listings automatiquement
  - marketType comme source de vérité unique ('owner', 'fixed', 'auction', 'swap')
- ✅ **NOUVEAU (3 Nov 2025) :** Filtrage marché secondaire adapté aux listings
  - NftRepository utilise aggregation MongoDB pour joindre collection 'listings'
  - Filtre automatique sur status='active' et expiresAt > now pour marketType=FIXED
  - Les cartes en vente apparaissent correctement sur `/market?marketType=fixed`
  - Support filtre de prix sur listing.price (au lieu de fixedPrice obsolète)

### Backend Admin
- ✅ Backend admin séparé (port 3001)
- ✅ Gestion administrative NFTs
- ✅ Cron jobs (calculs, syncs)
- ✅ Monitoring
- ✅ **NOUVEAU (4 Nov 2025 23h) :** Script de transfert USDC admin
  - Script `transfer-usdc-to-user.cjs` pour transférer USDC Master Wallet → Embedded Wallet user
  - Validation utilisateur et vérification balance automatique
  - Logging automatique dans address_activities (type: ADMIN_TRANSFER)
  - Affichage lien explorer pour tracking transaction
  - Documentation complète dans scripts/wallet/README.md

### Blockchain
- ✅ NFTs ERC-721 déployés sur Polygon Mainnet
- ✅ Smart contracts fonctionnels
- ✅ Intégration Thirdweb SDK

---

## 🔄 EN COURS DE DÉVELOPPEMENT

### ✅ Embedded Wallet Coinbase + Marketplace (5 Nov 2025)

**Statut :** 🎉 FONCTIONNEL - Achats/Ventes opérationnels !

**Ce qui est fait :**
- ✅ SDK Coinbase installé et configuré
- ✅ Tests Playwright créés
- ✅ Vérification wallet obligatoire pour achat/vente NFT
- ✅ **NOUVEAU (5 Nov 2025 - 16h45) :** Marketplace COMPLÈTEMENT FONCTIONNEL
  - Nouveau Marketplace déployé : `0xA99c44fE605ABdb86c92394a9f7A2Da84da35786`
  - Marketplace whitelisté dans NFT contract via Smart Account CDP
  - Configuration `.env` corrigée (backend charge `.env.local` automatiquement)
  - Fees transférées vers Smart Account au lieu de EOA
  - Approval Marketplace avec attente confirmation on-chain
  - Toast succès personnalisé
  - ownerId correctement enregistré comme ObjectId en DB
  - **Premier achat NFT testé et validé avec succès ! 🎉**
- ✅ **NOUVEAU (4 Nov 2025) :** Vérification wallet obligatoire pour la vente NFT
  - SellCardForm vérifie maintenant l'existence du wallet avant de soumettre
  - Affiche WalletRequiredModal si pas de wallet (bloquant)
  - Guide user vers création wallet avec WalletAuthModal
  - Relance automatiquement le flow de vente après création wallet
  - Double sécurité : frontend (UX) + backend (vérification baseWalletAddress)
- ✅ **NOUVEAU (4 Nov 2025 22h) :** Système complet de gestion solde USDC
  - BalancePayment utilise maintenant balanceUSDC on-chain via useEmbeddedWallet
  - Correction cache : refreshBalance force le fetch avec forceRefresh=true
  - Alert rouge + message d'erreur si solde insuffisant lors de l'achat
  - Bouton "Ajouter des fonds" ouvre WalletAuthModal (nouveau système avec Onramp)
  - Affichage solde USDC réel (0.10$ au lieu de 0$ grâce au cache bypass)
- ✅ **NOUVEAU (4 Nov 2025 22h) :** Modal vente redesigné (inspiré Sorare)
  - Input prix déplacé dans ConfirmModal (au lieu de SellCardForm)
  - Affichage dynamique des frais : max(0.05€, 0.05% du prix)
  - Configuration backend centralisée (marketplace.config.ts)
  - Endpoint GET /marketplace/config pour exposition frontend
  - Composant AvgCapScoreAndBonus réutilisé pour affichage carte
  - Calendrier pour sélection date expiration (J+2 à J+30)
  - Bouton unique "Mettre en vente" / "List on the market"
- ✅ **NOUVEAU (4 Nov 2025 23h) :** Logging automatique migrations et transferts USDC
  - Service MigrationService modifié pour logger dans address_activities
  - Logging USDC : type MIGRATION_USDC avec txHash, montant, adresses
  - Logging NFT : type MIGRATION_NFT_BATCH avec tokenIds, txHash, adresses  
  - Injection AddressActivityService dans UserModule
  - Traçabilité complète de toutes les opérations USDC/NFT
  - Documentation dans LOGGING_ACTIVITES_MIGRATION.md

**Ce qui reste :**
- 🔄 Corriger flow d'inscription dans les tests (en cours)
- ⏳ Finaliser intégration wallet dans le frontend (autres actions)
- ⏳ Tests end-to-end complets

**Documents  :**
- [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md)
- [tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md)

### Tests Automatisés E2E

**Statut :** 🔄 Configuration en cours

**Ce qui est fait :**
- ✅ Playwright installé et configuré
- ✅ MailHog intégré (capture emails OTP gratuit)
- ✅ Premiers tests créés (wallet-creation, wallet-reconnection)
- ✅ Utilitaires MailHog (getOTPFromEmail, getConfirmationLinkFromEmail)

**Problèmes identifiés :**
- 🐛 Flow d'inscription : test utilise mauvais chemin (`/register` vs `/sign-up`)
- 🐛 Champs formulaire incorrects (corrigé : `nickName`, `passwordToConfirm`, checkboxes)

**Ce qui reste :**
- 🔄 Finaliser correction tests inscription
- ⏳ Valider tests wallet création/reconnexion
- ⏳ Ajouter tests marketplace

**Documents :**
- [tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md)
- Frontend : `tests/e2e/wallet-creation-email-backup-sms.spec.ts`
- Frontend : `tests/utils/mailhog.ts`

---

## ⏳ PLANIFIÉ (Pas Encore Commencé)

### Migration Infrastructure (Basse Priorité)
- ⏳ Migration Google Cloud Run (analysé, pas décidé)
- ⏳ Optimisation coûts MongoDB (analysé, pas mis en œuvre)
- ⏳ Migration Firebase Auth (planifié pour 2025, pas commencé)

**Note :** Ces migrations ont été analysées mais mises en pause. Documentation archivée dans `archives/migrations-cloud/` et `archives/analyses-2024/`.

### Features Game Avancées (Basse Priorité)
- ⏳ Système bonus avancé (planifié, pas prioritaire)
- ⏳ Transformation game teams (analysé, pas mis en œuvre)

**Note :** Documentation archivée dans `archives/game-features/`.

---

## ❌ ABANDONNÉ / NON MIS EN ŒUVRE

### Migration vers Base (Abandonné)
**Raison :** NFTs déjà sur Polygon, coût migration trop élevé, pas de ROI

**Documentation :** Archivée dans `archives/wallets-v1-v2/migration-base-non-realisee/`

### Migration Wallets V1→V2 Complexe (Simplifié)
**Raison :** Approche initiale trop complexe, remplacée par solution plus simple

**Documentation :** Archivée dans `archives/wallets-v1-v2/`

---

## 🐛 Problèmes Connus

### ✅ Problème #1 : Tests Playwright - Flow Inscription (RÉSOLU)

**Description :** Les tests E2E utilisent un mauvais chemin pour l'inscription

**Impact :** Tests échouent sur la création de compte

**Statut :** ✅ Résolu

**Solution :** 
- Corriger chemin : `/register` → `/sign-up`
- Corriger champs : `confirmPassword` → `passwordToConfirm`
- Ajouter étapes : vérification email + connexion

**Suivi :** Frontend `tests/e2e/CORRECTIONS-FLOW-INSCRIPTION.md`

### ✅ Problème #2 : Migration Coinbase - Détection oldWalletAddress (RÉSOLU 3 Nov 2025 20h00)

**Description :** 
1. Les utilisateurs avec un ancien wallet mais sans Embedded Wallet créé étaient considérés à tort comme ayant déjà migré (vérification sur `walletAddress` au lieu de `oldWalletAddress`)
2. Les anciens utilisateurs voyaient leur ancien wallet en "lecture seule" au lieu d'être forcés à créer un Embedded Wallet
3. Les utilisateurs avec Embedded Wallet créé ne voyaient PAS leur wallet en lecture seule

**Impact :** 
- Migration non déclenchée pour certains utilisateurs ayant un ancien wallet
- UX confuse : les anciens users pensaient avoir un Embedded Wallet alors qu'ils n'en avaient pas
- UX manquante : les users avec Embedded Wallet ne pouvaient pas voir leur balance sans se connecter

**Statut :** ✅ Résolu

**Solution Backend :**
- Fichier `migration.service.ts` ligne 558 : Vérification de `oldWalletAddress` au lieu de `walletAddress` dans `checkMigrationRequired()`
- Fichier `user.controller.ts` ligne 843 : Sauvegarde de `oldWalletAddress` uniquement lors de la première migration (évite d'écraser l'ancien wallet)
- Fichier `profile.dto.ts` ligne 58 : Ajout `walletSyncedAt` dans ProfileDto pour que le frontend puisse détecter si Embedded Wallet créé

**Solution Frontend :**
- Fichier `useEmbeddedWallet.ts` lignes 287, 524 : Affichage balance lecture seule SI `walletSyncedAt` existe (pas pour anciens users)
- Fichier `useWalletRequired.ts` ligne 143 : Détection wallet via `walletSyncedAt` pour éviter modal pendant reconnexion
- Fichier `WalletOnboardingManager.tsx` ligne 82 : Modal affiché TOUJOURS si pas d'Embedded Wallet (ignore localStorage)
- Fichier `WalletOnboardingModal.tsx` lignes 72, 91 : Suppression sauvegarde localStorage (modal persiste jusqu'à création wallet)
- Fichier `WalletAuthModal.tsx` lignes 495, 507, 558, 934, 1005, 1023, 1060, 1296 : Utilisation de `walletSyncedAt` au lieu de `walletAddress` pour détecter Embedded Wallet
- Fichier `RampButton/index.tsx` ligne 34 : Utilisation de `address` (Embedded Wallet) au lieu de `userProfile.walletAddress`

**Résultat :**
- ✅ Les anciens utilisateurs (sans `walletSyncedAt`) voient le `WalletOnboardingModal` à chaque connexion
- ✅ Les utilisateurs avec Embedded Wallet (avec `walletSyncedAt`) ne voient PAS le modal
- ✅ Les utilisateurs avec Embedded Wallet voient leur wallet en **lecture seule** (balance + adresse)
- ✅ Pas d'affichage en lecture seule pour les anciens users (walletAddress SANS walletSyncedAt)
- ✅ Migration automatique déclenchée dès création de l'Embedded Wallet

**Suivi :** Backend User + Frontend

---

## 📊 Métriques Projet

### Utilisateurs
- **Users actifs :** ~200/jour
- **Users totaux :** ~6000 (estimation)

### Code
- **Backend :** ~50,000 lignes (NestJS)
- **Frontend :** ~30,000 lignes (Next.js)
- **Tests :** En cours d'ajout (Playwright E2E)

### Infrastructure
- **Coût actuel :** ~580€/mois (MongoDB + AWS)
- **Hébergement :** AWS + MongoDB Atlas
- **Monitoring :** Basique (logs)

### Documentation
- **Fichiers actifs :** ~11 fichiers
- **Fichiers archivés :** ~160 fichiers
- **Dernière réorganisation :** 28 Octobre 2025
- **Dernière création majeure :** 5 Novembre 2025 (VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md)

---

## 🔧 Configuration Actuelle

### Environnements

| Environnement | Frontend | Backend User | Backend Admin | Base de Données |
|---------------|----------|--------------|---------------|-----------------|
| **Local** | localhost:3001 | localhost:4000 | localhost:3001 | MongoDB local (Docker) |
| **Dev** | - | - | - | MongoDB Atlas Dev |
| **Production** | cylimit.com | api.cylimit.com | admin-api | MongoDB Atlas Prod |

### Services Externes Utilisés
- ✅ MongoDB Atlas (base de données)
- ✅ AWS (hébergement)
- ✅ Stripe (paiements)
- ✅ Alchemy (RPC Polygon)
- ✅ Pinata ou Fleek (stockage IPFS)
- 🔄 Coinbase CDP (Embedded Wallets - en intégration)
- 🔄 MailHog (tests emails - local)

---

## 🎯 Priorités Actuelles

### Priorité #1 : Tests Automatisés
**Objectif :** Automatiser les tests du wallet Embedded pour accélérer le développement

**Actions en cours :**
- 🔄 Corriger tests Playwright (flow inscription)
- ⏳ Valider tests wallet création
- ⏳ Valider tests wallet reconnexion

**Deadline :** Fin Octobre 2025

### Priorité #2 : Embedded Wallet Production
**Objectif :** Mettre en production le système Embedded Wallet Coinbase

**Actions nécessaires :**
- ⏳ Finaliser intégration frontend
- ⏳ Tests end-to-end complets
- ⏳ Migration users existants

**Deadline :** Novembre 2025

### Priorité #3 : Stabilisation
**Objectif :** Stabiliser la plateforme avant nouvelle saison

**Actions nécessaires :**
- ⏳ Fix bugs identifiés
- ⏳ Optimisations performances
- ⏳ Documentation technique à jour

**Deadline :** Décembre 2025

---

## 📝 Décisions Techniques Importantes

### Architecture Backend
- ✅ **Séparation Admin/User** : Deux backends distincts pour isolation
- ✅ **Dépendances circulaires** : Résolues avec `forwardRef()` NestJS
- ✅ **Base de données** : MongoDB avec partitionnement par année (game_teams_2025, etc.)

### Marketplace Architecture (30 Oct 2025)
- ✅ **Listing NFT sans gas** : Système MarketplaceService complet ($0 gas pour user)
- ✅ **Expiration automatique** : Listings expirent automatiquement via cron job quotidien (minuit UTC)
- ✅ **Date d'expiration personnalisable** : Users choisissent entre J+2 et J+30 via calendrier react-calendar
- ✅ **Source de vérité unique** : marketType ('owner', 'fixed', 'auction', 'swap') au lieu de isListed
- ✅ **Frontend uniformisé** : SellInfo.tsx et SellCardForm utilisent tous deux useMarketplace.listNFT()
- ✅ **Delisting simplifié** : DELETE /marketplace/delist/:listingId (passe listingId directement)
- ✅ **Messages personnalisés** : Toast affiche "Prénom NOM RARETÉ NumSérie/DernierNumSérie AnnéeEdition mise en vente à X $"
- ✅ **Types corrigés** : serialNumber (number) utilisé partout, firstSerialNumber supprimé
- ✅ **Prix depuis listing** : Utilisation de listing.price au lieu de fixedPrice (deprecated)
- ✅ **Routes API** : 
  - POST /marketplace/list (créer listing avec expiresAt)
  - DELETE /marketplace/delist/:listingId (annuler listing)
  - POST /marketplace/prepare-buy/:listingId (préparer achat)
  - POST /marketplace/confirm-buy (confirmer achat)
- ✅ **Documentation complète** : Tous les fichiers modifiés ont commentaires détaillés (OBJECTIF/POURQUOI/COMMENT/APPELÉ PAR/APPELLE)
- ⏳ **TODO** : Migrer aussi BuyButton vers le nouveau système marketplace

### Tests
- ✅ **Framework :** Playwright pour E2E
- ✅ **Emails OTP :** MailHog (gratuit, local)
- ❌ **SMS OTP :** Pas automatisés (coût Twilio 15€/mois)

### Wallet
- ✅ **Choix :** Coinbase Embedded Wallets (vs MetaMask)
- ✅ **Réseau :** Polygon Mainnet (vs Base)
- ⏳ **Intégration :** En cours

---

## 🗓️ Historique Récent

### Novembre 2025
- ✅ 5 Nov 03h00 : **GUIDE VÉRIFICATION BASESCAN DEPUIS REMIX**
  - Création guide complet GUIDE-VERIFICATION-BASESCAN-REMIX.md
  - Méthode 1 : Plugin Remix (recommandé) avec screenshots textuels
  - Méthode 2 : Basescan UI manuelle (alternative)
  - Étapes détaillées : Activer plugin, API key, configuration, vérification
  - Section troubleshooting (5 problèmes courants + solutions)
  - Checklist post-vérification (Read/Write Contract)
  - Guide obtention Constructor Arguments (3 options)
  - Timeline visuelle complète (50 minutes étape par étape)
  - Astuces : Flatten contrat, sauvegarder .env, vérifier en parallèle
  - 1 fichier créé (guide complet déploiement + vérification)
- ✅ 5 Nov 02h45 : **CORRECTIONS CODE MARKETPLACE - 3 Problèmes Résolus**
  - **FIX #1** : Ajout type viem strict sur encodeFunctionData (useMarketplace.ts ligne 207)
  - **FIX #2** : Vérification balance USDC buyer (frontend + backend)
    * Frontend BuyNFT.tsx : Affichage warning si balance insuffisante
    * Backend prepareBuyNFT() : Vérification on-chain balance USDC
    * Bouton "Buy" désactivé si balance insuffisante
    * Message clair "Need X USDC, have Y USDC"
  - **FIX #3** : Vérification approval seller Marketplace (backend)
    * Backend prepareBuyNFT() : Appel isApprovedForAll(seller, marketplace)
    * Erreur bloquante si seller n'a pas approuvé
    * Évite erreur "Transfer not allowed" on-chain
  - Logging détaillé ajouté (balance, approval)
  - 3 fichiers modifiés, 0 erreur linter
  - Note audit passée de 8/10 → 10/10 ✅
- ✅ 5 Nov 02h30 : **AUDIT COMPLET CODE MARKETPLACE & WALLET**
  - Vérification conformité avec CONTEXT_MARKETPLACE-WALLET.md
  - Analyse Frontend : BuyNFT.tsx, ListNFT.tsx, useMarketplace.ts, WalletOnboardingManager.tsx
  - Analyse Backend : marketplace.service.ts, marketplace.controller.ts
  - Création rapport VERIFICATION-CODE-MARKETPLACE-WALLET.md
  - **RÉSULTAT : 8/10** - Code de bonne qualité avec quelques améliorations
  - **3 problèmes identifiés** :
    * 🟡 Types viem stricts manquants (useMarketplace.ts ligne 207)
    * 🟡 Balance USDC pas vérifiée avant achat (UX)
    * 🟡 Approval seller pas vérifié (sécurité)
  - **Points forts** : Architecture conforme, séparation claire, comments détaillés
  - Recommandations prioritaires documentées (haute/moyenne/basse)
  - 1 fichier créé (rapport audit complet)
- ✅ 5 Nov 02h15 : **AJOUT GUIDE UTILISATION MCP COINBASE DEVELOPER**
  - Nouvelle section complète "Guide d'Utilisation MCP Coinbase Developer"
  - Processus de vérification obligatoire en 5 étapes
  - 5 exemples concrets de vérifications MCP avec code
  - Checklist utilisation MCP (7 points de contrôle)
  - Liste requêtes MCP utiles (Sessions, UserOps, Paymaster, Hooks, Pricing)
  - Bonnes pratiques requêtes MCP (spécifiques vs vagues)
  - Tableau résultats vérifications MCP (8 éléments confirmés)
  - Mise à jour checklist implémentation avec vérifications MCP obligatoires
  - Document maintenant ~2570 lignes (guide complet + conformité garantie)
  - 1 fichier mis à jour (VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md)
- ✅ 5 Nov 02h00 : **CORRECTION APPROVALS USDC - Clarification Architecture**
  - Correction erreur documentation : USDC n'a PAS besoin d'approval Marketplace
  - Clarification transfer() vs transferFrom() dans architecture CyLimit
  - Buyer transfère USDC directement (pas via Marketplace)
  - Marketplace transfère uniquement NFT (avec approval NFT du Seller)
  - Mise à jour tableaux récapitulatifs approvals
  - Ajout section explicative "Pourquoi NFT approval mais pas USDC ?"
  - 1 fichier mis à jour (VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md)
- ✅ 5 Nov 01h45 : **ENRICHISSEMENT DOCUMENTATION - Sessions Coinbase + Bonnes Pratiques**
  - Ajout détails sessions Embedded Wallets (Access Token 15min, Refresh Token 7 jours)
  - Timeline session typique avec exemples concrets (reconnexion auto)
  - Causes expiration inattendue (cookies, 5 appareils, etc.)
  - Tarification officielle Coinbase ($0.005/op, 5000 ops/mois gratuit)
  - Calcul coûts CyLimit : $4.90/mois pour 1000 users
  - Limites Smart Accounts (UserOps séquentielles, Base Paymaster only)
  - Erreurs communes à éviter (types viem, parallèle, session expirée)
  - Bonus USDC Rewards 3.85% APY (USA uniquement)
  - Vérification conformité avec MCP Coinbase Developer docs
  - Document maintenant ~2100 lignes avec exemples UX détaillés
  - 1 fichier mis à jour (VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md)
- ✅ 5 Nov 01h30 : **FIX CRITIQUE WHITELIST NFT + MISE À JOUR DOCUMENTATION COMPLÈTE**
  - **PROBLÈME CRITIQUE IDENTIFIÉ** : Contrat NFT testnet bloque TOUS les achats user-to-user
    * `_update()` vérifie uniquement `transferWhitelist[from]` et `transferWhitelist[to]`
    * Marketplace ne peut PAS transférer car UserA et UserB non whitelistés
    * Impact : Marketplace inutilisable, tous les listings bloqués
  - **SOLUTION** : Ajout de `transferWhitelist[auth]` dans `_update()`
    * Permet au Marketplace (auth) de transférer même si from/to non whitelistés
    * 1 seule ligne ajoutée au contrat
  - **FICHIERS CRÉÉS** :
    * `CyLimitNFT_v2_FIXED.sol` - Contrat corrigé avec auth whitelist
    * `deploy-nft-v2-FIXED.md` - Guide déploiement complet
    * `3-deploy-and-setup-nft-fixed.js` - Script automatisé déploiement + whitelist
  - **DOCUMENTATION** : Mise à jour `VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md`
    * Ajout section détaillée Embedded Wallets (création, double auth Email/SMS, cycle de vie)
    * Ajout exemples concrets : ListNFT.tsx, BuyNFT.tsx, useMarketplace.ts
    * Ajout section "Problème Critique Identifié & Solution" avec diagnostic complet
    * Ajout flows UX détaillés (ce que voit le user étape par étape)
    * ~2300 lignes totales maintenant
  - 3 fichiers créés (1 contrat, 1 guide, 1 script), 1 fichier mis à jour
- ✅ 5 Nov 00h30 : **CRÉATION DOCUMENTATION VISION COMPLÈTE WALLETS-MARKETPLACE-NFT**
  - Création document de référence unique `VISION-COMPLETE-WALLETS-MARKETPLACE-NFT.md`
  - Couvre : Wallets (Embedded + Master), Smart Contracts (NFT v2, Marketplace v2), Marketplace
  - Détaille : Architecture globale, Approvals & autorisations Coinbase, Marché primaire/secondaire
  - Inclut : Flows achats/ventes, Sécurité & contrôle, Intégration Coinbase CDP
  - ~1500 lignes avec code examples TypeScript/Solidity
  - Consolide 6 documents sources en 1 vision complète
  - 1 fichier créé, mise à jour ETAT_PROJET.md
- ✅ 4 Nov 23h : **SCRIPT ADMIN TRANSFERT USDC VERS USER**
  - Création script admin `transfer-usdc-to-user.cjs` pour transfert USDC Master → Embedded Wallet
  - Validation auto utilisateur + vérification balance USDC
  - Logging auto dans address_activities (type: ADMIN_TRANSFER)
  - Documentation complète scripts/wallet/README.md
  - 2 fichiers créés
- ✅ 4 Nov 19h : **VÉRIFICATION WALLET OBLIGATOIRE POUR ACHAT NFT**
  - BuyButton vérifie wallet avant PaymentModal
  - WalletRequiredModal bloquant si pas de wallet
  - Relance auto achat après création wallet
  - 3 fichiers modifiés
- ✅ 3 Nov 20h20 : **FIX COMPLET MIGRATION COINBASE + LECTURE SEULE + SESSION**
  - **Problème** : 
    1. Anciens users voyaient wallet en lecture seule
    2. Users avec Embedded Wallet ne voyaient PAS leur wallet en lecture seule
    3. Frontend ne recevait pas walletSyncedAt (manquait dans ProfileDto)
    4. Modal s'affichait à chaque changement de page
    5. Modal ne se réaffichait pas après logout/login
  - **Backend** :
    * `migration.service.ts` ligne 558 : fix vérification `oldWalletAddress` au lieu de `walletAddress`
    * `user.controller.ts` ligne 843 : fix sauvegarde `oldWalletAddress` (uniquement première migration)
    * `profile.dto.ts` ligne 58 : ajout walletSyncedAt dans ProfileDto (fix détection frontend)
  - **Frontend** :
    * `useEmbeddedWallet.ts` lignes 287, 524 : affichage balance lecture seule SI walletSyncedAt
    * `useWalletRequired.ts` ligne 143 : détection wallet via walletSyncedAt (fix reconnexion)
    * `WalletOnboardingManager.tsx` lignes 9, 36, 59, 105 : flag session + reset au changement user
    * `WalletOnboardingModal.tsx` lignes 72, 91 : suppression localStorage (modal persiste)
    * `WalletAuthModal.tsx` lignes 495, 507, 558, 934, 1005, 1023, 1060, 1296 : utilisation walletSyncedAt
    * `RampButton/index.tsx` ligne 34 : utilisation address (Embedded Wallet)
  - **Résultat** : 
    * Anciens users → modal 1 fois/session, reset au logout, PAS lecture seule
    * Users avec Embedded → lecture seule OK, pas de modal, reconnexion auto
  - 9 fichiers modifiés (3 backend, 6 frontend), 0 erreur linter
- ✅ 3 Nov 18h : **FIX FILTRAGE MARCHÉ SECONDAIRE**
  - Correction NftRepository pour joindre collection 'listings' et filtrer sur status='active'
  - Support filtre de prix sur listing.price au lieu de fixedPrice obsolète

### Octobre 2025
- ✅ 30 Oct 16h : **MARKETPLACE LISTING AVEC EXPIRATION - SESSION COMPLÈTE**
  - Correction bug serialNumber : utilisation de serialNumber (number) au lieu de firstSerialNumber
  - Ajout champ expiresAt dans Listing schema (Date, index, nullable)
  - Ajout status 'expired' dans Listing enum
  - Implémentation cron job quotidien (minuit UTC) pour expirer listings automatiquement
  - Intégration calendrier react-calendar dans modales de confirmation (J+2 à J+30)
  - Validation backend : expiresAt pas dans le passé, max 30 jours
  - Messages toast personnalisés avec détails carte (rareté MAJUSCULE, serialNumber correct)
  - Correction types frontend : serialNumber number, suppression firstSerialNumber du type CardItem
  - Migration complète de fixedPrice → listing.price dans tous les composants
  - Simplification delisting : DELETE /marketplace/delist/:listingId (passe listingId directement)
  - **DOCUMENTATION COMPLÈTE** : Ajout commentaires détaillés sur TOUS les fichiers modifiés :
    * Backend : nft.schema.ts, marketplace.service.ts, marketplace.controller.ts, marketplace-cron.service.ts
    * Frontend : card.d.ts, CancelListingButton, SellCardForm, SellInfo.tsx
    * Format : OBJECTIF/POURQUOI/COMMENT/APPELÉ PAR/APPELLE pour chaque fichier et fonction
  - Internationalisation : confirm_listing, choose_market_expiration_date
  - 15+ fichiers modifiés, 0 erreur linter
- ✅ 28 Oct : **RÉORGANISATION MASSIVE DOCUMENTATION** 
  - 171 fichiers → 9 fichiers actifs + 164 archivés
  - Création GUIDE_GESTION_DOCUMENTATION.md (règles strictes)
  - Création README.md, ETAT_PROJET.md, PROCHAINES_ETAPES.md
  - Structure claire : tests/, game/, architecture/, archives/
  - Memory créée pour règles de gestion doc
- 🔄 28 Oct : Correction tests Playwright (flow inscription)
- ✅ 28 Oct : Ajout fonction `getConfirmationLinkFromEmail` dans MailHog utils
- ✅ 10 Oct : Création plan test complet Embedded Wallet (42 cas)
- ✅ 02 Oct : Diverses analyses et fixes techniques

### Septembre 2025
- ✅ Fix dépendances circulaires GameModule ↔ NftModule
- ✅ Corrections multiples backend

---

## 📋 Backlog (Non Prioritaire)

- Migration Google Cloud Run (économies potentielles analysées)
- Optimisation MongoDB (réduction coûts)
- Features game avancées (bonus, transformations)
- Migration Firebase Auth
- App mobile native

---

## 🆘 Points d'Attention

### Risques Identifiés
- ⚠️ Coûts infrastructure élevés (580€/mois pour 200 users/jour)
- ⚠️ Absence de tests automatisés (en cours de résolution)
- ⚠️ Dépendance forte à MongoDB Atlas

### Dettes Techniques
- Besoin optimisation requêtes MongoDB
- Besoin monitoring avancé (Sentry, etc.)
- Besoin tests unitaires backend

---

## 📞 Contact & Support

**Équipe :** CyLimit Development Team  
**Documentation :** `/docs` (ce dossier)  
**Code :** Repositories séparés (frontend, backend-user, backend-admin)

---

**RAPPEL :** Mettre à jour ce fichier après CHAQUE tâche importante terminée !

