# 🎯 PLAN D'IMPLÉMENTATION COMPLET - CyLimit Wallets V2

**Date :** 7 octobre 2025  
**Architecture :** Hybride (Embedded Wallets pour users + Server Wallets pour CyLimit)  
**Option choisie :** **B - CyLimit paie le gas (Paymaster)**

---

## 📋 Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [Flows Utilisateur](#flows-utilisateur)
3. [Backend - Implémentation Détaillée](#backend-implémentation-détaillée)
4. [Frontend - Implémentation Détaillée](#frontend-implémentation-détaillée)
5. [Intégrations Paiement](#intégrations-paiement)
6. [Checklist Complète](#checklist-complète)

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS (Embedded Wallets)                 │
│  ✅ Auth Email + OTP (simple, pas de seed phrase)          │
│  ✅ Smart Account (ERC-4337) - Gas sponsorisé par CyLimit  │
│  ✅ Balance USDC visible en temps réel                      │
│  ✅ Multi-device (jusqu'à 5 appareils)                     │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Signe transactions DANS l'app (pas redirection)
             │ Reçoit rewards automatiquement
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CYLIMIT (Server Wallets - Backend)             │
│  ✅ Master Wallet : Collecter fees marketplace              │
│  ✅ Rewards Wallet : Payer rewards automatiquement          │
│  ✅ Paymaster : Sponsoriser le gas des users                │
│  ✅ Automation complète (fees, rewards, gas)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 💳 Flows Utilisateur

### Flow 1 : Premier Dépôt (User sans wallet)

```
1. User clique "Add Funds"
   ↓
2. Modal s'ouvre : "Connecte-toi pour continuer"
   ↓
3. User entre email → Reçoit OTP → Entre OTP
   ↓
4. ✅ Embedded Wallet créé instantanément (< 500ms)
   ↓
5. Modal affiche : "Choisir méthode de paiement"
   │
   ├─→ Option A : Coinbase Onramp (CB/Virement)
   │   - Widget Coinbase s'ouvre DANS l'app
   │   - User paie avec CB
   │   - USDC arrive dans son Embedded Wallet
   │
   ├─→ Option B : Deposit crypto (autre wallet)
   │   - QR Code + Adresse affichés
   │   - User envoie USDC depuis MetaMask/etc.
   │   - Webhook détecte l'arrivée
   │
   └─→ Option C : Stripe (CB classique)
       - User paie en EUR avec Stripe
       - Backend reçoit paiement Stripe
       - Backend envoie USDC au user depuis Rewards Wallet
```

---

### Flow 2 : Achat NFT (User avec fonds suffisants)

```
1. User clique "Acheter ce NFT" (10 USDC)
   ↓
2. Frontend vérifie balance : 15 USDC ✅
   ↓
3. Modal confirmation :
   "Confirmer achat :
   - 10 USDC au vendeur
   - 0.05 USDC fee CyLimit
   - Gas offert par CyLimit ✨"
   ↓
4. User clique "Confirmer"
   ↓
5. Transaction signée par Embedded Wallet (dans l'app)
   ↓
6. Batch Transaction (1 TX blockchain) :
   - User → Vendeur : 10 USDC
   - User → CyLimit Master : 0.05 USDC
   - Vendeur → User : NFT #123
   - Gas payé par CyLimit Paymaster ✨
   ↓
7. ✅ NFT reçu + Balance mise à jour : 4.95 USDC
```

---

### Flow 3 : Achat NFT (User avec fonds insuffisants)

```
1. User clique "Acheter ce NFT" (10 USDC)
   ↓
2. Frontend vérifie balance : 5 USDC ❌
   ↓
3. Modal : "Fonds insuffisants (5 USDC / 10.05 USDC requis)"
   │
   ├─→ Option A : "Ajouter 5.05 USDC avec Coinbase"
   │   - Widget Coinbase s'ouvre
   │   - User achète 5.05 USDC
   │   - Après achat → Transaction NFT lancée AUTO ✨
   │
   ├─→ Option B : "Ajouter 5.05 USDC avec crypto"
   │   - QR Code affiché
   │   - User envoie depuis autre wallet
   │   - Après réception → Notification "Fonds reçus, acheter maintenant ?"
   │
   └─→ Option C : "Payer 5.05 EUR avec Stripe"
       - User paie avec CB via Stripe
       - Backend convertit EUR → USDC
       - Backend envoie USDC au user
       - Après réception → Transaction NFT lancée AUTO ✨
```

---

### Flow 4 : Recevoir un Reward

```
1. User gagne une compétition
   ↓
2. Backend détecte la victoire
   ↓
3. Backend appelle CoinbaseWalletService.sendReward()
   ↓
4. Rewards Wallet (Server) → User Embedded Wallet : 50 USDC
   - Gas sponsorisé par CyLimit ✨
   - User N'A PAS BESOIN d'avoir d'ETH
   ↓
5. ✅ User reçoit notification : "🎉 Vous avez reçu 50 USDC !"
   - Balance mise à jour automatiquement
```

---

## 🔧 Backend - Implémentation Détaillée

### Étape 1 : Configuration `.env`

```bash
# ========================================
# COINBASE CDP - SERVER WALLETS (Backend)
# ========================================
COINBASE_API_KEY_NAME=organizations/12345678-1234-1234-1234-123456789abc/apiKeys/87654321-4321-4321-4321-cba987654321
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEII...\n-----END EC PRIVATE KEY-----"
COINBASE_WALLET_SECRET=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6

# Master Wallet (Fees) - À créer puis copier l'adresse ici
COINBASE_MASTER_WALLET_ADDRESS=0x...

# Rewards Wallet - À créer puis copier l'adresse ici
COINBASE_REWARDS_WALLET_ADDRESS=0x...

# ========================================
# RÉSEAU BLOCKCHAIN
# ========================================
BLOCKCHAIN_NETWORK=base-sepolia # Dev
# BLOCKCHAIN_NETWORK=base-mainnet # Prod
BLOCKCHAIN_CHAIN_ID=84532 # Base Sepolia
# BLOCKCHAIN_CHAIN_ID=8453 # Base Mainnet

# ========================================
# USDC CONTRACT
# ========================================
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e # Base Sepolia
# USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 # Base Mainnet

# ========================================
# STRIPE (Paiements Fiat)
# ========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ========================================
# FEE CONFIGURATION
# ========================================
MARKETPLACE_FEE_PERCENT=0.05 # 0.05% = 5 basis points
MARKETPLACE_FEE_MIN_USDC=0.05 # 0.05 USDC minimum
```

---

### Étape 2 : Service `CoinbaseWalletService` (Backend)

**Fichier :** `src/modules/wallet/services/coinbase-wallet.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CdpClient } from '@coinbase/cdp-sdk';
import { encodeFunctionData } from 'viem';

/**
 * OBJECTIF :
 * Service backend pour gérer les Server Wallets CyLimit (Master, Rewards).
 * Permet de collecter les fees, payer les rewards, et sponsoriser le gas.
 *
 * POURQUOI :
 * CyLimit a besoin de wallets backend automatisés pour :
 * - Collecter les fees marketplace (Master Wallet)
 * - Payer les rewards users (Rewards Wallet)
 * - Sponsoriser le gas des users (Paymaster)
 *
 * COMMENT :
 * 1. Initialise le client CDP avec API Key + Wallet Secret
 * 2. Charge les wallets CyLimit (Master, Rewards)
 * 3. Expose des méthodes pour envoyer USDC, collecter fees, etc.
 *
 * APPELÉ DEPUIS :
 * - WalletController (endpoints API)
 * - MarketplaceService (collecter fees lors achat NFT)
 * - RewardsService (payer rewards automatiquement)
 *
 * APPELLE :
 * - CDP SDK (@coinbase/cdp-sdk)
 * - viem (encodage transactions)
 */
@Injectable()
export class CoinbaseWalletService implements OnModuleInit {
  private readonly logger = new Logger(CoinbaseWalletService.name);
  private cdp: CdpClient | null = null;
  private masterWalletAddress: string;
  private rewardsWalletAddress: string;
  private usdcContract: string;
  private networkId: string;
  private chainId: number;

  constructor(private readonly configService: ConfigService) {
    this.masterWalletAddress = this.configService.get<string>('COINBASE_MASTER_WALLET_ADDRESS');
    this.rewardsWalletAddress = this.configService.get<string>('COINBASE_REWARDS_WALLET_ADDRESS');
    this.usdcContract = this.configService.get<string>('USDC_CONTRACT_ADDRESS');
    this.networkId = this.configService.get<string>('BLOCKCHAIN_NETWORK');
    this.chainId = this.configService.get<number>('BLOCKCHAIN_CHAIN_ID');
  }

  async onModuleInit() {
    try {
      const apiKeyName = this.configService.get<string>('COINBASE_API_KEY_NAME');
      const privateKey = this.configService.get<string>('COINBASE_API_KEY_PRIVATE_KEY');
      const walletSecret = this.configService.get<string>('COINBASE_WALLET_SECRET');

      this.cdp = new CdpClient({
        apiKeyName,
        privateKey,
        walletSecret,
      });

      this.logger.log('✅ CDP Client initialisé avec succès');
      this.logger.log(`📍 Network: ${this.networkId} (Chain ID: ${this.chainId})`);
      this.logger.log(`💰 Master Wallet: ${this.masterWalletAddress}`);
      this.logger.log(`🎁 Rewards Wallet: ${this.rewardsWalletAddress}`);
    } catch (error) {
      this.logger.error('❌ Erreur initialisation CDP Client:', error);
      throw error;
    }
  }

  /**
   * Envoyer des USDC depuis Rewards Wallet vers un user (reward)
   * - Gas sponsorisé par CyLimit (user n'a pas besoin d'ETH)
   */
  async sendReward(
    userEmbeddedWalletAddress: string,
    amountUSDC: number,
  ): Promise<{ txHash: string; amount: number }> {
    try {
      this.logger.log(`🎁 Envoi reward : ${amountUSDC} USDC → ${userEmbeddedWalletAddress}`);

      // Montant en atomic units (USDC a 6 decimals)
      const amountAtomic = BigInt(Math.floor(amountUSDC * 1e6));

      // Encoder l'appel à transfer(address to, uint256 amount)
      const data = encodeFunctionData({
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: 'success', type: 'bool' }],
          },
        ],
        functionName: 'transfer',
        args: [userEmbeddedWalletAddress, amountAtomic],
      });

      // Envoyer la transaction
      const txHash = await this.cdp.evm.sendTransaction({
        from: this.rewardsWalletAddress,
        to: this.usdcContract,
        data,
        network: this.networkId,
        chainId: this.chainId,
        gasSponsorship: true, // ✨ CyLimit paie le gas
      });

      this.logger.log(`✅ Reward envoyé : TX Hash = ${txHash}`);

      return {
        txHash,
        amount: amountUSDC,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur envoi reward:`, error);
      throw new Error(`Impossible d'envoyer le reward: ${error.message}`);
    }
  }

  /**
   * Récupérer la balance USDC d'une adresse (user ou CyLimit wallet)
   */
  async getUSDCBalance(address: string): Promise<number> {
    try {
      const { createPublicClient, http } = await import('viem');
      const { baseSepolia } = await import('viem/chains');

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const balanceAtomic = await publicClient.readContract({
        address: this.usdcContract as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      const balanceUSDC = Number(balanceAtomic) / 1e6;
      return balanceUSDC;
    } catch (error) {
      this.logger.error(`❌ Erreur récupération balance:`, error);
      return 0;
    }
  }

  /**
   * Créer un Smart Account (pour tests)
   */
  async createSmartAccount(): Promise<{ address: string }> {
    try {
      const account = await this.cdp.evm.createAccount({
        type: 'smart',
      });

      this.logger.log(`✅ Smart Account créé: ${account.address}`);

      return { address: account.address };
    } catch (error) {
      this.logger.error(`❌ Erreur création Smart Account:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les balances des wallets CyLimit
   */
  async getCyLimitWalletsBalances(): Promise<{
    masterWallet: { address: string; balanceUSDC: number };
    rewardsWallet: { address: string; balanceUSDC: number };
  }> {
    const masterBalance = await this.getUSDCBalance(this.masterWalletAddress);
    const rewardsBalance = await this.getUSDCBalance(this.rewardsWalletAddress);

    return {
      masterWallet: {
        address: this.masterWalletAddress,
        balanceUSDC: masterBalance,
      },
      rewardsWallet: {
        address: this.rewardsWalletAddress,
        balanceUSDC: rewardsBalance,
      },
    };
  }
}
```

---

### Étape 3 : Service `DepositService` (Gestion Dépôts Multi-Sources)

**Fichier :** `src/modules/wallet/services/deposit.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinbaseWalletService } from './coinbase-wallet.service';
import { UserService } from '@/modules/user/user.service';
import Stripe from 'stripe';

/**
 * OBJECTIF :
 * Gérer les dépôts USDC des users depuis différentes sources :
 * - Coinbase Onramp (CB, virement SEPA)
 * - Crypto deposit (depuis autre wallet)
 * - Stripe (paiement CB classique converti en USDC)
 *
 * POURQUOI :
 * Users doivent pouvoir ajouter des fonds par plusieurs moyens,
 * et CyLimit doit gérer la conversion EUR → USDC si nécessaire.
 *
 * COMMENT :
 * 1. Coinbase Onramp : Webhook détecte l'achat → Met à jour balance user
 * 2. Crypto deposit : Webhook Alchemy détecte le transfert → Met à jour balance
 * 3. Stripe : Paiement reçu → CyLimit envoie USDC depuis Rewards Wallet
 *
 * APPELÉ DEPUIS :
 * - WebhooksController (Coinbase, Alchemy, Stripe webhooks)
 * - DepositController (endpoints user)
 *
 * APPELLE :
 * - CoinbaseWalletService (envoyer USDC)
 * - UserService (mettre à jour balance)
 */
@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly coinbaseWalletService: CoinbaseWalletService,
    private readonly userService: UserService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Gérer un dépôt Coinbase Onramp complété (webhook)
   */
  async handleOnrampCompleted(payload: {
    destination_address: string;
    amount: string;
    asset: string;
  }): Promise<void> {
    try {
      this.logger.log(`📥 Onramp completed: ${payload.amount} ${payload.asset} → ${payload.destination_address}`);

      // Trouver le user par son Embedded Wallet address
      const user = await this.userService.findByWalletAddress(payload.destination_address);
      if (!user) {
        this.logger.warn(`⚠️ User not found for address: ${payload.destination_address}`);
        return;
      }

      // Mettre à jour la balance user (si tu la stockes en DB)
      // Optionnel : la balance peut être récupérée on-chain directement
      await this.userService.updateUser(user._id, {
        lastDepositAt: new Date(),
      });

      this.logger.log(`✅ Onramp processed for user ${user._id}`);
    } catch (error) {
      this.logger.error(`❌ Erreur traitement Onramp webhook:`, error);
    }
  }

  /**
   * Gérer un dépôt crypto (depuis autre wallet) via webhook Alchemy
   */
  async handleCryptoDeposit(payload: {
    to: string;
    value: string;
    asset: string;
  }): Promise<void> {
    try {
      this.logger.log(`📥 Crypto deposit: ${payload.value} ${payload.asset} → ${payload.to}`);

      const user = await this.userService.findByWalletAddress(payload.to);
      if (!user) {
        this.logger.warn(`⚠️ User not found for address: ${payload.to}`);
        return;
      }

      await this.userService.updateUser(user._id, {
        lastDepositAt: new Date(),
      });

      this.logger.log(`✅ Crypto deposit processed for user ${user._id}`);
    } catch (error) {
      this.logger.error(`❌ Erreur traitement crypto deposit:`, error);
    }
  }

  /**
   * Créer un Payment Intent Stripe (paiement CB classique)
   * Backend convertit EUR → USDC et envoie au user
   */
  async createStripePaymentIntent(
    userId: string,
    amountEUR: number,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      this.logger.log(`💳 Création Payment Intent Stripe: ${amountEUR} EUR pour user ${userId}`);

      // Créer Payment Intent Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amountEUR * 100), // Stripe en centimes
        currency: 'eur',
        metadata: {
          userId,
          purpose: 'usdc_deposit',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur création Payment Intent:`, error);
      throw new Error(`Impossible de créer le paiement: ${error.message}`);
    }
  }

  /**
   * Gérer un paiement Stripe complété (webhook)
   * Convertir EUR → USDC et envoyer au user
   */
  async handleStripePaymentCompleted(paymentIntentId: string): Promise<void> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        this.logger.warn(`⚠️ Payment Intent ${paymentIntentId} not succeeded: ${paymentIntent.status}`);
        return;
      }

      const userId = paymentIntent.metadata.userId;
      const amountEUR = paymentIntent.amount / 100;

      this.logger.log(`💳 Stripe payment completed: ${amountEUR} EUR pour user ${userId}`);

      // Convertir EUR → USDC (1 EUR ≈ 1.1 USD, donc ~1.1 USDC)
      const amountUSDC = amountEUR * 1.1; // Simplification (utiliser une API de conversion en prod)

      // Récupérer le user
      const user = await this.userService.findById(userId);
      if (!user || !user.smartWallet?.address) {
        this.logger.error(`❌ User ${userId} ou wallet non trouvé`);
        return;
      }

      // Envoyer USDC depuis Rewards Wallet
      await this.coinbaseWalletService.sendReward(user.smartWallet.address, amountUSDC);

      this.logger.log(`✅ ${amountUSDC} USDC envoyés à ${user.smartWallet.address}`);
    } catch (error) {
      this.logger.error(`❌ Erreur traitement Stripe payment:`, error);
    }
  }
}
```

---

### Étape 4 : Controller `WalletController` (Endpoints API)

**Fichier :** `src/modules/wallet/controllers/wallet.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoinbaseWalletService } from '../services/coinbase-wallet.service';
import { DepositService } from '../services/deposit.service';

