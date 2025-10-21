# 🔧 Admin : Reset Wallet User

**Objectif :** Permettre aux admins de reset le wallet d'un user (support client, tests)

---

## 🎯 CONTEXTE

### Pourquoi un endpoint admin de reset wallet ?

**Cas d'usage :**
1. ✅ **Support client** : User signale problème wallet
2. ✅ **Tests** : Reset wallet pour tester onboarding
3. ✅ **Migration** : Forcer re-création wallet avec nouvelle config

### ⚠️ Comprendre le cache SDK Coinbase

**IMPORTANT :**
- Le SDK Coinbase **garde la session en mémoire** côté frontend
- Même si on supprime `walletAddress` de la DB, le SDK frontend reste connecté
- Le cache n'est PAS dans `localStorage` → probablement dans `IndexedDB` ou cookies sécurisés

**Solution :**
1. ✅ Endpoint admin supprime wallet de la DB
2. ✅ User doit **se déconnecter et reconnecter**
3. ✅ Au reconnect, SDK Coinbase va appeler `POST /v1/wallet/sync`
4. ✅ Backend verra qu'il n'y a plus de wallet → créera un nouveau

---

## 📡 ENDPOINTS

### 1. DELETE /admin/users/:userId/wallet

**Reset wallet d'un user (admin only)**

**Auth :** JWT Admin (Bearer token)

**Request :**
```bash
curl -X DELETE http://localhost:5000/v1/admin/users/{userId}/wallet \
  -H "Authorization: Bearer {ADMIN_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Support client - wallet bloqué",
    "force": false
  }'
```

**Body (optionnel) :**
```typescript
{
  reason?: string;  // Raison du reset (pour traçabilité)
  force?: boolean;  // Forcer reset même si pending rewards (⚠️ dangereux)
}
```

**Response 200 :**
```json
{
  "success": true,
  "message": "Wallet reset. User doit se déconnecter et reconnecter pour que le SDK Coinbase soit re-synchronisé.",
  "data": {
    "userId": "64f5a3c1...",
    "previousWalletAddress": "0x1234...",
    "resetBy": "64f5a3c1...",
    "resetAt": "2025-10-10T12:00:00Z",
    "reason": "Support client - wallet bloqué"
  }
}
```

**Response 400 :**
```json
{
  "statusCode": 400,
  "message": "User has 3 pending rewards. Use force=true to override.",
  "error": "Bad Request"
}
```

---

### 2. POST /admin/users/:userId/wallet/sync

**Vérifier état sync wallet d'un user (admin only)**

**Auth :** JWT Admin (Bearer token)

**Request :**
```bash
curl -X POST http://localhost:5000/v1/admin/users/{userId}/wallet/sync \
  -H "Authorization: Bearer {ADMIN_JWT_TOKEN}"
```

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "userId": "64f5a3c1...",
    "email": "test@test.com",
    "walletAddressInDB": "0x1234...",
    "walletSyncedAt": "2025-10-10T12:00:00Z",
    "lastLogin": "2025-10-10T11:00:00Z",
    "hasWallet": true
  }
}
```

---

## 🧪 TESTS

### Script de test automatisé

```bash
cd cylimit-admin-backend

# 1. Tester avec un user existant
node scripts/test-wallet-reset.js <userId>

# Exemple :
node scripts/test-wallet-reset.js 64f5a3c1234567890abcdef1
```

**Ce que fait le script :**
1. ✅ Login admin
2. ✅ GET état wallet AVANT reset
3. ✅ DELETE reset wallet
4. ✅ GET état wallet APRÈS reset
5. ✅ Vérifications (wallet supprimé, address null)

**Output attendu :**
```
============================================================
🧪 TEST ENDPOINT ADMIN : RESET WALLET USER
============================================================
Backend: http://localhost:5000
User ID: 64f5a3c1234567890abcdef1
============================================================

🔑 Login admin...
✅ Admin logged in

📊 ÉTAT AVANT RESET:

