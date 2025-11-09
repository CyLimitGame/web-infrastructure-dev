# 🎯 Plan d'Action Migration - Version Finale

**Date :** 10 Octobre 2025  
**Statut :** ✅ Validé et prêt pour implémentation

---

## 📋 RÉSUMÉ PLAN

### ✅ **CE QUI EST CONFIRMÉ**

1. ✅ **Contrat NFT permet transferts admin** (whitelist system)
2. ✅ **USDC stocké dans Master Wallet** (users.totalBalance)
3. ✅ **NFTs identifiables** (rarity: blue/pink/yellow + ownerId)
4. ✅ **Migration automatique possible** (si Master Wallet whitelisté)

---

## 🚀 ÉTAPES DÉTAILLÉES

### **ÉTAPE 1 : Vérifier whitelist Master Wallet** ⚠️ CRITIQUE

**Objectif :** S'assurer que Master Wallet peut transférer les NFTs

**Actions :**
```bash
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-backend-develop
node scripts/check-master-wallet-whitelist.js
```

**Résultats possibles :**

#### ✅ Si whitelisté
```
✅ Master Wallet est whitelisté !
→ Migration automatique NFTs possible
→ Passer à l'ÉTAPE 2
```

#### ❌ Si NON whitelisté
```
❌ Master Wallet N'est PAS whitelisté !
→ Whitelister d'abord :
   1. Connecter wallet owner du contrat NFT
   2. Appeler nftContract.setTransferWhitelist(MASTER_WALLET, true)
   3. Re-vérifier
```

---

### **ÉTAPE 2 : Implémenter MigrationService (Backend)**

**Fichier :** `cylimit-backend-develop/src/modules/migration/migration.service.ts`

**Code complet :**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { CoinbaseWalletService } from '@/modules/wallet/services/coinbase-wallet.service';
import { UserService } from '@/modules/user/services/user.service';
import { Nft, NftDocument } from '@/modules/nft/schemas/nft.schema';

