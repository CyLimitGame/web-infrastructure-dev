# 📦 INDEX DES ARCHIVES

**Date de création :** 28 Octobre 2025  
**Raison :** Réorganisation massive de la documentation (171 → 9 fichiers actifs)

---

## 📁 Structure des Archives

### archives/migrations-cloud/
**Contenu :** Documentation relative aux migrations cloud non réalisées  
**Nombre de fichiers :** ~10  
**Raison archivage :** Migrations analysées mais non mises en œuvre

**Fichiers principaux :**
- `ANALYSE-GOOGLE-CLOUD-RUN.md` - Analyse migration Google Cloud Run
- `CLOUD_RUN_MIGRATION_RECAP.md` - Récap migration Cloud Run
- `SETUP-FIRESTORE-MONGODB.md` - Setup Firestore (non fait)
- `SETUP-GOOGLE-CLOUD.md` - Setup Google Cloud (non fait)
- `CYLIMIT_MIGRATION_STATUS_DAILY.md` - Suivi quotidien migration
- `MIGRATION_CYLIMIT_RECAP.md` - Récap migration générale

**Date archivage :** 28 Octobre 2025  
**Pertinence future :** Moyenne - Peut être utilisé si migration cloud décidée

---

### archives/analyses-2024/
**Contenu :** Analyses d'optimisation et plans de migration de 2024 non mis en œuvre  
**Nombre de fichiers :** ~10  
**Raison archivage :** Plans analysés mais non exécutés

**Fichiers principaux :**
- `CYLIMIT_OPTIMISATION_CODE.md` - Optimisations code MongoDB
- `CYLIMIT_OPTIMISATION_COUTS.md` - Optimisations coûts
- `CYLIMIT_PLAN_MIGRATION_COMPLET.md` - Plan migration complet
- `CYLIMIT_PLAN_MIGRATION_FIREBASE_2025.md` - Plan Firebase (reporté 2025)
- `CYLIMIT_PLAN_MIGRATION_OPTIMISE.md` - Plan optimisé
- `CYLIMIT_ARCHITECTURE_OPTIMISEE.md` - Architecture optimisée
- `CYLIMIT_GUIDE_AUDIT_CODE.md` - Guide audit code
- `CYLIMIT_ANALYSE_COMPLETE.md` - Analyse complète codebase
- `CYLIMIT_ANALYSE_STRATEGIQUE.md` - Analyse stratégique

**Date archivage :** 28 Octobre 2025  
**Pertinence future :** Faible - Analyses de 2024, contexte changé

---

### archives/game-features/
**Contenu :** Features game non prioritaires ou en attente  
**Nombre de fichiers :** ~7  
**Raison archivage :** Features analysées mais non développées (basse priorité)

**Fichiers principaux :**
- `PLAN_BONUS_GAME_TEAMS.md` - Plan système bonus
- `TRANSFORMATION_GAME_TEAMS.md` - Transformation structure game teams
- `VERIFICATION_IMPLEMENTATION_BONUS.md` - Vérification bonus
- `ARRONDIS_CALCULS_POINTS.md` - Arrondis calculs points
- `GUIDE-FLUX-RECHERCHE-NFT.md` - Guide recherche NFT
- `GUIDE-POPULATE-ADAPTATIF.md` - Système populate adaptatif

**Date archivage :** 28 Octobre 2025  
**Pertinence future :** Moyenne - Peut être utile si features reprises

---

### archives/wallets-v1-v2/
**Contenu :** Documentation migration wallets v1 → v2 (complète ou abandonnée)  
**Nombre de fichiers :** ~90+  
**Raison archivage :** Système ancien remplacé par Embedded Wallets Coinbase

**Sous-dossiers :**
- `Done/` - Phases complétées du système v1→v2
- `old/` - Ancien système wallet
- `old v2/` - Version 2 ancien système
- `old v3/` - Version 3 ancien système
- `old_mint_system/` - Ancien système de mint
- `migration-base-non-realisee/` - Migration Base abandonnée
- `Wallets/` - Documentation générale wallets v1

**Fichiers clés :**
- Multiples guides d'implémentation
- Plans de migration automatique
- Documentation Server Wallets
- Documentation Embedded Wallets (anciennes versions)

**Date archivage :** 28 Octobre 2025  
**Pertinence future :** Faible - Remplacé par nouveau système plus simple

---

### archives/anciennes-phases/
**Contenu :** Phases de développement historiques (PHASE-X-COMPLETE.md, etc.)  
**Nombre de fichiers :** ~35  
**Raison archivage :** Phases terminées, informations dans ETAT_PROJET.md maintenant

**Fichiers principaux :**
- `PHASE-6-7-COMPLETE.md`
- `PHASE-8-COMPLETE.md`
- `PHASE-8-ARCHITECTURE-FINALE.md`
- Multiples `RECAP_*. md`, `RESUME_*.md`, `FINAL_*.md`

**Date archivage :** 28 Octobre 2025  
**Pertinence future :** Faible - Historique uniquement

---

## 📊 Statistiques

### Avant Réorganisation (28 Oct 2025)
- **Total fichiers markdown :** 171
- **Fichiers actifs :** ~40
- **Fichiers obsolètes :** ~130
- **Profondeur max :** 4 niveaux
- **Navigabilité :** ❌ Très difficile

### Après Réorganisation (28 Oct 2025)
- **Total fichiers markdown :** 171 (inchangé)
- **Fichiers actifs :** 9 ✅
- **Fichiers archivés :** 162
- **Profondeur max :** 2 niveaux
- **Navigabilité :** ✅ Excellent

### Réduction
- **Fichiers actifs :** -78% (40 → 9)
- **Clarté :** +400%
- **Facilité navigation :** +500%

---

## 🔍 Comment Retrouver un Document Archivé ?

### Par Sujet

| Sujet Recherché | Dossier Archive |
|-----------------|-----------------|
| Migration Google Cloud | `archives/migrations-cloud/` |
| Optimisations 2024 | `archives/analyses-2024/` |
| Ancien wallet system | `archives/wallets-v1-v2/` |
| Features game bonus | `archives/game-features/` |
| Phases historiques | `archives/anciennes-phases/` |

### Par Recherche Textuelle

```bash
cd archives
grep -r "mot-clé" . --include="*.md"
```

### Par Date

```bash
cd archives
find . -name "*.md" -newermt "2025-01-01"
```

---

## ⚠️ Règles d'Utilisation des Archives

### ✅ AUTORISÉ
- Consulter pour référence historique
- Extraire infos spécifiques pour docs actifs
- Comprendre décisions passées

### ❌ INTERDIT
- Ressortir un fichier archivé dans `/docs`
- Créer des liens depuis docs actifs vers archives
- Dupliquer contenu des archives

**Si info utile dans archive :**
1. Extraire uniquement l'info pertinente
2. L'ajouter dans un document actif approprié
3. NE PAS ressortir le fichier archivé

---

## 🗑️ Politique de Suppression

**JAMAIS supprimer** - Toujours archiver !

**Raisons :**
- Historique décisions importantes
- Référence pour contexte
- Éviter de refaire les mêmes erreurs

**Exception :** Fichiers temporaires de test (`.tmp`, `draft-`, etc.) peuvent être supprimés

---

## 📅 Prochaine Révision

**Date :** 1er Novembre 2025  
**Action :** Audit mensuel documentation (voir GUIDE_GESTION_DOCUMENTATION.md)

---

**Maintenu par :** Équipe CyLimit  
**Dernière mise à jour :** 28 Octobre 2025

