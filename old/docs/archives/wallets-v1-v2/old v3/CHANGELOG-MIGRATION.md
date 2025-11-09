# 📝 CHANGELOG - MIGRATION V1→V2

Historique complet des modifications apportées au projet de migration.

---

## [2.0.0] - 2025-10-14 - CORRECTION ARCHITECTURALE MAJEURE

### ⚠️ BREAKING CHANGES

**Correction d'une erreur de conception critique identifiée par l'utilisateur.**

#### Problème
- ❌ Endpoints POST créés dans admin backend pour migrer des users
- ❌ MigrationAdminService tentait d'appeler MigrationService du user backend
- ❌ Impossible car les deux backends sont des apps séparées

#### Solution
- ✅ Suppression de tous les endpoints POST de migration dans admin backend
- ✅ MigrationAdminService ne fait plus que de la lecture DB (stats basiques)
- ✅ MigrationService reste dans USER backend pour l'auto-migration
- ✅ Scripts admin pour migration forcée (cas exceptionnels)

### 🔄 Changements

#### Admin Backend

**Supprimé :**
- `POST /admin/migration/user/:userId` - Migration directe (faux)
- `POST /admin/migration/batch` - Migration batch (faux)
- `POST /admin/migration/test/:userId` - Test migration (faux)
- `dtos/migrate-user.dto.ts` - DTOs migration (inutiles)
- Toutes les fonctions de migration dans MigrationAdminService

**Modifié :**
- `MigrationAdminService` : Uniquement stats basiques (lecture DB)
- `MigrationAdminController` : Uniquement GET endpoints
- `migration.module.ts` : Suppression dépendances inutiles

**Conservé :**
- `GET /admin/migration/stats` - Stats basiques (total users, avec/sans wallet)
- `GET /admin/migration/users` - Liste users (email, wallet)
- Scripts admin (deploy, remint, migration forcée)
- Contrats blockchain + _REFERENCE_COMMENTS.txt

#### User Backend

**Aucun changement** - Architecture correcte dès le départ :
- MigrationService (logique migration)
- POST /user/wallet/sync (auto-migration)
- Endpoints publics

### 📚 Documentation

**Créé :**
- `ARCHITECTURE-FINALE-CORRECTE.md` - Architecture validée
- `RECAP-FINAL-CORRECTION.md` - Récap détaillé de la correction
- `GUIDE-TEST-ENDPOINTS-ADMIN-SIMPLIFIE.md` - Guide simplifié
- `INDEX-DOCUMENTATION.md` - Index complet de la doc
- `RESUME-1-PAGE.md` - Résumé ultra-simple
- `CHANGELOG-MIGRATION.md` - Ce fichier

**Mis à jour :**
- `MIGRATION-COMPLETE.md` - Correction Phase 3
- `GUIDE-TEST-ENDPOINTS-ADMIN.md` - Correction endpoints

### 🎯 Impact

**Utilisateurs (99% des cas) :**
- ✅ Aucun impact - Auto-migration fonctionne toujours
- ✅ Flow transparent lors connexion Coinbase

**Admins :**
- ⚠️ Endpoints POST supprimés (ils ne fonctionnaient pas de toute façon)
- ✅ Utiliser scripts admin à la place : `node scripts/test-migration-single-user.js <userId>`
- ✅ Endpoints GET conservés pour monitoring

---

## [1.5.0] - 2025-10-13 - NETTOYAGE COMMENTAIRES CONTRATS

### 🔒 Sécurité

**Nettoyage des commentaires dans les contrats pour déploiement.**

#### Changements

**Créé :**
- `CyLimitMarketplace_REFERENCE_COMMENTS.txt` - Version complète avec commentaires (admin backend)
- `CyLimitNFT_v2_REFERENCE_COMMENTS.txt` - Version complète avec commentaires (admin backend)
- `NETTOYAGE-COMMENTAIRES-CONTRATS.md` - Documentation du process

