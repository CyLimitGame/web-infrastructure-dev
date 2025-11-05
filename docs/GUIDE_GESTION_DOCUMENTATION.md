# 📋 GUIDE DE GESTION DE LA DOCUMENTATION

**FICHIER :** GUIDE_GESTION_DOCUMENTATION.md

**OBJECTIF :**
Règles strictes de gestion de la documentation du projet CyLimit

**POURQUOI :**
Éviter la prolifération de fichiers obsolètes et maintenir une documentation claire, à jour et bien organisée. Le projet avait atteint 171 fichiers markdown, rendant la navigation impossible.

**COMMENT :**
Règles de création, mise à jour et archivage des documents

---

## 🚨 RÈGLES STRICTES (À APPLIQUER SYSTÉMATIQUEMENT)

### Règle #1 : METTRE À JOUR plutôt que CRÉER

**❌ NE JAMAIS FAIRE :**
```
Tâche terminée → Créer "RECAP_TASK_COMPLETE.md"
Migration faite → Créer "MIGRATION_TERMINEE.md"
Fix appliqué → Créer "FIX_BUG_X_COMPLETE.md"
```

**✅ TOUJOURS FAIRE :**
```
Tâche terminée → Mettre à jour ETAT_PROJET.md (section concernée)
Migration faite → Mettre à jour PROCHAINES_ETAPES.md (marquer ✅)
Fix appliqué → Mettre à jour le document technique concerné
```

### Règle #2 : Maximum 15 Fichiers Actifs

**Limite stricte :** MAX 15 fichiers `.md` dans `/docs` (hors `/archives`)

**Si limite atteinte :**
1. Identifier le fichier le moins utilisé
2. Vérifier s'il est toujours pertinent
3. L'archiver dans `/archives` ou le fusionner avec un autre

**Fichiers qui comptent dans la limite :**
- README.md
- ETAT_PROJET.md
- PROCHAINES_ETAPES.md
- GUIDE_GESTION_DOCUMENTATION.md
- Tous les fichiers dans les sous-dossiers (`tests/`, `game/`, `architecture/`, `backend/`)

**Fichiers qui NE comptent PAS :**
- Fichiers dans `/archives`
- Scripts `.sh`, `.js`, `.py`

### Règle #3 : Fichiers Centraux Obligatoires

**Ces 3 fichiers DOIVENT toujours exister et être à jour :**

1. **README.md** - Table des matières, point d'entrée
2. **ETAT_PROJET.md** - État actuel détaillé
3. **PROCHAINES_ETAPES.md** - Roadmap et actions à venir

**Après CHAQUE tâche terminée :**
- [ ] Mettre à jour `ETAT_PROJET.md` (section concernée)
- [ ] Mettre à jour `PROCHAINES_ETAPES.md` (marquer tâche ✅, ajouter nouvelles)
- [ ] Mettre à jour `README.md` si nouvelle catégorie/document

### Règle #4 : Nommage des Fichiers

**Format autorisé :**
- `NOM_DESCRIPTIF.md` (CAPS_SNAKE_CASE pour fichiers principaux)
- `nom-technique.md` (kebab-case pour fichiers techniques)

**❌ Formats INTERDITS :**
- `RECAP_X.md`, `X_COMPLETE.md`, `X_FINAL.md`, `X_V2.md`, `X_UPDATE.md`
- `notes-28-oct.md`, `temp-doc.md`, `draft-xyz.md`

**Exception :** Les scripts peuvent avoir des noms comme `test-xyz.sh`

### Règle #5 : Structure des Dossiers

**Structure fixe :**
```
/docs
├── README.md                          # Point d'entrée
├── ETAT_PROJET.md                     # État actuel
├── PROCHAINES_ETAPES.md               # Roadmap
├── GUIDE_GESTION_DOCUMENTATION.md     # Ce fichier
│
├── tests/                             # Documentation tests
├── game/                              # Logique métier jeu
├── architecture/                      # Architecture technique
├── backend/                           # Docs backend spécifiques
├── frontend/                          # Docs frontend spécifiques
│
└── archives/                          # TOUT ce qui est obsolète
    ├── migrations-cloud/
    ├── analyses-2024/
    ├── wallets-v1-v2/
    └── ...
```

