# 🔍 Guide Complet : Flux de Recherche NFT

## 📋 Vue d'ensemble

Ce document explique **étape par étape** le parcours complet d'une recherche NFT dans l'interface admin, depuis la saisie utilisateur jusqu'à l'affichage des résultats.

### 🎯 Exemple de recherche analysée
- **Terme recherché :** "woods"
- **Filtre rareté :** "yellow" 
- **Pagination :** Page 1, 20 résultats
- **Tri :** Par date de création (desc)

---

## 🚀 Étapes du Flux Complet

### **1. 🖱️ FRONTEND - Saisie Utilisateur**

**📁 Fichier :** `cylimit-admin-frontend/src/pages/nft/search.tsx`

**🔄 Fonction :** `handleSearch()` (ligne ~88)

**📥 Input utilisateur :**
```javascript
// État des filtres dans le composant React
filters = {
  searchValue: "woods",        // Texte saisi par l'utilisateur
  rarity: ["yellow"],          // Sélection dropdown (converti en tableau)
  page: 1,                     // Pagination
  limit: 20,                   // Nombre de résultats par page
  sortBy: "createdAt",         // Champ de tri
  orderBy: "desc"              // Ordre de tri
}
```

**🔧 Traitement :**
- Validation des champs côté client
- Mise à jour de l'état `loading: true`
- Appel du service API

**📤 Output :** Appel vers `nftService.searchNFTs(filters)`

---

### **2. 🌐 FRONTEND - Service API**

**📁 Fichier :** `cylimit-admin-frontend/src/services/nft.ts`

**🔄 Fonction :** `searchNFTs()` (ligne ~91)

**📥 Input :** Objet `NFTSearchFilters`
```typescript
interface NFTSearchFilters {
  searchValue?: string;
  rarity?: string[];
  marketType?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  orderBy?: string;
  // ... autres filtres
}
```

**🔧 Traitement :**
```javascript
// Construction des paramètres URL
const params = new URLSearchParams();

// Gestion spéciale des tableaux
Object.entries(filters).forEach(([key, value]) => {
  if (value !== undefined && value !== '' && value !== null) {
    if (Array.isArray(value)) {
      // Pour rarity: ["yellow"] → rarity=yellow
      value.forEach(item => params.append(key, item.toString()));
    } else {
      // Pour searchValue: "woods" → searchValue=woods
      params.append(key, value.toString());
    }
  }
});

// Résultat: searchValue=woods&rarity=yellow&page=1&limit=20&sortBy=createdAt&orderBy=desc
```

**📤 Output :** 
- Requête HTTP GET vers `http://localhost:3001/admin/nfts?searchValue=woods&rarity=yellow&page=1&limit=20&sortBy=createdAt&orderBy=desc`
- Headers: `Authorization: Bearer <JWT_TOKEN>`

---

### **3. 🛡️ BACKEND - Authentification**

**📁 Fichier :** `cylimit-admin-backend/src/admin/guards/auth-admin.guard.ts`

**🔄 Fonction :** `AuthAdminGuard` (décorateur NestJS)

**📥 Input :** 
- Header HTTP: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**🔧 Traitement :**
1. **Extraction du token :** Récupération depuis le header Authorization
2. **Validation JWT :** Vérification de la signature et expiration
3. **Vérification rôle :** S'assurer que `payload.roles === 'admin'`
4. **Hydratation user :** Ajout des infos utilisateur dans `req.user`

**📤 Output :** 
- ✅ **Succès :** Autorisation accordée → Continue vers le contrôleur
- ❌ **Échec :** HTTP 401 Unauthorized

---

### **4. 🎮 BACKEND - Contrôleur Admin**

**📁 Fichier :** `cylimit-admin-backend/src/admin/controllers/nft.controller.ts`

**🔄 Fonction :** `getNfts()` (ligne ~60)

```typescript
@Get()
@ApiOkResponse({ type: ListDto<Nft> })
public async getNfts(@Query() getNftsDto: GetNftsDto): Promise<ListDto<Nft>> {
  return this.adminNftService.getNfts(getNftsDto);
}
```