**Modifié :**
- `CyLimitMarketplace.sol` - Nettoyé, uniquement NatSpec public
- `CyLimitNFT_v2.sol` - Nettoyé, uniquement NatSpec public

**Supprimé :**
- Commentaires internes stratégiques dans les .sol (visibles sur Polygonscan)
- Commentaires détaillés sur les choix d'implémentation

#### Pourquoi ?
- Éviter de révéler stratégie interne sur Polygonscan
- Conserver version complète en interne (_REFERENCE_COMMENTS.txt)
- Garder uniquement doc publique NatSpec

---

## [1.4.0] - 2025-10-13 - CORRECTION BUG SWAP OFFERS USDC

### 🐛 Bug Fix Critique

**Correction : Swap offers avec USDC n'utilisaient pas d'escrow.**

#### Problème
- ❌ Swap offers avec USDC : pas d'escrow
- ❌ Initiator pouvait annuler après que target ait signé
- ❌ Inconsistant avec buy offers (qui ont escrow)

#### Solution
- ✅ Ajout escrow USDC dans `createSwapOffer()` si `usdcFromInitiator=true`
- ✅ Ajout refund USDC dans `cancelSwapOffer()` si applicable
- ✅ Ajout gestion escrow dans `acceptSwapOffer()` pour les deux cas

#### Changements

**Modifié :**
- `CyLimitMarketplace.sol` :
  - `createSwapOffer()` - Escrow USDC si initiator paye
  - `cancelSwapOffer()` - Refund USDC escrowed
  - `acceptSwapOffer()` - Gestion escrow pour 2 cas

**Documentation :**
- `CORRECTION-SWAP-USDC-ESCROW.md` - Créé
- `CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md` - Mis à jour
- `MARKETPLACE-COMPLETE-V2.md` - Mis à jour

---

## [1.3.0] - 2025-10-12 - MIGRATION ADMIN/USER SEPARATION

### 🏗️ Architecture

**Séparation des responsabilités Admin vs User backend.**

#### Changements

**Phase 1 : Contrats → Admin Backend**
- Migration contrats .sol vers admin backend
- Création _REFERENCE_COMMENTS.txt (versions commentées)
- Suppression versions temporaires (flattened, merged)

**Phase 2 : Scripts → Admin Backend**
- Migration tous scripts blockchain vers admin backend
- Création README-BLOCKCHAIN.md (guide complet)
- Conservation scripts deploy/prod dans user backend

**Phase 3 : Module Migration Admin**
- Création MigrationModule dans admin backend
- Endpoints monitoring (GET stats, GET users) ← **CORRIGÉ EN V2.0.0**
- Endpoints migration (POST) ← **SUPPRIMÉS EN V2.0.0**

**Phase 4 : Nettoyage User Backend**
- Suppression scripts blockchain
- Suppression _REFERENCE_COMMENTS.txt
- Conservation .sol (lecture seule, pas de _REFERENCE)

#### Documentation
- `MIGRATION-ADMIN-USER-SEPARATION.md` - Plan complet
- `MIGRATION-STATUS-ADMIN-USER.md` - Status et checklist
- `MIGRATION-COMPLETE.md` - Résumé complet
- `GUIDE-TEST-ENDPOINTS-ADMIN.md` - Guide de test ← **MIS À JOUR EN V2.0.0**

---

## [1.2.0] - 2025-10-10 - BATCH OPERATIONS

### ⚡ Performance

**Ajout batch mint et batch transfer pour réduire les gas fees.**

#### Changements

**CyLimitNFT_v2.sol :**
- `batchMint()` - Mint jusqu'à 100 NFTs en 1 transaction
- `batchTransfer()` - Transfer jusqu'à 50 NFTs en 1 transaction

**migration.service.ts :**
- `transferNFTsV2()` - Utilise safeTransferContractFrom avec Master New Wallet

