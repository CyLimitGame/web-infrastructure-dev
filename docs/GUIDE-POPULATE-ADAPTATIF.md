# 🚀 Guide d'Implémentation : Système Populate Adaptatif

## 📋 Checklist Rapide pour Nouvelles Entités

### ✅ **Étape 1 : Analyser les Besoins**
- [ ] Identifier les contextes d'usage (liste, détail, admin, export)
- [ ] Lister les relations de l'entité (populate possibles)
- [ ] Évaluer la taille des données selon les contextes
- [ ] Définir les presets nécessaires

### ✅ **Étape 2 : Créer les Presets**
```bash
# Créer le fichier de presets
touch src/modules/[ENTITY]/constants/populate-presets.ts
```

**Template de base :**
```typescript
import { PopulateOption, PopulatePresetEnum } from '@/common/interfaces/populate-options.interface';

export const [ENTITY]_POPULATE_PRESETS: Record<PopulatePresetEnum, PopulateOption[]> = {
  [PopulatePresetEnum.MINIMAL]: [
    // Relations essentielles uniquement
    { path: 'owner', select: 'name' }
  ],
  
  [PopulatePresetEnum.STANDARD]: [
    // Relations courantes pour l'affichage normal
    { path: 'owner', select: 'name email' },
    { path: 'category', select: 'name' }
  ],
  
  [PopulatePresetEnum.FULL]: [
    // Toutes les relations pour l'admin
    { path: 'owner', select: 'name email createdAt' },
    { path: 'category', select: 'name description' },
    { path: 'history', select: 'action date user' }
  ]
};

export function get[Entity]PopulatePreset(preset: PopulatePresetEnum): PopulateOption[] {
  return [ENTITY]_POPULATE_PRESETS[preset] || [ENTITY]_POPULATE_PRESETS[PopulatePresetEnum.STANDARD];
}
```

### ✅ **Étape 3 : Modifier le Repository**

**Ajouter la méthode helper :**
```typescript
// Dans [entity].repository.ts
import { PopulateOption, PopulatePresetEnum } from '@/common/interfaces/populate-options.interface';
import { get[Entity]PopulatePreset } from './constants/populate-presets';

private applyPopulate(queryBuilder: any, populateOptions?: PopulateOption[]): any {
  if (!populateOptions || populateOptions.length === 0) {
    populateOptions = get[Entity]PopulatePreset(PopulatePresetEnum.STANDARD);
  }

  populateOptions.forEach(option => {
    if (option.populate) {
      queryBuilder = queryBuilder.populate({
        path: option.path,
        select: option.select,
        populate: option.populate
      });
    } else {
      queryBuilder = queryBuilder.populate(option.path, option.select);
    }
  });

  return queryBuilder;
}
```

**Modifier les méthodes existantes :**
```typescript
// Avant
public async findAll(filters: FilterDto): Promise<ListDto<Entity>> {
  return this.entityModel
    .find(query)
    .populate('owner', 'name')
    .populate('category', 'name')
    .exec();
}

// Après
public async findAll(
  filters: FilterDto, 
  populateOptions?: PopulateOption[]
): Promise<ListDto<Entity>> {
  let queryBuilder = this.entityModel.find(query);
  queryBuilder = this.applyPopulate(queryBuilder, populateOptions);
  return queryBuilder.exec();
}
```

### ✅ **Étape 4 : Adapter le Service**

```typescript
// Dans [entity].service.ts
import { get[Entity]PopulatePreset } from './constants/populate-presets';

public async findAll(filters: FilterDto, context?: string): Promise<ListDto<Entity>> {
  let populatePreset: PopulateOption[];
  
  switch(context) {
    case 'list':
      populatePreset = get[Entity]PopulatePreset(PopulatePresetEnum.MINIMAL);
      break;
    case 'admin':
      populatePreset = get[Entity]PopulatePreset(PopulatePresetEnum.FULL);
      break;
    default:
      populatePreset = get[Entity]PopulatePreset(PopulatePresetEnum.STANDARD);
  }
  
  return this.entityRepository.findAll(filters, populatePreset);
}
```

### ✅ **Étape 5 : Adapter le Contrôleur**

```typescript
// Dans [entity].controller.ts
@Get()
public async getEntities(
  @Query() filters: FilterDto,
  @Query('context') context?: string
): Promise<ListDto<Entity>> {
  return this.entityService.findAll(filters, context);
}
```

---

## 🎯 Exemples Concrets par Entité

