# 🔄 Migration Wallets - Guide Complet

**Date :** 10 Octobre 2025  
**Statut :** ✅ Solution validée

---

## 🎯 PROBLÈME

**Users existants ont :**
- ✅ `walletAddress` en DB (ancien système Web3/MetaMask)
- ❌ Pas d'Embedded Wallet Coinbase
- ⚠️ Risque de perdre accès à leurs fonds

---

## ✅ SOLUTION RECOMMANDÉE

### **Migration Hybride avec Master Wallet existant**

```
┌─────────────────────────────────────────────────────┐
│          WORKFLOW MIGRATION SIMPLIFIÉ               │
└─────────────────────────────────────────────────────┘

PHASE 1 : User transfère → Master Wallet
─────────────────────────────────────────
1. User login
2. Modal détecte ancien wallet + fonds
3. User connecte MetaMask
4. User signe transferts → Master Wallet
5. ✅ Fonds sécurisés

PHASE 2 : Backend transfère → Embedded Wallet
──────────────────────────────────────────────
1. User crée Embedded Wallet (Coinbase SDK)
2. Backend détecte migration pending
3. Backend transfère automatiquement
4. ✅ Migration complétée !
```

---

## 💰 COÛT

**~$0.12 par user** (gas fees Polygon uniquement)

| Users | Coût total |
|-------|------------|
| 1,000 | ~$120 |
| 5,000 | ~$600 |
| 10,000 | ~$1,200 |

---

## 📚 DOCUMENTATION

| Document | Description |
|----------|-------------|
| **MIGRATION-SIMPLIFIEE-MASTER-WALLET.md** | ✅ Implémentation détaillée (RECOMMANDÉ) |
| **WORKFLOW-MIGRATION-VISUEL.md** | Diagrammes de flux complets |
| **COMPARAISON-SOLUTIONS-MIGRATION.md** | Comparaison toutes solutions |
| **MIGRATION-WALLETS-EXISTANTS.md** | Vue d'ensemble + contexte |

---

## 🚀 QUICK START

### 1. Backend

```typescript
// CoinbaseWalletService : Ajouter méthodes
async transferFromMasterWallet(toAddress, amount, assetId)
async transferNFTFromMasterWallet(toAddress, nftAddress, tokenId)
```

### 2. Frontend

```typescript
// MigrationModal.tsx : Nouveau composant
<MigrationModal 
  oldWallet={user.walletAddress}
  usdcBalance={usdcBalance}
  nfts={nfts}
  onComplete={handleMigrationComplete}
/>
```

### 3. User Schema

```typescript
@Prop({ type: Boolean, default: false })
pendingMigration: boolean;

@Prop({ type: Number, default: 0 })
pendingUSDC: number;

@Prop({ type: [String], default: [] })
pendingNFTTokenIds: string[];
```

---

## ✅ AVANTAGES

- ✅ Sécurisé (pas de privateKeys stockées)
- ✅ Semi-automatique (user signe 1 fois)
- ✅ Coût très faible
- ✅ 1 seul Server Wallet (Master)
- ✅ Code simple
- ✅ NFTs non impactés

---

## ⚠️ LIMITATIONS

### ❌ Impossible de créer Embedded Wallet sans le user

**Raisons :**
- Email OTP requis
- Clé privée générée côté client (MPC)
- Wallet non-custodial

**Solution :** User doit créer lui-même (Phase 2)

---

## 🎉 RÉSUMÉ

**Question :** Peut-on migrer automatiquement les fonds ?

**Réponse :** Oui, mais en 2 phases :
1. User transfère → Master Wallet (manuel)
2. Backend transfère → Embedded Wallet (automatique)

**Coût :** ~$0.12/user (gas fees uniquement)

**Implémentation :** Voir `MIGRATION-SIMPLIFIEE-MASTER-WALLET.md`

🚀 **Prêt pour l'implémentation !**
