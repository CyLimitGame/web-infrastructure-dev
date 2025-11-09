# 📝 GUIDE COMPLET : Vérifier un Contrat sur Basescan depuis Remix

**Date :** 5 Novembre 2025  
**Contexte :** Déploiement CyLimitNFT_v2_FIXED sur Base Sepolia  
**Importance :** 🔴 CRITIQUE - À faire dans les 5 minutes après déploiement

---

## 🎯 POURQUOI VÉRIFIER LE CONTRAT ?

### Avantages de la Vérification

| Avantage | Impact |
|----------|--------|
| **Transparence** | Code source visible publiquement |
| **Confiance** | Users peuvent auditer le contrat |
| **Interaction** | Appeler fonctions via Basescan UI |
| **Debugging** | Voir events et logs décodés |
| **Standard** | Best practice industrie blockchain |

### ⚠️ TIMING CRITIQUE

**Pourquoi dans les 5 minutes ?**

```
Après déploiement :
1. Le bytecode est sur la blockchain ✅
2. Remix a encore le code source en mémoire ✅
3. Les constructor arguments sont disponibles ✅

Si vous attendez trop :
- Remix perd les infos (refresh browser)
- Vous devez retrouver les constructor args
- Risque d'erreur (code modifié entre-temps)

→ VÉRIFIER IMMÉDIATEMENT !
```

---

## 📋 MÉTHODE 1 : Plugin Remix (RECOMMANDÉ) ✅

### Étape 1 : Activer le Plugin

**Dans Remix IDE :**

```
1. Cliquer sur 🔌 "Plugin Manager"
   (Icône en bas à gauche de Remix)
   ↓
2. Dans la barre de recherche, taper :
   "Contract Verification"
   ↓
3. Trouver :
   "Contract Verification - Etherscan"
   Par : Remix
   ↓
4. Cliquer "Activate"
   ↓
5. ✅ Le plugin apparaît dans la sidebar
   (Icône avec ✓ checkmark)
```

**Visuel Remix :**
```
┌─────────────────────────────────────┐
│  REMIX IDE                          │
├─────────────────────────────────────┤
│  📂 File Explorer                   │
│  🔍 Solidity Compiler               │
│  🚀 Deploy & Run Transactions       │
│  ✅ Contract Verification  ← ICI    │  ← Nouveau !
│  🔌 Plugin Manager                  │
│  ⚙️  Settings                        │
└─────────────────────────────────────┘
```

---

### Étape 2 : Obtenir API Key Basescan

**Si vous n'avez pas encore de clé :**

```
1. Aller sur : https://basescan.org/myapikey
   ↓
2. Cliquer "Sign In" (ou "Sign Up" si nouveau)
   → Email + Password
   ↓
3. Une fois connecté, cliquer "Add"
   → "Create New API Key"
   ↓
4. Nom : "CyLimit Remix Verification"
   ↓
5. ✅ API Key créée !
   Copier : XXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Si vous avez déjà une clé (dans .env) :**

```bash
# cylimit-admin-backend/.env
BASESCAN_API_KEY=61N31K57D18ZIUWWR5ASUYK3FDMPKJVRE8
                 ↑ Utiliser celle-ci
```

---

### Étape 3 : Configurer le Plugin

**Dans le plugin "Contract Verification" :**

```
1. Onglet "Settings" (en haut du plugin)
   ↓
2. Remplir :

   ┌─────────────────────────────────────────┐
   │  Chain:                                 │
   │  [Base Sepolia (84532)           ▼]    │
   │  ⚠️ Pour testnet : Base Sepolia         │
   │  ⚠️ Pour mainnet : Base (8453)          │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │  Etherscan API Key:                     │
   │  [61N31K57D18ZIUWWR5ASUYK3FDMPKJVRE8]   │
   └─────────────────────────────────────────┘

   ↓
3. Cliquer "Save Settings"
   ↓
4. ✅ Message : "Settings saved successfully"
```

---

### Étape 4 : Vérifier le Contrat

**Immédiatement après déploiement :**

```
1. Onglet "Verify" dans le plugin
   ↓
