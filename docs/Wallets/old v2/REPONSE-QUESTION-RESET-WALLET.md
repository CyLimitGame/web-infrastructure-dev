# 🔧 Réponse : "Je ne pourrais jamais forcer le changement d'un wallet user ?"

**Question initiale :** "Mais du coup je ne pourrais jamais forcer le changement d'un wallet user si j'en ai besoin ?"

**Réponse courte :** **SI, TU PEUX !** 🎉

---

## 🎯 CLARIFICATION IMPORTANTE

### Ce qu'on vient de tester

❌ **Mauvaise approche (script DB uniquement) :**
```javascript
// scripts/reset-user-wallet.js
await db.users.updateOne(
  { email: 'test@test.com' },
  { $unset: { walletAddress: '', walletSyncedAt: '' } }
);
```

**Problème :**
- ✅ Wallet supprimé de la DB
- ❌ SDK Coinbase frontend **garde le wallet en mémoire**
- ❌ User voit toujours le wallet connecté

**Pourquoi ?**
Le SDK Coinbase stocke la session **en dehors de `localStorage`** :
- Probablement dans `IndexedDB` (base de données navigateur)
- OU dans des cookies sécurisés
- OU dans la session en mémoire du SDK

---

## ✅ LA VRAIE SOLUTION : Endpoint Admin

**Ce qu'on vient de créer :**

### 1. DELETE /admin/users/:userId/wallet

**Endpoint admin qui :**
1. ✅ Supprime `walletAddress` de la DB
2. ✅ Log l'action pour traçabilité
3. ✅ Vérifie qu'il n'y a pas de pending rewards (sécurité)
4. ⚠️ **IMPORTANT :** User doit se déconnecter + reconnecter

**Usage :**
```bash
curl -X DELETE http://localhost:5000/v1/admin/users/{userId}/wallet \
  -H "Authorization: Bearer {ADMIN_JWT}" \
  -d '{ "reason": "Support client - wallet bloqué" }'
```

**Response :**
```json
{
  "success": true,
  "message": "Wallet reset. User doit se déconnecter et reconnecter.",
  "data": {
    "userId": "64f5a3c1...",
    "previousWalletAddress": "0x1234...",
    "resetBy": "64f5a3c1...",
    "resetAt": "2025-10-10T12:00:00Z",
    "reason": "Support client - wallet bloqué"
  }
}
```

---

### 2. POST /admin/users/:userId/wallet/sync

**Endpoint admin pour vérifier l'état :**
```bash
curl -X POST http://localhost:5000/v1/admin/users/{userId}/wallet/sync \
  -H "Authorization: Bearer {ADMIN_JWT}"
```

**Response :**
```json
{
  "success": true,
  "data": {
    "userId": "64f5a3c1...",
    "email": "test@test.com",
    "walletAddressInDB": "0x1234..." or null,
    "walletSyncedAt": "2025-10-10T12:00:00Z" or null,
    "hasWallet": true or false
  }
}
```

---

## 🔄 WORKFLOW COMPLET

### Scénario : Admin reset wallet → User reconnecte

```
1. ADMIN : Reset wallet
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
   ✅ SDK Coinbase perd la session

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
   Backend crée nouvelle adresse Coinbase
   ↓
   Backend link adresse à user en DB
   ↓
   ✅ NOUVEAU WALLET CRÉÉ

4. USER : Voit WalletOnboardingModal (optionnel)
   ↓
   Si localStorage.getItem('walletOnboardingSkipped') === null
   ↓
   Modal s'affiche
   ↓
   User peut cliquer "Créer maintenant" ou "Plus tard"
```

---

## 🧪 TESTS

### Script automatisé

