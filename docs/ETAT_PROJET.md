# 📊 ÉTAT DU PROJET CYLIMIT

**FICHIER :** ETAT_PROJET.md

**OBJECTIF :**
Vue d'ensemble complète de l'état actuel du projet CyLimit - ce qui fonctionne, ce qui est en cours, ce qui est planifié

**POURQUOI :**
Point de référence unique pour comprendre où en est le projet à tout moment

**COMMENT :**
Consulter ce fichier AVANT toute nouvelle tâche. Mettre à jour APRÈS chaque tâche terminée.

**DERNIÈRE MISE À JOUR :** 19 Novembre 2025 - 11h00

**STATUT :** Actif - Mis à jour régulièrement

---

## 🛡️ SÉCURITÉ MIGRATION & REWARDS NFT

### Approval Marketplace Obligatoire

**Date ajout :** 19 Novembre 2025

**Problématique identifiée :**
Si les NFTs sont transférés vers un Embedded Wallet qui n'a **pas approuvé le Marketplace**, et que la migration/reward échoue, les NFTs sont **bloqués définitivement** (impossibles à récupérer).

**Solution implémentée :**

#### 1️⃣ Migration Automatique NFTs
- ✅ Backend vérifie `isApprovedForAll(userWallet, marketplace)` **AVANT** migration
- ✅ Si pas approuvé → Migration ABORTED (erreur claire)
- ✅ Frontend affiche modal "Approve Marketplace" **avant** sync wallet
- ✅ Migration ne lance QUE si approval confirmé on-chain

#### 2️⃣ Rewards NFT
- ✅ Backend vérifie approval avant d'envoyer reward NFT
- ✅ Si pas approuvé → Modal frontend demande approval
- ✅ Reward envoyé QUE après confirmation approval

#### 3️⃣ Flow Sécurisé

```
User crée Embedded Wallet
    ↓
Frontend détecte besoin migration/reward
    ↓
Vérifie isApprovedForAll(userWallet, marketplace)
    ↓
Pas approuvé ? → Modal "Approve Marketplace"
    ↓
User signe setApprovalForAll(marketplace, true)
    ↓
Confirmation on-chain ✅
    ↓
Backend lance migration/reward (NFTs récupérables)
```

**Fichiers modifiés :**
- `migration.service.ts` : Vérification approval ligne 953-999
- `WalletContext.tsx` : Fix cache `syncedAddresses` ligne 256-260
- `useMarketplace.ts` : Fonction `approveMarketplace()` réutilisable

**Impact sécurité :**
- ✅ **Zéro risque** de perte NFT en cas d'échec migration
- ✅ **Marketplace peut toujours récupérer** les NFTs si problème
- ✅ **User protégé** contre blocage définitif

---

## 🎯 VUE D'ENSEMBLE

### Concept

**CyLimit** est une plateforme de **jeu fantasy cyclisme** basée sur des **cartes NFT** où les utilisateurs :
- Collectionnent des cartes de coureurs cyclistes (NFTs)
- Créent des équipes pour des courses réelles
- Gagnent des points basés sur les performances réelles
- Remportent des récompenses en USDC, XP et NFTs

### Métriques Clés

- **Utilisateurs actifs :** ~200/jour
- **Utilisateurs totaux :** ~6,000
- **Games actifs/mois :** ~30-40 (Grands Tours, Monuments, Classiques)
- **Équipes créées/mois :** ~1,000-1,500
- **Taux participation :** ~60%
- **USDC distribué/mois :** ~500-800 USDC en récompenses

---

## 🛠️ STACK TECHNIQUE

### Frontend
- **Framework :** Next.js 12.3.1 (React 18.2.0)
- **UI Library :** Chakra UI 2.2.1
- **State Management :** Redux Toolkit 1.8.0
- **API Client :** Axios 0.26.0 + React Query
- **Blockchain SDK :** Coinbase CDP Hooks 0.0.51
- **Internationalisation :** next-i18next
- **Tests E2E :** Playwright

### Backend User (Port 4000)
- **Framework :** NestJS 9.1.4
- **Base de données :** MongoDB 6.6.5 (Mongoose)
- **Cache :** Redis (via @liaoliaots/nestjs-redis 9.0.3)
- **Auth :** Passport JWT + bcrypt
- **API :** REST + GraphQL (Apollo)
- **Email :** Nodemailer (SMTP)
- **Jobs :** Bull Queue

