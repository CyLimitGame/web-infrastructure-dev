# 🔄 Migration Wallets Existants → Embedded Wallets Coinbase

**Date :** 10 octobre 2025  
**Statut :** 🚨 CRITIQUE pour la production

---

## 🎯 PROBLÈME

**Users existants :**
- ✅ Ont un `walletAddress` en DB (ancien système Web3/MetaMask)
- ❌ **N'ont PAS d'Embedded Wallet Coinbase**
- ⚠️ Vont perdre accès à leurs wallets actuels

**Nombre estimé :** ? users (à vérifier en DB)

---

## 💰 COÛT MIGRATION

**Prix Coinbase CDP Embedded Wallets :**
- 🎁 **5 000 premières opérations/mois : GRATUITES**
- 💵 **Après : $0.005 par opération** (0,5 centimes)
- 🎉 **Bonus : $100 de crédit offert**

**Exemples :**
| Users | Coût |
|-------|------|
| 1 000 | $0 (gratuit) |
| 10 000 | $25 |
| 50 000 | $225 |
| 100 000 | $475 |

---

## ✅ SOLUTION RECOMMANDÉE

### Stratégie : Migration automatique avec backup ancien wallet

**Avantages :**
- ✅ Seamless pour l'utilisateur
- ✅ Garde historique ancien wallet
- ✅ Permet migration progressive
- ✅ Coût très faible

---

## 🔧 IMPLÉMENTATION

### 1. Ajouter champ `oldWalletAddress` au schema User

```typescript
// src/modules/user/schemas/user.schema.ts

@Schema()
export class UserEntity {
  @Prop({ type: String, lowercase: true, index: true })
  walletAddress?: string; // Nouveau wallet Coinbase

  @Prop({ type: String, lowercase: true })
  oldWalletAddress?: string; // Ancien wallet Web3 (sauvegarde)

  @Prop({ type: Date })
  walletSyncedAt?: Date;

  @Prop({ type: Date })
  walletMigratedAt?: Date; // Date migration vers Coinbase

  @Prop({ type: Boolean, default: false })
  isWalletMigrated: boolean; // Flag migration effectuée
}
```

---

### 2. Modifier endpoint `/users/me/wallet-address`

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
  oldWalletAddress?: string;
}> {
  const logger = new Logger('UserController.syncWalletAddress');
  
  const normalizedAddress = dto.walletAddress.toLowerCase();
  const userId = new Types.ObjectId(user.userId);

  // Récupérer user actuel
  const currentUser = await this.userService.findById(userId);

  // 🚨 CAS 1 : User a déjà un ancien wallet ET ce n'est pas le même
  const hasOldWallet = currentUser.walletAddress && 
                       currentUser.walletAddress !== normalizedAddress &&
                       !currentUser.isWalletMigrated;

  if (hasOldWallet) {
    logger.warn(
      `🔄 Migration wallet pour user ${user.userId}: ${currentUser.walletAddress} → ${normalizedAddress}`
    );

    // Sauvegarder ancien wallet
    await this.userService.updateUser(userId, {
      oldWalletAddress: currentUser.walletAddress,
      walletAddress: normalizedAddress,
      walletSyncedAt: new Date(),
      walletMigratedAt: new Date(),
      isWalletMigrated: true,
    });

    logger.log(
      `✅ Wallet migrated for user ${user.userId}: ${normalizedAddress} (old: ${currentUser.walletAddress})`
    );

    return {
      success: true,
      walletAddress: normalizedAddress,
      migrated: true,
      oldWalletAddress: currentUser.walletAddress,
    };
  }

  // 🚨 CAS 2 : Vérifier que nouvelle adresse n'est pas déjà utilisée par un autre user
  const existingUser = await this.userService.getUserWithPrivateKeyByAddress(
    normalizedAddress
  );

  if (existingUser && existingUser._id.toString() !== user.userId.toString()) {
    logger.warn(
      `Tentative de réutilisation wallet: ${normalizedAddress} déjà lié à user ${existingUser._id}`
    );
    throw new BadRequestException(
      'This wallet address is already linked to another account'
    );
  }

  // 🚨 CAS 3 : Première synchronisation (nouveau user ou user sans wallet)
  if (!currentUser.walletAddress) {
    await this.userService.updateUser(userId, {
      walletAddress: normalizedAddress,
      walletSyncedAt: new Date(),
    });

    logger.log(
      `✅ First wallet sync for user ${user.userId}: ${normalizedAddress}`
    );

    return {
      success: true,
      walletAddress: normalizedAddress,
    };
  }

  // 🚨 CAS 4 : Re-synchronisation (même adresse)
  await this.userService.updateUser(userId, {
    walletSyncedAt: new Date(),
  });

  logger.log(
    `✅ Wallet re-synced for user ${user.userId}: ${normalizedAddress}`
  );

  return {
    success: true,
    walletAddress: normalizedAddress,
  };
}
```

---

### 3. Notification frontend

```typescript
// frontend/src/hooks/useEmbeddedWallet.ts

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
            title: '🔄 Wallet migré',
            description: `Votre wallet a été migré vers Coinbase. Ancien wallet sauvegardé.`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });

          console.log('Old wallet:', response.data.oldWalletAddress);
          console.log('New wallet:', response.data.walletAddress);
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

