# 📊 Diagrammes & Flux Frontend

Ce document contient des diagrammes visuels pour comprendre rapidement l'architecture et les flux du nouveau système.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Header     │  │  Marketplace │  │   Profile    │         │
│  │              │  │     Page     │  │     Page     │         │
│  │ WalletConnect│  │  BuyNFTModal │  │ WalletBalance│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                          HOOKS LAYER                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  useWallet   │  │useMarketplace│  │   useFees    │         │
│  │              │  │              │  │              │         │
│  │ • wallet     │  │ • purchasing │  │ • fees       │         │
│  │ • balance    │  │ • listing    │  │ • loading    │         │
│  │ • loading    │  │ • error      │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                       SERVICES LAYER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              wallet.service.ts                         │    │
│  │  • createWallet()    • getBalance()                    │    │
│  │  • previewFees()     • getOnrampLink()                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            marketplace.service.ts                      │    │
│  │  • purchaseNFT()     • listNFT()                       │    │
│  │  • cancelListing()   • getActiveListings()             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ axios (HTTP/REST)
┌──────────────────────────▼───────────────────────────────────────┐
│                      BACKEND API                                 │
│                   http://localhost:3002/v1                       │
│                                                                  │
│  /wallet/*          /marketplace/*         /fees/*              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux 1 : Création de Wallet

```
┌──────┐                                                    ┌─────────┐
│ User │                                                    │ Backend │
└───┬──┘                                                    └────┬────┘
    │                                                            │
    │ 1. Clique "Créer mon wallet"                              │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
    │                    ┌──────────────┐                       │
    │                    │  useWallet   │                       │
    │                    │ createWallet()│                      │
    │                    └──────┬───────┘                       │
    │                           │                                │
    │                           │ 2. POST /wallet/create         │
    │                           │────────────────────────────────▶
    │                           │                                │
    │                           │                                │
    │                           │ 3. Crée Smart Account (Coinbase)
    │                           │                                │
    │                           │ 4. Retourne wallet info        │
    │                           │◀────────────────────────────────
    │                           │                                │
    │ 5. Affiche wallet         │                                │
    │◀──────────────────────────┘                                │
    │    (address + balance)                                     │
    │                                                            │
```

---

## 🔄 Flux 2 : Dépôt USDC via Coinbase Onramp

```
┌──────┐                                                    ┌─────────┐
│ User │                                                    │ Backend │
└───┬──┘                                                    └────┬────┘
    │                                                            │
    │ 1. Clique "Déposer"                                       │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
    │                    ┌──────────────┐                       │
    │                    │ DepositModal │                       │
    │                    │              │                       │
    │ 2. Entre montant   │              │                       │
    │───────────────────▶│              │                       │
    │                    │              │                       │
    │ 3. Clique "Déposer"│              │                       │
    │───────────────────▶│              │                       │
    │                    │              │                       │
    │                    │ 4. GET /wallet/:address/onramp       │
    │                    │──────────────────────────────────────▶
    │                    │                                       │
    │                    │ 5. Génère lien Coinbase Onramp       │
    │                    │◀──────────────────────────────────────
    │                    │                                       │
    │ 6. Ouvre popup     │                                       │
    │◀───────────────────┘                                       │
    │    Coinbase Onramp                                         │
    │                                                            │
    │ ┌─────────────────────────────────────┐                   │
    │ │   Coinbase Onramp (Popup)           │                   │
    │ │                                     │                   │
    │ │ 7. User achète USDC avec CB         │                   │
    │ │                                     │                   │
    │ │ 8. Coinbase transfère USDC          │                   │
    │ │    vers wallet user                 │                   │
    │ └─────────────────────────────────────┘                   │
    │                                                            │
    │ 9. Popup se ferme                                          │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
    │ 10. Auto-refresh balance                                   │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
```

---

## 🔄 Flux 3 : Achat de NFT (Complet)

```
┌──────┐                                                    ┌─────────┐
│ User │                                                    │ Backend │
└───┬──┘                                                    └────┬────┘
    │                                                            │
    │ 1. Clique "Acheter NFT"                                   │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
    │                    ┌──────────────┐                       │
    │                    │ BuyNFTModal  │                       │
    │                    │              │                       │
    │ 2. Affiche modal   │              │                       │
    │◀───────────────────┤              │                       │
    │                    │              │                       │
    │                    │ 3. useFees() │                       │
    │                    │──────────────────────────────────────▶
    │                    │   POST /wallet/preview-fees          │
    │                    │                                       │
    │                    │ 4. Retourne fees calculées           │
    │                    │◀──────────────────────────────────────
    │                    │                                       │
    │ 5. Affiche preview │                                       │
    │◀───────────────────┤   Prix: 100 USDC                     │
    │    fees            │   Fees: 0.05 USDC                    │
    │                    │   Total: 100.05 USDC                 │
    │                    │                                       │
    │ 6. Vérifie balance │                                       │
    │◀───────────────────┤   ✅ Balance OK                      │
    │                    │                                       │
    │ 7. Clique "Acheter"│                                       │
    │───────────────────▶│                                       │
    │                    │                                       │
    │                    │ 8. useMarketplace.purchaseNFT()      │
    │                    │──────────────────────────────────────▶
    │                    │   POST /marketplace/purchase          │
    │                    │                                       │
    │                    │ 9. Vérifie balance                    │
    │                    │                                       │
    │                    │ 10. Calcule fees                      │
    │                    │                                       │
    │                    │ 11. Transfert USDC → Vendeur         │
    │                    │     (99.95 USDC)                      │
    │                    │                                       │
    │                    │ 12. Transfert fees → Plateforme      │
    │                    │     (0.05 USDC)                       │
    │                    │                                       │
    │                    │ 13. [TODO] Transfert NFT → Acheteur  │
    │                    │                                       │
    │                    │ 14. Retourne résultat                │
    │                    │◀──────────────────────────────────────
    │                    │   { success: true, txHash: "0x..." } │
    │                    │                                       │
    │ 15. Affiche succès │                                       │
    │◀───────────────────┤   ✅ NFT acheté !                    │
    │                    │                                       │
    │ 16. Ferme modal    │                                       │
    │◀───────────────────┘                                       │
    │                                                            │
    │ 17. Refresh balance                                        │
    │────────────────────────────────────────────────────────▶  │
    │                                                            │
```

---

## 🔄 Flux 4 : Calcul des Fees (Détaillé)

```
┌──────────────┐
│   useFees    │
│              │
│ priceUSDC    │
│ paymentMethod│
│ isPremium    │
└──────┬───────┘
       │
       │ useEffect (auto-calcul)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              POST /wallet/preview-fees                   │
│                                                          │
│  Request:                                                │
│  {                                                       │
│    priceUSDC: 100,                                       │
│    paymentMethod: "usdc",                                │
│    buyerIsPremium: false,                                │
│    sellerIsPremium: false                                │
│  }                                                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│          FeeCalculatorService (Backend)                  │
│                                                          │
│  1. Récupère phase actuelle                             │
│     → Phase 1 (fees vendeur only)                       │
│                                                          │
│  2. Calcule fees vendeur                                │
│     → max(0.05 USDC, 100 × 0.05%) = 0.05 USDC          │
│                                                          │
│  3. Calcule fees acheteur                               │
│     → 0 USDC (Phase 1)                                  │
│                                                          │
│  4. Calcule fees externes                               │
│     → Stripe: 0 (paymentMethod = usdc)                  │
│     → Coinbase: 0                                        │
│                                                          │
│  5. Calcule totaux                                       │
│     → totalToSeller = 100 - 0.05 = 99.95 USDC          │
│     → totalFromBuyer = 100 + 0 = 100 USDC              │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Response:                                               │
│  {                                                       │
│    sellerFee: 0.05,                                      │
│    buyerFee: 0,                                          │
│    stripeFee: 0,                                         │
│    coinbaseFee: 0,                                       │
│    totalToSeller: 99.95,                                 │
│    totalFromBuyer: 100,                                  │
│    phase: 1                                              │
│  }                                                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  FeePreview  │
│              │
│ Prix: 100    │
│ Fees: 0.05   │
│ Total: 100   │
└──────────────┘
```

---

## 📊 Diagramme d'État : useWallet

```
┌─────────────────────────────────────────────────────────────┐
│                      useWallet State                         │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   INITIAL    │
                    │              │
                    │ wallet: null │
                    │ balance: null│
                    │ loading: false│
                    └──────┬───────┘
                           │
                           │ createWallet()
                           │
                           ▼
                    ┌──────────────┐
                    │   LOADING    │
                    │              │
                    │ wallet: null │
                    │ balance: null│
                    │ loading: true│
                    └──────┬───────┘
                           │
                           │ API success
                           │
                           ▼
                    ┌──────────────┐
                    │   LOADED     │
                    │              │
                    │ wallet: {...}│
                    │ balance: null│
                    │ loading: false│
                    └──────┬───────┘
                           │
                           │ refreshBalance()
                           │
                           ▼
                    ┌──────────────┐
                    │   COMPLETE   │
                    │              │
                    │ wallet: {...}│
                    │ balance: {...}│
                    │ loading: false│
                    └──────┬───────┘
                           │
                           │ Auto-refresh (30s)
                           │
                           └────────────────┐
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ REFRESHING   │
                                    │              │
                                    │ wallet: {...}│
                                    │ balance: {...}│
                                    │ loading: false│
                                    └──────────────┘
```

---

## 📊 Diagramme de Composants : Page Marketplace

```
┌─────────────────────────────────────────────────────────────────┐
│                      MarketplacePage                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                      Header                             │    │
│  │                                                         │    │
│  │  ┌──────────────┐                  ┌──────────────┐   │    │
│  │  │    Logo      │                  │WalletConnect │   │    │
│  │  └──────────────┘                  └──────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    Filters Bar                          │    │
│  │  [Prix] [Rareté] [Catégorie] [Recherche]              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    NFT Grid                             │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │ NFTCard  │  │ NFTCard  │  │ NFTCard  │            │    │
│  │  │          │  │          │  │          │            │    │
│  │  │ [Image]  │  │ [Image]  │  │ [Image]  │            │    │
│  │  │ Name     │  │ Name     │  │ Name     │            │    │
│  │  │ 100 USDC │  │ 50 USDC  │  │ 200 USDC │            │    │
│  │  │ [Acheter]│  │ [Acheter]│  │ [Acheter]│            │    │
│  │  └──────────┘  └──────────┘  └──────────┘            │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  BuyNFTModal (si ouvert)                │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐ │    │
│  │  │ Acheter ce NFT                                   │ │    │
│  │  │                                                  │ │    │
│  │  │ [Image NFT]                                      │ │    │
│  │  │                                                  │ │    │
│  │  │ Méthode: [USDC ▼]                               │ │    │
│  │  │                                                  │ │    │
│  │  │ ┌────────────────────────────────────────────┐ │ │    │
│  │  │ │         FeePreview                         │ │ │    │
│  │  │ │ Prix:  100 USDC                            │ │ │    │
│  │  │ │ Fees:  0.05 USDC                           │ │ │    │
│  │  │ │ Total: 100.05 USDC                         │ │ │    │
│  │  │ └────────────────────────────────────────────┘ │ │    │
│  │  │                                                  │ │    │
│  │  │ [Annuler]  [Acheter]                            │ │    │
│  │  └──────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Diagramme de Styles : Thème

```
┌─────────────────────────────────────────────────────────────────┐
│                        Design System                             │
└─────────────────────────────────────────────────────────────────┘

Colors:
  Primary:   #3b82f6  (Blue)
  Success:   #10b981  (Green)
  Error:     #ef4444  (Red)
  Warning:   #f59e0b  (Orange)
  Gray-100:  #f3f4f6
  Gray-900:  #111827

Typography:
  Headings:  font-family: 'Inter', sans-serif
  Body:      font-family: 'Inter', sans-serif
  Mono:      font-family: 'Fira Code', monospace

Spacing:
  xs:  0.25rem  (4px)
  sm:  0.5rem   (8px)
  md:  1rem     (16px)
  lg:  1.5rem   (24px)
  xl:  2rem     (32px)

Border Radius:
  sm:  4px
  md:  8px
  lg:  12px
  xl:  16px

Shadows:
  sm:  0 1px 2px rgba(0,0,0,0.05)
  md:  0 4px 6px rgba(0,0,0,0.1)
  lg:  0 10px 15px rgba(0,0,0,0.1)
```

---

Ces diagrammes devraient t'aider à visualiser l'architecture et les flux du système ! 🚀
