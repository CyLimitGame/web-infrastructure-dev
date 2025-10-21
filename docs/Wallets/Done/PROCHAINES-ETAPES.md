# 📋 PROCHAINES ÉTAPES - WALLET SYSTEM

**Date :** 10 octobre 2025  
**Phases complétées :** ✅ Phase 1, 2, 3, 4  
**Phases restantes :** 🔄 Phase 5 (optionnelle)

---

## 🎯 CE QUI EST FAIT

### ✅ Backend (Admin)
- NFT Sync Service avec cron job quotidien
- Endpoints admin protégés (AuthAdminGuard)
- Pending Rewards System avec retry automatique
- Scripts de test bash

### ✅ Backend (User)
- NFT Sync Service pour vérification ownership au listing
- Wallet Address Sync (fix bug comparaison types)
- Auto-process pending rewards (nouveau wallet)

### ✅ Frontend
- Embedded Wallet (auth email/OTP)
- WalletOnboardingModal (skippable, affichage auto)
- WalletRequiredModal (bloquante)
- Hook useWalletRequired
- Intégration dans _app.tsx

---

## 🔄 PHASE 5 (OPTIONNELLE) : INTÉGRATION MARKETPLACE

### Objectif
Intégrer `useWalletRequired` et `WalletRequiredModal` dans tous les composants marketplace qui nécessitent un wallet.

### Composants à modifier

#### 1. BuyNFTButton

**Localisation :** `cylimit-frontend-develop/src/features/marketplace/BuyNFTButton.tsx` (à localiser)

**Modifications :**

```typescript
import { useWalletRequired } from '@/hooks/useWalletRequired';
import { WalletRequiredModal } from '@/components/wallet';

const BuyNFTButton = ({ nftId, price }) => {
  const { 
    checkWalletRequired, 
    showWalletRequiredModal, 
    isWalletRequired, 
    actionType, 
    hideWalletRequiredModal 
  } = useWalletRequired();
  
  const handleBuy = async () => {
    // 1. Vérifier wallet
    if (!checkWalletRequired('buy')) {
      showWalletRequiredModal('buy');
      return;
    }
    
    // 2. Procéder à l'achat
    // ... existing logic
  };
  
  const handleWalletCreatedAndRetry = () => {
    hideWalletRequiredModal();
    handleBuy();
  };
  
  return (
    <>
      <Button onClick={handleBuy}>
        Acheter pour {price} USDC
      </Button>
      
      <WalletRequiredModal
        isOpen={isWalletRequired}
        onClose={hideWalletRequiredModal}
        actionType={actionType}
        onWalletCreated={handleWalletCreatedAndRetry}
      />
    </>
  );
};
```

**Temps estimé :** 15-20 min

---

#### 2. SellNFTButton

**Localisation :** `cylimit-frontend-develop/src/features/marketplace/SellNFTButton.tsx` (à localiser)

**Modifications :**

```typescript
import { useWalletRequired } from '@/hooks/useWalletRequired';
import { WalletRequiredModal } from '@/components/wallet';

const SellNFTButton = ({ nftId }) => {
  const { 
    checkWalletRequired, 
    showWalletRequiredModal, 
    isWalletRequired, 
    actionType, 
    hideWalletRequiredModal 
  } = useWalletRequired();
  
  const handleSell = async (fixedPrice: number) => {
    // 1. Vérifier wallet
    if (!checkWalletRequired('sell')) {
      showWalletRequiredModal('sell');
      return;
    }
    
    // 2. Procéder au listing
    // ... existing logic
  };
  
  const handleWalletCreatedAndRetry = () => {
    hideWalletRequiredModal();
    handleSell(/* saved price */);
  };
  
  return (
    <>
      <Button onClick={() => handleSell(10)}>
        Lister pour 10 USDC
      </Button>
      
      <WalletRequiredModal
        isOpen={isWalletRequired}
        onClose={hideWalletRequiredModal}
        actionType={actionType}
        onWalletCreated={handleWalletCreatedAndRetry}
      />
    </>
  );
};
```

**Temps estimé :** 15-20 min

---

#### 3. WithdrawButton

**Localisation :** `cylimit-frontend-develop/src/features/wallet/WithdrawButton.tsx` (à créer/localiser)

**Modifications :**