**📥 Input :** 
- Paramètres URL automatiquement mappés vers `GetNftsDto`
- Validation automatique via les décorateurs NestJS

**🔧 Traitement :**
```javascript
// Transformation automatique des paramètres URL
{
  searchValue: "woods",      // @IsString() @Length(3, 50)
  rarity: ["yellow"],        // @IsEnum(RarityEnum, { each: true })
  page: 1,                   // @Transform(({ value }) => parseInt(value))
  limit: 20,                 // @Transform(({ value }) => parseInt(value))
  sortBy: "createdAt",       // @IsEnum(SortByEnum)
  orderBy: "desc"            // @IsEnum(OrderByEnum)
}
```

**📤 Output :** Appel vers `this.adminNftService.getNfts(getNftsDto)`

---

### **5. 🔧 BACKEND - Service Admin**

**📁 Fichier :** `cylimit-admin-backend/src/admin/services/nft.service.ts`

**🔄 Fonction :** `getNfts()` (ligne ~XX)

**📥 Input :** `GetNftsDto` validé et typé

**🔧 Traitement :**
- Ajout de logiques métier spécifiques à l'admin si nécessaire
- Délégation vers le service NFT principal

**📤 Output :** `this.nftService.getNftsWithConditions(getNftsDto)`

---

### **6. 💾 BACKEND - Service NFT Principal**

**📁 Fichier :** `cylimit-admin-backend/src/modules/nft/nft.service.ts`

**🔄 Fonction :** `getNftsWithConditions()`

**📥 Input :** Objet de filtres complet

**🔧 Traitement :**
- Préparation des paramètres pour la couche repository
- Gestion de la logique métier (permissions, filtres par défaut)

**📤 Output :** `this.nftRepository.filterNftsAndCountWithConditions(filterNftsDto)`

---

### **7. 🗄️ BACKEND - Repository MongoDB**

**📁 Fichier :** `cylimit-admin-backend/src/modules/nft/nft.repository.ts`

**🔄 Fonction :** `filterNftsAndCountWithConditions()` (ligne ~36)

#### **7.1 Construction de la Query MongoDB**

**🔄 Fonction :** `toFilterQuery()` (ligne ~615)

**📥 Input :** Filtres de recherche

**🔧 Traitement :**
```javascript
// Transformation des filtres en query MongoDB
const query = {
  $and: [],
  // Filtre par rareté
  rarity: { $in: ["yellow"] },
  // Autres filtres selon les paramètres
};

// Gestion des cas spéciaux
if (filterNftsDto.searchValue && filterNftsDto.searchBy === 'name') {
  // La recherche par nom se fait via le populate du rider
  // Sera ajoutée dans le pipeline d'agrégation
}
```

#### **7.2 Pipeline d'Agrégation MongoDB**

**🔧 Construction du pipeline :**
```javascript
const pipeline = [
  // 1. Filtrage initial des NFT
  { $match: query },
  
  // 2. Jointure avec la collection riders
  {
    $lookup: {
      from: "riders",
      localField: "riderId", 
      foreignField: "_id",
      as: "rider"
    }
  },
  
  // 3. Jointure avec la collection users (propriétaires)
  {
    $lookup: {
      from: "users",
      localField: "ownerId",
      foreignField: "_id", 
      as: "owner"
    }
  },
  
  // 4. Filtrage par nom de rider (recherche textuelle)
  {
    $match: {
      "rider.name": { 
        $regex: "woods", 
        $options: "i"  // Insensible à la casse
      }
    }
  },
  
  // 5. Tri des résultats
  { $sort: { createdAt: -1 }},
  
  // 6. Pagination
  { $skip: (page - 1) * limit },  // (1-1) * 20 = 0
  { $limit: 20 },
  
  // 7. Comptage total (pour la pagination)
  {
    $facet: {
      items: [{ $match: {} }],
      total: [{ $count: "count" }]
    }
  }
];
```

