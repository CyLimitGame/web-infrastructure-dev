# 🎯 **TRANSFORMATION GAME_TEAMS - PLAN COMPLET**

## 📋 **Vue d'ensemble**

Cette transformation vise à **simplifier et optimiser** la gestion des `game_teams` en :
- ❌ **Supprimant** les `freeCards` et `naCards` (NFTs uniquement)
- 🔄 **Fusionnant** `NftRider` et `CardResult` dans un type unifié
- 📊 **Séparant** points de base et bonus pour plus de clarté
- 🎯 **Unifiant** la logique entre admin et user backend

---

## 🏗️ **ÉTAPE 1 : NOUVEAU SCHÉMA GAME_TEAM**

### **🔧 Structures cibles**

#### **Nouveau type unifié : NftWithResults**
```typescript
export type NftWithResults = {
  // Métadonnées NFT (ex-NftRider)
  id: Types.ObjectId;              // ID de la NFT
  role: StatusEnum;                // Rôle assigné (leader, climber, etc.)
  pcsRaceId: Types.ObjectId;       // Course assignée
  index: number;                   // Position dans l'équipe (0-4)
  // ❌ SUPPRIMÉ : isCaptain (redondant avec gameTeam.captainId)
  
  // Résultats intégrés (ex-CardResult)
  totalPoints: number;             // Total final pour cette NFT
  pointsByType: TeamRiderPoint[];  // Points de base par type
  bonusByType: BonusPoint[];       // Bonus séparés
};
```

#### **Points de base simplifiés**
```typescript
export type TeamRiderPoint = {
  type: MatrixRoleEnum;            // STAGE_RANKING, BREAKAWAY, KOM_POINTS, etc.
  points: number;                  // Points pour le rôle assigné (déjà avec coefficient)
  // ❌ Supprimé: percent, isBonusType (maintenant dans BonusPoint)
};
```

#### **Bonus séparés pour la transparence**
```typescript
export type BonusPoint = {
  type: RiderBonusPointTypeEnum;   // CAPTAIN, BASED_ON_STATUS, LEVEL_XP, SPECIAL_TYPE
  percent: number;                 // Pourcentage appliqué (ex: 25 pour +25%)
  points: number;                  // Points bonus calculés
};
```

#### **Schéma GameTeam simplifié**
```typescript
@Schema({ timestamps: true, versionKey: false, collection: 'game_teams' })
export class GameTeam {
  @ApiProperty()
  public _id!: Types.ObjectId;

  // ✅ UNIFIÉ : NFTs avec résultats intégrés
  @Prop({ default: [] })
  public nftIds!: NftWithResults[];

  @Prop()
  public captainId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game' })
  public gameId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GameDivision' })
  public divisionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserEntity' })
  public createdBy!: Types.ObjectId;

  // ✅ CALCULÉ : Total de toutes les NFTs
  @Prop({ default: 0 })
  public totalPoint!: number;

  @Prop({ default: 0 })
  public ranking!: number;

  // ❌ SUPPRIMÉ : 
  // - freeCardIds: NftRider[]
  // - naCardIds: NftRider[]
  // - results: CardResult[]
  // - acquiredResults: CardResult[]
  // - acquiredTotalPoint: number

  // ✅ VIRTUALS conservés (relations Mongoose pour populate)
  public nfts?: Nft[];              // Populate des NFTs complètes
  public division?: GameDivision;   // Populate de la division
  public game?: Game;               // Populate du game complet
}
```

### **📊 Exemple de données**
```json
{
  "_id": "game_team_123",
  "gameId": "game_456",
  "captainId": "nft_789",
  "nftIds": [
    {
      "id": "nft_789",
      "role": "leader",
      "pcsRaceId": "race_101",
      "index": 0,
      "isCaptain": true,
      "totalPoints": 67.5,
      "pointsByType": [
        { "type": "STAGE_RANKING", "points": 36 },
        { "type": "BREAKAWAY", "points": 9.6 }
      ],
      "bonusByType": [
        { "type": "CAPTAIN", "percent": 25, "points": 11.4 },
        { "type": "BASED_ON_STATUS", "percent": 15, "points": 6.84 }
      ]
    },
    {
      "id": "nft_790",
      "role": "climber", 
      "pcsRaceId": "race_101",
      "index": 1,
      "isCaptain": false,
      "totalPoints": 41.1,
      "pointsByType": [
        { "type": "STAGE_RANKING", "points": 13.5 },
        { "type": "KOM_POINTS", "points": 24 }
      ],
      "bonusByType": [
        { "type": "BASED_ON_STATUS", "percent": 10, "points": 3.75 }
      ]
    }
  ],
  "totalPoint": 108.6
}
```

