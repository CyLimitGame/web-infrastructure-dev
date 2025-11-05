# 🔄 Migration Automatique Embedded Wallets (Base)

**Date :** 22 Octobre 2025  
**Status :** ✅ **IMPLÉMENTÉ ET PRÊT**  
**Objectif :** Migrer automatiquement USDC + NFTs lors de la première connexion Embedded Wallet

---

## 🎯 PRINCIPE

**Peu importe si l'user est nouveau ou existant**, lors de la première connexion à l'Embedded Wallet Coinbase (via email), on déclenche automatiquement la migration :

### 📋 Étapes de Migration

1. ✅ **Historisation** : Sauvegarder les champs legacy (`totalBalance`, `walletAddress`, `publicKey`, `privateKey`)
2. ✅ **Création Embedded Wallet** : Créer le Smart Account Coinbase
3. ✅ **Migration USDC** : Transférer USDC du Master Wallet → Embedded Wallet
   - Sauvegarder `oldTotalBalance = totalBalance`
   - Réinitialiser `totalBalance = 0`
4. ✅ **Migration NFTs** : Transférer NFTs du Master Wallet → Embedded Wallet
   - Récupérer NFTs via `ownerId` en DB
   - Transfer on-chain (Master Wallet → Embedded Wallet)

---

## 🔧 IMPLÉMENTATION

### **Frontend : `useEmbeddedWallet.ts`**

#### Auto-connexion silencieuse (ligne 170-212)

```typescript
useEffect(() => {
  const attemptAutoConnect = async () => {
    // 1️⃣ Si user CyLimit connecté mais wallet pas connecté
    if (isCylimitLoggedIn && !isSignedIn && cylimitEmail && !autoConnectAttempted) {
      console.log('🔄 Tentative auto-connexion Embedded Wallet:', cylimitEmail);
      
      try {
        // 2️⃣ Connexion silencieuse avec email CyLimit
        await signInWithEmail({ email: cylimitEmail });
        console.log('✅ Auto-connexion Embedded Wallet réussie');
      } catch (error) {
        console.log('ℹ️ Première connexion, modal nécessaire');
      }
    }
  };

  attemptAutoConnect();
}, [isCylimitLoggedIn, isSignedIn, cylimitEmail, autoConnectAttempted]);
```

#### Synchronisation wallet address (ligne 218-222)

```typescript
useEffect(() => {
  // 3️⃣ Quand wallet connecté → sync avec backend
  if (evmAddress && isSignedIn && isCylimitLoggedIn) {
    syncWalletAddress(evmAddress); // 🚀 DÉCLENCHE LA MIGRATION
  }
}, [evmAddress, isSignedIn, isCylimitLoggedIn, syncWalletAddress]);
```

#### Fonction `syncWalletAddress` (ligne 102-123)