```typescript
import { useWalletRequired } from '@/hooks/useWalletRequired';
import { WalletRequiredModal } from '@/components/wallet';

const WithdrawButton = ({ amountUSDC, destinationAddress }) => {
  const { 
    checkWalletRequired, 
    showWalletRequiredModal, 
    isWalletRequired, 
    actionType, 
    hideWalletRequiredModal 
  } = useWalletRequired();
  
  const handleWithdraw = async () => {
    // 1. Vérifier wallet
    if (!checkWalletRequired('withdraw')) {
      showWalletRequiredModal('withdraw');
      return;
    }
    
    // 2. Procéder au retrait
    // ... call API /wallet/withdraw
  };
  
  const handleWalletCreatedAndRetry = () => {
    hideWalletRequiredModal();
    handleWithdraw();
  };
  
  return (
    <>
      <Button onClick={handleWithdraw}>
        Retirer {amountUSDC} USDC
      </Button>
      
      <WalletRequiredModal
        isOpen={isWalletRequired}
        onClose={hideWalletRequiredModal}
        actionType={actionType}
        onWalletCreated={handleWalletCreatedAndRetry}
      />
    </>
  );
};
```

**Temps estimé :** 15-20 min

---

#### 4. ReceiveButton / AddFundsButton

**Localisation :** `cylimit-frontend-develop/src/features/wallet/ReceiveButton.tsx` (à créer/localiser)

**Modifications :**

```typescript
import { useWalletRequired } from '@/hooks/useWalletRequired';
import { WalletRequiredModal } from '@/components/wallet';

const ReceiveButton = () => {
  const { 
    checkWalletRequired, 
    showWalletRequiredModal, 
    isWalletRequired, 
    actionType, 
    hideWalletRequiredModal 
  } = useWalletRequired();
  
  const { address } = useEmbeddedWallet();
  
  const handleShowAddress = () => {
    // 1. Vérifier wallet
    if (!checkWalletRequired('receive')) {
      showWalletRequiredModal('receive');
      return;
    }
    
    // 2. Afficher QR code / copier adresse
    // ... show modal with address
  };
  
  const handleWalletCreatedAndRetry = () => {
    hideWalletRequiredModal();
    handleShowAddress();
  };
  
  return (
    <>
      <Button onClick={handleShowAddress}>
        Recevoir des fonds
      </Button>
      
      <WalletRequiredModal
        isOpen={isWalletRequired}
        onClose={hideWalletRequiredModal}
        actionType={actionType}
        onWalletCreated={handleWalletCreatedAndRetry}
      />
    </>
  );
};
```

**Temps estimé :** 15-20 min

---

#### 5. TransferNFTButton

**Localisation :** `cylimit-frontend-develop/src/features/nft/TransferNFTButton.tsx` (à créer/localiser)

**Modifications :**

```typescript
import { useWalletRequired } from '@/hooks/useWalletRequired';
import { WalletRequiredModal } from '@/components/wallet';

const TransferNFTButton = ({ nftId, recipientAddress }) => {
  const { 
    checkWalletRequired, 
    showWalletRequiredModal, 
    isWalletRequired, 
    actionType, 
    hideWalletRequiredModal 
  } = useWalletRequired();
  
  const handleTransfer = async () => {
    // 1. Vérifier wallet
    if (!checkWalletRequired('transfer')) {
      showWalletRequiredModal('transfer');
      return;
    }
    
    // 2. Procéder au transfert
    // ... call API /nfts/:nftId/transfer
  };
  
  const handleWalletCreatedAndRetry = () => {
    hideWalletRequiredModal();
    handleTransfer();
  };
  
  return (
    <>
      <Button onClick={handleTransfer}>
        Transférer ce NFT
      </Button>
      
      <WalletRequiredModal
        isOpen={isWalletRequired}
        onClose={hideWalletRequiredModal}
        actionType={actionType}
        onWalletCreated={handleWalletCreatedAndRetry}
      />
    </>
  );
};
```

**Temps estimé :** 15-20 min

---

### Temps total Phase 5 : 1h15 - 1h40

---

## 🧪 TESTS END-TO-END

### 1. Tests Admin Backend

#### Test NFT Sync Endpoints

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-admin-backend

# 1. Lancer backend admin
npm run start:dev

# 2. Dans un autre terminal
export TOKEN_ADMIN="<YOUR_ADMIN_JWT>"
export NFT_ID="<REAL_NFT_ID>"
bash test-nft-sync-endpoints.sh
```

**Vérifications :**
- ✅ Endpoint `/admin/nft/sync/:nftId` retourne ownership
- ✅ Endpoint `/admin/nft/sync/audit` lance audit en background
- ✅ Endpoints protégés (401 sans token)
- ✅ Logs backend affichent progression audit

**Temps estimé :** 30 min

---

#### Test Pending Rewards

**Scénario 1 : User avec wallet**

```bash
# Via Postman/Insomnia ou curl
POST http://localhost:3001/v1/admin/rewards
Authorization: Bearer <TOKEN_ADMIN>
Content-Type: application/json

