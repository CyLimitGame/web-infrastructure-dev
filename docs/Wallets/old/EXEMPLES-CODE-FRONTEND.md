# 💻 Exemples de Code Frontend

Ce document contient des exemples concrets et prêts à l'emploi pour intégrer le nouveau système de wallets.

---

## 🎯 Cas d'usage 1 : Afficher le wallet du user

```typescript
// Dans n'importe quel composant
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const { user } = useAuth();
  const { wallet, balance, loading } = useWallet(user?.id);

  if (loading) return <div>Chargement...</div>;

  if (!wallet) {
    return <button onClick={() => createWallet()}>Créer mon wallet</button>;
  }

  return (
    <div className="wallet-display">
      <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
      <span>{balance?.usdc.toFixed(2)} USDC</span>
    </div>
  );
};
```

---

## 🎯 Cas d'usage 2 : Acheter un NFT

```typescript
import { useState } from 'react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useFees } from '@/hooks/useFees';
import { useWallet } from '@/hooks/useWallet';

export const BuyButton = ({ nft }) => {
  const { wallet } = useWallet();
  const { purchaseNFT, purchasing } = useMarketplace();
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('usdc');

  const { fees } = useFees(nft.price, paymentMethod);

  const handleBuy = async () => {
    try {
      const result = await purchaseNFT({
        nftId: nft.id,
        nftContractAddress: nft.contractAddress,
        priceUSDC: nft.price,
        buyerWalletId: wallet.walletId,
        sellerWalletAddress: nft.seller.walletAddress,
        paymentMethod,
      });

      if (result.success) {
        alert('NFT acheté avec succès !');
        setShowModal(false);
      }
    } catch (error) {
      alert('Erreur lors de l\'achat');
    }
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Acheter pour {nft.price} USDC
      </button>

      {showModal && (
        <div className="modal">
          <h2>Acheter ce NFT</h2>
          
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="usdc">USDC</option>
            <option value="stripe">Carte bancaire</option>
          </select>

          {fees && (
            <div>
              <p>Prix: {nft.price} USDC</p>
              <p>Fees: {fees.buyerFee + fees.stripeFee} USDC</p>
              <p><strong>Total: {fees.totalFromBuyer} USDC</strong></p>
            </div>
          )}

          <button onClick={handleBuy} disabled={purchasing}>
            {purchasing ? 'Achat en cours...' : 'Confirmer l\'achat'}
          </button>
        </div>
      )}
    </>
  );
};
```

---

## 🎯 Cas d'usage 3 : Déposer des USDC

```typescript
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';

export const DepositButton = () => {
  const { wallet, getDepositLink } = useWallet();
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const onrampUrl = await getDepositLink(amount);
      
      // Ouvrir Coinbase Onramp dans une nouvelle fenêtre
      const popup = window.open(
        onrampUrl,
        'coinbase-onramp',
        'width=500,height=700'
      );

      // Optionnel : Écouter la fermeture de la fenêtre
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Rafraîchir la balance
          refreshBalance();
        }
      }, 1000);
    } catch (error) {
      alert('Erreur lors de l\'ouverture de Coinbase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        min={1}
      />
      <button onClick={handleDeposit} disabled={loading}>
        {loading ? 'Chargement...' : 'Déposer'}
      </button>
    </div>
  );
};
```

---

## 🎯 Cas d'usage 4 : Prévisualiser les fees

```typescript
import { useFees } from '@/hooks/useFees';

export const FeePreview = ({ price, paymentMethod, isPremium }) => {
  const { fees, loading } = useFees(price, paymentMethod, isPremium, false);

  if (loading) return <div>Calcul des fees...</div>;
  if (!fees) return null;

  return (
    <div className="fee-preview">
      <div className="fee-line">
        <span>Prix du NFT</span>
        <span>{price} USDC</span>
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

      <div className="fee-line total">
        <span><strong>Total à payer</strong></span>
        <span><strong>{fees.totalFromBuyer} USDC</strong></span>
      </div>

      {isPremium && fees.buyerFee === 0 && (
        <div className="badge-premium">
          ✨ Fees acheteur offerts (Premium)
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 Cas d'usage 5 : Vérifier la balance avant achat

```typescript
import { useWallet } from '@/hooks/useWallet';
import { useFees } from '@/hooks/useFees';