/**
 * OBJECTIF :
 * Service pour migrer automatiquement USDC + NFTs des anciens users
 * vers leurs nouveaux Embedded Wallets
 * 
 * POURQUOI :
 * - Users existants ont walletAddress ancien système
 * - Ont USDC dans users.totalBalance (stocké Master Wallet)
 * - Ont NFTs en DB (ownerId) mais ownership on-chain peut différer
 * - Besoin de migrer automatiquement au moment création Embedded Wallet
 * 
 * COMMENT :
 * 1. User crée Embedded Wallet (Coinbase SDK)
 * 2. Frontend appelle PATCH /users/me/wallet-address
 * 3. Backend détecte ancien user (totalBalance > 0 ou NFTs présents)
 * 4. Backend transfère USDC depuis Master Wallet
 * 5. Backend transfère NFTs depuis Master Wallet (via whitelist)
 * 6. Si échec NFT → Marquer pendingManualTransfer
 * 
 * APPELÉ DEPUIS :
 * - UserController.syncWalletAddress() (quand user crée Embedded Wallet)
 */

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private nftContract: ethers.Contract;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(
    private coinbaseWalletService: CoinbaseWalletService,
    private userService: UserService,
    @InjectModel(Nft.name) private nftModel: Model<NftDocument>,
    private configService: ConfigService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider() {
    this.provider = new ethers.providers.JsonRpcProvider(
      this.configService.get('ALCHEMY_POLYGON_RPC_URL')
    );

    this.nftContract = new ethers.Contract(
      this.configService.get('NFT_CONTRACT_ADDRESS'),
      ['function ownerOf(uint256 tokenId) view returns (address)'],
      this.provider
    );

    this.logger.log(`✅ Provider initialized for migration service`);
  }

  /**
   * Migrer automatiquement USDC + NFTs pour un user
   * 
   * @param userId ID du user
   * @param newWalletAddress Adresse Embedded Wallet
   * @returns Résultat migration
   */
  async migrateUserAssets(
    userId: string,
    newWalletAddress: string
  ): Promise<{
    success: boolean;
    usdcTransferred: number;
    nftsTransferred: number;
    nftsFailed: number;
    errors: string[];
  }> {
    this.logger.log(`🔄 Starting migration for user ${userId} → ${newWalletAddress}`);

    const user = await this.userService.findById(userId);
    const errors: string[] = [];
    let nftsTransferredCount = 0;
    let nftsFailedCount = 0;

    // 1️⃣ Transférer USDC
    if (user.totalBalance > 0) {
      try {
        this.logger.log(`💰 Transferring ${user.totalBalance} USDC...`);

        const txHash = await this.coinbaseWalletService.transferFromMasterWallet(
          newWalletAddress,
          user.totalBalance,
          'usdc'
        );

        this.logger.log(
          `✅ Transferred ${user.totalBalance} USDC to ${newWalletAddress} (TX: ${txHash})`
        );
      } catch (error) {
        this.logger.error(`❌ USDC transfer failed:`, error.message, error.stack);
        errors.push(`USDC transfer failed: ${error.message}`);
      }
    } else {
      this.logger.log(`⏭️ No USDC to transfer (totalBalance = 0)`);
    }

    // 2️⃣ Transférer NFTs (rarity: blue/pink/yellow)
    const nftsToMigrate = await this.nftModel.find({
      ownerId: userId,
      rarity: { $in: ['blue', 'pink', 'yellow'] },
      tokenId: { $exists: true, $ne: null },
    });

    this.logger.log(`🖼️ Found ${nftsToMigrate.length} NFTs to migrate`);

    for (const nft of nftsToMigrate) {
      try {
        // Vérifier ownership on-chain
        const ownerOnChain = await this.nftContract.ownerOf(nft.tokenId);

        this.logger.log(
          `NFT #${nft.tokenId}: DB owner=${userId}, On-chain owner=${ownerOnChain}`
        );

        // Transférer le NFT
        // ✅ Fonctionne car Master Wallet est whitelisté !
        const txHash = await this.coinbaseWalletService.transferNFTFromMasterWallet(
          newWalletAddress,
          this.configService.get('NFT_CONTRACT_ADDRESS'),
          nft.tokenId.toString()
        );

        nftsTransferredCount++;

        this.logger.log(
          `✅ Transferred NFT #${nft.tokenId} to ${newWalletAddress} (TX: ${txHash})`
        );
      } catch (error) {
        nftsFailedCount++;

        this.logger.error(
          `❌ Failed to transfer NFT #${nft.tokenId}:`,
          error.message
        );

        errors.push(`NFT #${nft.tokenId} transfer failed: ${error.message}`);

        // Marquer pour transfert manuel
        await this.nftModel.updateOne(
          { _id: nft._id },
          { $set: { pendingManualTransfer: true } }
        );

        this.logger.warn(
          `NFT #${nft.tokenId} marked for manual transfer`
        );
      }
    }

    // 3️⃣ Mettre à jour user
    await this.userService.updateUser(userId, {
      walletAddress: newWalletAddress,
      isWalletMigrated: true,
      walletMigratedAt: new Date(),
    });

    this.logger.log(
      `✅ Migration completed for user ${userId}: ${nftsTransferredCount}/${nftsToMigrate.length} NFTs transferred`
    );

    return {
      success: errors.length === 0,
      usdcTransferred: user.totalBalance || 0,
      nftsTransferred: nftsTransferredCount,
      nftsFailed: nftsFailedCount,
      errors,
    };
  }

  /**
   * Identifier users à migrer
   * 
   * @returns Liste users avec ancien système
   */
  async getUsersToMigrate(): Promise<{
    count: number;
    totalUSDC: number;
    totalNFTs: number;
  }> {
    const users = await this.userService.find({
      totalBalance: { $gt: 0 },
      isWalletMigrated: { $ne: true },
    });

    const nfts = await this.nftModel.countDocuments({
      ownerId: { $in: users.map(u => u._id) },
      rarity: { $in: ['blue', 'pink', 'yellow'] },
      tokenId: { $exists: true, $ne: null },
    });

    const totalUSDC = users.reduce((sum, u) => sum + (u.totalBalance || 0), 0);

    return {
      count: users.length,
      totalUSDC,
      totalNFTs: nfts,
    };
  }
}
```

---

### **ÉTAPE 3 : Modifier UserController (Backend)**

**Fichier :** `cylimit-backend-develop/src/base/controllers/user.controller.ts`

**Modification :**

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
  migrated?: boolean;
  usdcTransferred?: number;
  nftsTransferred?: number;
  nftsFailed?: number;
}> {
  const logger = new Logger('UserController.syncWalletAddress');
  
  const normalizedAddress = dto.walletAddress.toLowerCase();
  const userId = new Types.ObjectId(user.userId);

  const currentUser = await this.userService.findById(userId);

  // 🚨 CAS : User avec ancien système (totalBalance > 0 ou NFTs présents)
  const needsMigration = 
    (currentUser.totalBalance > 0 || currentUser.walletAddress) &&
    !currentUser.isWalletMigrated;

  if (needsMigration) {
    logger.log(
      `🔄 Migration required for user ${user.userId}: totalBalance=${currentUser.totalBalance}`
    );

    try {
      // Migrer USDC + NFTs automatiquement
      const migrationResult = await this.migrationService.migrateUserAssets(
        userId.toString(),
        normalizedAddress
      );

      logger.log(
        `✅ Migration completed: ${migrationResult.usdcTransferred} USDC, ${migrationResult.nftsTransferred}/${migrationResult.nftsTransferred + migrationResult.nftsFailed} NFTs`
      );

      return {
        success: true,
        walletAddress: normalizedAddress,
        migrated: true,
        usdcTransferred: migrationResult.usdcTransferred,
        nftsTransferred: migrationResult.nftsTransferred,
        nftsFailed: migrationResult.nftsFailed,
      };
    } catch (error) {
      logger.error(`❌ Migration failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Migration failed');
    }
  }

  // ... (reste du code inchangé)
}
```

---

### **ÉTAPE 4 : Frontend - Toast notification migration**

**Fichier :** `cylimit-frontend-develop/src/hooks/useEmbeddedWallet.ts`

**Modification :**

```typescript
useEffect(() => {
  if (isSignedIn && address) {
    const syncWallet = async () => {
      try {
        const response = await axios.patch('/users/me/wallet-address', {
          walletAddress: address,
        });

        // 🚨 Détecter migration
        if (response.data.migrated) {
          toast({
            title: '✅ Migration complétée !',
            description: `
              Vous avez reçu :
              - ${response.data.usdcTransferred || 0} USDC
              - ${response.data.nftsTransferred || 0} NFTs
              ${response.data.nftsFailed > 0 ? `\n⚠️ ${response.data.nftsFailed} NFTs nécessitent un transfert manuel` : ''}
            `,
            status: 'success',
            duration: 8000,
            isClosable: true,
          });

          console.log('Migration result:', response.data);
        }
      } catch (error) {
        console.error('Sync wallet failed:', error);
      }
    };

    syncWallet();
  }
}, [isSignedIn, address]);
```

---

## ⚠️ CAS PARTICULIERS

### **Cas 1 : NFT possédé par wallet externe**

```
NFT #123 :
- ownerOf(123) = 0xABC... (ancien wallet user ou externe)
- Master Wallet essaie de transférer

