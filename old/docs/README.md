# 📚 Documentation CyLimit

**Dernière mise à jour :** 4 Novembre 2025  
**Version :** 2.0 - Réorganisation complète

---

## 🎯 Point d'Entrée

Bienvenue dans la documentation du projet CyLimit. Ce fichier sert de **table des matières centrale** pour toute la documentation.

---

## 📖 Documents Essentiels

### 🚀 Pour Démarrer
1. **[ETAT_PROJET.md](./ETAT_PROJET.md)** - État actuel du projet, ce qui fonctionne
2. **[PROCHAINES_ETAPES.md](./PROCHAINES_ETAPES.md)** - Roadmap et prochaines actions
3. **[GUIDE_GESTION_DOCUMENTATION.md](./GUIDE_GESTION_DOCUMENTATION.md)** - ⚠️ **IMPORTANT** : Règles de gestion de la doc

---

## 📂 Organisation par Thème

### 🧪 Tests & QA
- **[tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md)** - Automatisation tests wallet avec MailHog (gratuit)
- **[tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md)** - Plan de test complet Embedded Wallet

### 🎮 Game Logic & Scoring
- **[game/CYLIMIT_SYSTEME_SCORING.md](./game/CYLIMIT_SYSTEME_SCORING.md)** - Documentation système de scoring multi-rôles

### 🏗️ Architecture & Backend
- **[architecture/GUIDE-ARCHITECTURE-CYLIMIT.md](./architecture/GUIDE-ARCHITECTURE-CYLIMIT.md)** - Guide architecture complète (admin/user backends)
- **[architecture/FIX_DEPENDANCES_CIRCULAIRES.md](./architecture/FIX_DEPENDANCES_CIRCULAIRES.md)** - Fix technique dépendances circulaires NestJS

### 🔧 Backend Techniques
- **[backend/RESULTATS_TESTS_ENDPOINTS.md](./backend/RESULTATS_TESTS_ENDPOINTS.md)** - Résultats tests endpoints marketplace
- **[backend/TEST_USER_BACKEND_ENDPOINTS.md](./backend/TEST_USER_BACKEND_ENDPOINTS.md)** - Guide test endpoints user backend
- **[backend/test-nft-sync-listing.sh](./backend/test-nft-sync-listing.sh)** - Script test vérification ownership

### 💰 Wallet & Transactions
- **[LOGGING_ACTIVITES_MIGRATION.md](./LOGGING_ACTIVITES_MIGRATION.md)** - ✨ NOUVEAU : Documentation logging USDC/NFT
- **[GUIDE_UTILISATION_LOGGING.md](./GUIDE_UTILISATION_LOGGING.md)** - ✨ NOUVEAU : Guide utilisation système logging

---

## 📦 Archives

Les documents obsolètes ou relatifs à des migrations non réalisées sont dans **[archives/](./archives/)** :

- `archives/migrations-cloud/` - Migrations Google Cloud Run non réalisées
- `archives/analyses-2024/` - Analyses et optimisations 2024 non mises en œuvre
- `archives/game-features/` - Features game non prioritaires
- `archives/wallets-v1-v2/` - Ancien système de migration wallets (complet ou abandonné)
- `archives/anciennes-phases/` - Phases de développement historiques

---

## ⚠️ Règles Importantes

**AVANT de créer un nouveau document, LIS :** [GUIDE_GESTION_DOCUMENTATION.md](./GUIDE_GESTION_DOCUMENTATION.md)

**Règles clés :**
1. ✅ **METTRE À JOUR** les documents existants plutôt que créer de nouveaux
2. ❌ **NE PAS créer** de fichiers "RECAP_X.md" ou "X_COMPLETE.md" pour chaque changement
3. 📊 **MAX 15 fichiers actifs** dans /docs (hors archives)
4. 🗂️ **Archiver** immédiatement ce qui devient obsolète

---

## 🔍 Comment Trouver une Information ?

### Par Sujet

| Sujet | Document |
|-------|----------|
| **État du projet actuellement** | [ETAT_PROJET.md](./ETAT_PROJET.md) |
| **Que faire ensuite ?** | [PROCHAINES_ETAPES.md](./PROCHAINES_ETAPES.md) |
| **Tests automatisés wallet** | [tests/AUTOMATISATION_TESTS_WALLET.md](./tests/AUTOMATISATION_TESTS_WALLET.md) |
| **Plan test wallet complet** | [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md) |
| **Système de scoring** | [game/CYLIMIT_SYSTEME_SCORING.md](./game/CYLIMIT_SYSTEME_SCORING.md) |
| **Architecture générale** | [architecture/GUIDE-ARCHITECTURE-CYLIMIT.md](./architecture/GUIDE-ARCHITECTURE-CYLIMIT.md) |
| **Fix techniques** | [architecture/FIX_DEPENDANCES_CIRCULAIRES.md](./architecture/FIX_DEPENDANCES_CIRCULAIRES.md) |
| **Tests endpoints** | [backend/RESULTATS_TESTS_ENDPOINTS.md](./backend/RESULTATS_TESTS_ENDPOINTS.md) |

### Par Phase de Développement

| Phase | Documents Associés |
|-------|-------------------|
| **Phase Actuelle** | Voir [ETAT_PROJET.md](./ETAT_PROJET.md) |
| **Prochaines Phases** | Voir [PROCHAINES_ETAPES.md](./PROCHAINES_ETAPES.md) |
| **Phases Historiques** | Voir [archives/](./archives/) |

---

## 📞 Support

**En cas de question sur la documentation :**
1. Consulter ce README
2. Consulter [ETAT_PROJET.md](./ETAT_PROJET.md) pour le contexte actuel
3. Consulter [GUIDE_GESTION_DOCUMENTATION.md](./GUIDE_GESTION_DOCUMENTATION.md) pour les règles

---

**Dernière réorganisation :** 28 Octobre 2025  
**Nombre de fichiers actifs :** ~10 fichiers  
**Nombre de fichiers archivés :** ~160 fichiers