### Backend Admin (Port 3001)
- **Framework :** NestJS 9.1.4 (séparé du User Backend)
- **Base de données :** MongoDB (même instance)
- **Blockchain SDK :** Coinbase CDP SDK 1.38.4
- **Cron Jobs :** @nestjs/schedule
- **Rôle :** Calculs scores, sync ProCyclingStats, opérations admin, donner les rewards, créer les games, mettre en vente les packs et cartes

### Blockchain
- **Réseau Principal :** Base Mainnet (ChainID 8453)
- **Réseau Test :** Base Sepolia (ChainID 84532)
- **Anciens NFTs :** Polygon Mainnet (en migration vers Base)
- **Nouveaux NFTs :** Base (ERC-721)
- **Marketplace :** Base (contrat custom)
- **USDC :** Base (natif - Circle)
- **Wallets Users :** Coinbase Embedded Wallets (Smart Accounts ERC-4337)
- **Wallet Admin :** Coinbase CDP Server Wallet v2
- **Gas Sponsorship :** CDP Paymaster (Base)

### Infrastructure
- **Hébergement :** AWS (🔄 migration vers Google Cloud Run en cours - configuration terminée)
- **Storage Images NFT :** 
  - ✅ AWS S3 (`cylimit-public` - bucket existant, Europe eu-west-3)
  - 🔄 Pinata IPFS (migration en cours pour décentralisation)
  - 🔄 Google Cloud Storage (migration en cours pour performance)
- **Base de Données :** MongoDB Atlas (production)
- **CDN :** Direct S3 (pas CloudFront configuré actuellement)

### Services Externes
- **ProCyclingStats :** Données courses et coureurs (API partenaire)
- **Coinbase CDP :** Wallets + Gas sponsorship
- **Stripe :** Paiements fiat (CB)
- **Google/Facebook OAuth :** Social login

### Contrats Déployés

**Base Sepolia (Testnet - Développement) :**
- NFT Contract : `0x8e78d54097FDDEc48a959c015f5b49E2A97B779A`
- Marketplace : `0xA99c44fE605ABdb86c92394a9f7A2Da84da35786`
- USDC : `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Master Smart Account : `0x9f682058A2Bdc8Fb5CE5269B414fEd9e85a6D896`

**Polygon Mainnet (Anciens NFTs - En Migration) :**
- Old NFT Contract : `0x28b53123d2C5fFc3aeAc39bd7f05cCDE97b319b3`
- Old Master Wallet : `0x7958981c5B01D225CFDD718E4DA14Ac429199c86`

**Base Mainnet (Production - À Déployer) :**
- NFT Contract : ⏳ À déployer
- Marketplace : ⏳ À déployer
- USDC : `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (natif Base)

---

## ✅ FONCTIONNALITÉS ACTUELLES

### 🔐 1. AUTHENTIFICATION & COMPTE

**Statut :** ✅ Fonctionnel en production

**Ce qui fonctionne :**
- ✅ Inscription email/password avec vérification email (OTP)
- ✅ Connexion email/password (JWT, sessions 30 jours)
- ✅ Social login (Google OAuth, Facebook OAuth)
- ✅ Reset password par email
- ✅ Gestion profil utilisateur
- ✅ Admin auth séparé (rôles ADMIN, SUPER_ADMIN)

**Détails techniques :**
- Auth custom JWT + Passport.js
- Tokens stockés localStorage (`TOKEN`)
- Vérification email obligatoire
- **Magic Link** : Lien de vérification envoyé par email (code OTP intégré dans URL, expiration 30min)
- Voir [CONTEXT_AUTH.md](./context/CONTEXT_AUTH.md)

**Prochaine évolution :**
- ⏳ Migration Firebase Auth (OTP SMS, 2FA mobile)

---

### 💳 2. EMBEDDED WALLET COINBASE

**Statut :** 🎉 Fonctionnel - Achats/Ventes opérationnels !

**Ce qui fonctionne :**
- ✅ Création automatique Embedded Wallet (Email ou SMS)
- ✅ Smart Account (ERC-4337) pour chaque utilisateur
- ✅ Balance USDC visible en lecture seule
- ✅ Double authentification (Email + SMS backup)
- ✅ Reconnexion automatique (sessions 7 jours)
- ✅ Gas sponsorisé ($0 pour utilisateurs)
- ✅ Batch transactions (USDC + NFT en 1 signature)
- ✅ Migration automatique anciens wallets → Embedded Wallets
- ✅ **NOUVEAU (6 Nov 2025) :** WalletContext centralisé (-75% appels API)

