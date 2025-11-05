# 🚀 PROCHAINES ÉTAPES - CYLIMIT

**FICHIER :** PROCHAINES_ETAPES.md

**OBJECTIF :**
Roadmap claire et actionnable des prochaines tâches à réaliser sur le projet CyLimit

**POURQUOI :**
Garder une vision claire des priorités et éviter la dispersion

**COMMENT :**
Consulter ce fichier pour savoir quoi faire ensuite. Mettre à jour après chaque tâche (retirer ✅, ajouter nouvelles).

**DERNIÈRE MISE À JOUR :** 4 Novembre 2025 - 23h45

**STATUT :** Actif - Mis à jour après chaque tâche

---

## 🔥 PRIORITÉ IMMÉDIATE (Cette Semaine)

### 1. Finaliser Tests Playwright ⭐ EN COURS

**Objectif :** Corriger et valider les tests automatisés E2E

**Tâches :**
- 🔄 Corriger flow d'inscription (chemin `/sign-up`, champs corrects)
- ⏳ Tester création wallet avec email principal
- ⏳ Tester ajout backup SMS  
- ⏳ Tester reconnexion sans OTP (bug corrigé)

**Temps estimé :** 2-3 heures

**Bloquants :** Aucun

**Prochaine action :** Lancer le test corrigé et vérifier qu'il passe

---

## 📅 CETTE SEMAINE (Priorité Haute)

### 2. Valider Tests Embedded Wallet

**Objectif :** S'assurer que tous les cas de test critiques passent

**Tâches :**
- ⏳ Test cas 1.1.C(A) : Nouveau user Email + backup SMS
- ⏳ Test cas 3.1.B : Refresh page SANS OTP (critique)
- ⏳ Test cas 7.1.B : Blocage changement email si wallet existe

**Temps estimé :** 3-4 heures

**Document :** [tests/PLAN_TEST_EMBEDDED_WALLET.md](./tests/PLAN_TEST_EMBEDDED_WALLET.md)

---

## 📆 CE MOIS-CI (Octobre-Novembre 2025)

### 3. ✅ Intégration Embedded Wallet Frontend (TERMINÉ 4 Nov 2025)

**Objectif :** Intégrer complètement le wallet Coinbase dans l'interface

**Tâches :**
- ✅ Créer composants wallet (modal auth, gestion backup)
- ✅ Intégrer dans le flow d'achat NFT (vérification wallet obligatoire)
- ✅ Intégrer dans le flow de vente NFT (vérification wallet obligatoire)
- ✅ Gestion solde USDC on-chain avec cache bypass
- ✅ Modal "Ajouter des fonds" avec WalletAuthModal (Onramp intégré)
- ✅ Redesign modal vente (Sorare-inspired)
- ✅ Configuration frais marketplace centralisée (0.05€ min, 0.05%)
- ✅ **NOUVEAU (4 Nov 23h) :** Logging automatique migrations USDC/NFT
  - Script admin `transfer-usdc-to-user.cjs` pour transferts manuels
  - Logging automatique dans address_activities (MIGRATION_USDC, MIGRATION_NFT_BATCH)
  - Traçabilité complète de toutes les opérations
  - Documentation dans LOGGING_ACTIVITES_MIGRATION.md
- ⏳ Tests utilisateurs beta

**Temps estimé :** ~~1-2 semaines~~ TERMINÉ

**Statut :** ✅ Terminé (sauf tests beta)

### 4. Documentation Technique Backend

**Objectif :** Documenter les parties critiques du backend

**Tâches :**
- ⏳ Documenter système de scoring (déjà en partie fait)
- ⏳ Documenter architecture admin/user
- ⏳ Documenter APIs principales

**Temps estimé :** 3-4 jours

---

## 🗓️ TRIMESTRE (Nov-Déc 2025)

### 5. Optimisations Performances

**Objectif :** Réduire les coûts et améliorer les performances

**Tâches possibles (à prioriser) :**
- ⏳ Optimisation requêtes MongoDB lentes
- ⏳ Mise en cache Redis avancée
- ⏳ Réduction taille base de données (si possible)

