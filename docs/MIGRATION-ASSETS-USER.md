# Migration des Assets d'un User

## 📋 Vue d'ensemble

La migration des assets est un processus automatique qui transfère les actifs (USDC + NFTs) d'un utilisateur depuis son ancien wallet vers son nouveau Embedded Wallet Coinbase CDP.

### Objectif
- Transférer automatiquement les USDC depuis le Master Wallet vers l'Embedded Wallet
- Transférer tous les NFTs v2 depuis le Master Wallet vers l'Embedded Wallet
- Assurer une transition transparente sans perte de données

### Architecture
- **Frontend** : `WalletContext.tsx` - Gère le déclenchement et le suivi de la migration
- **Backend** : `migration.service.ts` - Exécute la migration des assets
- **Controller** : `user.controller.ts` - Endpoint de synchronisation wallet et statut migration

---

## 🔄 Flux de Migration Complet

```
1. User se connecte avec Embedded Wallet Coinbase
   ↓
2. Frontend : syncWalletAddress() appelé automatiquement
   ↓
3. Backend : syncWalletAddress() vérifie si migration nécessaire
   ↓
4. Backend : Vérifie approval Marketplace (obligatoire)
   ↓
5. Backend : Lance migration en arrière-plan (async)
   ↓
6. Frontend : Démarre polling pour suivre la progression
   ↓
7. Backend : Transfère USDC + NFTs par batches
   ↓
8. Frontend : Affiche toast de succès/erreur selon résultat
```

---

## 🎯 Fonctions Frontend (WalletContext.tsx)

### 1. `syncWalletAddressInternal()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 748)

**Objectif** : Synchroniser l'adresse wallet avec le backend (fonction interne)

**Ce qu'elle fait** :
1. Vérifie que l'utilisateur est connecté CyLimit
2. Évite les appels multiples (flag `isAlreadySyncing`)
3. Appelle `PATCH /users/me/wallet-address` avec l'adresse et la méthode d'auth
4. Invalide et refetch le profil utilisateur
5. Retourne la réponse du backend avec `migrationStatus`

#### **Détails de l'appel API `PATCH /users/me/wallet-address`**

**URL complète** :
```
PATCH ${process.env.NEXT_PUBLIC_API_URL}/users/me/wallet-address
```

**Headers** :
```typescript
{
  Authorization: `Bearer ${token}`,  // Token JWT depuis localStorage.getItem('TOKEN')
  Content-Type: 'application/json'
}
```

**Body (Request)** :
```typescript
{
  walletAddress: string;           // Adresse Ethereum (ex: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7")
  authMethod?: 'email' | 'sms';    // Optionnel : méthode d'authentification utilisée pour créer le wallet
}
```

**Validations côté backend** :
1. **Format adresse** : `@IsEthereumAddress()` - Valide le format Ethereum (0x + 40 caractères hex)
2. **Unicité** : Vérifie que l'adresse n'est pas déjà utilisée par un autre user
3. **Auth method** : `@IsEnum(['email', 'sms'])` - Si fourni, doit être 'email' ou 'sms'

**Traitement côté backend** :
1. Normalise l'adresse (lowercase) : `dto.walletAddress.toLowerCase()`
2. Vérifie unicité : `getUserWithPrivateKeyByAddress(normalizedAddress)`
   - Si adresse déjà liée à un autre user → `BadRequestException`
3. Récupère l'ancienne adresse : `currentUser.walletAddress`
4. Sauvegarde `oldWalletAddress` si :
   - User n'a pas encore de `oldWalletAddress` (première migration)
   - Ancienne adresse différente de la nouvelle
   - Ancienne adresse existe
5. Met à jour en DB :
   ```typescript
   {
     walletAddress: normalizedAddress,
     walletSyncedAt: new Date(),
     oldWalletAddress?: oldWalletAddress,  // Si première migration
     embeddedWalletAuthMethod?: dto.authMethod  // Si première connexion
   }
   ```
6. Vérifie si migration nécessaire (`getMigrationStatus()`)
7. Si migration nécessaire :
   - Vérifie approval Marketplace (`checkMarketplaceApproval()`)
   - Lance migration en background (`migrateUserAssets()`)
   - Retourne `migrationStatus: 'in_progress'` ou `'marketplace_not_approved'`