### **🏆 Games/Competitions**
```typescript
// Contextes identifiés
MINIMAL: Liste des jeux (nom, date)
STANDARD: Vue utilisateur (+ règles, récompenses)  
FULL: Admin (+ participants, statistiques)
EXPORT: Rapports (données plates)

// Presets
MINIMAL: [{ path: 'competition', select: 'name startDate' }]
STANDARD: [
  { path: 'competition', select: 'name startDate rules' },
  { path: 'rewards', select: 'type amount' }
]
FULL: [
  { path: 'competition', select: 'name startDate rules createdBy' },
  { path: 'teams', select: 'name totalPoints' },
  { path: 'rewards', select: 'type amount distributed' },
  { path: 'participants', select: 'nickName email' }
]
```

### **👥 Users/Profiles**
```typescript
// Contextes identifiés  
MINIMAL: Liste utilisateurs (nom, avatar)
PROFILE: Profil public (+ équipes, favoris)
ADMIN: Gestion admin (+ transactions, logs)
EXPORT: Export RGPD (toutes données)

// Presets
MINIMAL: [{ path: 'avatar', select: 'url' }]
PROFILE: [
  { path: 'avatar', select: 'url filename' },
  { path: 'teams', select: 'name' },
  { path: 'favorites', select: 'name rarity' }
]
ADMIN: [
  { path: 'avatar', select: 'url filename size' },
  { path: 'teams', select: 'name createdAt' },
  { path: 'transactions', select: 'amount type date' },
  { path: 'loginHistory', select: 'ip date' }
]
```

### **🚴 Riders/Teams**
```typescript
// Contextes identifiés
MINIMAL: Liste coureurs (nom, équipe actuelle)
STANDARD: Fiche coureur (+ stats, historique)
FULL: Admin (+ contrats, transferts)
EXPORT: Base de données (tout)

// Presets  
MINIMAL: [{ path: 'actualTeam', select: 'name' }]
STANDARD: [
  { path: 'actualTeam', select: 'name class' },
  { path: 'stats', select: 'averageScore wins' },
  { path: 'nfts', select: 'rarity yearOfEdition' }
]
FULL: [
  { path: 'actualTeam', select: 'name class budget' },
  { path: 'stats', select: 'averageScore wins podiums' },
  { path: 'nfts', select: 'rarity yearOfEdition owner' },
  { path: 'contracts', select: 'startDate endDate salary' },
  { path: 'transfers', select: 'fromTeam toTeam date' }
]
```

---

## 📊 Métriques et Monitoring

### **Performance Tracking**
```typescript
// Ajouter dans chaque service
const startTime = Date.now();
const result = await this.repository.findAll(filters, populateOptions);
const responseTime = Date.now() - startTime;

this.metricsService.track('entity.search', {
  preset: preset,
  responseTime: responseTime,
  dataSize: JSON.stringify(result).length,
  itemCount: result.items.length
});
```

### **Tableau de Bord Performance**
```typescript
// Métriques à surveiller par preset
- Temps de réponse moyen
- Taille des réponses  
- Fréquence d'usage
- Erreurs par preset
```

---

## 🔧 Outils et Helpers

### **Script de Génération Automatique**
```bash
# Créer un script pour générer les fichiers de base
./scripts/generate-populate-system.sh [entity-name]
```

### **Tests de Performance**
```typescript
// Template de test
describe('[Entity] Populate Performance', () => {
  it('should be faster with MINIMAL preset', async () => {
    const start = Date.now();
    await service.findAll(filters, 'minimal');
    const minimalTime = Date.now() - start;
    
    const start2 = Date.now();
    await service.findAll(filters, 'full');
    const fullTime = Date.now() - start2;
    
    expect(minimalTime).toBeLessThan(fullTime);
  });
});
```

### **Validation des Presets**
```typescript
// Helper pour valider que les presets sont cohérents
export function validatePresets(presets: Record<string, PopulateOption[]>) {
  // Vérifier que tous les paths existent dans le schema
  // Vérifier que les selects sont valides
  // Alerter sur les presets trop lourds
}
```

---

## 🎯 Checklist de Validation

### ✅ **Avant Déploiement**
- [ ] Tous les presets sont définis et testés
- [ ] Les méthodes repository acceptent populateOptions
- [ ] Les services utilisent les presets selon le contexte
- [ ] Les contrôleurs exposent le paramètre context si nécessaire
- [ ] Les tests de performance sont OK
- [ ] La documentation est à jour

### ✅ **Après Déploiement**
- [ ] Monitoring des performances activé
- [ ] Métriques collectées par preset
- [ ] Feedback utilisateurs sur les temps de réponse
- [ ] Optimisation des presets selon l'usage réel

---

*Guide d'implémentation - Système Populate Adaptatif*
*Créé le 11/09/2025 pour CyLimit*
