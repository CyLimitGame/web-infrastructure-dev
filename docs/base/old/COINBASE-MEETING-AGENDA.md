# 🎯 AGENDA RÉUNION COINBASE BUSINESS DEVELOPER
# 🎯 COINBASE BUSINESS DEVELOPER MEETING AGENDA

**Date :** 17 Octobre 2025  
**Date:** October 17, 2025

**Projet :** CyLimit - Migration Polygon → Base  
**Project:** CyLimit - Polygon → Base Migration

---

## 1️⃣ VALIDATION ARCHITECTURE (5-10 min)
## 1️⃣ ARCHITECTURE VALIDATION (5-10 min)

### À présenter :
### To Present:

- Migration Polygon → Base (réduction gas ~93%)
- Polygon → Base migration (~93% gas reduction)

- Architecture : Master Server Wallet (CDP v2) + Embedded Wallets users
- Architecture: Master Server Wallet (CDP v2) + User Embedded Wallets

- Smart contracts ultra-simples (escrow générique USDC + NFT whitelist)
- Ultra-simple smart contracts (generic USDC escrow + NFT whitelist)

- Gas sponsorship via Paymaster
- Gas sponsorship via Paymaster

- 31,450 NFTs à minter (batch de 100)
- 31,450 NFTs to mint (batches of 100)

### Questions :
### Questions:

✅ **"Notre architecture CDP v2 avec Master Server Wallet + Embedded Wallets vous semble-t-elle optimale ?"**  
✅ **"Does our CDP v2 architecture with Master Server Wallet + Embedded Wallets seem optimal to you?"**

✅ **"Y a-t-il des best practices Coinbase qu'on devrait suivre ?"**  
✅ **"Are there any Coinbase best practices we should follow?"**

✅ **"Des retours d'autres projets similaires (NFT + marketplace sur Base) ?"**  
✅ **"Any feedback from similar projects (NFT + marketplace on Base)?"**

---

## 2️⃣ GAS SPONSORSHIP & PAYMASTER (10 min)
## 2️⃣ GAS SPONSORSHIP & PAYMASTER (10 min)

### Notre besoin :
### Our Need:

- Sponsoriser ~1000 transactions/mois users
- Sponsor ~1000 user transactions/month

- Opérations : listings, achats, swaps, offers, escrow USDC
- Operations: listings, purchases, swaps, offers, USDC escrow

- Budget estimé : $3-5/mois
- Estimated budget: $3-5/month

### Questions critiques :
### Critical Questions:

🔥 **"Quelles sont les limites du Paymaster (global + per-user) ?"**  
🔥 **"What are the Paymaster limits (global + per-user)?"**

🔥 **"Comment configurer l'allowlist des fonctions sponsorisées ?"**  
🔥 **"How to configure the allowlist for sponsored functions?"**

🔥 **"Y a-t-il des quotas cachés ou restrictions dont on devrait être conscient ?"**  
🔥 **"Are there any hidden quotas or restrictions we should be aware of?"**

🔥 **"Peut-on avoir un budget dédié ou plan entreprise pour scaling futur ?"**  
🔥 **"Can we get a dedicated budget or enterprise plan for future scaling?"**

💡 **"Des dashboards pour monitorer la consommation gas en temps réel ?"**  
💡 **"Any dashboards to monitor gas consumption in real-time?"**

---

## 3️⃣ EMBEDDED WALLETS & ONBOARDING (5 min)
## 3️⃣ EMBEDDED WALLETS & ONBOARDING (5 min)

### Notre flow :
### Our Flow:

- User login → Auto-création Embedded Wallet
- User login → Auto-create Embedded Wallet

- Migration auto : USDC + NFTs depuis Polygon
- Auto migration: USDC + NFTs from Polygon

- Smart Account (ERC-4337) pour batch transactions
- Smart Account (ERC-4337) for batch transactions

### Questions :
### Questions:

✅ **"Le flow de création automatique d'Embedded Wallet au login est-il une bonne pratique ?"**  
✅ **"Is the automatic Embedded Wallet creation flow on login a good practice?"**

✅ **"Comment optimiser l'onboarding pour des users non-crypto ?"**  
✅ **"How to optimize onboarding for non-crypto users?"**

💡 **"Y a-t-il des features Coinbase Wallet qu'on pourrait exploiter (notifications, etc.) ?"**  
💡 **"Are there any Coinbase Wallet features we could leverage (notifications, etc.)?"**

---

## 4️⃣ SÉCURITÉ & MULTI-SIG (Important !)
## 4️⃣ SECURITY & MULTI-SIG (Important!)

### Notre situation :
### Our Situation:

- Master Server Wallet contrôle TOUT (`onlyOwner`)
- Master Server Wallet controls EVERYTHING (`onlyOwner`)

- Risque si wallet compromis : mint illimité, burn, whitelist, etc.
- Risk if wallet compromised: unlimited mint, burn, whitelist, etc.

### Questions critiques :
### Critical Questions:

🔥 **"Coinbase propose-t-il du multi-sig natif pour les Server Wallets ?"**  
🔥 **"Does Coinbase offer native multi-sig for Server Wallets?"**