📊 Vérification état sync wallet (user 64f5a3c1234567890abcdef1)...
✅ État wallet:
   - Email: test@test.com
   - Has Wallet: true
   - Wallet Address: 0x1234...
   - Synced At: 2025-10-10T12:00:00Z
   - Last Login: 2025-10-10T11:00:00Z

🔧 Reset wallet (user 64f5a3c1234567890abcdef1)...
✅ Wallet reset:
   - Message: Wallet reset. User doit se déconnecter et reconnecter...
   - Previous Wallet: 0x1234...
   - Reset By: 64f5a3c1234567890admin
   - Reset At: 2025-10-10T12:05:00Z
   - Reason: Test endpoint admin reset wallet

📊 ÉTAT APRÈS RESET:

📊 Vérification état sync wallet (user 64f5a3c1234567890abcdef1)...
✅ État wallet:
   - Email: test@test.com
   - Has Wallet: false
   - Wallet Address: N/A
   - Synced At: N/A
   - Last Login: 2025-10-10T11:00:00Z

🧪 VÉRIFICATIONS:
   - Wallet supprimé: ✅
   - walletAddress null: ✅

✅ SUCCESS: Wallet reset OK

📝 PROCHAINES ÉTAPES:
   1. User doit se déconnecter du frontend (Cmd+Shift+K ou bouton logout)
   2. User doit se reconnecter
   3. SDK Coinbase sera re-synchronisé
   4. WalletOnboardingModal s'affichera si localStorage vide

💡 POUR TESTER ONBOARDING:
   - Mode incognito (Cmd+Shift+N)
   - OU localStorage.clear() + rechargement
```

---

## 🔄 WORKFLOW COMPLET

### Scénario : Admin reset wallet user

```
1. ADMIN : Reset wallet via endpoint
   ↓
   DELETE /admin/users/{userId}/wallet
   {
     "reason": "Support client - wallet bloqué"
   }
   ↓
   ✅ walletAddress supprimé de la DB

2. USER : Se déconnecte du frontend
   ↓
   Clic sur "Logout" ou Cmd+Shift+K
   ↓
   ✅ Session JWT user invalidée

3. USER : Se reconnecte au frontend
   ↓
   Login avec email/password
   ↓
   SDK Coinbase tente de récupérer wallet
   ↓
   Appel POST /v1/wallet/sync
   ↓
   Backend voit qu'il n'y a plus de walletAddress
   ↓
   Backend crée nouvelle adresse + link à user
   ↓
   ✅ Nouveau wallet créé

4. USER : Voit WalletOnboardingModal
   ↓
   Modal s'affiche car pas de walletOnboardingSkipped en localStorage
   ↓
   User peut créer wallet ou skip
```

---

## 🚨 SÉCURITÉ ET TRAÇABILITÉ

### Vérifications avant reset

```typescript
// Backend : UserWalletAdminController
async resetUserWallet(userId, adminId, options) {
  // 1. Vérifier user existe
  const user = await this.userService.getUserById(userId);
  if (!user) throw new BadRequestException('User not found');

  // 2. Vérifier qu'il a un wallet
  if (!user.walletAddress) {
    throw new BadRequestException('User has no wallet to reset');
  }

  // 3. Vérifier pending rewards (⚠️ protection)
  const pendingRewards = await this.pendingRewardsService.find({
    userId,
    status: { $in: ['pending', 'processing'] },
  });

  if (pendingRewards.length > 0 && !options?.force) {
    throw new BadRequestException(
      `User has ${pendingRewards.length} pending rewards. Use force=true to override.`
    );
  }

  // 4. Suppression
  await this.userService.updateUser(userId, {
    $unset: {
      walletAddress: '',
      walletSyncedAt: '',
    }
  });

  // 5. Log traçabilité
  this.logger.warn(
    `✅ Wallet reset for user ${userId}. Previous wallet: ${user.walletAddress}. Reason: ${options?.reason}`
  );
}
```

### Protection contre les abus

**⚠️ IMPORTANT :**
- Endpoint **ADMIN ONLY** (protégé par `AuthAdminGuard`)
- Log toutes les actions (qui, quand, pourquoi)
- Vérification pending rewards (éviter perte de funds)
- Option `force` pour override (cas extrême)

---

## 💡 ALTERNATIVES

### Option 1 : User se déconnecte lui-même (recommandé)

**Frontend : Bouton "Déconnecter wallet"**
```typescript
// WalletSettings.tsx
import { useSignOut } from '@coinbase/onchainkit/wallet';