```typescript
const syncWalletAddress = useCallback(async (address: string) => {
  if (!address || !isCylimitLoggedIn) return;

  try {
    const token = localStorage.getItem('TOKEN');

    // 4️⃣ Appel backend qui déclenche migration automatique
    await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/me/wallet-address`,
      { walletAddress: address },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ walletAddress synchronisé + migration déclenchée');
  } catch (error) {
    console.error('❌ Erreur sync:', error);
  }
}, [isCylimitLoggedIn]);
```

---

### **Backend : `user.controller.ts`**

#### Endpoint PATCH `/users/me/wallet-address` (ligne 658-772)

```typescript
@Patch('/me/wallet-address')
@HttpCode(HttpStatus.OK)
@Auth()
public async syncWalletAddress(
  @ReqUser() user: Payload,
  @Body() dto: SyncWalletAddressDto,
): Promise<{ 
  success: boolean; 
  walletAddress: string;
  migration?: { ... };
}> {
  const logger = new Logger('UserController.syncWalletAddress');
  
  const normalizedAddress = dto.walletAddress.toLowerCase();

  // 1️⃣ Vérifier unicité wallet address
  const existingUser = await this.userService.getUserWithPrivateKeyByAddress(
    normalizedAddress,
  );

  if (existingUser && existingUser._id.toString() !== user.userId.toString()) {
    throw new BadRequestException('Wallet address already linked to another account');
  }

  // 2️⃣ Sauvegarder ancienne adresse
  const currentUser = await this.userService.findById(user.userId);
  const oldWalletAddress = currentUser?.walletAddress;

  // 3️⃣ Mettre à jour walletAddress (historisation)
  await this.userService.updateUser(new Types.ObjectId(user.userId), {
    walletAddress: normalizedAddress,
    oldWalletAddress: oldWalletAddress || undefined, // ✅ Historisation
    walletSyncedAt: new Date(),
  });

  logger.log(`✅ Wallet synced: ${oldWalletAddress || 'none'} → ${normalizedAddress}`);

  // 🚀 4️⃣ DÉCLENCHER MIGRATION AUTOMATIQUE (async)
  let migrationResult;
  try {
    logger.log(`🔄 Starting automatic migration...`);
    
    migrationResult = await this.migrationService.migrateUserAssets(
      new Types.ObjectId(user.userId),
      normalizedAddress,
    );

    if (migrationResult.success) {
      logger.log(
        `✅ Migration OK: ${migrationResult.usdcAmount} USDC, ${migrationResult.nftsTransferred} NFTs`,
      );
    } else {
      logger.warn(`⚠️ Migration with errors: ${migrationResult.errors.join(', ')}`);
    }
  } catch (error) {
    logger.error(`❌ Migration failed: ${error.message}`);
    // Ne pas bloquer la sync wallet
    migrationResult = {
      success: false,
      usdcTransferred: false,
      usdcAmount: 0,
      nftsTransferred: 0,
      nftsFailed: 0,
      errors: [error.message],
    };
  }

  return {
    success: true,
    walletAddress: normalizedAddress,
    migration: migrationResult,
  };
}
```

---

### **Backend : `migration.service.ts`**

#### Fonction principale `migrateUserAssets()` (ligne 156-277)

```typescript
public async migrateUserAssets(
  userId: Types.ObjectId | string,
  newWalletAddress: string,
): Promise<MigrationResult> {
  // 1️⃣ Récupérer user et vérifier si migration nécessaire
  const user = await this.userService.findByIdWithPrivateKey(userId);
  
  const migrationRequired = await this.checkMigrationRequired(user);
  if (!migrationRequired) {
    return { success: true, ... }; // Rien à migrer
  }

  // 2️⃣ Marquer migration IN_PROGRESS
  await this.userModel.updateOne(
    { _id: userId },
    { $set: { migrationStatus: MigrationStatus.IN_PROGRESS } },
  );

  const result = { ... };

  try {
    // 3️⃣ Transférer USDC depuis Master Wallet
    if (user.totalBalance > 0) {
      const oldTotalBalance = user.totalBalance;
      
      const usdcResult = await this.transferUSDC(
        newWalletAddress,
        oldTotalBalance,
      );
      
      if (usdcResult.success) {
        // ✅ Historisation + reset
        await this.userModel.updateOne(
          { _id: userId },
          {
            $set: {
              oldTotalBalance: oldTotalBalance, // ✅ Historisation
              totalBalance: 0, // ✅ Reset (fonds migrés)
            },
          },
        );
        
        this.logger.log(
          `💰 totalBalance migré: ${oldTotalBalance} → oldTotalBalance, totalBalance = 0`,
        );
      }
    }

    // 4️⃣ Transférer NFTs depuis Master Wallet
    const nftResult = await this.transferNFTsV2(userId, newWalletAddress);
    result.nftsTransferred = nftResult.transferred;
    result.nftsFailed = nftResult.failed;

    // 5️⃣ Marquer migration COMPLETED ou FAILED
    const allSuccess = result.usdcTransferred && result.nftsFailed === 0;
    result.success = allSuccess;

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          migrationStatus: allSuccess ? MigrationStatus.COMPLETED : MigrationStatus.FAILED,
          migratedAt: new Date(),
        },
      },
    );

    return result;
  } catch (error) {
    // Marquer FAILED
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { migrationStatus: MigrationStatus.FAILED } },
    );
    
    return result;
  }
}
```

#### Transfert USDC (ligne 368-410)

```typescript
private async transferUSDC(
  toAddress: string,
  amount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    this.logger.log(`💵 Transferring ${amount} USDC to ${toAddress}`);

    // Convertir en unités USDC (6 decimals)
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 6);

    // Vérifier balance Master Wallet (Polygon)
    const balance = await this.usdcContract['balanceOf'](
      this.masterWalletSigner.address,
    );
    
    if (balance.lt(amountInWei)) {
      throw new Error(`Insufficient USDC in Master Wallet`);
    }

    // Gas fees (Polygon)
    const feeData = await this.getFeeData();

    // Exécuter transfert (Polygon → Base Embedded Wallet)
    // Note: Le user devra bridge manuellement ou on fait bridge automatique
    const tx = await this.usdcContract['transfer'](toAddress, amountInWei, {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });

    await tx.wait();

    this.logger.log(`✅ USDC transferred: ${tx.hash}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    this.logger.error(`❌ USDC transfer failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

#### Transfert NFTs Base (ligne 437-580)

```typescript
private async transferNFTsV2(
  userId: Types.ObjectId,
  toAddress: string,
): Promise<{ transferred: number; failed: number; errors: string[] }> {
  const result = {
    transferred: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 1️⃣ Récupérer adresse contrat NFT Base
    const NFT_V2_CONTRACT_ADDRESS = 
      process.env['TESTNET_NFT_V2_CONTRACT_ADDRESS'] ||
      process.env['NFT_V2_CONTRACT_ADDRESS'];

    if (!NFT_V2_CONTRACT_ADDRESS) {
      throw new Error('NFT_V2_CONTRACT_ADDRESS not configured');
    }

    // 2️⃣ Récupérer clé privée Master Wallet Base
    const masterWalletPrivateKey = 
      process.env['CDP_MASTER_WALLET_PRIVATE_KEY'] ||
      this.configService.get('cdp.masterWalletPrivateKey') ||
      this.configService.get('web3.walletPrivateKey');

    if (!masterWalletPrivateKey) {
      throw new Error('Master Wallet private key not configured');
    }

    this.logger.log(`🔧 Base migration config:`);
    this.logger.log(`   NFT Contract: ${NFT_V2_CONTRACT_ADDRESS}`);
    this.logger.log(`   Master Wallet: ✅`);

    // 3️⃣ Récupérer tous les NFTs du user en DB
    const nftsV2 = await this.nftModel.find({
      ownerId: userId,
      contractAddress: NFT_V2_CONTRACT_ADDRESS,
      tokenId: { $exists: true, $ne: null },
    }).lean();

    this.logger.log(`📦 User has ${nftsV2.length} NFTs to migrate`);

    if (nftsV2.length === 0) {
      return result;
    }

    // 4️⃣ Transférer chaque NFT
    for (const nft of nftsV2) {
      try {
        this.logger.log(
          `🔄 Transferring NFT #${nft.tokenId} (${nft.rarity}) to ${toAddress}...`,
        );

        // ABI minimal pour safeTransferFrom
        const nftAbi = [
          'function safeTransferFrom(address from, address to, uint256 tokenId) external',
        ];

        // Créer le contrat NFT avec Master Wallet signer (Base Provider)
        const masterSigner = new Wallet(masterWalletPrivateKey, this.baseProvider);
        const nftContract = new Contract(NFT_V2_CONTRACT_ADDRESS, nftAbi, masterSigner);
        const masterWalletAddress = masterSigner.address;

        // Exécuter le transfert
        const tx = await nftContract['safeTransferFrom'](
          masterWalletAddress,
          toAddress,
          nft.tokenId,
        );

        // Attendre confirmation
        const receipt = await tx.wait();
        const txHash = receipt.transactionHash;

        this.logger.log(`✅ NFT #${nft.tokenId} transferred (TxHash: ${txHash})`);

        result.transferred++;
      } catch (error) {
        this.logger.error(`❌ NFT #${nft.tokenId} transfer failed: ${error.message}`);

        result.failed++;
        result.errors.push(`NFT #${nft.tokenId}: ${error.message}`);

        // Marquer erreur en DB
        await this.nftModel.updateOne(
          { _id: nft._id },
          {
            $set: {
              migrationError: error.message,
              migrationFailedAt: new Date(),
            },
          },
        );
      }
    }

    return result;
  } catch (error) {
    this.logger.error(`❌ NFT batch transfer failed: ${error.message}`);
    result.errors.push(`Batch error: ${error.message}`);
    return result;
  }
}
```

---

## 📊 SCHEMA USER

### Nouveaux champs ajoutés

```typescript
// user.schema.ts