**❌ PAS de sous-sous-dossiers** (max 2 niveaux)

### Règle #6 : Archivage Immédiat

**Archiver IMMÉDIATEMENT quand :**
- ✅ Une tâche/phase est complétée
- ❌ Un plan n'a pas été mis en œuvre
- 🔄 Une migration est abandonnée  
- 📅 Un document n'a pas été modifié depuis > 3 mois

**Comment archiver :**
```bash
mv docs/FICHIER_OBSOLETE.md docs/archives/categorie-appropriee/
```

**NE PAS supprimer** - Toujours archiver, jamais delete !

### Règle #7 : Commentaires en Tête de Fichier

**OBLIGATOIRE dans chaque fichier markdown :**
```markdown
**FICHIER :** nom-du-fichier.md

**OBJECTIF :**
Description en 1-2 lignes de ce que contient le document

**POURQUOI :**
Raison d'être du document, problème qu'il résout

**COMMENT :**
Comment utiliser/appliquer les informations du document

**DERNIÈRE MISE À JOUR :** Date

**STATUT :** Actif | Archivé | En cours
```

### Règle #8 : Checklist Après Chaque Tâche

**Après CHAQUE modification de code, OBLIGATOIREMENT :**

```markdown
□ Identifier les documents impactés
□ Mettre à jour ETAT_PROJET.md (marquer ✅ si terminé)
□ Mettre à jour PROCHAINES_ETAPES.md (retirer de TODO, ajouter nouveaux)
□ Mettre à jour le document technique concerné (si existe)
□ Vérifier nombre de fichiers actifs (< 15)
□ Archiver documents devenus obsolètes
□ NE PAS créer de nouveau "RECAP" ou "COMPLETE"
```

---

## 📝 Processus de Création de Document

### Quand Créer un NOUVEAU Document ?

**✅ CRÉER un nouveau fichier SI ET SEULEMENT SI :**
1. Sujet majeur non couvert par documentation existante
2. Document sera référencé régulièrement (> 1 fois/mois)
3. Contenu trop volumineux pour être fusionné (> 500 lignes)
4. Catégorie clairement définie (tests, game, architecture, etc.)

**AVANT de créer :**
- [ ] Vérifier qu'aucun document existant ne couvre déjà le sujet
- [ ] Vérifier qu'on n'a pas déjà atteint la limite de 15 fichiers
- [ ] Définir dans quel dossier il va (tests/, game/, architecture/, backend/, frontend/)

### Template de Nouveau Document

```markdown
**FICHIER :** [nom-du-fichier.md]

**OBJECTIF :**
[Description claire en 1-2 lignes]

**POURQUOI :**
[Problème résolu ou besoin couvert]

**COMMENT :**
[Comment utiliser ce document]

**DERNIÈRE MISE À JOUR :** [Date]

**STATUT :** Actif

---

## Contenu Principal

[...]

---

**APPELÉ DEPUIS :** [Quels autres docs référencent celui-ci]
**APPELLE :** [Quels autres docs ce fichier référence]
```

---

## 🗂️ Processus d'Archivage

### Quand Archiver ?

**Archiver immédiatement dans ces cas :**

1. **Tâche terminée** (pas besoin de "COMPLETE.md")
   - Mettre à jour `ETAT_PROJET.md` avec ✅
   - Archiver la doc de planification

2. **Plan non réalisé** (ex: migration Firebase jamais faite)
   - Archiver tous les docs liés à ce plan
   - Garder seulement une ligne dans `ETAT_PROJET.md` : "Non réalisé"

3. **Document remplacé** (nouvelle version)
   - Archiver l'ancienne version
   - Garder seulement la nouvelle

4. **Inactivité > 3 mois**
   - Si non modifié depuis 3 mois → probablement obsolète
   - Vérifier pertinence puis archiver

### Comment Archiver ?

```bash
# 1. Identifier la catégorie
# 2. Déplacer dans le bon dossier archives

mv docs/FICHIER.md docs/archives/[categorie]/

# Catégories disponibles :
# - migrations-cloud
# - analyses-2024
# - game-features
# - wallets-v1-v2
# - anciennes-phases
```

### Index d'Archives

**Créer `archives/INDEX.md` listant :**
- Quels documents sont archivés
- Pourquoi ils ont été archivés
- Date d'archivage