**Détails techniques :**
- Coinbase CDP Hooks 0.0.51
- Smart Accounts sur Base Sepolia/Mainnet
- CDP Paymaster pour gas sponsorship
- **Documentation Coinbase :** Utiliser `mcp_Coinbase_Developer_SearchCoinbaseDeveloper` pour vérifier APIs/limites
- Voir [CONTEXT_MARKETPLACE-WALLET.md](./context/CONTEXT_MARKETPLACE-WALLET.md)

**Ce qui reste :**
- ⏳ Tests E2E complets (Playwright)
- ⏳ Déploiement production Base Mainnet

---

### 🏪 3. MARKETPLACE NFT

**Statut :** ✅ Fonctionnel (Testnet) - Buy Offers testés avec succès !

#### 3.1 Marché Primaire (CyLimit → Users)

**Ce qui fonctionne :**
- ✅ Achat packs avec carte bancaire (Stripe)
- ✅ Achat packs avec USDC (Embedded Wallet)
- ✅ Batch transaction (USDC + NFT atomique)

**Ce qui reste :**
- ⏳ Nouveau système packs payants/Essence
- ⏳ Welcome Pack offert inscription
- ⏳ Packs offerts avant MR/MT

#### 3.2 Marché Secondaire (Users ↔ Users)

**Ce qui fonctionne :**
- ✅ Lister NFT à prix fixe ($0 gas - DB uniquement)
- ✅ Acheter NFT listé (batch USDC + NFT, gas sponsorisé)
- ✅ Expiration automatique listings (J+2 à J+30)
- ✅ Frais marketplace : max(0.05€, 0.05% du prix) - vendeur uniquement, acheteur 0€
- ✅ Approval Marketplace une seule fois
- ✅ Vérification wallet obligatoire avant achat/vente
- ✅ Affichage balance USDC on-chain
- ✅ Modal vente (style Sorare)
- ✅ **Buy Offers 1-to-1 (9 Nov 2025)** - Architecture v5 atomique
  - Escrow USDC vérifié on-chain
  - Finalisation atomique (USDC + NFT en une transaction)
  - Target verrouillé on-chain (sécurité maximale)
  - MongoDB schema optimisé (ObjectId, txHashEscrow)

**Détails techniques :**
- MarketplaceService complet (backend)
- Cron job quotidien (expiration listings)
- Marketplace whitelisté dans NFT contract
- Fees transférées vers Smart Account CyLimit
- Smart Contract v5 avec `finalizeOffer()` atomique
- Voir [CONTEXT_MARKETPLACE-WALLET.md](./context/CONTEXT_MARKETPLACE-WALLET.md)

**Ce qui reste :**
- ⏳ Swaps NFT ↔ NFT
- ⏳ Collection offers (offres publiques)
- ⏳ Enchères avec auto-bid

---

### 🎮 4. JEU FANTASY CYCLISME

**Statut :** ✅ Fonctionnel en production

#### 4.1 Système de Jeu

**Ce qui fonctionne :**
- ✅ Système multi-rôles unique (6 rôles par coureur)
- ✅ 2 modes de jeu (CAP budget, GLOBAL expert)
- ✅ 4 divisions par mode (League 1-4)
- ✅ Création/modification équipes
- ✅ Capitaine avec bonus x2
- ✅ Validation règles (raretés, budget, ownership)
- ✅ Calcul automatique scores (17 types de points)
- ✅ Classements par division
- ✅ Récompenses (USDC, XP, NFTs)
- ✅ Système achievements/quests

**Détails techniques :**
- GameRankingPointService (calcul scores multi-rôles)
- RankingFormulaService (17 formules de points)
- BonusCalculationService (capitaine, division, etc.)
- Collections partitionnées par année (game_teams_2025)
- Voir [CONTEXT_GAME.md](./context/CONTEXT_GAME.md)

#### 4.2 Types de Courses Supportées

**Ce qui fonctionne :**
- ✅ Grands Tours (Tour de France, Giro, Vuelta)
- ✅ Monuments (Paris-Roubaix, Flandres, etc.)
- ✅ Courses par étapes (Paris-Nice, Dauphiné, etc.)
- ✅ Classiques d'un jour
- ✅ Synchronisation ProCyclingStats (cron quotidien)
- ✅ Résultats en temps réel
- ✅ Start lists automatiques

**Prochaines évolutions :**
- 🔴 Revoir UX/UI création équipe (style Sorare)
- 🔴 Affichage game par game avec différents modes
- 🔴 Modes de jeu spéciaux (sprint, montagne, etc.)

---

### 💎 5. SYSTÈME XP & RÉCOMPENSES