/**
 * OBJECTIF :
 * Exposer les endpoints API pour gérer les wallets users et CyLimit.
 *
 * ENDPOINTS :
 * - GET /wallet/:address/balance : Balance USDC d'un user
 * - GET /wallet/cylimit/balances : Balances Master + Rewards Wallets
 * - POST /wallet/deposit/stripe : Créer Payment Intent Stripe
 *
 * APPELÉ DEPUIS :
 * - Frontend (Next.js)
 *
 * APPELLE :
 * - CoinbaseWalletService
 * - DepositService
 */
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly coinbaseWalletService: CoinbaseWalletService,
    private readonly depositService: DepositService,
  ) {}

  /**
   * Récupérer la balance USDC d'un user
   */
  @Get(':address/balance')
  async getBalance(@Param('address') address: string) {
    const balanceUSDC = await this.coinbaseWalletService.getUSDCBalance(address);

    return {
      success: true,
      data: {
        address,
        balanceUSDC,
      },
    };
  }

  /**
   * Récupérer les balances des wallets CyLimit (Master + Rewards)
   */
  @UseGuards(AuthGuard('jwt')) // Protégé : admin only
  @Get('cylimit/balances')
  async getCyLimitBalances() {
    const balances = await this.coinbaseWalletService.getCyLimitWalletsBalances();

    return {
      success: true,
      data: balances,
    };
  }

  /**
   * Créer un Payment Intent Stripe (paiement CB classique)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('deposit/stripe')
  async createStripeDeposit(
    @Body() body: { amountEUR: number },
    @Req() req: any,
  ) {
    const userId = req.user.id;

    const paymentIntent = await this.depositService.createStripePaymentIntent(userId, body.amountEUR);

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
      },
    };
  }
}
```

---

### Étape 5 : Controller `WebhooksController` (Webhooks Coinbase, Stripe, Alchemy)

**Fichier :** `src/modules/webhooks/webhooks.controller.ts`

```typescript
import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { DepositService } from '@/modules/wallet/services/deposit.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * OBJECTIF :
 * Recevoir les webhooks Coinbase, Stripe, et Alchemy pour détecter :
 * - Achats USDC via Coinbase Onramp
 * - Paiements Stripe complétés
 * - Dépôts crypto détectés par Alchemy
 *
 * POURQUOI :
 * Les webhooks permettent une réaction temps réel aux événements blockchain
 * et paiements, sans polling.
 *
 * APPELÉ DEPUIS :
 * - Coinbase (onramp completed)
 * - Stripe (payment succeeded)
 * - Alchemy (transfer detected)
 *
 * APPELLE :
 * - DepositService
 */
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly depositService: DepositService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Webhook Coinbase Onramp
   */
  @Post('coinbase/onramp')
  async handleCoinbaseOnramp(
    @Body() payload: any,
    @Headers('x-coinbase-signature') signature: string,
  ) {
    // Vérifier la signature (sécurité)
    const isValid = this.verifyCoinbaseSignature(payload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid Coinbase signature');
    }

    if (payload.type === 'onramp.transaction.completed') {
      await this.depositService.handleOnrampCompleted(payload.data);
    }

    return { success: true };
  }

  /**
   * Webhook Stripe
   */
  @Post('stripe')
  async handleStripe(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripe = require('stripe')(this.configService.get<string>('STRIPE_SECRET_KEY'));
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    try {
      // Vérifier la signature Stripe
      const event = stripe.webhooks.constructEvent(
        JSON.stringify(payload),
        signature,
        webhookSecret,
      );

      if (event.type === 'payment_intent.succeeded') {
        await this.depositService.handleStripePaymentCompleted(event.data.object.id);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('❌ Stripe webhook error:', error);
      throw new UnauthorizedException('Invalid Stripe signature');
    }
  }

  /**
   * Webhook Alchemy (détection transferts USDC)
   */
  @Post('alchemy')
  async handleAlchemy(@Body() payload: any) {
    // Alchemy webhook pour détecter les transferts USDC entrants
    if (payload.event?.activity && payload.event.activity.length > 0) {
      const activity = payload.event.activity[0];

      if (activity.category === 'token' && activity.asset === 'USDC') {
        await this.depositService.handleCryptoDeposit({
          to: activity.toAddress,
          value: activity.value,
          asset: 'USDC',
        });
      }
    }

    return { success: true };
  }

  /**
   * Vérifier signature Coinbase (sécurité)
   */
  private verifyCoinbaseSignature(payload: any, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('COINBASE_WEBHOOK_SECRET');
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }
}
```

---

## 💻 Frontend - Implémentation Détaillée

### Étape 1 : Configuration CDP Provider

**Fichier :** `pages/_app.tsx`

```typescript
import { CDPReactProvider } from "@coinbase/cdp-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CDPReactProvider 
        config={{
          projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID,
          ethereum: {
            createOnLogin: "smart", // Smart Accounts (ERC-4337)
          },
          appName: "CyLimit",
        }}
      >
        <Component {...pageProps} />
      </CDPReactProvider>
    </QueryClientProvider>
  );
}