2. Le plugin détecte automatiquement les contrats déployés
   ↓
3. Sélectionner votre contrat :

   ┌─────────────────────────────────────────────┐
   │  Select Contract to Verify:                 │
   │  [CyLimitNFT_v2 - 0x012ab34...      ▼]     │
   │  ⚠️ L'adresse doit correspondre              │
   └─────────────────────────────────────────────┘

   ↓
4. Vérifier les infos pré-remplies :

   Contract Address:
   └─ 0x012ab34A520638C0aA876252161c6039343741A4 ✅

   Contract Name:
   └─ CyLimitNFT_v2 ✅

   Compiler:
   └─ v0.8.20+commit.a1b79de6 ✅

   Optimization:
   └─ Enabled: Yes, Runs: 200 ✅

   Constructor Args:
   └─ [Auto-détecté par Remix] ✅

   ↓
5. Cliquer "Verify Contract"
   ↓
6. ⏳ Attendre 10-30 secondes...
   ↓
7. ✅ "Successfully verified" apparaît !
```

**Si réussi, vous verrez :**
```
┌─────────────────────────────────────────────┐
│  ✅ Contract Successfully Verified          │
│                                             │
│  View on Basescan:                          │
│  https://sepolia.basescan.org/address/0x... │
│                                             │
│  [Open in Browser]                          │
└─────────────────────────────────────────────┘
```

---

### Étape 5 : Confirmer sur Basescan

```
1. Cliquer "Open in Browser" (ou aller manuellement)
   ↓
2. Vous arrivez sur :
   https://sepolia.basescan.org/address/0x012ab34A520638C0aA876252161c6039343741A4
   ↓
3. Cliquer onglet "Contract"
   ↓
4. ✅ Vous devez voir :

┌──────────────────────────────────────────────┐
│  ✅ Contract Source Code Verified            │
│     (Exact Match)                            │
│                                              │
│  Contract Name:                              │
│  CyLimitNFT_v2                               │
│                                              │
│  Compiler Version:                           │
│  v0.8.20+commit.a1b79de6                     │
│                                              │
│  Optimization Enabled:                       │
│  Yes with 200 runs                           │
│                                              │
│  Constructor Arguments:                      │
│  0x0000000000000000000000000000...           │
│  Decoded:                                    │
│  - name: "CyLimit V2 Testnet"                │
│  - symbol: "CYLMT-TEST"                      │
│  - initialOwner: 0x214FB1351545...           │
└──────────────────────────────────────────────┘

5. Sous-onglets disponibles :
   [Code] [Read Contract] [Write Contract]
```

---

## 📋 MÉTHODE 2 : Basescan UI Manuelle (Si Plugin Ne Fonctionne Pas)

### Étape 1 : Aller sur Basescan

```
Testnet : https://sepolia.basescan.org
Mainnet : https://basescan.org

→ Chercher votre adresse contrat dans la barre de recherche
→ Ou aller directement : .../address/[VOTRE_ADRESSE]
```

### Étape 2 : Commencer la Vérification

```
1. Onglet "Contract"
   ↓
2. Lien "Verify and Publish"
   (Si pas visible, le contrat est déjà vérifié ✅)
   ↓