{
  "userId": "<USER_ID_WITH_WALLET>",
  "amountUSDC": 10,
  "reason": "Test reward avec wallet",
  "requiresAdminApproval": false
}
```

**Vérifications :**
- ✅ Reward créé avec status `pending`
- ✅ Reward auto-process (status `processing` → `sent`)
- ✅ txHash enregistré dans DB
- ✅ Email confirmation envoyé

**Scénario 2 : User sans wallet**

```bash
POST http://localhost:3001/v1/admin/rewards
{
  "userId": "<USER_ID_WITHOUT_WALLET>",
  "amountUSDC": 10,
  "reason": "Test reward sans wallet",
  "requiresAdminApproval": false
}
```

**Vérifications :**
- ✅ Reward créé avec status `pending`
- ✅ Email notification envoyé ("Crée ton wallet pour recevoir 10 USDC")
- ✅ Reward reste en `pending` (pas de wallet)

**Puis user crée wallet :**

```bash
# Frontend : User crée wallet
# Backend : Cron job détecte nouveau wallet (1 min max)
```

**Vérifications :**
- ✅ Reward auto-process (status `processing` → `sent`)
- ✅ txHash enregistré
- ✅ Email confirmation envoyé

**Scénario 3 : Retry failed reward**

```bash
# Simuler échec (ex: wallet rewards vide)
# Reward passe en status `failed`

# Attendre cron job (5 min max)
```

**Vérifications :**
- ✅ Reward retry automatiquement (exponential backoff)
- ✅ retryCount incrémenté
- ✅ lastRetryAt mis à jour
- ✅ Si succès : status `sent`
- ✅ Si échec : reste `failed` jusqu'à prochaine retry

**Temps estimé :** 1h

---

### 2. Tests User Backend

#### Test NFT Sync Listing

```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop

# 1. Lancer backend user
npm run start:dev

# 2. Dans un autre terminal
export TOKEN_USER="<YOUR_USER_JWT>"
export NFT_ID="<NFT_OWNED_BY_USER>"
export NFT_ID_NOT_OWNED="<NFT_NOT_OWNED_BY_USER>"
bash test-nft-sync-listing.sh
```

**Vérifications :**
- ✅ Listing NFT owned : succès
- ✅ Listing NFT not owned : erreur 400 "You don't own this NFT anymore"
- ✅ Logs backend affichent vérification ownership
- ✅ Si désynchronisé : correction automatique en DB

**Temps estimé :** 30 min

---

### 3. Tests Frontend

#### Test WalletOnboardingModal

**Scénario 1 : Premier login (nouveau user)**

```bash
1. Supprimer localStorage complet (DevTools)
2. Signup nouveau user
3. Login
4. Attendre 1 seconde
5. Vérifier : WalletOnboardingModal s'affiche
6. Cliquer "Plus tard"
7. Vérifier : localStorage.getItem('walletOnboardingSkipped') === 'true'
8. Recharger page
9. Vérifier : Modal ne s'affiche plus
```

**Temps estimé :** 10 min

---

**Scénario 2 : Création wallet via onboarding**

```bash
1. Nouveau user login (supprimer localStorage avant)
2. Attendre 1 seconde
3. Vérifier : WalletOnboardingModal s'affiche
4. Cliquer "Créer maintenant"
5. Vérifier : WalletOnboardingModal se ferme
6. Vérifier : WalletAuthModal s'affiche
7. Entrer email (email CyLimit du user)
8. Recevoir OTP par email
9. Entrer OTP
10. Vérifier : Wallet créé (address affiché)
11. Vérifier : localStorage.getItem('walletOnboardingSkipped') === 'true'
12. Recharger page
13. Vérifier : Aucun modal ne s'affiche
```

**Temps estimé :** 15 min

---

#### Test WalletRequiredModal (Marketplace)

**Scénario 1 : User sans wallet essaie d'acheter NFT**

```bash
1. User login (sans wallet)
2. Aller sur page marketplace
3. Cliquer "Acheter" sur un NFT
4. Vérifier : WalletRequiredModal s'affiche
5. Vérifier : Message "Wallet requis pour acheter"
6. Cliquer "Créer mon wallet"
7. Vérifier : WalletRequiredModal se ferme
8. Vérifier : WalletAuthModal s'affiche
9. Créer wallet (email + OTP)
10. Vérifier : Callback `onWalletCreated` déclenché
11. Vérifier : Action "Acheter" re-triggered automatiquement
```

**Temps estimé :** 20 min

---

**Scénario 2 : User avec wallet peut acheter NFT**

```bash
1. User login (avec wallet)
2. Aller sur page marketplace
3. Cliquer "Acheter" sur un NFT
4. Vérifier : WalletRequiredModal NE S'AFFICHE PAS
5. Vérifier : Modal confirmation achat s'affiche directement
6. Confirmer achat
7. Vérifier : Transaction réussie
```

**Temps estimé :** 10 min

---

### Temps total tests : 3h - 3h30

---

## 📊 CHECKLIST COMPLÈTE

### Backend (Admin)

- ✅ NFT Sync Service créé
- ✅ Cron job quotidien configuré (3h AM)
- ✅ Endpoints admin protégés (AuthAdminGuard)
- ✅ Pending Rewards System créé
- ✅ Cron jobs retry automatique
- ✅ Admin approval/cancel rewards
- ✅ Scripts de test bash créés
- 🔄 Tests endpoints admin effectués
- 🔄 Tests pending rewards effectués

### Backend (User)

- ✅ NFT Sync Service adapté
- ✅ Vérification ownership au listing
- ✅ Wallet Address Sync (fix bug)
- ✅ Auto-process pending rewards (nouveau wallet)
- ✅ Scripts de test bash créés
- 🔄 Tests vérification ownership effectués

### Frontend

- ✅ Hook useWalletRequired créé
- ✅ WalletOnboardingModal créé
- ✅ WalletRequiredModal créé
- ✅ Intégration dans _app.tsx
- ✅ Exemple d'intégration (BuyNFTButton.example.tsx)
- 🔄 Intégration composants marketplace réels
- 🔄 Tests onboarding modal effectués
- 🔄 Tests required modal effectués

---

## 🎯 RÉSUMÉ TEMPS ESTIMÉ

| Tâche | Temps estimé |
|-------|--------------|
| Phase 5 : Intégration marketplace | 1h15 - 1h40 |
| Tests Admin Backend | 1h30 |
| Tests User Backend | 30 min |
| Tests Frontend | 55 min |
| **TOTAL** | **4h10 - 4h35** |

---

## 🚀 COMMENCER PAR QUOI ?

### Option 1 : Tests d'abord (Recommandé)

**Avantages :**
- Valider que tout fonctionne avant intégration marketplace
- Identifier bugs potentiels tôt
- Confiance pour Phase 5

**Ordre :**
1. Tests Admin Backend (1h30)
2. Tests User Backend (30 min)
3. Tests Frontend (55 min)
4. Phase 5 : Intégration marketplace (1h15 - 1h40)

**Temps total : 4h10 - 4h35**

---

### Option 2 : Intégration marketplace d'abord

**Avantages :**
- Fonctionnalités complètes rapidement
- Tests intégrés ensuite

**Ordre :**
1. Phase 5 : Intégration marketplace (1h15 - 1h40)
2. Tests Frontend (55 min)
3. Tests Admin Backend (1h30)
4. Tests User Backend (30 min)

**Temps total : 4h10 - 4h35**

---

## 📝 NOTES IMPORTANTES

### Variables environnement à configurer

**Avant tests production :**

```bash
# Admin Backend (.env)
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<VOTRE_VRAIE_CLE>
NFT_CONTRACT_ADDRESS=<ADRESSE_CONTRAT_REEL_POLYGON>

