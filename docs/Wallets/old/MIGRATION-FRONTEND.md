# 🚀 Migration Frontend - Nouveau Système Wallets & Paiements

## 📋 Vue d'ensemble

Ce document détaille la migration complète du frontend pour intégrer le nouveau système de wallets basé sur Coinbase Smart Accounts et les nouvelles API.

---

## 🔄 Changements majeurs

### ❌ Ancien système (à supprimer)
- MetaMask / WalletConnect
- Gestion manuelle des clés privées
- Transactions manuelles avec gas fees
- Moralis pour les balances
- Approbations USDC séparées

### ✅ Nouveau système (à implémenter)
- Coinbase Smart Accounts (pas de MetaMask requis)
- Wallets gérés côté serveur (sécurisé)
- Transactions gasless (sponsorisées)
- API REST CyLimit pour tout
- Transactions atomiques (USDC + NFT en une fois)

---

## 📁 Structure Frontend à créer

```
src/
├── services/
│   ├── wallet.service.ts          # Nouveau service wallet
│   ├── marketplace.service.ts     # Nouveau service marketplace
│   └── fees.service.ts            # Service calcul fees
├── hooks/
│   ├── useWallet.ts               # Hook gestion wallet
│   ├── useMarketplace.ts          # Hook marketplace
│   └── useFees.ts                 # Hook preview fees
├── components/
│   ├── wallet/
│   │   ├── WalletConnect.tsx      # Nouveau composant connexion
│   │   ├── WalletBalance.tsx      # Affichage balance
│   │   └── DepositModal.tsx       # Modal dépôt USDC
│   └── marketplace/
│       ├── BuyNFTModal.tsx        # Modal achat NFT
│       ├── SellNFTModal.tsx       # Modal vente NFT
│       └── FeePreview.tsx         # Prévisualisation fees
└── types/
    ├── wallet.types.ts            # Types wallet
    └── marketplace.types.ts       # Types marketplace
```

---

## 🔧 1. Services API

### `src/services/wallet.service.ts`

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/v1';

export interface WalletInfo {
  walletId: string;
  address: string;
  network: string;
}

export interface Balance {
  usdc: number;
  matic: number;
}

export interface FeePreview {
  sellerFee: number;
  buyerFee: number;
  stripeFee: number;
  coinbaseFee: number;
  totalToSeller: number;
  totalFromBuyer: number;
  phase: number;
}

class WalletService {
  /**
   * Créer un wallet pour un user
   */
  async createWallet(userId: string): Promise<WalletInfo> {
    const response = await axios.post(`${API_URL}/wallet/create`, { userId });
    return response.data.data;
  }

  /**
   * Récupérer la balance d'un wallet
   */
  async getBalance(address: string): Promise<Balance> {
    const response = await axios.get(`${API_URL}/wallet/${address}/balance`);
    return response.data.data;
  }

  /**
   * Générer un lien Coinbase Onramp pour déposer des USDC
   */
  async getOnrampLink(address: string, amount: number): Promise<string> {
    const response = await axios.get(
      `${API_URL}/wallet/${address}/onramp?amount=${amount}`
    );
    return response.data.data.onrampUrl;
  }

  /**
   * Prévisualiser les fees pour une transaction
   */
  async previewFees(
    priceUSDC: number,
    paymentMethod: 'usdc' | 'coinbase' | 'stripe',
    buyerIsPremium: boolean = false,
    sellerIsPremium: boolean = false
  ): Promise<FeePreview> {
    const response = await axios.post(`${API_URL}/wallet/preview-fees`, {
      priceUSDC,
      paymentMethod,
      buyerIsPremium,
      sellerIsPremium,
    });
    return response.data.data;
  }

  /**
   * Récupérer la phase actuelle du système de fees
   */
  async getCurrentPhase(): Promise<{ phase: number; description: string }> {
    const response = await axios.get(`${API_URL}/wallet/phase`);
    return response.data.data;
  }