3. Page "Verify & Publish Contract Source Code"
```

### Étape 3 : Sélectionner le Type

```
┌─────────────────────────────────────────────┐
│  Please select Compiler Type                │
├─────────────────────────────────────────────┤
│                                             │
│  ( ) Solidity (Multi-Part files)           │
│  (•) Solidity (Single file)     ← CHOISIR  │
│  ( ) Solidity (Standard-Json-Input)         │
│  ( ) Vyper                                  │
│                                             │
│  [Continue]                                 │
└─────────────────────────────────────────────┘
```

**Pourquoi "Single file" ?**
- ✅ Plus simple
- ✅ Remix peut "flatten" automatiquement
- ✅ Pas besoin de gérer les imports

### Étape 4 : Remplir Compiler Settings

```
┌─────────────────────────────────────────────┐
│  Compiler Settings                          │
├─────────────────────────────────────────────┤
│                                             │
│  Compiler:                                  │
│  [v0.8.20+commit.a1b79de6            ▼]    │
│  ⚠️ EXACT version (avec commit hash)        │
│                                             │
│  Open Source License Type:                  │
│  [MIT License (MIT)                  ▼]    │
│                                             │
│  [Continue]                                 │
└─────────────────────────────────────────────┘
```

**⚠️ Trouver la version EXACTE dans Remix :**
```
Remix → Solidity Compiler (onglet)
→ Regarder en bas : "Compiler: 0.8.20+commit.a1b79de6"
→ Copier EXACTEMENT (avec +commit...)
```

### Étape 5 : Coller le Code Source

```
┌─────────────────────────────────────────────────────┐
│  Enter Contract Code                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Contract Name:                                     │
│  [CyLimitNFT_v2                                 ]   │
│  ⚠️ Exactement comme "contract CyLimitNFT_v2 is ..."│
│                                                     │
│  Optimization:                                      │
│  (•) Yes    Runs: [200]                            │
│  ( ) No                                             │
│  ⚠️ Doit correspondre à Remix                       │
│                                                     │
│  Enter the Solidity Contract Code below:           │
│  ┌─────────────────────────────────────────────┐   │
│  │ // SPDX-License-Identifier: MIT             │   │
│  │ pragma solidity ^0.8.20;                    │   │
│  │                                             │   │
│  │ import "@openzeppelin/contracts/...";      │   │
│  │                                             │   │
│  │ contract CyLimitNFT_v2 is ... {            │   │
│  │     // ... TOUT LE CODE ...                │   │
│  │ }                                           │   │
│  └─────────────────────────────────────────────┘   │
│  ⚠️ Copier TOUT depuis Remix (License + Imports)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Comment obtenir le code complet dans Remix :**

```
Option A : Copier directement
→ Remix → Votre fichier .sol
→ Ctrl+A (tout sélectionner)
→ Ctrl+C (copier)
→ Coller dans Basescan

Option B : Flatten le contrat (si imports complexes)
→ Remix → Right-click sur votre fichier
→ "Flatten"
→ Un nouveau fichier apparaît : "CyLimitNFT_v2_flat.sol"
→ Copier ce fichier (tous les imports sont intégrés)
```

### Étape 6 : Constructor Arguments (IMPORTANT)

```
┌─────────────────────────────────────────────┐
│  Constructor Arguments ABI-encoded:         │
│  [                                      ]   │
│  (Optional)                                 │
└─────────────────────────────────────────────┘
```

**Comment obtenir les Constructor Arguments ?**

#### Option A : Dans Remix (Après Déploiement)

```
1. Remix → "Deploy & Run Transactions"
   ↓
2. En bas, section "Deployed Contracts"
   ↓
3. Cliquer sur votre contrat déployé
   ↓
4. Chercher "Constructor Arguments" ou "Encoded Data"
   ↓
5. Copier la valeur (commence par 0x...)
```

#### Option B : Encoder Manuellement

```
1. Aller sur : https://abi.hashex.org/
   ↓
2. Sélectionner "Encode"
   ↓
3. Entrer le Constructor ABI :

{
  "inputs": [
    {"name": "name", "type": "string"},
    {"name": "symbol", "type": "string"},
    {"name": "initialOwner", "type": "address"}
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
}

   ↓
4. Entrer les valeurs (EXACTEMENT comme lors du déploiement) :

name: "CyLimit V2 Testnet"
symbol: "CYLMT-TEST"
initialOwner: 0x214FB13515453265713E408D59f1819474F1f873

   ↓
5. Cliquer "Encode"
   ↓
6. Copier le résultat (0x00000000...)
   ↓
7. Coller dans Basescan
```

#### Option C : Laisser Vide (Essayer D'abord)

```
⚠️ Parfois Basescan peut détecter automatiquement

1. Laisser le champ vide
2. Cliquer "Verify and Publish"
3. Si erreur "Constructor arguments required"
   → Utiliser Option A ou B
```