## 🔄 WORKFLOW MIGRATION

### Scénario : User existant se connecte

```
1. USER : Login avec email/password
   ↓
   JWT token généré

2. SDK COINBASE : Initialise
   ↓
   Crée automatiquement Embedded Wallet
   ↓
   Nouvelle adresse : 0x5678...

3. FRONTEND : Appelle PATCH /users/me/wallet-address
   ↓
   Body: { walletAddress: "0x5678..." }

4. BACKEND : Détecte ancien wallet
   ↓
   currentUser.walletAddress = "0x1234..." (ancien)
   ↓
   normalizedAddress = "0x5678..." (nouveau)
   ↓
   hasOldWallet = true
   ↓
   MIGRATION AUTOMATIQUE :
   {
     oldWalletAddress: "0x1234...",
     walletAddress: "0x5678...",
     walletMigratedAt: new Date(),
     isWalletMigrated: true
   }

5. FRONTEND : Affiche toast
   ↓
   "🔄 Wallet migré vers Coinbase"
   ↓
   User continue normalement

6. ✅ USER : Peut maintenant utiliser nouveau wallet
   - Acheter NFT
   - Vendre NFT
   - Recevoir rewards
```

---

## 📊 DONNÉES À MIGRER

### NFTs liés à l'ancien wallet

**⚠️ CRITIQUE :** Les NFTs sont liés par `ownerId`, **PAS par `walletAddress`** !

```typescript
// Schema NFT
@Schema()
export class Nft {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId; // ✅ Pas de changement nécessaire !

  @Prop()
  tokenId: number; // ID du NFT on-chain
}
```

**Résultat :**
- ✅ **AUCUNE migration nécessaire pour les NFTs !**
- Les NFTs restent liés au `ownerId`
- Le nouveau wallet peut les afficher/vendre normalement

---

### Balances USDC

**⚠️ PROBLÈME :** Ancien wallet peut contenir des USDC !

**Solutions :**

#### Option 1 : Transfert automatique (complexe)

❌ Nécessite accès à la `privateKey` de l'ancien wallet  
❌ Coût gas élevé  
❌ Risqué  

#### Option 2 : Afficher balance ancien wallet + bouton "Migrer fonds" (recommandé)

✅ User garde contrôle  
✅ Pas de risque  
✅ Transparent  

```typescript
// Frontend: WalletSettings.tsx

const OldWalletBalance = () => {
  const { oldWalletAddress } = useUser();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (oldWalletAddress) {
      // Récupérer balance on-chain
      fetchBalance(oldWalletAddress).then(setBalance);
    }
  }, [oldWalletAddress]);

  if (!oldWalletAddress || balance === 0) return null;

  return (
    <Alert status="warning">
      <AlertIcon />
      <Box>
        <Text fontWeight="bold">Ancien wallet détecté</Text>
        <Text fontSize="sm">
          Balance : {balance} USDC sur {oldWalletAddress}
        </Text>
        <Button size="sm" mt={2} onClick={handleMigrateFunds}>
          Transférer vers nouveau wallet
        </Button>
      </Box>
    </Alert>
  );
};
```

---

## 🧪 TESTS

### Script pour identifier users à migrer

```javascript
// scripts/count-users-to-migrate.js

const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const usersToMigrate = await mongoose.connection.db
    .collection('users')
    .countDocuments({
      walletAddress: { $exists: true, $ne: null },
      isWalletMigrated: { $ne: true },
    });

  console.log(`📊 Users à migrer : ${usersToMigrate}`);

  // Estimer coût
  const cost = Math.max(0, (usersToMigrate - 5000) * 0.005);
  console.log(`💰 Coût estimé : $${cost.toFixed(2)}`);

  await mongoose.disconnect();
}

main();
```

