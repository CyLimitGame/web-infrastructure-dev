# 🧪 PLAN DE TEST COMPLET - EMBEDDED WALLET COINBASE

> **Objectif** : Valider tous les cas d'usage du wallet Coinbase Embedded Wallet intégré dans CyLimit
> 
> **Dernière mise à jour** : 28 octobre 2025
> 
> **Technologies** : Coinbase CDP SDK v0.0.51+, @coinbase/cdp-hooks, Base Sepolia (testnet)
>
> **Changelog** :
> - **28 oct 2025** : 
>   - ✅ **Cas 1.1.C(A) COMPLET et FONCTIONNEL** jusqu'à l'écran OTP Coinbase ✅
>   - ✅ Corrections bugs tests E2E (SMTP, redirections, skip open-the-pack)
>   - ⚠️ **LIMITE IDENTIFIÉE** : OTP Coinbase envoyé depuis serveurs Coinbase (pas MailHog)
>   - 🎯 **Test considéré comme RÉUSSI** dès l'affichage de l'écran OTP Coinbase

---

## 📋 TABLE DES MATIÈRES

1. [Initialisation & Création du Wallet](#1-initialisation--création-du-wallet)
2. [Gestion des Méthodes d'Authentification (Backup)](#2-gestion-des-méthodes-dauthentification-backup)
3. [Reconnexion & Session](#3-reconnexion--session)
4. [Achat d'USDC (Onramp)](#4-achat-dusdc-onramp)
5. [Vente/Retrait (Offramp)](#5-venteretrait-offramp)
6. [Création d'Offre (Marketplace)](#6-création-doffre-marketplace)
7. [Sécurité & Récupération](#7-sécurité--récupération)
8. [Cas par Pays/Région](#8-cas-par-paysrégion)
9. [Transactions & Gas](#9-transactions--gas)
10. [Expérience Utilisateur](#10-expérience-utilisateur)
11. [Matrice de Test Récapitulative](#matrice-de-test-récapitulative)
12. [Checklist Prioritaire](#checklist-prioritaire)

---

## 1. INITIALISATION & CRÉATION DU WALLET

### 1.1 Nouvel utilisateur (jamais eu de wallet)

#### 📧 Cas 1.1.A : Email uniquement dans profil CyLimit

**Préconditions** :
- User CyLimit créé
- Email renseigné dans profil
- Pas de téléphone
- Aucun wallet existant

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le modal Wallet
- [ ] Vérifier que la méthode "Email" est sélectionnée par défaut
- [ ] Cliquer "Je confirme et je continue"
- [ ] **Vérifier OTP email reçu** (6 chiffres)
- [ ] Saisir le code OTP
- [ ] Vérifier message de succès "Wallet créé"

**Vérifications backend** :
- [ ] `walletAddress` renseigné dans user DB
- [ ] `embeddedWalletAuthMethod: 'email'`
- [ ] `embeddedWalletEmail` = email CyLimit
- [ ] `walletSyncedAt` défini
- [ ] `migrationStatus: null` (pas de migration pour nouvel user)

**Vérifications frontend** :
- [ ] Modal de gestion des méthodes s'ouvre automatiquement
- [ ] Message "Ajouter un numéro de backup" visible
- [ ] Message "Limitation Coinbase" visible en bas
- [ ] Numéro de téléphone CyLimit pré-rempli (si existe)

---

#### 📱 Cas 1.1.B : Téléphone uniquement dans profil CyLimit

**Préconditions** :
- User CyLimit créé
- Téléphone renseigné dans profil
- Pas d'email (cas rare)
- Aucun wallet existant

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le modal Wallet
- [ ] Sélectionner méthode "SMS"
- [ ] Vérifier numéro pré-rempli avec téléphone CyLimit
- [ ] Cliquer "Je confirme et je continue"
- [ ] **Vérifier OTP SMS reçu** (6 chiffres)
- [ ] Saisir le code OTP
- [ ] Vérifier message de succès

**Vérifications backend** :
- [ ] `walletAddress` renseigné
- [ ] `embeddedWalletAuthMethod: 'sms'`
- [ ] `embeddedWalletPhone` = téléphone CyLimit
- [ ] `walletSyncedAt` défini

**Vérifications frontend** :
- [ ] Modal de gestion s'ouvre automatiquement
- [ ] Message "Ajouter un email de backup" visible

---

#### 📧📱 Cas 1.1.C : Email ET téléphone dans profil CyLimit

##### Option A : Créer wallet avec Email

**Préconditions** :
- User CyLimit créé
- Email ET téléphone renseignés
- Aucun wallet existant

**Steps** :
- [x] Se connecter à CyLimit
- [x] Ouvrir le modal Wallet
- [x] Vérifier que "Email" est sélectionné par défaut
- [x] Vérifier que SMS est aussi disponible (toggle visible)
- [x] Rester sur Email
- [x] Cliquer "Je confirme et je continue"
- [x] Vérifier OTP email reçu
- [x] Saisir le code OTP
- [x] Vérifier création wallet

**Vérifications frontend** :
- [x] Modal de gestion s'ouvre
- [x] Message "Ajouter un numéro de backup"
- [x] **Téléphone CyLimit pré-rempli** dans le champ
- [ ] Possibilité d'ajouter le backup SMS immédiatement

**✅ TEST AUTOMATISÉ** : `tests/e2e/wallet-creation-email-backup-sms.spec.ts`
- Test Playwright complet du cas 1.1.C(A)
- Inclut : Inscription → Email confirmation → Wallet création → Skip open-the-pack → Accès dashboard
- **Progression actuelle (28 oct 2025)** :
  - ✅ Inscription utilisateur
  - ✅ Confirmation email via MailHog
  - ✅ Skip open-the-pack (mode E2E)
  - ✅ Ouverture modal wallet
  - ✅ Sélection Email et demande OTP
  - ✅ Affichage champ OTP (6 chiffres)
  - ✅ **TEST COMPLET ET FONCTIONNEL** ✅
- **Statut** : ✅ **RÉUSSI** (Test passe avec succès jusqu'à l'écran OTP Coinbase)
- **Limite technique** : OTP Coinbase envoyé par serveurs Coinbase, pas récupérable via MailHog
- **Tests manuels restants** : Saisie OTP Coinbase → Création wallet → Ajout backup SMS

##### Option B : Créer wallet avec SMS

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le modal Wallet
- [ ] **Basculer sur "SMS"**
- [ ] Vérifier numéro pré-rempli
- [ ] Cliquer "Je confirme et je continue"
- [ ] Vérifier OTP SMS reçu
- [ ] Saisir le code OTP
- [ ] Vérifier création wallet

**Vérifications frontend** :
- [ ] Modal de gestion s'ouvre
- [ ] Message "Ajouter un email de backup"
- [ ] **Email CyLimit pré-rempli** dans le champ

---

#### ⚠️ Cas 1.1.D : Ni email ni téléphone (cas limite)

**Préconditions** :
- User CyLimit créé
- Ni email ni téléphone renseignés

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le modal Wallet
- [ ] Vérifier message d'erreur approprié
- [ ] Vérifier lien/bouton vers paramètres du compte
- [ ] Compléter email/téléphone dans paramètres
- [ ] Retourner au wallet et retester

---

### 1.2 Ancien utilisateur (a déjà un wallet Polygon)

#### 🔄 Cas 1.2.A : Migration automatique - Email only

**Préconditions** :
- User avec ancien wallet Polygon
- Balance USDC > 0 sur Polygon
- NFTs v2 possédés
- Email dans profil CyLimit
- Pas encore d'Embedded Wallet

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le modal Wallet
- [ ] Créer Embedded Wallet avec Email
- [ ] Vérifier OTP email et valider
- [ ] **Vérifier message de migration en cours**

**Vérifications backend (logs)** :
```
✅ À surveiller dans les logs backend :

[MigrationService] 🚀 Starting migration for user {userId}
[MigrationService] 💵 Transferring {amount} USDC to {newAddress} (Base)
[MigrationService] 🎨 Transferring {count} NFTs v2 to {newAddress}
[MigrationService] ✅ Migration completed successfully
[SlackMigrationService] ✅ Slack alert sent
```

- [ ] Vérifier transaction USDC Polygon → Base
- [ ] Vérifier transactions NFTs Polygon → Base
- [ ] Vérifier balance finale sur Base = balance initiale Polygon
- [ ] Vérifier NFTs reçus sur Base

**Vérifications DB** :
- [ ] `walletAddress` = nouvelle adresse Base
- [ ] `migrationStatus: 'completed'`
- [ ] `walletSyncedAt` défini
- [ ] `previousWallets` contient ancien wallet Polygon

**Vérifications Slack** :
- [ ] Message reçu dans canal Slack migrations
- [ ] Détails user, montants, adresses
- [ ] Hash des transactions

---

#### 🔄 Cas 1.2.B : Migration automatique - SMS only

**Steps** :
- [ ] Même préconditions que 1.2.A
- [ ] Créer Embedded Wallet avec SMS (au lieu d'Email)
- [ ] Vérifier OTP SMS et valider
- [ ] Vérifier même processus de migration
- [ ] Vérifier cohérence des données

---

#### ❌ Cas 1.2.C : Migration avec erreur

**Préconditions** :
- User avec ancien wallet Polygon
- **Backend : CDP API keys manquantes ou invalides** (simuler)

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Créer Embedded Wallet avec Email
- [ ] Vérifier wallet créé malgré l'erreur
- [ ] Vérifier message d'avertissement à l'user

**Vérifications backend (logs)** :
```
❌ À surveiller dans les logs :

[MigrationService] ❌ USDC transfer failed: Missing CDP API keys
[MigrationService] ❌ NFT v2 transfer batch failed: ...
[MigrationService] ❌ Migration failed for user {userId}
[SlackMigrationService] ⚠️ Alert sent with error details
```

**Vérifications DB** :
- [ ] `walletAddress` défini (wallet créé quand même)
- [ ] `migrationStatus: 'failed'`
- [ ] Erreur détaillée loguée

**Vérifications Slack** :
- [ ] Message d'alerte avec détails de l'erreur
- [ ] User ID et informations de debug

---

## 2. GESTION DES MÉTHODES D'AUTHENTIFICATION (BACKUP)

### 2.1 Ajouter une méthode backup - Email principal

#### 📧 → 📱 Cas 2.1.A : Email principal → Ajouter SMS

##### Sous-cas A1 : Sans téléphone dans CyLimit

**Préconditions** :
- Wallet créé avec Email
- Pas de téléphone dans profil CyLimit
- Pas de backup configuré

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Cliquer sur "⚙️ Gérer les méthodes"
- [ ] Vérifier affichage :
  - Email configuré (avec adresse)
  - SMS non configuré
  - Message "Limitation Coinbase" visible en bas
- [ ] Cliquer "Ajouter un numéro de backup"
- [ ] Vérifier **champ téléphone vide**
- [ ] Saisir un numéro de téléphone valide (+33, +1, etc.)
- [ ] Vérifier validation en temps réel :
  - Drapeau du pays correct
  - Format valide (vert) ou invalide (rouge)
- [ ] Cliquer "Envoyer le code de vérification"
- [ ] Vérifier toast "Code envoyé"
- [ ] Vérifier réception SMS OTP
- [ ] Saisir le code OTP (6 chiffres)
- [ ] Cliquer "Vérifier et lier"
- [ ] Vérifier toast de succès

**Vérifications backend** :
- [ ] `hasBackupAuthMethod: true` en DB
- [ ] `phoneNumber` mis à jour avec nouveau numéro

**Vérifications Coinbase (via currentUser)** :
- [ ] `currentUser.authenticationMethods.email.email` = email principal
- [ ] `currentUser.authenticationMethods.sms.phoneNumber` = nouveau numéro

**Vérifications frontend** :
- [ ] Modal revient à l'état "view"
- [ ] Les 2 méthodes affichées (Email + SMS)
- [ ] Message "✅ Toutes les méthodes sont configurées"

---

##### Sous-cas A2 : Avec téléphone dans CyLimit

**Préconditions** :
- Wallet créé avec Email
- **Téléphone déjà dans profil CyLimit**
- Pas de backup configuré

**Steps** :
- [ ] Ouvrir modal Wallet → Gérer les méthodes
- [ ] Cliquer "Ajouter un numéro de backup"
- [ ] Vérifier **champ téléphone PRÉ-REMPLI** avec numéro CyLimit
- [ ] Option 1 : Utiliser le numéro pré-rempli
  - [ ] Cliquer directement "Envoyer le code"
  - [ ] Valider OTP SMS
  - [ ] Vérifier backup ajouté
- [ ] Option 2 : Modifier le numéro
  - [ ] Effacer le numéro pré-rempli
  - [ ] Saisir un autre numéro
  - [ ] Envoyer OTP au nouveau numéro
  - [ ] Valider OTP
  - [ ] Vérifier `phoneNumber` mis à jour en DB avec le NOUVEAU numéro

---

#### ❌ Cas 2.1.B : Email principal → Essayer d'ajouter Email (erreur attendue)

**Préconditions** :
- Wallet créé avec Email
- Pas de backup configuré

**Steps** :
- [ ] Ouvrir modal Wallet → Gérer les méthodes
- [ ] Vérifier que l'interface propose UNIQUEMENT :
  - "Ajouter un numéro de backup" (SMS)
  - PAS d'option pour ajouter un email
- [ ] Vérifier cohérence de l'UI

---

### 2.2 Ajouter une méthode backup - SMS principal

#### 📱 → 📧 Cas 2.2.A : SMS principal → Ajouter Email

##### Sous-cas A1 : Sans email dans CyLimit

**Préconditions** :
- Wallet créé avec SMS
- Pas d'email dans profil CyLimit (cas rare)
- Pas de backup configuré

**Steps** :
- [ ] Ouvrir modal Wallet → Gérer les méthodes
- [ ] Vérifier affichage :
  - SMS configuré (avec numéro)
  - Email non configuré
- [ ] Cliquer "Ajouter un email de backup"
- [ ] Vérifier **champ email vide**
- [ ] Saisir une adresse email valide
- [ ] Cliquer "Envoyer le code de vérification"
- [ ] Vérifier toast "Code envoyé"
- [ ] Vérifier réception Email OTP
- [ ] Saisir le code OTP
- [ ] Cliquer "Vérifier et lier"
- [ ] Vérifier toast de succès

**Vérifications backend** :
- [ ] `hasBackupAuthMethod: true` en DB

**Vérifications Coinbase** :
- [ ] `currentUser.authenticationMethods.sms.phoneNumber` = numéro principal
- [ ] `currentUser.authenticationMethods.email.email` = nouvel email

---

##### Sous-cas A2 : Avec email dans CyLimit

**Préconditions** :
- Wallet créé avec SMS
- **Email déjà dans profil CyLimit**
- Pas de backup configuré

**Steps** :
- [ ] Ouvrir modal Wallet → Gérer les méthodes
- [ ] Cliquer "Ajouter un email de backup"
- [ ] Vérifier **champ email PRÉ-REMPLI** avec email CyLimit
- [ ] Option 1 : Utiliser l'email pré-rempli
  - [ ] Cliquer "Envoyer le code"
  - [ ] Valider OTP Email
- [ ] Option 2 : Saisir un autre email
  - [ ] Modifier le champ
  - [ ] Envoyer OTP au nouvel email
  - [ ] Valider OTP

---

#### ❌ Cas 2.2.B : SMS principal → Essayer d'ajouter SMS (erreur attendue)

**Steps** :
- [ ] Wallet créé avec SMS
- [ ] Ouvrir modal de gestion
- [ ] Vérifier que l'interface propose UNIQUEMENT :
  - "Ajouter un email de backup"
  - PAS d'option pour ajouter un SMS

---

### 2.3 Gestion avec 2 méthodes configurées

#### ✅ Cas 2.3.A : Les 2 méthodes déjà configurées

**Préconditions** :
- Wallet créé avec Email
- SMS backup déjà ajouté
- Les 2 méthodes liées sur Coinbase

**Steps** :
- [ ] Ouvrir modal Wallet → Gérer les méthodes
- [ ] Vérifier affichage :
  - ✅ Alert verte "Toutes les méthodes sont configurées"
  - 📧 Email: {adresse email}
  - 📱 SMS: {numéro téléphone}
  - ⚠️ Message "Limitation Coinbase" en bas
- [ ] Vérifier qu'AUCUN bouton "Ajouter" n'apparaît
- [ ] Vérifier impossibilité d'ajouter une 3ème méthode
- [ ] Vérifier impossibilité de supprimer une méthode

**Vérifications Coinbase** :
- [ ] `currentUser.authenticationMethods.email.email` défini
- [ ] `currentUser.authenticationMethods.sms.phoneNumber` défini

---

### 2.4 Erreurs et cas limites

#### ⚠️ Cas 2.4.A : Numéro déjà lié (erreur Coinbase)

**Préconditions** :
- Wallet A créé avec Email
- Essayer de lier le numéro déjà lié au Wallet B

**Steps** :
- [ ] Ouvrir modal de gestion
- [ ] Tenter d'ajouter un numéro déjà utilisé par un autre wallet
- [ ] Envoyer OTP
- [ ] Saisir OTP
- [ ] Vérifier que Coinbase retourne erreur

**Vérifications frontend** :
- [ ] Toast **WARNING** (pas error) affiché
- [ ] Message : "Ce numéro est déjà lié à votre compte"
- [ ] Pas de crash de l'app
- [ ] Possibilité de réessayer avec un autre numéro

---

#### ⚠️ Cas 2.4.B : Email déjà lié (erreur Coinbase)

**Steps** :
- [ ] Même logique que 2.4.A
- [ ] Essayer de lier un email déjà utilisé
- [ ] Vérifier toast warning approprié

---

#### ❌ Cas 2.4.C : OTP invalide

**Steps** :
- [ ] Demander un OTP (Email ou SMS)
- [ ] Saisir un code incorrect (ex: 000000)
- [ ] Cliquer "Vérifier et lier"
- [ ] Vérifier message d'erreur clair
- [ ] Vérifier possibilité de ressaisir
- [ ] Vérifier pas de blocage après plusieurs tentatives

---

#### ⏱️ Cas 2.4.D : OTP expiré

**Steps** :
- [ ] Demander un OTP
- [ ] **Attendre 10 minutes** (expiration Email OTP)
- [ ] OU **attendre 5 minutes** (expiration SMS OTP)
- [ ] Essayer de valider l'OTP expiré
- [ ] Vérifier message "Code expiré"
- [ ] Vérifier bouton "Renvoyer le code"
- [ ] Renvoyer un nouveau code
- [ ] Vérifier nouveau code reçu
- [ ] Valider avec le nouveau code

---

## 3. RECONNEXION & SESSION

### 3.1 Reconnexion automatique (refresh token valide)

#### 🔄 Cas 3.1.A : Session < 7 jours

**Préconditions** :
- Wallet créé et connecté
- Session < 7 jours (refresh token valide)

**Steps** :
- [ ] Se connecter avec Email/SMS
- [ ] Vérifier wallet accessible
- [ ] **Fermer complètement le navigateur**
- [ ] Attendre quelques minutes
- [ ] **Rouvrir le navigateur**
- [ ] Se connecter à CyLimit
- [ ] Ouvrir le wallet

**Vérifications** :
- [ ] ✅ Reconnexion automatique SANS demande d'OTP
- [ ] ✅ AUCUN email/SMS OTP reçu
- [ ] ✅ Wallet immédiatement accessible
- [ ] ✅ Balance affichée correctement
- [ ] ✅ Console : "Embedded Wallet connecté avec succès"

**Vérifications localStorage** :
- [ ] Refresh token Coinbase présent
- [ ] Pas de nouveau OTP demandé

---

#### 🔄 Cas 3.1.B : Refresh de page (BUG CORRIGÉ)

**Préconditions** :
- Wallet connecté
- Session active < 7 jours

**Steps** :
- [ ] Wallet ouvert et fonctionnel
- [ ] Appuyer sur **F5** ou **Cmd+R** (refresh)
- [ ] Attendre chargement de la page

**Vérifications CRITIQUES** :
- [ ] ✅ **AUCUN email OTP envoyé**
- [ ] ✅ **AUCUN SMS OTP envoyé**
- [ ] ✅ Console : "⏸️ Auto-connexion Embedded Wallet ignorée (cooldown actif)"
- [ ] ✅ Wallet toujours connecté après refresh
- [ ] ✅ Balance inchangée

**Vérifications localStorage** :
- [ ] `cdp_auto_connect_{email}` avec timestamp
- [ ] Cooldown de 5 minutes actif

**SI ÉCHEC** :
- ❌ Des OTP sont envoyés au refresh
- ❌ Vérifier les logs : "🔄 Tentative auto-connexion Embedded Wallet"
- ❌ Le cooldown localStorage n'est pas respecté
- → **Bug à corriger : l'auto-connexion appelle signInWithEmail() qui envoie toujours un OTP**

---

### 3.2 Session expirée (> 7 jours)

#### 🔐 Cas 3.2.A : Reconnexion manuelle Email

**Préconditions** :
- Wallet créé avec Email
- **Session > 7 jours** (refresh token expiré)
- OU : Simuler en supprimant le refresh token localStorage

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir modal Wallet
- [ ] Vérifier message : "Veuillez vous reconnecter à votre wallet"
- [ ] Sélectionner Email
- [ ] Cliquer "Je confirme et je continue"
- [ ] Vérifier **OTP Email envoyé** (normal, session expirée)
- [ ] Saisir OTP
- [ ] Vérifier reconnexion réussie
- [ ] Vérifier accès au wallet
- [ ] Vérifier balance inchangée

**Vérifications** :
- [ ] Nouvelle session créée (7 jours)
- [ ] Nouveau refresh token stocké
- [ ] Adresse wallet IDENTIQUE (pas de nouveau wallet)

---

#### 🔄 Cas 3.2.B : Reconnexion avec méthode backup

**Préconditions** :
- Wallet créé avec Email
- SMS backup configuré
- Session > 7 jours

**Steps** :
- [ ] Se connecter à CyLimit
- [ ] Ouvrir modal Wallet
- [ ] Vérifier message de reconnexion
- [ ] **Sélectionner SMS** (au lieu d'Email)
- [ ] Saisir le numéro (pré-rempli si en profil)
- [ ] Cliquer "Je confirme et je continue"
- [ ] Vérifier OTP SMS envoyé
- [ ] Saisir OTP
- [ ] Vérifier reconnexion réussie

**Vérifications CRITIQUES** :
- [ ] ✅ Accès au **MÊME wallet** (pas un nouveau)
- [ ] ✅ **Même adresse wallet** qu'avant
- [ ] ✅ **Même balance** qu'avant
- [ ] ✅ Méthodes d'auth inchangées

**IMPORTANT** : C'est le test clé pour vérifier que l'Auth Method Linking fonctionne correctement.

---

### 3.3 Multi-device (limite 5 appareils)

#### 💻📱 Cas 3.3.A : Connexion sur 2 appareils

**Préconditions** :
- Wallet créé
- 2 appareils disponibles (ex: PC + téléphone)

**Steps** :
- [ ] **Appareil 1** : Se connecter et ouvrir wallet
- [ ] Vérifier adresse wallet et balance
- [ ] **Appareil 2** : Se connecter avec même compte CyLimit
- [ ] Ouvrir wallet sur appareil 2
- [ ] Se connecter avec Email/SMS (OTP demandé)
- [ ] Valider OTP

**Vérifications** :
- [ ] ✅ Accès au **MÊME wallet** sur les 2 appareils
- [ ] ✅ Même adresse wallet
- [ ] ✅ Même balance
- [ ] ✅ Transaction faite sur appareil 1 visible sur appareil 2
- [ ] ✅ Pas de déconnexion de l'appareil 1

---

#### ⚠️ Cas 3.3.B : 6ème appareil (limite dépassée)

**Préconditions** :
- Wallet déjà connecté sur 5 appareils différents

**Steps** :
- [ ] Essayer de se connecter sur un **6ème appareil**
- [ ] Demander OTP
- [ ] Valider OTP

**Vérifications** :
- [ ] Connexion réussie sur le 6ème appareil
- [ ] **Déconnexion automatique du 1er appareil** (le plus ancien)
- [ ] Message d'info à l'user sur limite 5 appareils
- [ ] Appareil 1 doit se reconnecter

---

## 4. ACHAT D'USDC (ONRAMP)

### 4.1 Premier achat

#### 💳 Cas 4.1.A : Wallet vide, achat 50 USDC

**Préconditions** :
- Wallet créé (Email ou SMS)
- Balance : 0 USDC
- Pays supporté par Coinbase Onramp

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Vérifier balance affichée : 0 USDC
- [ ] Cliquer "Acheter des USDC"
- [ ] Vérifier ouverture Coinbase Onramp (iframe ou nouvelle fenêtre)

**Dans Coinbase Onramp** :
- [ ] Vérifier adresse wallet pré-remplie
- [ ] Saisir montant : **50 USD**
- [ ] Sélectionner mode de paiement (carte bancaire, Apple Pay, etc.)
- [ ] Vérifier frais affichés
- [ ] **Si KYC non fait** :
  - [ ] Compléter vérification identité
  - [ ] Upload pièce d'identité
  - [ ] Selfie si demandé
  - [ ] Attendre validation (peut prendre quelques minutes)
- [ ] Confirmer le paiement
- [ ] Vérifier message "Transaction en cours"

**Après transaction** :
- [ ] Attendre confirmation blockchain (1-2 min sur Base Sepolia)
- [ ] Vérifier transaction sur Base Sepolia explorer
- [ ] **Retourner sur CyLimit**
- [ ] Vérifier balance mise à jour automatiquement
- [ ] Vérifier balance ≈ 50 USDC (moins les frais)

**Vérifications blockchain** :
- [ ] Transaction visible sur Basescan (testnet)
- [ ] Hash transaction valide
- [ ] Montant reçu correct

---

#### 🌍 Cas 4.1.B : Pays non supporté

**Préconditions** :
- Wallet créé
- **Pays NON supporté** par Coinbase Onramp

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Cliquer "Acheter des USDC"
- [ ] Vérifier message d'erreur :
  - "Onramp non disponible dans votre pays"
  - OU redirection vers Coinbase avec erreur
- [ ] Vérifier alternatives proposées :
  - Lien vers faucet (testnet)
  - Instructions dépôt blockchain
  - Support

---

#### 🎫 Cas 4.1.C : Achat avec KYC requis (seuil dépassé)

**Préconditions** :
- Premier achat > seuil KYC (ex: > 200 USD)
- OU : Cumul d'achats > seuil

**Steps** :
- [ ] Tenter achat montant élevé
- [ ] Vérifier demande de vérification identité par Coinbase
- [ ] Compléter le KYC :
  - [ ] Pièce d'identité
  - [ ] Selfie
  - [ ] Adresse
  - [ ] Date de naissance
- [ ] Attendre validation (peut prendre 1-24h)
- [ ] Retenter l'achat après validation
- [ ] Vérifier achat réussi

---

### 4.2 Achats suivants

#### 💰 Cas 4.2.A : Achat avec balance existante

**Préconditions** :
- Wallet avec 10 USDC existants
- KYC déjà validé

**Steps** :
- [ ] Vérifier balance initiale : 10 USDC
- [ ] Cliquer "Acheter des USDC"
- [ ] Acheter 20 USDC supplémentaires
- [ ] Confirmer transaction
- [ ] Attendre confirmation

**Vérifications** :
- [ ] Nouvelle balance affichée : **30 USDC** (10 + 20)
- [ ] Historique transactions montre les 2 achats
- [ ] Balance correcte sur blockchain

---

## 5. VENTE/RETRAIT (OFFRAMP)

### 5.1 Retrait vers compte bancaire

#### 🏦 Cas 5.1.A : Premier retrait

**Préconditions** :
- Wallet avec USDC (ex: 50 USDC)
- Pays supporté par Coinbase Offramp
- KYC validé

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Vérifier balance : 50 USDC
- [ ] Cliquer "Retirer vers compte bancaire"
- [ ] Vérifier ouverture Coinbase Offramp

**Dans Coinbase Offramp** :
- [ ] Saisir montant à retirer : **30 USDC**
- [ ] Vérifier frais affichés
- [ ] Vérifier montant net reçu (USD ou EUR)
- [ ] **Si premier retrait** :
  - [ ] Ajouter compte bancaire (IBAN, SWIFT, etc.)
  - [ ] Vérifier micro-dépôt si requis
- [ ] Confirmer la transaction
- [ ] Vérifier message "Retrait en cours"

**Après transaction** :
- [ ] Vérifier déduction USDC du wallet
- [ ] Nouvelle balance : **20 USDC** (50 - 30)
- [ ] Vérifier email de confirmation
- [ ] Attendre virement bancaire (1-5 jours selon pays)
- [ ] Vérifier réception sur compte bancaire

**Vérifications blockchain** :
- [ ] Transaction de sortie visible sur Basescan
- [ ] USDC transférés vers adresse Coinbase

---

#### ⚠️ Cas 5.1.B : Retrait avec montant > balance

**Préconditions** :
- Balance : 10 USDC

**Steps** :
- [ ] Essayer de retirer **20 USDC** (plus que la balance)
- [ ] Vérifier message d'erreur :
  - "Balance insuffisante"
  - Montant maximum disponible affiché
- [ ] Vérifier impossibilité de confirmer
- [ ] Ajuster montant à ≤ 10 USDC
- [ ] Vérifier retrait possible avec montant ajusté

---

### 5.2 Transfert vers wallet externe

#### 🔗 Cas 5.2.A : Transfert vers adresse externe Base

**Préconditions** :
- Balance : 30 USDC
- Adresse externe Base valide (ex: MetaMask)

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Cliquer "Retrait externe" ou "Envoyer"
- [ ] Saisir adresse destination (0x...)
- [ ] Vérifier validation adresse :
  - Format valide (checksum)
  - Réseau correct (Base)
- [ ] Saisir montant : **10 USDC**
- [ ] Vérifier frais de gas affichés
  - Si Smart Account : "Frais sponsorisés"
  - Si EOA : Montant en ETH
- [ ] Confirmer la transaction
- [ ] **Vérifier demande de confirmation OTP** (Email ou SMS)
- [ ] Saisir OTP pour autoriser
- [ ] Vérifier transaction envoyée

**Après transaction** :
- [ ] Vérifier déduction de la balance : 30 → 20 USDC
- [ ] Vérifier transaction sur Basescan
- [ ] Vérifier réception sur adresse externe (MetaMask)
- [ ] Vérifier montant reçu : 10 USDC

---

## 6. CRÉATION D'OFFRE (MARKETPLACE)

### 6.1 Offre d'achat NFT

#### 🎨 Cas 6.1.A : Offre avec balance suffisante

**Préconditions** :
- Wallet avec 50 USDC
- NFT disponible sur marketplace
- Prix NFT : 20 USDC

**Steps** :
- [ ] Naviguer vers marketplace CyLimit
- [ ] Sélectionner un NFT
- [ ] Cliquer "Faire une offre"
- [ ] Saisir montant : **20 USDC**
- [ ] Vérifier balance suffisante affichée
- [ ] Confirmer l'offre
- [ ] **Vérifier signature transaction avec Embedded Wallet**
- [ ] Vérifier demande OTP si configurée
- [ ] Saisir OTP si demandé
- [ ] Vérifier message "Offre créée"

**Vérifications blockchain** :
- [ ] Transaction visible sur Basescan
- [ ] Offre enregistrée on-chain
- [ ] Smart contract appelé correctement

**Vérifications frontend** :
- [ ] Offre affichée dans "Mes offres"
- [ ] Statut : "En attente"
- [ ] Balance USDC :
  - **Si réservation** : 50 → 30 USDC
  - **Si pas de réservation** : 50 USDC (inchangé jusqu'à acceptation)

---

#### ⚠️ Cas 6.1.B : Offre avec balance insuffisante

**Préconditions** :
- Balance : 5 USDC
- Prix NFT : 20 USDC

**Steps** :
- [ ] Essayer de faire une offre de 20 USDC
- [ ] Vérifier message d'erreur :
  - "Balance insuffisante"
  - "Vous avez 5 USDC, il vous en manque 15"
- [ ] Vérifier bouton "Acheter des USDC" proposé
- [ ] Cliquer sur "Acheter des USDC"
- [ ] Vérifier ouverture Onramp
- [ ] Acheter le montant manquant
- [ ] Retourner faire l'offre

---

### 6.2 Acceptation d'offre (vendeur)

#### 💸 Cas 6.2.A : Vendre NFT contre USDC

**Préconditions** :
- Posséder un NFT
- Recevoir une offre de 20 USDC
- Balance vendeur : 10 USDC

**Steps** :
- [ ] Voir notification "Nouvelle offre reçue"
- [ ] Naviguer vers "Mes NFTs" ou "Offres reçues"
- [ ] Voir offre : 20 USDC pour NFT #123
- [ ] Cliquer "Accepter l'offre"
- [ ] Vérifier récapitulatif :
  - NFT transféré à l'acheteur
  - Réception de 20 USDC
  - Frais potentiels
- [ ] Confirmer l'acceptation
- [ ] **Vérifier signature avec Embedded Wallet**
- [ ] Vérifier demande OTP si configurée
- [ ] Saisir OTP
- [ ] Vérifier message "Vente confirmée"

**Vérifications blockchain** :
- [ ] Transaction visible sur Basescan
- [ ] NFT transféré à l'acheteur
- [ ] 20 USDC transférés au vendeur

**Vérifications frontend** :
- [ ] Balance vendeur : 10 → **30 USDC** (10 + 20)
- [ ] NFT retiré de "Mes NFTs"
- [ ] NFT visible dans wallet acheteur
- [ ] Historique mis à jour

---

## 7. SÉCURITÉ & RÉCUPÉRATION

### 7.1 Changement d'email sur CyLimit

#### ✅ Cas 7.1.A : Changement AVANT création wallet

**Préconditions** :
- User CyLimit avec email A
- **Aucun wallet créé**

**Steps** :
- [ ] Aller dans Paramètres CyLimit
- [ ] Section "Email"
- [ ] Changer email : A → B
- [ ] Valider changement (confirmation par email)
- [ ] Email mis à jour en DB
- [ ] **Créer Embedded Wallet**
- [ ] Vérifier wallet créé avec **email B** (nouveau)

**Vérifications** :
- [ ] Pas de problème
- [ ] Wallet lié à email B
- [ ] OTP envoyés à email B

---

#### ❌ Cas 7.1.B : Changement APRÈS création wallet

**Préconditions** :
- User CyLimit avec email A
- **Wallet déjà créé** avec email A

**Steps** :
- [ ] Aller dans Paramètres CyLimit
- [ ] Section "Email"
- [ ] Essayer de changer email : A → B
- [ ] **Vérifier message de blocage** :
  - "Impossible de changer l'email"
  - "Votre wallet Coinbase est lié à cet email"
  - "Changer l'email rendrait votre wallet inaccessible"
  - Lien vers documentation de récupération
- [ ] Vérifier impossibilité de confirmer le changement

**Vérifications backend** :
- [ ] Endpoint PATCH /users/me/email vérifie `walletAddress`
- [ ] Si `walletAddress` existe → erreur 400
- [ ] Message explicatif retourné

**IMPORTANT** : Ce test valide la protection contre la perte d'accès au wallet.

---

### 7.2 Changement de téléphone sur CyLimit

#### ⚠️ Cas 7.2.A : Changement avec SMS comme méthode principale

**Préconditions** :
- Wallet créé avec **SMS principal**
- Téléphone A dans profil

**Steps** :
- [ ] Aller dans Paramètres CyLimit
- [ ] Essayer de changer téléphone : A → B
- [ ] Vérifier message d'avertissement similaire à l'email
- [ ] Vérifier blocage si SMS = méthode principale

---

#### 🔄 Cas 7.2.B : Changement avec SMS comme backup

**Préconditions** :
- Wallet créé avec **Email principal**
- SMS ajouté en backup
- Téléphone A dans profil CyLimit

**Steps** :
- [ ] Changer téléphone dans CyLimit : A → B
- [ ] Vérifier que le changement est possible
- [ ] **MAIS** : Le backup SMS sur Coinbase reste lié au téléphone A
- [ ] Vérifier message d'avertissement :
  - "Le téléphone CyLimit est mis à jour"
  - "Mais le backup wallet reste lié à l'ancien numéro"
  - "Pour changer le backup, utilisez le modal de gestion"

**IMPORTANT** : CyLimit DB ≠ Coinbase wallet. Les numéros peuvent diverger.

---

### 7.3 Perte d'accès

#### ✅ Cas 7.3.A : Perte accès email principal (avec backup SMS)

**Préconditions** :
- Wallet créé avec Email A
- SMS backup configuré
- **Perte d'accès à email A** (ex: email fermé, mot de passe oublié)

**Steps** :
- [ ] Essayer de se connecter avec Email A
- [ ] Ne pas recevoir l'OTP (email inaccessible)
- [ ] Ouvrir modal Wallet
- [ ] **Basculer sur SMS**
- [ ] Saisir le numéro de téléphone backup
- [ ] Demander OTP SMS
- [ ] Recevoir OTP sur téléphone
- [ ] Saisir OTP
- [ ] **Vérifier accès au wallet récupéré** ✅

**Vérifications CRITIQUES** :
- [ ] ✅ Accès au MÊME wallet
- [ ] ✅ Même adresse
- [ ] ✅ Même balance
- [ ] ✅ Tous les fonds accessibles
- [ ] ✅ NFTs présents

**Message à l'user** :
- [ ] "Accès récupéré grâce à votre méthode backup"
- [ ] "Pensez à mettre à jour votre email principal"

**IMPORTANT** : **C'EST LE CAS D'USAGE CLÉ DU BACKUP !**

---

#### ❌ Cas 7.3.B : Perte accès email (SANS backup)

**Préconditions** :
- Wallet créé avec Email A uniquement
- **Pas de backup SMS configuré**
- Perte d'accès à email A

**Steps** :
- [ ] Essayer de se connecter
- [ ] Ne pas recevoir OTP
- [ ] Ouvrir modal Wallet
- [ ] Vérifier **aucune alternative** disponible
- [ ] Contacter support

**Vérifications** :
- [ ] ❌ **Impossibilité de récupérer le wallet**
- [ ] ❌ Fonds inaccessibles
- [ ] Message d'avertissement avait été affiché lors de la création
- [ ] Vérifier que le message "Limitation Coinbase" était visible

**IMPORTANT** : Documenter ce cas pour sensibiliser les users à l'importance du backup.

---

#### 🚨 Cas 7.3.C : Perte des 2 méthodes

**Préconditions** :
- Wallet avec Email + SMS
- **Perte d'accès aux deux**

**Steps** :
- [ ] Essayer de se connecter avec Email → échec
- [ ] Essayer de se connecter avec SMS → échec
- [ ] Contacter support Coinbase
- [ ] Vérifier que même Coinbase ne peut pas récupérer

**Résultat** :
- [ ] ❌ **Perte définitive du wallet**
- [ ] ❌ Fonds inaccessibles de manière permanente
- [ ] Seule solution : export préventif de la clé privée (non implémenté)

---

## 8. CAS PAR PAYS/RÉGION

### 8.1 Pays avec SMS disponible (23 pays)

#### 🌍 Cas 8.1.A : USA, France, UK, Allemagne, etc.

**Préconditions** :
- User dans l'un des 23 pays supportés
- Détection IP correcte

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Sélectionner méthode "SMS"
- [ ] Vérifier champ téléphone :
  - **Pays pré-sélectionné** selon IP
  - Drapeau du pays affiché
  - Indicatif pays correct (ex: +33 pour France)
- [ ] Saisir numéro national (sans indicatif)
- [ ] Vérifier formatage automatique
- [ ] Envoyer OTP
- [ ] **Vérifier réception SMS**
- [ ] Valider OTP
- [ ] Vérifier wallet créé

**Liste des 23 pays à tester** :
- [ ] 🇺🇸 USA (+1)
- [ ] 🇫🇷 France (+33)
- [ ] 🇬🇧 UK (+44)
- [ ] 🇩🇪 Allemagne (+49)
- [ ] 🇪🇸 Espagne (+34)
- [ ] 🇮🇹 Italie (+39)
- [ ] 🇨🇦 Canada (+1)
- [ ] 🇦🇺 Australie (+61)
- [ ] (+ 15 autres selon la doc Coinbase)

---

### 8.2 Pays SANS SMS disponible

#### 🚫 Cas 8.2.A : Pays non supporté pour SMS

**Préconditions** :
- User dans un pays NON dans la liste des 23
- Détection IP correcte

**Steps** :
- [ ] Ouvrir modal Wallet
- [ ] Vérifier que méthode "SMS" est **désactivée** ou **non proposée**
- [ ] Voir uniquement "Email" disponible
- [ ] Vérifier message explicatif :
  - "SMS non disponible dans votre pays"
  - "Utilisez l'email pour créer votre wallet"
- [ ] Créer wallet avec Email uniquement
- [ ] Vérifier impossibilité d'ajouter backup SMS

---

## 9. TRANSACTIONS & GAS

### 9.1 Gas Sponsorship (Smart Account)

#### ⛽ Cas 9.1.A : Transaction avec gas sponsorisé

**Préconditions** :
- Wallet de type **Smart Account**
- Gas Sponsorship activé (via CDP)

**Steps** :
- [ ] Envoyer 10 USDC à une adresse
- [ ] Vérifier récapitulatif transaction :
  - Montant : 10 USDC
  - Frais : **0 ETH** (ou "Frais sponsorisés")
- [ ] Confirmer transaction
- [ ] Vérifier transaction confirmée

**Vérifications blockchain** :
- [ ] Transaction visible sur Basescan
- [ ] Gas payé par le **paymaster** (adresse Coinbase)
- [ ] User n'a pas besoin d'avoir d'ETH dans le wallet

**Vérifications backend (logs)** :
```
✅ À surveiller :
[CDP] Gas sponsorship applied
[CDP] Paymaster: 0x...
```

---

#### 💸 Cas 9.1.B : Transaction avec gas non sponsorisé

**Préconditions** :
- Wallet de type **EOA** (Externally Owned Account)
- OU : Gas sponsorship désactivé

**Steps** :
- [ ] Envoyer 10 USDC
- [ ] Vérifier demande de frais :
  - Montant : 10 USDC
  - Frais : 0.0001 ETH (estimé)
- [ ] Vérifier balance ETH suffisante
- [ ] **Si balance ETH insuffisante** :
  - [ ] Voir message d'erreur
  - [ ] Proposition d'acheter ETH
- [ ] Confirmer transaction
- [ ] Vérifier déduction ETH pour gas

---

### 9.2 Batch Transactions

#### 🎯 Cas 9.2.A : Transfert multiple USDC

**Préconditions** :
- Balance : 50 USDC
- 3 adresses destinataires valides

**Steps** :
- [ ] Initier transfert vers 3 adresses :
  - Adresse A : 10 USDC
  - Adresse B : 15 USDC
  - Adresse C : 5 USDC
  - Total : 30 USDC
- [ ] Vérifier récapitulatif batch :
  - 3 transferts en 1 transaction
  - Total : 30 USDC
  - Frais : 1 seule fois
- [ ] Confirmer batch
- [ ] Vérifier transaction unique sur blockchain

**Vérifications** :
- [ ] ✅ Atomicité : Tout réussit OU tout échoue
- [ ] ✅ 1 seule transaction on-chain
- [ ] ✅ Frais réduits vs 3 transactions séparées
- [ ] Balance finale : 50 - 30 = **20 USDC**

---

## 10. EXPÉRIENCE UTILISATEUR

### 10.1 UI/UX Général

#### 🌐 Cas 10.1.A : Traductions FR/EN

**Steps** :
- [ ] Langue : Français
  - [ ] Ouvrir modal Wallet
  - [ ] Vérifier tous les textes en français
  - [ ] Vérifier toasts en français
  - [ ] Vérifier messages d'erreur en français
- [ ] Changer langue → Anglais
- [ ] Rouvrir modal Wallet
- [ ] Vérifier tous les textes en anglais
- [ ] Vérifier cohérence des traductions

**Clés de traduction à vérifier** :
- [ ] `wallet.backup.title`
- [ ] `wallet.backup.coinbase_limitation`
- [ ] `wallet.backup.add_email`
- [ ] `wallet.backup.add_phone`
- [ ] `embedded_wallet_*`
- [ ] Messages d'erreur

---

#### 🎨 Cas 10.1.B : Messages d'erreur clairs

**Steps** :
- [ ] Déclencher diverses erreurs :
  - Balance insuffisante
  - OTP invalide
  - Email déjà lié
  - Numéro déjà lié
  - Network error
- [ ] Vérifier pour chaque erreur :
  - Message clair et explicite
  - Suggestion d'action
  - Pas de code technique brut
  - Toast avec icône appropriée

---

#### ⏳ Cas 10.1.C : Loading states

**Steps** :
- [ ] Création wallet : Spinner + "Création en cours..."
- [ ] Envoi OTP : Spinner + "Envoi du code..."
- [ ] Vérification OTP : Spinner + "Vérification..."
- [ ] Transaction : Spinner + "Transaction en cours..."
- [ ] Chargement balance : Skeleton loader
- [ ] Vérifier pas de blocage UI
- [ ] Vérifier possibilité d'annuler si applicable

---

### 10.2 Performance

#### ⚡ Cas 10.2.A : Temps de création wallet

**Steps** :
- [ ] Chronomètre : démarrer
- [ ] Créer un wallet (Email ou SMS)
- [ ] Valider OTP
- [ ] Chronomètre : arrêter
- [ ] **Vérifier temps < 500ms** (après validation OTP)
- [ ] Selon doc Coinbase : "Wallets created in under 500ms"

---

#### 🔄 Cas 10.2.B : Refresh de balance

**Steps** :
- [ ] Faire un achat d'USDC
- [ ] Observer la mise à jour de la balance
- [ ] Vérifier pas de lag
- [ ] Vérifier mise à jour automatique (polling ou websocket)
- [ ] Faire un refresh manuel si bouton présent
- [ ] Vérifier temps de refresh < 2s

---

#### 📧 Cas 10.2.C : Pas de multiple OTP au refresh (BUG CORRIGÉ)

**Steps** :
- [ ] Wallet connecté
- [ ] Refresh la page (F5) **3 fois**
- [ ] **Vérifier AUCUN email OTP reçu**
- [ ] Vérifier console : cooldown localStorage actif
- [ ] Attendre 5 minutes (expiration cooldown)
- [ ] Refresh à nouveau
- [ ] **Vérifier toujours AUCUN OTP envoyé** (reconnexion silencieuse)

**SI OTP REÇUS** :
- ❌ Bug : auto-connexion appelle signInWithEmail()
- ❌ Vérifier que le SDK gère le refresh automatiquement

---

### 10.3 Messages d'avertissement

#### ⚠️ Cas 10.3.A : "Limitation Coinbase" visible

**Steps** :
- [ ] Ouvrir modal de gestion des méthodes
- [ ] Vérifier message orange "Limitation Coinbase" en bas
- [ ] Vérifier visible dans tous les états :
  - Aucune méthode
  - 1 méthode
  - 2 méthodes
  - Étape input
  - Étape OTP
- [ ] Vérifier texte complet et clair

---

#### 📧 Cas 10.3.B : Avertissement accès email lors de création

**Steps** :
- [ ] Créer un wallet
- [ ] Avant validation OTP, vérifier message :
  - "Assurez-vous d'avoir accès à cet email"
  - "Si vous perdez l'accès, vous ne pourrez pas récupérer vos fonds"
  - "Nous vous recommandons d'ajouter une 2e méthode"
- [ ] Lien vers paramètres si besoin de changer email

---

## MATRICE DE TEST RÉCAPITULATIVE

| Profil User | Méthode Création | Backup Ajouté | Balance Initiale | Cas à Tester | Priorité |
|-------------|------------------|---------------|------------------|--------------|----------|
| **Nouveau + Email CyLimit** | Email | SMS | 0 USDC | 1.1.A → 2.1.A → 4.1.A → 5.1.A → 6.1.A | 🔴 Haute |
| **Nouveau + Email CyLimit** | Email | Aucun | 0 USDC | 1.1.A → 7.3.B | 🔴 Haute |
| **Nouveau + Tel CyLimit** | SMS | Email | 0 USDC | 1.1.B → 2.2.A | 🔶 Moyenne |
| **Nouveau + Email + Tel** | Email | SMS | 0 USDC | 1.1.C (A) → 2.1.A | 🔴 Haute |
| **Nouveau + Email + Tel** | SMS | Email | 0 USDC | 1.1.C (B) → 2.2.A | 🔶 Moyenne |
| **Ancien (Polygon)** | Email | SMS | 53 USDC | 1.2.A → 2.1.A | 🔴 Haute |
| **Ancien (Polygon)** | SMS | Email | 53 USDC | 1.2.B → 2.2.A | 🔶 Moyenne |
| **Existant** | Email + SMS | N/A | 50 USDC | 3.1.B → 6.1.A | 🔴 Haute |
| **Existant** | Email + SMS | N/A | 10 USDC | 6.1.B | 🔶 Moyenne |
| **Récupération** | Email (perdu) | SMS (backup) | 50 USDC | 7.3.A | 🔴 Haute |

---

## CHECKLIST PRIORITAIRE

### 🔴 **HAUTE PRIORITÉ** (Tests critiques à faire EN PREMIER)

#### Création & Migration
- [ ] **1.1.C (A)** : Création wallet Email + backup SMS (cas le plus courant)
- [ ] **1.2.A** : Migration automatique ancien user Polygon → Base
- [ ] **1.2.C** : Migration avec erreur (wallet créé quand même)

#### Backup & Récupération
- [ ] **2.1.A** : Ajout backup SMS avec téléphone CyLimit pré-rempli
- [ ] **7.3.A** : Récupération via backup method (cas d'usage clé)
- [ ] **7.1.B** : Blocage changement email si wallet existe

#### Performance & UX
- [ ] **3.1.B** : Refresh page SANS envoi OTP (bug corrigé ✅)
- [ ] **10.2.C** : Cooldown localStorage actif (pas de spam OTP)

#### Transactions
- [ ] **4.1.A** : Premier achat USDC (Onramp)
- [ ] **6.1.A** : Création offre NFT avec balance suffisante

---

### 🔶 **PRIORITÉ MOYENNE** (Tests importants mais moins critiques)

#### Gestion des méthodes
- [ ] **2.3.A** : Affichage 2 méthodes configurées
- [ ] **2.4.A** : Gestion erreur "Numéro déjà lié"

#### Session & Reconnexion
- [ ] **3.2.B** : Reconnexion avec méthode backup (au lieu de principale)
- [ ] **3.3.A** : Multi-device (2 appareils)

#### Transactions
- [ ] **5.1.A** : Premier retrait vers compte bancaire
- [ ] **6.1.B** : Offre avec balance insuffisante

---

### 🔵 **PRIORITÉ BASSE** (Tests edge cases)

#### Cas limites
- [ ] **1.1.D** : User sans email ni téléphone
- [ ] **3.3.B** : Test limite 5 appareils
- [ ] **8.2.A** : Test pays non supporté SMS
- [ ] **9.2.A** : Batch transactions
- [ ] **2.4.D** : OTP expiré

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

### Jour 1 : Tests de base
1. ✅ 1.1.C (A) - Création wallet standard
2. ✅ 2.1.A - Ajout backup
3. ✅ 3.1.B - Refresh sans OTP
4. ✅ 4.1.A - Premier achat

### Jour 2 : Migration & Récupération
1. ✅ 1.2.A - Migration automatique
2. ✅ 1.2.C - Migration avec erreur
3. ✅ 7.3.A - Récupération via backup
4. ✅ 7.1.B - Blocage changement email

### Jour 3 : Transactions & Edge cases
1. ✅ 6.1.A - Création offre
2. ✅ 5.1.A - Retrait
3. ✅ 3.2.B - Reconnexion backup
4. ✅ Tests cas limites

---

## 📝 NOTES IMPORTANTES

### ⚠️ Limitations Coinbase à documenter

1. **Auth Method Linking** :
   - ❌ Impossible de supprimer une méthode
   - ❌ Impossible de changer une méthode
   - ✅ Seulement ajouter (max 2 : Email + SMS)

2. **Récupération** :
   - ✅ Backup method fonctionne
   - ❌ Sans backup = perte définitive
   - ❌ Même Coinbase ne peut pas récupérer

3. **Session** :
   - ✅ Refresh automatique pendant 7 jours
   - ❌ Après 7 jours = reconnexion manuelle
   - ✅ Multi-device supporté (max 5)

## 📝 NOTES IMPORTANTES

### ⚠️ Limitations Coinbase à documenter

1. **Auth Method Linking** :
   - ❌ Impossible de supprimer une méthode
   - ❌ Impossible de changer une méthode
   - ✅ Seulement ajouter (max 2 : Email + SMS)

2. **Récupération** :
   - ✅ Backup method fonctionne
   - ❌ Sans backup = perte définitive
   - ❌ Même Coinbase ne peut pas récupérer

3. **Session** :
   - ✅ Refresh automatique pendant 7 jours
   - ❌ Après 7 jours = reconnexion manuelle
   - ✅ Multi-device supporté (max 5)

### 🐛 Bugs connus (corrigés)

1. ✅ **Multiple OTP au refresh** :
   - Cause : signInWithEmail() appelé au chargement
   - Fix : Cooldown localStorage + SDK gère le refresh
   - Test : 3.1.B et 10.2.C

2. ✅ **Traductions manquantes** :
   - Cause : Textes hardcodés en français
   - Fix : Intégration useTranslation partout
   - Test : 10.1.A

3. ✅ **Redirection vers open-the-pack en tests E2E** (28 oct 2025) :
   - Cause : Nouvel utilisateur redirigé automatiquement vers /open-the-pack après confirmation email
   - Fix : Cookie `e2e-test-mode=true` pour skip la redirection en mode test
   - Fichiers modifiés :
     - `src/features/VerifyEmail/index.tsx` : Détection cookie pour redirect conditionnel
     - `src/queries/useAuth.ts` : Détection cookie pour skip OPEN_THE_PACK
     - `tests/e2e/wallet-creation-email-backup-sms.spec.ts` : Ajout du cookie en début de test
   - Test : Cas 1.1.C(A) automatisé

4. ✅ **Configuration SMTP MailHog pour tests E2E** (28 oct 2025) :
   - Problème : Backend n'envoyait pas les emails à MailHog
   - Fixes appliqués :
     - Port SMTP : 587 → 1025 (port MailHog)
     - TLS désactivé pour MailHog uniquement (détection auto via port)
     - Production reste sécurisée (TLS activé sur ports 465/587)
     - API MailHog : ajout du path `/mailhog`
     - Décodage Quoted-Printable des emails HTML
   - Fichiers modifiés :
     - `backend/src/modules/mail/mail.module.ts` : Config SMTP conditionnelle
     - `backend/.env` : SMTP_PORT=1025
     - `frontend/tests/utils/mailhog.ts` : Décodage QP + API path
   - Statut : ✅ Emails envoyés et reçus correctement

5. ✅ **Pages publiques déclenchant des redirections** (28 oct 2025) :
   - Problème : CoinbaseWalletProvider faisait des appels API sur /sign-up causant redirect vers /sign-in
   - Fix : Render conditionnel du provider uniquement sur pages privées
   - Fichier modifié : `src/pages/_app.tsx`
   - Statut : ✅ Navigation publique fonctionnelle

6. ⚠️ **OTP Coinbase non récupérable en tests locaux** (28 oct 2025) :
   - **Problème** : Coinbase envoie les OTP depuis ses propres serveurs SMTP
   - **Impact** : MailHog ne peut pas intercepter les emails OTP de Coinbase
   - **Distinction** :
     - ✅ Email CyLimit (confirmation inscription) → Envoyé par notre backend → Récupérable via MailHog
     - ⚠️ Email Coinbase (OTP wallet) → Envoyé par Coinbase → NON récupérable via MailHog
   - **Solutions possibles** :
     1. Utiliser Mailosaur ($20/mois) pour intercepter les OTP Coinbase
     2. Utiliser un vrai email avec récupération automatisée via API (Gmail, Outlook)
     3. Tests manuels pour la partie OTP Coinbase
   - **Tests automatisés actuellement** : Inscription → Email confirmation → Modal wallet → Demande OTP ✅
   - **Tests manuels requis** : Saisie OTP Coinbase → Création wallet → Backup SMS
   - Statut : ⚠️ Limitation technique (pas un bug)

---

## 📧 CONTACTS & RESSOURCES

- **Documentation Coinbase** : https://docs.cdp.coinbase.com/embedded-wallets/
- **Auth Method Linking** : https://docs.cdp.coinbase.com/embedded-wallets/auth-method-linking
- **Support Coinbase** : Via CDP Portal
- **Slack CyLimit** : Canal #migrations pour alerts

---

**Bonne chance pour les tests ! 🧪✨**