---

## 🔄 **ÉTAPE 2 : SERVICES DE CALCUL (ADMIN BACKEND)**

### **🎯 GameRankingPointService refactorisé**

#### **Méthode principale updateGameTeamResults**
```typescript
async updateGameTeamResults(gameId: Types.ObjectId, isAcquired = false) {
  const gameTeams = await this.gameTeamPartitionService.find({ gameId });
  
  for (const gameTeam of gameTeams) {
    const updatedNfts = await this.calculateTeamNftResults(gameTeam, isAcquired);
    const teamTotalPoints = updatedNfts.reduce((sum, nft) => sum + nft.totalPoints, 0);
    
    await this.gameTeamPartitionService.updateOne(
      { _id: gameTeam._id },
      { 
        nftIds: updatedNfts,
        totalPoint: teamTotalPoints 
      }
    );
  }
  
  // Recalculer les rankings
  await this.updateTeamRankings(gameId);
}
```

#### **Calcul des résultats par NFT (OPTIMISÉ)**
```typescript
private async calculateTeamNftResults(
  gameTeam: GameTeam, 
  isAcquired: boolean
): Promise<NftWithResults[]> {
  // 1. ✅ OPTIMISATION : Récupérer TOUS les résultats de la game en une fois
  const allGameRaceResults = await this.raceResultsService.getGameResults(
    gameTeam.gameId, 
    { isFinal: !isAcquired }
  );
  
  // 2. Calculer pour chaque NFT depuis les données en mémoire
  const updatedNfts: NftWithResults[] = [];
  
  for (const nft of gameTeam.nftIds) {
    // Filtrer les résultats pour cette NFT spécifique
    const nftRiderResults = allGameRaceResults.filter(
      result => result.pcsRiderId === nft.riderId && 
                result.raceId === nft.pcsRaceId
    );
    
    // Extraire points pour le rôle assigné
    const rolePoints = this.extractPointsForRole(nftRiderResults, nft.role);
    
    // Calculer bonus (simplifié)
    const isCaptain = nft.id.equals(gameTeam.captainId);
    const bonusPoints = await this.calculateNftBonusPoints(nft, rolePoints.total, isCaptain);
    
    // Créer NFT avec résultats
    updatedNfts.push({
      ...nft,
      totalPoints: rolePoints.total + bonusPoints.total,
      pointsByType: rolePoints.byType,
      bonusByType: bonusPoints.byType
    });
  }
  
  return updatedNfts;
}
```

#### **Extraction des points pour un rôle**
```typescript
private extractPointsForRole(
  raceResults: DetailedRiderResult[], 
  assignedRole: StatusEnum
): { byType: TeamRiderPoint[], total: number } {
  const pointsByType: TeamRiderPoint[] = [];
  let total = 0;
  
  for (const result of raceResults) {
    for (const riderPoint of result.points) {
      // Trouver le coefficient pour ce rôle spécifique
      const roleCoeff = riderPoint.roles.find(r => r.name === assignedRole);
      
      if (roleCoeff && roleCoeff.value > 0) {
        pointsByType.push({
          type: riderPoint.type,
          points: roleCoeff.value  // Déjà calculé avec coefficient
        });
        total += roleCoeff.value;
      }
    }
  }
  
  return { byType: pointsByType, total };
}
```

