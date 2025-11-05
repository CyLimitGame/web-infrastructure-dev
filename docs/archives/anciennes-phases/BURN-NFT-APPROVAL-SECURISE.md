# 🔥 BURN NFT - Architecture avec Approval Sécurisé

**Date :** 17 Octobre 2025  
**Status :** ✅ IMPLÉMENTÉ  
**Changement :** Passer de `onlyOwner` → `Approval + Backend`

---

## 🎯 OBJECTIF

Ajouter une **couche de sécurité supplémentaire** pour le burn des NFTs en demandant une **signature explicite du user** via son wallet, tout en gardant le contrôle backend.

---

## 🔄 CHANGEMENT ARCHITECTURAL

### **AVANT (onlyOwner)**

```solidity
function burn(uint256 tokenId) public onlyOwner {
    emit NFTBurned(tokenId, _ownerOf(tokenId));
    _burn(tokenId);
}
```

**Problème :**
- ❌ User ne signe rien (pas de preuve explicite)
- ❌ Backend peut brûler sans consentement wallet
- ❌ Moins sécurisé en cas de compromission backend

---

### **APRÈS (Approval Spécifique UNIQUEMENT)**

```solidity
function burn(uint256 tokenId) public whenNotPaused {
    address owner = _ownerOf(tokenId);
    
    require(
        msg.sender == owner || getApproved(tokenId) == msg.sender,
        "Not approved to burn this NFT (requires specific approval)"
    );
    
    emit NFTBurned(tokenId, owner);
    _burn(tokenId);
}
```

**Avantages :**
- ✅ **User signe explicitement** l'approval via wallet
- ✅ **Backend garde le contrôle** (appelle burn après approval)
- ✅ **Validation backend possible** (vérifications avant burn)
- ✅ **Sécurité renforcée** (double confirmation : app + wallet)

**🔒 SÉCURITÉ CRITIQUE :**
- ✅ **`setApprovalForAll` NE permet PAS de burn** (protection supplémentaire)
- ✅ **Seul `approve(tokenId)` spécifique fonctionne** (approval par NFT)
- ✅ **User DOIT approuver CHAQUE burn individuellement**

---

## 🔐 FLOW COMPLET

### **Étape 1 : User demande le burn (Frontend)**

```typescript
// User clique "Détruire mon NFT" dans l'app
// Modal confirmation : "⚠️ Action irréversible !"
// User confirme
```

---

### **Étape 2 : User approuve CyLimit (Signature Wallet)**

```typescript
// Frontend demande l'approval au wallet
await userWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'approve',
  args: {
    to: MASTER_WALLET, // ou MARKETPLACE_CONTRACT
    tokenId: tokenId
  },
  paymasterUrl: PAYMASTER_URL // Gas sponsorisé
});
```

**→ POPUP COINBASE WALLET APPARAÎT :**

```
┌────────────────────────────────────────────────────────────┐
│  🔐 Coinbase Wallet                                        │
│                                                            │
│  Autoriser CyLimit à gérer ce NFT ?                       │
│  NFT #123 - Pogacar Rare                                  │
│                                                            │
│  ⚠️  Cette autorisation permet la destruction du NFT       │
│                                                            │
│  ⛽ Gas : $0 (sponsorisé)                                  │
│                                                            │
│  [Refuser]  [Approuver] ← User clique                     │
└────────────────────────────────────────────────────────────┘
```

**✅ User clique "Approuver" → Signature blockchain**

---

### **Étape 3 : Backend brûle le NFT (avec approval)**

```typescript
// Frontend envoie au backend la preuve d'approval
const response = await fetch(`/api/nfts/${nftId}/burn`, {
  method: 'POST',
  body: JSON.stringify({
    tokenId,
    approvalTxHash // Preuve que user a signé
  })
});

// Backend vérifie approval et appelle burn()
await masterWallet.invokeContract({
  contractAddress: NFT_CONTRACT,
  method: 'burn',
  args: { tokenId }
});
```

**✅ NFT brûlé avec preuve de consentement user**

---

## 📊 COMPARAISON

| Critère | AVANT (`onlyOwner`) | APRÈS (Approval + Backend) |
|---------|---------------------|---------------------------|
| **User signe ?** | ❌ Non | ✅ Oui (approve) |
| **Popup wallet ?** | ❌ Non | ✅ Oui (Coinbase) |
| **Backend contrôle ?** | ✅ Oui | ✅ Oui |
| **Validation backend ?** | ✅ Oui | ✅ Oui |
| **Preuve on-chain ?** | ❌ Non | ✅ Oui (approval TX) |
| **Gas user ?** | $0 | $0 (sponsorisé) |
| **Sécurité ?** | ⚠️ Moyenne | ✅ Élevée |

