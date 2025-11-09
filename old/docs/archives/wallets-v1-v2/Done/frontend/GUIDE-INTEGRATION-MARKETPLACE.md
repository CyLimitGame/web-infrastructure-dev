# 🎨 Frontend Marketplace - Guide d'Intégration

## ✅ Ce qui a été créé

### 1. **Service API** (`src/apis/marketplace.ts`)
Centralise toutes les requêtes API marketplace :
- `calculateFees()` : Calculer les fees (public)
- `preparePurchase()` : Préparer achat NFT (auth)
- `prepareListing()` : Préparer listing NFT (auth)

### 2. **Hook React** (`src/hooks/useMarketplace.ts`)
Gère toute la logique marketplace :
- États de chargement (`isCalculatingFees`, `isPreparingPurchase`, etc.)
- Gestion des erreurs avec toasts
- Cache des données (`feesData`, `purchaseData`, `listingData`)

### 3. **Composants UI**

#### `FeesDisplay` (`src/components/marketplace/FeesDisplay.tsx`)
Affiche les fees de façon claire et transparente :
- Prix NFT
- Frais acheteur/vendeur
- Total à payer/recevoir
- Badges Premium
- Tooltips explicatifs

#### `BuyNFTModal` (`src/components/marketplace/BuyNFTModal.tsx`)
Modal complète pour acheter un NFT :
- Affichage détails NFT + image
- Calcul automatique des fees
- Préparation et exécution des transactions
- États : preview → executing → success/error

---

## 🚀 Comment Utiliser

### Exemple 1 : Afficher les fees sur une card marketplace

```tsx
import { useMarketplace } from '@/hooks/useMarketplace';
import { FeesDisplay } from '@/components/marketplace';

const NFTCard = ({ nft }) => {
  const { feesData, calculateFees, isCalculatingFees } = useMarketplace();

  useEffect(() => {
    calculateFees({
      nftPrice: nft.price,
      buyerIsPremium: false,
      sellerIsPremium: nft.sellerIsPremium,
    });
  }, [nft.price]);

  return (
    <Box>
      <Text>{nft.name}</Text>
      <Text>{nft.price} USDC</Text>
      
      {isCalculatingFees ? (
        <Spinner />
      ) : feesData ? (
        <FeesDisplay
          nftPrice={feesData.breakdown.priceUSDC}
          sellerFee={feesData.sellerFee}
          buyerFee={feesData.buyerFee}
          totalToSeller={feesData.totalToSeller}
          totalFromBuyer={feesData.totalFromBuyer}
          phase={feesData.phase}
          variant="buyer"
        />
      ) : null}
    </Box>
  );
};
```

---

### Exemple 2 : Utiliser la modal d'achat

```tsx
import { useState } from 'react';
import { BuyNFTModal } from '@/components/marketplace';
import { useDisclosure, Button } from '@chakra-ui/react';

const MarketplacePage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedNFT, setSelectedNFT] = useState(null);

  const handleBuyClick = (nft) => {
    setSelectedNFT(nft);
    onOpen();
  };

  return (
    <>
      <Button onClick={() => handleBuyClick(someNFT)}>
        Acheter
      </Button>

      {selectedNFT && (
        <BuyNFTModal
          isOpen={isOpen}
          onClose={onClose}
          nft={{
            tokenId: selectedNFT.tokenId,
            name: selectedNFT.name,
            image: selectedNFT.image,
            price: selectedNFT.price,
            sellerAddress: selectedNFT.ownerAddress,
            sellerIsPremium: selectedNFT.ownerIsPremium,
          }}
          buyerAddress="0xYourWalletAddress" // TODO: récupérer depuis useWallet
          buyerIsPremium={false} // TODO: récupérer depuis user profile
        />
      )}
    </>
  );
};
```

---

### Exemple 3 : Calculer les fees uniquement (sans UI)

```tsx
import { useMarketplace } from '@/hooks/useMarketplace';

const MyComponent = () => {
  const { calculateFees } = useMarketplace();

  const handleCheckFees = async () => {
    const fees = await calculateFees({
      nftPrice: 100,
      buyerIsPremium: false,
      sellerIsPremium: false,
    });

    if (fees) {
      console.log('Fees calculées:', fees);
      console.log('Total à payer:', fees.totalFromBuyer);
      console.log('Frais acheteur:', fees.buyerFee);
    }
  };

  return <Button onClick={handleCheckFees}>Calculer fees</Button>;
};
```

---

## 🔧 Intégrations À Faire

### 1. ✅ Backend API : **FAIT**
Les endpoints backend sont prêts et testés :
- `POST /v1/marketplace/calculate-fees` ✅
- `POST /v1/marketplace/prepare-purchase` ✅
- `POST /v1/marketplace/prepare-listing` ✅

### 2. ⚠️ Embedded Wallets : **À INTÉGRER**
Actuellement, `BuyNFTModal` simule l'exécution des transactions.

**TODO** : Intégrer les Embedded Wallets pour signer et broadcaster les transactions :