#### **Calcul des bonus (UNIFIÉ)**
```typescript
private async calculateNftBonusPoints(
  nft: NftWithResults, 
  basePoints: number, 
  isCaptain: boolean
): Promise<{ byType: BonusPoint[], total: number }> {
  const bonusByType: BonusPoint[] = [];
  
  // ✅ Configuration uniforme des bonus
  const bonusConfig = await this.getBonusConfig(nft, isCaptain);
  
  // ✅ Traitement unifié pour tous les bonus
  for (const [bonusType, percent] of Object.entries(bonusConfig)) {
    if (percent > 0) {
      const bonusPoints = basePoints * (percent / 100);
      bonusByType.push({
        type: bonusType as RiderBonusPointTypeEnum,
        percent,
        points: bonusPoints
      });
    }
  }
  
  const total = bonusByType.reduce((sum, bonus) => sum + bonus.points, 0);
  return { byType: bonusByType, total };
}

private async getBonusConfig(nft: NftWithResults, isCaptain: boolean) {
  const nftData = await this.nftService.findById(nft.id);
  
  return {
    [RiderBonusPointTypeEnum.CAPTAIN]: isCaptain ? 25 : 0,
    [RiderBonusPointTypeEnum.BASED_ON_STATUS]: await this.getRarityBonusPercent(nftData.rarity),
    [RiderBonusPointTypeEnum.LEVEL_XP]: await this.getLevelBonusPercent(nftData.level),
    [RiderBonusPointTypeEnum.SPECIAL_TYPE]: await this.getSpecialBonusPercent(nftData)
  };
}
```

### **🔄 Suppression de la logique acquiredResults**
```typescript
// ❌ SUPPRIMÉ : Plus de distinction acquired/final
// Les résultats sont mis à jour en temps réel dans le même champ

// ✅ NOUVEAU : Un seul appel unifié
async updateGameResults(gameId: Types.ObjectId, isLive = false) {
  // isLive détermine si on prend les résultats live ou finaux
  await this.updateGameTeamResults(gameId, isLive);
}
```

---

## 🎮 **ÉTAPE 3 : CRÉATION/MODIFICATION ÉQUIPES (USER BACKEND)**

### **🔧 GameTeamService modifications**

#### **Validation stricte : NFTs uniquement**
```typescript
private validateTeamComposition(createTeamDto: CreateTeamDto) {
  // ❌ Plus de freeCards ou naCards autorisées
  if (createTeamDto.freeCardIds?.length > 0) {
    throw new BadRequestException('Free cards are no longer supported in teams');
  }
  
  if (createTeamDto.naCardIds?.length > 0) {
    throw new BadRequestException('NA cards are no longer supported in teams');
  }
  
  // ✅ Validation NFTs
  if (!createTeamDto.nftIds?.length || createTeamDto.nftIds.length !== 5) {
    throw new BadRequestException('Team must have exactly 5 NFTs');
  }
  
  // Validation rôles uniques
  const roles = createTeamDto.nftIds.map(nft => nft.role);
  const uniqueRoles = new Set(roles);
  if (uniqueRoles.size !== roles.length) {
    throw new BadRequestException('Each NFT must have a unique role');
  }
}
```

#### **Création d'équipe simplifiée**
```typescript
async createTeam(createTeamDto: CreateTeamDto, userId: string) {
  // 1. Validation
  this.validateTeamComposition(createTeamDto);
  
  // 2. Vérifier propriété des NFTs
  await this.validateNftOwnership(createTeamDto.nftIds, userId);
  
  // 3. Transformer en NftWithResults (sans résultats initialement)
  const nftIds: NftWithResults[] = createTeamDto.nftIds.map((nft, index) => ({
    id: nft.id,
    role: nft.role,
    pcsRaceId: nft.pcsRaceId,
    index,
    isCaptain: nft.id.equals(createTeamDto.captainId),
    totalPoints: 0,        // Sera calculé par le service de ranking
    pointsByType: [],      // Sera calculé par le service de ranking
    bonusByType: []        // Sera calculé par le service de ranking
  }));
  
  // 4. Créer l'équipe
  const gameTeam = {
    nftIds,
    captainId: createTeamDto.captainId,
    gameId: createTeamDto.gameId,
    divisionId: createTeamDto.divisionId,
    createdBy: new Types.ObjectId(userId),
    totalPoint: 0,         // Sera calculé par le service de ranking
    ranking: 0
  };
  
  const createdTeam = await this.gameTeamPartitionService.create(gameTeam);
  
  // 5. Déclencher le calcul des points (asynchrone)
  this.eventEmitter.emit('team.created', {
    teamId: createdTeam._id,
    gameId: createTeamDto.gameId
  });
  
  return createdTeam;
}
```

