# 📋 Plan : Gestion des Bonus dans GameTeams

## 🎯 Objectif
Séparer les points de base des bonus et gérer correctement le calcul et la persistance des bonus (Captain, Rarity, Level/XP, Special).

---

## 📊 Situation Actuelle

### Admin Backend (✅ Partiellement fait)
- ✅ Schema `NftWithResults` avec `totalPoints`, `pointsByType`, `bonusByType`
- ✅ Calcul des points de base depuis `race_results`
- ❌ `bonusByType` est vide (toujours `[]`)
- ❌ Pas de distinction entre `totalPoints` et `totalPointsWithoutBonus`

### User Backend (❌ Pas à jour)
- ❌ Ancien schéma avec `NftRider`, `CardResult`, `freeCards`, `naCards`
- ❌ Besoin de synchronisation avec Admin Backend
- ✅ Bonus déjà calculés côté Frontend (`Participate/MyTeam/Card.tsx`)
- ✅ Endpoint XP existe (`NftXpService.addXpFromUserToNft`)
- ❌ Update XP ne met pas à jour les `game_teams`
- 🚨 **BUG** : NFT vendu pas retiré des `game_teams` futures

---

## 🔍 Détails des Bonus

### Types de Bonus (Addition)

1. **Captain Bonus** : `25%` (fixe)
   - Appliqué si `nft.id === gameTeam.captainId`

2. **Rarity Bonus** : Variable selon division
   - Récupéré depuis `division.rarityBonuses[nft.rarity]`
   - Ex: `{ trainee: 5, blue: 10, pink: 15, yellow: 20 }`

3. **Level/XP Bonus** : Variable selon niveau NFT
   - Récupéré depuis `bonusLevel.percents` selon `nft.totalXp`
   - Ex: `[{ level: 1, percent: 5 }, { level: 2, percent: 10 }, ...]`

4. **Special Bonus** : Configuration globale
   - **`cardFirstOwner`** : Bonus si premier propriétaire
   - **`lastPrintedSeason`** : Bonus si carte de l'année en cours
   - Récupéré depuis `GlobalKeyEnum.SPECIAL_BONUS`

**Calcul Total** : 
```typescript
totalBonus = captainBonus + rarityBonus + levelBonus + specialBonus
totalPoints = totalPointsWithoutBonus * (1 + totalBonus / 100)
```

---

## 🔄 Process Complet

### 1️⃣ **Création/Update d'équipe** (User Frontend → User Backend)
**Quand** : L'utilisateur crée ou modifie son équipe

**Ce qui est enregistré** :
- ✅ Bonus **percents** calculés (depuis frontend qui les affiche déjà)
- ❌ Bonus **points** = 0 (pas encore de résultats)
- ❌ `totalPoints` = 0
- ❌ `totalPointsWithoutBonus` = 0

**Structure sauvegardée** :
```typescript
nftIds: [{
  id: ObjectId,
  role: StatusEnum,
  pcsRaceId: ObjectId,
  index: 0,
  totalPoints: 0,  // Sera calculé plus tard
  totalPointsWithoutBonus: 0,  // Sera calculé plus tard
  pointsByType: [],  // Sera calculé plus tard
  bonusByType: [  // ✅ CALCULÉ ICI
    { type: 'captain', percent: 25, value: 0 },
    { type: 'rarity', percent: 15, value: 0 },
    { type: 'level_xp', percent: 10, value: 0 },
    { type: 'special', percent: 5, value: 0 }
  ]
}]
```

---

### 2️⃣ **Update XP** (User Frontend → User Backend)
**Quand** : L'utilisateur augmente l'XP d'une carte alignée

**Conditions** :
- Game pas encore terminée
- Race liée au NFT pas encore commencée

**Actions** :
- Recalculer le `percent` du **Level/XP Bonus**
- Mettre à jour UNIQUEMENT ce `percent` dans `bonusByType`
- Recalculer les `value` du bonus XP : `percent * totalPointsWithoutBonus / 100`
- Recalculer `totalPoints` : `totalPointsWithoutBonus + sum(bonusByType.value)`

---