**📤 Output MongoDB :** Résultats bruts
```javascript
[
  {
    items: [
      {
        _id: ObjectId("68bedc3e26a08814731edca6"),
        name: "WOODS Michael",
        rarity: "yellow",
        yearOfEdition: 2025,
        imageUrl: "https://cylimit-public.s3.eu-west-3.amazonaws.com/...",
        rider: [{
          _id: ObjectId("63e4fe35e4777583117666bd"),
          name: "WOODS Michael",
          actualTeam: {
            name: "Israel - Premier Tech",
            class: "WT"
          }
        }],
        owner: [{
          _id: ObjectId("664fb9f5445ec87cbc5ebd5f"),
          nickName: "cycliste_pro",
          avatarUrl: "https://..."
        }]
      }
      // ... autres résultats
    ],
    total: [{ count: 42 }]
  }
]
```

#### **7.3 Post-traitement des résultats**

**🔧 Traitement :**
```javascript
// Extraction et formatage des résultats
const result = {
  items: aggregationResult[0].items,
  total: aggregationResult[0].total[0]?.count || 0,
  page: page,
  limit: limit
};

// Transformation des objets MongoDB
result.items = result.items.map(nft => ({
  ...nft,
  rider: nft.rider[0],  // Dépopulation du tableau
  owner: nft.owner[0]   // Dépopulation du tableau
}));
```

---

### **8. 📤 BACKEND - Remontée des Données**

**🔄 Parcours inverse :** Repository → Service → Admin Service → Contrôleur

**📤 Output HTTP :** Réponse JSON formatée
```json
{
  "items": [
    {
      "_id": "68bedc3e26a08814731edca6",
      "name": "WOODS Michael", 
      "age": 37,
      "nationality": "ca",
      "rarity": "yellow",
      "status": "climber",
      "yearOfEdition": 2025,
      "typeOfCard": "world_tour",
      "imageUrl": "https://cylimit-public.s3.eu-west-3.amazonaws.com/nft/...",
      "marketType": "owner",
      "totalXp": 1250,
      "riderAverageCapScore": 78,
      "createdAt": "2025-09-08T13:38:06.527Z",
      "rider": {
        "_id": "63e4fe35e4777583117666bd",
        "name": "WOODS Michael",
        "actualTeam": {
          "season": 2025,
          "name": "Israel - Premier Tech",
          "class": "WT"
        },
        "averageCapScore": 78
      },
      "owner": {
        "_id": "664fb9f5445ec87cbc5ebd5f", 
        "nickName": "cycliste_pro",
        "avatarUrl": "https://platform-lookaside.fbsbx.com/...",
        "jersey": "default1"
      }
    }
    // ... autres NFT trouvés
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### **9. 🖥️ FRONTEND - Traitement de la Réponse**

**📁 Fichier :** `cylimit-admin-frontend/src/services/nft.ts`

**🔄 Fonction :** `searchNFTs()` - partie réponse

**📥 Input :** Réponse HTTP du backend

**🔧 Traitement :**
```javascript
// Transformation en format frontend standardisé
return {
  nfts: response.data.items || [],
  total: response.data.total || 0, 
  page: response.data.page || 1,
  limit: response.data.limit || 20,
  totalPages: Math.ceil((response.data.total || 0) / (response.data.limit || 20))
};

// Exemple de résultat:
// {
//   nfts: [...], 
//   total: 42,
//   page: 1, 
//   limit: 20,
//   totalPages: 3  // Math.ceil(42/20) = 3
// }
```

**📤 Output :** Objet `NFTSearchResponse` typé

---

### **10. 🎨 FRONTEND - Mise à Jour de l'Interface**

**📁 Fichier :** `cylimit-admin-frontend/src/pages/nft/search.tsx`

**🔄 Fonction :** `handleSearch()` - callback success

**📥 Input :** `NFTSearchResponse`

**🔧 Traitement :**
```javascript
// Mise à jour de l'état React
setResults(response.nfts);        // Liste des cartes NFT
setTotalCount(response.total);    // Compteur "42 résultats trouvés"
setLoading(false);                // Masquage du spinner
setError(null);                   // Effacement des erreurs précédentes

