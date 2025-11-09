# 🔐 Sécurité Embedded Wallet - Session CDP & Vérifications

**Date de création :** 7 novembre 2025  
**Auteur :** Assistant AI (suite à découverte de faille de sécurité)  
**Statut :** ✅ Implémenté et actif

---

## 📋 Table des Matières

1. [Contexte](#contexte)
2. [Problème de Sécurité Identifié](#problème-de-sécurité-identifié)
3. [Solution Implémentée](#solution-implémentée)
4. [Flow de Sécurité Détaillé](#flow-de-sécurité-détaillé)
5. [Tests de Sécurité](#tests-de-sécurité)
6. [Scénarios d'Attaque Couverts](#scénarios-dattaque-couverts)

---

## 🎯 Contexte

### Comment Fonctionne CDP Embedded Wallet

**Session de 7 jours :**
- Quand un user s'authentifie avec OTP (email/SMS), CDP crée une **session de 7 jours**
- Pendant ces 7 jours, le user peut **signer des transactions SANS popup de confirmation**
- La signature se fait automatiquement (seamless UX)
- Les clés de signature sont stockées **localement** dans le navigateur (device-specific keys)

**Pourquoi pas de popup ?**
- C'est le **design voulu** par Coinbase pour Embedded Wallets
- Contrairement à MetaMask (popup à chaque transaction), CDP vise une UX "invisible"
- L'utilisateur a **déjà approuvé** lors de l'OTP initial
- La session reste active tant que :
  - < 7 jours écoulés
  - User ne se déconnecte pas manuellement
  - User ne vide pas le localStorage

**Documentation officielle :**
> "Embedded Wallets are designed to be invisible to end-users while providing full onchain functionality: User authentication : Users sign in with familiar methods like email OTP [...] **Seamless transactions** : Users can send, swap, stake, and interact with onchain apps while maintaining full control of their assets"
> 
> Source : https://docs.cdp.coinbase.com/embedded-wallets/welcome

---

## 🚨 Problème de Sécurité Identifié

### Scénario d'Attaque

```
1. User A se connecte à CyLimit → Token CyLimit créé ✅
2. User A clique "Créer/Connecter Wallet" → Session CDP créée (7 jours) ✅
3. User A se déconnecte de CyLimit → cdpSignOut() + forceClearCoinbaseSession() ✅

--- PROBLÈME : Si le nettoyage échoue (bug, localStorage corrompu, etc.) ---

4. User B se connecte à CyLimit (même navigateur/machine) → Token CyLimit créé ✅
5. User B NE connecte PAS son wallet (clique "Plus tard") ⚠️
6. User B essaie d'acheter un NFT → sendUserOp() est appelé

❌ FAILLE : Si la session CDP de User A persiste, User B pourrait
            envoyer des transactions depuis le wallet de User A !
```

### Pourquoi c'était possible ?

**Avant le fix :**
```typescript
// useCoinbaseWallet.ts (ANCIEN CODE - VULNÉRABLE)
const sendUserOp = async (params) => {
  // ✅ Vérification 1 : isSignedIn (CDP)
  if (!isSignedIn) {
    throw new Error('Not signed in');
  }
  
  // ✅ Vérification 2 : Smart Account exists
  if (!smartAccount) {
    throw new Error('No Smart Account');
  }
  
  // ❌ MANQUE : Vérifier que ce wallet appartient au user CyLimit !
  
  // → Transaction envoyée sans vérifier ownership
  return await sendUserOperation({ ... });
};
```

**Le problème :**
- On vérifie que **CDP est connecté** (isSignedIn = true)
- On vérifie qu'un **Smart Account existe**
- **MAIS** on ne vérifie PAS que ce Smart Account **appartient au user CyLimit connecté** !

---

## ✅ Solution Implémentée

### Triple Vérification de Sécurité

```typescript
// useCoinbaseWallet.ts (NOUVEAU CODE - SÉCURISÉ)
const sendUserOp = async (params) => {
  // 🔐 SÉCURITÉ 1/3 : Vérifier connexion CDP
  if (!isSignedIn) {
    throw new Error('User is not signed in. Please connect your wallet first.');
  }
  
  if (!smartAccount) {
    throw new Error('No Smart Account found. User must be authenticated.');
  }

  // 🔐 SÉCURITÉ 2/3 : Vérifier que le wallet CDP appartient au user CyLimit
  const token = localStorage.getItem('TOKEN'); // Token CyLimit
  if (!token) {
    throw new Error('You must be logged in to CyLimit to perform this action.');
  }

  // Récupérer le profil user depuis le backend
  const profileResponse = await fetch(`${API_URL}/users/me/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const userProfile = await profileResponse.json();
  const expectedWalletAddress = userProfile?.walletAddress?.toLowerCase();
  const currentWalletAddress = smartAccount?.toLowerCase();

  // 🚨 CRITIQUE : Si mismatch → BLOQUER la transaction
  if (expectedWalletAddress && expectedWalletAddress !== currentWalletAddress) {
    console.error('🚨 CRITICAL SECURITY ERROR: Wallet mismatch!', {
      cylimitUser: userProfile?.username,
      expectedWallet: expectedWalletAddress,
      cdpWallet: currentWalletAddress
    });
    
    throw new Error(
      'Security error: The connected wallet does not belong to your account. ' +
      'Please disconnect and reconnect your wallet.'
    );
  }

  // ✅ Si pas encore de wallet enregistré, c'est OK (première connexion)
  if (!expectedWalletAddress) {
    console.log('ℹ️  Premier wallet connecté pour ce user, vérification OK');
  }

  // 🔐 SÉCURITÉ 3/3 : Tout est OK, on peut envoyer la transaction
  return await sendUserOperation({ ... });
};
```

### Fichiers Modifiés

- **`cylimit-frontend-develop/src/hooks/useCoinbaseWallet.ts`**
  - Ajout de la vérification `walletAddress` vs `smartAccount`
  - Fetch du profil user depuis `/users/me`
  - Blocage si mismatch détecté

---

## 🔄 Flow de Sécurité Détaillé

### Cas 1 : User Normal (Wallet Connecté)

```
1. User A se connecte à CyLimit
   → TOKEN dans localStorage ✅

2. User A connecte son Embedded Wallet (email OTP)
   → Session CDP créée (7 jours) ✅
   → Smart Account créé : 0xABC...123 ✅

3. Backend enregistre walletAddress
   → userProfile.walletAddress = 0xABC...123 ✅

4. User A achète un NFT
   → sendUserOp() appelé
   → Vérification 1 : isSignedIn = true ✅
   → Vérification 2 : smartAccount = 0xABC...123 ✅
   → Vérification 3 : 
      - Fetch /users/me → walletAddress = 0xABC...123
      - Compare : 0xABC...123 === 0xABC...123 ✅
   → Transaction envoyée ✅
```

### Cas 2 : User Malveillant (Session CDP Résiduelle)

```
1. User A se déconnecte de CyLimit
   → cdpSignOut() + forceClearCoinbaseSession() ✅
   → MAIS bug localStorage → session CDP persiste ⚠️

2. User B se connecte à CyLimit (même navigateur)
   → TOKEN (User B) dans localStorage ✅

3. User B clique "Plus tard" (ne connecte PAS son wallet)
   → Pas de nouveau Smart Account créé
   → MAIS session CDP de User A encore active ⚠️

4. User B essaie d'acheter un NFT
   → sendUserOp() appelé
   → Vérification 1 : isSignedIn = true (session User A) ⚠️
   → Vérification 2 : smartAccount = 0xABC...123 (wallet User A) ⚠️
   → Vérification 3 : 
      - Fetch /users/me (avec token User B) → walletAddress = 0xXYZ...789 (wallet User B)
      - Compare : 0xABC...123 !== 0xXYZ...789 ❌
   → 🚨 ERREUR : "Security error: The connected wallet does not belong to your account"
   → Transaction BLOQUÉE ✅
```

### Cas 3 : Première Connexion Wallet

```
1. User C se connecte à CyLimit (nouveau user)
   → TOKEN dans localStorage ✅

2. User C connecte son Embedded Wallet pour la première fois
   → Session CDP créée ✅
   → Smart Account créé : 0xDEF...456 ✅

3. Backend pas encore de walletAddress
   → userProfile.walletAddress = null ⚠️

4. User C achète un NFT
   → sendUserOp() appelé
   → Vérification 1 : isSignedIn = true ✅
   → Vérification 2 : smartAccount = 0xDEF...456 ✅
   → Vérification 3 : 
      - Fetch /users/me → walletAddress = null
      - Compare : null !== 0xDEF...456
      - MAIS condition spéciale : if (!expectedWalletAddress)
      - Log : "ℹ️  Premier wallet connecté pour ce user, vérification OK"
   → Transaction envoyée ✅
   → Backend enregistre walletAddress = 0xDEF...456 via syncWalletAddress()
```

---

## 🧪 Tests de Sécurité

### Test 1 : Vérifier le Blocage de Mismatch

**Procédure :**
1. Créer 2 comptes CyLimit : User A et User B
2. User A : connecter son wallet (créer un Smart Account)
3. User A : se déconnecter de CyLimit
4. **Simuler bug localStorage** : Ne PAS vider les clés CDP
   ```javascript
   // Dans la console navigateur
   console.log('CDP keys before cleanup:');
   Object.keys(localStorage).filter(k => k.startsWith('cdp:')).forEach(k => {
     console.log(k, localStorage.getItem(k));
   });
   ```
5. User B : se connecter à CyLimit (même navigateur)
6. User B : essayer d'acheter un NFT **SANS connecter son wallet**

**Résultat attendu :**
```
🚨 CRITICAL SECURITY ERROR: Wallet mismatch!
{
  cylimitUser: "user_b_username",
  expectedWallet: "0x...user_b_wallet",
  cdpWallet: "0x...user_a_wallet"
}

Error: Security error: The connected wallet does not belong to your account. 
Please disconnect and reconnect your wallet.
```

### Test 2 : Vérifier le Fonctionnement Normal

**Procédure :**
1. User A : se connecter à CyLimit
2. User A : connecter son wallet
3. User A : acheter un NFT

**Résultat attendu :**
```
🔐 Vérification sécurité wallet:
{
  expectedWallet: "0x...user_a_wallet",
  currentWallet: "0x...user_a_wallet",
  match: true
}

✅ UserOperation envoyée !
```

### Test 3 : Première Connexion Wallet

**Procédure :**
1. Créer un nouveau compte CyLimit (User C)
2. User C : se connecter à CyLimit
3. User C : connecter son wallet pour la **première fois**
4. User C : acheter un NFT

**Résultat attendu :**
```
🔐 Vérification sécurité wallet:
{
  expectedWallet: null,
  currentWallet: "0x...user_c_wallet",
  match: false
}

ℹ️  Premier wallet connecté pour ce user, vérification OK

✅ UserOperation envoyée !
```

---

## 🛡️ Scénarios d'Attaque Couverts

### ✅ Attaque 1 : Session CDP Résiduelle
**Scénario :** User B essaie d'utiliser la session CDP de User A  
**Protection :** Vérification wallet ownership (`expectedWallet !== currentWallet`)  
**Résultat :** Transaction **BLOQUÉE** ✅

### ✅ Attaque 2 : Modification localStorage Manuelle
**Scénario :** Attaquant modifie `walletAddress` dans le backend via API  
**Protection :** Vérification à chaque transaction (pas de cache côté frontend)  
**Résultat :** Mismatch détecté → Transaction **BLOQUÉE** ✅

### ✅ Attaque 3 : Token CyLimit Volé + Session CDP Résiduelle
**Scénario :** Attaquant vole le token CyLimit de User A ET a accès à sa session CDP  
**Protection :** Vérification wallet ownership (token User A → wallet User A attendu)  
**Résultat :** Transaction **AUTORISÉE** (car token ET wallet correspondent)  
**Note :** C'est normal, si attaquant a le token CyLimit, il a déjà accès au compte

### ⚠️ Limitation : Token CyLimit + Wallet CDP Volés
**Scénario :** Attaquant vole TOUT (token + session CDP + accès machine)  
**Protection :** Aucune (si attaquant a tout, il EST l'utilisateur)  
**Mitigation possible :** 
- 2FA sur CyLimit (email/SMS à chaque connexion sensible)
- IP whitelisting
- Device fingerprinting

---

## 📊 Logs de Sécurité

### Logs Normaux (Transaction OK)

```
📤 sendUserOp appelé - État actuel:
  isSignedIn: true
  hasCurrentUser: true
  smartAccount: "0xfb308a77ef2bb836f2031d9ede0e97be3a403d3e"
  userId: "f15bb32e-59b6-4d2d-afab-ec012e41c572"

🔐 Vérification sécurité wallet:
  expectedWallet: "0xfb308a77ef2bb836f2031d9ede0e97be3a403d3e"
  currentWallet: "0xfb308a77ef2bb836f2031d9ede0e97be3a403d3e"
  match: true

✅ UserOperation envoyée !
```

### Logs Anomalie (Attaque Détectée)

```
📤 sendUserOp appelé - État actuel:
  isSignedIn: true
  hasCurrentUser: true
  smartAccount: "0x...user_a_wallet"
  userId: "...user_a_id"

🔐 Vérification sécurité wallet:
  expectedWallet: "0x...user_b_wallet"
  currentWallet: "0x...user_a_wallet"
  match: false

🚨 CRITICAL SECURITY ERROR: Wallet mismatch!
{
  cylimitUser: "user_b",
  expectedWallet: "0x...user_b_wallet",
  cdpWallet: "0x...user_a_wallet"
}

❌ Wallet verification failed: Security error: The connected wallet does not belong to your account.
```

---

## 🔗 Références

- **Coinbase Embedded Wallets - Session Management**  
  https://docs.cdp.coinbase.com/embedded-wallets/session-management

- **Coinbase Embedded Wallets - Security**  
  https://docs.cdp.coinbase.com/embedded-wallets/domains

- **ERC-4337 (Account Abstraction)**  
  https://eips.ethereum.org/EIPS/eip-4337

- **CyLimit - Fix Embedded Wallet Session Management**  
  `cylimit-infrastructure/old/docs/FIX_EMBEDDED_WALLET_SESSION_MANAGEMENT.md`

---

## 📝 Historique

| Date | Action | Auteur |
|------|--------|--------|
| 7 Nov 2025 | ✅ Implémentation triple vérification sécurité | Assistant AI |
| 7 Nov 2025 | 📄 Création de cette documentation | Assistant AI |

---

## 🚀 Prochaines Étapes (Optionnel)

### Amélioration 1 : Modal de Confirmation Custom
Ajouter un modal de confirmation **avant** chaque transaction importante (> 10 USDC par exemple) :

```typescript
const handleBuy = async () => {
  // Modal custom (UX supplémentaire, pas pour la sécurité)
  const confirmed = await showCustomConfirmModal({
    action: "Acheter NFT",
    amount: "5 USDC",
    to: sellerAddress,
  });
  
  if (!confirmed) return;
  
  await buyNFT({ listingId, ... });
};
```

### Amélioration 2 : Logging Centralisé
Envoyer les logs de sécurité au backend pour monitoring :

```typescript
// Si mismatch détecté
await logSecurityEvent({
  type: 'WALLET_MISMATCH',
  userId: userProfile?.id,
  expectedWallet: expectedWalletAddress,
  cdpWallet: currentWalletAddress,
  timestamp: new Date().toISOString()
});
```

### Amélioration 3 : Rate Limiting
Ajouter un rate limit sur les transactions (max 10 UserOps par minute par user).

---

**🔐 Sécurité = Priorité #1**  
Cette documentation doit être mise à jour à chaque modification du système de sécurité.

