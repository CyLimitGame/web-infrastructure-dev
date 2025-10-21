# 🔗 Synchronisation walletAddress avec Embedded Wallet

**Date :** 9 octobre 2025  
**Statut :** 📋 Prêt à implémenter après NFT Sync Service

---

## 🎯 Objectif

Synchroniser automatiquement le champ `walletAddress` dans la base de données MongoDB avec l'adresse de l'Embedded Wallet Coinbase de chaque user.

---

## 📋 Contexte

### État actuel

**User Schema (MongoDB) :**
```typescript
@Schema()
export class User {
  @Prop()
  walletAddress: string; // ❌ Vide ou désynchronisé
  
  @Prop()
  embeddedWalletEmail: string; // ✅ Email lié au wallet Coinbase
}
```

**Embedded Wallet (Coinbase CDP) :**
```typescript
// Frontend : useEmbeddedWallet()
const { evmAddress } = useEvmAddress(); // Ex: 0x1234...
```

### Problème

- `walletAddress` en DB n'est **pas synchronisé** avec `evmAddress` du wallet Coinbase
- Quand user se connecte → `walletAddress` reste vide
- Besoin de synchroniser automatiquement

---

## ✅ Solution

### Stratégie

**Synchronisation automatique à la connexion :**

1. User se connecte à CyLimit (email + password)
2. Frontend auto-connecte l'Embedded Wallet (via `useEmbeddedWallet`)
3. Frontend récupère `evmAddress` du wallet
4. Frontend envoie `evmAddress` au backend
5. Backend met à jour `user.walletAddress` en DB
6. ✅ `walletAddress` synchronisé

---

## 💻 Implémentation

### Backend : Endpoint de synchronisation

**Fichier :** `src/modules/user/controllers/user.controller.ts`

```typescript
/**
 * Synchronise walletAddress avec Embedded Wallet
 * 
 * Appelé depuis frontend après connexion Embedded Wallet
 */
@Patch('me/wallet-address')
@UseGuards(JwtAuthGuard)
async syncWalletAddress(
  @CurrentUser() user: User,
  @Body() dto: { walletAddress: string },
) {
  // Validation : format Ethereum address
  if (!ethers.utils.isAddress(dto.walletAddress)) {
    throw new BadRequestException('Invalid Ethereum address');
  }

  // Vérifier que l'adresse n'est pas déjà utilisée par un autre user
  const existingUser = await this.userModel.findOne({
    walletAddress: dto.walletAddress.toLowerCase(),
    _id: { $ne: user._id },
  });

  if (existingUser) {
    throw new BadRequestException(
      'This wallet address is already linked to another account'
    );
  }

  // Mettre à jour walletAddress
  await this.userModel.updateOne(
    { _id: user._id },
    { 
      walletAddress: dto.walletAddress.toLowerCase(),
      walletSyncedAt: new Date(),
    }
  );

  this.logger.log(
    `✅ Wallet address synced for user ${user._id}: ${dto.walletAddress}`
  );

  return { 
    success: true, 
    walletAddress: dto.walletAddress.toLowerCase(),
  };
}
```

**DTO :** `src/modules/user/dto/sync-wallet.dto.ts`

```typescript
import { IsEthereumAddress } from 'class-validator';

export class SyncWalletAddressDto {
  @IsEthereumAddress()
  walletAddress: string;
}
```

### Frontend : Hook de synchronisation

**Fichier :** `src/hooks/useEmbeddedWallet.ts`