export const BuyButtonWithCheck = ({ nft }) => {
  const { wallet, balance } = useWallet();
  const { fees } = useFees(nft.price, 'usdc');

  const hasEnoughBalance = balance && fees && balance.usdc >= fees.totalFromBuyer;

  if (!wallet) {
    return <button onClick={() => alert('Créez d\'abord un wallet')}>Créer un wallet</button>;
  }

  if (!hasEnoughBalance) {
    return (
      <div>
        <p>Balance insuffisante</p>
        <p>Vous avez: {balance?.usdc.toFixed(2)} USDC</p>
        <p>Requis: {fees?.totalFromBuyer.toFixed(2)} USDC</p>
        <button onClick={() => openDepositModal()}>Déposer des USDC</button>
      </div>
    );
  }

  return <button onClick={() => buyNFT()}>Acheter</button>;
};
```

---

## 🎯 Cas d'usage 6 : Afficher l'historique des transactions

```typescript
// Note: Cette fonctionnalité nécessite une API backend supplémentaire

import { useState, useEffect } from 'react';
import axios from 'axios';

export const TransactionHistory = ({ walletAddress }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // TODO: Créer cette API dans le backend
        const response = await axios.get(
          `/api/v1/wallet/${walletAddress}/transactions`
        );
        setTransactions(response.data.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des transactions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [walletAddress]);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="transaction-history">
      <h3>Historique des transactions</h3>
      {transactions.map((tx) => (
        <div key={tx.hash} className="transaction-item">
          <span>{tx.type}</span>
          <span>{tx.amount} USDC</span>
          <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
          <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank">
            Voir sur Basescan
          </a>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎯 Cas d'usage 7 : Mettre un NFT en vente

```typescript
import { useState } from 'react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useFees } from '@/hooks/useFees';

export const SellNFTForm = ({ nft, walletAddress }) => {
  const { listNFT, listing } = useMarketplace();
  const [price, setPrice] = useState(10);
  
  const { fees } = useFees(price, 'usdc', false, false);

  const handleSell = async () => {
    try {
      const result = await listNFT(
        nft.id,
        nft.contractAddress,
        price,
        walletAddress
      );

      if (result.success) {
        alert('NFT mis en vente avec succès !');
      }
    } catch (error) {
      alert('Erreur lors de la mise en vente');
    }
  };

  return (
    <div className="sell-form">
      <h3>Mettre en vente</h3>
      
      <div className="form-group">
        <label>Prix de vente (USDC)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          min={0.01}
          step={0.01}
        />
      </div>

      {fees && (
        <div className="fee-info">
          <p>Prix de vente: {price} USDC</p>
          <p>Fees CyLimit: {fees.sellerFee} USDC</p>
          <p><strong>Vous recevrez: {fees.totalToSeller} USDC</strong></p>
        </div>
      )}

      <button onClick={handleSell} disabled={listing || price <= 0}>
        {listing ? 'Mise en vente...' : 'Mettre en vente'}
      </button>
    </div>
  );
};
```

---

## 🎯 Cas d'usage 8 : Gérer les erreurs

```typescript
import { useMarketplace } from '@/hooks/useMarketplace';
import { useState } from 'react';

export const BuyWithErrorHandling = ({ nft }) => {
  const { purchaseNFT, error } = useMarketplace();
  const [customError, setCustomError] = useState(null);

  const handleBuy = async () => {
    setCustomError(null);

    try {
      const result = await purchaseNFT({
        nftId: nft.id,
        nftContractAddress: nft.contractAddress,
        priceUSDC: nft.price,
        buyerWalletId: wallet.walletId,
        sellerWalletAddress: nft.seller.walletAddress,
        paymentMethod: 'usdc',
      });

      if (!result.success) {
        // Gérer les erreurs spécifiques
        if (result.error?.includes('Balance insuffisante')) {
          setCustomError('Vous n\'avez pas assez d\'USDC. Déposez des fonds.');
        } else if (result.error?.includes('NFT déjà vendu')) {
          setCustomError('Ce NFT a déjà été vendu.');
        } else {
          setCustomError('Une erreur est survenue. Réessayez.');
        }
      }
    } catch (err) {
      setCustomError('Erreur réseau. Vérifiez votre connexion.');
    }
  };

  return (
    <div>
      <button onClick={handleBuy}>Acheter</button>
      
      {(error || customError) && (
        <div className="alert alert-error">
          {customError || error}
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 Cas d'usage 9 : Loading states

```typescript
import { useWallet } from '@/hooks/useWallet';
import { useMarketplace } from '@/hooks/useMarketplace';

export const BuyWithLoading = ({ nft }) => {
  const { wallet, loading: walletLoading } = useWallet();
  const { purchaseNFT, purchasing } = useMarketplace();

  if (walletLoading) {
    return (
      <div className="loading">
        <Spinner />
        <p>Chargement du wallet...</p>
      </div>
    );
  }

  if (purchasing) {
    return (
      <div className="loading">
        <Spinner />
        <p>Transaction en cours...</p>
        <p className="text-sm">Cela peut prendre quelques secondes</p>
      </div>
    );
  }

  return <button onClick={() => purchaseNFT(...)}>Acheter</button>;
};
```

---

## 🎯 Cas d'usage 10 : Responsive design

```typescript
import { useWallet } from '@/hooks/useWallet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const ResponsiveWalletDisplay = () => {
  const { wallet, balance } = useWallet();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!wallet) return null;

  if (isMobile) {
    // Version mobile compacte
    return (
      <div className="wallet-mobile">
        <div className="wallet-icon">💰</div>
        <div className="wallet-balance">{balance?.usdc.toFixed(0)} USDC</div>
      </div>
    );
  }

  // Version desktop complète
  return (
    <div className="wallet-desktop">
      <div className="wallet-address">
        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
      </div>
      <div className="wallet-balance">
        {balance?.usdc.toFixed(2)} USDC
      </div>
      <button className="btn-deposit">Déposer</button>
    </div>
  );
};
```

---

## 🎨 Styles CSS recommandés

```css
/* Wallet Display */
.wallet-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.wallet-address {
  font-family: monospace;
  font-size: 0.875rem;
}

.wallet-balance {
  font-weight: 600;
  color: #10b981;
}

/* Fee Preview */
.fee-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.fee-line {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.fee-line.total {
  border-top: 2px solid #000;
  border-bottom: none;
  font-size: 1.125rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

/* Buttons */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Alerts */
.alert {
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
```

---

## 📱 Exemple complet : Page Marketplace

```typescript
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useFees } from '@/hooks/useFees';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { BuyNFTModal } from '@/components/marketplace/BuyNFTModal';

export const MarketplacePage = () => {
  const { wallet } = useWallet();
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const handleBuyClick = (nft) => {
    if (!wallet) {
      alert('Créez d\'abord un wallet');
      return;
    }
    setSelectedNFT(nft);
    setShowBuyModal(true);
  };

  return (
    <div className="marketplace-page">
      <header>
        <h1>Marketplace</h1>
        <WalletConnect />
      </header>

      <div className="nft-grid">
        {nfts.map((nft) => (
          <div key={nft.id} className="nft-card">
            <img src={nft.image} alt={nft.name} />
            <h3>{nft.name}</h3>
            <p>{nft.price} USDC</p>
            <button onClick={() => handleBuyClick(nft)}>
              Acheter
            </button>
          </div>
        ))}
      </div>

      {showBuyModal && selectedNFT && (
        <BuyNFTModal
          nft={selectedNFT}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            // Rafraîchir la liste des NFTs
            fetchNFTs();
          }}
        />
      )}
    </div>
  );
};
```

---

Ces exemples couvrent les cas d'usage les plus courants. Adapte-les selon ton design et tes besoins spécifiques ! 🚀