export default App;
```

**Variables `.env.local`** :

```bash
NEXT_PUBLIC_CDP_PROJECT_ID=<ton-project-id-depuis-portal>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### Étape 2 : Hook `useWallet` (Gestion État Wallet)

**Fichier :** `src/hooks/useWallet.ts`

```typescript
import { useEvmAddress, useIsSignedIn, useBalance } from "@coinbase/cdp-hooks";
import { useGetUserProfile } from "@/queries/user";
import { useEffect, useState } from "react";

/**
 * OBJECTIF :
 * Hook centralisé pour gérer l'état du wallet user.
 * 
 * POURQUOI :
 * Simplifie l'accès aux infos wallet dans tous les composants.
 *
 * RETOURNE :
 * - isConnected : User authentifié ?
 * - evmAddress : Adresse Embedded Wallet
 * - balanceUSDC : Balance USDC
 * - isLoading : Chargement ?
 */
export function useWallet() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { data: userProfile } = useGetUserProfile();
  
  const { balance: balanceUSDC, isLoading: isLoadingBalance } = useBalance({
    address: evmAddress,
    network: "base-sepolia",
    asset: "USDC",
  });

  return {
    isConnected: isSignedIn,
    evmAddress,
    balanceUSDC: balanceUSDC ?? 0,
    isLoading: isLoadingBalance,
  };
}
```