```bash
cd cylimit-admin-backend

# Tester avec un user existant
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

---

## 💡 ALTERNATIVES

### Option 1 : User se déconnecte lui-même (recommandé en production)

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

### Option 2 : Mode incognito (POUR TESTS UNIQUEMENT)

**Le plus simple pour tester l'onboarding :**
1. Cmd+Shift+N (ouvrir mode incognito)
2. Va sur http://localhost:3000
3. Login avec email/password
4. ✅ SDK Coinbase n'a PAS de cache
5. ✅ WalletOnboardingModal s'affiche

---

### Option 3 : localStorage.clear() (POUR TESTS UNIQUEMENT)

**Console DevTools :**
```javascript
// Supprimer uniquement le flag onboarding
localStorage.removeItem('walletOnboardingSkipped');

// OU supprimer tout
localStorage.clear();

// Recharger
window.location.reload();
```

⚠️ **ATTENTION :** Ceci ne déconnecte PAS le SDK Coinbase !

---

## 🚨 SÉCURITÉ

### Vérifications implémentées

✅ **Endpoint protégé par `AuthAdminGuard`** (JWT Admin + role ADMIN)  
✅ **Vérification user existe**  
✅ **Vérification user a un wallet**  
✅ **Vérification pending rewards** (éviter perte de funds)  
✅ **Logs traçabilité** (qui, quand, pourquoi)  
✅ **Option `force`** pour override (cas extrême)  

---

## 📊 FICHIERS CRÉÉS

### Backend (Admin)

1. **Controller :**
   ```
   cylimit-admin-backend/src/modules/user/controllers/user-wallet-admin.controller.ts
   ```

2. **Module (modifié) :**
   ```
   cylimit-admin-backend/src/modules/user/user.module.ts
   ```

3. **Script de test :**
   ```
   cylimit-admin-backend/scripts/test-wallet-reset.js
   ```

### Documentation

4. **Guide complet :**
   ```
   cylimit-infrastructure/docs/Wallets/ADMIN-WALLET-RESET.md
   ```

5. **Cette réponse :**
   ```
   cylimit-infrastructure/docs/Wallets/REPONSE-QUESTION-RESET-WALLET.md
   ```

---

## ✅ RÉSUMÉ : TU PEUX FORCER LE CHANGEMENT !

**Méthodes disponibles :**

| Méthode | Qui | Quand | Comment |
|---------|-----|-------|---------|
| **Endpoint Admin** | Admin | Support client, tests | `DELETE /admin/users/:userId/wallet` |
| **Bouton déconnexion** | User | Volontaire | SDK `signOut()` + `DELETE /users/me/wallet` |
| **Mode incognito** | Dev | Tests onboarding | Cmd+Shift+N |
| **localStorage.clear()** | Dev | Tests onboarding | Console DevTools |

---

## 🎯 RÉPONSE À TA QUESTION

> "Mais du coup je ne pourrais jamais forcer le changement d'un wallet user si j'en ai besoin ?"

**Réponse :** **SI, TU PEUX !**

**Workflow :**
1. ✅ Admin appelle `DELETE /admin/users/:userId/wallet`
2. ✅ Wallet supprimé de la DB
3. ✅ User se déconnecte + reconnecte
4. ✅ SDK Coinbase re-synchronise avec backend
5. ✅ Nouveau wallet créé automatiquement

**Pourquoi le script DB seul ne suffisait pas :**
- Le SDK Coinbase **cache la session** côté frontend
- Le cache n'est PAS dans `localStorage`
- Il faut **forcer la déconnexion user** pour que le SDK se re-synchronise

**Solution :**
- ✅ Endpoint admin reset wallet
- ✅ User doit se déconnecter/reconnecter
- ✅ Nouveau wallet créé automatiquement

🎉 **Problème résolu !**

---

## 📝 PROCHAINES ÉTAPES

### Production (optionnel)

1. [ ] Bouton frontend "Déconnecter wallet" pour users
2. [ ] Dashboard admin pour voir historique resets
3. [ ] Notification email auto quand admin reset wallet
4. [ ] Système de tickets support (user demande reset)

### Tests (maintenant)

1. [x] Endpoint admin créé
2. [x] Script de test créé
3. [ ] Tester end-to-end :
   - Admin reset wallet
   - User se déconnecte
   - User se reconnecte
   - Vérifier nouveau wallet créé