```tsx
// Dans BuyNFTModal.tsx, ligne ~120
const executeTransactions = async (transactions: any[]) => {
  try {
    // TODO : Remplacer la simulation par vraie logique
    
    // 1. Récupérer le wallet de l'user
    const wallet = await getEmbeddedWallet();
    
    // 2. Pour chaque transaction USDC
    for (const tx of transactions.filter(t => t.type === 'usdc_transfer')) {
      const txHash = await wallet.transfer({
        to: tx.to,
        amount: tx.amount,
        asset: 'USDC',
      });
      console.log('USDC transfert TX:', txHash);
    }
    
    // 3. Pour la transaction NFT
    const nftTx = transactions.find(t => t.type === 'nft_transfer');
    const nftTxHash = await wallet.transferNFT({
      to: nftTx.to,
      tokenId: nftTx.tokenId,
      contractAddress: NFT_CONTRACT_ADDRESS,
    });
    console.log('NFT transfer TX:', nftTxHash);
    
    // 4. Succès !
    setStep('success');
  } catch (error) {
    setExecutionError(error.message);
    setStep('error');
  }
};
```

### 3. ⚠️ User Profile : **À INTÉGRER**
Récupérer automatiquement :
- `buyerAddress` : depuis le wallet de l'user
- `buyerIsPremium` : depuis le profil user (API `/user/me`)

```tsx
// Exemple d'intégration
const { user } = useAuth(); // Hook existant
const { walletAddress } = useWallet(); // À créer

<BuyNFTModal
  buyerAddress={walletAddress}
  buyerIsPremium={user?.isPremium || false}
  // ...
/>
```

### 4. ⚠️ Listing NFT : **À CRÉER**
Créer une modal similaire pour mettre en vente un NFT :

```tsx
// src/components/marketplace/SellNFTModal.tsx
export const SellNFTModal = ({ nft, sellerAddress, sellerIsPremium }) => {
  const { prepareListing } = useMarketplace();
  
  const handleSell = async (price: number) => {
    const data = await prepareListing({
      tokenId: nft.tokenId,
      price,
      sellerAddress,
    });
    
    if (data) {
      // Afficher confirmation + fees estimées
      console.log('Vous recevrez:', price - data.estimatedFees, 'USDC');
    }
  };
  
  // UI : input prix + FeesDisplay (variant="seller")
};
```

---

## 📊 Structure des Fichiers

```
src/
├── apis/
│   └── marketplace.ts          ✅ Service API (CRÉÉ)
├── hooks/
│   └── useMarketplace.ts       ✅ Hook React (CRÉÉ)
└── components/
    └── marketplace/
        ├── FeesDisplay.tsx      ✅ Affichage fees (CRÉÉ)
        ├── BuyNFTModal.tsx      ✅ Modal achat (CRÉÉ)
        ├── SellNFTModal.tsx     ⚠️  Modal vente (À CRÉER)
        └── index.ts             ✅ Exports (CRÉÉ)
```

---

## 🎯 Prochaines Étapes

### Immédiat :
1. ✅ **Tester l'import des composants** (vérifier qu'il n'y a pas d'erreurs TypeScript)
2. ⚠️ **Intégrer dans une page existante** (ex: `/market`)
3. ⚠️ **Connecter avec les vraies données NFT** (API existante)

### Court terme :
4. ⚠️ **Intégrer Embedded Wallets** pour signer les transactions
5. ⚠️ **Créer `SellNFTModal`** pour mettre en vente des NFTs
6. ⚠️ **Ajouter les statuts Premium** depuis le profil user

### Moyen terme :
7. ⚠️ **Webhooks Alchemy** pour notifications temps réel (transactions confirmées)
8. ⚠️ **Historique des transactions** marketplace
9. ⚠️ **Analytics** : volume, fees collectées, etc.

---

## 🐛 Debugging

### Si les fees ne s'affichent pas :
1. Vérifier que le backend user est démarré (port 3002)
2. Vérifier `NEXT_PUBLIC_API_URL` dans `.env.local`
3. Ouvrir la console : `useMarketplace` log toutes les erreurs

### Si les toasts ne s'affichent pas :
1. Vérifier que `ChakraProvider` entoure l'app
2. Vérifier `i18n` pour les messages d'erreur

### Si TypeScript râle :
1. Installer les types manquants : `npm install --save-dev @types/react`
2. Vérifier les imports : tous les chemins `@/...` doivent être configurés dans `tsconfig.json`

---

## 💡 Notes Importantes

1. **Sécurité** : Les endpoints `preparePurchase` et `prepareListing` nécessitent JWT auth. Le hook `useMarketplace` gère l'auth automatiquement via `src/utils/request.ts`.

2. **Fees Transparentes** : Toujours afficher les fees AVANT que l'user clique sur "Acheter". Transparence = confiance.

3. **Phase 1 vs Phase 2** : Actuellement en Phase 1 (frais vendeur uniquement). Le composant `FeesDisplay` supporte déjà Phase 2.

4. **Premium** : Les frais CyLimit sont annulés pour les users Premium. Les frais Coinbase/Stripe ne sont JAMAIS annulés.

5. **Gas Fees** : CyLimit paie le gas (Paymaster). L'user ne paie QUE les fees USDC + frais CyLimit.

---

## ✅ Checklist d'Intégration

- [x] Service API créé (`marketplace.ts`)
- [x] Hook React créé (`useMarketplace.ts`)
- [x] Composant `FeesDisplay` créé
- [x] Composant `BuyNFTModal` créé
- [ ] Tester l'import (pas d'erreurs TypeScript)
- [ ] Intégrer dans une page (ex: `/market`)
- [ ] Connecter avec vraies données NFT
- [ ] Intégrer Embedded Wallets
- [ ] Créer `SellNFTModal`
- [ ] Récupérer statut Premium user
- [ ] Tests end-to-end (acheter un NFT réel)

---

**Le frontend marketplace est prêt pour intégration ! 🎉**

Commence par tester l'import des composants, puis intègre-les dans une page existante.