  /**
   * Vérifier si le service Coinbase est disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_URL}/wallet/health`);
      return response.data.data.coinbaseService === 'available';
    } catch {
      return false;
    }
  }
}

export default new WalletService();
```

### `src/services/marketplace.service.ts`

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/v1';

export interface PurchaseRequest {
  nftId: string;
  nftContractAddress: string;
  priceUSDC: number;
  buyerWalletId: string;
  sellerWalletAddress: string;
  paymentMethod: 'usdc' | 'coinbase' | 'stripe';
  buyerIsPremium?: boolean;
  sellerIsPremium?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  nftTransferHash?: string;
  fees: {
    sellerFee: number;
    buyerFee: number;
    stripeFee: number;
    coinbaseFee: number;
  };
  amounts: {
    totalPaid: number;
    receivedBySeller: number;
    receivedByPlatform: number;
  };
  error?: string;
}

export interface ListingRequest {
  nftId: string;
  nftContractAddress: string;
  priceUSDC: number;
  sellerWalletAddress: string;
}

class MarketplaceService {
  /**
   * Acheter un NFT
   */
  async purchaseNFT(request: PurchaseRequest): Promise<PurchaseResult> {
    const response = await axios.post(`${API_URL}/marketplace/purchase`, request);
    return response.data.data;
  }

  /**
   * Mettre un NFT en vente
   */
  async listNFT(request: ListingRequest): Promise<any> {
    const response = await axios.post(`${API_URL}/marketplace/list`, request);
    return response.data.data;
  }

  /**
   * Annuler une vente
   */
  async cancelListing(listingId: string, sellerWalletAddress: string): Promise<boolean> {
    const response = await axios.delete(`${API_URL}/marketplace/listing/${listingId}`, {
      data: { sellerWalletAddress },
    });
    return response.data.success;
  }

  /**
   * Récupérer les détails d'une vente
   */
  async getListing(listingId: string): Promise<any> {
    const response = await axios.get(`${API_URL}/marketplace/listing/${listingId}`);
    return response.data.data;
  }

  /**
   * Récupérer toutes les ventes actives
   */
  async getActiveListings(): Promise<any[]> {
    const response = await axios.get(`${API_URL}/marketplace/listings`);
    return response.data.data;
  }
}

export default new MarketplaceService();
```

---

## 🎣 2. Hooks React

### `src/hooks/useWallet.ts`

```typescript
import { useState, useEffect } from 'react';
import walletService, { Balance, WalletInfo } from '@/services/wallet.service';

