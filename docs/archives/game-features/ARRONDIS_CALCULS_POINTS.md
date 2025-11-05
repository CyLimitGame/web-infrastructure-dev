# 📐 Arrondis des Calculs de Points

**OBJECTIF** : S'assurer que tous les calculs de points sont arrondis à **2 décimales** pour la précision et la cohérence.

**POURQUOI** : 
- Éviter les erreurs d'arrondi accumulées
- Cohérence de l'affichage frontend/backend
- Précision des calculs de bonus

**COMMENT** : Utiliser `Math.round(value * 100) / 100` pour arrondir à 2 décimales

---

## 🎯 Emplacements des Arrondis

### **1. Admin Backend - `game-ranking-point.service.ts`**

#### **A. Fonction utilitaire**
```typescript
private roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
```

#### **B. Calcul des résultats de courses (`calculateRiderScore`)**

**Ligne ~727-731** : Points avec `finishStageRate`
```typescript
point: Math.round((entryPoint.point * finishStageRate) * 100) / 100,
value: Math.round((_.get(role, 'value', 0) * finishStageRate) * 100) / 100,
```

**Ligne ~745-751** : Points `WINNER_OF_STAGE`
```typescript
point: Math.round(Math.min(entryPoint.point, winnerOfStageMaxPoint) * 100) / 100,
value: Math.round(Math.min(_.get(role, 'value', 0), winnerOfStageMaxPoint) * 100) / 100,
```

#### **C. Calcul des équipes (`updateGameTeamResultsWithNewStructure`)**

**Ligne ~939** : Points totaux par rôle
```typescript
const pointsForRole = Math.round((rolePoints?.value || 0) * 100) / 100;
```

**Ligne ~948** : Points par type
```typescript
value: Math.round(value * 100) / 100
```

**Ligne ~960** : Valeur des bonus
```typescript
const bonusValue = Math.round(((bonus.percent / 100) * pointsForRole) * 100) / 100;
```

**Ligne ~963** : Percents des bonus
```typescript
percent: Math.round(bonus.percent * 100) / 100,
```

**Ligne ~975** : Total des bonus
```typescript
const totalBonusPoints = Math.round(bonusByType.reduce((sum, bonus) => sum + bonus.value, 0) * 100) / 100;
```

**Ligne ~984** : Total points avec bonus
```typescript
totalPoints: Math.round((pointsForRole + totalBonusPoints) * 100) / 100,
```

**Ligne ~990** : Accumulation des points de l'équipe
```typescript
teamTotalPoints += Math.round((pointsForRole + totalBonusPoints) * 100) / 100;
```

**Ligne ~998** : Total points de l'équipe
```typescript
totalPoint: Math.round(teamTotalPoints * 100) / 100
```

---

## 📊 Structure des Données Arrondies

### **NftWithResults**
```typescript
{
  totalPointsWithoutBonus: 50.00,        // ✅ Arrondi à 2 décimales
  totalPoints: 79.25,                    // ✅ Arrondi à 2 décimales
  pointsByType: [
    {
      type: 'STAGE_RANKING',
      value: 25.50                       // ✅ Arrondi à 2 décimales
    },
    {
      type: 'GENERAL_CLASSIFICATION',
      value: 24.50                       // ✅ Arrondi à 2 décimales
    }
  ],
  bonusByType: [
    {
      type: 'CAPTAIN',
      percent: 25.00,                    // ✅ Arrondi à 2 décimales
      value: 12.50                       // ✅ Arrondi à 2 décimales (25% de 50)
    },
    {
      type: 'LEVEL_XP',
      percent: 10.50,                    // ✅ Arrondi à 2 décimales
      value: 5.25                        // ✅ Arrondi à 2 décimales (10.5% de 50)
    }
  ]
}
```

### **GameTeam**
```typescript
{
  totalPoint: 158.50,                    // ✅ Arrondi à 2 décimales (somme de tous les NFTs)
  nftIds: [ /* NftWithResults[] */ ]
}
```

### **RaceResults (race_results_YYYY)**
```typescript
{
  riderResults: [
    {
      pcsRiderId: 123,
      points: [
        {
          type: 'STAGE_RANKING',
          value: 50.00,                  // ✅ Arrondi à 2 décimales
          roles: [
            {
              name: 'GC',
              value: 60.00               // ✅ Arrondi à 2 décimales
            },
            {
              name: 'SPR',
              value: 40.00               // ✅ Arrondi à 2 décimales
            }
          ]
        }
      ],
      roles: [
        {
          name: 'GC',
          value: 75.50                   // ✅ Arrondi à 2 décimales (total pour ce rôle)
        }
      ]
    }
  ]
}
```

---

## ✅ Validation

### **Tests à effectuer**

1. **Calcul de course** :
   - Lancer le calcul d'une course
   - Vérifier que tous les `value` dans `race_results_YYYY` sont arrondis à 2 décimales

2. **Calcul d'équipe** :
   - Calculer les résultats d'une équipe
   - Vérifier que `totalPointsWithoutBonus`, `totalPoints`, `pointsByType[].value`, `bonusByType[].value` sont arrondis

3. **Bonus** :
   - Ajouter de l'XP à un NFT
   - Vérifier que le recalcul du bonus XP est arrondi

---

## 🔮 Améliorations Futures

- [ ] Créer une fonction utilitaire globale `roundToTwoDecimals()` dans `/common/utils`
- [ ] Ajouter des tests unitaires pour vérifier les arrondis
- [ ] Documenter le format des nombres dans le frontend (affichage avec toFixed(2))

---

**Date de création** : 30 septembre 2025  
**Dernière mise à jour** : 30 septembre 2025