---

## 🔄 Processus de Mise à Jour

### Mise à Jour d'un Document Existant

**Toujours ajouter en tête :**
```markdown
**DERNIÈRE MISE À JOUR :** [Date]

**CHANGELOG :**
- [Date] : [Description changement]
- [Date précédente] : [Description]
```

**Sections à mettre à jour :**
- Date de dernière mise à jour
- Section "Statut" si applicable
- Section "TODO" ou checklist
- Ajouter ligne dans CHANGELOG

### Mise à Jour des 3 Fichiers Centraux

**Fréquence :** Après CHAQUE tâche terminée ou changement significatif

1. **ETAT_PROJET.md**
   - Mettre à jour section concernée
   - Marquer ✅ les tâches complétées
   - Actualiser métriques (si applicables)
   - Mettre date de dernière mise à jour

2. **PROCHAINES_ETAPES.md**
   - Retirer les tâches complétées
   - Ajouter les nouvelles tâches identifiées
   - Réorganiser les priorités
   - Mettre date de dernière mise à jour

3. **README.md**
   - Ajouter nouveaux documents s'il y en a
   - Retirer liens vers documents archivés
   - Mettre à jour le compteur de fichiers

---

## ❌ Anti-Patterns à Éviter

### 🚫 Pattern "Prolifération"

**❌ MAUVAIS :**
```
docs/
├── TASK_X.md
├── TASK_X_COMPLETE.md
├── TASK_X_FINAL.md
├── TASK_X_V2.md
├── RECAP_TASK_X.md
└── SUMMARY_TASK_X.md
```

**✅ BON :**
```
docs/
├── ETAT_PROJET.md (contient statut TASK_X: ✅ Terminé)
└── archives/
    └── task-x/
        └── TASK_X_PLANIFICATION.md (doc originale archivée)
```

### 🚫 Pattern "Versioning Infini"

**❌ MAUVAIS :**
```
GUIDE_V1.md
GUIDE_V2.md
GUIDE_V3.md
GUIDE_FINAL.md
GUIDE_FINAL_V2.md
```

**✅ BON :**
```
GUIDE.md (toujours à jour, avec CHANGELOG interne)
archives/
└── GUIDE_V1_2024.md (si vraiment besoin de garder historique)
```

### 🚫 Pattern "Notes Temporaires"

**❌ MAUVAIS :**
```
notes-28-oct.md
temp-fix-wallet.md
draft-architecture.md
TODO-valentin.md
```

**✅ BON :**
- Utiliser les TODO dans le code
- Utiliser ETAT_PROJET.md pour notes
- Utiliser PROCHAINES_ETAPES.md pour TODOs

---

## 📊 Audit Mensuel

**Chaque 1er du mois, faire un audit :**

### Checklist Audit Mensuel

```markdown
□ Compter fichiers actifs (doit être < 15)
□ Identifier fichiers non modifiés depuis > 3 mois
□ Vérifier que ETAT_PROJET.md est à jour
□ Vérifier que PROCHAINES_ETAPES.md est à jour
□ Archiver documents obsolètes identifiés
□ Mettre à jour README.md (compteur fichiers)
□ Créer une note dans ETAT_PROJET.md : "Audit [mois] effectué ✅"
```

### Métriques à Suivre

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| Fichiers actifs | < 15 | [À compter] |
| Fichiers archivés | Croissant | [À compter] |
| Docs modifiés ce mois | > 3 | [À compter] |
| Docs obsolètes (> 3 mois) | 0 | [À compter] |

---

## 🎯 Workflow Recommandé

### Processus Complet : Nouvelle Tâche → Documentation

```
1️⃣ AVANT la tâche
   └─> Consulter PROCHAINES_ETAPES.md
   └─> Identifier documents techniques pertinents
   └─> Les lire pour contexte

2️⃣ PENDANT la tâche
   └─> Noter les changements importants
   └─> Identifier quels docs seront impactés

3️⃣ APRÈS la tâche
   └─> Mettre à jour ETAT_PROJET.md (✅ terminé)
   └─> Mettre à jour PROCHAINES_ETAPES.md (retirer TODO)
   └─> Mettre à jour docs techniques concernés
   └─> Vérifier limite 15 fichiers
   └─> Archiver si nécessaire
   └─> NE PAS créer "X_COMPLETE.md"
```