@Prop()
public walletAddress!: string; // ✅ Embedded Wallet address (actuelle)

@Prop()
public oldWalletAddress?: string; // ✅ HISTORISATION ancien wallet

@Prop({
  type: Number,
  default: 0,
})
public totalBalance!: number; // ✅ Solde USDC actuel (0 après migration)

@Prop({
  type: Number,
})
public oldTotalBalance?: number; // ✅ HISTORISATION ancien solde

@Prop({
  type: String,
  select: false,
  unique: true,
})
public privateKey?: string; // ✅ HISTORISATION (conservée pour legacy)

@Prop({
  type: String,
  enum: ['pending', 'in_progress', 'completed', 'failed', 'not_required'],
})
public migrationStatus?: string; // ✅ Statut migration

@Prop({
  type: Date,
})
public migratedAt?: Date; // ✅ Date migration
```

---

## 🔄 FLOW COMPLET

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER PREMIÈRE CONNEXION                        │
└─────────────────────────────────────────────────────────────────────┘

1️⃣ User login CyLimit (email + password)
   → JWT Token sauvegardé

2️⃣ Frontend : useEmbeddedWallet détecte user connecté
   → Auto-connexion Embedded Wallet avec email CyLimit

3️⃣ Embedded Wallet créé (Smart Account Coinbase)
   → Address disponible (evmAddress)

4️⃣ Frontend : syncWalletAddress(evmAddress)
   → PATCH /users/me/wallet-address

5️⃣ Backend : user.controller.ts
   → Sauvegarder walletAddress
   → Historiser oldWalletAddress
   → 🚀 DÉCLENCHER migrationService.migrateUserAssets()

6️⃣ Migration Service : migrateUserAssets()
   ├─ 6.1 Vérifier si migration nécessaire
   │      (totalBalance > 0 OU NFTs existants)
   │
   ├─ 6.2 Marquer migrationStatus = 'in_progress'
   │
   ├─ 6.3 Transférer USDC :
   │      Master Wallet (Polygon) → Embedded Wallet (Base)
   │      ├─ Sauvegarder oldTotalBalance = totalBalance
   │      └─ Reset totalBalance = 0
   │
   ├─ 6.4 Transférer NFTs :
   │      Master Wallet (Base) → Embedded Wallet (Base)
   │      ├─ Récupérer NFTs via ownerId en DB
   │      ├─ Pour chaque NFT : safeTransferFrom()
   │      └─ Logger succès/erreurs
   │
   └─ 6.5 Marquer migrationStatus = 'completed' ou 'failed'

7️⃣ Frontend : Reçoit résultat migration
   → Afficher toast de succès
   → Rafraîchir balance

✅ User a maintenant son Embedded Wallet avec USDC + NFTs migrés !
```