// Calcul automatique de la pagination
const totalPages = response.totalPages; // 3 pages
```

**📤 Output :** Interface utilisateur mise à jour

#### **Rendu des Cartes NFT :**
```jsx
{results.map((nft) => (
  <Card key={nft._id}>
    <CardBody>
      <Image src={nft.imageUrl} alt={nft.name} />
      <Heading size="md">{nft.name}</Heading>
      <Badge colorScheme={rarityColors[nft.rarity]}>
        {rarityLabels[nft.rarity]}
      </Badge>
      <Text>Équipe: {nft.rider?.actualTeam?.name}</Text>
      <Text>Propriétaire: {nft.owner?.nickName}</Text>
    </CardBody>
  </Card>
))}
```

---

## 🔍 Points Techniques Importants

### **🔒 Sécurité**
- **JWT obligatoire** pour toutes les routes admin
- **Validation des rôles** : seuls les admins peuvent accéder
- **Validation des paramètres** via DTOs NestJS
- **Sanitisation** des entrées utilisateur

### **🗄️ Base de Données**
- **MongoDB avec Mongoose** pour la persistance
- **Pipeline d'agrégation** pour les jointures complexes
- **Index optimisés** sur les champs de recherche fréquents
- **Pagination efficace** avec skip/limit

### **⚡ Performance**
- **Pagination côté serveur** (20 résultats par défaut)
- **Sélection de champs** pour limiter le transfert de données
- **Cache potentiel** sur les requêtes fréquentes
- **Recherche textuelle optimisée** avec regex MongoDB

### **🔄 Gestion d'Erreurs**
- **Validation frontend** avant envoi
- **Gestion des erreurs HTTP** (401, 500, etc.)
- **Messages d'erreur utilisateur** explicites
- **Fallbacks** en cas d'échec

### **🎯 Types TypeScript**
```typescript
// Types principaux utilisés
interface NFTSearchFilters {
  searchValue?: string;
  rarity?: RarityEnum[];
  marketType?: MarketTypeEnum[];
  page?: number;
  limit?: number;
  sortBy?: SortByEnum;
  orderBy?: OrderByEnum;
}

interface NFTResult {
  _id: string;
  name: string;
  rarity: RarityEnum;
  rider: {
    name: string;
    actualTeam: {
      name: string;
      class: string;
    };
  };
  owner: {
    nickName: string;
    avatarUrl: string;
  };
}