#### **Mise à jour d'équipe**
```typescript
async updateTeam(teamId: string, updateTeamDto: UpdateTeamDto, userId: string) {
  // 1. Vérifier propriété de l'équipe
  const existingTeam = await this.gameTeamPartitionService.findOne({
    _id: new Types.ObjectId(teamId),
    createdBy: new Types.ObjectId(userId)
  });
  
  if (!existingTeam) {
    throw new NotFoundException('Team not found or not owned by user');
  }
  
  // 2. Validation nouvelle composition
  this.validateTeamComposition(updateTeamDto);
  
  // 3. Transformer les nouvelles NFTs
  const updatedNftIds: NftWithResults[] = updateTeamDto.nftIds.map((nft, index) => ({
    id: nft.id,
    role: nft.role,
    pcsRaceId: nft.pcsRaceId,
    index,
    isCaptain: nft.id.equals(updateTeamDto.captainId),
    totalPoints: 0,        // Sera recalculé
    pointsByType: [],      // Sera recalculé
    bonusByType: []        // Sera recalculé
  }));
  
  // 4. Mettre à jour
  const updatedTeam = await this.gameTeamPartitionService.updateOne(
    { _id: existingTeam._id },
    {
      nftIds: updatedNftIds,
      captainId: updateTeamDto.captainId,
      totalPoint: 0        // Sera recalculé
    }
  );
  
  // 5. Déclencher recalcul des points
  this.eventEmitter.emit('team.updated', {
    teamId: existingTeam._id,
    gameId: existingTeam.gameId
  });
  
  return updatedTeam;
}
```

### **📡 APIs mises à jour**

#### **DTOs simplifiés**
```typescript
// ❌ SUPPRIMÉ : freeCardIds, naCardIds
export class CreateTeamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NftRiderDto)
  nftIds!: NftRiderDto[];

  @IsMongoId()
  captainId!: string;

  @IsMongoId()
  gameId!: string;

  @IsMongoId()
  divisionId!: string;
}

export class NftRiderDto {
  @IsMongoId()
  id!: string;

  @IsEnum(StatusEnum)
  role!: StatusEnum;

  @IsMongoId()
  pcsRaceId!: string;
}
```

#### **Endpoints adaptés**
```typescript
@Post('/teams')
async createTeam(
  @Body() createTeamDto: CreateTeamDto,
  @User() user: UserPayload
) {
  return this.gameTeamService.createTeam(createTeamDto, user.userId);
}

@Put('/teams/:id')
async updateTeam(
  @Param('id') teamId: string,
  @Body() updateTeamDto: UpdateTeamDto,
  @User() user: UserPayload
) {
  return this.gameTeamService.updateTeam(teamId, updateTeamDto, user.userId);
}

@Get('/teams/:id')
async getTeam(@Param('id') teamId: string) {
  return this.gameTeamService.getTeamWithDetails(teamId);
}
```

---

## 🖥️ **ÉTAPE 4 : AFFICHAGE FRONTEND**

### **🎨 Composants de création d'équipe**

#### **Sélecteur NFT simplifié**
```typescript
const CreateTeam = () => {
  const [selectedNfts, setSelectedNfts] = useState<Nft[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, StatusEnum>>({});
  const [captain, setCaptain] = useState<string>('');

  // ❌ SUPPRIMÉ : Sélection freeCards/naCards
  // ✅ NOUVEAU : Que des NFTs avec assignation de rôles

  return (
    <div>
      <h2>Create Team - NFTs Only</h2>
      
      {/* Sélection des 5 NFTs */}
      <NftSelector 
        maxSelection={5}
        onSelect={setSelectedNfts}
        userNfts={userNfts}
      />
      
      {/* Assignation des rôles */}
      <RoleAssignment 
        nfts={selectedNfts}
        assignments={roleAssignments}
        onChange={setRoleAssignments}
        availableRoles={[
          StatusEnum.LEADER,
          StatusEnum.CLIMBER, 
          StatusEnum.SPRINTER,
          StatusEnum.DOMESTIC,
          StatusEnum.FREE_ELECTRON
        ]}
      />
      
      {/* Sélection du capitaine */}
      <CaptainSelector 
        nfts={selectedNfts}
        selected={captain}
        onChange={setCaptain}
      />
      
      <button onClick={handleCreateTeam}>
        Create Team
      </button>
    </div>
  );
};
```

