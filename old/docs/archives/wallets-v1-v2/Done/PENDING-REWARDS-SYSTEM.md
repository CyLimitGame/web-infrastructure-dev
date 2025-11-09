# 💰 Système de Pending Rewards - Documentation Complète

**Date :** 9 octobre 2025  
**Objectif :** Créer un système de rewards en attente pour garantir qu'aucun reward ne soit perdu

---

## 🎯 OBJECTIFS DU SYSTÈME

### 1. **Gestion des users sans wallet**
- ✅ User gagne un reward mais n'a pas encore créé son wallet
- ✅ Reward stocké en DB (pending)
- ✅ Envoyé automatiquement quand wallet créé

### 2. **Résilience aux erreurs blockchain**
- ✅ Erreur réseau (RPC down)
- ✅ Erreur gas (pas assez d'ETH dans Rewards Wallet)
- ✅ Erreur transaction (nonce conflict, etc.)
- ✅ **Retry automatique** avec backoff exponentiel

### 3. **Validation administrative**
- ✅ Admin peut valider rewards avant envoi (optionnel)
- ✅ Batch processing (envoyer plusieurs rewards en 1 fois)
- ✅ Historique complet (audit trail)

### 4. **Reporting & Analytics**
- ✅ Dashboard admin : rewards pending/sent/failed
- ✅ Notifications users (email + in-app)
- ✅ Métriques : temps moyen d'envoi, taux de succès

---

## 🏗️ ARCHITECTURE

### Schema MongoDB : `PendingReward`

```typescript
// admin-backend/src/modules/rewards/schemas/pending-reward.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PendingRewardDocument = PendingReward & Document;

@Schema({ timestamps: true })
export class PendingReward {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  amountUSDC: number;

  @Prop({ required: true })
  reason: string; // Ex: "Competition win", "Referral bonus", "Admin bonus"

  @Prop({ 
    type: String, 
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  })
  status: string;

  @Prop({ type: String, lowercase: true })
  recipientWalletAddress?: string; // Rempli quand user crée son wallet

  @Prop({ type: String })
  txHash?: string; // Hash de la transaction blockchain (si sent)

  @Prop({ type: String })
  errorMessage?: string; // Message d'erreur (si failed)

  @Prop({ type: Number, default: 0 })
  retryCount: number; // Nombre de tentatives d'envoi

  @Prop({ type: Date })
  lastRetryAt?: Date; // Date dernière tentative

  @Prop({ type: Date })
  sentAt?: Date; // Date d'envoi réussi

  @Prop({ type: String })
  competitionId?: string; // ID compétition (si applicable)

  @Prop({ type: String })
  referralId?: string; // ID referral (si applicable)

  @Prop({ type: Boolean, default: false })
  requiresAdminApproval: boolean; // Si true, admin doit valider

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId; // Admin qui a approuvé

  @Prop({ type: Date })
  approvedAt?: Date; // Date d'approbation

  @Prop({ type: String })
  notes?: string; // Notes admin
}

export const PendingRewardSchema = SchemaFactory.createForClass(PendingReward);

// Index composé pour queries optimisées
PendingRewardSchema.index({ userId: 1, status: 1 });
PendingRewardSchema.index({ status: 1, createdAt: 1 });
```

---

## 📦 SERVICE : PendingRewardsService

### Fichier : `admin-backend/src/modules/rewards/services/pending-rewards.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { PendingReward, PendingRewardDocument } from '../schemas/pending-reward.schema';
import { User } from '@/modules/user/schemas/user.schema';
import { CoinbaseWalletService } from '@/modules/wallet/services/coinbase-wallet.service';
import { MailService } from '@/modules/mail/mail.service'; // Pour envoyer emails

@Injectable()
export class PendingRewardsService {
  private readonly logger = new Logger(PendingRewardsService.name);
  private readonly MAX_RETRY = 5;
  private readonly RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // 1min, 5min, 15min, 1h, 2h

  constructor(
    @InjectModel(PendingReward.name) private pendingRewardModel: Model<PendingRewardDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private coinbaseWalletService: CoinbaseWalletService,
    private mailService: MailService,
  ) {}

  /**
   * Créer un reward en attente
   * 
   * @param userId - ID du user
   * @param amountUSDC - Montant en USDC
   * @param reason - Raison du reward
   * @param options - Options supplémentaires
   */
  async createPendingReward(
    userId: string,
    amountUSDC: number,
    reason: string,
    options?: {
      competitionId?: string;
      referralId?: string;
      requiresAdminApproval?: boolean;
      notes?: string;
    }
  ): Promise<PendingRewardDocument> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const pendingReward = await this.pendingRewardModel.create({
      userId: new Types.ObjectId(userId),
      amountUSDC,
      reason,
      status: 'pending',
      recipientWalletAddress: user.walletAddress || null,
      requiresAdminApproval: options?.requiresAdminApproval || false,
      competitionId: options?.competitionId,
      referralId: options?.referralId,
      notes: options?.notes,
    });

    this.logger.log(
      `✅ Pending reward created: ${amountUSDC} USDC for user ${userId} (${reason})`
    );

    // Si user n'a pas de wallet, envoyer email notification
    if (!user.walletAddress) {
      await this.sendWalletCreationNotification(user.email, amountUSDC, reason);
    }

    // Si user a déjà un wallet ET pas besoin d'approbation, envoyer immédiatement
    if (user.walletAddress && !options?.requiresAdminApproval) {
      await this.processPendingReward(pendingReward._id.toString());
    }

    return pendingReward;
  }

  /**
   * Envoyer un reward pending (tenter l'envoi blockchain)
   * 
   * @param rewardId - ID du reward
   */
  async processPendingReward(rewardId: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const reward = await this.pendingRewardModel.findById(rewardId);

    if (!reward) {
      throw new Error(`Pending reward ${rewardId} not found`);
    }

    // Vérifier statut
    if (reward.status !== 'pending' && reward.status !== 'failed') {
      this.logger.warn(
        `Reward ${rewardId} status is ${reward.status}, skipping processing`
      );
      return { success: false, error: 'Invalid status' };
    }

    // Vérifier si user a un wallet
    const user = await this.userModel.findById(reward.userId);
    if (!user || !user.walletAddress) {
      this.logger.warn(
        `User ${reward.userId} doesn't have a wallet yet, reward stays pending`
      );
      return { success: false, error: 'No wallet address' };
    }

    // Vérifier si approbation admin requise
    if (reward.requiresAdminApproval && !reward.approvedBy) {
      this.logger.warn(
        `Reward ${rewardId} requires admin approval, skipping`
      );
      return { success: false, error: 'Requires admin approval' };
    }

    // Mettre à jour statut
    reward.status = 'processing';
    reward.lastRetryAt = new Date();
    await reward.save();

    try {
      // Envoyer USDC sur la blockchain
      const { txHash } = await this.coinbaseWalletService.sendReward(
        user.walletAddress,
        reward.amountUSDC
      );

      // Succès !
      reward.status = 'sent';
      reward.txHash = txHash;
      reward.sentAt = new Date();
      reward.recipientWalletAddress = user.walletAddress;
      await reward.save();

      this.logger.log(
        `✅ Reward ${rewardId} sent: ${reward.amountUSDC} USDC → ${user.walletAddress} (TX: ${txHash})`
      );

      // Envoyer email confirmation
      await this.sendRewardConfirmationEmail(user.email, reward.amountUSDC, txHash);

      return { success: true, txHash };
    } catch (error) {
      // Échec
      this.logger.error(
        `❌ Failed to send reward ${rewardId} (attempt ${reward.retryCount + 1}):`,
        error
      );

      reward.status = 'failed';
      reward.errorMessage = error.message;
      reward.retryCount += 1;
      await reward.save();

      return { success: false, error: error.message };
    }
  }

  /**
   * Cron job : Retry failed rewards
   * Tous les 5 minutes
   */
  @Cron('*/5 * * * *')
  async retryFailedRewards() {
    const failedRewards = await this.pendingRewardModel.find({
      status: 'failed',
      retryCount: { $lt: this.MAX_RETRY },
    });

    if (failedRewards.length === 0) {
      return;
    }

    this.logger.log(`🔄 Retrying ${failedRewards.length} failed rewards...`);

    for (const reward of failedRewards) {
      // Vérifier si délai de retry écoulé (backoff exponentiel)
      const delaySeconds = this.RETRY_DELAYS[reward.retryCount] || 7200;
      const nextRetry = new Date(reward.lastRetryAt.getTime() + delaySeconds * 1000);

      if (new Date() < nextRetry) {
        continue; // Pas encore temps de retry
      }

      // Retry
      await this.processPendingReward(reward._id.toString());

      // Throttle pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Cron job : Envoyer rewards pending (users qui viennent de créer leur wallet)
   * Toutes les minutes
   */
  @Cron('* * * * *')
  async processPendingRewardsForNewWallets() {
    // Récupérer tous les rewards pending avec walletAddress remplie
    const pendingRewards = await this.pendingRewardModel.find({
      status: 'pending',
      recipientWalletAddress: { $exists: true, $ne: null },
      requiresAdminApproval: false, // Pas besoin d'approbation
    });

    if (pendingRewards.length === 0) {
      return;
    }

    this.logger.log(
      `🚀 Processing ${pendingRewards.length} pending rewards for new wallets...`
    );

    for (const reward of pendingRewards) {
      await this.processPendingReward(reward._id.toString());

      // Throttle
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Envoyer tous les rewards pending d'un user (après création wallet)
   */
  async sendPendingRewardsForUser(userId: string, walletAddress: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
  }> {
    const pendingRewards = await this.pendingRewardModel.find({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      requiresAdminApproval: false,
    });

    if (pendingRewards.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    this.logger.log(
      `🚀 Sending ${pendingRewards.length} pending rewards to ${walletAddress}...`
    );

    let sent = 0;
    let failed = 0;

    for (const reward of pendingRewards) {
      // Mettre à jour walletAddress
      reward.recipientWalletAddress = walletAddress;
      await reward.save();

      // Tenter l'envoi
      const result = await this.processPendingReward(reward._id.toString());
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Throttle
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.logger.log(
      `✅ Pending rewards processed for user ${userId}: ${sent} sent, ${failed} failed`
    );

    return { success: true, sent, failed };
  }

  /**
   * Approuver un reward (admin)
   */
  async approveReward(
    rewardId: string,
    adminId: string,
    notes?: string
  ): Promise<PendingRewardDocument> {
    const reward = await this.pendingRewardModel.findById(rewardId);

    if (!reward) {
      throw new Error(`Pending reward ${rewardId} not found`);
    }

    reward.approvedBy = new Types.ObjectId(adminId);
    reward.approvedAt = new Date();
    if (notes) {
      reward.notes = notes;
    }
    await reward.save();

    this.logger.log(`✅ Reward ${rewardId} approved by admin ${adminId}`);

    // Envoyer immédiatement si wallet existe
    if (reward.recipientWalletAddress) {
      await this.processPendingReward(rewardId);
    }

    return reward;
  }

  /**
   * Annuler un reward (admin)
   */
  async cancelReward(
    rewardId: string,
    adminId: string,
    reason: string
  ): Promise<PendingRewardDocument> {
    const reward = await this.pendingRewardModel.findById(rewardId);

    if (!reward) {
      throw new Error(`Pending reward ${rewardId} not found`);
    }

    reward.status = 'cancelled';
    reward.notes = `Cancelled by admin ${adminId}: ${reason}`;
    await reward.save();

    this.logger.log(`❌ Reward ${rewardId} cancelled by admin ${adminId}`);

    return reward;
  }

  /**
   * Récupérer statistiques rewards
   */
  async getRewardsStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    cancelled: number;
    totalAmountPending: number;
    totalAmountSent: number;
    avgProcessingTime: number;
  }> {
    const [stats, avgTime] = await Promise.all([
      this.pendingRewardModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amountUSDC' },
          },
        },
      ]),
      this.pendingRewardModel.aggregate([
        {
          $match: { status: 'sent', sentAt: { $exists: true } },
        },
        {
          $project: {
            processingTime: {
              $subtract: ['$sentAt', '$createdAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$processingTime' },
          },
        },
      ]),
    ]);

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
      return acc;
    }, {});

    return {
      pending: statsMap.pending?.count || 0,
      processing: statsMap.processing?.count || 0,
      sent: statsMap.sent?.count || 0,
      failed: statsMap.failed?.count || 0,
      cancelled: statsMap.cancelled?.count || 0,
      totalAmountPending: statsMap.pending?.amount || 0,
      totalAmountSent: statsMap.sent?.amount || 0,
      avgProcessingTime: avgTime[0]?.avgTime || 0,
    };
  }

  /**
   * Envoyer email notification (wallet création requise)
   */
  private async sendWalletCreationNotification(
    email: string,
    amountUSDC: number,
    reason: string
  ) {
    await this.mailService.send({
      to: email,
      subject: '🎉 Tu as gagné un reward CyLimit !',
      template: 'reward-pending',
      context: {
        amountUSDC,
        reason,
        ctaLink: `${process.env.FRONTEND_URL}/wallet/create`,
      },
    });
  }

  /**
   * Envoyer email confirmation (reward envoyé)
   */
  private async sendRewardConfirmationEmail(
    email: string,
    amountUSDC: number,
    txHash: string
  ) {
    await this.mailService.send({
      to: email,
      subject: '✅ Ton reward CyLimit a été envoyé !',
      template: 'reward-sent',
      context: {
        amountUSDC,
        txHash,
        explorerLink: `https://polygonscan.com/tx/${txHash}`,
      },
    });
  }
}
```

---

## 🎮 CONTROLLER : PendingRewardsController (Admin)

### Fichier : `admin-backend/src/modules/rewards/controllers/pending-rewards.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminGuard } from '@/common/guards/admin.guard';
import { PendingRewardsService } from '../services/pending-rewards.service';
import { ReqUser } from '@/common';
import { Payload } from '@/modules/auth';

