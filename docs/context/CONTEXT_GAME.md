# 🎮 CONTEXTE COMPLET - SYSTÈME DE JEU FANTASY CYCLISME

**Date :** 6 Novembre 2025  
**Version :** 1.0 - Documentation Complète du Game System  
**Objectif :** Document de référence pour comprendre le système de jeu fantasy CyLimit

---

## 💰 COÛT DE CHARGEMENT DE CE CONTEXTE

**Taille du fichier :** 938 lignes  
**Nombre de tokens :** ~11,700 tokens  
**Coût par chargement :** ~$0.035 (à $3/M tokens input)  
**Budget token restant après chargement :** ~988,300 tokens (sur 1M)

**⚠️ RÈGLE IMPORTANTE :**
- ✅ **TOUJOURS mettre à jour ces chiffres** après chaque modification de ce fichier
- ✅ Compter les lignes avec `wc -l CONTEXT_GAME.md`
- ✅ Estimer tokens : ~12.5 tokens par ligne en moyenne
- ✅ Recalculer le coût : (nombre_tokens / 1,000,000) × $3
- ✅ Mettre à jour la date de dernière modification

**Dernière mise à jour compteurs :** 6 Novembre 2025 - 12h35

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'Ensemble](#vue-densemble)
2. [Concept du Jeu](#concept-du-jeu)
3. [Système de Rôles Multi-Spécialisés](#système-de-rôles-multi-spécialisés)
4. [Modes de Jeu](#modes-de-jeu)
5. [Création d'Équipe](#création-déquipe)
6. [Système de Scoring](#système-de-scoring)
7. [Système de Bonus](#système-de-bonus)
8. [Classements et Récompenses](#classements-et-récompenses)
9. [Intégration ProCyclingStats](#intégration-procyclingstats)
10. [Architecture Technique](#architecture-technique)

---

## 🎯 VUE D'ENSEMBLE

### Concept

**CyLimit est un jeu fantasy cyclisme** où les utilisateurs :
1. **Collectionnent** des cartes NFT de coureurs cyclistes
2. **Créent des équipes** pour des courses réelles
3. **Gagnent des points** basés sur les performances réelles des coureurs
4. **Montent dans les classements** et gagnent des récompenses (USDC, XP, NFTs)

### Caractéristiques Uniques

| Feature | Description | Différence vs Sorare/MPG |
|---------|-------------|--------------------------|
| **Système Multi-Rôles** | Chaque coureur a 6 scores différents (leader, sprinter, grimpeur, etc.) | ⭐ Unique à CyLimit |
| **Cartes NFT** | Propriété réelle sur blockchain | Similaire Sorare |
| **Courses Réelles** | Données ProCyclingStats en temps réel | Standard |
| **Récompenses USDC** | Crypto-monnaie réelle gagnée | ⭐ Rare (Sorare = ETH) |
| **2 Modes** | CAP (budget) + GLOBAL (expert) | Similaire Sorare |

---

## 🎭 CONCEPT DU JEU

### Flow Utilisateur Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPÉRIENCE UTILISATEUR                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INSCRIPTION & ONBOARDING                                    │
│     ├─ Créer compte (email ou social)                          │
│     ├─ Vérifier email                                          │
│     ├─ Créer Embedded Wallet (Coinbase)                        │
│     └─ Recevoir Welcome Pack (cartes gratuites)                │
│                                                                 │
│  2. COLLECTION                                                  │
│     ├─ Acheter packs (marché primaire)                         │
│     ├─ Acheter cartes (marketplace secondaire)                 │
│     ├─ Gagner cartes (rewards games)                           │
│     └─ Gérer son portefeuille NFT                              │
│                                                                 │
│  3. COMPÉTITION                                                 │
│     ├─ Choisir une course à venir                              │
│     ├─ Créer équipe (8 coureurs + capitaine)                   │
│     ├─ Suivre la course en direct                              │
│     ├─ Voir les points en temps réel                           │
│     └─ Découvrir son classement                                │
│                                                                 │
│  4. RÉCOMPENSES                                                 │
│     ├─ Gagner USDC (top 3 chaque division)                     │
│     ├─ Gagner XP (niveau utilisateur)                          │
│     ├─ Débloquer achievements                                  │
│     └─ Monter de division                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏆 SYSTÈME DE RÔLES MULTI-SPÉCIALISÉS

### Les 6 Rôles CyLimit

⭐ **INNOVATION MAJEURE** : Contrairement aux autres jeux fantasy (1 score global), CyLimit utilise **6 scores spécialisés par coureur**.

| Rôle | Nom Français | Description | Exemple Coureur |
|------|--------------|-------------|-----------------|
| **leader** | Leader / GC | Classement général, victoires courses | Tadej Pogačar |
| **climber** | Grimpeur | Étapes de montagne, cols | Jonas Vingegaard |
| **sprinter** | Sprinteur | Sprints, étapes plates | Mark Cavendish |
| **domestic** | Équipier | Aide coéquipiers, travail d'équipe | Wout van Aert |
| **free_electron** | Électron libre | Échappées, attaques | Mathieu van der Poel |
| **cap** | Score Global | Qualité générale du coureur | Tous |

### Pourquoi Multi-Rôles ?

```
❌ Jeux classiques (1 score) :
- Pogačar = 95 points
- Van Aert = 92 points
- → Pogačar toujours meilleur

✅ CyLimit (6 scores) :
- Pogačar:
  ├─ leader: 98 ⭐
  ├─ climber: 95 ⭐
  ├─ sprinter: 15 ❌
  ├─ domestic: 30 ❌
  ├─ free_electron: 45
  └─ cap: 92

- Van Aert:
  ├─ leader: 75
  ├─ climber: 60
  ├─ sprinter: 92 ⭐
  ├─ domestic: 88 ⭐
  ├─ free_electron: 95 ⭐
  └─ cap: 85

→ Pogačar meilleur pour GC
→ Van Aert meilleur pour sprints, équipier, attaques
→ Stratégie plus profonde !
```

### Attribution des Rôles dans une Équipe

Lors de la création d'équipe, le user **assigne chaque carte à 1 rôle spécifique** :

```typescript
// Exemple : Équipe Tour de France
const team = {
  nftIds: [
    { id: "card1", role: "leader", riderId: 123 },    // Pogačar en leader
    { id: "card2", role: "climber", riderId: 456 },   // Vingegaard en grimpeur
    { id: "card3", role: "sprinter", riderId: 789 },  // Cavendish en sprinteur
    { id: "card4", role: "domestic", riderId: 321 },  // Van Aert en équipier
    { id: "card5", role: "free_electron", riderId: 654 }, // MVDP en électron libre
    // ... 3 autres cartes
  ],
  captainId: "card1", // Pogačar capitaine (bonus x2)
};
```

**Important :**
- ✅ Chaque carte ne marque des points **QUE** dans le rôle assigné
- ✅ Pogačar en "leader" → utilise son score leader (98)
- ✅ Pogačar en "sprinter" → utilise son score sprinter (15) ⚠️ Mauvais choix
- ✅ Stratégie = Assigner chaque coureur à son meilleur rôle

---

## 🎲 MODES DE JEU

### Mode CAP (Budget)

**Principe :** Créer une équipe avec un **budget de CAP limité**

```typescript
// Règles
const capMode = {
  mode: 'CAP',
  budget: 600, // Total CAP disponible (varie par division)
  teamSize: 8, // 8 coureurs
  divisions: [
    { name: 'League 4', budget: 400, rarityRules: { white: [0, 8], blue: [0, 5] } },
    { name: 'League 3', budget: 500, rarityRules: { white: [0, 6], blue: [0, 6], pink: [0, 2] } },
    { name: 'League 2', budget: 600, rarityRules: { blue: [0, 8], pink: [0, 4], yellow: [0, 2] } },
    { name: 'League 1', budget: 700, rarityRules: { pink: [0, 8], yellow: [0, 4] } },
  ]
};
```

**Exemple :**
```
User crée équipe League 2 (budget 600 CAP) :
- Pogačar (CAP 95) → 95/600
- Vingegaard (CAP 92) → 187/600
- Cavendish (CAP 78) → 265/600
- Van Aert (CAP 88) → 353/600
- MVDP (CAP 85) → 438/600
- Roglič (CAP 90) → 528/600
- Alaphilippe (CAP 72) → 600/600 ✅ Budget OK

Total : 600 CAP (limite atteinte)
```

### Mode GLOBAL (Expert)

**Principe :** Créer une équipe **sans limite de budget** (meilleurs coureurs possibles)

```typescript
const globalMode = {
  mode: 'GLOBAL',
  levelRequired: 10, // User doit être niveau 10+
  teamSize: 8,
  divisions: [
    { name: 'League 4', rarityRules: { white: [0, 8], blue: [0, 5] } },
    { name: 'League 3', rarityRules: { white: [0, 6], blue: [0, 6], pink: [0, 2] } },
    { name: 'League 2', rarityRules: { blue: [0, 8], pink: [0, 4], yellow: [0, 2] } },
    { name: 'League 1', rarityRules: { pink: [0, 8], yellow: [0, 4] } },
  ]
};
```

**Différence :**
- ❌ Pas de limite CAP
- ✅ User peut mettre 8× coureurs à CAP 95
- ⚠️ Limité par raretés (pas 8× yellow)

---

## 🏁 CRÉATION D'ÉQUIPE

### Flow Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRÉATION D'ÉQUIPE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SÉLECTION COURSE                                            │
│     ├─ User choisit une course à venir (ex: Tour de France)    │
│     ├─ Voir mode (CAP ou GLOBAL)                               │
│     ├─ Voir divisions disponibles                              │
│     └─ Voir règles (budget, raretés)                           │
│                                                                 │
│  2. SÉLECTION DIVISION                                          │
│     ├─ League 1 (expert) → Budget élevé                        │
│     ├─ League 2 (confirmé)                                     │
│     ├─ League 3 (intermédiaire)                                │
│     └─ League 4 (débutant) → Budget bas                        │
│                                                                 │
│  3. SÉLECTION CARTES                                            │
│     ├─ Voir ses cartes éligibles (start list)                  │
│     ├─ Filtrer par rareté, rôle, CAP                           │
│     ├─ Assigner chaque carte à 1 rôle                          │
│     ├─ Vérifier budget CAP (mode CAP)                          │
│     ├─ Vérifier raretés (ex: max 2 pink)                       │
│     └─ Choisir capitaine (bonus x2)                            │
│                                                                 │
│  4. VALIDATION BACKEND                                          │
│     ├─ Vérifier ownership NFTs                                 │
│     ├─ Vérifier règles division                                │
│     ├─ Vérifier course pas commencée                           │
│     ├─ Vérifier carte pas déjà utilisée                        │
│     ├─ Calculer bonus (capitaine, division, etc.)              │
│     └─ Créer team en DB                                        │
│                                                                 │
│  5. ÉQUIPE CRÉÉE                                                │
│     └─ Équipe visible dans "Mes Équipes"                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Règles de Validation

```typescript
// game-team.service.ts - createTeam()

// 1. Vérifier ownership
const isOwned = await this.nftOwnerService.isExistedOwnerNfts(nftIds, userId);
if (!isOwned) throw new Error('Cards not owned');

// 2. Vérifier nombre de cartes
if (totalCards !== roles.length) throw new Error('Invalid number of cards');

// 3. Vérifier raretés
const rarityRules = division.rarityRules; // { blue: [0, 8], pink: [0, 4] }
for (const [rarity, [min, max]] of Object.entries(rarityRules)) {
  const count = cardsWithRarity[rarity] || 0;
  if (count < min || count > max) {
    throw new Error('Rarity rules not respected');
  }
}

// 4. Vérifier budget CAP (si mode CAP)
if (gameMode === 'CAP') {
  const totalCap = _.sumBy(riders, r => r.averageCapScore);
  if (totalCap > division.budget) {
    throw new Error('Budget exceeded');
  }
}

// 5. Vérifier carte pas déjà utilisée
const existingTeams = await this.gameTeamService.find({
  createdBy: userId,
  gameId: { $in: activeGameIds }
});
const usedNftIds = _.flatMap(existingTeams, 'nftIds');
if (_.find(usedNftIds, { id: nftId, pcsRaceId: raceId })) {
  throw new Error('Card already used in another competition');
}

// 6. Vérifier course pas commencée
if (race.date_start < new Date()) {
  throw new Error('Race already started');
}

// 7. Calculer bonus
const bonusByType = await this.bonusService.calculateBonusPercents({
  nftId,
  isCaptain,
  division,
  bonusLevelId
});
```

---

## 📊 SYSTÈME DE SCORING

### Architecture Multi-Niveaux

```
┌─────────────────────────────────────────────────────────────────┐
│              CALCUL DES POINTS (3 NIVEAUX)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NIVEAU 1 : FORMULES DE BASE (Ranking Formulas)                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 17 Types de Points MatrixRoleEnum                         │ │
│  │ - STAGE_RANKING : Position étape                          │ │
│  │ - GENERAL_CLASSIFICATION_RANKING : Position GC            │ │
│  │ - KOM_POINTS : Points montagne                            │ │
│  │ - BREAKAWAY : Présence échappée                           │ │
│  │ - WINNER_OF_STAGE : Victoire étape                        │ │
│  │ - POINTS : Points sprint                                  │ │
│  │ - ... (11 autres types)                                   │ │
│  │                                                            │ │
│  │ Formule Exemple (STAGE_RANKING) :                         │ │
│  │ - 1er : 100 points                                        │ │
│  │ - 2e : 85 points                                          │ │
│  │ - 3e : 75 points                                          │ │
│  │ - ...                                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  NIVEAU 2 : COEFFICIENTS PAR RÔLE (Matrix Roles)               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Chaque type de point applique des coefficients           │ │
│  │                                                            │ │
│  │ STAGE_RANKING (100 points) →                              │ │
│  │   ├─ leader: 100 × 0.8 = 80 points                        │ │
│  │   ├─ climber: 100 × 0.4 = 40 points                       │ │
│  │   ├─ sprinter: 100 × 0.2 = 20 points                      │ │
│  │   └─ cap: 100 × 0.3 = 30 points                           │ │
│  │                                                            │ │
│  │ BREAKAWAY (50 points) →                                    │ │
│  │   ├─ free_electron: 50 × 0.9 = 45 points                  │ │
│  │   ├─ leader: 50 × 0.1 = 5 points                          │ │
│  │   └─ cap: 50 × 0.3 = 15 points                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  NIVEAU 3 : AGRÉGATION PAR RÔLE (Final Scores)                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Somme de tous les types de points pour chaque rôle       │ │
│  │                                                            │ │
│  │ Pogačar Tour de France :                                  │ │
│  │   leader = 80 (stage) + 150 (GC) + 5 (breakaway) = 235   │ │
│  │   climber = 40 (stage) + 120 (KOM) + 10 (breakaway) = 170│ │
│  │   sprinter = 20 (stage) + 0 (sprint) = 20                │ │
│  │   cap = 30 (stage) + 45 (GC) + 15 (breakaway) = 90       │ │
│  │                                                            │ │
│  │ → Le user qui a mis Pogačar en "leader" gagne 235 pts    │ │
│  │ → Le user qui a mis Pogačar en "sprinter" gagne 20 pts   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 17 Types de Points (MatrixRoleEnum)

| Type | Description | Rôles Principaux | Coefficient Max |
|------|-------------|------------------|-----------------|
| **STAGE_RANKING** | Position à l'arrivée d'étape | leader, sprinter | 0.8 |
| **GENERAL_CLASSIFICATION_RANKING** | Position au classement général | leader | 1.0 |
| **KOM_POINTS** | Points meilleur grimpeur | climber | 0.9 |
| **POINTS** | Points sprint | sprinter | 0.9 |
| **BREAKAWAY** | Présence dans l'échappée | free_electron | 0.9 |
| **WINNER_OF_STAGE** | Victoire d'étape | leader, sprinter | 1.0 |
| **GENERAL_CLASSIFICATION_JERSEY** | Maillot jaune porté | leader | 1.0 |
| **KOM_CLASSIFICATION_JERSEY** | Maillot à pois porté | climber | 1.0 |
| **POINTS_CLASSIFICATION_JERSEY** | Maillot vert porté | sprinter | 1.0 |
| **BETTER_STAGE_RANKING_TEAMMATE** | Meilleur équipier étape | domestic | 0.7 |
| **BETTER_GENERAL_CLASSIFICATION_RANKING_TEAMMATE** | Meilleur équipier GC | domestic | 0.8 |
| **BEST_TEAMMATE_BONUS** | Bonus équipier | domestic | 0.5 |
| **BEST_TEAMMATE_MALUS** | Malus équipier | domestic | -0.3 |
| **FINISH_STAGE** | Finir l'étape | Tous | 0.1 |
| **INTERMEDIATE_SPRINTS_PRESENCE** | Sprints intermédiaires | sprinter, free_electron | 0.3 |
| **STAGE_RANKING_OF_RIDER_TEAM** | Classement équipe | domestic | 0.4 |
| **STARTER** | Participation | Tous | 0.05 |

---

## 🎁 SYSTÈME DE BONUS

### Types de Bonus

```typescript
// bonusByType stocké dans game_teams.nftIds[].bonusByType
const bonusByType = [
  {
    type: 'CAPTAIN',           // Capitaine de l'équipe
    percent: 100,              // +100% des points
    value: 0,                  // Calculé après course (pts × 1.0)
  },
  {
    type: 'DIVISION',          // Bonus de division
    percent: 20,               // +20% (League 1)
    value: 0,
  },
  {
    type: 'FIRST_OWNER',       // ⚠️ À SUPPRIMER (selon roadmap)
    percent: 10,               // +10%
    value: 0,
  },
  {
    type: 'LAST_SEASON',       // ⚠️ À SUPPRIMER (selon roadmap)
    percent: 5,                // +5%
    value: 0,
  },
];
```

### Calcul Bonus (Exemple)

```
Pogačar (leader) :
- Points de base : 235
- Capitaine : +100% → +235
- Division (L1) : +20% → +47
- First Owner : +10% → +23.5 (à supprimer)
- Last Season : +5% → +11.75 (à supprimer)

Total avec bonus : 235 + 235 + 47 + 23.5 + 11.75 = 552.25 points
```

**⚠️ Roadmap (Prochaines Étapes) :**
- 🔴 **Supprimer** bonus FIRST_OWNER
- 🔴 **Supprimer** bonus LAST_SEASON
- ✅ **Garder** bonus CAPTAIN
- ✅ **Garder** bonus DIVISION

---

## 🏅 CLASSEMENTS ET RÉCOMPENSES

### Classement par Division

```typescript
// Chaque division a son propre classement
const rankings = {
  'League 1': [
    { userId: 'user1', totalPoints: 1250, rank: 1 }, // 🥇 1er
    { userId: 'user2', totalPoints: 1180, rank: 2 }, // 🥈 2e
    { userId: 'user3', totalPoints: 1150, rank: 3 }, // 🥉 3e
    // ...
  ],
  'League 2': [
    { userId: 'user4', totalPoints: 980, rank: 1 },
    // ...
  ]
};
```

### Récompenses par Position

```typescript
// Exemple Tour de France - League 2
const rewards = {
  '1': {
    usdc: 50,          // 50 USDC
    xp: 1000,          // 1000 XP
    jackpot: 10,       // Part du jackpot
  },
  '2': {
    usdc: 30,
    xp: 750,
    jackpot: 5,
  },
  '3': {
    usdc: 20,
    xp: 500,
    jackpot: 3,
  },
  '4-10': {
    usdc: 10,
    xp: 250,
  },
  '11-50': {
    xp: 100,
  }
};
```

---

## 🔌 INTÉGRATION PROCYCLINGSTATS

### Qu'est-ce que ProCyclingStats ?

**ProCyclingStats (PCS)** est une base de données complète du cyclisme professionnel qui fournit :
- ✅ Calendrier des courses
- ✅ Résultats en temps réel
- ✅ Profils des coureurs
- ✅ Statistiques détaillées

### Architecture Intégration

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTÉGRATION PCS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ProCyclingStats API                                            │
│  https://www.procyclingstats.com/dataservice.php               │
│                                                                 │
│  ↓ Cron Jobs Admin (quotidien)                                 │
│                                                                 │
│  1. SYNCHRONISATION COURSES                                     │
│     POST /admin/pro-cycling-stats/sync-races                   │
│     ├─ Récupère toutes les courses du mois                     │
│     ├─ Sauvegarde en MongoDB (pcs_races)                       │
│     └─ Met à jour date_start, date_end, parcours               │
│                                                                 │
│  2. SYNCHRONISATION START LISTS                                 │
│     POST /admin/pro-cycling-stats/sync-startlists              │
│     ├─ Pour chaque course à venir                              │
│     ├─ Récupère liste des coureurs engagés                     │
│     └─ Sauvegarde race.startList[]                             │
│                                                                 │
│  3. SYNCHRONISATION RÉSULTATS                                   │
│     POST /admin/pro-cycling-stats/sync-results                 │
│     ├─ Pour chaque étape terminée                              │
│     ├─ Récupère résultats (classement, sprints, KOM, etc.)     │
│     ├─ Calcule les points via GameRankingPointService          │
│     └─ Sauvegarde dans pcs_races.riderResults                  │
│                                                                 │
│  4. CALCUL SCORES ÉQUIPES                                       │
│     Déclenché après chaque étape                               │
│     ├─ Récupère toutes les équipes du game                     │
│     ├─ Pour chaque carte : récupère score du rôle assigné      │
│     ├─ Applique les bonus                                      │
│     └─ Calcule totalPoints équipe                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Collections MongoDB (PCS Data)

```typescript
// Collection: pcs_races
{
  _id: ObjectId,
  race_id: 12345,              // ID PCS
  name: "Tour de France",
  classification: "2.UWT",     // Catégorie UCI
  date_start: "2025-07-05",
  date_end: "2025-07-27",
  is_onedayrace: 0,            // 0 = course par étapes, 1 = classique
  category: 5,                 // Prestige (1-5)
  startList: [ObjectId, ...],  // Coureurs engagés
  stages: [
    {
      stage_nr: 1,
      distance: 180,
      profile_score: 2,        // Difficulté profil
      winner_rider_id: 789,
    }
  ],
  riderResults: [              // Calculé par admin backend
    {
      pcsRiderId: 123,
      roles: [
        { name: 'leader', points: 235 },
        { name: 'climber', points: 170 },
        // ...
      ]
    }
  ]
}

// Collection: pcs_riders
{
  _id: ObjectId,
  rider_id: 123,               // ID PCS
  first_name: "Tadej",
  last_name: "Pogačar",
  nation: "SLO",
  team: "UAE Team Emirates",
  averageCapScore: 95,         // Score CAP moyen
}
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Services Clés

```typescript
// 1. GameTeamService
// - Création/modification équipes
// - Validation règles
// - Calcul bonus
createTeam(gameId, userId, createTeamDto)
updateTeam(teamId, userId, gameId, updateTeamDto)

// 2. GameRankingPointService
// - Calcul points coureurs
// - Application coefficients rôles
calculateRiderScore(rankingTemplateId, raceId)
calculateGameRankingPoints(gameId, raceId)

// 3. RankingFormulaService
// - Formules de calcul (17 types)
getStageRankingPoints(template, races)
getGeneralClassificationRanking(template, races)
getKOMPoints(template, races)
// ... 14 autres

// 4. BonusCalculationService
// - Calcul bonus (capitaine, division, etc.)
calculateBonusPercents(nftId, isCaptain, division)

// 5. ProCyclingStatsService
// - Synchronisation données PCS
syncRacesToDatabase(month, year)
syncStartLists(raceId)
fetchRaceResults(raceId)
```

### Collections MongoDB (Game)

```typescript
// game_teams_2025 (partitionné par année)
{
  _id: ObjectId,
  gameId: ObjectId,            // Référence au game
  createdBy: ObjectId,         // User qui a créé l'équipe
  divisionId: ObjectId,        // League 1/2/3/4
  captainId: ObjectId,         // Carte capitaine (bonus x2)
  nftIds: [                    // Cartes dans l'équipe
    {
      id: ObjectId,            // ID de la carte NFT
      role: 'leader',          // Rôle assigné
      pcsRaceId: ObjectId,     // Course pour cette carte
      capScore: 95,            // Score CAP de la carte
      totalPoints: 552,        // Points avec bonus
      totalPointsWithoutBonus: 235, // Points bruts
      bonusByType: [           // Détails bonus
        { type: 'CAPTAIN', percent: 100, value: 235 },
        { type: 'DIVISION', percent: 20, value: 47 },
      ],
      pointsByType: [          // Détails calcul
        { type: 'STAGE_RANKING', value: 80 },
        { type: 'GENERAL_CLASSIFICATION_RANKING', value: 150 },
      ]
    },
    // ... 7 autres cartes
  ]
}

// games
{
  _id: ObjectId,
  name: "Tour de France 2025",
  gameMode: 'CAP',             // ou 'GLOBAL'
  status: 'COMING',            // ou 'IN_PROGRESS', 'FINISHED'
  races: [                     // Courses incluses
    {
      pcsRaceId: ObjectId,     // Référence pcs_races
      race: { ...raceDetails }
    }
  ],
  rule: {
    roles: [                   // 8 rôles à remplir
      { role: 'leader', index: 0 },
      { role: 'climber', index: 1 },
      { role: 'sprinter', index: 2 },
      { role: 'domestic', index: 3 },
      { role: 'free_electron', index: 4 },
      { role: 'leader', index: 5 },      // Peut répéter
      { role: 'climber', index: 6 },
      { role: 'sprinter', index: 7 },
    ],
    leagues: [                 // Divisions disponibles
      {
        divisionId: ObjectId,
        options: {             // Règles de raretés
          white: [0, 8],       // Min 0, Max 8 blanches
          blue: [0, 5],        // Min 0, Max 5 bleues
          pink: [0, 2],
          yellow: [0, 0],      // Interdites
        }
      }
    ]
  },
  creditLeagues: [             // Budgets (si mode CAP)
    { divisionId: ObjectId, credit: 600 }
  ],
  bonusLevelId: ObjectId,      // Niveau de bonus
}
```

---

## 🎮 TYPES DE COURSES

### Classification

| Type | Description | Exemples | Durée |
|------|-------------|----------|-------|
| **Monument** | Classique majeure (5) | Paris-Roubaix, Tour des Flandres | 1 jour |
| **Grand Tour** | 3 semaines | Tour de France, Giro, Vuelta | 21 jours |
| **Stage Race** | Course par étapes | Paris-Nice, Dauphiné | 5-10 jours |
| **One Day Race** | Classique | GP de Québec, E3 Saxo Classic | 1 jour |

### Catégories UCI

```typescript
// Hiérarchie des courses (category)
const categories = {
  5: 'Grand Tour, Monument',        // Prestige maximum
  4: 'WorldTour Stage Race',
  3: 'WorldTour One Day',
  2: 'Pro Series',
  1: 'Continental',
};
```

---

## 📱 EXPÉRIENCE UTILISATEUR

### Flow Game Complet (UX)

```
AVANT LA COURSE :
1. User → Page "Games à venir"
   ├─ Voir Tour de France (5-27 juillet)
   ├─ Voir mode : CAP
   └─ Clic "Créer mon équipe"

2. User → Page "Création équipe"
   ├─ Choisir division (League 2, budget 600)
   ├─ Voir ses cartes éligibles
   ├─ Drag & drop 8 cartes sur les rôles
   ├─ Vérifier budget : 598/600 ✅
   ├─ Choisir capitaine (Pogačar)
   └─ Clic "Créer équipe"

3. ✅ Équipe créée
   └─ "Votre équipe pour le Tour de France est prête !"

PENDANT LA COURSE :
4. Chaque jour (après étape)
   ├─ Cron job récupère résultats PCS
   ├─ Calcul scores automatique
   └─ Mise à jour classement

5. User → Page "Mes Équipes"
   ├─ Voir équipe Tour de France
   ├─ Voir points par carte
   ├─ Voir total : 3250 points
   └─ Voir classement : 12e / 450

APRÈS LA COURSE :
6. Classement final
   ├─ 12e position
   ├─ Récompenses : 10 USDC + 250 XP
   └─ Débloque achievement "Top 50 Grand Tour"
```

---

## 🚀 FUTURES ÉVOLUTIONS (Roadmap)

### Prochaines Features (Prochaines Étapes)

#### 1. 🔴 Suppression Bonus Obsolètes
- ❌ Supprimer FIRST_OWNER bonus
- ❌ Supprimer LAST_SEASON bonus
- ✅ Simplifier calcul bonus

#### 2. 🔴 Nouveau Système de Packs
- ✅ Packs payants avec prix évolutif
- ✅ Packs achetables avec Essence
- ✅ Nouveau pack chaque semaine
- ✅ Nouveau pack 48h avant MR/MT (Monument/Tour)

#### 3. 🔴 Système Essence & Welcome Pack
- ✅ Essence White (monnaie du jeu)
- ✅ Welcome Pack offert inscription
- ✅ Pack offert avant chaque MR/MT

#### 4. 🔴 UX/UI Amélioration
- ✅ Revoir création d'équipe (style Sorare)
- ✅ Affichage plus simple et intuitif
- ✅ Drag & drop amélioré

#### 5. 🔴 Système de Prêt de Cartes
- ✅ UX/UI pour prêter cartes entre users
- ✅ Conditions et durées de prêt

#### 6. 🔴 Modes de Jeu Multiples
- ✅ Revoir affichage games
- ✅ Game par game avec différents modes
- ✅ Modes spéciaux (sprint, montagne, etc.)

#### 7. 🔴 Système XP/Niveau Revu
- ❌ Supprimer niveau user
- ✅ Remplacer par système XP → Essence
- ✅ Système de coffre (stocker XP)

#### 8. 🔴 Gestion Essence Avancée
- ✅ Coffre pour stocker/débloquer XP
- ✅ Coût XP pour retirer du coffre (gestion frustration)
- ✅ Achat White avec Essence (régulation prix)

#### 9. 🔴 App Mobile
- ✅ Copier UX création d'équipe
- ✅ Notifications push (course commence, résultats, etc.)

#### 10. 🔴 Affiliation
- ✅ Revoir système affiliés
- ✅ Vérifier que ça fonctionne bien
- ✅ Cf. retours Luc (MP Valentin)

---

## 🎯 MÉTRIQUES ACTUELLES

### Utilisation

```
Games actifs/mois : ~30-40
├─ Grand Tours : 3-4
├─ Monuments : 4-5
├─ Stage Races : 15-20
└─ One Day Races : 10-15

Équipes créées/game :
├─ League 1 : ~50-100
├─ League 2 : ~100-200
├─ League 3 : ~150-250
└─ League 4 : ~200-300

Taux participation : ~60%
(60% des users actifs créent au moins 1 équipe/mois)
```

### Récompenses Distribuées

```
USDC distribué/mois : ~500-800 USDC
XP distribué/mois : ~500,000 XP
NFTs distribués/mois : ~100-150 cartes
```

---

## 🔧 CONFIGURATION

### Variables d'Environnement

```bash
# ProCyclingStats
PCS_API_URL=https://www.procyclingstats.com/dataservice.php
PCS_API_TIMEOUT=30000

# Calculs
RANKING_CALCULATION_ENABLED=true
AUTO_SYNC_RACES=true
AUTO_SYNC_RESULTS=true

# Cron Jobs
CRON_SYNC_RACES="0 2 * * *"        # Tous les jours 2h
CRON_SYNC_RESULTS="0 */2 * * *"    # Toutes les 2h
CRON_CALCULATE_SCORES="0 */3 * * *" # Toutes les 3h
```

---

## 📚 RÉFÉRENCES TECHNIQUES

### Fichiers Backend Clés

```
User Backend :
- src/modules/game/services/game-team.service.ts
- src/modules/game/services/game-ranking-point.service.ts
- src/modules/game/services/ranking-formula.service.ts
- src/modules/game/services/bonus-calculation.service.ts
- src/modules/pro-cycling-stats/services/pro-cycling-stats.service.ts

Admin Backend :
- src/modules/game/services/game-ranking-point.service.ts (calculs admin)
- src/modules/pro-cycling-stats/services/pro-cycling-stats-race.service.ts
```

### Fichiers Frontend Clés

```
User Frontend :
- src/features/core/Common/TeamCreated/index.tsx
- src/queries/useGame.ts
- src/features/Game/GameContext.tsx
```

---

**Maintenu par :** Équipe CyLimit  
**Date :** 6 Novembre 2025  
**Version :** 1.0 - Contexte Game Complet