**Statut :** ✅ Fonctionnel (évolutions prévues)

**Ce qui fonctionne :**
- ✅ Système XP (level up)
- ✅ Achievements/Quests
- ✅ Récompenses USDC (top 3 divisions)
- ✅ Récompenses NFTs
- ✅ Système de niveau utilisateur

**Prochaines évolutions :**
- 🔴 Supprimer niveau utilisateur
- 🔴 Nouveau système : XP → Essence (monnaie jeu)
- 🔴 Essence White et système de coffre
- 🔴 Coffre pour stocker/débloquer XP (coût XP)
- 🔴 Achat cartes White avec Essence (régulation prix)

---

### 👥 6. SYSTÈME D'AFFILIATION

**Statut :** ⚠️ À vérifier

**Ce qui existe :**
- Code affiliation dans le système
- Tracking refInvitationCode

**À faire :**
- 🔴 Revoir système affiliés
- 🔴 Vérifier que ça fonctionne bien
- 🔴 Cf. retours Luc (MP Valentin)

---

### 📱 7. APPLICATION MOBILE

**Statut :** ⏳ Planifié

**Prochaines features :**
- 🔴 Copier UX création d'équipe desktop
- 🔴 Notifications push (course commence, résultats, classement)
- 🔴 Marketplace mobile
- 🔴 Gestion wallet mobile

---

## 🔧 OUTILS ADMIN

### Backend Admin

**Ce qui fonctionne :**
- ✅ Backend séparé (port 3001)
- ✅ Auth admin (rôles ADMIN, SUPER_ADMIN)
- ✅ Cron jobs automatiques :
  - Sync ProCyclingStats (courses, coureurs, résultats)
  - Calcul scores équipes
  - Expiration listings marketplace
  - Distribution récompenses
- ✅ Scripts admin (transfert USDC, migration NFTs, etc.)
- ✅ Logging automatique (address_activities)

**Scripts disponibles :**
- `transfer-usdc-to-user.cjs` : Transfert USDC Master → User
- `1-migrate-images-dual-storage.cjs` : Migration images AWS → Pinata + GCS
- `2-rebuild-metadata-dual-storage.cjs` : Rebuild metadata NFTs
- Voir `admin-backend/scripts/`

---

## 🚀 EN DÉVELOPPEMENT

### 🔄 1. Migration Google Cloud Run

**Statut :** Configuration terminée, prêt pour déploiement

**Objectif :**
Migrer l'infrastructure de AWS vers Google Cloud Run pour réduire les coûts de ~200-270€/mois

**Ce qui est fait :**
- ✅ Analyse infrastructure AWS (ECS, Redis, logs, coûts)
- ✅ Dockerfiles optimisés multi-stage (Node 20, -60% taille)
- ✅ Scripts déploiement automatisés (staging + production)
- ✅ Configuration Cloud Scheduler (cron jobs)
- ✅ Templates environnement (.env.cloudrun.staging)
- ✅ Guide migration complet (100+ pages)
- ✅ Script quickstart interactif

**Ce qui reste :**
- ⏳ Créer projet Google Cloud (manuel)
- ⏳ Créer compte Upstash Redis gratuit
- ⏳ Configurer Secret Manager (variables sensibles)
- ⏳ Déployer staging et tester
- ⏳ Déployer production + DNS

**Économies attendues :**
- AWS actuel : ~240-320€/mois
- Cloud Run : ~35-50€/mois
- **Économies : ~200-270€/mois** (70% de réduction)

**Documents :**
- [GUIDE_MIGRATION_GOOGLE_CLOUD_RUN.md](./migrations-cloud/GUIDE_MIGRATION_GOOGLE_CLOUD_RUN.md)
- Scripts : `deploy-staging-user.sh`, `deploy-staging-admin.sh`, `setup-cloud-scheduler-staging.sh`

---

### 🔄 2. Tests Automatisés E2E (Playwright)

**Statut :** En cours de finalisation

**Ce qui est fait :**
- ✅ Playwright installé et configuré
- ✅ MailHog intégré (emails OTP gratuit)
- ✅ Tests créés (wallet-creation, wallet-reconnection)
- ✅ Utilitaires MailHog (getOTPFromEmail, getConfirmationLinkFromEmail)

**Ce qui reste :**
- 🔄 Corriger flow d'inscription (chemin `/sign-up`, champs corrects)
- ⏳ Valider tests wallet création/reconnexion
- ⏳ Tests marketplace complets

**Documents :**
- [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md)
- [tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md)

---

### 🔄 3. Migration Images (AWS S3 → Dual Storage)