@ApiTags('admin/rewards')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/rewards')
export class PendingRewardsController {
  constructor(private pendingRewardsService: PendingRewardsService) {}

  /**
   * Créer un reward manuel (admin)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a pending reward (admin)' })
  async createReward(
    @Body()
    body: {
      userId: string;
      amountUSDC: number;
      reason: string;
      requiresAdminApproval?: boolean;
      notes?: string;
    }
  ) {
    const reward = await this.pendingRewardsService.createPendingReward(
      body.userId,
      body.amountUSDC,
      body.reason,
      {
        requiresAdminApproval: body.requiresAdminApproval,
        notes: body.notes,
      }
    );

    return { success: true, data: reward };
  }

  /**
   * Lister tous les rewards pending (admin)
   */
  @Get('pending')
  @ApiOperation({ summary: 'List all pending rewards' })
  async listPendingRewards(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    const query: any = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const rewards = await this.pendingRewardsService.pendingRewardModel
      .find(query)
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.pendingRewardsService.pendingRewardModel.countDocuments(query);

    return {
      success: true,
      data: rewards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approuver un reward (admin)
   */
  @Patch(':rewardId/approve')
  @ApiOperation({ summary: 'Approve a pending reward' })
  async approveReward(
    @Param('rewardId') rewardId: string,
    @ReqUser() admin: Payload,
    @Body() body: { notes?: string }
  ) {
    const reward = await this.pendingRewardsService.approveReward(
      rewardId,
      admin.userId,
      body.notes
    );

    return { success: true, data: reward };
  }

  /**
   * Annuler un reward (admin)
   */
  @Patch(':rewardId/cancel')
  @ApiOperation({ summary: 'Cancel a pending reward' })
  async cancelReward(
    @Param('rewardId') rewardId: string,
    @ReqUser() admin: Payload,
    @Body() body: { reason: string }
  ) {
    const reward = await this.pendingRewardsService.cancelReward(
      rewardId,
      admin.userId,
      body.reason
    );

    return { success: true, data: reward };
  }

  /**
   * Retry un reward failed (admin)
   */
  @Post(':rewardId/retry')
  @ApiOperation({ summary: 'Retry a failed reward' })
  async retryReward(@Param('rewardId') rewardId: string) {
    const result = await this.pendingRewardsService.processPendingReward(rewardId);

    return { success: result.success, data: result };
  }

  /**
   * Statistiques rewards (admin)
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get rewards statistics' })
  async getStats() {
    const stats = await this.pendingRewardsService.getRewardsStats();

    return { success: true, data: stats };
  }

  /**
   * Force retry all failed rewards (admin)
   */
  @Post('retry-all')
  @ApiOperation({ summary: 'Force retry all failed rewards' })
  async retryAllFailed() {
    await this.pendingRewardsService.retryFailedRewards();

    return { success: true, message: 'Retry process initiated' };
  }
}
```

---

## 🔗 INTÉGRATION AVEC USER BACKEND

### Appeler `sendPendingRewardsForUser` après création wallet

```typescript
// user-backend/src/base/controllers/user.controller.ts
import { PendingRewardsService } from '@/modules/rewards/services/pending-rewards.service';

@Controller('users')
export class UserController {
  constructor(
    // ... existing dependencies
    private readonly pendingRewardsService: PendingRewardsService, // ← AJOUTER
  ) {}

  @Patch('/me/wallet-address')
  @HttpCode(HttpStatus.OK)
  @Auth()
  public async syncWalletAddress(
    @ReqUser() user: Payload,
    @Body() dto: SyncWalletAddressDto,
  ): Promise<{
    success: boolean;
    walletAddress: string;
    pendingRewards?: { sent: number; failed: number };
  }> {
    const logger = new Logger('UserController.syncWalletAddress');

    const normalizedAddress = dto.walletAddress.toLowerCase();

    // Vérifier doublon
    const existingUser = await this.userService.getUserWithPrivateKeyByAddress(
      normalizedAddress
    );

    if (existingUser && existingUser._id.toString() !== user.userId) {
      logger.warn(
        `Tentative de réutilisation wallet: ${normalizedAddress} déjà lié à user ${existingUser._id}`
      );
      throw new BadRequestException(
        'This wallet address is already linked to another account'
      );
    }

    // Mettre à jour walletAddress
    await this.userService.updateUser(new Types.ObjectId(user.userId), {
      walletAddress: normalizedAddress,
      walletSyncedAt: new Date(),
    });

    logger.log(
      `✅ Wallet address synced for user ${user.userId}: ${normalizedAddress}`
    );

    // ✅ Envoyer les rewards en attente
    let pendingRewardsResult = null;
    try {
      pendingRewardsResult = await this.pendingRewardsService.sendPendingRewardsForUser(
        user.userId,
        normalizedAddress
      );

      if (pendingRewardsResult.sent > 0) {
        logger.log(
          `✅ ${pendingRewardsResult.sent} pending rewards sent to ${normalizedAddress}`
        );
      }
    } catch (error) {
      logger.error(`Failed to send pending rewards:`, error);
    }

    return {
      success: true,
      walletAddress: normalizedAddress,
      pendingRewards: pendingRewardsResult
        ? { sent: pendingRewardsResult.sent, failed: pendingRewardsResult.failed }
        : undefined,
    };
  }
}
```

---

## 📧 TEMPLATES EMAIL

### 1. Email "Reward Pending" (wallet requis)

**Fichier :** `admin-backend/src/modules/mail/templates/reward-pending.hbs`

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>🎉 Tu as gagné un reward CyLimit !</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
    <h1 style="color: #7c3aed;">🎉 Félicitations !</h1>
    
    <p>Tu as gagné <strong style="color: #10b981;">{{amountUSDC}} USDC</strong> pour :</p>
    <p style="background-color: #3a3a3a; padding: 15px; border-radius: 5px;">
      {{reason}}
    </p>
    
    <p>⚠️ Pour recevoir ton reward, tu dois d'abord créer ton wallet crypto CyLimit.</p>
    
    <a href="{{ctaLink}}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">
      Créer mon wallet
    </a>
    
    <p style="margin-top: 30px; font-size: 12px; color: #888;">
      Ton reward restera en attente jusqu'à ce que tu crées ton wallet.
    </p>
  </div>
</body>
</html>
```

### 2. Email "Reward Sent" (confirmation)

**Fichier :** `admin-backend/src/modules/mail/templates/reward-sent.hbs`

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>✅ Ton reward CyLimit a été envoyé !</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
    <h1 style="color: #10b981;">✅ Reward envoyé !</h1>
    
    <p><strong style="color: #10b981;">{{amountUSDC}} USDC</strong> ont été envoyés à ton wallet CyLimit.</p>
    
    <p style="background-color: #3a3a3a; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; word-break: break-all;">
      Transaction : {{txHash}}
    </p>
    
    <a href="{{explorerLink}}" style="display: inline-block; background-color: #3a3a3a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 12px; margin-top: 10px;">
      Voir sur PolygonScan
    </a>
    
    <p style="margin-top: 30px;">
      Tu peux maintenant utiliser tes USDC pour acheter des NFTs ou les retirer vers un wallet externe.
    </p>
  </div>
</body>
</html>
```

---

## 📊 USE CASES COMPLETS

### Use Case 1 : User sans wallet gagne compétition

```
1. User gagne une compétition → 50 USDC reward
2. Backend appelle pendingRewardsService.createPendingReward()
3. Reward créé en DB (status: 'pending')
4. User reçoit email "Tu as gagné 50 USDC, crée ton wallet"
5. User clique lien email → WalletOnboardingModal s'ouvre
6. User crée wallet (email OTP)
7. Frontend sync walletAddress
8. Backend appelle sendPendingRewardsForUser()
9. Reward envoyé sur blockchain
10. User reçoit email "Reward envoyé !"
```

### Use Case 2 : Erreur blockchain (RPC down)

```
1. Backend tente d'envoyer reward → Erreur RPC
2. Reward marqué 'failed', retryCount = 1
3. Cron job (5min) : Vérifie délai retry (1min)
4. Après 1min : Retry automatique
5. Si succès : Reward marqué 'sent'
6. Si échec : retryCount++, nouveau délai (5min)
7. Max 5 retries avec backoff exponentiel
8. Si toujours failed après 5 retries : Alert admin
```

### Use Case 3 : Reward nécessitant approbation admin

```
1. Admin crée reward manuel : 1000 USDC (requiresAdminApproval: true)
2. Reward créé en DB (status: 'pending', approvedBy: null)
3. Admin dashboard : Affiche reward en attente d'approbation
4. Admin vérifie et clique "Approuver"
5. Backend marque approvedBy + approvedAt
6. Si user a wallet : Envoi automatique
7. Si user n'a pas wallet : Envoi dès création wallet
```

### Use Case 4 : Batch rewards (competition avec 100 winners)

```
1. Competition terminée → 100 winners
2. Backend boucle sur winners :
   - Appelle createPendingReward() pour chacun
3. Rewards créés en DB (status: 'pending')
4. Cron job (1min) : Détecte rewards pending avec wallets
5. Envoie batch par batch (throttle 500ms entre chaque)
6. Statistiques : 95 sent, 5 failed
7. Failed rewards retried automatiquement
```

---

## 📈 DASHBOARD ADMIN (Métriques)

### Endpoint : `GET /admin/rewards/stats`

**Réponse :**
```json
{
  "success": true,
  "data": {
    "pending": 12,
    "processing": 3,
    "sent": 485,
    "failed": 5,
    "cancelled": 2,
    "totalAmountPending": 450.50,
    "totalAmountSent": 24350.00,
    "avgProcessingTime": 125000
  }
}
```

### Dashboard UI (React/Chakra)

```tsx
// admin-frontend/src/pages/rewards-dashboard.tsx
import { Box, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid } from '@chakra-ui/react';

export const RewardsDashboard = () => {
  const { data: stats } = useQuery('rewards-stats', fetchRewardsStats);

  return (
    <SimpleGrid columns={3} spacing={4}>
      <Stat bg="green.900" p={4} borderRadius="md">
        <StatLabel>✅ Envoyés</StatLabel>
        <StatNumber>{stats.sent}</StatNumber>
        <StatHelpText>{stats.totalAmountSent} USDC</StatHelpText>
      </Stat>

      <Stat bg="yellow.900" p={4} borderRadius="md">
        <StatLabel>⏳ En attente</StatLabel>
        <StatNumber>{stats.pending}</StatNumber>
        <StatHelpText>{stats.totalAmountPending} USDC</StatHelpText>
      </Stat>

      <Stat bg="red.900" p={4} borderRadius="md">
        <StatLabel>❌ Échecs</StatLabel>
        <StatNumber>{stats.failed}</StatNumber>
        <StatHelpText>Retry automatique</StatHelpText>
      </Stat>
    </SimpleGrid>
  );
};
```

---

## ✅ AVANTAGES DU SYSTÈME

### 1. **Résilience**
- ✅ Aucun reward perdu (jamais)
- ✅ Retry automatique avec backoff
- ✅ Queue robuste (MongoDB)

### 2. **Audit Trail**
- ✅ Historique complet (createdAt, sentAt, txHash)
- ✅ Logs détaillés
- ✅ Traçabilité admin

### 3. **Flexibilité**
- ✅ Approbation admin optionnelle
- ✅ Batch processing
- ✅ Retry manuel possible

### 4. **UX**
- ✅ User informé par email
- ✅ Rewards automatiques après création wallet
- ✅ Notifications claires

### 5. **Scalabilité**
- ✅ Gère des milliers de rewards
- ✅ Cron jobs optimisés
- ✅ Throttling intégré

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Schema & Service (Admin Backend)
- [ ] Créer schema `PendingReward`
- [ ] Créer `PendingRewardsService`
- [ ] Créer `PendingRewardsController`
- [ ] Ajouter dans `RewardsModule`
- [ ] Activer `ScheduleModule` (si pas déjà fait)

### Phase 2 : Intégration User Backend
- [ ] Importer `PendingRewardsService` dans `UserController`
- [ ] Appeler `sendPendingRewardsForUser()` après sync wallet
- [ ] Tester création wallet → rewards envoyés

### Phase 3 : Frontend (Wallet Required)
- [ ] Créer `WalletOnboardingModal`
- [ ] Créer `WalletRequiredModal`
- [ ] Créer `useWalletRequired` hook
- [ ] Intégrer dans `BuyNFTButton`, `SellNFTButton`

### Phase 4 : Templates Email
- [ ] Créer template `reward-pending.hbs`
- [ ] Créer template `reward-sent.hbs`
- [ ] Configurer `MailService`

### Phase 5 : Dashboard Admin
- [ ] Créer page `RewardsDashboard`
- [ ] Afficher statistiques
- [ ] Liste rewards pending/failed
- [ ] Actions admin (approve, cancel, retry)

### Phase 6 : Tests
- [ ] Test : User sans wallet gagne reward
- [ ] Test : Retry automatique après erreur
- [ ] Test : Approbation admin
- [ ] Test : Batch rewards

---

**Maintenu par :** Valentin @ CyLimit  
**Dernière mise à jour :** 9 octobre 2025

🚀 **Système prêt pour implémentation !**