export const useWallet = (userId?: string) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Créer un wallet pour le user
  const createWallet = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newWallet = await walletService.createWallet(userId);
      setWallet(newWallet);
      return newWallet;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du wallet');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Récupérer la balance
  const refreshBalance = async () => {
    if (!wallet?.address) return;
    
    try {
      const newBalance = await walletService.getBalance(wallet.address);
      setBalance(newBalance);
      return newBalance;
    } catch (err: any) {
      console.error('Erreur lors de la récupération de la balance', err);
    }
  };

  // Générer un lien de dépôt
  const getDepositLink = async (amount: number) => {
    if (!wallet?.address) throw new Error('Wallet non initialisé');
    return await walletService.getOnrampLink(wallet.address, amount);
  };

  // Rafraîchir la balance automatiquement
  useEffect(() => {
    if (wallet?.address) {
      refreshBalance();
      
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [wallet?.address]);

  return {
    wallet,
    balance,
    loading,
    error,
    createWallet,
    refreshBalance,
    getDepositLink,
  };
};
```

### `src/hooks/useMarketplace.ts`

```typescript
import { useState } from 'react';
import marketplaceService, { PurchaseRequest, PurchaseResult } from '@/services/marketplace.service';

export const useMarketplace = () => {
  const [purchasing, setPurchasing] = useState(false);
  const [listing, setListing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseNFT = async (request: PurchaseRequest): Promise<PurchaseResult> => {
    setPurchasing(true);
    setError(null);

    try {
      const result = await marketplaceService.purchaseNFT(request);
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de l\'achat');
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de l\'achat du NFT';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const listNFT = async (
    nftId: string,
    nftContractAddress: string,
    priceUSDC: number,
    sellerWalletAddress: string
  ) => {
    setListing(true);
    setError(null);

    try {
      const result = await marketplaceService.listNFT({
        nftId,
        nftContractAddress,
        priceUSDC,
        sellerWalletAddress,
      });

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la mise en vente';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setListing(false);
    }
  };

  return {
    purchaseNFT,
    listNFT,
    purchasing,
    listing,
    error,
  };
};
```

### `src/hooks/useFees.ts`

```typescript
import { useState, useEffect } from 'react';
import walletService, { FeePreview } from '@/services/wallet.service';

export const useFees = (
  priceUSDC: number,
  paymentMethod: 'usdc' | 'coinbase' | 'stripe',
  buyerIsPremium: boolean = false,
  sellerIsPremium: boolean = false
) => {
  const [fees, setFees] = useState<FeePreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFees = async () => {
      if (priceUSDC <= 0) return;

      setLoading(true);
      try {
        const preview = await walletService.previewFees(
          priceUSDC,
          paymentMethod,
          buyerIsPremium,
          sellerIsPremium
        );
        setFees(preview);
      } catch (err) {
        console.error('Erreur lors du calcul des fees', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [priceUSDC, paymentMethod, buyerIsPremium, sellerIsPremium]);

  return { fees, loading };
};
```

---

## 🎨 3. Composants UI

### `src/components/wallet/WalletConnect.tsx`

```typescript
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth'; // Ton hook d'auth existant

export const WalletConnect = () => {
  const { user } = useAuth();
  const { wallet, balance, loading, createWallet, refreshBalance } = useWallet(user?.id);

  const handleConnect = async () => {
    try {
      await createWallet();
      // Afficher un message de succès
    } catch (err) {
      // Afficher une erreur
    }
  };

  if (loading) {
    return <div>Chargement du wallet...</div>;
  }

  if (!wallet) {
    return (
      <button onClick={handleConnect} className="btn-primary">
        Créer mon wallet
      </button>
    );
  }

  return (
    <div className="wallet-info">
      <div className="wallet-address">
        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
      </div>
      <div className="wallet-balance">
        {balance?.usdc.toFixed(2) || '0.00'} USDC
      </div>
      <button onClick={refreshBalance} className="btn-secondary">
        Rafraîchir
      </button>
    </div>
  );
};
```

### `src/components/wallet/DepositModal.tsx`

```typescript
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const { wallet, getDepositLink } = useWallet();
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      const onrampUrl = await getDepositLink(amount);
      // Ouvrir le lien Coinbase Onramp dans une nouvelle fenêtre
      window.open(onrampUrl, '_blank');
      onClose();
    } catch (err) {
      console.error('Erreur lors de la génération du lien', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Déposer des USDC</h2>
        
        <div className="form-group">
          <label>Montant (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={1}
          />
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            onClick={handleDeposit} 
            className="btn-primary"
            disabled={loading || amount <= 0}
          >
            {loading ? 'Chargement...' : 'Déposer avec Coinbase'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### `src/components/marketplace/BuyNFTModal.tsx`

```typescript
import { useState } from 'react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useFees } from '@/hooks/useFees';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';

interface BuyNFTModalProps {
  nft: {
    id: string;
    contractAddress: string;
    price: number;
    seller: {
      walletAddress: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BuyNFTModal = ({ nft, isOpen, onClose, onSuccess }: BuyNFTModalProps) => {
  const { user } = useAuth();
  const { wallet, balance } = useWallet(user?.id);
  const { purchaseNFT, purchasing, error } = useMarketplace();
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'coinbase' | 'stripe'>('usdc');
  
  const { fees, loading: feesLoading } = useFees(
    nft.price,
    paymentMethod,
    user?.isPremium || false,
    false // TODO: récupérer le statut Premium du vendeur
  );

  const handlePurchase = async () => {
    if (!wallet || !fees) return;

    // Vérifier la balance
    if (balance && balance.usdc < fees.totalFromBuyer) {
      alert('Balance insuffisante');
      return;
    }

    try {
      const result = await purchaseNFT({
        nftId: nft.id,
        nftContractAddress: nft.contractAddress,
        priceUSDC: nft.price,
        buyerWalletId: wallet.walletId,
        sellerWalletAddress: nft.seller.walletAddress,
        paymentMethod,
        buyerIsPremium: user?.isPremium,
      });

      if (result.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Erreur lors de l\'achat', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Acheter ce NFT</h2>

        <div className="nft-info">
          <div className="price">Prix: {nft.price} USDC</div>
        </div>

        <div className="payment-method">
          <label>Méthode de paiement</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value as any)}
          >
            <option value="usdc">USDC (Wallet)</option>
            <option value="coinbase">Coinbase Onramp</option>
            <option value="stripe">Carte bancaire (Stripe)</option>
          </select>
        </div>

        {fees && !feesLoading && (
          <div className="fees-preview">
            <h3>Détails de la transaction</h3>
            <div className="fee-line">
              <span>Prix du NFT</span>
              <span>{nft.price} USDC</span>
            </div>
            {fees.buyerFee > 0 && (
              <div className="fee-line">
                <span>Fees acheteur</span>
                <span>{fees.buyerFee} USDC</span>
              </div>
            )}
            {fees.stripeFee > 0 && (
              <div className="fee-line">
                <span>Fees Stripe</span>
                <span>{fees.stripeFee} USDC</span>
              </div>
            )}
            {fees.coinbaseFee > 0 && (
              <div className="fee-line">
                <span>Fees Coinbase</span>
                <span>{fees.coinbaseFee} USDC</span>
              </div>
            )}
            <div className="fee-line total">
              <span>Total à payer</span>
              <span>{fees.totalFromBuyer} USDC</span>
            </div>
          </div>
        )}

        {balance && balance.usdc < (fees?.totalFromBuyer || 0) && (
          <div className="alert alert-warning">
            Balance insuffisante. Vous avez {balance.usdc} USDC.
          </div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button 
            onClick={handlePurchase} 
            className="btn-primary"
            disabled={purchasing || !wallet || !fees || (balance && balance.usdc < (fees?.totalFromBuyer || 0))}
          >
            {purchasing ? 'Achat en cours...' : 'Acheter'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📝 4. Plan de migration étape par étape

### Phase 1 : Préparation (1-2 jours)
- [ ] Créer les services API (`wallet.service.ts`, `marketplace.service.ts`)
- [ ] Créer les hooks (`useWallet`, `useMarketplace`, `useFees`)
- [ ] Créer les types TypeScript
- [ ] Tester les appels API avec Postman/Thunder Client

### Phase 2 : Composants de base (2-3 jours)
- [ ] Créer `WalletConnect` (connexion/création wallet)
- [ ] Créer `WalletBalance` (affichage balance)
- [ ] Créer `DepositModal` (dépôt USDC via Coinbase Onramp)
- [ ] Créer `FeePreview` (prévisualisation fees)

### Phase 3 : Marketplace (3-4 jours)
- [ ] Créer `BuyNFTModal` (achat NFT)
- [ ] Créer `SellNFTModal` (mise en vente)
- [ ] Intégrer dans les pages existantes
- [ ] Remplacer les anciens appels MetaMask

### Phase 4 : Migration des pages (2-3 jours)
- [ ] Page Marketplace : remplacer l'ancien système
- [ ] Page Profile : afficher le nouveau wallet
- [ ] Page NFT Details : nouveau bouton achat
- [ ] Supprimer les anciens composants MetaMask

### Phase 5 : Tests & Polish (2-3 jours)
- [ ] Tests end-to-end
- [ ] Gestion des erreurs
- [ ] Loading states
- [ ] Messages de succès/erreur
- [ ] Responsive design

---

## 🔑 Variables d'environnement

Ajoute dans `.env.local` :

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/v1
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x28b53123d2C5fFc3aeAc39bd7f05cCDE97b319b3
NEXT_PUBLIC_NETWORK=base-sepolia
```

---

## ⚠️ Points d'attention

### 1. Gestion des wallets users existants
Les users avec des anciens wallets MetaMask devront créer un nouveau Smart Account. Prévois :
- Un message expliquant la migration
- Une page de transition
- Un guide pour transférer les NFTs (si nécessaire)

### 2. Gestion des erreurs
Prévois des messages clairs pour :
- Balance insuffisante
- Service Coinbase indisponible
- Erreurs réseau
- NFT déjà vendu

### 3. UX/UI
- Loading states pendant les transactions
- Feedback visuel clair
- Prévisualisation des fees AVANT l'achat
- Confirmation avant achat

### 4. Sécurité
- Ne JAMAIS exposer les clés privées
- Valider côté backend
- Rate limiting sur les API
- Vérifier les montants

---

## 📚 Ressources

- [API Backend Documentation](./PROCHAINES-ETAPES.md)
- [Coinbase Onramp Docs](https://docs.cdp.coinbase.com/onramp/docs/welcome)
- [Smart Accounts Guide](https://docs.cdp.coinbase.com/smart-accounts/docs/welcome)

---

## 🆘 Support

Si tu as des questions pendant la migration :
1. Vérifie les logs backend (`npm run start:dev`)
2. Teste les endpoints avec curl/Postman
3. Vérifie les variables d'environnement
4. Consulte la documentation Coinbase CDP

Bon courage pour la migration ! 🚀