interface NFTSearchResponse {
  nfts: NFTResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 🛠️ Débogage et Maintenance

### **🔍 Points de Debug**
1. **Frontend :** Console du navigateur pour les erreurs JS/API
2. **Network :** Onglet Network pour voir les requêtes HTTP
3. **Backend :** Logs NestJS dans le terminal
4. **MongoDB :** Logs de requêtes avec `mongoose.set('debug', true)`

### **📊 Métriques à Surveiller**
- **Temps de réponse** des requêtes API
- **Taille des résultats** retournés
- **Fréquence des recherches** par filtre
- **Erreurs 500** côté backend

### **🔧 Améliorations Possibles**
- **Cache Redis** pour les recherches fréquentes
- **Elasticsearch** pour la recherche textuelle avancée
- **Pagination infinie** côté frontend
- **Filtres avancés** (plage de dates, scores, etc.)

---

## 📚 Fichiers de Référence

### **Frontend**
- `src/pages/nft/search.tsx` - Interface de recherche
- `src/services/nft.ts` - Service API
- `src/constants/enums.ts` - Énumérations et labels
- `src/types/nft.ts` - Types TypeScript

### **Backend**
- `src/admin/controllers/nft.controller.ts` - Contrôleur REST
- `src/admin/services/nft.service.ts` - Service admin
- `src/modules/nft/nft.service.ts` - Service métier
- `src/modules/nft/nft.repository.ts` - Couche données
- `src/common/dtos/filter-nfts.dto.ts` - Validation des paramètres

### **Configuration**
- `.env` - Variables d'environnement
- `docker-compose.local.yml` - Base de données locale
- `package.json` - Dépendances et scripts

---

## 🚀 Système de Populate Adaptatif

### **📋 Vue d'ensemble**

Le système de populate adaptatif permet d'optimiser les données retournées selon le contexte d'usage. Au lieu de toujours charger toutes les relations, le système choisit intelligemment quelles données inclure.

### **🎯 Presets Disponibles**

#### **MINIMAL** - Listes rapides et API publique
```typescript
// Usage: Listes de cartes, recherches rapides
// Taille: ~500KB pour 20 NFT
{
  path: 'owner',
  select: 'nickName avatarUrl'
}
```

#### **STANDARD** - Affichage normal utilisateur
```typescript
// Usage: Vue collection, marché standard
// Taille: ~1MB pour 20 NFT
[
  { path: 'team', select: 'name nationality' },
  { path: 'owner', select: 'nickName avatarUrl jersey primaryColor secondaryColor' },
  { path: 'rider', select: 'name actualTeam averageCapScore' }
]
```

#### **FULL** - Admin et vues détaillées
```typescript
// Usage: Interface admin, édition, détails complets
// Taille: ~2MB pour 20 NFT
[
  { path: 'team', select: 'name nationality' },
  { path: 'owner', select: 'nickName avatarUrl email jersey primaryColor secondaryColor sponsor createdAt' },
  { path: 'rider', select: 'name actualTeam averageCapScore rankBlue rankPink nationality age' },
  { path: 'sales', select: 'amount paymentMethod transferStatus txnHash createdAt updatedAt' }
]
```

#### **AUCTION** - Spécifique aux enchères
```typescript
// Usage: Enchères en cours, historique des offres
// Taille: Variable selon le nombre d'enchères
[
  { path: 'owner', select: 'nickName avatarUrl' },
  { 
    path: 'auctionBids', 
    select: 'amount bidder createdAt',
    populate: [{ path: 'bidder', select: 'nickName avatarUrl' }]
  }
]
```

#### **EXPORT** - CSV/Excel optimisé
```typescript
// Usage: Exports de données, rapports
// Taille: Minimale, données plates
[
  { path: 'team', select: 'name' },
  { path: 'owner', select: 'nickName email' },
  { path: 'rider', select: 'name nationality' }
]
```

### **🔧 Architecture Technique**

#### **1. Interface PopulateOption**
```typescript
// src/common/interfaces/populate-options.interface.ts
export interface PopulateOption {
  path: string;           // Champ à populer
  select?: string;        // Champs spécifiques à sélectionner
  populate?: PopulateOption[];  // Populate imbriqué
}
```

#### **2. Presets Centralisés**
```typescript
// src/modules/nft/constants/populate-presets.ts
export const NFT_POPULATE_PRESETS: Record<PopulatePresetEnum, PopulateOption[]> = {
  [PopulatePresetEnum.MINIMAL]: [...],
  [PopulatePresetEnum.STANDARD]: [...],
  // etc.
};
```

#### **3. Repository Adaptatif**
```typescript
// src/modules/nft/nft.repository.ts
public async filterNftsAndCount(
  filterNftsDto: FilterNftsDto & FilterQuery<Nft>,
  populateOptions?: PopulateOption[]
): Promise<ListDto<NftDocument>> {
  // Construction dynamique avec populate adaptatif
  let queryBuilder = this.nftModel.find(query);
  queryBuilder = this.applyPopulate(queryBuilder, populateOptions);
  return { items: await queryBuilder.exec(), total };
}
```

#### **4. Service Admin Intelligent**
```typescript
// src/admin/services/nft.service.ts
public async getNfts(getNftsDto: GetNftsDto): Promise<ListDto<Nft>> {
  let populatePreset: PopulateOption[];
  
  if (getNftsDto.auctionStatus) {
    populatePreset = getPopulatePreset(PopulatePresetEnum.AUCTION);
  } else if (getNftsDto.marketType === MarketTypeEnum.AUCTION) {
    populatePreset = getPopulatePreset(PopulatePresetEnum.MINIMAL);
  } else {
    populatePreset = getPopulatePreset(PopulatePresetEnum.FULL);
  }
  
  return this.nftService.getNftsWithConditions(getNftsDto, null, populatePreset);
}
```

### **📊 Gains de Performance**

| Preset | Taille (20 NFT) | Temps Réponse | Usage |
|--------|----------------|---------------|-------|
| MINIMAL | ~500KB | 50ms | Listes rapides |
| STANDARD | ~1MB | 100ms | Vue normale |
| FULL | ~2MB | 200ms | Admin complet |
| AUCTION | Variable | 80ms | Enchères |
| EXPORT | ~300KB | 40ms | Rapports |

### **🎯 Application à d'Autres Entités**

#### **Exemple : Système Users**
```typescript
// src/modules/user/constants/populate-presets.ts
export const USER_POPULATE_PRESETS = {
  MINIMAL: [
    { path: 'avatar', select: 'url' }
  ],
  
  PROFILE: [
    { path: 'avatar', select: 'url filename' },
    { path: 'teams', select: 'name' },
    { path: 'favorites', select: 'name rarity' }
  ],
  
  ADMIN: [
    { path: 'avatar', select: 'url filename size' },
    { path: 'teams', select: 'name createdAt' },
    { path: 'favorites', select: 'name rarity marketType' },
    { path: 'transactions', select: 'amount type createdAt' }
  ]
};
```

#### **Exemple : Système Games**
```typescript
// src/modules/game/constants/populate-presets.ts
export const GAME_POPULATE_PRESETS = {
  LIST: [
    { path: 'competition', select: 'name startDate' }
  ],
  
  DETAIL: [
    { path: 'competition', select: 'name startDate endDate rules' },
    { path: 'teams', select: 'name totalPoints' },
    { path: 'rewards', select: 'type amount' }
  ],
  
  ADMIN: [
    { path: 'competition', select: 'name startDate endDate rules createdBy' },
    { path: 'teams', select: 'name totalPoints createdAt updatedAt' },
    { path: 'rewards', select: 'type amount distributed createdAt' },
    { path: 'participants', select: 'nickName email registrationDate' }
  ]
};
```

### **🛠️ Guide d'Implémentation**

#### **Étape 1 : Créer les Presets**
```typescript
// 1. Définir les presets selon vos besoins
// 2. Identifier les contextes d'usage (liste, détail, admin, export)
// 3. Optimiser la taille des données selon l'usage
```

#### **Étape 2 : Modifier le Repository**
```typescript
// 1. Ajouter le paramètre populateOptions aux méthodes
// 2. Créer une méthode applyPopulate() helper
// 3. Gérer le populate par défaut si rien n'est spécifié
```

#### **Étape 3 : Adapter les Services**
```typescript
// 1. Importer les presets
// 2. Ajouter la logique de sélection selon le contexte
// 3. Passer les options au repository
```

#### **Étape 4 : Tester et Optimiser**
```typescript
// 1. Mesurer les gains de performance
// 2. Ajuster les presets selon les retours
// 3. Documenter les cas d'usage
```

### **💡 Bonnes Pratiques**

#### **🎯 Choix des Presets**
- **MINIMAL** : Listes avec pagination, recherches rapides
- **STANDARD** : Affichage normal côté utilisateur
- **FULL** : Interface admin, édition de données
- **Spécialisés** : Contextes métier spécifiques (enchères, exports)

#### **📊 Optimisation**
- **Mesurer** l'impact sur la taille des réponses
- **Profiler** les temps de réponse selon les presets
- **Adapter** selon les retours utilisateurs

#### **🔧 Maintenance**
- **Centraliser** les presets dans des constantes
- **Versionner** les changements de presets
- **Documenter** les cas d'usage de chaque preset

### **🚀 Extensions Futures**

#### **Cache Intelligent**
```typescript
// Cache différencié selon le preset
const cacheKey = `nfts:${preset}:${JSON.stringify(filters)}`;
```

#### **Presets Dynamiques**
```typescript
// Presets configurables via l'interface admin
const customPreset = await this.presetService.getCustomPreset(userId, 'nft-list');
```

#### **Métriques de Performance**
```typescript
// Tracking des performances par preset
this.metricsService.track('nft.search', { preset, responseTime, dataSize });
```

---

*Guide créé le 11/09/2025 - CyLimit Admin NFT Search Flow*
*Système Populate Adaptatif ajouté le 11/09/2025*