**Statut :** En cours

**Objectif :**
- Migrer de AWS S3 → Pinata IPFS + Google Cloud Storage
- Décentralisation (IPFS)
- Performance (CDN Google gratuit)
- Redondance maximale

**Ce qui est fait :**
- ✅ Script migration créé (`1-migrate-images-dual-storage.cjs`)
- ✅ Script rebuild metadata créé (`2-rebuild-metadata-dual-storage.cjs`)

**Ce qui reste :**
- ⏳ Exécuter migration sur tous les NFTs
- ⏳ Valider URLs Pinata/Google fonctionnelles
- ⏳ Mettre à jour frontend (switch URLs)

---

## ⏳ PLANIFIÉ (Roadmap)

### Priorité #1 : Migration Infrastructure

#### Google Cloud Run ✅ CONFIGURATION TERMINÉE
- ✅ Dockerfiles optimisés (multi-stage, Node 20)
- ✅ Scripts déploiement automatisés
- ✅ Guide migration complet (10 étapes)
- ✅ Script quickstart interactif
- **Économies attendues :** ~200-270€/mois
- **Timing :** Prêt à déployer (2-3 jours staging + 1 jour production)
- **Documents :** [GUIDE_MIGRATION_GOOGLE_CLOUD_RUN.md](./migrations-cloud/GUIDE_MIGRATION_GOOGLE_CLOUD_RUN.md)

#### Firebase Auth
- ⏳ Migrer Custom JWT → Firebase Auth
- **Bénéfices :** OTP SMS natif, 2FA mobile, biométrie
- **Timing :** Après migration Google Cloud Run
- Voir [CONTEXT_AUTH.md](./context/CONTEXT_AUTH.md)

---

### Priorité #2 : Nouvelles Features Game

#### 🔴 Système Packs & Essence
- Packs payants avec prix évolutif
- Packs achetables avec Essence
- Nouveau pack chaque semaine
- Nouveau pack 48h avant MR/MT (Monument/Tour)
- Essence White et Welcome Pack
- Pack offert à chaque MR/MT

#### 🔴 Suppression Bonus Obsolètes
- ❌ Supprimer bonus carte dernière saison
- ❌ Supprimer bonus premier détenteur
- ✅ Garder bonus capitaine
- ✅ Garder bonus division

#### 🔴 UX/UI Amélioration
- Revoir création d'équipe (style Sorare)
- Affichage plus simple et intuitif
- Drag & drop amélioré

#### 🔴 Système de Prêt
- UX/UI pour prêter cartes entre users
- Conditions et durées de prêt

#### 🔴 Modes de Jeu Multiples
- Revoir affichage games
- Game par game avec différents modes
- Modes spéciaux (sprint, montagne, classiques)

#### 🔴 Système XP/Essence Revu
- ❌ Supprimer niveau user
- ✅ XP → Essence (monnaie du jeu)
- ✅ Système coffre (stocker XP)
- ✅ Coût XP pour débloquer (gestion frustration)
- ✅ Achat White avec Essence (régulation prix)

Voir [CONTEXT_GAME.md](./context/CONTEXT_GAME.md) pour détails système actuel

---

### Priorité #3 : Marketplace Avancé

**Features à implémenter :**
- ⏳ Tests complets achats/reventes
- ⏳ Offres 1-to-1 (buy offers)
- ⏳ Swaps NFT ↔ NFT
- ⏳ Collection offers publiques
- ⏳ Enchères avec auto-bid

Voir [CONTEXT_MARKETPLACE-WALLET.md](./context/CONTEXT_MARKETPLACE-WALLET.md)

---

### Priorité #4 : Application Mobile

**Features planifiées :**
- ⏳ Copier UX création d'équipe
- ⏳ Notifications push (courses, résultats, classements)
- ⏳ Marketplace mobile
- ⏳ Wallet mobile (biométrie)

---

## 🐛 PROBLÈMES CONNUS

### ✅ RÉSOLUS

#### Problème #1 : Tests Playwright - Flow Inscription
**Description :** Tests utilisent mauvais chemin `/register` au lieu de `/sign-up`  
**Statut :** ✅ Résolu (corrections identifiées)  
**Fichiers :** Frontend `tests/e2e/`

#### Problème #2 : Migration Coinbase - Détection oldWalletAddress
**Description :** Anciens users voyaient wallet lecture seule incorrectement  
**Statut :** ✅ Résolu (3 Nov 2025)  
**Fichiers :** `migration.service.ts`, `user.controller.ts`, `useEmbeddedWallet.ts`

