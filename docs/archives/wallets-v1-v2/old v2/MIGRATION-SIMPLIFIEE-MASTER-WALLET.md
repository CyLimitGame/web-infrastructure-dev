# 🔄 Migration Simplifiée avec Master Wallet existant

**Date :** 10 Octobre 2025  
**Statut :** ✅ Solution optimisée (1 seul Server Wallet)

---

## 🎯 PRINCIPE

**Utiliser le Master Wallet existant au lieu de créer un wallet dédié migration.**

**Avantages :**
- ✅ Pas de nouveau wallet à créer
- ✅ Master Wallet déjà configuré et sécurisé
- ✅ Déjà utilisé pour stocker USDC des users
- ✅ Plus simple à gérer

---

## 🏦 WALLETS CYLIMIT

### Structure actuelle

```
┌─────────────────────────────────────────────────────────┐
│                  WALLETS CYLIMIT                        │
└─────────────────────────────────────────────────────────┘

1️⃣ MASTER WALLET
   - Transactions générales
   - Stocke USDC des users (deposits)
   - ✅ UTILISÉ POUR MIGRATION
   
2️⃣ REWARDS WALLET
   - Distribution rewards
   - Payouts compétitions
   - Bonus referrals
```

---

## 🔄 WORKFLOW MIGRATION COMPLET

### PHASE 1 : User transfère → Master Wallet

```typescript
// Frontend : MigrationModal.tsx

const handleMigrate = async () => {
  // 1. User connecte ancien wallet (MetaMask)
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  
  // 2. Récupérer adresse Master Wallet
  const masterWalletAddress = await axios.get('/config/master-wallet-address');
  
  // 3. Transfer USDC
  if (usdcBalance > 0) {
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    const tx = await usdcContract.transfer(
      masterWalletAddress,
      usdcBalance
    );
    await tx.wait();
  }
  
  // 4. Transfer NFTs
  const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
  for (const nft of nfts) {
    const tx = await nftContract.transferFrom(
      userOldAddress,
      masterWalletAddress,
      nft.tokenId
    );
    await tx.wait();
  }
  
  // 5. Notifier backend
  await axios.post('/users/me/mark-pending-migration', {
    pendingUSDC: usdcBalance,
    pendingNFTTokenIds: nfts.map(n => n.tokenId),
  });
  
  toast({
    title: '✅ Migration Phase 1 complétée',
    description: 'Vos fonds sont sécurisés. Créez maintenant votre Coinbase Wallet.',
    status: 'success',
  });
};
```

---

### PHASE 2 : Backend transfère Master Wallet → User

```typescript
// Backend : user.controller.ts

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

  // 🚨 CAS : User a pendingMigration = true
  if (currentUser.pendingMigration) {
    logger.log(
      `🔄 PHASE 2 Migration for user ${user.userId}: transferring from Master Wallet`
    );

    try {
      // Transférer USDC depuis Master Wallet
      let transferredUSDC = 0;
      if (currentUser.pendingUSDC > 0) {
        const txHash = await this.coinbaseWalletService.transferFromMasterWallet(
          normalizedAddress,
          currentUser.pendingUSDC,
          'usdc'
        );
        
        transferredUSDC = currentUser.pendingUSDC;
        
        logger.log(
          `✅ Transferred ${transferredUSDC} USDC to ${normalizedAddress} (TX: ${txHash})`
        );
      }

      // Transférer NFTs depuis Master Wallet
      const transferredNFTs = [];
      for (const tokenId of currentUser.pendingNFTTokenIds) {
        const txHash = await this.coinbaseWalletService.transferNFTFromMasterWallet(
          normalizedAddress,
          process.env.NFT_CONTRACT_ADDRESS,
          tokenId
        );
        
        transferredNFTs.push(tokenId);
        
        logger.log(
          `✅ Transferred NFT #${tokenId} to ${normalizedAddress} (TX: ${txHash})`
        );
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

      logger.log(
        `✅ Migration completed for user ${user.userId}`
      );

      return {
        success: true,
        walletAddress: normalizedAddress,
        migrated: true,
        transferredUSDC,
        transferredNFTs: transferredNFTs.length,
      };
    } catch (error) {
      logger.error(
        `❌ Migration failed for user ${user.userId}:`,
        error.message,
        error.stack
      );
      throw new InternalServerErrorException('Migration failed');
    }
  }

  // ... (reste du code inchangé)
}
```

---

## 🔧 SERVICE COINBASE WALLET (Modifié)

```typescript
// src/modules/wallet/services/coinbase-wallet.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * OBJECTIF :
 * Service pour gérer les Server Wallets Coinbase (Master + Rewards)
 * 
 * POURQUOI :
 * - Master Wallet : Transactions générales + Migration users
 * - Rewards Wallet : Distribution rewards
 * 
 * COMMENT :
 * 1. Initialiser wallets avec API Keys
 * 2. Fournir méthodes transfert USDC/NFT
 * 3. Utilisé pour migration (transfert Master → user)
 * 
 * APPELÉ DEPUIS :
 * - UserController (sync wallet address)
 * - PendingRewardsService (distribute rewards)
 */