**Temps estimé :** À définir selon priorités

**Note :** Analyses disponibles dans `archives/analyses-2024/`

### 6. Monitoring & Observabilité

**Objectif :** Améliorer le monitoring de la plateforme

**Tâches :**
- ⏳ Intégration Sentry (error tracking)
- ⏳ Dashboards métriques (Grafana ou équivalent)
- ⏳ Alertes automatiques (erreurs, performances)

**Temps estimé :** 1 semaine

---

## 📋 BACKLOG (Basse Priorité)

### Infrastructure
- Migration Google Cloud Run (économies analysées, décision en attente)
- Migration Firebase Auth (planifiée 2025, pas urgente)
- Optimisation coûts AWS/MongoDB

### Features
- App mobile native
- Système bonus game avancé
- Nouvelles features marketplace

### Technique
- Tests unitaires backend (couverture faible)
- Migration Next.js 12 → 14
- TypeScript strict mode

---

## ✅ RÉCEMMENT COMPLÉTÉ

### Novembre 2025
- ✅ 4 Nov : Fix détection wallet dans useWalletRequired (walletSyncedAt non pris en compte)
- ✅ 4 Nov : Ajout vérification wallet obligatoire pour vente NFT (SellCardForm)
- ✅ 4 Nov : Ajout vérification wallet obligatoire pour achat NFT (BuyButton)
- ✅ 4 Nov : Analyse conformité marketplace vs spécifications SECONDARY-MARKET-USERS-TO-USERS.md
- ✅ 4 Nov : Identification points non-conformes (transferFrom vs transfer, vérification blockchain manquante)

### Octobre 2025
- ✅ 28 Oct : Réorganisation documentation (171 → 10 fichiers)
- ✅ 28 Oct : Création guide gestion documentation
- ✅ 28 Oct : Correction flow inscription tests Playwright
- ✅ 28 Oct : Ajout `getConfirmationLinkFromEmail` utilitaire MailHog
- ✅ 10 Oct : Création plan test Embedded Wallet (42 cas)

### Septembre 2025
- ✅ Fix dépendances circulaires NestJS
- ✅ Séparation backend admin/user
- ✅ Diverses corrections techniques

---

## 🎯 Critères de Succès

### Tests Automatisés
- ✅ Playwright configuré
- ✅ MailHog intégré
- 🔄 Au moins 5 tests E2E qui passent
- ⏳ Coverage > 50% des flows critiques

### Embedded Wallet
- 🔄 SDK intégré
- ⏳ Tests end-to-end validés
- ⏳ Migration users existants < 5% erreurs
- ⏳ Production déployée

### Documentation
- ✅ < 15 fichiers actifs
- ✅ Structure claire (2 niveaux max)
- ✅ Mise à jour régulière (hebdomadaire)
- ✅ Pas de fichiers "COMPLETE" ou "RECAP"

---

## 🔄 Comment Utiliser Ce Fichier

### Avant de Commencer une Tâche
1. Lire ce fichier pour voir les priorités
2. Choisir la tâche la plus haute priorité
3. Consulter le document technique associé

### Après Avoir Terminé une Tâche
1. ✅ Marquer la tâche comme complétée (🔄 → ✅)
2. ✅ Déplacer dans section "RÉCEMMENT COMPLÉTÉ"
3. ✅ Mettre à jour ETAT_PROJET.md
4. ✅ Ajouter nouvelles tâches identifiées
5. ✅ Mettre date de dernière MAJ

---

## 📞 Questions Fréquentes

**Q : Quelle est la prochaine chose à faire ?**
R : Voir section "PRIORITÉ IMMÉDIATE" en haut de ce document

**Q : Où trouver les docs techniques ?**
R : Voir README.md pour la table des matières complète

**Q : Un ancien document contient des infos utiles ?**
R : Chercher dans `archives/`, extraire les infos pertinentes, les ajouter dans un doc actif, ne PAS ressortir l'ancien fichier

---

**RAPPEL :** Ce fichier doit être mis à jour APRÈS CHAQUE tâche terminée !

**Prochaine révision :** 1er Novembre 2025 (mensuelle)