#### Problème #3 : Appels API multiples Wallet
**Description :** 4-5 fetches balance au refresh page  
**Statut :** ✅ Résolu (6 Nov 2025) - WalletContext centralisé  
**Fichiers :** `WalletContext.tsx`, `useEmbeddedWallet.ts`, `_app.tsx`  
**Résultat :** -75% appels API

---

### ⚠️ EN COURS

Aucun problème bloquant actuellement.

---

## 📊 MÉTRIQUES TECHNIQUES

### Code
- **Backend User :** ~50,000 lignes (NestJS)
- **Backend Admin :** ~45,000 lignes (NestJS)
- **Frontend :** ~30,000 lignes (Next.js)
- **Tests E2E :** En cours d'ajout (Playwright)

### Infrastructure
- **Coût actuel :** ~580€/mois
  - MongoDB Atlas : ~350€/mois
  - AWS (hébergement + S3) : ~200€/mois
  - Autres services : ~30€/mois
- **Coût Coinbase CDP :** ~5-10€/mois (Embedded Wallets + gas sponsorship)
- **Économies potentielles (Google Cloud Run) :** ~300-400€/mois

### Documentation
- **Fichiers actifs :** 15 fichiers
- **Contextes disponibles :** 3 (AUTH, GAME, MARKETPLACE-WALLET)
- **Fichiers archivés :** ~160 fichiers

---

## 📚 DOCUMENTATION DISPONIBLE

### Contextes Techniques (À Charger Avant Modifications)

| Contexte | Fichier | Lignes | Tokens | Coût |
|----------|---------|--------|--------|------|
| **Auth** | [CONTEXT_AUTH.md](./context/CONTEXT_AUTH.md) | 683 | ~8,540 | ~$0.025 |
| **Game** | [CONTEXT_GAME.md](./context/CONTEXT_GAME.md) | 938 | ~11,700 | ~$0.035 |
| **Marketplace & Wallets** | [CONTEXT_MARKETPLACE-WALLET.md](./context/CONTEXT_MARKETPLACE-WALLET.md) | 2688 | ~33,600 | ~$0.101 |

**Total si chargement des 3 contextes :** ~53,840 tokens, ~$0.161

### Guides & Plans

- [PROCHAINES_ETAPES.md](./PROCHAINES_ETAPES.md) - Roadmap détaillée
- [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md) - 42 cas de test
- [tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md) - Tests E2E

### Règles

- [rules/analyse-du-prompt.mdc](../rules/analyse-du-prompt.mdc) - Process analyse + chargement contexte
- [GUIDE_GESTION_DOCUMENTATION.md](./GUIDE_GESTION_DOCUMENTATION.md) - Règles gestion docs (archivé)

---

## 🎯 DÉCISIONS TECHNIQUES IMPORTANTES

### Architecture
- ✅ **Backends séparés** (User + Admin) pour isolation et sécurité
- ✅ **Base sur Base blockchain** (au lieu de Polygon) pour coûts gas réduits
- ✅ **Embedded Wallets** (au lieu de MetaMask) pour UX simplifiée
- ✅ **Marketplace DB-first** (listings $0 gas) pour économies
- ✅ **Multi-rôles scoring** (unique vs autres fantasy games)

### Sécurité
- ✅ JWT tokens (30 jours)
- ✅ Vérification email obligatoire
- ✅ Whitelist NFT contract (transferts contrôlés)
- ✅ Vérifications ownership (DB + Blockchain)
- ✅ Gas sponsorisé via CDP Paymaster (limite budget)

### Évolutivité
- ✅ Collections MongoDB partitionnées par année
- ✅ Redis pour cache
- ✅ Bull Queue pour jobs asynchrones
- ✅ Cron jobs pour calculs lourds (admin backend)

---

## 🔄 MIGRATIONS EN COURS / STATUT

### NFTs : Polygon Mainnet (Production Actuelle)
**Statut :** ✅ En production sur Polygon  
**Contrat :** `0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F` (NFT v1)  
**NFTs mintés :** ~25,000-30,000 cartes  
**Propriétaires :** Master Wallet + quelques user wallets (anciens)

**Migration Polygon → Base :**
- ❌ **NON réalisée** - Coût trop élevé (~$10k gas Polygon)
- ⏳ **Dual-chain temporaire** : Anciens NFTs restent sur Polygon, nouveaux sur Base
- 📋 **Plan futur** : Bridge utilisateurs Polygon → Base (volontaire)
- 📚 **Documentation :** `archives/wallets-v1-v2/migration-base-non-realisee/`