---

## 🚨 RISQUES ET MITIGATIONS

### Risque 1 : User perd accès à son ancien wallet

**Mitigation :**
- ✅ Sauvegarder `oldWalletAddress` en DB
- ✅ Afficher ancien wallet dans profil
- ✅ Permettre export/affichage ancien wallet

---

### Risque 2 : USDC restent sur ancien wallet

**Mitigation :**
- ✅ Afficher balance ancien wallet
- ✅ Bouton "Migrer fonds" (user décide)
- ✅ Guide migration dans FAQ

---

### Risque 3 : NFTs perdus

**Mitigation :**
- ✅ **PAS DE RISQUE !** NFTs liés par `ownerId`, pas `walletAddress`
- ✅ NFT Sync Service vérifie ownership on-chain

---

## ✅ CHECKLIST DÉPLOIEMENT

### Backend

- [ ] Ajouter champs `oldWalletAddress`, `walletMigratedAt`, `isWalletMigrated` au schema User
- [ ] Modifier endpoint `PATCH /users/me/wallet-address` avec logique migration
- [ ] Tester migration avec user existant
- [ ] Créer script `count-users-to-migrate.js`

### Frontend

- [ ] Ajouter toast notification migration
- [ ] Créer composant `OldWalletBalance`
- [ ] Ajouter bouton "Migrer fonds" (optionnel)
- [ ] FAQ migration wallets

### Documentation

- [ ] Guide utilisateur migration
- [ ] Email notification migration (optionnel)
- [ ] Support FAQ

---

## 📝 RÉSUMÉ

### ⚠️ LIMITATION IMPORTANTE

**IMPOSSIBLE de créer un Embedded Wallet sans le user !**

**Pourquoi ?**
- Email OTP requis (user doit vérifier)
- Clé privée générée côté client (MPC)
- Wallet non-custodial (Coinbase ne peut pas créer pour vous)

---

### ✅ STRATÉGIE RECOMMANDÉE : Migration Hybride avec Master Wallet

**Utiliser le Master Wallet existant (pas besoin de wallet dédié migration) !**

**PHASE 1 : User transfère manuellement → Master Wallet (déjà existant)**
1. User se connecte → Frontend détecte ancien wallet + fonds
2. Modal "Migrer vers Coinbase Wallet"
3. User connecte ancien wallet (MetaMask)
4. User approuve transferts :
   - USDC → Master Wallet CyLimit
   - NFTs → Master Wallet CyLimit
5. DB : Marquer `pendingMigration = true`, `pendingUSDC`, `pendingNFTTokenIds`
6. ✅ Fonds sécurisés dans Master Wallet

**PHASE 2 : Backend transfère automatiquement → nouveau wallet**
1. User crée Embedded Wallet (Coinbase SDK)
2. Backend détecte `pendingMigration = true`
3. Backend transfère automatiquement :
   - USDC : Master Wallet → nouveau wallet
   - NFTs : Master Wallet → nouveau wallet
4. ✅ User reçoit tout automatiquement !

---

### 💰 COÛT

| Étape | Coût |
|-------|------|
| Master Wallet (déjà existant) | **GRATUIT** |
| Transferts user → Master Wallet | Gas fees (~$0.06) |
| Embedded Wallet création | **GRATUIT** (5000/mois) |
| Transferts Master Wallet → user | Gas fees (~$0.06) |

**Total : ~$0.12 par user** (gas fees Polygon uniquement)

---

### 🎯 AVANTAGES

- ✅ Sécurisé (pas de privateKeys stockées)
- ✅ Semi-automatique (user signe 1 fois, reçoit automatiquement)
- ✅ Coût très faible (~$0.12/user)
- ✅ NFTs non impactés (liés par `ownerId`)
- ✅ UX acceptable (modal guidé)
- ✅ **1 seul Server Wallet à gérer** (Master Wallet existant)
- ✅ Code plus simple

---

### 📚 DOCUMENTATION COMPLÈTE

- **`MIGRATION-SIMPLIFIEE-MASTER-WALLET.md`** - Implémentation détaillée avec Master Wallet
- **`WORKFLOW-MIGRATION-VISUEL.md`** - Diagrammes de flux
- **`MIGRATION-AUTOMATIQUE-SERVER-WALLETS.md`** - Alternative avec wallet dédié (non recommandé)

🎉 **Solution optimisée complète et sécurisée !**