### 3️⃣ **Calcul des Points** (Admin Backend - Cron / Manuel)
**Quand** : Calcul des résultats de game_teams

**Actions** :
1. Récupérer les résultats depuis `race_results_YYYY`
2. Calculer `totalPointsWithoutBonus` (somme des `pointsByType`)
3. Calculer `pointsByType` pour chaque NFT (depuis `race_results`)
4. **NE PAS recalculer les `percent` des bonus** (déjà enregistrés)
5. Calculer les `value` de chaque bonus : `percent * totalPointsWithoutBonus / 100`
6. Calculer `totalPoints` : `totalPointsWithoutBonus + sum(bonusByType.value)`

**Important** : Les `percent` ne sont JAMAIS recalculés ici, seulement les `value` !

---

## 📝 Tâches à Réaliser

### 🚨 ÉTAPE 0 : BUG FIX - NFT Vendu

#### 0.1 Backend - Retirer NFT des game_teams futures
**Fichier** : `cylimit-backend-develop/src/modules/nft/services/nft-fixed.service.ts`

**Modifier `sellNft()`** (après ligne 81) :
```typescript
// Retirer le NFT des game_teams futures (games non commencées)
await this.gameTeamService.removeNftFromFutureTeams(id);
```

**Nouvelle méthode dans `GameTeamService`** :
```typescript
public async removeNftFromFutureTeams(nftId: Types.ObjectId): Promise<void> {
  // 1. Trouver toutes les games non commencées
  const futureGames = await this.gameModel.find({
    startDate: { $gt: new Date() }
  }).select('_id');
  
  const futureGameIds = futureGames.map(g => g._id);
  
  // 2. Supprimer les game_teams contenant ce NFT
  await this.gameTeamPartitionService.deleteMany({
    gameId: { $in: futureGameIds },
    'nftIds.id': nftId
  });
}
```

#### 0.2 Frontend - Ajouter alerte dans modal
**🔍 TODO** : Trouver le modal de vente de NFT
- Rechercher dans `cylimit-frontend-develop/src/features/Cards/`
- Probablement un composant avec "Sell" ou "Market" dans le nom

**Ajouter avertissement** :
```tsx
<Alert status="warning" mb={4}>
  <AlertIcon />
  <Box>
    <AlertTitle>⚠️ Attention !</AlertTitle>
    <AlertDescription>
      En mettant cette carte en vente, elle sera automatiquement retirée 
      de toutes vos équipes inscrites aux jeux à venir. Ces équipes 
      deviendront invalides et devront être modifiées.
    </AlertDescription>
  </Box>
</Alert>
```

---

### 🔴 ÉTAPE 1 : Mise à jour des Schémas

#### 1.1 Admin Backend Schema ✅
- [x] Ajouter `totalPointsWithoutBonus` dans `NftWithResults`
- [x] Modifier `TeamRiderPoint` : `points` → `value`
- [x] Schema `BonusPoint` déjà correct

#### 1.2 User Backend Schema ❌
- [ ] Copier le nouveau schéma depuis Admin Backend
- [ ] Supprimer `freeCardIds`, `naCardIds`, `results`, `acquiredResults`
- [ ] Remplacer par `NftWithResults[]`

---

### 🔴 ÉTAPE 2 : Service de Calcul des Bonus Percents

#### 2.1 Créer/Réutiliser `BonusCalculationService` (Partagé)
**Fichier** : `src/modules/game/services/bonus-calculation.service.ts`

**⚠️ NOTE** : La logique existe déjà !
- ✅ Frontend : `Participate/MyTeam/Card.tsx` ligne 171-177
- ✅ Backend : `NftService.getNftWithBonus()` retourne les bonus percents

**Méthodes à créer/réutiliser** :
```typescript
// Calculer tous les percents d'un NFT
calculateBonusPercents(params: {
  nftId: ObjectId,
  isCaptain: boolean,
  division: GameDivision,
  bonusLevel: BonusLevel,
  specialBonus?: SpecialBonus,
  game: Game
}): BonusPoint[]

// Calculer UNIQUEMENT le percent XP (réutiliser getNftWithBonus)
calculateXpBonusPercent(nft: Nft, bonusLevel: BonusLevel): number

// Calculer les points depuis les percents
calculateBonusPoints(bonusByType: BonusPoint[], basePoints: number): BonusPoint[]
```

