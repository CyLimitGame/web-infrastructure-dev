# 🤖 Migration Automatique avec Server Wallets Coinbase

**Date :** 10 Octobre 2025  
**Statut :** ✅ Solution recommandée

---

## 🎯 OBJECTIF

**Migrer automatiquement les fonds/NFTs des anciens wallets vers les nouveaux Embedded Wallets SANS interaction user.**

---

## 💡 PRINCIPE

### Workflow complet

```
┌────────────────────────────────────────────────────────────────┐
│                MIGRATION AUTOMATIQUE                            │
└────────────────────────────────────────────────────────────────┘

PHASE 1 : AVANT connexion user (script backend)
────────────────────────────────────────────────
1. Script identifie users avec ancien wallet + USDC/NFTs
   ↓
2. Pour chaque user :
   ↓
   Transfer USDC : ancien wallet → Server Wallet CyLimit
   Transfer NFTs : ancien wallet → Server Wallet CyLimit
   ↓
   DB : Marquer user.pendingMigration = true


PHASE 2 : User se connecte (automatique)
──────────────────────────────────────
1. User login → SDK Coinbase crée Embedded Wallet
   ↓
2. Frontend appelle PATCH /users/me/wallet-address
   ↓
3. Backend détecte pendingMigration = true
   ↓
   Transfer USDC : Server Wallet → nouveau wallet user
   Transfer NFTs : Server Wallet → nouveau wallet user
   ↓
   DB : Marquer user.isWalletMigrated = true
   ↓
4. ✅ User a tout récupéré automatiquement !
```

---

## 🔧 IMPLÉMENTATION

### 1. Schema User (ajout champs)

```typescript
// src/modules/user/schemas/user.schema.ts

@Schema()
export class UserEntity {
  @Prop({ type: String, lowercase: true, index: true })
  walletAddress?: string; // Nouveau wallet Coinbase

  @Prop({ type: String, lowercase: true })
  oldWalletAddress?: string; // Ancien wallet Web3 (sauvegarde)

  @Prop({ type: Boolean, default: false })
  pendingMigration: boolean; // Fonds en transit dans Server Wallet

  @Prop({ type: Boolean, default: false })
  isWalletMigrated: boolean; // Migration complétée

  @Prop({ type: Date })
  walletMigratedAt?: Date;

  @Prop({ type: Number, default: 0 })
  pendingUSDC: number; // USDC en attente dans Server Wallet

  @Prop({ type: [String], default: [] })
  pendingNFTTokenIds: string[]; // NFTs en attente dans Server Wallet
}
```

---

### 2. Service Server Wallet