---

## 📁 Catégories d'Archives

### archives/migrations-cloud/
**Contient :** Plans de migration vers Google Cloud Run, Firebase, etc. non réalisés

### archives/analyses-2024/
**Contient :** Analyses d'optimisation, coûts, architecture de 2024 non mises en œuvre

### archives/game-features/
**Contient :** Features game (bonus, transformations) non prioritaires ou en attente

### archives/wallets-v1-v2/
**Contient :** Ancien système de migration wallets (phases complétées ou abandonnées)

### archives/anciennes-phases/
**Contient :** Phases de développement historiques complétées

---

## ✅ Checklist de Validation

**Avant de commit des changements de documentation :**

```markdown
□ Ai-je mis à jour ETAT_PROJET.md ?
□ Ai-je mis à jour PROCHAINES_ETAPES.md ?
□ Ai-je archivé les documents obsolètes ?
□ Ai-je évité de créer un "RECAP" ou "COMPLETE" ?
□ Nombre de fichiers actifs < 15 ?
□ Ai-je ajouté les commentaires de tête de fichier ?
□ Ai-je mis la date de dernière MAJ ?
□ README.md est-il à jour ?
```

---

## 🎓 Exemples Concrets

### Exemple 1 : Feature Complétée

**❌ MAUVAISE APPROCHE :**
```
1. Terminer feature "Embedded Wallet"
2. Créer "EMBEDDED_WALLET_COMPLETE.md"
3. Créer "RECAP_EMBEDDED_WALLET.md"
4. Créer "EMBEDDED_WALLET_FINAL_SUMMARY.md"
→ Résultat : +3 fichiers, confusion
```

**✅ BONNE APPROCHE :**
```
1. Terminer feature "Embedded Wallet"
2. Ouvrir ETAT_PROJET.md
3. Section "Wallet" → Marquer "✅ Embedded Wallet intégré et testé"
4. Ouvrir PROCHAINES_ETAPES.md
5. Retirer "Intégrer Embedded Wallet" de la liste TODO
6. Archiver docs de planification dans archives/wallets-v1-v2/
→ Résultat : 0 nouveaux fichiers, clarté maximale
```

### Exemple 2 : Fix Technique

**❌ MAUVAISE APPROCHE :**
```
1. Corriger bug dépendances circulaires
2. Créer "FIX_DEPENDANCES_CIRCULAIRES_COMPLETE.md"
3. Créer "RECAP_FIX_CIRCULAIRE.md"
→ Résultat : +2 fichiers
```

**✅ BONNE APPROCHE :**
```
1. Corriger bug dépendances circulaires
2. Créer/Mettre à jour "architecture/FIX_DEPENDANCES_CIRCULAIRES.md" (1 seul fichier)
3. Ajouter section "✅ Appliqué le [date]" dans le fichier
4. Mettre à jour ETAT_PROJET.md : "Dépendances circulaires → ✅ Corrigé"
→ Résultat : 1 fichier technique bien documenté
```

### Exemple 3 : Nouveau Sujet Majeur

**✅ QUAND créer un nouveau fichier :**
```
1. Nouveau sujet : "Système de Cache Redis"
2. Vérifier : Pas couvert dans docs existants
3. Catégorie : architecture/
4. Créer : architecture/SYSTEME_CACHE_REDIS.md
5. Ajouter référence dans README.md
6. Ajouter mention dans ETAT_PROJET.md
→ Résultat : 1 nouveau fichier justifié, bien référencé
```

---

## 🚨 Violations Courantes

### Violation #1 : Documentation par Phase

**❌ CE QU'ON FAISAIT AVANT :**
```
PHASE-1-COMPLETE.md
PHASE-2-COMPLETE.md
PHASE-3-COMPLETE.md
PHASE-4-COMPLETE.md
...
PHASE-8-COMPLETE.md
```

**✅ CE QU'IL FAUT FAIRE :**
```
ETAT_PROJET.md
└─> Section "Historique Phases"
    ├─> Phase 1 : ✅ Complétée [date]
    ├─> Phase 2 : ✅ Complétée [date]
    └─> Phase 8 : ✅ Complétée [date]
```