#### **Composant d'assignation de rôles**
```typescript
const RoleAssignment = ({ nfts, assignments, onChange, availableRoles }) => {
  const handleRoleChange = (nftId: string, role: StatusEnum) => {
    // Vérifier que le rôle n'est pas déjà pris
    const currentAssignments = Object.values(assignments);
    if (currentAssignments.includes(role)) {
      toast.error(`Role ${role} is already assigned`);
      return;
    }
    
    onChange({
      ...assignments,
      [nftId]: role
    });
  };

  return (
    <div>
      <h3>Assign Roles</h3>
      {nfts.map(nft => (
        <div key={nft._id} className="nft-role-assignment">
          <img src={nft.imageUrl} alt={nft.name} />
          <span>{nft.name}</span>
          
          <select 
            value={assignments[nft._id] || ''}
            onChange={(e) => handleRoleChange(nft._id, e.target.value as StatusEnum)}
          >
            <option value="">Select Role</option>
            {availableRoles.map(role => (
              <option 
                key={role} 
                value={role}
                disabled={Object.values(assignments).includes(role)}
              >
                {role}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
```

### **🏆 Affichage des équipes et résultats**

#### **Liste des équipes avec détails**
```typescript
const TeamList = ({ gameId }) => {
  const { data: teams } = useGetGameTeams(gameId);

  return (
    <div>
      {teams.map(team => (
        <TeamCard key={team._id}>
          <div className="team-header">
            <h3>Team #{team.ranking}</h3>
            <span className="total-points">{team.totalPoint} pts</span>
          </div>
          
          <div className="team-nfts">
            {team.nftIds.map(nft => (
              <NftResultCard key={nft.id} nft={nft} />
            ))}
          </div>
        </TeamCard>
      ))}
    </div>
  );
};
```

#### **Carte NFT avec résultats détaillés**
```typescript
const NftResultCard = ({ nft }: { nft: NftWithResults }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="nft-result-card">
      <div className="nft-header">
        <img src={nft.imageUrl} alt={nft.name} />
        <div>
          <h4>{nft.name}</h4>
          <span className="role">{nft.role}</span>
          {nft.isCaptain && <span className="captain">👑 Captain</span>}
        </div>
        <span className="total-points">{nft.totalPoints} pts</span>
      </div>
      
      <button onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide' : 'Show'} Details
      </button>
      
      {showDetails && (
        <div className="nft-details">
          {/* Points de base */}
          <div className="base-points">
            <h5>Base Points:</h5>
            {nft.pointsByType.map(point => (
              <div key={point.type} className="point-item">
                <span>{point.type}:</span>
                <span>{point.points} pts</span>
              </div>
            ))}
          </div>
          
          {/* Bonus */}
          <div className="bonus-points">
            <h5>Bonus:</h5>
            {nft.bonusByType.map(bonus => (
              <div key={bonus.type} className="bonus-item">
                <span>{bonus.type}:</span>
                <span>+{bonus.points} pts (+{bonus.percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

#### **Hooks API adaptés**
```typescript
// Hook pour récupérer les équipes
export const useGetGameTeams = (gameId: string) => {
  return useQuery(
    ['game-teams', gameId],
    () => getGameTeams(gameId),
    {
      enabled: !!gameId
      // ❌ SUPPRIMÉ : refetchInterval (inutile, données mises à jour par calculs)
    }
  );
};

// Hook pour créer une équipe
export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation(createTeam, {
    onSuccess: (data) => {
      // Invalider les caches
      queryClient.invalidateQueries(['game-teams']);
      queryClient.invalidateQueries(['user-teams']);
      
      toast.success('Team created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create team');
    }
  });
};
```

---

## 📊 **ÉTAPE 5 : MIGRATION DES DONNÉES EXISTANTES**

### **🔄 Script de migration principal**

```javascript
// Script: migrate-game-teams-structure.js

const { MongoClient } = require('mongodb');

