# 📚 Documentation Wallets CyLimit V2

**Date :** 7 octobre 2025  
**Architecture :** Hybride (Embedded Wallets + Server Wallets)

---

## 🎯 Documentation Principale

### 1. **PLAN-IMPLEMENTATION-COMPLET.md** ⭐ START HERE
Le guide complet d'implémentation étape par étape avec :
- Architecture globale
- 4 flows utilisateur détaillés
- Code backend complet (TypeScript)
- Code frontend complet (React)
- Checklist en 6 phases

👉 **Commence ici pour implémenter le système complet**

---

### 2. Notes Techniques Détaillées

#### **NOTE-EMBEDDED-WALLETS-COMPLET.md**
Tout sur les Embedded Wallets Coinbase pour les users :
- Installation et configuration
- Auth email/OTP
- Widget Onramp intégré
- Smart Accounts
- Hooks et composants React

#### **NOTE-SERVER-WALLETS-COMPLET.md**
Tout sur les Server Wallets pour CyLimit (Master, Rewards) :
- Configuration backend
- Sécurité (TEE, MPC)
- Smart Accounts
- Gas sponsorship
- Batch transactions

#### **NOTE-ONRAMP-OFFRAMP-COMPLET.md**
Tout sur Coinbase Onramp & Offramp :
- Widget intégré vs API
- Session tokens
- Sécurité
- Webhooks
- Stripe alternative

#### **NOTE-API-REST-COMPLETE.md**
Référence complète de l'API Coinbase CDP :
- Authentication (JWT)
- Addresses, Balances, Transactions
- Wallets, Transfers, Trades
- Webhooks
- Onramp/Offramp APIs

---

### 3. Autres Documents

#### **NETTOYAGE-COMPLET.md**
Historique du nettoyage du 7 octobre 2025 :
- Fichiers supprimés (31 fichiers)
- Fichiers restaurés
- Raison du nettoyage (Server Wallets vs Embedded Wallets)

#### **SYSTEME-WALLETS-COMPLET.md**
Vue d'ensemble détaillée de l'architecture hybride

#### **GUIDE-DEPLOIEMENT.md**
Guide de déploiement en production

---

## 🏗️ Architecture Choisie

```
┌─────────────────────────────────────────┐
│        USERS (Embedded Wallets)         │
│  ✅ Email + OTP (pas de seed phrase)   │
│  ✅ Widget Onramp intégré               │
│  ✅ Smart Accounts (ERC-4337)           │
│  ✅ Multi-device (5 appareils)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      CYLIMIT (Server Wallets)           │
│  ✅ Master Wallet (fees)                │
│  ✅ Rewards Wallet (rewards auto)       │
│  ✅ Paymaster (gas sponsorship)         │
└─────────────────────────────────────────┘
```

---

## 💳 Méthodes de Dépôt

1. **Coinbase Onramp** (CB, virement SEPA) - Widget intégré ⭐
2. **Crypto deposit** (QR Code, depuis autre wallet)
3. **Stripe** (CB classique, EUR → USDC)

---

## ✅ Prochaines Étapes

Suivre le **PLAN-IMPLEMENTATION-COMPLET.md** :

### Phase 1 : Backend Setup (1-2h)
- Créer CDP Portal
- Installer SDK
- Créer Server Wallets CyLimit

### Phase 2 : Frontend Setup (1-2h)
- Installer packages
- Configurer Provider
- Tester auth email/OTP

### Phase 3 : Intégrations (2-3h)
- Widget Onramp
- QR Code deposit
- Stripe Elements

### Phase 4 : Marketplace (3-4h)
- Batch transactions
- Gas sponsorship
- Modal fonds insuffisants

### Phase 5 : Rewards (1h)
- Paiements automatiques

### Phase 6 : Production (1h)
- Full access Coinbase
- Migration Mainnet

**Total estimé : 9-13 heures de développement**

---

## 🔗 Liens Utiles

- [Coinbase Developer Platform](https://portal.cdp.coinbase.com)
- [Embedded Wallets Docs](https://docs.cdp.coinbase.com/embedded-wallets)
- [Server Wallets Docs](https://docs.cdp.coinbase.com/server-wallets/v2)
- [Onramp Docs](https://docs.cdp.coinbase.com/onramp-offramp)

---

**📝 Créé par :** Claude (Assistant IA)  
**📅 Date :** 7 octobre 2025  
**✅ Base propre - Prêt pour implémentation !**