```typescript
// src/modules/wallet/services/server-wallet.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * OBJECTIF :
 * Service pour gérer les Server Wallets Coinbase (custodial backend)
 * 
 * POURQUOI :
 * - Permettre transferts automatiques SANS interaction user
 * - Wallet temporaire pour migration fonds/NFTs
 * - Gratuit (inclus dans CDP)
 * 
 * COMMENT :
 * 1. Backend crée Server Wallet avec API Key
 * 2. Transfert fonds ancien wallet → Server Wallet
 * 3. Attendre que user crée Embedded Wallet
 * 4. Transfert fonds Server Wallet → nouveau wallet user
 * 
 * APPELÉ DEPUIS :
 * - MigrationService (scripts migration)
 * - UserController (sync wallet address)
 */

@Injectable()
export class ServerWalletService {
  private readonly logger = new Logger(ServerWalletService.name);
  private coinbase: Coinbase;
  private migrationWallet: Wallet;

  constructor(private configService: ConfigService) {
    this.initializeCoinbase();
  }

  private async initializeCoinbase() {
    this.coinbase = new Coinbase({
      apiKeyName: this.configService.get('COINBASE_API_KEY_NAME'),
      privateKey: this.configService.get('COINBASE_API_KEY_PRIVATE_KEY'),
    });

    // Récupérer ou créer Migration Wallet
    const walletId = this.configService.get('MIGRATION_WALLET_ID');

    if (walletId) {
      this.migrationWallet = await this.coinbase.getWallet(walletId);
      this.logger.log(`✅ Migration Wallet loaded: ${this.migrationWallet.getDefaultAddress()}`);
    } else {
      this.migrationWallet = await this.coinbase.createWallet({
        networkId: 'polygon-mainnet',
      });
      this.logger.log(`✅ Migration Wallet created: ${this.migrationWallet.getId()}`);
      this.logger.warn(`⚠️ Save this in .env: MIGRATION_WALLET_ID=${this.migrationWallet.getId()}`);
    }
  }

  /**
   * Transférer USDC d'un ancien wallet vers Migration Wallet
   * 
   * @param fromPrivateKey Private key ancien wallet
   * @param amount Montant USDC (atomic units)
   * @returns Transaction hash
   */
  async transferUSDCToMigrationWallet(
    fromPrivateKey: string,
    amount: number
  ): Promise<string> {
    // Créer wallet temporaire avec ancien privateKey
    const oldWallet = await this.coinbase.importWallet({
      privateKey: fromPrivateKey,
      networkId: 'polygon-mainnet',
    });

    // Transférer USDC
    const transfer = await oldWallet.createTransfer({
      amount,
      assetId: 'usdc',
      destination: this.migrationWallet.getDefaultAddress(),
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred ${amount} USDC to Migration Wallet (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Transférer NFT d'un ancien wallet vers Migration Wallet
   * 
   * @param fromPrivateKey Private key ancien wallet
   * @param nftContractAddress Adresse contrat NFT
   * @param tokenId Token ID du NFT
   * @returns Transaction hash
   */
  async transferNFTToMigrationWallet(
    fromPrivateKey: string,
    nftContractAddress: string,
    tokenId: string
  ): Promise<string> {
    const oldWallet = await this.coinbase.importWallet({
      privateKey: fromPrivateKey,
      networkId: 'polygon-mainnet',
    });

    // Transférer NFT (via smart contract call)
    const transfer = await oldWallet.invokeContract({
      contractAddress: nftContractAddress,
      method: 'transferFrom',
      args: [
        oldWallet.getDefaultAddress(),
        this.migrationWallet.getDefaultAddress(),
        tokenId,
      ],
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred NFT #${tokenId} to Migration Wallet (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Transférer USDC du Migration Wallet vers nouveau wallet user
   * 
   * @param toAddress Adresse nouveau wallet user
   * @param amount Montant USDC (atomic units)
   * @returns Transaction hash
   */
  async transferUSDCFromMigrationWallet(
    toAddress: string,
    amount: number
  ): Promise<string> {
    const transfer = await this.migrationWallet.createTransfer({
      amount,
      assetId: 'usdc',
      destination: toAddress,
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred ${amount} USDC from Migration Wallet to ${toAddress} (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Transférer NFT du Migration Wallet vers nouveau wallet user
   * 
   * @param toAddress Adresse nouveau wallet user
   * @param nftContractAddress Adresse contrat NFT
   * @param tokenId Token ID du NFT
   * @returns Transaction hash
   */
  async transferNFTFromMigrationWallet(
    toAddress: string,
    nftContractAddress: string,
    tokenId: string
  ): Promise<string> {
    const transfer = await this.migrationWallet.invokeContract({
      contractAddress: nftContractAddress,
      method: 'transferFrom',
      args: [
        this.migrationWallet.getDefaultAddress(),
        toAddress,
        tokenId,
      ],
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred NFT #${tokenId} from Migration Wallet to ${toAddress} (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Récupérer balance USDC du Migration Wallet
   */
  async getMigrationWalletBalance(): Promise<number> {
    const balance = await this.migrationWallet.getBalance('usdc');
    return Number(balance.amount);
  }

  /**
   * Récupérer adresse du Migration Wallet
   */
  getMigrationWalletAddress(): string {
    return this.migrationWallet.getDefaultAddress().getId();
  }
}
```

---

### 3. Script migration PHASE 1 (avant connexion users)