8. Si migration non nécessaire → Retourne `migrationStatus: 'not_required'`

**Réponse (Success 200)** :
```typescript
{
  success: boolean;                // Toujours true si pas d'erreur
  walletAddress: string;          // Adresse normalisée (lowercase)
  migrationStatus?: 'in_progress' | 'not_required' | 'marketplace_not_approved';
}
```

**Réponse (Error 400)** :
```typescript
{
  statusCode: 400,
  message: 'This wallet address is already linked to another account' | 'Invalid Ethereum address'
}
```

**Réponse (Error 401)** :
```typescript
{
  statusCode: 401,
  message: 'Unauthorized'
}
```

**Gestion d'erreur côté frontend** :
- Si erreur → `console.error()` et retourne `null`
- Le flag `isAlreadySyncing` est toujours libéré dans le `finally`
- L'adresse est ajoutée au Set `syncedAddresses` pour éviter les appels multiples

**Retourne** :
```typescript
{
  success: boolean;
  walletAddress: string;
  migrationStatus?: 'in_progress' | 'not_required' | 'marketplace_not_approved';
} | null
```

**Appelée depuis** : `syncWalletAddressWithApproval()`

---

### 2. `syncWalletAddressWithApproval()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 822)

**Objectif** : Synchroniser wallet avec gestion approval Marketplace et migration automatique

**Ce qu'elle fait** :
1. Appelle `syncWalletAddressInternal()` pour synchroniser l'adresse
2. Si `migrationStatus === 'in_progress'` :
   - Affiche toast "Migration started"
   - Démarre le polling de migration (`startMigrationPolling()`)
3. Si `migrationStatus === 'marketplace_not_approved'` :
   - Stocke l'adresse en attente (`setPendingSyncAddress()`)
   - Affiche le modal d'approval Marketplace
4. Si `migrationStatus === 'not_required'` :
   - Ne fait rien (silencieux)

**Appelée depuis** : `useEffect` (ligne 955) lorsque `evmAddress + isSignedIn + isCylimitLoggedIn` sont OK

**Appelle** :
- `syncWalletAddressInternal()`
- `startMigrationPolling()`
- `setShowApprovalModal()`

---

### 3. `checkMigrationStatus()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 254)

**Objectif** : Vérifier le statut de migration via polling

**Ce qu'elle fait** :
1. Appelle `GET /users/me/migration-status`
2. Met à jour les états locaux (`migrationStatus`, `migrationProgress`)
3. Si `status === 'completed'` :
   - Arrête le polling
   - Affiche toast de succès avec détails (USDC + NFTs transférés)
   - Rafraîchit le profil utilisateur
4. Si `status === 'failed'` :
   - Arrête le polling
   - Affiche toast d'erreur

**Appelée depuis** :
- `startMigrationPolling()` (via ref pour éviter stale closures)
- Polling automatique toutes les 5 secondes

**Appelle** :
- `refetchUserProfile()`
- `queryClient.invalidateQueries()`
- `toast()` pour afficher les résultats

---

### 4. `startMigrationPolling()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 443)

**Objectif** : Démarrer le polling automatique quand une migration est en cours

**Ce qu'elle fait** :
1. Vérifie qu'aucun polling n'est déjà actif
2. Réinitialise le flag toast (`migrationToastShownRef.current = false`)
3. Vérifie immédiatement le statut (`checkMigrationStatusRef.current?.()`)
4. Configure un interval toutes les 5 secondes pour vérifier le statut