### Étape 7 : Vérifier

```
1. Cliquer "Verify and Publish"
   ↓
2. ⏳ Attendre 10-30 secondes...
   ↓
3. Résultat :

✅ SUCCÈS :
┌─────────────────────────────────────────┐
│  ✅ Contract Source Code Verified       │
│     Successfully!                       │
│                                         │
│  View Contract:                         │
│  https://sepolia.basescan.org/...       │
└─────────────────────────────────────────┘

❌ ÉCHEC :
┌─────────────────────────────────────────┐
│  ❌ Verification Failed                 │
│                                         │
│  Error: Compiler version mismatch       │
│  or Constructor arguments incorrect     │
│                                         │
│  [Try Again]                            │
└─────────────────────────────────────────┘
```

---

## 🔍 VÉRIFIER QUE ÇA A FONCTIONNÉ

### Sur Basescan - Onglet "Contract"

```
✅ SI VÉRIFIÉ :

┌──────────────────────────────────────────────────┐
│  ✅ Contract Source Code Verified (Exact Match)  │
│                                                  │
│  Contract Name: CyLimitNFT_v2                    │
│  Compiler: v0.8.20+commit.a1b79de6               │
│  Optimization: Yes with 200 runs                 │
│  License: MIT                                    │
│                                                  │
│  [Code] [Read Contract] [Write Contract]         │
└──────────────────────────────────────────────────┘

❌ SI PAS VÉRIFIÉ :

┌──────────────────────────────────────────────────┐
│  Contract Source Code Not Verified               │
│                                                  │
│  This contract has not been verified.            │
│  [Verify and Publish]                            │
└──────────────────────────────────────────────────┘
```

---

### Tester "Read Contract" (Vérifications)

**Cliquer "Read Contract" :**

```
1. owner()
   ↓
   [Query] → Résultat : 0x214FB13515453265713E408D59f1819474F1f873
   ✅ Doit être Master Wallet

2. totalSupply()
   ↓
   [Query] → Résultat : 0
   ✅ Normal (aucun NFT minté encore)

3. isWhitelisted(address)
   ↓
   Entrer : 0x214FB13515453265713E408D59f1819474F1f873
   [Query] → Résultat : true ✅
   ✅ Master Wallet whitelisté (auto dans constructor)

4. isWhitelisted(address)
   ↓
   Entrer : 0x38d20a95a930F5187507D9F597bc0a37712E82eb
   [Query] → Résultat : false (avant whitelist) ou true (après)
   ⚠️ Doit être true APRÈS avoir whitelisté le Marketplace

5. royaltyInfo(tokenId, salePrice)
   ↓
   tokenId : 0
   salePrice : 1000000 (1 USDC avec 6 decimals)
   [Query] → Résultat :
   - receiver : 0x214FB13515453265713E408D59f1819474F1f873
   - royaltyAmount : 100000 (10% de 1 USDC)
   ✅ Royalties 10% configurées
```

---

### Tester "Write Contract" (Whitelist Marketplace)

**Cliquer "Write Contract" :**

```
1. Cliquer "Connect to Web3"
   ↓
2. Connecter MetaMask
   ⚠️ IMPORTANT : Utiliser le compte Master Wallet
   → 0x214FB13515453265713E408D59f1819474F1f873
   ↓
3. ✅ "Connected: 0x214FB..."

4. Trouver fonction : "setTransferWhitelist"
   ↓
5. Remplir :
   account : 0x38d20a95a930F5187507D9F597bc0a37712E82eb
   status : true
   ↓
6. Cliquer "Write"
   ↓
7. MetaMask popup → Signer la transaction
   ↓
8. ⏳ Attendre confirmation (10-30 sec)
   ↓
9. ✅ Transaction confirmée !

10. VÉRIFIER : Retourner dans "Read Contract"
    → isWhitelisted(0x38d20...)
    → Résultat : true ✅
```

---

## 🚨 TROUBLESHOOTING

### Problème 1 : "Verification Failed - Compiler Version Mismatch"