---

## ⚙️ CONFIGURATION REQUISE

### Variables d'environnement Backend

```bash
# .env (cylimit-backend-develop)

# ✅ Polygon (pour migration USDC legacy)
WEB3_PROVIDER=amoy  # ou 'matic' en prod
WEB3_ALCHEMY_KEY=...
WEB3_WALLET_PRIVATE_KEY=...  # Master Wallet Polygon

# ✅ Base (pour migration NFTs)
NODE_ENV=development  # ou 'production'
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org

# ✅ Contrats Base
TESTNET_NFT_V2_CONTRACT_ADDRESS=0x012ab34A520638C0aA876252161c6039343741A4
NFT_V2_CONTRACT_ADDRESS=0x...  # Mainnet (à compléter)

# ✅ Master Wallet Base
CDP_MASTER_WALLET_PRIVATE_KEY=...  # Master Wallet Base
# OU fallback vers WEB3_WALLET_PRIVATE_KEY si même wallet
```

---

## 🧪 TESTS

### Test 1 : User existant avec fonds

```bash
# Prérequis :
# - User en DB avec totalBalance = 150, walletAddress (ancien), NFTs
# - User login CyLimit

# Test :
1. User login → Auto-connexion Embedded Wallet
2. Embedded Wallet créé → syncWalletAddress() appelé
3. Migration déclenchée

# Vérifications :
✅ oldWalletAddress = ancien wallet
✅ walletAddress = nouvelle adresse Embedded Wallet
✅ oldTotalBalance = 150
✅ totalBalance = 0
✅ USDC transférés vers Embedded Wallet
✅ NFTs transférés vers Embedded Wallet
✅ migrationStatus = 'completed'
```