🔥 **"Existe-t-il une solution de timelock ou 2FA pour opérations critiques ?"**  
🔥 **"Is there a timelock or 2FA solution for critical operations?"**

🔥 **"Recommandez-vous Gnosis Safe sur Base, ou une autre solution ?"**  
🔥 **"Do you recommend Gnosis Safe on Base, or another solution?"**

💡 **"Des services de monitoring/alertes pour détecter activité suspecte sur Master Wallet ?"**  
💡 **"Any monitoring/alerting services to detect suspicious activity on Master Wallet?"**

---

## 5️⃣ MINTING GASLESS (Critique pour nous !)
## 5️⃣ GASLESS MINTING (Critical for us!)

### Notre besoin :
### Our Need:

- Mint 31,450 NFTs en batch de 100 (315 transactions)
- Mint 31,450 NFTs in batches of 100 (315 transactions)

- Actuellement : gasless via CDP Server Wallet
- Currently: gasless via CDP Server Wallet

### Questions :
### Questions:

🔥 **"Le mint via Server Wallet CDP est-il vraiment gasless ? (0 ETH requis ?)"**  
🔥 **"Is minting via CDP Server Wallet truly gasless? (0 ETH required?)"**

🔥 **"Y a-t-il des limites de rate pour le minting ?"**  
🔥 **"Are there any rate limits for minting?"**

🔥 **"Quelle est la meilleure stratégie pour minter 31k NFTs ?"**  
🔥 **"What's the best strategy to mint 31k NFTs?"**

💡 **"Coinbase peut-il nous aider pour le process de mint (support technique) ?"**  
💡 **"Can Coinbase help us with the minting process (technical support)?"**

---

## 6️⃣ COÛTS & PRICING (Transparent !)
## 6️⃣ COSTS & PRICING (Transparent!)

### Questions directes :
### Direct Questions:

💰 **"Quels sont les coûts réels de votre stack (CDP API, Paymaster, Embedded Wallets) ?"**  
💰 **"What are the real costs of your stack (CDP API, Paymaster, Embedded Wallets)?"**

💰 **"Y a-t-il un plan entreprise adapté à notre volume (~2000 users actifs) ?"**  
💰 **"Is there an enterprise plan suited to our volume (~2000 active users)?"**

💰 **"Des frais cachés dont on devrait être conscient ?"**  
💰 **"Any hidden fees we should be aware of?"**

💡 **"Peut-on négocier un deal startup/partnership ?"**  
💡 **"Can we negotiate a startup/partnership deal?"**

---

## 7️⃣ SUPPORT TECHNIQUE & PARTENARIAT
## 7️⃣ TECHNICAL SUPPORT & PARTNERSHIP

### Questions :
### Questions:

🤝 **"Quel niveau de support technique Coinbase peut fournir ?"**  
🤝 **"What level of technical support can Coinbase provide?"**

🤝 **"Y a-t-il un canal Slack/Discord dédié pour les partenaires ?"**  
🤝 **"Is there a dedicated Slack/Discord channel for partners?"**

🤝 **"Possibilité d'avoir un Technical Account Manager dédié ?"**  
🤝 **"Possibility of having a dedicated Technical Account Manager?"**

🤝 **"Coinbase serait-il intéressé par un case study de notre migration Polygon → Base ?"**  
🤝 **"Would Coinbase be interested in a case study of our Polygon → Base migration?"**

💡 **"Y a-t-il des opportunités de co-marketing (blog post, tweet, etc.) ?"**  
💡 **"Are there any co-marketing opportunities (blog post, tweet, etc.)?"**

---

## 8️⃣ FEATURES AVANCÉES (Bonus)
## 8️⃣ ADVANCED FEATURES (Bonus)

### Explorer :
### To Explore:

💡 **"Coinbase a-t-il des solutions pour gérer les royalties on-chain ?"**  
💡 **"Does Coinbase have solutions for managing on-chain royalties?"**

💡 **"Des outils pour analyser le comportement users (analytics) ?"**  
💡 **"Any tools to analyze user behavior (analytics)?"**

💡 **"Intégration possible avec Coinbase Commerce pour paiements fiat → crypto ?"**  
💡 **"Possible integration with Coinbase Commerce for fiat → crypto payments?"**

💡 **"Features en beta qu'on pourrait tester en early access ?"**  
💡 **"Any beta features we could test in early access?"**

---

## 9️⃣ BASE ECOSYSTEM & GROWTH
## 9️⃣ BASE ECOSYSTEM & GROWTH

### Questions stratégiques :
### Strategic Questions:

🚀 **"Comment Coinbase pousse-t-il l'adoption de Base ?"**  
🚀 **"How is Coinbase driving Base adoption?"**

🚀 **"Y a-t-il des grants ou incentives pour projets NFT sur Base ?"**  
🚀 **"Are there any grants or incentives for NFT projects on Base?"**

🚀 **"Coinbase peut-il nous introduire à d'autres projets Base (networking) ?"**  
🚀 **"Can Coinbase introduce us to other Base projects (networking)?"**