**Cause :** Version compilateur incorrecte

**Solution :**
```
1. Dans Remix → Solidity Compiler
   ↓
2. Regarder exactement la version utilisée :
   "Compiler: 0.8.20+commit.a1b79de6"
   ↓
3. Dans Basescan, sélectionner EXACTEMENT cette version
   (avec le "+commit.a1b79de6")
```

### Problème 2 : "Verification Failed - Bytecode Mismatch"

**Cause :** Optimizer settings différents

**Solution :**
```
Dans Remix → Solidity Compiler → Advanced Configurations
→ Vérifier :
  - Optimization : Enabled
  - Runs : 200
  - EVM Version : default (paris)

Dans Basescan :
→ Utiliser EXACTEMENT les mêmes settings
```

### Problème 3 : "Constructor Arguments Required"

**Cause :** Constructor arguments manquants

**Solution :**
```
1. Utiliser https://abi.hashex.org/
2. Encoder les arguments
3. Coller dans Basescan

OU

1. Dans Remix, après déploiement
2. Deployed Contracts → Votre contrat
3. Copier "Encoded Constructor Arguments"
```

### Problème 4 : "Already Verified"

**Ce n'est PAS une erreur !**
```
✅ Le contrat est déjà vérifié
→ Vérifier sur Basescan directement
→ Onglet "Contract" doit montrer "✅ Verified"
```

### Problème 5 : Plugin Remix Ne S'affiche Pas

**Solutions :**
```
1. Rafraîchir Remix (F5)
2. Désactiver puis réactiver le plugin
3. Vider cache navigateur
4. Essayer Basescan UI manuelle (Méthode 2)
```

---

## 📊 CHECKLIST POST-VÉRIFICATION

### Basescan

- [ ] ✅ Aller sur sepolia.basescan.org/address/[ADRESSE]
- [ ] ✅ Onglet "Contract" visible
- [ ] ✅ Message "Contract Source Code Verified"
- [ ] ✅ Code Solidity lisible
- [ ] ✅ Constructor Arguments décodés visibles

### Read Contract

- [ ] ✅ owner() retourne Master Wallet (0x214FB...)
- [ ] ✅ totalSupply() retourne 0
- [ ] ✅ isWhitelisted(MasterWallet) = true
- [ ] ✅ isWhitelisted(Marketplace) = false (avant) → true (après whitelist)
- [ ] ✅ royaltyInfo(0, 1000000) = (0x214FB..., 100000) [10%]

### Write Contract

- [ ] ✅ "Connect to Web3" fonctionne
- [ ] ✅ Connecté avec Master Wallet
- [ ] ✅ setTransferWhitelist visible et fonctionnelle
- [ ] ✅ Whitelist Marketplace réussie
- [ ] ✅ isWhitelisted(Marketplace) maintenant = true

---

## 💡 ASTUCES

### Astuce 1 : Flatten dans Remix

```
Si imports OpenZeppelin causent problèmes :

1. Right-click sur CyLimitNFT_v2_FIXED.sol
   ↓
2. "Flatten"
   ↓
3. Un nouveau fichier apparaît : 
   "CyLimitNFT_v2_FIXED_flat.sol"
   ↓
4. Ce fichier contient TOUT (imports inclus)
   ↓
5. Copier ce fichier pour Basescan
```

### Astuce 2 : Sauvegarder les Infos

```
Après vérification réussie, sauvegarder dans .env :

# cylimit-admin-backend/.env
TESTNET_NFT_V2_CONTRACT_ADDRESS=0x012ab34A520638C0aA876252161c6039343741A4
TESTNET_NFT_BASESCAN=https://sepolia.basescan.org/address/0x012ab34A520638C0aA876252161c6039343741A4
TESTNET_NFT_VERIFIED=true
TESTNET_NFT_VERIFIED_AT=2025-11-05T02:45:00Z
```

### Astuce 3 : Vérifier en Parallèle du Déploiement