---

### 🔴 ÉTAPE 3 : User Backend - Création/Update Équipe

#### 3.1 Modifier `GameTeamService.createTeam()`
**Fichier** : `cylimit-backend-develop/src/modules/game/services/game-team.service.ts`

**Logique** :
```typescript
1. Valider les NFTs (déjà fait)
2. Pour chaque NFT :
   - Récupérer division, game, bonusLevel, specialBonus
   - Calculer bonusByType avec bonusCalculationService.calculateBonusPercents()
   - Créer NftWithResults avec bonusByType mais totalPoints = 0
3. Sauvegarder game_team
```

#### 3.2 Modifier `GameTeamService.updateTeam()`
**Même logique que createTeam**

---

### 🔴 ÉTAPE 4 : User Backend - Update XP

**Fichier** : `src/modules/nft/services/nft-xp.service.ts`

**⚠️ NOTE** : Endpoint XP existe déjà : `addXpFromUserToNft()` ligne 38-98
- ✅ Page frontend : `Cards/_nft_id` avec bouton "Boost XP"
- ❌ Ne met PAS à jour les game_teams actuellement

**Modifier `addXpToNft()`** (ligne 100-105) :
```typescript
public async addXpToNft(nftId: ObjectId, xp: number): Promise<UpdateWriteOpResult> {
  // 1. Update NFT totalXp (déjà fait)
  const result = await this.nftModel.updateOne({ _id: nftId }, { $inc: { totalXp: xp } });
  
  // 2. 🆕 Update bonus XP dans game_teams futures
  await this.gameTeamService.updateXpBonusForNft(nftId);
  
  return result;
}
```

**Nouvelle méthode `GameTeamService.updateXpBonusForNft()`** :

**Logique** :
```typescript
1. Vérifier conditions (game pas finie, race pas commencée)
2. Récupérer le nouveau niveau NFT
3. Recalculer percent = bonusCalculationService.calculateXpBonusPercent()
4. Trouver le bonus XP dans bonusByType et mettre à jour le percent
5. Si totalPointsWithoutBonus > 0 : recalculer value et totalPoints
6. Sauvegarder game_team(s)
```

---

### 🔴 ÉTAPE 5 : Admin Backend - Calcul Points

#### 5.1 Modifier `GameRankingPointService.updateGameTeamResultsWithNewStructure`

**Ligne 942+** : Après avoir calculé `pointsByType`

```typescript
// Calculer totalPointsWithoutBonus
const totalPointsWithoutBonus = pointsByType.reduce((sum, p) => sum + p.value, 0);

// Les bonusByType existent déjà avec les percents
// On calcule juste les value
const bonusByType = nft.bonusByType || [];
const updatedBonusByType = bonusByType.map(bonus => ({
  ...bonus,
  value: (bonus.percent / 100) * totalPointsWithoutBonus
}));

// Calculer totalPoints
const bonusValue = updatedBonusByType.reduce((sum, b) => sum + b.value, 0);
const totalPoints = totalPointsWithoutBonus + bonusValue;

const nftWithResults = {
  id: nft.id,
  role: nft.role,
  pcsRaceId: nft.pcsRaceId,
  index: nft.index || 0,
  totalPoints,
  totalPointsWithoutBonus,
  pointsByType,
  bonusByType: updatedBonusByType
};
```

---

### 🔴 ÉTAPE 6 : Frontend User - Affichage

**Fichiers** : `cylimit-frontend-develop/src/features/Game/`
- LineUp.tsx
- GameDetail/TeamComposition.tsx

**Modifications** :
- Afficher `totalPointsWithoutBonus` et `totalPoints`
- Afficher détails `bonusByType` avec percent et value
- Garder l'affichage existant des bonus qui fonctionne déjà

---

### 🔴 ÉTAPE 7 : Nettoyage & Tests

#### 7.1 Supprimer les logs de debug
- [ ] Admin Backend `GameRankingPointService`
- [ ] User Backend si des logs ont été ajoutés