@Injectable()
export class CoinbaseWalletService {
  private readonly logger = new Logger(CoinbaseWalletService.name);
  private coinbase: Coinbase;
  private masterWallet: Wallet;
  private rewardsWallet: Wallet;

  constructor(private configService: ConfigService) {
    this.initializeCoinbase();
  }

  private async initializeCoinbase() {
    this.coinbase = new Coinbase({
      apiKeyName: this.configService.get('COINBASE_API_KEY_NAME'),
      privateKey: this.configService.get('COINBASE_API_KEY_PRIVATE_KEY'),
    });

    // Charger Master Wallet
    const masterWalletId = this.configService.get('MASTER_WALLET_ID');
    this.masterWallet = await this.coinbase.getWallet(masterWalletId);
    
    this.logger.log(
      `✅ Master Wallet loaded: ${this.masterWallet.getDefaultAddress()}`
    );

    // Charger Rewards Wallet
    const rewardsWalletId = this.configService.get('REWARDS_WALLET_ID');
    this.rewardsWallet = await this.coinbase.getWallet(rewardsWalletId);
    
    this.logger.log(
      `✅ Rewards Wallet loaded: ${this.rewardsWallet.getDefaultAddress()}`
    );
  }

  /**
   * Transférer USDC depuis Master Wallet vers user
   * 
   * Utilisé pour :
   * - Migration wallets (Phase 2)
   * - Withdrawals
   * 
   * @param toAddress Adresse destination
   * @param amount Montant USDC (atomic units)
   * @param assetId Type d'asset (usdc, eth, etc.)
   * @returns Transaction hash
   */
  async transferFromMasterWallet(
    toAddress: string,
    amount: number,
    assetId: string = 'usdc'
  ): Promise<string> {
    const transfer = await this.masterWallet.createTransfer({
      amount,
      assetId,
      destination: toAddress,
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred ${amount} ${assetId.toUpperCase()} from Master Wallet to ${toAddress} (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Transférer NFT depuis Master Wallet vers user
   * 
   * Utilisé pour :
   * - Migration wallets (Phase 2)
   * 
   * @param toAddress Adresse destination
   * @param nftContractAddress Adresse contrat NFT
   * @param tokenId Token ID du NFT
   * @returns Transaction hash
   */
  async transferNFTFromMasterWallet(
    toAddress: string,
    nftContractAddress: string,
    tokenId: string
  ): Promise<string> {
    const transfer = await this.masterWallet.invokeContract({
      contractAddress: nftContractAddress,
      method: 'transferFrom',
      args: [
        this.masterWallet.getDefaultAddress().getId(),
        toAddress,
        tokenId,
      ],
    });

    await transfer.wait();

    this.logger.log(
      `✅ Transferred NFT #${tokenId} from Master Wallet to ${toAddress} (TX: ${transfer.getTransactionHash()})`
    );

    return transfer.getTransactionHash();
  }

  /**
   * Transférer rewards depuis Rewards Wallet vers user
   * 
   * @param toAddress Adresse destination
   * @param amount Montant USDC (atomic units)
   * @returns Transaction hash
   */
  async sendReward(
    toAddress: string,
    amount: number
  ): Promise<{ txHash: string }> {
    const transfer = await this.rewardsWallet.createTransfer({
      amount,
      assetId: 'usdc',
      destination: toAddress,
    });

    await transfer.wait();

    this.logger.log(
      `✅ Sent ${amount} USDC reward to ${toAddress} (TX: ${transfer.getTransactionHash()})`
    );

    return { txHash: transfer.getTransactionHash() };
  }

  /**
   * Récupérer adresse Master Wallet (pour frontend)
   */
  getMasterWalletAddress(): string {
    return this.masterWallet.getDefaultAddress().getId();
  }

  /**
   * Récupérer adresse Rewards Wallet
   */
  getRewardsWalletAddress(): string {
    return this.rewardsWallet.getDefaultAddress().getId();
  }

  /**
   * Récupérer balance Master Wallet
   */
  async getMasterWalletBalance(assetId: string = 'usdc'): Promise<number> {
    const balance = await this.masterWallet.getBalance(assetId);
    return Number(balance.amount);
  }

  /**
   * Récupérer balance Rewards Wallet
   */
  async getRewardsWalletBalance(): Promise<number> {
    const balance = await this.rewardsWallet.getBalance('usdc');
    return Number(balance.amount);
  }
}
```

---

## 🔗 ENDPOINT POUR RÉCUPÉRER ADRESSE MASTER WALLET

```typescript
// src/config/config.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoinbaseWalletService } from '@/modules/wallet/services/coinbase-wallet.service';

/**
 * OBJECTIF :
 * Endpoints publics pour récupérer config nécessaire au frontend
 * 
 * POURQUOI :
 * - Frontend a besoin de l'adresse Master Wallet pour migration
 * - Évite de hardcoder l'adresse dans le frontend
 */

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(
    private coinbaseWalletService: CoinbaseWalletService
  ) {}

  /**
   * Récupérer adresse Master Wallet
   * 
   * Utilisé par :
   * - Frontend migration modal (pour afficher adresse destination)
   * - Frontend withdraw (pour afficher source des fonds)
   */
  @Get('master-wallet-address')
  @ApiOperation({ summary: 'Get Master Wallet address' })
  getMasterWalletAddress(): { address: string } {
    return {
      address: this.coinbaseWalletService.getMasterWalletAddress(),
    };
  }

  /**
   * Récupérer adresse Rewards Wallet
   */
  @Get('rewards-wallet-address')
  @ApiOperation({ summary: 'Get Rewards Wallet address' })
  getRewardsWalletAddress(): { address: string } {
    return {
      address: this.coinbaseWalletService.getRewardsWalletAddress(),
    };
  }
}
```

---

## 📊 AVANTAGES SOLUTION SIMPLIFIÉE

| Aspect | Migration Wallet dédié | Master Wallet existant |
|--------|------------------------|------------------------|
| **Wallets à gérer** | 3 (Master + Rewards + Migration) | 2 (Master + Rewards) |
| **Coût création** | 0€ | 0€ |
| **Complexité code** | Plus complexe | Plus simple |
| **Sécurité** | Même niveau | Même niveau |
| **USDC séparé** | Oui | Non (mais trackable en DB) |
| **Recommandé** | ❌ | ✅ |

---

## 🔒 TRACKING USDC EN MIGRATION

### Comment savoir combien d'USDC est "en migration" vs "en dépôt" ?

**Solution : Champs DB**

```typescript
// User schema
@Prop({ type: Number, default: 0 })
pendingUSDC: number; // USDC en attente de migration

@Prop({ type: Number, default: 0 })
depositedUSDC: number; // USDC déposé normalement (hors migration)
```

**Query balance Master Wallet :**
```typescript
// Total USDC dans Master Wallet
const totalUSDC = await masterWallet.getBalance('usdc');

// USDC en migration (somme de tous les users.pendingUSDC)
const migrationUSDC = await User.aggregate([
  { $match: { pendingMigration: true } },
  { $group: { _id: null, total: { $sum: '$pendingUSDC' } } }
]);

// USDC disponible = total - migration
const availableUSDC = totalUSDC - migrationUSDC[0].total;
```

---

## 💰 COÛT (inchangé)

| Opération | Coût |
|-----------|------|
| Master Wallet (déjà existant) | **GRATUIT** |
| Transferts user → Master Wallet | Gas fees (~$0.06) |
| Embedded Wallet création | **GRATUIT** (5000/mois) |
| Transferts Master Wallet → user | Gas fees (~$0.06) |
| **TOTAL par user** | **~$0.12** |

---

## ✅ CHECKLIST IMPLÉMENTATION

### Backend

- [ ] Modifier `CoinbaseWalletService` :
  - [ ] Ajouter `transferFromMasterWallet()`
  - [ ] Ajouter `transferNFTFromMasterWallet()`
  - [ ] Ajouter `getMasterWalletAddress()`

- [ ] Créer `ConfigController` :
  - [ ] GET `/config/master-wallet-address`

- [ ] Modifier `UserController` :
  - [ ] Détecter `pendingMigration` dans `syncWalletAddress()`
  - [ ] Appeler `transferFromMasterWallet()` si migration

- [ ] Créer endpoint `POST /users/me/mark-pending-migration`

### Frontend

- [ ] Créer `MigrationModal` :
  - [ ] Afficher balance USDC + NFTs
  - [ ] Bouton "Connecter ancien wallet"
  - [ ] Transfer USDC → Master Wallet
  - [ ] Transfer NFTs → Master Wallet
  - [ ] Appeler `/users/me/mark-pending-migration`

- [ ] Modifier `useEmbeddedWallet` :
  - [ ] Détecter `migrated: true` dans response
  - [ ] Afficher toast "Migration complétée"

### Tests

- [ ] Tester transfert USDC user → Master Wallet
- [ ] Tester transfert NFT user → Master Wallet
- [ ] Tester création Embedded Wallet
- [ ] Tester transfert automatique Master Wallet → user
- [ ] Tester balance tracking (migration vs deposit)

---

## 🎉 RÉSUMÉ

**OPTIMISATION :** Utiliser Master Wallet existant au lieu de créer wallet dédié.

**AVANTAGES :**
- ✅ Moins de wallets à gérer (2 au lieu de 3)
- ✅ Code plus simple
- ✅ Master Wallet déjà configuré et sécurisé
- ✅ Même coût (~$0.12/user)

**WORKFLOW :**
1. User transfère → Master Wallet
2. Backend track en DB (`pendingUSDC`, `pendingNFTTokenIds`)
3. User crée Embedded Wallet
4. Backend transfère Master Wallet → nouveau wallet
5. ✅ Migration complétée !

**PARFAIT pour votre cas d'usage !** 🚀

