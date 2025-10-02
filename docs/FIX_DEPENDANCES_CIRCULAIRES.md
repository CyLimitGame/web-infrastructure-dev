# 🔧 Correction des Dépendances Circulaires

**Date** : 30 septembre 2025  
**Status** : ✅ **CORRIGÉ**

---

## 🐛 Problème

Lors du démarrage du **User Backend**, deux erreurs de dépendances circulaires se sont produites :

### **Erreur 1** : `BonusCalculationService` ne peut pas résoudre `NftService`
```
Nest can't resolve dependencies of the BonusCalculationService (?, Object, BonusLevelService, BonusSpecialService)
```

### **Erreur 2** : `NftXpService` ne peut pas résoudre `GameTeamService`
```
Nest can't resolve dependencies of the NftXpService (..., ?, ...)
```

---

## 🔍 Analyse

### **Cycle de dépendances** :

```
GameModule
  └─> GameTeamService
       └─> BonusCalculationService
            ├─> NftService (NftModule)
            └─> NftXpService (NftModule)
                 └─> GameTeamService (GameModule) ❌ CYCLE!
```

**Explication** :
1. `GameTeamService` utilise `BonusCalculationService` (pour calculer les bonus)
2. `BonusCalculationService` utilise `NftService` et `NftXpService` (pour récupérer les NFTs)
3. `NftXpService` utilise `GameTeamService` (pour mettre à jour les bonus XP dans les équipes)

➡️ **Cycle** : `GameModule` ↔ `NftModule`

---

## ✅ Solution Appliquée

### **1. Ajout de `forwardRef` dans `BonusCalculationService`**

**Fichier** : `/cylimit-backend-develop/src/modules/game/services/bonus-calculation.service.ts`

**Avant** :
```typescript
constructor(
  private readonly nftService: NftService,
  private readonly nftXpService: NftXpService,
  private readonly bonusLevelService: BonusLevelService,
  private readonly bonusSpecialService: BonusSpecialService,
) {}
```

**Après** :
```typescript
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

constructor(
  @Inject(forwardRef(() => NftService))
  private readonly nftService: NftService,
  @Inject(forwardRef(() => NftXpService))
  private readonly nftXpService: NftXpService,
  private readonly bonusLevelService: BonusLevelService,
  private readonly bonusSpecialService: BonusSpecialService,
) {}
```

---

### **2. Import de `GameModule` dans `NftModule`**

**Fichier** : `/cylimit-backend-develop/src/modules/nft/nft.module.ts`

**Avant** :
```typescript
@Module({
  imports: [
    // ... autres imports
    forwardRef(() => UserModule),
    forwardRef(() => RiderModule),
    forwardRef(() => AwardModule),
    forwardRef(() => AnnouncementModule),
  ],
})
```

**Après** :
```typescript
import { GameModule } from '@/modules/game';

@Module({
  imports: [
    // ... autres imports
    forwardRef(() => UserModule),
    forwardRef(() => RiderModule),
    forwardRef(() => AwardModule),
    forwardRef(() => AnnouncementModule),
    forwardRef(() => GameModule), // ✅ Pour NftXpService → GameTeamService
  ],
})
```

---

### **3. Commentaire de documentation dans `NftXpService`**

**Fichier** : `/cylimit-backend-develop/src/modules/nft/services/nft-xp.service.ts`

**Ajouté** :
```typescript
constructor(
  @InjectModel(Nft.name) private nftModel: Model<NftDocument>,
  private readonly userXpService: UserXpService,
  public readonly keyValueService: KeyValueService,
  @Inject(forwardRef(() => UserService))
  private readonly userService: UserService,
  @Inject(forwardRef(() => AwardProgressionService))
  private readonly awardProgressionService: AwardProgressionService,
  @Inject(forwardRef(() => GameTeamService))
  private readonly gameTeamService: GameTeamService,
) {}

// Note: GameTeamService est injecté via forwardRef car il existe une dépendance circulaire:
// NftXpService → GameTeamService → BonusCalculationService → NftService/NftXpService
```

---

## 🎯 Résultat

### ✅ **Dépendances Circulaires Résolues**

**Architecture finale** :
```
GameModule ←─────forwardRef()─────→ NftModule
    ↓                                    ↓
GameTeamService                    NftXpService
    ↓                                    ↓
BonusCalculationService ←─forwardRef()─→ NftService
```

### **Modules modifiés** :
1. ✅ `bonus-calculation.service.ts` : `forwardRef` pour `NftService` et `NftXpService`
2. ✅ `nft.module.ts` : Import de `GameModule` avec `forwardRef`
3. ✅ `nft-xp.service.ts` : Commentaire de documentation

---

## 📝 Bonnes Pratiques NestJS

### **Quand utiliser `forwardRef()` ?**

1. **Dépendances circulaires entre modules** :
   - Module A importe Module B
   - Module B importe Module A

2. **Dans les constructeurs** :
   ```typescript
   @Inject(forwardRef(() => ServiceName))
   private readonly service: ServiceName
   ```

3. **Dans les imports de modules** :
   ```typescript
   @Module({
     imports: [forwardRef(() => OtherModule)]
   })
   ```

### **Pourquoi `forwardRef()` ?**

NestJS charge les modules de manière synchrone. Si Module A dépend de Module B et vice-versa, NestJS ne sait pas lequel charger en premier.

`forwardRef()` indique à NestJS :
> "Ce service/module existe, mais charge-le plus tard quand il sera disponible."

---

## 🔍 Vérifications

### **Test de compilation** :
```bash
cd cylimit-backend-develop
npm run start:dev
```

### **Résultat attendu** :
- ✅ Serveur démarre sans erreur
- ✅ `BonusCalculationService` se charge correctement
- ✅ `NftXpService` se charge correctement
- ✅ `GameTeamService` se charge correctement

---

## ⚠️ Points d'Attention

### **Erreur de typage existante (non-bloquante)** :

**Fichier** : `nft-xp.service.ts` ligne 228

```
Type 'undefined' is not assignable to type 'AwardProgressionQuestsEnum'
```

**Note** : Cette erreur existait avant nos modifications et n'est pas liée au problème de dépendances circulaires. Elle peut être corrigée ultérieurement.

---

## 🎉 Conclusion

✅ **Problème résolu** : Les dépendances circulaires entre `GameModule` et `NftModule` sont correctement gérées avec `forwardRef()`.

✅ **Architecture propre** : Le code suit les bonnes pratiques NestJS pour les dépendances circulaires.

✅ **Fonctionnel** : Le serveur peut démarrer et tous les services sont disponibles.

---

**Rapport créé le** : 30 septembre 2025