# User Backend (.env)
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<VOTRE_VRAIE_CLE>
NFT_CONTRACT_ADDRESS=<ADRESSE_CONTRAT_REEL_POLYGON>
```

### Tokens à préparer

```bash
# Admin Backend
TOKEN_ADMIN=<JWT avec role ADMIN, généré via /admin/auth/login>

# User Backend
TOKEN_USER=<JWT user normal, généré via /auth/login>
```

### IDs à préparer

```bash
# NFT IDs pour tests
NFT_ID=<ID d'un NFT appartenant à TOKEN_USER>
NFT_ID_NOT_OWNED=<ID d'un NFT n'appartenant PAS à TOKEN_USER>

# User IDs pour tests pending rewards
USER_ID_WITH_WALLET=<ID user avec wallet>
USER_ID_WITHOUT_WALLET=<ID user sans wallet>
```

---

## ✅ QUAND TOUT SERA TERMINÉ

**Tu auras :**
- ✅ Système NFT Sync complet (Admin + User)
- ✅ Système Pending Rewards robuste (retry automatique)
- ✅ Wallet Onboarding UX fluide (skippable + bloquante)
- ✅ Marketplace sécurisé (vérification ownership)
- ✅ Tests complets (backend + frontend)
- ✅ Scripts bash pour tests rapides
- ✅ Documentation complète

**Prêt pour :**
- 🚀 Déploiement production
- 🚀 Onboarding users réels
- 🚀 Vente/achat NFTs sécurisés
- 🚀 Distribution rewards automatique

---

**Maintenu par :** Valentin @ CyLimit  
**Dernière mise à jour :** 10 octobre 2025

**🎯 PROCHAINE ACTION : Tests Admin Backend (1h30) ou Phase 5 Marketplace (1h15) ?**