---

### Étape 3 : Composant `AddFundModal` (Choisir Méthode Dépôt)

**Fichier :** `src/components/AddFundModal/index.tsx`

```typescript
"use client";

import { useState } from "react";
import { Modal, Button, Tabs, TabList, Tab, TabPanels, TabPanel, Input, Box, Text } from "@chakra-ui/react";
import { OnrampButton } from "@coinbase/cdp-react";
import { useWallet } from "@/hooks/useWallet";
import { QRCodeSVG } from "qrcode.react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/**
 * OBJECTIF :
 * Modal permettant au user de choisir comment ajouter des fonds :
 * - Option A : Coinbase Onramp (CB, virement SEPA)
 * - Option B : Deposit crypto (QR Code + adresse)
 * - Option C : Stripe (paiement CB classique)
 *
 * POURQUOI :
 * Offrir plusieurs méthodes de dépôt augmente le taux de conversion.
 *
 * APPELÉ DEPUIS :
 * - WalletModal (bouton "Add Funds")
 * - BuyNFTButton (si fonds insuffisants)
 */
export function AddFundModal({ isOpen, onClose }) {
  const { evmAddress } = useWallet();
  const [amount, setAmount] = useState(100);
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>Ajouter des fonds</Modal.Header>
        <Modal.Body>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Montant (USDC ou EUR)"
            mb={4}
          />

          <Tabs index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>Coinbase (CB/Virement)</Tab>
              <Tab>Crypto Deposit</Tab>
              <Tab>Carte Bancaire (Stripe)</Tab>
            </TabList>

            <TabPanels>
              {/* Option A : Coinbase Onramp */}
              <TabPanel>
                <Text mb={4}>
                  Achetez des USDC avec votre carte bancaire ou virement SEPA.
                  Fees : ~3.5% CB, ~1% virement.
                </Text>
                <OnrampButton
                  destinationAddress={evmAddress}
                  network="base"
                  asset="USDC"
                  presetAmount={amount}
                  onSuccess={(data) => {
                    console.log('✅ Achat réussi:', data);
                    onClose();
                  }}
                  onError={(error) => {
                    console.error('❌ Erreur:', error);
                  }}
                >
                  Acheter {amount} USDC avec Coinbase
                </OnrampButton>
              </TabPanel>

              {/* Option B : Crypto Deposit */}
              <TabPanel>
                <Text mb={4}>
                  Envoyez des USDC depuis votre wallet crypto (MetaMask, Coinbase Wallet, etc.)
                </Text>
                <Box textAlign="center" mb={4}>
                  <QRCodeSVG value={evmAddress} size={200} />
                </Box>
                <Text fontSize="sm" fontFamily="mono" bg="gray.100" p={2} borderRadius="md">
                  {evmAddress}
                </Text>
                <Text fontSize="xs" color="gray.600" mt={2}>
                  ⚠️ Envoyez UNIQUEMENT des USDC sur Base ou Polygon
                </Text>
              </TabPanel>

              {/* Option C : Stripe (CB classique) */}
              <TabPanel>
                <Text mb={4}>
                  Payez avec votre carte bancaire (Stripe). CyLimit vous enverra des USDC.
                </Text>
                <Elements stripe={stripePromise}>
                  <StripePaymentForm amount={amount} onSuccess={onClose} />
                </Elements>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}

/**
 * Formulaire Stripe (intégré dans l'Option C)
 */
function StripePaymentForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  // Créer Payment Intent au montage
  useEffect(() => {
    fetch('/api/wallet/deposit/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEUR: amount }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.data.clientSecret));
  }, [amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/deposit/success`,
      },
    });

    if (error) {
      console.error('❌ Stripe error:', error);
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  if (!clientSecret) return <Text>Chargement...</Text>;

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button type="submit" isLoading={isProcessing} mt={4} w="full">
        Payer {amount} EUR
      </Button>
    </form>
  );
}
```

---

### Étape 4 : Composant `BuyNFTButton` (Achat NFT avec Gestion Fonds Insuffisants)

**Fichier :** `src/components/BuyNFTButton/index.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button, useToast, useDisclosure } from "@chakra-ui/react";
import { SendEvmTransactionButton } from "@coinbase/cdp-react";
import { useWallet } from "@/hooks/useWallet";
import { AddFundModal } from "@/components/AddFundModal";
import { encodeFunctionData } from "viem";