const WalletSettings = () => {
  const { signOut } = useSignOut();

  const handleDisconnect = async () => {
    // 1. Déconnecter du SDK Coinbase
    await signOut();

    // 2. Supprimer de la DB backend
    await axios.delete('/users/me/wallet');

    // 3. Recharger
    window.location.reload();
  };

  return (
    <Button onClick={handleDisconnect}>
      Déconnecter ce wallet
    </Button>
  );
};
```

---

### Option 2 : Mode incognito (pour tests uniquement)

**Pour tester l'onboarding :**
1. Ouvrir mode incognito (Cmd+Shift+N)
2. Login avec email/password
3. ✅ SDK Coinbase n'a pas de cache
4. ✅ WalletOnboardingModal s'affiche

---

### Option 3 : localStorage.clear() (pour tests uniquement)

**Console DevTools :**
```javascript
// Supprimer uniquement le flag onboarding
localStorage.removeItem('walletOnboardingSkipped');

// OU supprimer tout
localStorage.clear();

// Recharger
window.location.reload();
```

---

## 📊 STATISTIQUES

### Logs backend à surveiller

```bash
# Admin reset wallet
tail -f backend.log | grep "Wallet reset for user"

# Exemple output :
[2025-10-10 12:05:00] WARN [UserWalletAdminController] ✅ Wallet reset for user 64f5a3c1... Previous wallet: 0x1234... Reason: Support client - wallet bloqué
```

---

## ❓ FAQ

### Q : Pourquoi le SDK Coinbase garde le wallet en mémoire ?

**R :** Optimisation UX. Le SDK veut reconnecter automatiquement l'utilisateur sans lui redemander email/OTP à chaque visite.

---

### Q : Est-ce que `localStorage.clear()` suffit ?

**R :** Non. Le SDK Coinbase utilise probablement `IndexedDB` ou cookies sécurisés. Seul le mode incognito garantit un cache vide.

---

### Q : Peut-on forcer déconnexion SDK côté backend ?

**R :** Non. Le SDK Coinbase gère sa session côté client. On peut uniquement :
1. Supprimer wallet de la DB backend
2. Forcer user à se déconnecter/reconnecter

---

### Q : Que se passe-t-il si user a des pending rewards ?

**R :** Endpoint bloque le reset par défaut. Admin doit utiliser `force=true` (⚠️ dangereux car rewards seront perdus si wallet supprimé).

---

## ✅ CHECKLIST DÉPLOIEMENT

- [x] Endpoint `DELETE /admin/users/:userId/wallet` créé
- [x] Endpoint `POST /admin/users/:userId/wallet/sync` créé
- [x] Guard admin (`AuthAdminGuard`) appliqué
- [x] Vérification pending rewards
- [x] Logs traçabilité
- [x] Script de test `test-wallet-reset.js`
- [x] Documentation complète
- [ ] Tests end-to-end (admin reset → user reconnect → nouveau wallet)
- [ ] (Optionnel) Bouton frontend "Déconnecter wallet" pour users
- [ ] (Optionnel) Dashboard admin pour voir historique resets

---

## 📝 RÉSUMÉ

**TU AS MAINTENANT :**
✅ Endpoint admin pour reset wallet user  
✅ Vérifications de sécurité (pending rewards)  
✅ Logs traçabilité  
✅ Script de test automatisé  
✅ Documentation complète  

**WORKFLOW :**
1. Admin → `DELETE /admin/users/:userId/wallet`
2. User → Se déconnecte + reconnecte
3. SDK Coinbase → Re-synchronise avec backend
4. ✅ Nouveau wallet créé

**POUR TESTER ONBOARDING :**
- Mode incognito (Cmd+Shift+N) ← **LE PLUS SIMPLE**
- OU localStorage.clear() + déconnexion

🎉 **Problème résolu !**