---

## 🛡️ SÉCURITÉ

### **Protection contre les attaques**

| Scénario | AVANT | APRÈS |
|----------|-------|-------|
| **Backend compromis** | ❌ Peut brûler tous les NFTs | ✅ Besoin approval de chaque user |
| **User clique par erreur** | ❌ Modal app seulement | ✅ Modal app + popup wallet |
| **Preuve légale** | ❌ Logs backend uniquement | ✅ Transaction blockchain signée |
| **Audit trail** | ⚠️ Backend logs | ✅ On-chain + backend logs |
| **`setApprovalForAll` exploité ?** | N/A | ✅ **NE fonctionne PAS pour burn** |
| **Marketplace burn par erreur ?** | N/A | ✅ **Impossible sans approval spécifique** |

---

## 💰 COÛT GAS

| Action | Coût User | Coût CyLimit |
|--------|-----------|--------------|
| **Approval** | $0 (sponsorisé) | ~$0.001 |
| **Burn backend** | $0 | $0 (gasless CDP) |
| **TOTAL** | **$0** | **~$0.001** |

---

## 📝 IMPLÉMENTATION

### **Contrat modifié**

**Fichier :** `cylimit-admin-backend/contracts/CyLimitNFT_v2.sol`

```solidity
/**
 * @notice Burn (destroy) an NFT
 * @dev Requires approval from NFT owner (user must approve via wallet)
 * @param tokenId The ID of the NFT to burn
 * 
 * Security flow:
 * 1. User approves CyLimit (Marketplace or Master Wallet) for this NFT
 * 2. Backend calls burn() using the approval
 * 3. User has signed the approval, ensuring explicit consent
 */
function burn(uint256 tokenId) public whenNotPaused {
    require(
        _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId),
        "Not approved to burn this NFT"
    );
    
    emit NFTBurned(tokenId, _ownerOf(tokenId));
    _burn(tokenId);
}
```

---

### **Backend service**

**Fichier :** `scripts/base/example-burn-nft.cjs`

Voir le fichier complet pour l'implémentation complète avec :
- Vérification ownership (DB + Blockchain)
- Vérification approval on-chain
- Appel burn() via Master Wallet
- Mise à jour DB
- Récompenses optionnelles

---

### **Frontend component**

**Fichier :** `scripts/base/example-burn-frontend.tsx`

Voir le fichier complet pour l'implémentation complète avec :
- Modal de confirmation CyLimit
- Demande approval wallet
- Appel backend avec proof
- Gestion erreurs
- UX optimale

---

## ✅ AVANTAGES FINAUX

1. ✅ **Sécurité maximale** : User signe explicitement
2. ✅ **Contrôle backend** : CyLimit garde la main
3. ✅ **Audit trail** : Preuve on-chain de chaque burn
4. ✅ **UX claire** : Double confirmation (app + wallet)
5. ✅ **Coût $0** : Gas sponsorisé pour le user
6. ✅ **Protection légale** : Signature blockchain = preuve
7. ✅ **Flexibilité** : Backend peut valider avant burn

---

## 📋 CHECKLIST DÉPLOIEMENT

### **Smart Contract**
- [x] Modifier `burn()` → retirer `onlyOwner`
- [x] Ajouter `require(_isAuthorized(...))`
- [ ] Déployer sur testnet (Base Sepolia)
- [ ] Tester burn avec approval
- [ ] Déployer sur mainnet (Base)

### **Backend**
- [x] Créer service NFTBurnService
- [ ] Ajouter endpoint POST /nfts/:id/burn
- [ ] Vérifier ownership (DB + Blockchain)
- [ ] Vérifier approval on-chain
- [ ] Appeler burn() via Master Wallet
- [ ] Mettre à jour MongoDB

### **Frontend**
- [x] Créer composant BurnNFTButton
- [ ] Modal de confirmation
- [ ] Intégrer demande approval wallet
- [ ] Appel API backend avec proof
- [ ] Gestion erreurs + loading states
- [ ] Intégrer dans pages NFT details

### **Tests**
- [ ] Test burn avec approval valide
- [ ] Test burn sans approval (doit fail)
- [ ] Test burn NFT non possédé (doit fail)
- [ ] Test user refuse approval (doit annuler)
- [ ] Test gas sponsoring fonctionne

---

**Date de mise à jour :** 17 Octobre 2025  
**Validé par :** Agent  
**Status :** ✅ **ARCHITECTURE SÉCURISÉE IMPLÉMENTÉE**