### Violation #2 : Multiplicité de Résumés

**❌ CE QU'ON FAISAIT AVANT :**
```
RESUME_X.md
RECAP_X.md
SUMMARY_X.md
FINAL_X.md
X_COMPLETE.md
```

**✅ CE QU'IL FAUT FAIRE :**
```
ETAT_PROJET.md (contient TOUT l'état actuel)
```

### Violation #3 : Documents Temporaires

**❌ CE QU'ON FAISAIT AVANT :**
```
notes-debug.md
temp-wallet-fix.md
TODO-aujourd-hui.md
```

**✅ CE QU'IL FAUT FAIRE :**
```
- Utiliser les TODOs dans le code source
- Utiliser PROCHAINES_ETAPES.md pour roadmap
- Utiliser des commentaires // TODO dans le code
```

---

## 💡 Principes de Base

### Principe #1 : Un Sujet = Un Fichier

Chaque sujet majeur a **UN SEUL** fichier de référence, toujours mis à jour.

### Principe #2 : État > Historique

Documenter l'**état actuel** est prioritaire. L'historique va dans `archives/`.

### Principe #3 : Actionnable > Descriptif

Préférer des guides actionnables ("Comment faire X") plutôt que des descriptions passives ("X a été fait").

### Principe #4 : Concision > Exhaustivité

Un document de 200 lignes bien structuré > 5 documents de 100 lignes éparpillés.

### Principe #5 : Référence > Duplication

Utiliser des liens `[Voir X.md]` plutôt que copier-coller du contenu.

---

## 🔍 Outils de Vérification

### Compter les Fichiers Actifs

```bash
cd docs
find . -maxdepth 2 -name "*.md" ! -path "./archives/*" | wc -l
```

**Résultat attendu :** < 15

### Identifier Documents Non Modifiés

```bash
cd docs
find . -name "*.md" ! -path "./archives/*" -mtime +90
```

**Action :** Archiver ces fichiers

### Vérifier Structure

```bash
cd docs
ls -R | grep ":" | grep -v archives
```

**Vérifier :** Max 2 niveaux de profondeur

---

## 📞 Questions Fréquentes

### Q : "Je viens de terminer une grosse feature, je dois créer un RECAP ?"
**R :** ❌ **NON !** Mets à jour `ETAT_PROJET.md` avec ✅ et détails.

### Q : "J'ai fait un fix important, je crée FIX_X_COMPLETE.md ?"
**R :** ❌ **NON !** Crée/mets à jour `architecture/FIX_X.md` (sans COMPLETE), puis ajoute une ligne dans `ETAT_PROJET.md`.

### Q : "Comment savoir si un doc est obsolète ?"
**R :** Vérifie la date de dernière modification. Si > 3 mois ET non référencé dans `ETAT_PROJET.md` ou `PROCHAINES_ETAPES.md` → Archive.

### Q : "On a dépassé 15 fichiers actifs, que faire ?"
**R :** 
1. Lister tous les fichiers actifs
2. Identifier le moins pertinent
3. L'archiver ou le fusionner avec un autre
4. Mettre à jour références dans README.md

### Q : "Un document ancien contient des infos encore utiles ?"
**R :** Extraire uniquement les infos utiles, les ajouter dans un doc actif pertinent, puis archiver l'ancien.

---

## 🎯 Objectifs de Qualité

**Mesures de succès :**
- ✅ Nombre de fichiers actifs < 15
- ✅ ETAT_PROJET.md mis à jour chaque semaine minimum
- ✅ PROCHAINES_ETAPES.md mis à jour après chaque tâche
- ✅ Aucun fichier "COMPLETE" ou "RECAP" dans /docs
- ✅ Tous les fichiers actifs modifiés dans les 3 derniers mois
- ✅ Structure claire (max 2 niveaux)

---

## 🔄 Changelog de ce Guide

- **28 Oct 2025** : Création initiale après réorganisation massive (171 → ~10 fichiers)

---

**IMPORTANT :** Ce guide est la **source de vérité** pour toute gestion documentaire. Le consulter AVANT toute création/modification de documentation.

**Responsable :** Équipe CyLimit  
**Révision :** Mensuelle (1er de chaque mois)

