# ✅ CORRECTIONS - Script create-master-wallet.js

**Date :** 15 Octobre 2025  
**Fichier :** `cylimit-admin-backend/scripts/create-master-wallet.js`  
**Status :** ✅ Corrigé et validé avec documentation Coinbase

---

## 🔍 AUDIT AVEC COINBASE MCP

**Sources consultées :**
- https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts
- https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/client/cdp-client
- https://docs.cdp.coinbase.com/api-reference/v2/authentication
- https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/smart-accounts

---

## ❌ ERREURS IDENTIFIÉES

### 1. Variables d'environnement incorrectes

**❌ Avant :**
```javascript
const apiKeyName = process.env.COINBASE_API_KEY_NAME;
const apiKeyPrivate = process.env.COINBASE_API_KEY_PRIVATE_KEY;

const cdp = new CdpClient({
  apiKeyName: apiKeyName,
  privateKey: apiKeyPrivate,
});
```

**✅ Après :**
```javascript
const apiKeyId = process.env.CDP_API_KEY_ID;
const apiKeySecret = process.env.CDP_API_KEY_SECRET;
const walletSecret = process.env.CDP_WALLET_SECRET;

const cdp = new CdpClient({
  apiKeyId: apiKeyId,
  apiKeySecret: apiKeySecret,
  walletSecret: walletSecret,
});
```

**Raison :**
- Le `CdpClient` attend `apiKeyId`, `apiKeySecret`, et `walletSecret` (pas `apiKeyName` et `privateKey`)
- Documentation officielle : https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/client/cdp-client

---

### 2. Type de compte incorrect (Smart Account vs Regular Account)

**❌ Avant :**
```javascript
const account = await cdp.evm.createAccount({
  type: 'smart', // Smart Account (ERC-4337)
});
```

**✅ Après :**
```javascript
const account = await cdp.evm.createAccount({
  name: 'CyLimit-Master-New-Wallet',
});
```

**Raison :**
- Les **Smart Accounts** sont pour des use cases avancés (batch TX, gas sponsoring, policies)
- Ils nécessitent un **owner account** (EVM account) pour signer
- Documentation : https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/smart-accounts