```
Pendant que Remix déploie (attente confirmation) :

1. Ouvrir nouvel onglet Basescan
2. Activer plugin verification Remix
3. Obtenir API key
4. Configurer settings

→ Prêt à vérifier dès que déploiement confirmé !
```

---

## 🎯 GUIDE VISUEL COMPLET

### Timeline Complète (50 minutes)

```
┌─────────────────────────────────────────────────────┐
│  DÉPLOIEMENT + VÉRIFICATION + WHITELIST COMPLET     │
└─────────────────────────────────────────────────────┘

⏱️  0:00 - Ouvrir Remix
        → https://remix.ethereum.org

⏱️  0:02 - Créer fichier CyLimitNFT_v2_FIXED.sol
        → Copier code depuis cylimit-admin-backend/contracts/

⏱️  0:05 - Compiler
        → Solidity 0.8.20
        → Optimizer: Yes (200 runs)
        → ✅ No errors

⏱️  0:07 - Activer Plugin Verification (pendant compilation)
        → Plugin Manager → "Contract Verification"
        → Settings → Base Sepolia + API Key

⏱️  0:10 - Déployer
        → Deploy & Run → Injected Provider
        → Constructor params (name, symbol, owner)
        → Deploy → Signer TX MetaMask

⏱️  0:15 - ✅ DÉPLOYÉ !
        → Copier adresse : 0x...
        → ⚠️ NE PAS FERMER REMIX !

⏱️  0:16 - IMMÉDIATEMENT : Vérifier
        → Plugin Verification → Verify tab
        → Sélectionner contrat
        → Verify Contract
        → ⏳ 10-30 secondes...

⏱️  0:17 - ✅ VÉRIFIÉ !
        → "Successfully verified"
        → Ouvrir Basescan
        → Confirmer "✅ Verified"

⏱️  0:20 - Whitelist Marketplace
        → Basescan → Write Contract
        → Connect to Web3 (Master Wallet)
        → setTransferWhitelist(Marketplace, true)
        → Signer TX

⏱️  0:25 - Vérifier Whitelist
        → Basescan → Read Contract
        → isWhitelisted(Marketplace) → true ✅

⏱️  0:30 - Mettre à jour .env
        → 3 repos (admin, backend, frontend)
        → TESTNET_NFT_V2_CONTRACT_ADDRESS=0x...

⏱️  0:40 - Tester Mint (optionnel)
        → Basescan → Write Contract
        → mint(MasterWallet, "ipfs://test")
        → Vérifier : totalSupply() = 1

⏱️  0:50 - ✅ TERMINÉ !
        → Contrat déployé ✅
        → Contrat vérifié ✅
        → Marketplace whitelisté ✅
        → Prêt pour tests !
```

---

## 📞 LIENS UTILES

### Basescan

- **Testnet :** https://sepolia.basescan.org
- **Mainnet :** https://basescan.org
- **API Keys :** https://basescan.org/myapikey
- **Docs :** https://docs.basescan.org/

### Outils

- **Remix IDE :** https://remix.ethereum.org
- **ABI Encoder :** https://abi.hashex.org/
- **Base Faucet :** https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### Documentation

- **Verification Remix :** https://docs.etherscan.io/contract-verification/verify-with-remix
- **Verification API :** https://docs.etherscan.io/tutorials/verifying-contracts-programmatically

---

## ✅ RÉSUMÉ

| Étape | Durée | Critique ? |
|-------|-------|------------|
| **1. Compiler** | 3 min | ⚠️ Oui |
| **2. Déployer** | 5 min | ⚠️ Oui |
| **3. Vérifier** | 2 min | 🔴 CRITIQUE |
| **4. Whitelist** | 3 min | 🔴 CRITIQUE |
| **5. Tester** | 5 min | ✅ Recommandé |

**Total : 18 minutes**

**La vérification (étape 3) est la plus importante !**

Sans elle :
- ❌ Code source invisible
- ❌ Pas d'interaction via Basescan
- ❌ Moins de confiance users
- ❌ Debugging difficile

---

**Prêt à déployer ? Suivez ce guide étape par étape !** 🚀