```javascript
// scripts/migrate-old-wallets-phase1.js

/**
 * OBJECTIF :
 * Transférer USDC et NFTs des anciens wallets vers Migration Wallet
 * 
 * POURQUOI :
 * - Préparer migration AVANT que users se connectent
 * - Éviter que users doivent attendre le transfert
 * - Sécuriser fonds dans Server Wallet
 * 
 * COMMENT :
 * 1. Identifier users avec ancien wallet + USDC/NFTs
 * 2. Pour chaque user :
 *    - Transfer USDC → Migration Wallet
 *    - Transfer NFTs → Migration Wallet
 *    - Marquer user.pendingMigration = true
 * 
 * USAGE :
 * node scripts/migrate-old-wallets-phase1.js --dry-run
 * node scripts/migrate-old-wallets-phase1.js --execute
 */

const mongoose = require('mongoose');
const { Coinbase } = require('@coinbase/coinbase-sdk');
require('dotenv').config();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(isDryRun ? '🔍 DRY RUN MODE' : '🚀 EXECUTION MODE');

  await mongoose.connect(process.env.MONGO_URI);

  // Identifier users à migrer
  const usersToMigrate = await mongoose.connection.db
    .collection('users')
    .find({
      walletAddress: { $exists: true, $ne: null },
      isWalletMigrated: { $ne: true },
      pendingMigration: { $ne: true },
    })
    .toArray();

  console.log(`📊 Users to migrate: ${usersToMigrate.length}`);

  if (usersToMigrate.length === 0) {
    console.log('✅ No users to migrate');
    await mongoose.disconnect();
    return;
  }

  // Initialiser Coinbase
  const coinbase = new Coinbase({
    apiKeyName: process.env.COINBASE_API_KEY_NAME,
    privateKey: process.env.COINBASE_API_KEY_PRIVATE_KEY,
  });

  const migrationWallet = await coinbase.getWallet(process.env.MIGRATION_WALLET_ID);
  console.log(`✅ Migration Wallet: ${migrationWallet.getDefaultAddress()}`);

  let migratedCount = 0;
  let totalUSDC = 0;
  let totalNFTs = 0;

  for (const user of usersToMigrate) {
    try {
      console.log(`\n👤 Processing user ${user._id} (${user.email})...`);

      // Récupérer balance USDC on-chain
      const usdcBalance = await getUSDCBalance(user.walletAddress);
      console.log(`  💰 USDC Balance: ${usdcBalance}`);

      // Récupérer NFTs on-chain
      const nfts = await getNFTs(user.walletAddress);
      console.log(`  🖼️ NFTs: ${nfts.length}`);

      if (usdcBalance === 0 && nfts.length === 0) {
        console.log(`  ⏭️ Nothing to migrate`);
        continue;
      }

      if (isDryRun) {
        console.log(`  ✅ Would migrate ${usdcBalance} USDC + ${nfts.length} NFTs`);
        totalUSDC += usdcBalance;
        totalNFTs += nfts.length;
        continue;
      }

      // EXÉCUTION RÉELLE
      const pendingNFTTokenIds = [];

      // Transfer USDC si > 0
      if (usdcBalance > 0) {
        console.log(`  🔄 Transferring ${usdcBalance} USDC...`);
        
        // ⚠️ NÉCESSITE privateKey ancien wallet
        // Soit stockée en DB (non recommandé), soit user doit signer
        // ALTERNATIVE : Skip USDC, user fera transfert manuellement
        console.log(`  ⚠️ USDC transfer requires user action (manual)`);
      }

      // Transfer NFTs
      for (const nft of nfts) {
        console.log(`  🔄 Transferring NFT #${nft.tokenId}...`);
        
        // Même problème : nécessite privateKey
        // ALTERNATIVE : Utiliser whitelist du contrat NFT
        console.log(`  ⚠️ NFT transfer requires user action (manual)`);
        
        pendingNFTTokenIds.push(nft.tokenId);
      }

      // Marquer user en DB
      await mongoose.connection.db
        .collection('users')
        .updateOne(
          { _id: user._id },
          {
            $set: {
              oldWalletAddress: user.walletAddress,
              pendingMigration: true,
              pendingUSDC: usdcBalance,
              pendingNFTTokenIds,
            },
          }
        );

      migratedCount++;
      totalUSDC += usdcBalance;
      totalNFTs += nfts.length;

      console.log(`  ✅ User marked for migration`);
    } catch (error) {
      console.error(`  ❌ Error migrating user ${user._id}:`, error.message);
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`  Users processed: ${migratedCount}/${usersToMigrate.length}`);
  console.log(`  Total USDC: ${totalUSDC}`);
  console.log(`  Total NFTs: ${totalNFTs}`);

  await mongoose.disconnect();
}

// Helpers
async function getUSDCBalance(walletAddress) {
  // TODO: Appeler Alchemy/Infura pour récupérer balance USDC
  return 0;
}

async function getNFTs(walletAddress) {
  // TODO: Appeler Alchemy/Infura pour récupérer NFTs
  return [];
}