**Pour le Master New Wallet :**
- ✅ Un **regular EVM Account** est suffisant
- ✅ Plus simple (pas besoin d'owner)
- ✅ Compatible avec tous les contrats (mint, transfer, etc.)
- ✅ Gestion MPC 2-of-2 par Coinbase (sécurisé)

**Si on voulait un Smart Account (facultatif) :**
```javascript
// 1. Créer un owner account
const ownerAccount = await cdp.evm.createAccount();

// 2. Créer un Smart Account avec cet owner
const smartAccount = await cdp.evm.createSmartAccount({
  owner: ownerAccount,
});
```

**Conclusion :** Regular Account est le bon choix pour le Master New Wallet !

---

### 3. Documentation commentaires

**❌ Avant :**
```javascript
 * PRÉREQUIS :
 * - COINBASE_API_KEY_NAME configuré dans .env
 * - COINBASE_API_KEY_PRIVATE_KEY configuré dans .env
```

**✅ Après :**
```javascript
 * PRÉREQUIS :
 * - CDP_API_KEY_ID configuré dans .env
 * - CDP_API_KEY_SECRET configuré dans .env
 * - CDP_WALLET_SECRET configuré dans .env
```

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Variables d'environnement

**Format correct :**
```bash
# .env
CDP_API_KEY_ID=organizations/.../apiKeys/...
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
```

**Source :** https://docs.cdp.coinbase.com/api-reference/v2/authentication

---

### 2. Initialisation CdpClient

**Format correct :**
```javascript
const cdp = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET,
});
```

**Alternative (via env vars automatiques) :**
```javascript
// Si les env vars sont nommées correctement, CDP SDK les charge automatiquement
const cdp = new CdpClient();
```

---

### 3. Création du compte

**Format correct :**
```javascript
// Créer un EVM Account regular avec nom
const account = await cdp.evm.createAccount({
  name: 'CyLimit-Master-New-Wallet',
});

console.log('Address:', account.address);
console.log('Name:', account.name);
```

**Source :** https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts

---

### 4. Messages utilisateur

**Améliorations :**
- ✅ Messages d'erreur plus clairs
- ✅ Liens vers documentation officielle
- ✅ Format correct des variables d'environnement
- ✅ Explication MPC 2-of-2
- ✅ Backup dans `scripts/data/master-wallet-address.txt`

---

## 📚 DOCUMENTATION OFFICIELLE

### CdpClient Constructor

**Paramètres requis :**
```typescript
interface CdpClientOptions {
  apiKeyId?: string;      // CDP Secret API Key ID
  apiKeySecret?: string;  // CDP Secret API Key Secret
  walletSecret?: string;  // Wallet Secret (pour POST/DELETE)
}
```

**Source :**
- https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/client/cdp-client

---

### EVM Account Creation

**Méthode :**
```typescript
cdp.evm.createAccount(options?: {
  name?: string;  // Nom optionnel pour identifier le compte
})
```

**Retour :**
```typescript
{
  address: string;  // Adresse 0x...
  name?: string;    // Nom du compte
}
```

**Source :**
- https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts

---

### Smart Account vs Regular Account

| Feature | Regular EVM Account | Smart Account (ERC-4337) |
|---------|---------------------|--------------------------|
| **Usage** | Transactions standard | Batch TX, Gas sponsoring, Policies |
| **Setup** | Simple (1 appel) | Nécessite owner account |
| **Signatures** | Direct | Via owner account |
| **Gas** | Normal | Peut être sponsorisé |
| **Deployment** | Immédiat | Lazy (au 1er userOp) |
| **Use Case** | Master Wallet ✅ | Embedded Wallets avancés |

**Pour CyLimit Master New Wallet :**
- ✅ **Regular Account est le bon choix**
- Simple, direct, compatible avec tous les contrats
- MPC 2-of-2 = sécurité maximale

**Source :**
- https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/smart-accounts

---

## 🎯 RÉSULTAT FINAL

### Script corrigé

**Fichier :** `cylimit-admin-backend/scripts/create-master-wallet.js`

**Ce qu'il fait maintenant :**
1. ✅ Charge les bonnes variables d'environnement (`CDP_*`)
2. ✅ Initialise `CdpClient` correctement
3. ✅ Crée un **Regular EVM Account** (pas Smart Account)
4. ✅ Affiche l'adresse et le nom
5. ✅ Sauvegarde dans `scripts/data/master-wallet-address.txt`
6. ✅ Donne les instructions suivantes

**Utilisation :**
```bash
cd cylimit-admin-backend
node scripts/create-master-wallet.js
```

**Résultat attendu :**
```
✅ WALLET CRÉÉ AVEC SUCCÈS !

📍 ADDRESS (Master New Wallet):
   0xABCDEF1234567890...

🏷️  NAME: CyLimit-Master-New-Wallet
🔑 TYPE: Coinbase Server Wallet (EVM Account)
🔐 CLÉS: Secured by Coinbase (MPC 2-of-2 + TEE)
```

---

## ⚠️ RECOMMANDATION FINALE

**Même si le script est maintenant corrigé, je recommande toujours de créer le Master New Wallet via le CDP Portal UI :**

**Raisons :**
1. ✅ Plus simple (5 clics vs script)
2. ✅ Visibilité immédiate dans le portal
3. ✅ Support Coinbase facilement accessible
4. ✅ Pas de risque d'erreur de script
5. ✅ Idéal pour une seule création

**Guide Portal UI :**
- `docs/Wallets/RECAP-MASTER-WALLET-CREATION.md`

**Le script reste utile pour :**
- 🔍 Comprendre l'API Coinbase CDP
- 🤖 Automatiser des créations bulk
- 🧪 Tester l'intégration CDP SDK

---

## 📝 CHANGELOG

| Date | Changement | Raison |
|------|------------|--------|
| 15 Oct 2025 | `COINBASE_API_KEY_NAME` → `CDP_API_KEY_ID` | Format correct CDP SDK |
| 15 Oct 2025 | `COINBASE_API_KEY_PRIVATE_KEY` → `CDP_API_KEY_SECRET` | Format correct CDP SDK |
| 15 Oct 2025 | Ajout `CDP_WALLET_SECRET` | Requis pour POST endpoints |
| 15 Oct 2025 | `type: 'smart'` → Account regular | Smart Account non nécessaire |
| 15 Oct 2025 | Ajout `name: 'CyLimit-Master-New-Wallet'` | Meilleure identification |
| 15 Oct 2025 | Messages d'erreur améliorés | Liens documentation officielle |
| 15 Oct 2025 | Backup dans `data/master-wallet-address.txt` | Sauvegarde infos |

---

## 🔗 LIENS UTILES

**Documentation Coinbase :**
- Authentication : https://docs.cdp.coinbase.com/api-reference/v2/authentication
- CDP Client : https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/typescript/client/cdp-client
- Managing Accounts : https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts
- Smart Accounts : https://docs.cdp.coinbase.com/server-wallets/v2/evm-features/smart-accounts

**Documentation CyLimit :**
- Guide démarrage : `docs/Wallets/GUIDE-DEMARRAGE-RAPIDE.md`
- Comparaison méthodes : `docs/Wallets/RECAP-MASTER-WALLET-CREATION.md`
- Index complet : `docs/Wallets/INDEX-DOCUMENTATION.md`

---

**Validé avec :** Coinbase Developer Documentation (MCP)  
**Date :** 15 Octobre 2025  
**Status :** ✅ Script corrigé et prêt à l'emploi