#### 7.2 Tests
- [ ] Créer game_team → bonusByType avec percents
- [ ] Update XP → percent XP mis à jour
- [ ] Calculer résultats → points calculés correctement
- [ ] Vendre NFT → retiré des game_teams futures
- [ ] Frontend → affichage correct

---

## 🎯 Résumé Ordre d'Exécution

1. **ÉTAPE 0** : Fix bug NFT vendu (urgent - data integrity)
2. **ÉTAPE 1** : Schemas (Admin ✅, User ❌)
3. **ÉTAPE 2** : Service Bonus (réutiliser existant)
4. **ÉTAPE 3** : User Backend création/update équipe
5. **ÉTAPE 4** : User Backend update XP
6. **ÉTAPE 5** : Admin Backend calcul points
7. **ÉTAPE 6** : Frontend affichage
8. **ÉTAPE 7** : Nettoyage

---

## 🔑 Points Clés :

1. **Nouveaux champs** : `totalPointsWithoutBonus` + modification de `totalPoints`
2. **Percents enregistrés** lors de création/update d'équipe (pas recalculés)
3. **Update XP** met à jour uniquement le percent du bonus XP
4. **Calcul points** utilise les percents existants pour calculer les value bonus
5. **Service partagé** `BonusCalculationService` pour centraliser la logique (ou réutiliser `getNftWithBonus`)

---

## ❓ Questions Clarifiées

1. ✅ **Special Bonus** : Configuration globale dans `GlobalKeyEnum.SPECIAL_BONUS`
   - `cardFirstOwner` : Bonus premier propriétaire
   - `lastPrintedSeason` : Bonus saison actuelle
2. ✅ **Bonus multiples** : Addition (25% + 15% = 40%)
3. ✅ **Bonus négatifs** : Oui, malus possibles
4. **Calcul partiel** : Si une race n'a pas encore eu lieu, on calcule quand même les bonus sur les autres ?

---

---

## 📝 Améliorations Futures

### ✅ FAIT : Centralisation du bonus captain
- Backend : `SpecialBonusDto.captainBonus` + `BonusSpecialService.getCaptainBonus()`
- Frontend : `DEFAULT_CAPTAIN_BONUS = 25` dans `/utils/bonus.ts`

### 🔜 TODO PRIORITAIRE : Déplacer captainBonus dans game_rules
**❗ IMPORTANT** : Le `captainBonus` devrait être dans `game_rules` et non global !

**Pourquoi ?**
- Permet d'avoir des **bonus captain différents par jeu**
- Plus cohérent avec l'architecture existante (comme les bonus de rareté)
- Le frontend récupère déjà `game_rules` lors de la création d'équipe

**Architecture actuelle (temporaire)** :
- Backend : `SpecialBonusDto.captainBonus` (global via `key_values`)
- Frontend : `DEFAULT_CAPTAIN_BONUS = 25` (hardcodé)

**Architecture cible** :
```typescript
// Schema game_rules
{
  // ... existing fields
  captainBonus: number; // Par défaut 25
}
```

**À faire** :
1. ✅ **Backend** :
   - Ajouter `captainBonus: number` dans le schéma `game_rules`
   - Modifier `BonusCalculationService` pour accepter `captainBonus` en param
   - Passer `game.captainBonus` lors de l'appel à `calculateBonusPercents()`
   
2. ✅ **Frontend** :
   - Récupérer `captainBonus` depuis `game_rules` (déjà fetchées)
   - Passer cette valeur à `getBonusFromBackendOrCalculate()`
   
3. ✅ **Admin** :
   - Ajouter champ `captainBonus` dans l'UI de création/édition de jeu

**Bénéfices** :
- ✅ Bonus captain configurable **par jeu**
- ✅ Pas besoin d'API supplémentaire
- ✅ Cohérent avec l'architecture existante
- ✅ Plus flexible pour des événements spéciaux

---

**Que voulez-vous faire maintenant ?**
- A) Répondre aux questions puis démarrer par l'ÉTAPE 0 (Bug NFT vendu)
- B) Commencer directement par l'ÉTAPE 1.1 (finaliser le schema Admin)
- C) Autre priorité ?