💡 **"Opportunités de figurer dans la Coinbase Wallet featured apps ?"**  
💡 **"Opportunities to be featured in Coinbase Wallet featured apps?"**

---

## 🔟 MIGRATION & TIMELINE
## 🔟 MIGRATION & TIMELINE

### Notre planning :
### Our Planning:

- **Phase 1 :** Migration storage (Pinata + Google Cloud) → 6h
- **Phase 1:** Storage migration (Pinata + Google Cloud) → 6h

- **Phase 2 :** Deploy contracts Base → 1h
- **Phase 2:** Deploy Base contracts → 1h

- **Phase 3 :** Mint 31k NFTs → 2h
- **Phase 3:** Mint 31k NFTs → 2h

- **Phase 4 :** Migration auto users → rolling
- **Phase 4:** Auto user migration → rolling

### Questions :
### Questions:

⏱️ **"Y a-t-il des best practices pour une migration aussi massive ?"**  
⏱️ **"Are there any best practices for such a massive migration?"**

⏱️ **"Coinbase peut-il nous assister pendant la migration (support live) ?"**  
⏱️ **"Can Coinbase assist us during migration (live support)?"**

⏱️ **"Des risques qu'on devrait anticiper ?"**  
⏱️ **"Any risks we should anticipate?"**

---

## 📝 POINTS À NÉGOCIER
## 📝 POINTS TO NEGOTIATE

1. **Support technique dédié** (TAM ou Slack priority)
1. **Dedicated technical support** (TAM or Slack priority)

2. **Budget Paymaster augmenté** (au-delà des limites standard)
2. **Increased Paymaster budget** (beyond standard limits)

3. **Visibilité** (case study, featured app, co-marketing)
3. **Visibility** (case study, featured app, co-marketing)

4. **Pricing préférentiel** (plan entreprise ou deal startup)
4. **Preferential pricing** (enterprise plan or startup deal)

5. **Early access** à nouvelles features CDP
5. **Early access** to new CDP features

---

## 🎁 CE QUE TU APPORTES À COINBASE
## 🎁 WHAT YOU BRING TO COINBASE

### Use case concret :
### Concrete Use Case:

- Migration réelle Polygon → Base (31k NFTs)
- Real Polygon → Base migration (31k NFTs)

- Feedback précieux : Tu testes leur stack complet (CDP, Paymaster, Embedded Wallets)
- Valuable feedback: You're testing their complete stack (CDP, Paymaster, Embedded Wallets)

- Case study potentiel : Migration réussie = preuve que Base > Polygon
- Potential case study: Successful migration = proof that Base > Polygon

- Évangélisation : Ton projet peut inspirer d'autres migrations vers Base
- Evangelization: Your project can inspire other migrations to Base

---

## 📊 MÉTRIQUES À PARTAGER
## 📊 METRICS TO SHARE

- **31,450 NFTs** à migrer
- **31,450 NFTs** to migrate

- **~2,000 users actifs**
- **~2,000 active users**

- **~1,000 transactions/mois** (marketplace)
- **~1,000 transactions/month** (marketplace)

- **Économie gas : ~93%** (Polygon → Base)
- **Gas savings: ~93%** (Polygon → Base)

- **Coût sponsoring : $3-5/mois** (ultra-rentable pour Coinbase de te garder)
- **Sponsoring cost: $3-5/month** (very profitable for Coinbase to keep you)

---

## ✅ CHECKLIST AVANT LE MEETING
## ✅ PRE-MEETING CHECKLIST

### À préparer :
### To Prepare:

- [ ] Schéma architecture (1 slide)
- [ ] Architecture diagram (1 slide)

- [ ] Smart contracts déployés sur testnet (démo possible)
- [ ] Smart contracts deployed on testnet (demo possible)

- [ ] Métriques clés (NFTs, users, transactions)
- [ ] Key metrics (NFTs, users, transactions)

- [ ] Questions prioritaires surlignées
- [ ] Priority questions highlighted

- [ ] Screen recording de l'app (si dispo)
- [ ] App screen recording (if available)

---

## 🎯 OBJECTIFS DU MEETING
## 🎯 MEETING OBJECTIVES

### Minimum :
### Minimum:

✅ Validation de l'architecture par Coinbase  
✅ Architecture validation by Coinbase

✅ Clarification des limites Paymaster  
✅ Paymaster limits clarification

✅ Contact support technique direct  
✅ Direct technical support contact

### Optimal :
### Optimal:

🎁 Plan entreprise ou deal préférentiel  
🎁 Enterprise plan or preferential deal

🎁 Technical Account Manager dédié  
🎁 Dedicated Technical Account Manager

🎁 Opportunité de case study / co-marketing  
🎁 Case study / co-marketing opportunity

🎁 Early access à features beta  
🎁 Early access to beta features

---

**Bonne chance ! 🚀**  
**Good luck! 🚀**

**N'oublie pas de prendre des notes et partage-moi le feedback après !**  
**Don't forget to take notes and share the feedback with me afterwards!**