### Wallets : Migration vers Embedded Wallets Coinbase
**Statut :** 🔄 Migration active et automatique  
**Ancien système :** Wallets custodial (privateKey en DB)  
**Nouveau système :** Embedded Wallets Coinbase (non-custodial, Smart Accounts)

**Processus de migration complet :**

**PHASE 1 - Préparation (Admin) :**
1. **Remint NFTs Polygon → Base v2** (admin backend)
   - Tous les NFTs v1 (Polygon) remintés sur Base v2
   - Owner temporaire : Master Wallet (Base)
   - En DB : ownerId reste le propriétaire original
   - ~25,000-30,000 NFTs remintés

**PHASE 2 - Migration Utilisateur (Automatique) :**
1. User créé avant Nov 2025 → A un `oldWalletAddress` (Polygon)
2. User se connecte → Création automatique Embedded Wallet (Base)
3. Backend détecte `oldWalletAddress` → Déclenche migration
4. Migration automatique :
   - **USDC :** Master Wallet (Base) → Embedded Wallet (Base)
   - **NFTs v2 :** Master Wallet (Base) → Embedded Wallet (Base) en **BATCH**
     - Utilise fonction `batchTransfer()` du contrat
     - Batch de 50 NFTs max par transaction
     - Économie : -87% coûts, -90% temps
5. User reçoit tous ses actifs sur son Embedded Wallet

**Sécurité migration :**
- ✅ Ownership on-chain vérifié avant transfert
- ✅ Validation adresse destinataire (doit être Embedded Wallet CyLimit)
- ✅ Private key Master Wallet dans AWS Nitro Enclave TEE
- ✅ Logging automatique dans address_activities
- ✅ Retry logic avec exponential backoff
- ✅ Rate limiting (3s entre batches)

**Codes migration :**
- ✅ `migration.service.ts` : 
  - `transferUSDC()` : Migration USDC
  - `transferNFTsV2()` : Migration NFTs en batch
  - `checkMigrationRequired()` : Vérifie oldWalletAddress
  - `migrateUserAssets()` : Orchestration complète
- ✅ Logging automatique dans address_activities

**Résultat :** User reçoit TOUS ses actifs (USDC + NFTs) automatiquement sur son Embedded Wallet Base.

---

## 🔗 CONTEXTES DISPONIBLES

Pour toute modification sur ces sujets, **charger le contexte approprié AVANT** :

1. **Authentification, Login, Signup, OAuth, Reset Password**
   → [CONTEXT_AUTH.md](./context/CONTEXT_AUTH.md) (~5.6k tokens)

2. **Jeu Fantasy, Équipes, Scoring, Courses, ProCyclingStats**
   → [CONTEXT_GAME.md](./context/CONTEXT_GAME.md) (~9.4k tokens)

3. **Marketplace, Wallets, Achats, Ventes, USDC, Smart Contracts**
   → [CONTEXT_MARKETPLACE-WALLET.md](./context/CONTEXT_MARKETPLACE-WALLET.md) (~32k tokens)

---

## 📞 CONTACT & SUPPORT

**Équipe :** CyLimit Development Team  
**Documentation :** `/cylimit-infrastructure/docs/`  
**Repositories :**
- `cylimit-frontend-develop` (User Frontend)
- `cylimit-backend-develop` (User Backend)
- `cylimit-admin-backend` (Admin Backend)
- `cylimit-admin-frontend` (Admin Frontend)
- `cylimit-infrastructure` (Docs, scripts, config)

---

## 📝 MODIFICATIONS RÉCENTES

### Novembre 2025

- ✅ **19 Nov 11h00** : Correctifs critiques migration NFTs + sécurité
  - 🔴 **Bug Critique** : `batchTransfer()` bloquait migrations (address(0) pas whitelisté)
  - ✅ **Solution** : Remplacé `_transfer()` par `transferFrom()` dans contrat NFT
  - ✅ **Migration Auto** : Fix retry infini (cache frontend + migratedAt backend)
  - ✅ **Sécurité** : Approval Marketplace obligatoire AVANT migration/rewards
  - ✅ **Prévention perte NFTs** : Vérification on-chain + modal approval frontend
  - Fichiers : `CyLimitNFT_v2_181125.sol`, `migration.service.ts`, `WalletContext.tsx`