```typescript
import { useCallback, useState, useEffect } from 'react';
import {
  useIsSignedIn,
  useEvmAddress,
  useSignInWithEmail,
  useSignOut,
} from '@coinbase/cdp-hooks';
import { useToast } from '@chakra-ui/react';
import axios from 'axios';
import { useGetUserProfile } from '@/queries/useUser';

export const useEmbeddedWallet = () => {
  const toast = useToast();

  const { data: userProfile } = useGetUserProfile();
  const cylimitEmail = userProfile?.email;
  const isCylimitLoggedIn = !!localStorage.getItem('TOKEN');

  const { isSignedIn } = useIsSignedIn();
  const { signOut: cdpSignOut } = useSignOut();
  const { signInWithEmail } = useSignInWithEmail();

  const { evmAddress, isLoading: addressLoading } = useEvmAddress();

  const [balanceUSDC, setBalanceUSDC] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // ✅ NOUVELLE FONCTION : Synchroniser walletAddress avec backend
  const syncWalletAddress = useCallback(async (address: string) => {
    if (!address || !isCylimitLoggedIn) return;

    try {
      const token = localStorage.getItem('TOKEN');
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/wallet-address`,
        { walletAddress: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ walletAddress synchronisé:', address);
    } catch (error) {
      console.error('❌ Erreur sync walletAddress:', error);
      // Ne pas bloquer l'UX si erreur
    }
  }, [isCylimitLoggedIn]);

  // AUTO-CONNEXION SILENCIEUSE
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (isCylimitLoggedIn && !isSignedIn && cylimitEmail && !autoConnectAttempted) {
        console.log('🔄 Auto-connexion Embedded Wallet:', cylimitEmail);
        setAutoConnectAttempted(true);
        try {
          await signInWithEmail({ email: cylimitEmail });
          console.log('✅ Auto-connexion réussie');
        } catch (error) {
          console.log('ℹ️ Auto-connexion échouée (normal si 1ère connexion)');
        }
      }
    };
    attemptAutoConnect();
  }, [isCylimitLoggedIn, isSignedIn, cylimitEmail, autoConnectAttempted, signInWithEmail]);

  // ✅ SYNCHRONISATION WALLET ADDRESS
  useEffect(() => {
    if (evmAddress && isSignedIn && isCylimitLoggedIn) {
      syncWalletAddress(evmAddress);
    }
  }, [evmAddress, isSignedIn, isCylimitLoggedIn, syncWalletAddress]);

  // SYNCHRONISATION DÉCONNEXION
  useEffect(() => {
    if (isSignedIn && !isCylimitLoggedIn) {
      console.log('🔄 Déconnexion CyLimit → Embedded Wallet');
      cdpSignOut().catch((error) => {
        console.error('❌ Erreur déconnexion auto:', error);
      });
    }
  }, [isSignedIn, isCylimitLoggedIn, cdpSignOut]);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!evmAddress || !isSignedIn) return;

    setBalanceLoading(true);
    try {
      const token = localStorage.getItem('TOKEN');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/wallet/balance/${evmAddress}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBalanceUSDC(response.data.balance || 0);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('ℹ️ Pas de balance pour cette adresse (normal si nouveau wallet)');
        setBalanceUSDC(0);
      } else {
        console.error('❌ Erreur récupération balance:', error);
        setBalanceUSDC(null);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [evmAddress, isSignedIn]);

  useEffect(() => {
    if (evmAddress && isSignedIn) {
      fetchBalance();
    }
  }, [evmAddress, isSignedIn, fetchBalance]);

  const signOut = useCallback(async () => {
    try {
      await cdpSignOut();
      setBalanceUSDC(null);
      toast({
        title: 'Wallet déconnecté',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast({
        title: 'Erreur déconnexion',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  }, [cdpSignOut, toast]);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    isConnected: isSignedIn,
    address: evmAddress,
    balanceUSDC,
    balanceLoading,
    addressLoading,
    signOut,
    refreshBalance,
  };
};
```

### Backend : Mise à jour User Schema

**Fichier :** `src/modules/user/schemas/user.schema.ts`

```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({
    lowercase: true,
    trim: true,
  })
  public walletAddress?: string; // ✅ Synchronisé avec Embedded Wallet

  @Prop({
    lowercase: true,
    trim: true,
  })
  public embeddedWalletEmail?: string; // Email lié au wallet Coinbase

  @Prop()
  public walletSyncedAt?: Date; // ✅ NOUVEAU : Date dernière sync
}
```

---

## 🧪 Tests

### Test 1 : Première connexion user

```
1. User crée compte CyLimit (email + password)
2. User se connecte
3. Frontend auto-connecte Embedded Wallet
4. Frontend envoie walletAddress au backend
5. Backend met à jour user.walletAddress
6. ✅ Vérifier en DB : walletAddress = 0x1234...
```

### Test 2 : Reconnexion user existant

```
1. User déjà existant se reconnecte
2. Frontend auto-connecte Embedded Wallet
3. Frontend envoie walletAddress (même qu'avant)
4. Backend met à jour walletSyncedAt
5. ✅ Vérifier : pas de doublon, walletAddress inchangé
```

### Test 3 : Tentative de réutilisation wallet

```
1. User A a walletAddress = 0x1234...
2. User B essaie de sync avec 0x1234...
3. Backend détecte doublon
4. ✅ Backend return error 400 "Wallet already linked"
```

---

## 📊 Séquence complète

```
User ouvre app CyLimit
    ↓
Login CyLimit (email + password)
    ↓
Frontend : useEmbeddedWallet auto-connecte
    ↓
Coinbase : Embedded Wallet connecté (via OTP si 1ère fois)
    ↓
Frontend récupère evmAddress (0x1234...)
    ↓
Frontend : PATCH /users/me/wallet-address
    ↓
Backend valide + met à jour DB
    ↓
✅ user.walletAddress = 0x1234...
    ↓
User peut maintenant :
  - Voir son wallet address
  - Recevoir USDC/NFTs
  - Acheter NFTs
  - Lister NFTs sur marketplace
```

---

## ✅ Avantages

1. ✅ **Automatique** : User n'a rien à faire
2. ✅ **Sécurisé** : Validation backend + prévention doublons
3. ✅ **Rapide** : Sync en background (pas de blocage UX)
4. ✅ **Résilient** : Si erreur, ne bloque pas la connexion
5. ✅ **Traceable** : `walletSyncedAt` pour debug

---

## 🚀 Déploiement

### Checklist

- [ ] Backend : Endpoint `PATCH /users/me/wallet-address` créé
- [ ] Backend : Validation `IsEthereumAddress` dans DTO
- [ ] Backend : Vérification doublons (autre user)
- [ ] Backend : User schema mis à jour (`walletSyncedAt`)
- [ ] Frontend : Hook `useEmbeddedWallet` mis à jour
- [ ] Frontend : Appel `syncWalletAddress()` dans `useEffect`
- [ ] Tests : Première connexion ✅
- [ ] Tests : Reconnexion ✅
- [ ] Tests : Tentative doublon ✅
- [ ] Logs vérifiés (aucune erreur)

### Ordre d'implémentation

1. ✅ **Phase actuelle** : NFT Sync Service (cron job + listing)
2. 🔄 **Phase suivante** : Sync walletAddress (ce document)
3. 📋 **Phase future** : Marketplace complet (achats/ventes atomiques)

---

## 📞 Questions fréquentes

### Q1 : Que se passe-t-il si user change d'Embedded Wallet ?

**R :** Normalement impossible car :
- 1 email CyLimit = 1 Embedded Wallet Coinbase (lié)
- Embedded Wallet auto-connecté au login
- Pas de possibilité de choisir un autre wallet

### Q2 : Que faire si walletAddress désynchronisé ?

**R :** 
1. User se reconnecte → Sync automatique
2. Endpoint admin manuel : `POST /admin/users/:id/force-sync-wallet`

### Q3 : Performance ?

**R :** 
- 1 requête HTTP à la connexion = ~50ms
- Asynchrone (pas de blocage UX)
- Négligeable

---

**Maintenu par :** Valentin  
**Dernière mise à jour :** 9 octobre 2025

🚀 Prêt à implémenter après NFT Sync Service !