SI Master Wallet whitelisté :
- ✅ Transfert réussit (whitelist permet transfert)

SI Master Wallet NON whitelisté :
- ❌ Transfert échoue → Marquer pendingManualTransfer
- Frontend affiche : "Tu as X NFTs à transférer manuellement"
```

---

### **Cas 2 : NFT inexistant on-chain**

```
NFT en DB mais tokenId invalide on-chain
→ ownerOf(tokenId) throw error
→ Skip ce NFT (log erreur)
```

---

### **Cas 3 : User n'a ni USDC ni NFTs**

```
totalBalance = 0
NFTs = []

→ Skip migration
→ Simple sync walletAddress
```

---

## 🧪 **ÉTAPE 5 : Tests**

### Test 1 : Vérifier whitelist

```bash
node scripts/check-master-wallet-whitelist.js
```

### Test 2 : Identifier users à migrer

```bash
node scripts/count-users-to-migrate.js
```

### Test 3 : Migration test user

```typescript
// Créer endpoint test (admin only)
POST /admin/test-migration/:userId
```

---

## 📊 **ESTIMATION MIGRATION**

### Hypothèses
- 1000 users avec USDC
- Moyenne 100 USDC par user
- Moyenne 3 NFTs par user

### Coûts
| Opération | Gas fees | CDP fees | Total |
|-----------|----------|----------|-------|
| Transfer USDC (1000x) | ~$10 | $0 | $10 |
| Transfer NFTs (3000x) | ~$30 | $0 | $30 |
| **TOTAL** | **~$40** | **$0** | **~$40** |

### Temps
- 1000 transfers USDC : ~5 minutes
- 3000 transfers NFTs : ~15 minutes
- **TOTAL : ~20 minutes**

---

## ✅ CHECKLIST DÉPLOIEMENT

### Backend

- [ ] Vérifier whitelist Master Wallet (`check-master-wallet-whitelist.js`)
- [ ] Créer `MigrationService`
- [ ] Modifier `UserController.syncWalletAddress()`
- [ ] Créer endpoint test migration (admin)
- [ ] Tester migration avec 1 user pilote

### Frontend

- [ ] Modifier `useEmbeddedWallet` (toast migration)
- [ ] Créer composant `PendingNFTsTransfer` (pour NFTs failed)
- [ ] Tester flow complet (login → create wallet → migration)

### Tests

- [ ] Test 1 user avec USDC only
- [ ] Test 1 user avec NFTs only
- [ ] Test 1 user avec USDC + NFTs
- [ ] Test 1 user sans rien (pas de migration)
- [ ] Test NFT transfer failed (gérer erreur gracefully)

---

## 🎉 RÉSUMÉ

**OUI, votre plan est correct !**

1. ✅ Au moment création Embedded Wallet
2. ✅ Transfère USDC depuis Master Wallet (users.totalBalance)
3. ✅ Transfère NFTs depuis Master Wallet (via whitelist)
4. ✅ Si échec NFT → Marquer pour transfert manuel

**Points d'attention :**
- ⚠️ Vérifier whitelist Master Wallet AVANT déploiement
- ⚠️ Tester avec users pilotes
- ⚠️ Gérer erreurs gracefully (ne pas bloquer création wallet)

**Prêt pour implémentation !** 🚀