**FIX Important** : Utilise `checkMigrationStatusRef.current` pour éviter les stale closures (problème où l'interval appelait une ancienne version de la fonction)

**Appelée depuis** :
- `syncWalletAddressWithApproval()` (si migration `in_progress`)
- `useEffect` (ligne 1208) si migration détectée au chargement de la page

---

### 5. `stopMigrationPolling()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 467)

**Objectif** : Arrêter le polling de migration status

**Ce qu'elle fait** :
1. Vérifie si un interval est actif
2. Nettoie l'interval avec `clearInterval()`
3. Réinitialise `pollingIntervalRef.current` à `null`

**Appelée depuis** :
- `checkMigrationStatus()` (quand migration terminée/échouée)
- Cleanup `useEffect` (ligne 476) au démontage du composant

---

### 6. `ensureMarketplaceApproval()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 611)

**Objectif** : Gérer l'approval Marketplace avec toutes les vérifications (fonction mutualisée)

**Ce qu'elle fait** :
1. **ÉTAPE 0** : Vérifie que le wallet est connecté
   - Si non connecté → Ouvre modal wallet (`setShowWalletAuthModal(true)`)
   - Stocke l'action à faire après connexion
2. **ÉTAPE 1** : Vérifie que le wallet appartient à l'utilisateur (`verifyWalletOwnership()`)
3. **ÉTAPE 2** : Vérifie l'approval Marketplace (`checkMarketplaceApproval()`)
4. **ÉTAPE 3** : Si pas approuvé → Affiche modal d'approval

**Retourne** : `Promise<boolean>` - `true` si approuvé, `false` sinon

**Utilisée par** :
- `WalletContext` (migration NFTs)
- `SellCardForm` (mise en vente)
- Tout autre composant nécessitant l'approval Marketplace

**Appelle** :
- `verifyWalletOwnership()` (sécurité)
- `checkMarketplaceApproval()` (hook useMarketplace)
- `setShowApprovalModal()` (afficher modal)

---

### 7. `handleApproveMarketplace()`

**Localisation** : `src/contexts/WalletContext.tsx` (ligne 1063)

**Objectif** : Handler pour approuver le Marketplace depuis le modal

**Ce qu'elle fait** :
1. Active le loading (`setIsApprovingMarketplace(true)`)
2. Appelle `approveMarketplace()` (hook useMarketplace)
3. Attend le `transactionHash` de la transaction
4. Confirme l'approval via `POST /marketplace/confirm-approval`
5. Affiche toast de succès
6. Si `pendingSyncAddress` existe :
   - Relance la synchronisation wallet (pour déclencher migration)
7. Résout la Promise si elle existe (depuis `ensureMarketplaceApproval()`)

**Appelée depuis** : Modal d'approval Marketplace (bouton "Autoriser")

**Appelle** :
- `approveMarketplace()` (hook useMarketplace)
- `syncWalletAddressWithApproval()` (si migration en attente)

---

## 🔧 Fonctions Backend (migration.service.ts)

### 1. `migrateUserAssets()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 257)

**Objectif** : Point d'entrée principal pour migrer USDC + NFTs vers Embedded Wallet

**Étapes détaillées** :

#### **SÉCURITÉS CRITIQUES** :
1. **Lock en mémoire** : Vérifie qu'aucune migration n'est déjà en cours pour ce user
2. **Protection anti-spam** : Limite à 3 tentatives par minute
3. **Vérification DB** : Vérifie que `migrationStatus !== 'in_progress'` en DB
4. **Protection double migration** : Si `migratedAt` existe → Skip (seul admin peut retry)

#### **FLUX DE MIGRATION** :
1. Acquiert le lock (`migrationLocks.set(userIdStr, true)`)
2. Récupère le user depuis la DB
3. Vérifie si migration nécessaire (`checkMigrationRequired()`)
   - Si non nécessaire → Retourne `NOT_REQUIRED`
4. Marque migration `IN_PROGRESS` en DB
5. Initialise la progression (`updateMigrationProgress()`)
6. **Vérifie approval Marketplace** (obligatoire avant migration)
   - Si pas approuvé → Marque `MARKETPLACE_NOT_APPROVED` et retourne erreur
7. Transfère USDC (`transferUSDC()`)
   - Si succès → Met à jour `oldTotalBalance` et reset `totalBalance` à 0
8. Transfère NFTs (`transferNFTsV2()`)
   - Par batches de 50 NFTs max
   - Met à jour la progression après chaque batch
9. Marque migration `COMPLETED` ou `FAILED` selon résultat
10. Envoie alertes Slack si échec
11. Libère le lock

**Retourne** :
```typescript
{
  success: boolean;
  usdcTransferred: boolean;
  usdcAmount: number;
  nftsTransferred: number;
  nftsFailed: number;
  errors: string[];
}
```

**Appelée depuis** :
- `UserController.syncWalletAddress()` (automatique lors connexion Embedded Wallet)

**Appelle** :
- `checkMigrationRequired()`
- `transferUSDC()`
- `transferNFTsV2()`
- `updateMigrationProgress()`
- `slackService.sendMigrationFailedAlert()`

---

### 2. `checkMigrationRequired()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 885)

**Objectif** : Déterminer si un user a besoin de migration

**Ce qu'elle fait** :
1. Vérifie si user a déjà migré (`migrationStatus === COMPLETED`)
2. Compte les NFTs v2 du user en DB
3. Vérifie si user a des fonds USDC (`totalBalance > 0`)

**Logique** :
- Migration nécessaire si : `(nftsCount > 0) || (user.totalBalance > 0)`
- Exception : Si `migrationStatus === MARKETPLACE_NOT_APPROVED` → Retourne `true` (pour permettre retry après approval)

**Retourne** : `Promise<boolean>`

**Appelée depuis** :
- `migrateUserAssets()`

---

### 3. `transferUSDC()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 933)

**Objectif** : Transférer USDC depuis Master Wallet vers Embedded Wallet

**Sécurités critiques** :
1. Vérifie que l'adresse destination correspond au `walletAddress` de l'utilisateur en DB
2. Empêche un User B de recevoir les USDC de User A

**Ce qu'elle fait** :
1. Récupère le user depuis la DB
2. Vérifie que `user.walletAddress === toAddress` (sécurité)
3. Appelle Admin Backend : `transferUSDC(toAddress, amount)`
4. Si succès :
   - Log la transaction dans `address_activities` (`logUSDCMigration()`)
   - Retourne `{ success: true, txHash }`

**Retourne** :
```typescript
{
  success: boolean;
  txHash?: string;
  error?: string;
}
```

**Appelée depuis** :
- `migrateUserAssets()`

**Appelle** :
- `adminBackendClient.transferUSDC()`
- `logUSDCMigration()`

---

### 4. `transferNFTsV2()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 1347)

**Objectif** : Transférer tous les NFTs v2 en BATCH depuis Master Wallet vers Embedded Wallet

**Optimisations** :
- **Avant** : 1 TX par NFT = 10 NFTs = 10 TX = ~$0.0015 = 100s
- **Après** : 1 TX par batch = 10 NFTs = 1 TX = ~$0.0002 = 10s
- **Économie** : -87% coût, -90% temps

**Sécurités critiques** :
1. **Validation adresse** : Vérifie que l'adresse est un Embedded Wallet CyLimit (`isValidCyLimitEmbeddedWallet()`)
2. **Vérification wallet ownership** : Vérifie que `user.walletAddress === toAddress`
3. **Vérification approval Marketplace** : Obligatoire avant migration (sécurité)
4. **Vérification ownership on-chain** : Vérifie que chaque NFT appartient au Master Wallet avant transfert

**Étapes détaillées** :
1. Récupère tous les NFTs v2 du user en DB (exclut ceux avec `migrationError`)
2. Valide l'adresse destination (Embedded Wallet CyLimit)
3. Vérifie wallet ownership (DB vs destination)
4. Vérifie approval Marketplace (obligatoire)
5. Vérifie ownership on-chain pour TOUS les NFTs (phase préparatoire)
6. Groupe les NFTs valides par batch de 50 max
7. Pour chaque batch :
   - Appelle Admin Backend : `transferNFTs(toAddress, tokenIds[])`
   - Attend confirmation transaction
   - Met à jour progression (`updateMigrationProgress()`)
   - Log dans `address_activities` (`logNFTMigration()`)
   - Délai de 3s avant prochain batch (rate limiting)
8. Retourne résumé (transferred, failed, errors)

**Retourne** :
```typescript
{
  transferred: number;
  failed: number;
  errors: string[];
}
```

**Appelée depuis** :
- `migrateUserAssets()`
- `retryFailedNFTMigration()` (admin retry)

**Appelle** :
- `isValidCyLimitEmbeddedWallet()` (validation adresse)
- `adminBackendClient.transferNFTs()` (transfert batch)
- `updateMigrationProgress()` (progression temps réel)
- `logNFTMigration()` (logging)

---

### 5. `updateMigrationProgress()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 1248)

**Objectif** : Mettre à jour la progression de migration en temps réel pour le polling frontend

**Ce qu'elle fait** :
1. Met à jour les champs de progression dans la DB (merge, pas écrasement)
2. Met à jour `migrationProgress.lastUpdate` avec la date actuelle
3. Met à jour le statut si fourni (`in_progress`, `completed`, `failed`)

**Champs de progression** :
- `totalNFTs` : Nombre total de NFTs à migrer
- `transferredNFTs` : Nombre de NFTs transférés avec succès
- `failedNFTs` : Nombre de NFTs échoués
- `currentBatch` : Batch actuel en cours
- `totalBatches` : Nombre total de batches
- `usdcTransferred` : USDC transféré ou non
- `usdcAmount` : Montant USDC transféré
- `startedAt` : Date de début de migration
- `errors` : Liste des erreurs

**Appelée depuis** :
- `migrateUserAssets()` (début et fin)
- `transferNFTsV2()` (après chaque batch)

---

### 6. `checkMarketplaceApproval()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 1184)

**Objectif** : Vérifier si le Marketplace est approuvé pour un user

**Ce qu'elle fait** :
1. Récupère les NFTs v2 du user en DB
2. Si aucun NFT → Retourne `{ isApproved: true, hasNFTs: false }`
3. Vérifie `isApprovedForAll` on-chain pour le contrat NFT
4. Retourne le résultat

**Retourne** :
```typescript
{
  isApproved: boolean;
  hasNFTs: boolean;
}
```

**Appelée depuis** :
- `UserController.syncWalletAddress()` (avant de lancer migration)

---

### 7. `getMigrationStatus()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 692)

**Objectif** : Obtenir le statut de migration d'un user

**Ce qu'elle fait** :
1. Récupère le user depuis la DB
2. Vérifie si migration nécessaire (`checkMigrationRequired()`)
3. Retourne le statut actuel + `requiresMigration`

**Retourne** :
```typescript
{
  migrationStatus: MigrationStatus;
  migratedAt?: Date;
  requiresMigration: boolean;
}
```

**Appelée depuis** :
- `UserController.syncWalletAddress()` (vérification préalable)
- `UserController.getMigrationStatus()` (endpoint GET)

---

### 8. `retryFailedNFTMigration()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 1888)

**Objectif** : Retry migration NFT pour les NFTs qui ont échoué (admin seulement)

**Ce qu'elle fait** :
1. Récupère UNIQUEMENT les NFTs avec `migrationError` en DB
2. Nettoie les flags d'erreur (`$unset migrationError`)
3. Appelle `transferNFTsV2()` qui va :
   - Valider adresse destination
   - Vérifier ownership on-chain
   - Grouper en batches
   - Transférer avec retry logic
4. Met à jour `migrationStatus` selon résultat
5. Envoie notification Slack (succès ou échec)

**Retourne** :
```typescript
{
  transferred: number;
  stillFailed: number;
  errors: string[];
}
```

**Appelée depuis** :
- `UserController.retryNFTMigration()` (Admin endpoint)

---

### 9. `isValidCyLimitEmbeddedWallet()`

**Localisation** : `src/modules/user/services/migration.service.ts` (ligne 1829)

**Objectif** : Vérifier si une adresse appartient à un Embedded Wallet CyLimit

**Sécurité** :
- Empêche migration vers adresses externes (attaquants)
- Empêche migration vers adresses invalides
- Fail-safe : deny by default en cas d'erreur

**Ce qu'elle fait** :
1. Appelle Admin Backend : `POST /internal/validate-embedded-wallet`
2. Authentifie avec `X-Internal-Secret` header
3. Retourne le résultat de validation

**Retourne** : `Promise<boolean>`

**Appelée depuis** :
- `transferNFTsV2()` (validation adresse destination)

---

### 10. `logUSDCMigration()` et `logNFTMigration()`

**Localisation** : 
- `logUSDCMigration()` : ligne 1025
- `logNFTMigration()` : ligne 1105

**Objectif** : Logger les transactions de migration dans `address_activities` pour traçabilité

**Ce qu'elles font** :
1. Créent un `rawId` unique basé sur `txHash` et timestamp
2. Construisent l'activité au format `address_activities`
3. Sauvegardent dans MongoDB via `AddressActivityService`
4. Ne font PAS échouer la migration si le logging échoue

**Appelées depuis** :
- `transferUSDC()` (après transfert réussi)
- `transferNFTsV2()` (après chaque batch réussi)

---

## 🎮 Fonctions Controller (user.controller.ts)

### 1. `syncWalletAddress()`

**Localisation** : `src/base/controllers/user.controller.ts` (ligne 792)

**Objectif** : Synchroniser l'adresse Embedded Wallet avec le backend et déclencher la migration

**Ce qu'elle fait** :
1. Normalise l'adresse (lowercase)
2. Vérifie que l'adresse n'est pas déjà utilisée par un autre user
3. Sauvegarde `oldWalletAddress` si nécessaire (historisation)
4. Met à jour `walletAddress` et `walletSyncedAt` en DB
5. **Vérifie si migration nécessaire** (`getMigrationStatus()`)
6. Si migration nécessaire :
   - Vérifie approval Marketplace (`checkMarketplaceApproval()`)
   - Si pas approuvé → Retourne `marketplace_not_approved`
   - Si approuvé → Lance migration en background (`migrateUserAssets()`)
   - Retourne `in_progress` immédiatement (ne bloque pas)
7. Si migration non nécessaire → Retourne `not_required`

**Retourne** :
```typescript
{
  success: boolean;
  walletAddress: string;
  migrationStatus?: 'in_progress' | 'not_required' | 'marketplace_not_approved';
}
```

**Appelée depuis** :
- Frontend : `syncWalletAddressInternal()` (PATCH `/users/me/wallet-address`)

**Appelle** :
- `migrationService.getMigrationStatus()`
- `migrationService.checkMarketplaceApproval()`
- `migrationService.migrateUserAssets()` (en background)

---

### 2. `getMigrationStatus()`

**Localisation** : `src/base/controllers/user.controller.ts` (ligne 932)

**Objectif** : Récupérer le statut de migration en temps réel (endpoint GET)

**Ce qu'elle fait** :
1. Récupère le user depuis la DB (avec `migrationProgress`)
2. Retourne `migrationStatus` + `migrationProgress` + `migratedAt`

**Retourne** :
```typescript
{
  migrationStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_required' | 'marketplace_not_approved';
  migrationProgress?: {
    totalNFTs: number;
    transferredNFTs: number;
    failedNFTs: number;
    currentBatch: number;
    totalBatches: number;
    usdcTransferred: boolean;
    usdcAmount: number;
    errors: string[];
  };
  migratedAt?: Date;
}
```

**Appelée depuis** :
- Frontend : `checkMigrationStatus()` (GET `/users/me/migration-status`)

**Appelle** :
- `migrationService.getMigrationStatus()`

---

## 🔐 Sécurités Critiques

### 1. Protection contre double migration
- **Lock en mémoire** : `migrationLocks` Map empêche migrations simultanées
- **Vérification DB** : `migrationStatus === 'in_progress'` bloque nouvelles tentatives
- **Protection migratedAt** : Si `migratedAt` existe → Skip automatique (seul admin peut retry)

### 2. Vérification wallet ownership
- **Frontend** : `verifyWalletOwnership()` vérifie que `evmAddress === userProfile.walletAddress`
- **Backend** : `transferUSDC()` et `transferNFTsV2()` vérifient que `toAddress === user.walletAddress`

### 3. Validation adresse destination
- **Backend** : `isValidCyLimitEmbeddedWallet()` vérifie que l'adresse est un Embedded Wallet CyLimit enregistré
- **Fail-safe** : Deny by default en cas d'erreur

### 4. Vérification approval Marketplace
- **Obligatoire** : Migration bloquée si pas d'approval (sécurité)
- **Raison** : Si migration échoue, NFTs peuvent être récupérés via Marketplace

### 5. Vérification ownership on-chain
- **Avant transfert** : Chaque NFT vérifié avec `ownerOf()` on-chain
- **Sécurité** : Empêche transfert de NFTs qui n'appartiennent pas au Master Wallet

---

## 📊 Statuts de Migration

### Enum `MigrationStatus`
```typescript
enum MigrationStatus {
  PENDING = 'pending',                    // Migration en attente
  IN_PROGRESS = 'in_progress',             // Migration en cours
  COMPLETED = 'completed',                 // Migration terminée avec succès
  FAILED = 'failed',                       // Migration échouée
  NOT_REQUIRED = 'not_required',          // Pas de migration nécessaire
  MARKETPLACE_NOT_APPROVED = 'marketplace_not_approved', // Approval Marketplace manquant
}
```

### Transitions de statut
```
NOT_REQUIRED → (si assets détectés) → IN_PROGRESS → COMPLETED
                                                      ↓
                                                   FAILED

MARKETPLACE_NOT_APPROVED → (après approval) → IN_PROGRESS → COMPLETED
```

---

## 🔄 Polling et Suivi de Progression

### Frontend Polling
- **Démarrage** : Automatique si `migrationStatus === 'in_progress'`
- **Fréquence** : Toutes les 5 secondes
- **Arrêt** : Automatique si `status === 'completed'` ou `'failed'`

### Progression en temps réel
- **Backend** : Met à jour `migrationProgress` après chaque batch
- **Frontend** : Affiche barre de progression avec :
  - `transferredNFTs / totalNFTs`
  - `currentBatch / totalBatches`
  - `usdcTransferred` et `usdcAmount`

---

## 🚨 Gestion des Erreurs

### Erreurs USDC
- **Échec USDC seul** : Migration continue (NFTs prioritaires)
- **Alerte Slack** : Envoyée si USDC échoue mais NFTs OK (non-critique)

### Erreurs NFTs
- **Échec batch** : NFTs marqués avec `migrationError` en DB
- **Migration FAILED** : Si au moins un NFT échoue
- **Alerte Slack** : Envoyée avec détails (userId, email, erreurs)

### Retry Admin
- **Endpoint** : `POST /users/:id/retry-migration` (admin seulement)
- **Fonction** : `retryFailedNFTMigration()`
- **Action** : Nettoie erreurs et relance migration pour NFTs échoués

---

## 📝 Logging et Traçabilité

### Logs Backend
- **Migration démarrée** : `🚀 Starting migration for user...`
- **Progression batches** : `✅ Batch X/Y transferred successfully!`
- **Erreurs** : `❌ Batch X/Y transfer failed: errorMessage`
- **Migration terminée** : `✅ Migration completed: X USDC, Y NFTs`

### Logs Frontend
- **Polling démarré** : `🔄 Démarrage du polling de migration...`
- **Statut vérifié** : `📊 Migration status check: { status, progress }`
- **Migration terminée** : `✅ Migration completed detected!`

### Traçabilité Blockchain
- **USDC** : Loggé dans `address_activities` avec type `MIGRATION_USDC`
- **NFTs** : Loggé dans `address_activities` avec type `MIGRATION_NFT_BATCH`
- **Raw ID** : Format `migration-usdc-{txHash}-{timestamp}` ou `migration-nft-batch-{txHash}-{timestamp}`

---

## 🎯 Points d'Attention

### ⚠️ Important
1. **Migration asynchrone** : Le backend retourne immédiatement `in_progress` sans attendre la fin
2. **Polling nécessaire** : Le frontend doit poller pour suivre la progression
3. **Approval obligatoire** : Migration bloquée sans approval Marketplace
4. **Pas de retry automatique** : Si `migratedAt` existe, seul admin peut retry
5. **Rate limiting** : Délai de 3s entre batches pour éviter surcharge RPC

### ✅ Bonnes Pratiques
- Toujours vérifier `migrationStatus` avant d'afficher des messages à l'utilisateur
- Utiliser le polling pour afficher une barre de progression
- Logger toutes les erreurs pour debugging
- Envoyer alertes Slack pour migrations échouées

---

## 📚 Références

- **Frontend** : `src/contexts/WalletContext.tsx`
- **Backend Service** : `src/modules/user/services/migration.service.ts`
- **Backend Controller** : `src/base/controllers/user.controller.ts`
- **Hook Marketplace** : `src/hooks/useMarketplace.ts`
- **Admin Backend Client** : `src/modules/admin-backend-client/admin-backend-client.service.ts`