async function migrateGameTeamStructure() {
  console.log('🚀 Starting GameTeam structure migration...');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Statistiques
  let totalTeams = 0;
  let migratedTeams = 0;
  let skippedTeams = 0;
  let errorTeams = 0;
  
  try {
    // Récupérer toutes les collections game_teams_YYYY
    const collections = await db.listCollections().toArray();
    const gameTeamCollections = collections
      .filter(col => col.name.startsWith('game_teams_'))
      .map(col => col.name);
    
    console.log(`📊 Found ${gameTeamCollections.length} game_teams collections`);
    
    for (const collectionName of gameTeamCollections) {
      console.log(`\n🔄 Processing ${collectionName}...`);
      
      const collection = db.collection(collectionName);
      const teams = await collection.find({}).toArray();
      totalTeams += teams.length;
      
      for (const team of teams) {
        try {
          const migratedTeam = await migrateTeamStructure(team);
          
          if (migratedTeam) {
            await collection.replaceOne(
              { _id: team._id },
              migratedTeam
            );
            migratedTeams++;
          } else {
            skippedTeams++;
          }
        } catch (error) {
          console.error(`❌ Error migrating team ${team._id}:`, error.message);
          errorTeams++;
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log(`📊 Statistics:`);
    console.log(`   Total teams: ${totalTeams}`);
    console.log(`   Migrated: ${migratedTeams}`);
    console.log(`   Skipped: ${skippedTeams}`);
    console.log(`   Errors: ${errorTeams}`);
    
  } finally {
    await client.close();
  }
}

async function migrateTeamStructure(team) {
  // Vérifier si déjà migré
  if (team.nftIds && team.nftIds[0]?.totalPoints !== undefined) {
    console.log(`⏭️  Team ${team._id} already migrated`);
    return null;
  }
  
  // Convertir ancien format vers nouveau
  const newNftIds = [];
  
  // ✅ Migrer les NFTs existantes
  if (team.nftIds && team.nftIds.length > 0) {
    for (let i = 0; i < team.nftIds.length; i++) {
      const nft = team.nftIds[i];
      
      newNftIds.push({
        id: nft.id,
        role: nft.role,
        pcsRaceId: nft.pcsRaceId,
        index: nft.index || i,
        isCaptain: nft.id.equals ? nft.id.equals(team.captainId) : nft.id.toString() === team.captainId?.toString(),
        totalPoints: 0,      // Sera recalculé par le service
        pointsByType: [],    // Sera recalculé par le service
        bonusByType: []      // Sera recalculé par le service
      });
    }
  }
  
  // ❌ Ignorer freeCardIds et naCardIds
  if (team.freeCardIds?.length > 0 || team.naCardIds?.length > 0) {
    console.log(`⚠️  Team ${team._id} has freeCards/naCards - will be ignored`);
  }
  
  // Créer la nouvelle structure
  const migratedTeam = {
    _id: team._id,
    nftIds: newNftIds,
    captainId: team.captainId,
    gameId: team.gameId,
    divisionId: team.divisionId,
    createdBy: team.createdBy,
    totalPoint: 0,       // Sera recalculé
    ranking: 0,          // Sera recalculé
    createdAt: team.createdAt,
    updatedAt: new Date()
  };
  
  console.log(`✅ Migrated team ${team._id} with ${newNftIds.length} NFTs`);
  return migratedTeam;
}

// Exécuter la migration
if (require.main === module) {
  migrateGameTeamStructure()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateGameTeamStructure };
```

### **🧹 Script de nettoyage post-migration**

```javascript
// Script: cleanup-old-game-team-fields.js

async function cleanupOldGameTeamFields() {
  console.log('🧹 Cleaning up old GameTeam fields...');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  try {
    const collections = await db.listCollections().toArray();
    const gameTeamCollections = collections
      .filter(col => col.name.startsWith('game_teams_'))
      .map(col => col.name);
    
    for (const collectionName of gameTeamCollections) {
      console.log(`🔄 Cleaning ${collectionName}...`);
      
      const result = await db.collection(collectionName).updateMany(
        {},
        {
          $unset: {
            freeCardIds: "",
            naCardIds: "",
            results: "",
            acquiredResults: "",
            acquiredTotalPoint: ""
          }
        }
      );
      
      console.log(`✅ Cleaned ${result.modifiedCount} documents in ${collectionName}`);
    }
    
  } finally {
    await client.close();
  }
}
```

---

## 🎯 **ÉTAPES D'IMPLÉMENTATION DÉTAILLÉES**

### **Phase 1 : Schémas et Types (1-2 jours)**
1. ✅ **Modifier `game-team.schema.ts`**
   - Créer types `NftWithResults`, `BonusPoint`
   - Supprimer anciens champs
   - Mettre à jour les virtuals

2. ✅ **Mettre à jour les DTOs**
   - `CreateTeamDto`, `UpdateTeamDto`
   - Supprimer `freeCardIds`, `naCardIds`
   - Validation stricte NFTs uniquement

3. ✅ **Tests unitaires des types**
   - Validation des nouveaux types
   - Tests de sérialisation/désérialisation

### **Phase 2 : Services Backend (3-4 jours)**
4. 🔄 **Adapter `GameRankingPointService` (Admin)**
   - Refactorer `updateGameTeamResults`
   - Implémenter `extractPointsForRole`
   - Implémenter `calculateNftBonusPoints`
   - Supprimer logique `acquiredResults`

5. 🔄 **Adapter `GameTeamService` (User)**
   - Validation stricte composition équipe
   - Création/modification NFTs uniquement
   - Gestion des événements pour recalcul

6. 🔄 **Mettre à jour `GameTeamPartitionService`**
   - Support des nouveaux types
   - Optimisations requêtes

### **Phase 3 : APIs (2-3 jours)**
7. 🔄 **Controllers Admin Backend**
   - Endpoints calcul des points
   - Endpoints gestion des games
   - Tests d'intégration

8. 🔄 **Controllers User Backend**
   - Endpoints création/modification équipes
   - Endpoints consultation équipes
   - Validation et gestion d'erreurs

9. 🔄 **Tests API complets**
   - Tests end-to-end
   - Tests de performance
   - Tests de validation

### **Phase 4 : Frontend (4-5 jours)**
10. 🔄 **Composants création équipe**
    - `NftSelector` (NFTs uniquement)
    - `RoleAssignment` (assignation rôles)
    - `CaptainSelector`
    - Validation côté client

11. 🔄 **Composants affichage équipes**
    - `TeamList` avec nouveaux résultats
    - `NftResultCard` détaillé
    - Séparation points base/bonus
    - Indicateurs visuels

12. 🔄 **Hooks et services API**
    - Adaptation des appels API
    - Gestion du cache
    - Gestion des erreurs

### **Phase 5 : Migration & Tests (2-3 jours)**
13. 🔄 **Scripts de migration**
    - Migration structure données
    - Nettoyage anciens champs
    - Vérification intégrité

14. 🔄 **Tests complets**
    - Tests de régression
    - Tests de performance
    - Tests utilisateur

15. 🔄 **Déploiement progressif**
    - Déploiement staging
    - Tests production
    - Rollback plan

---

## ❓ **QUESTIONS CRITIQUES AVANT DÉMARRAGE**

### **🚨 Gestion des équipes existantes**
1. **Que faire des équipes avec freeCards/naCards ?**
   - Option A : Les invalider (forcer recréation)
   - Option B : Les convertir automatiquement (garder que les NFTs)
   - Option C : Période de grâce avec migration manuelle

2. **Impact sur les games en cours ?**
   - Faut-il attendre la fin des games actuels ?
   - Ou migrer en live avec recalcul des points ?

### **🔄 Ordre d'implémentation**
3. **Par où commencer ?**
   - Admin backend d'abord (calculs) ?
   - User backend d'abord (création) ?
   - Frontend d'abord (validation UX) ?

4. **Stratégie de déploiement ?**
   - Big bang ou progressif ?
   - Feature flags pour rollback ?

### **📊 Performance et monitoring**
5. **Impact performance ?**
   - Les nouveaux calculs sont-ils plus lourds ?
   - Faut-il prévoir du cache supplémentaire ?

6. **Monitoring ?**
   - Métriques à surveiller pendant la migration ?
   - Alertes à mettre en place ?

---

## 🎯 **PRÊT À DÉMARRER ?**

Ce plan détaille **toutes les étapes** de la transformation des `game_teams`. 

**Validation finale :**
- ✅ Suppression freeCards/naCards
- ✅ Fusion NftRider + CardResult
- ✅ Séparation points base/bonus
- ✅ Unification admin/user backend
- ✅ Migration données existantes
- ✅ Tests complets

**Êtes-vous prêt à commencer par l'Étape 1 (Schémas) ?** 🚀