- ✅ **9 Nov 23h00** : Configuration migration Google Cloud Run terminée
  - Analyse complète infrastructure AWS (ECS, Redis, logs, coûts ~240-320€/mois)
  - Dockerfiles optimisés multi-stage (Node 20, alpine, -60% taille)
  - Scripts déploiement automatisés (staging + production)
  - Configuration Cloud Scheduler (4 cron jobs)
  - Guide migration complet (10 étapes détaillées, 100+ pages)
  - Script quickstart interactif avec couleurs et validations
  - Templates environnement (.env.cloudrun.staging.example)
  - Économies estimées : ~200-270€/mois (70% réduction)
  - Fichiers créés :
    - `cylimit-backend-develop/Dockerfile.cloudrun`
    - `cylimit-backend-develop/deploy-staging-user.sh`
    - `cylimit-admin-backend/Dockerfile.cloudrun`
    - `cylimit-admin-backend/deploy-staging-admin.sh`
    - `cylimit-admin-backend/setup-cloud-scheduler-staging.sh`
    - `cylimit-infrastructure/docs/migrations-cloud/GUIDE_MIGRATION_GOOGLE_CLOUD_RUN.md`
    - `cylimit-infrastructure/docs/migrations-cloud/quickstart-migration.sh`

- ✅ **9 Nov 16h00** : Tests Buy Offers validés avec succès
  - Smart Contract v5 avec `finalizeOffer()` atomique déployé
  - Flow complet Step 1-6 testé (escrow, acceptation, finalisation)
  - MongoDB schema corrigé (initiatorId/targetId en ObjectId, txHashEscrow ajouté)
  - Vérification escrow on-chain avant finalisation implémentée
  - Résolution erreurs TypeScript "Type instantiation excessively deep"
  - Fichiers : CyLimitMarketplace_v5_SecureOffer.sol, offer.schema.ts, offer.service.ts, coinbase.service.ts, internal.controller.ts

- ✅ **6 Nov 12h00** : Refonte ETAT_PROJET.md
  - Structure basée sur expérience utilisateur/admin
  - Stack technique corrigée et détaillée
  - Création CONTEXT_AUTH.md, CONTEXT_GAME.md
  - Fichiers : ETAT_PROJET.md, CONTEXT_AUTH.md, CONTEXT_GAME.md

- ✅ **6 Nov 10h30** : Optimisation appels API - WalletContext
  - Problème : 4-5 fetches balance au refresh page
  - Solution : WalletContext centralisé
  - Résultat : -75% appels API
  - Fichiers : WalletContext.tsx, useEmbeddedWallet.ts, _app.tsx, useMarketplace.ts

- ✅ **5 Nov 16h45** : Marketplace COMPLÈTEMENT FONCTIONNEL
  - Nouveau Marketplace déployé : `0xA99c44fE605ABdb86c92394a9f7A2Da84da35786`
  - Marketplace whitelisté dans NFT contract
  - Premier achat NFT testé et validé avec succès
  - Fichiers : marketplace.service.ts, useMarketplace.ts, BuyNFT.tsx

- ✅ **4 Nov 23h** : Logging automatique migrations et transferts USDC
  - Script admin transfer-usdc-to-user.cjs
  - Logging dans address_activities
  - Fichiers : MigrationService, script transfer-usdc

- ✅ **4 Nov 22h** : Système complet gestion solde USDC
  - Balance USDC on-chain visible
  - Alert si solde insuffisant
  - Modal vente redesigné (style Sorare)
  - Fichiers : BalancePayment, SellCardForm, useMarketplace

- ✅ **3 Nov 20h00** : Fix détection wallet + lecture seule
  - Correction checkMigrationRequired (oldWalletAddress)
  - Ajout walletSyncedAt dans ProfileDto
  - Lecture seule pour Embedded Wallets créés
  - Fichiers : migration.service.ts, user.controller.ts, useEmbeddedWallet.ts

### Octobre 2025

- ✅ **30 Oct** : Marketplace Listing avec expiration
  - Système MarketplaceService complet
  - Expiration automatique (J+2 à J+30)
  - Cron job quotidien
  - Fichiers : marketplace.service.ts, marketplace.schema.ts, SellCardForm

- ✅ **28 Oct** : Réorganisation documentation
  - 171 fichiers → 15 actifs + 160 archivés
  - Création GUIDE_GESTION_DOCUMENTATION.md
  - Structure claire (tests/, context/, archives/)

- ✅ **10 Oct** : Plan test Embedded Wallet
  - 42 cas de test documentés
  - Fichier : PLAN_TEST_EMBEDDED_WALLET.md

---

**RAPPEL :** Mettre à jour ce fichier après CHAQUE tâche importante terminée !

**Dernière révision complète :** 9 Novembre 2025