**nft.schema.ts :**
- `oldTokenId` - Pour tracer origine NFT v1
- `oldContractAddress` - Pour tracer contrat v1

#### Impact
- ✅ Réduction gas fees (batch operations)
- ✅ Migration plus rapide
- ✅ Traçabilité NFTs v1 → v2

---

## [1.1.0] - 2025-10-08 - COINBASE EMBEDDED WALLETS

### 🔗 Intégration

**Intégration Coinbase Embedded Wallets pour simplifier UX.**

#### Changements

**User Backend :**
- Intégration Coinbase SDK
- POST /user/wallet/sync (création + auto-migration)
- MigrationService.migrateUserAssets()

**User Frontend :**
- Connexion Coinbase
- Création Embedded Wallet
- Sync wallet address

#### Impact
- ✅ User ne gère plus de clés privées
- ✅ Création wallet en 1 clic
- ✅ Auto-migration transparente

---

## [1.0.0] - 2025-10-01 - SMART CONTRACTS V2

### 🎉 Initial Release

**Déploiement contrats v2 sur Polygon Mainnet.**

#### Contrats

**CyLimitNFT_v2.sol :**
- ERC-721 avec whitelisting
- Mint, transfer, burn
- Token URI (IPFS metadata)

**CyLimitMarketplace.sol :**
- Direct sales (listings)
- Buy offers (avec escrow USDC)
- Swap offers (NFT ↔ NFT [+ USDC])
- Commissions CyLimit (2.5%)

#### Architecture
- Master Old Wallet (v1, read-only)
- Master New Wallet (v2, mint + distribute)
- Smart contracts déployés
- Migration planifiée

#### Documentation
- `MIGRATION-V1-V2-MAINNET.md` - Architecture
- `README-MIGRATION-V1-V2.md` - Guide complet
- `ETAT-MIGRATION-V1-V2.md` - Status
- `CONTRATS-NFT-MARKETPLACE-EXPLICATIONS.md` - Explications

---

## 🔮 À VENIR

### [2.1.0] - Prochaine Release

**Améliorations prévues :**
- [ ] Dashboard admin pour monitoring migration (stats visuelles)
- [ ] Notifications users pour migration complète
- [ ] Analytics détaillées (gas fees, temps migration, etc.)
- [ ] Tests e2e complets

---

## 📊 RÉSUMÉ PAR VERSION

| Version | Date | Changement Principal | Impact |
|---------|------|---------------------|--------|
| **2.0.0** | 2025-10-14 | Correction architecture admin/user | 🔴 Breaking |
| 1.5.0 | 2025-10-13 | Nettoyage commentaires contrats | 🔒 Sécurité |
| 1.4.0 | 2025-10-13 | Correction bug swap USDC escrow | 🐛 Bug Fix |
| 1.3.0 | 2025-10-12 | Séparation admin/user | 🏗️ Architecture |
| 1.2.0 | 2025-10-10 | Batch operations | ⚡ Performance |
| 1.1.0 | 2025-10-08 | Coinbase Embedded Wallets | 🔗 Intégration |
| 1.0.0 | 2025-10-01 | Smart contracts v2 | 🎉 Initial |

---

## 📝 CONVENTIONS

**Format :**
```
## [VERSION] - DATE - TITRE

### 🏷️ CATÉGORIE

Description du changement

#### Changements
- Détails techniques

#### Impact
- Conséquences pour users/admins
```

**Catégories :**
- 🎉 Initial Release
- 🏗️ Architecture
- 🔗 Intégration
- ⚡ Performance
- 🐛 Bug Fix
- 🔒 Sécurité
- 📚 Documentation
- ⚠️ BREAKING CHANGES

**Semantic Versioning :**
- MAJOR (X.0.0) : Breaking changes
- MINOR (0.X.0) : New features (backward compatible)
- PATCH (0.0.X) : Bug fixes

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 14 Octobre 2025

