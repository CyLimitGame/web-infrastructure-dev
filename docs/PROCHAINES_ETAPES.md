# 🚀 PROCHAINES ÉTAPES - CYLIMIT

**FICHIER :** PROCHAINES_ETAPES.md

**OBJECTIF :**
Roadmap claire et actionnable des prochaines tâches à réaliser sur le projet CyLimit

**POURQUOI :**
Garder une vision claire des priorités et éviter la dispersion

**COMMENT :**
Consulter ce fichier pour savoir quoi faire ensuite. Mettre à jour après chaque tâche (marquer ✅, ajouter nouvelles).

**DERNIÈRE MISE À JOUR :** 6 Novembre 2025 - 12h30

**STATUT :** Actif - Mis à jour après chaque tâche

---

## 🎯 PRIORISATION

| Priorité | Phase | Timing | Dépendances |
|----------|-------|--------|-------------|
| **🔥 P0** | Tests Marketplace | Cette semaine | Aucune |
| **🔥 P1** | Migration Google Cloud Run | 2-3 semaines | Tests validés |
| **🔥 P2** | Migration Firebase Auth | 1 mois | Cloud Run migré |
| **⭐ P3** | Features Game (Packs, Essence) | 2-3 mois | Firebase Auth |
| **⭐ P4** | UX/UI Améliorations | 2-3 mois | Parallèle P3 |
| **💡 P5** | App Mobile | 3-6 mois | Features game stables |

---

## 🔥 PRIORITÉ P0 : TESTS MARKETPLACE COMPLETS

**Objectif :** Tester toutes les possibilités d'achat et revente sur le marketplace

**Timing :** Cette semaine (6-10 Nov 2025)

**Status :** 🔄 En cours

### Tâches

#### Tests Manuels (Testnet)
- [x] **Achat Direct** ✅ (6 Nov 2025)
  - [x] Achat NFT avec balance USDC suffisante
  - [x] Achat NFT avec balance insuffisante (erreur attendue)
  - [x] Vérifier fees (vendeur reçoit prix - fees)
  - [x] Vérifier ownership NFT après achat
  - [x] Vérifier balance USDC après achat

