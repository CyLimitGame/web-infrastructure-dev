/**
 * ENDPOINT ADMIN : Retry NFT Migration
 * 
 * OBJECTIF :
 * Relancer la migration uniquement pour les NFTs échoués d'un user
 * 
 * FICHIER : cylimit-backend-develop/src/modules/user/user.controller.ts
 * 
 * UTILISATION :
 * POST /users/:userId/retry-nft-migration
 * Headers: { Authorization: Bearer ADMIN_TOKEN }
 * 
 * EXEMPLE :
 * POST /users/507f1f77bcf86cd799439011/retry-nft-migration
 * 
 * Response :
 * {
 *   "success": true,
 *   "transferred": 50,      // NFTs transférés avec succès
 *   "stillFailed": 0,       // NFTs toujours en erreur
 *   "errors": []
 * }
 */

// ═══════════════════════════════════════════════════════════════════════
// AJOUTER DANS user.controller.ts
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Auth } from '@/common/decorators/auth.decorator';
import { MigrationService } from './services/migration.service';
import { Types } from 'mongoose';

@Controller('users')
export class UserController {
  constructor(
    // ... autres injections
    private readonly migrationService: MigrationService,
  ) {}

  // ... autres endpoints

  /**
   * 🔄 ADMIN ENDPOINT : Relancer migration NFTs échoués
   * 
   * @route POST /users/:userId/retry-nft-migration
   * @access ADMIN ONLY
   * 
   * Cas d'usage :
   * - Batch migration a partiellement échoué
   * - Problème réseau résolu
   * - Relancer uniquement les NFTs échoués
   */
  @Post(':userId/retry-nft-migration')
  @HttpCode(HttpStatus.OK)
  @Auth() // ⚠️ Ajouter rôle ADMIN si besoin : @Auth(['admin'])
  public async retryNFTMigration(
    @Param('userId') userId: string,
  ): Promise<{
    success: boolean;
    transferred: number;
    stillFailed: number;
    errors: string[];
    message: string;
  }> {
    const logger = new Logger('UserController.retryNFTMigration');
    
    logger.log(`🔄 Admin retry NFT migration for user ${userId}`);

    // 1️⃣ Vérifier que le user existe et a un wallet Base
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.baseWalletAddress && !user.walletAddress) {
      throw new BadRequestException('User has no wallet address to migrate to');
    }

    const destinationAddress = user.baseWalletAddress || user.walletAddress;

    // 2️⃣ Vérifier qu'il y a des NFTs échoués
    const failedNFTsCount = await this.nftModel.countDocuments({
      ownerId: new Types.ObjectId(userId),
      migrationError: { $exists: true, $ne: null },
    });

    if (failedNFTsCount === 0) {
      logger.log(`✅ No failed NFTs for user ${userId}`);
      return {
        success: true,
        transferred: 0,
        stillFailed: 0,
        errors: [],
        message: 'No failed NFTs to retry',
      };
    }

    logger.log(`📦 Found ${failedNFTsCount} failed NFTs to retry`);

    // 3️⃣ Appeler le service de retry
    try {
      const result = await this.migrationService.retryFailedNFTMigration(
        new Types.ObjectId(userId),
        destinationAddress,
      );

      if (result.stillFailed === 0) {
        logger.log(`✅ All failed NFTs successfully transferred !`);
      } else {
        logger.warn(
          `⚠️  ${result.transferred} transferred, ${result.stillFailed} still failed`,
        );
      }

      return {
        success: result.stillFailed === 0,
        transferred: result.transferred,
        stillFailed: result.stillFailed,
        errors: result.errors,
        message:
          result.stillFailed === 0
            ? 'All failed NFTs successfully retried and transferred'
            : `${result.transferred} transferred, ${result.stillFailed} still failed. Check errors for details.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Retry failed: ${errorMessage}`);

      throw new InternalServerErrorException(
        `Failed to retry NFT migration: ${errorMessage}`,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXEMPLE D'UTILISATION (CURL)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 1️⃣ Vérifier les NFTs échoués
 * GET /users/507f1f77bcf86cd799439011/nfts?filter=migrationFailed
 * 
 * Response :
 * {
 *   "nfts": [
 *     { "tokenId": 123, "migrationError": "Batch transfer failed: Network error" },
 *     { "tokenId": 124, "migrationError": "Batch transfer failed: Network error" },
 *     ...
 *   ]
 * }
 */

/**
 * 2️⃣ Relancer la migration des NFTs échoués
 * 
 * curl -X POST http://localhost:3001/users/507f1f77bcf86cd799439011/retry-nft-migration \
 *   -H "Authorization: Bearer ADMIN_TOKEN" \
 *   -H "Content-Type: application/json"
 * 
 * Response :
 * {
 *   "success": true,
 *   "transferred": 50,
 *   "stillFailed": 0,
 *   "errors": [],
 *   "message": "All failed NFTs successfully retried and transferred"
 * }
 */

/**
 * 3️⃣ Si encore des échecs, investiguer et réessayer
 * 
 * curl -X POST http://localhost:3001/users/507f1f77bcf86cd799439011/retry-nft-migration \
 *   -H "Authorization: Bearer ADMIN_TOKEN" \
 *   -H "Content-Type: application/json"
 * 
 * Response :
 * {
 *   "success": false,
 *   "transferred": 45,
 *   "stillFailed": 5,
 *   "errors": [
 *     "Batch 1: Transaction reverted on-chain",
 *     "NFT #456: Ownership mismatch"
 *   ],
 *   "message": "45 transferred, 5 still failed. Check errors for details."
 * }
 */

// ═══════════════════════════════════════════════════════════════════════
// LOGS ATTENDUS
// ═══════════════════════════════════════════════════════════════════════

/**
 * [UserController.retryNFTMigration] 🔄 Admin retry NFT migration for user 507f...
 * [UserController.retryNFTMigration] 📦 Found 50 failed NFTs to retry
 * 
 * [MigrationService] 🔄 Retry NFT migration for user 507f...
 * [MigrationService] 📦 Found 50 failed NFTs to retry (from previous migration)
 * [MigrationService] 🧹 Cleared error flags for retry attempt
 * 
 * [MigrationService] 🔧 Configuration Base migration (CDP SDK v2 SECURE):
 * [MigrationService]    NFT Contract: 0x012ab...
 * [MigrationService]    Master Wallet: 0x214FB...
 * [MigrationService]    ✅ Private key secured in AWS Nitro Enclave TEE
 * 
 * [MigrationService] 📦 User 507f... has 50 NFTs v2 to migrate (excluding failed NFTs)
 * [MigrationService] 🔍 Validating destination address: 0xNewWallet...
 * [MigrationService]    ✅ Destination address validated
 * 
 * [MigrationService] 🔍 Verifying ownership on-chain for 50 NFTs...
 * [MigrationService]    ✅ NFT #123 ownership verified
 * ... (49 fois de plus)
 * [MigrationService] ✅ 50 NFTs verified, proceeding with batch transfers...
 * 
 * [MigrationService] 📦 Splitting into 1 batch(es) (max 50 NFTs/batch)
 * [MigrationService] 🚀 Batch 1/1: Transferring 50 NFTs...
 * [MigrationService]    📤 Transaction sent: 0xABC123...
 * [MigrationService]    ✅ Batch 1/1 transferred successfully!
 * 
 * [MigrationService] ✅ Retry completed: 50 transferred, 0 still failed
 * [UserController.retryNFTMigration] ✅ All failed NFTs successfully transferred !
 */