/**
 * OBJECTIF :
 * Bouton pour acheter un NFT avec gestion automatique des fonds insuffisants.
 *
 * LOGIQUE :
 * 1. Vérifier si balance suffisante
 * 2. Si OUI → Lancer transaction achat NFT
 * 3. Si NON → Ouvrir modal "Add Funds"
 *
 * TRANSACTION BATCH (1 TX blockchain) :
 * - User → Vendeur : 10 USDC
 * - User → CyLimit Master : 0.05 USDC fee
 * - Vendeur → User : NFT #123
 * - Gas payé par CyLimit (Paymaster)
 *
 * APPELÉ DEPUIS :
 * - Page NFT (/nft/[id])
 */
export function BuyNFTButton({ nft, seller }) {
  const { evmAddress, balanceUSDC } = useWallet();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const totalPrice = nft.price + 0.05; // Prix + fee
  const hasSufficientFunds = balanceUSDC >= totalPrice;

  const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT;
  const CYLIMIT_MASTER = process.env.NEXT_PUBLIC_CYLIMIT_MASTER_WALLET;

  if (!hasSufficientFunds) {
    return (
      <>
        <Button onClick={onOpen} colorScheme="red">
          Fonds insuffisants ({balanceUSDC.toFixed(2)} / {totalPrice.toFixed(2)} USDC)
        </Button>
        <AddFundModal isOpen={isOpen} onClose={onClose} />
      </>
    );
  }

  return (
    <SendEvmTransactionButton
      account={evmAddress}
      network="base-sepolia"
      transaction={{
        calls: [
          // 1. User → Vendeur : Prix NFT
          {
            to: USDC_CONTRACT,
            data: encodeFunctionData({
              abi: [
                {
                  name: 'transfer',
                  type: 'function',
                  inputs: [
                    { name: 'to', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                  ],
                  outputs: [{ name: 'success', type: 'bool' }],
                },
              ],
              functionName: 'transfer',
              args: [seller.address, BigInt(Math.floor(nft.price * 1e6))],
            }),
          },
          // 2. User → CyLimit Master : Fee
          {
            to: USDC_CONTRACT,
            data: encodeFunctionData({
              abi: [/* ... */],
              functionName: 'transfer',
              args: [CYLIMIT_MASTER, BigInt(0.05 * 1e6)],
            }),
          },
          // 3. Transfer NFT (nécessite approval backend ou signature vendeur)
          // À implémenter selon ton smart contract NFT
        ],
        // ✨ CyLimit paie le gas
        paymasterAndData: process.env.NEXT_PUBLIC_CYLIMIT_PAYMASTER_ADDRESS,
      }}
      onSuccess={(hash) => {
        toast({
          title: '✅ NFT acheté !',
          description: `Transaction: ${hash}`,
          status: 'success',
        });
      }}
      onError={(error) => {
        toast({
          title: '❌ Erreur',
          description: error.message,
          status: 'error',
        });
      }}
    >
      Acheter ce NFT ({totalPrice.toFixed(2)} USDC)
    </SendEvmTransactionButton>
  );
}
```

---

## ✅ Checklist Complète d'Implémentation

### Phase 1 : Setup Backend (Server Wallets)

- [ ] **1.1** Créer compte CDP Portal
- [ ] **1.2** Générer CDP API Key (Secret)
- [ ] **1.3** Générer Wallet Secret
- [ ] **1.4** Configurer `.env` backend
- [ ] **1.5** Installer `@coinbase/cdp-sdk` et `viem`
- [ ] **1.6** Créer `CoinbaseWalletService`
- [ ] **1.7** Créer Master Wallet (Smart Account)
- [ ] **1.8** Créer Rewards Wallet (Smart Account)
- [ ] **1.9** Tester création de Smart Account
- [ ] **1.10** Tester balance USDC

---

### Phase 2 : Setup Frontend (Embedded Wallets)

- [ ] **2.1** Créer projet CDP Portal (Embedded Wallets)
- [ ] **2.2** Récupérer Project ID
- [ ] **2.3** Configurer domaines (localhost + prod)
- [ ] **2.4** Installer `@coinbase/cdp-react` et `@coinbase/cdp-hooks`
- [ ] **2.5** Wrapper app avec `<CDPReactProvider>`
- [ ] **2.6** Créer hook `useWallet`
- [ ] **2.7** Tester auth email/OTP
- [ ] **2.8** Vérifier que wallet est créé instantanément

---

### Phase 3 : Intégrations Dépôt (Coinbase, Crypto, Stripe)

- [ ] **3.1** Activer Coinbase Onramp dans CDP Portal
- [ ] **3.2** Créer composant `AddFundModal` (3 options)
- [ ] **3.3** Intégrer widget Coinbase Onramp (Option A)
- [ ] **3.4** Tester achat USDC avec CB testnet
- [ ] **3.5** Créer webhook Coinbase (`/webhooks/coinbase/onramp`)
- [ ] **3.6** Tester webhook Onramp completed
- [ ] **3.7** Créer QR Code pour crypto deposit (Option B)
- [ ] **3.8** Configurer Alchemy webhook (détection transferts)
- [ ] **3.9** Créer webhook Alchemy (`/webhooks/alchemy`)
- [ ] **3.10** Créer compte Stripe
- [ ] **3.11** Intégrer Stripe Elements (Option C)
- [ ] **3.12** Créer endpoint `/wallet/deposit/stripe`
- [ ] **3.13** Créer webhook Stripe (`/webhooks/stripe`)
- [ ] **3.14** Tester paiement Stripe → Envoi USDC auto

---

### Phase 4 : Marketplace & Fees

- [ ] **4.1** Créer composant `BuyNFTButton`
- [ ] **4.2** Implémenter batch transaction (User → Vendeur + User → CyLimit Master)
- [ ] **4.3** Configurer Paymaster (CyLimit paie le gas)
- [ ] **4.4** Tester achat NFT avec fonds suffisants
- [ ] **4.5** Tester modal "Fonds insuffisants"
- [ ] **4.6** Implémenter calcul fees dynamique (`FeeCalculatorService`)
- [ ] **4.7** Créer endpoint `/wallet/cylimit/balances` (monitoring)

---

### Phase 5 : Rewards Automatiques

- [ ] **5.1** Créer `RewardsService`
- [ ] **5.2** Implémenter `sendReward(userId, amount)` (depuis Rewards Wallet)
- [ ] **5.3** Activer gas sponsorship (users sans ETH)
- [ ] **5.4** Tester paiement reward automatique
- [ ] **5.5** Créer notification frontend "🎉 Reward reçu !"

---

### Phase 6 : Production

- [ ] **6.1** Demander full access Coinbase Onramp (CDP Portal)
- [ ] **6.2** Migrer vers Mainnet (Base ou Polygon)
- [ ] **6.3** Mettre à jour `.env` (mainnet contract addresses)
- [ ] **6.4** Configurer alertes (balance Master < 1000 USDC)
- [ ] **6.5** Rotate Wallet Secret (backup sécurisé)
- [ ] **6.6** Tests end-to-end complets

---

## 🎉 Résumé Final

**Architecture choisie :**
- **Embedded Wallets** pour les users (auth email/OTP, widget Onramp intégré, Smart Accounts)
- **Server Wallets** pour CyLimit (Master, Rewards, automation complète)
- **Option B : CyLimit paie le gas** via Paymaster (UX optimale)

**Méthodes de dépôt :**
1. **Coinbase Onramp** (CB, virement SEPA) - Widget intégré
2. **Crypto deposit** (QR Code, depuis autre wallet)
3. **Stripe** (CB classique, backend convertit EUR → USDC)

**Flow achat NFT :**
- Vérification balance
- Si insuffisant → Modal "Add Funds" (3 options)
- Si suffisant → Batch transaction (User → Vendeur + Fee + NFT)
- Gas payé par CyLimit (Paymaster)

**Rewards :**
- Automatiques depuis Rewards Wallet
- Gas sponsorisé (user n'a pas besoin d'ETH)

---

**📝 Note créée par :** Claude (Assistant IA)  
**📅 Date :** 7 octobre 2025  
**✅ Prêt pour implémentation !**