- [x] **Vente / Listing** ✅ (6 Nov 2025)
  - [x] Lister NFT première fois (approval Marketplace)
  - [x] Lister NFT deuxième fois (pas d'approval)
  - [x] Lister avec différentes dates expiration (J+2, J+15, J+30)
  - [x] Vérifier listing apparaît sur marketplace
  - [x] Annuler listing (delist)

- [x] **Edge Cases Vente Directe** ✅ (6 Nov 2025)
  - [x] Acheter son propre NFT (doit échouer)
  - [x] Lister NFT déjà listé (doit échouer)
  - [x] Lister NFT pas possédé (doit échouer)
  - [x] Acheter NFT expiré (doit échouer) - Bouton masqué automatiquement
  - [x] Double achat simultané même NFT (race condition) - Géré par vérifications backend

- [ ] **Buy Offers (Offres d'Achat 1-to-1)** 🔄 En cours (v4 avec target verrouillé)
  - [x] **Smart Contract v4** ✅ (7 Nov 2025) - Target verrouillé on-chain (faille #5 éliminée)
  - [x] **Backend Master Wallet transfers** ✅ (7 Nov 2025) - CoinbaseService implémenté
  - [ ] **⚠️ SÉCURITÉ : Failles restantes à corriger** (voir ci-dessous)
  - [ ] Tester flow complet (Step 1-6) avec v4
  - [ ] Créer offre achat (escrow USDC)
  - [ ] Accepter offre (seller reçoit USDC, buyer reçoit NFT)
  - [ ] Refuser offre
  - [ ] Annuler offre (refund USDC)
  - [ ] Offre avec balance insuffisante (doit échouer)
  - [ ] Accepter offre sur NFT déjà vendu (doit échouer)

- [ ] **Swaps NFT ↔ NFT**
  - [ ] Créer swap offer (1 NFT contre 1 NFT)
  - [ ] Créer swap offer (2 NFTs contre 1 NFT)
  - [ ] Accepter swap
  - [ ] Refuser swap
  - [ ] Annuler swap
  - [ ] Swap avec NFT pas possédé (doit échouer)

- [ ] **Swaps Mixtes (NFT + USDC)**
  - [ ] Swap NFT + USDC → NFT
  - [ ] Swap NFT → NFT + USDC
  - [ ] Escrow USDC vérifié
  - [ ] Batch atomique (tout ou rien)

- [ ] **Collection Offers (Offres Publiques)**
  - [ ] Créer collection offer (filtres rareté, rôle, etc.)
  - [ ] Accepter collection offer (premier arrivé)
  - [ ] Collection offer avec critères multiples
  - [ ] Refund si aucun seller accepte
  - [ ] Race condition (2 sellers acceptent en même temps)

- [ ] **Enchères avec Auto-Bid**
  - [ ] Créer enchère (prix départ, durée)
  - [ ] Placer bid (escrow USDC)
  - [ ] Auto-bid (enchère automatique jusqu'à maxBid)
  - [ ] Finaliser enchère (winner reçoit NFT)
  - [ ] Refund losers automatique
  - [ ] Refund surplus winner (maxBid - finalBid)

#### Tests Automatisés (Playwright)
- [ ] Finaliser tests wallet création
- [ ] Finaliser tests wallet reconnexion
- [ ] Créer tests marketplace vente directe
- [ ] Créer tests buy offers
- [ ] Créer tests swaps
- [ ] Créer tests collection offers
- [ ] Valider taux succès > 95%

**Bloquants :** Aucun (vente directe déjà fonctionnelle, autres features à implémenter)

**Documents :** [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md)

---

## 🔒 SÉCURITÉ MARKETPLACE - FAILLES À CORRIGER (PRIORITÉ P0.5)

**Objectif :** Corriger les failles de sécurité identifiées dans le système d'offres

**Timing :** 2-3 semaines (avant mise en production des offres)

**Status :** 🔄 En cours - Smart Contract v4 déployé (faille #5 éliminée)

**Documents :** 
- [MARKETPLACE-OFFER-SECURITY.md](./MARKETPLACE-OFFER-SECURITY.md) - Analyse complète des 7 failles
- [EMERGENCY_WITHDRAW_EXPLANATION.md](./EMERGENCY_WITHDRAW_EXPLANATION.md) - Fonction d'urgence owner

### Architecture Actuelle (⚠️ Risques)

```
Frontend → User Backend (+ Master Wallet clés CDP) → Smart Contract v4
                ↑
            PROBLÈME : Master Wallet dans backend public
```

### Solution 1 : Séparer User Backend et Admin Backend

**PHASE 1 : Séparation des backends** ✅ Prioritaire
- [ ] **Créer Admin Backend séparé** (ou utiliser cylimit-admin-backend existant)
  - [ ] Nouveau module MarketplaceService dans Admin Backend
  - [ ] Endpoints internes pour Master Wallet operations
  - [ ] Déplacer clés CDP (`CDP_API_KEY_NAME`, `CDP_API_KEY_PRIVATE_KEY`, `COINBASE_WALLET_SECRET`)
  - [ ] ⚠️ **ATTENTION** : Ces clés sont aussi utilisées par MigrationService !

- [ ] **Refactorer User Backend**
  - [ ] Retirer clés CDP du User Backend `.env.local`
  - [ ] Créer AdminBackendClient (appels internes)
  - [ ] Refactorer OfferService.confirmOfferAccepted() → Appelle Admin Backend
  - [ ] Refactorer MigrationService → Appelle Admin Backend pour transfers

- [ ] **Sécuriser communication User ↔ Admin**
  - [ ] IP whitelist (Admin Backend écoute seulement réseau privé)
  - [ ] HMAC signature pour chaque requête
  - [ ] Nonce + timestamp anti-replay
  - [ ] Rate limiting (max 100 req/min par user)

**PHASE 2 : Vérifications on-chain strictes**
- [ ] Vérifier txHash on-chain avant finalisation
  - [ ] Récupérer transaction via RPC
  - [ ] Vérifier `tx.from === seller.walletAddress`
  - [ ] Vérifier `tx.status === 1` (success)
- [ ] Vérifier escrow on-chain avant transfer
  - [ ] Appeler `marketplace.getOffer(offerId)` 
  - [ ] Vérifier `offer.amountUSDC >= expected`
- [ ] Lock DB (status 'finalizing')
  - [ ] Utiliser `findOneAndUpdate` avec conditions atomiques
  - [ ] Rollback en cas d'erreur

**PHASE 3 : Monitoring et alertes**
- [ ] KMS pour clés CDP (AWS Secrets Manager ou équivalent)
- [ ] Logs audit pour tous les appels Master Wallet
- [ ] Alertes Slack si :
  - [ ] `emergencyWithdrawOffer()` appelé
  - [ ] > 5 finalisations échouées / heure
  - [ ] Tentative accès Admin Backend depuis IP non whitelist
- [ ] Rate limiting avancé (par user, par IP)

### Failles Corrigées vs Restantes

| # | Faille | Sévérité | Status |
|---|--------|----------|--------|
| 1 | Compromission User Backend | 🔴 Critique | ⏳ **Solution 1 à implémenter** |
| 2 | Race Condition | 🟡 Moyen | ⏳ Lock DB à ajouter |
| 3 | Man-in-the-Middle | 🔴 Critique | ⏳ HMAC à ajouter |
| 4 | TOCTOU (DB vs Blockchain) | 🔴 Critique | ⏳ Vérif on-chain à ajouter |
| 5 | **Database Injection** | **🔴 CRITIQUE** | **✅ ÉLIMINÉ** (v4) |
| 6 | Compromission clés CDP | 🔴 Critique | ⏳ KMS à ajouter + Séparation backends |
| 7 | Replay Attack | 🟡 Moyen | ⏳ Nonce à ajouter |

**⚠️ IMPACT DES CLÉS CDP PARTAGÉES :**

Les variables d'environnement suivantes sont actuellement dans **User Backend** :
- `COINBASE_API_KEY_NAME`
- `COINBASE_API_KEY_PRIVATE_KEY`
- `COINBASE_WALLET_SECRET`

**Utilisées par** :
1. ✅ `MigrationService` - Migration USDC + NFTs (lignes 618-733)
2. ✅ `CoinbaseService` - Finalisation offres (Master Wallet transfers)

**Plan de migration** :
1. Déplacer clés vers Admin Backend
2. Créer endpoint Admin : `POST /internal/transfer-usdc` (pour Migration)
3. Créer endpoint Admin : `POST /internal/transfer-nfts` (pour Migration)
4. Créer endpoint Admin : `POST /internal/finalize-offer` (pour Offers)
5. User Backend appelle Admin Backend via client interne sécurisé

**Bloquants :** Aucun (peut être fait en parallèle des tests)

**Timing :** 
- Phase 1 : 1 semaine
- Phase 2 : 3 jours
- Phase 3 : 3 jours

---

## 🔥 PRIORITÉ P1 : MIGRATION GOOGLE CLOUD RUN

**Objectif :** Migrer hébergement AWS → Google Cloud Run pour économies

**Timing :** 2-3 semaines (après tests marketplace validés)

**Économies attendues :** ~300-400€/mois

### Tâches

#### Préparation
- [ ] Créer projet Google Cloud
- [ ] Configurer billing et budgets
- [ ] Créer service accounts
- [ ] Configurer IAM roles

#### Migration Backend User
- [ ] Containeriser backend user (Dockerfile)
- [ ] Tester build local
- [ ] Déployer sur Cloud Run (environnement staging)
- [ ] Configurer variables d'environnement
- [ ] Tester API endpoints
- [ ] Configurer domaine custom
- [ ] Basculer DNS (api.cylimit.com)

#### Migration Backend Admin
- [ ] Containeriser backend admin
- [ ] Déployer sur Cloud Run
- [ ] Tester cron jobs (Cloud Scheduler)
- [ ] Valider calculs scores

#### Migration Base de Données
- [ ] Évaluer MongoDB Atlas vs Cloud SQL
- [ ] Si Cloud SQL : migration progressive
- [ ] Si Atlas : garder (déjà optimisé)

#### Validation
- [ ] Tests end-to-end production
- [ ] Monitoring (logs, métriques)
- [ ] Rollback plan si problème
- [ ] Désactivation ancienne infra AWS

**Bloquants :** Tests marketplace doivent être validés d'abord

**Documents :** Voir `archives/migrations-cloud/ANALYSE-GOOGLE-CLOUD-RUN.md`

---

## 🔥 PRIORITÉ P2 : MIGRATION FIREBASE AUTH

**Objectif :** Migrer Custom JWT → Firebase Auth pour OTP SMS et 2FA mobile

**Timing :** 1 mois (après Cloud Run migré)

**Bénéfices :**
- ✅ OTP SMS natif (pas besoin Twilio)
- ✅ 2FA mobile (TOTP, authenticator apps)
- ✅ Biométrie (Face ID, Touch ID)
- ✅ Session management automatique
- ✅ Scalabilité illimitée

### Tâches

#### Configuration Firebase
- [ ] Créer projet Firebase (même projet que Cloud Run)
- [ ] Activer Firebase Auth
- [ ] Configurer providers (Email, Google, Facebook)
- [ ] Configurer OTP SMS (pays supportés)
- [ ] Tester en environnement staging

#### Migration Backend
- [ ] Installer Firebase Admin SDK
- [ ] Créer service FirebaseAuthService
- [ ] Migrer endpoints auth vers Firebase
- [ ] Dual-mode : supporter JWT + Firebase (transition)
- [ ] Vérifier tokens Firebase dans JwtStrategy

#### Migration Frontend
- [ ] Installer Firebase SDK client
- [ ] Créer hooks useFirebaseAuth
- [ ] Migrer pages login/signup
- [ ] Tester OTP SMS
- [ ] Tester social login

#### Migration Utilisateurs
- [ ] Script migration : Créer comptes Firebase pour users existants
- [ ] Envoyer email explicatif aux users
- [ ] Migration progressive (nouveaux users → Firebase)
- [ ] Anciens users → Migration au prochain login
- [ ] Désactivation JWT après 100% migration

**Bloquants :** Cloud Run doit être migré d'abord (même écosystème Google)

**Documents :** Voir [CONTEXT_AUTH.md](./context/CONTEXT_AUTH.md) section "Migration Firebase Auth"

---

## ⭐ PRIORITÉ P3 : FEATURES GAME - SYSTÈME PACKS & ESSENCE

**Objectif :** Nouveau système économique du jeu

**Timing :** 2-3 mois (après Firebase Auth)

### 🔴 Tâche 3.1 : Système Essence & Packs

#### Essence White (Monnaie du Jeu)
- [ ] Créer collection `user_essences` (MongoDB)
- [ ] API CRUD essence (get, add, subtract)
- [ ] Affichage balance Essence (header)
- [ ] Système de gain Essence :
  - [ ] XP → Essence (conversion)
  - [ ] Rewards games → Essence
  - [ ] Achievements → Essence

#### Welcome Pack
- [ ] Définir contenu Welcome Pack (X cartes White)
- [ ] Distribuer automatiquement à l'inscription
- [ ] Log distribution (tracking)

#### Packs MR/MT (Monuments & Tours)
- [ ] Détecter courses MR/MT (ProCyclingStats)
- [ ] Offrir pack gratuit 48h avant MR/MT
- [ ] Notifier users (email + app)
- [ ] Log distribution

#### Packs Hebdomadaires
- [ ] Définir rotation packs (contenu variable)
- [ ] Créer collection `packs` (MongoDB)
- [ ] Nouveau pack chaque semaine (lundi)
- [ ] Prix évolutif selon demande
- [ ] Achat avec USDC OU Essence

**Sous-tâches :**
- [ ] Backend : PackService (création, achat, distribution)
- [ ] Backend : EssenceService (gestion balance, transactions)
- [ ] Frontend : Page Packs (/packs)
- [ ] Frontend : Modal achat pack
- [ ] Frontend : Affichage Essence
- [ ] Admin : Création/gestion packs

---

### 🔴 Tâche 3.2 : Suppression Bonus Obsolètes

- [ ] Backend : Retirer bonus FIRST_OWNER du calcul
- [ ] Backend : Retirer bonus LAST_SEASON du calcul
- [ ] Backend : Mettre à jour BonusCalculationService
- [ ] DB : Nettoyer bonusByType existants (migration)
- [ ] Frontend : Retirer affichage ces bonus
- [ ] Tests : Valider calcul scores sans ces bonus

**Impact :** Simplification calcul + équilibre game

---

### 🔴 Tâche 3.3 : Système XP/Essence Revu

#### Supprimer Niveau User
- [ ] Backend : Retirer logique level
- [ ] Backend : Retirer contrainte level 10 (mode GLOBAL)
- [ ] DB : Migration retirer champ level
- [ ] Frontend : Retirer affichage niveau
- [ ] Frontend : Retirer références level dans UI

#### Nouveau Système XP → Essence
- [ ] Définir taux conversion (ex: 100 XP = 1 Essence)
- [ ] Créer endpoint POST /users/convert-xp-to-essence
- [ ] Frontend : Bouton "Convertir XP → Essence"
- [ ] Logging conversions

#### Système Coffre
- [ ] Backend : Collection `user_vaults` (MongoDB)
- [ ] Fonctions :
  - [ ] Déposer XP dans coffre (coût 0)
  - [ ] Retirer XP du coffre (coût = montant XP)
  - [ ] Calculer capacité coffre
- [ ] Frontend : Page "Mon Coffre"
- [ ] Frontend : Actions déposer/retirer XP
- [ ] UX : Expliquer système (gestion frustration)

#### Achat White avec Essence
- [ ] Backend : Endpoint POST /marketplace/buy-white-with-essence
- [ ] Calcul prix dynamique (régulation)
- [ ] Frontend : Bouton "Acheter avec Essence"
- [ ] Limite : Seulement cartes White

**Objectif :** Gérer économie du jeu et frustration users

---

## ⭐ PRIORITÉ P4 : UX/UI AMÉLIORATIONS

**Timing :** 2-3 mois (parallèle avec P3)

### 🔴 Tâche 4.1 : Création d'Équipe (Style Sorare)

- [ ] Analyse UX Sorare (screenshots, flow)
- [ ] Wireframes nouvelle UI CyLimit
- [ ] Simplification affichage :
  - [ ] Drag & drop fluide
  - [ ] Voir budget en temps réel
  - [ ] Suggestions cartes par rôle
  - [ ] Validation visuelle (vert/rouge)
- [ ] Implémentation frontend (refonte complète)
- [ ] Tests utilisateurs beta
- [ ] Déploiement production

**Impact :** Onboarding plus facile, meilleur taux création équipes

---

### 🔴 Tâche 4.2 : Affichage Games

- [ ] Revoir page liste games
- [ ] Game par game (au lieu de liste)
- [ ] Modes de jeu différents :
  - [ ] Mode Sprint (focus sprints)
  - [ ] Mode Montagne (focus grimpeurs)
  - [ ] Mode Classique (focus one-day races)
  - [ ] Mode Standard (actuel)
- [ ] Filtres par mode
- [ ] Affichage règles claires

---

### 🔴 Tâche 4.3 : Système de Prêt de Cartes

- [ ] Définir règles prêt (durée, conditions, retour)
- [ ] Backend : Collection `card_loans` (MongoDB)
- [ ] Backend : API prêt (create, accept, return, cancel)
- [ ] Frontend : Modal "Prêter cette carte"
- [ ] Frontend : Page "Mes Prêts" (prêtés/empruntés)
- [ ] Notifications (prêt accepté, carte retournée, etc.)
- [ ] Vérification : carte prêtée non utilisable par owner

**Use case :** Aider amis, tester cartes, entraide communauté

---

### 🔴 Tâche 4.4 : Système d'Affiliation Revu

- [ ] Audit code affiliation actuel
- [ ] Vérifier tracking refInvitationCode
- [ ] Implémenter récompenses parrain/filleul
- [ ] Dashboard affilié (stats, gains)
- [ ] Cf. retours Luc (MP Valentin) - points spécifiques à adresser
- [ ] Tests tracking complet

---

## 💡 PRIORITÉ P5 : APPLICATION MOBILE

**Timing :** 3-6 mois (après features game stables)

### 🔴 Tâche 5.1 : MVP Mobile

#### Features Essentielles
- [ ] Login/Signup (Email + Social)
- [ ] Création équipe (copier UX desktop améliorée)
- [ ] Voir mes équipes
- [ ] Voir classements
- [ ] Marketplace (voir, acheter, vendre)
- [ ] Wallet (balance, recharge)

#### Notifications Push
- [ ] Setup Firebase Cloud Messaging
- [ ] Notifications :
  - [ ] Course commence (2h avant)
  - [ ] Résultats disponibles
  - [ ] Classement mis à jour
  - [ ] NFT vendu
  - [ ] Offre reçue

#### Technologie
- [ ] Choix stack : React Native OU Flutter
- [ ] Setup projet
- [ ] CI/CD (App Store + Play Store)

---

## 📋 BACKLOG (Basse Priorité)

### Features Game Avancées

- [ ] **Modes de Jeu Spéciaux**
  - [ ] Sprint Challenge (focus sprinters)
  - [ ] King of Mountains (focus grimpeurs)
  - [ ] Classics Master (focus one-day)

- [ ] **Système Ligue**
  - [ ] Montée/descente entre divisions
  - [ ] Récompenses fin saison
  - [ ] Classement général annuel

### Marketplace Avancé

- [ ] **Offres 1-to-1** (Buy Offers)
- [ ] **Swaps NFT ↔ NFT**
- [ ] **Collection Offers** (offres publiques avec filtres)
- [ ] **Enchères avec Auto-Bid**

### Optimisations Techniques

- [ ] Migration Next.js 12 → 14
- [ ] TypeScript strict mode
- [ ] Tests unitaires backend (coverage > 50%)
- [ ] Optimisation requêtes MongoDB
- [ ] Monitoring avancé (Sentry, Grafana)

---

## ✅ SESSIONS DE REFONTE (6 Nov 2025)

### Session 1 : CONTEXT_AUTH.md ✅
- Création contexte authentification complet
- Fichiers : CONTEXT_AUTH.md (~670 lignes, ~8.4k tokens)

### Session 2 : CONTEXT_GAME.md ✅
- Création contexte système de jeu
- Fichiers : CONTEXT_GAME.md (~750 lignes, ~9.4k tokens)

### Session 3 : Stack Technique ✅
- Correction stack technique ETAT_PROJET.md
- Ajout détails versions exactes
- Ajout contrats déployés

### Session 4 : ETAT_PROJET.md ✅
- Refonte complète structure UX-first
- Correction OTP → Magic Link
- Correction frais marketplace
- Correction migration NFTs
- Fichiers : ETAT_PROJET.md (640 → 360 lignes, -45%)

### Session 5 : PROCHAINES_ETAPES.md ✅
- Refonte roadmap complète
- Priorisation claire (P0 → P5)
- Toutes features intégrées
- Fichiers : PROCHAINES_ETAPES.md

---

## 🔄 COMMENT UTILISER CE FICHIER

### Avant de Commencer une Tâche
1. Lire ce fichier pour voir les priorités
2. Choisir la tâche la plus haute priorité non bloquée
3. Charger le contexte approprié (voir ETAT_PROJET.md)
4. Consulter le document technique associé

### Après Avoir Terminé une Tâche
1. Marquer la tâche comme ✅
2. Mettre à jour ETAT_PROJET.md (section concernée)
3. Mettre à jour contexte si modifications importantes
4. Ajouter nouvelles tâches identifiées
5. Mettre date de dernière MAJ

---

## 📊 RÉCAPITULATIF ROADMAP

```
NOV 2025           DÉC 2025           JAN 2026           FÉV-AVR 2026
─────────────────────────────────────────────────────────────────────
│                │                │                │
│ P0: Tests      │                │                │
│ Marketplace    │                │                │
│ (1 semaine)    │                │                │
│                │                │                │
├────────────────┤                │                │
                 │ P1: Cloud Run  │                │
                 │ Migration      │                │
                 │ (2-3 semaines) │                │
                 │                │                │
                 ├────────────────┤                │
                                  │ P2: Firebase   │
                                  │ Auth           │
                                  │ (1 mois)       │
                                  │                │
                                  ├────────────────┤
                                                   │ P3: Features
                                                   │ Game (Packs,
                                                   │ Essence)
                                                   │
                                                   │ P4: UX/UI
                                                   │ (parallèle)
                                                   │ (2-3 mois)
                                                   │
                                                   ├──────────→
                                                   
MAI-OCT 2026
────────────────────────────────────────
│
│ P5: App Mobile
│ (3-6 mois)
│
└──────────→
```

---

## 🎯 CRITÈRES DE SUCCÈS

### Tests Marketplace (P0)
- ✅ 100% cas de test manuels validés
- ✅ Tests Playwright > 95% succès
- ✅ Zéro bug critique identifié

### Cloud Run (P1)
- ✅ Économies > 300€/mois
- ✅ Latence API < 200ms (p95)
- ✅ Uptime > 99.9%

### Firebase Auth (P2)
- ✅ 100% users migrés
- ✅ OTP SMS fonctionnel
- ✅ Zéro perte de compte

### Features Game (P3)
- ✅ Packs vendus > 50/semaine
- ✅ Taux adoption Essence > 70%
- ✅ Satisfaction users > 8/10

### App Mobile (P5)
- ✅ > 1000 téléchargements premier mois
- ✅ Rating App Store/Play Store > 4.5/5
- ✅ Taux rétention J7 > 40%

---

## 📞 QUESTIONS FRÉQUENTES

**Q : Quelle est la prochaine chose à faire ?**
R : Voir section "PRIORITÉ P0" en haut (Tests Marketplace)

**Q : Puis-je commencer une feature P3 avant P2 ?**
R : Oui si pas de dépendances techniques, mais prioriser P0-P2 d'abord

**Q : Où trouver les docs techniques ?**
R : Voir ETAT_PROJET.md section "Contextes Disponibles"

**Q : Comment ajouter une nouvelle tâche ?**
R : L'ajouter dans la bonne priorité, marquer [ ], ajouter estimation timing

---

**RAPPEL :** Ce fichier doit être mis à jour APRÈS CHAQUE tâche terminée !

**Prochaine révision :** 1er Décembre 2025 (mensuelle)