main().catch(console.error);
```

---

### 4. Modifier endpoint sync wallet (PHASE 2)

```typescript
// src/base/controllers/user.controller.ts

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
  transferredUSDC?: number;
  transferredNFTs?: number;
}> {
  const logger = new Logger('UserController.syncWalletAddress');
  
  const normalizedAddress = dto.walletAddress.toLowerCase();
  const userId = new Types.ObjectId(user.userId);

  const currentUser = await this.userService.findById(userId);

  // 🚨 CAS SPÉCIAL : User a pendingMigration = true
  if (currentUser.pendingMigration) {
    logger.log(
      `🔄 PHASE 2 Migration for user ${user.userId}: transferring from Migration Wallet`
    );

    try {
      // Transférer USDC depuis Migration Wallet
      let transferredUSDC = 0;
      if (currentUser.pendingUSDC > 0) {
        await this.serverWalletService.transferUSDCFromMigrationWallet(
          normalizedAddress,
          currentUser.pendingUSDC
        );
        transferredUSDC = currentUser.pendingUSDC;
        logger.log(`✅ Transferred ${transferredUSDC} USDC to ${normalizedAddress}`);
      }

      // Transférer NFTs depuis Migration Wallet
      const transferredNFTs = [];
      for (const tokenId of currentUser.pendingNFTTokenIds) {
        await this.serverWalletService.transferNFTFromMigrationWallet(
          normalizedAddress,
          process.env.NFT_CONTRACT_ADDRESS,
          tokenId
        );
        transferredNFTs.push(tokenId);
        logger.log(`✅ Transferred NFT #${tokenId} to ${normalizedAddress}`);
      }

      // Marquer migration complétée
      await this.userService.updateUser(userId, {
        walletAddress: normalizedAddress,
        pendingMigration: false,
        isWalletMigrated: true,
        walletMigratedAt: new Date(),
        pendingUSDC: 0,
        pendingNFTTokenIds: [],
      });

      return {
        success: true,
        walletAddress: normalizedAddress,
        migrated: true,
        transferredUSDC,
        transferredNFTs: transferredNFTs.length,
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

## ⚠️ PROBLÈME MAJEUR : PRIVATE KEYS

### Le vrai problème

**Pour transférer depuis un ancien wallet, il faut la `privateKey` !**

```typescript
// ❌ IMPOSSIBLE si privateKey pas stockée
await transferFrom(oldWallet, migrationWallet, amount);
```

**Options :**

#### ❌ Option 1 : Stocker privateKeys en DB

**TRÈS DANGEREUX :**
- 🚨 Violation sécurité majeure
- 🚨 Hack DB = tous les fonds volés
- 🚨 Non recommandé

#### ✅ Option 2 : User doit signer le transfert manuellement

**RECOMMANDÉ :**
- User se connecte avec ancien wallet (MetaMask)
- Signe transfert USDC → Migration Wallet
- Signe transfert NFTs → Migration Wallet
- Puis crée Embedded Wallet
- Backend détecte → transfert automatique vers nouveau wallet

---

## ✅ SOLUTION FINALE RECOMMANDÉE

### Workflow hybride (meilleur compromis)

```
┌────────────────────────────────────────────────────────────────┐
│         MIGRATION HYBRIDE (Manuel → Automatique)               │
└────────────────────────────────────────────────────────────────┘

PHASE 1 : User transfert manuellement vers Migration Wallet
────────────────────────────────────────────────────────────
1. User se connecte → Frontend détecte ancien wallet
   ↓
2. Modal : "Migrer vers Coinbase Wallet"
   ↓
   - Balance USDC : 1000 USDC
   - NFTs : 5 NFTs
   ↓
3. User connecte MetaMask (ancien wallet)
   ↓
4. User approuve transfert :
   - USDC → Migration Wallet CyLimit
   - NFTs → Migration Wallet CyLimit
   ↓
5. ✅ Fonds sécurisés dans Migration Wallet
   ↓
6. DB : Marquer user.pendingMigration = true


PHASE 2 : User crée Embedded Wallet (automatique)
─────────────────────────────────────────────────
1. User clique "Créer Coinbase Wallet"
   ↓
2. SDK Coinbase crée Embedded Wallet
   ↓
3. Frontend appelle PATCH /users/me/wallet-address
   ↓
4. Backend détecte pendingMigration = true
   ↓
   Transfer automatique :
   - USDC : Migration Wallet → nouveau wallet
   - NFTs : Migration Wallet → nouveau wallet
   ↓
5. ✅ User reçoit tout automatiquement !
```

---

## 📊 COÛT FINAL

| Étape | Coût |
|-------|------|
| Migration Wallet création | **GRATUIT** (inclus CDP) |
| Transferts vers Migration Wallet | **Gas fees Polygon** (~$0.01/tx) |
| Embedded Wallet création | **GRATUIT** (5000 premiers/mois) |
| Transferts depuis Migration Wallet | **Gas fees Polygon** (~$0.01/tx) |

**Total par user : ~$0.04** (gas fees uniquement)

---

## 🎉 CONCLUSION

**IMPOSSIBLE de créer Embedded Wallet sans le user.**

**SOLUTION RECOMMANDÉE :**
1. User transfère manuellement fonds → Migration Wallet (avec MetaMask)
2. Backend stocke fonds dans Migration Wallet (Server Wallet)
3. User crée Embedded Wallet (avec Coinbase SDK)
4. Backend transfère automatiquement fonds → nouveau wallet

**AVANTAGES :**
- ✅ Sécurisé (pas de privateKeys stockées)
- ✅ Semi-automatique (user signe 1 fois, reçoit automatiquement)
- ✅ Coût très faible (~$0.04/user)
- ✅ UX acceptable

**Alternative si pas de privateKeys :**
- User garde ancien wallet
- Peut transférer manuellement quand il veut
- Nouveau wallet pour nouvelles opérations