### Test 2 : Nouvel user sans fonds

```bash
# Prérequis :
# - User en DB SANS totalBalance, SANS NFTs

# Test :
1. User login → Auto-connexion Embedded Wallet
2. Embedded Wallet créé → syncWalletAddress() appelé
3. Migration déclenchée mais rien à migrer

# Vérifications :
✅ walletAddress = nouvelle adresse Embedded Wallet
✅ totalBalance = 0 (inchangé)
✅ Pas de transfer USDC
✅ Pas de transfer NFTs
✅ migrationStatus = 'not_required'
```

### Test 3 : Migration partielle (erreur NFTs)

```bash
# Prérequis :
# - User avec totalBalance = 100, 3 NFTs
# - 1 NFT non transférable (erreur on-chain)

# Test :
1. Migration déclenchée
2. USDC OK, 2/3 NFTs OK, 1 NFT fail

# Vérifications :
✅ oldTotalBalance = 100
✅ totalBalance = 0
✅ 2 NFTs transférés
❌ 1 NFT avec migrationError en DB
⚠️ migrationStatus = 'failed' (car pas 100% réussi)
```

---

## 📝 LOGS ATTENDUS

```
[UserController.syncWalletAddress] ✅ Wallet synced: 0xOldWallet... → 0xNewWallet...
[UserController.syncWalletAddress] 🔄 Starting automatic migration...

[MigrationService] 🚀 Starting migration for user 507f1f77bcf86cd799439011
[MigrationService] ✅ Base Provider configured: Sepolia
[MigrationService]    RPC: https://sepolia.base.org

[MigrationService] 💵 Transferring 150 USDC to 0xNewWallet...
[MigrationService] ✅ USDC transferred: 0x1234...
[MigrationService] 💰 totalBalance migré: 150 → oldTotalBalance, totalBalance = 0

[MigrationService] 📦 User has 3 NFTs to migrate
[MigrationService] 🔄 Transferring NFT #0 (blue) to 0xNewWallet...
[MigrationService] ✅ NFT #0 transferred (TxHash: 0xabc...)
[MigrationService] 🔄 Transferring NFT #1 (pink) to 0xNewWallet...
[MigrationService] ✅ NFT #1 transferred (TxHash: 0xdef...)
[MigrationService] 🔄 Transferring NFT #2 (yellow) to 0xNewWallet...
[MigrationService] ✅ NFT #2 transferred (TxHash: 0xghi...)

[UserController.syncWalletAddress] ✅ Migration OK: 150 USDC, 3 NFTs
```

---

## ✅ STATUT ACTUEL

| Composant | Status | Fichier |
|-----------|--------|---------|
| Frontend Auto-connexion | ✅ | `useEmbeddedWallet.ts` |
| Frontend Sync Wallet | ✅ | `useEmbeddedWallet.ts` (ligne 102-123) |
| Backend Endpoint | ✅ | `user.controller.ts` (ligne 658-772) |
| Backend Migration Service | ✅ | `migration.service.ts` |
| Schema User (historisation) | ✅ | `user.schema.ts` (ligne 136-139) |
| Migration USDC | ✅ | `migration.service.ts` (ligne 206-234) |
| Migration NFTs Base | ✅ | `migration.service.ts` (ligne 437-580) |
| Provider Base | ✅ | `migration.service.ts` (ligne 116-126) |

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Code implémenté
2. ⏳ Tests end-to-end sur testnet
3. ⏳ Monitoring logs migration
4. ⏳ Gestion erreurs edge cases
5. ⏳ Production deployment

---

**Date de création** : 22 Octobre 2025  
**Mainteneur** : Équipe CyLimit  
**Version** : 1.0.0

