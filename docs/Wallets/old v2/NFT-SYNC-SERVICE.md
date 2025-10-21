# 🔄 NFT Sync Service - Documentation

**Date :** 9 octobre 2025  
**Statut :** ✅ Implémenté, prêt pour intégration

---

## 📋 Vue d'ensemble

Le `NFTSyncService` garantit que la base de données MongoDB reste toujours synchronisée avec la blockchain (source de vérité).

### Pourquoi c'est nécessaire ?

```
Scénario sans sync :
1. User A vend NFT #123 à User B
2. Transaction blockchain réussit ✅
3. Bug : DB pas mise à jour ❌
4. User A voit toujours le NFT dans son inventaire
5. User A essaie de le vendre à nouveau → Échec
6. 💀 Mauvaise UX + perte de confiance
```

### Comment ça fonctionne ?

```
Blockchain (source de vérité)
    ↓
NFTSyncService vérifie ownership
    ↓
Compare avec DB MongoDB
    ↓
Si différent → Corrige DB
    ↓
DB synchronisée ✅
```

---

## 🎯 Stratégie de vérification

### Principe

- **DB MongoDB** = Cache pour performance (lecture rapide 10-50ms)
- **Blockchain** = Source de vérité absolue (ownership réel)
- **Smart Contract** = Vérifie automatiquement lors des transactions
- **Pas de vérification à chaque lecture** = Trop coûteux (200-500ms par NFT)

### Niveaux de vérification

| Action | Vérification ? | Raison |
|--------|---------------|--------|
| **GET /users/:id/nfts** | ❌ Non | Trop fréquent, DB fiable |
| **GET /marketplace/nfts** | ❌ Non | Trop fréquent, DB fiable |
| **POST /marketplace/list** | ✅ Oui | Critique avant mise en vente |
| **POST /marketplace/buy** | ❌ Non | Smart Contract vérifie auto |
| **Webhook Alchemy** | ❌ Non | Webhook = preuve transfert |
| **Cron job quotidien** | ✅ Oui | Audit complet, filet sécurité |
| **Admin /sync-nft/:id** | ✅ Oui | Debug manuel |

---

## 💰 Coûts

### Estimation pour 50 000 NFTs

```
Cron job quotidien :
- 50 000 NFTs × 10 CU Alchemy = 500 000 CU/jour
- 500 000 × 30 jours = 15M CU/mois
- Plan gratuit Alchemy = 300M CU/mois
- → 0€ (5% du quota gratuit) ✅

Vérification listing :
- ~500 listings/mois × 10 CU = 5 000 CU/mois
- → 0€ (négligeable) ✅

Total : 0€ pour la synchronisation
```

### Coût total marketplace (avec gas)

```
Gas transactions Polygon :
- 1000 TX/mois × 0.01€ = 10€/mois

Total : 10€/mois
```

---

## 📝 Implémentation

### Fichier créé

```
cylimit-backend-develop/
└── src/
    └── modules/
        └── nft/
            └── services/
                └── nft-sync.service.ts  ✅ CRÉÉ
```

### Méthodes disponibles

#### 1. `auditAllNFTs()` - Cron job quotidien

```typescript
/**
 * Exécuté automatiquement tous les jours à 3h du matin
 * Audit complet de tous les NFTs mintés
 */
@Cron('0 3 * * *')
async auditAllNFTs() {
  // 1. Récupérer tous les NFTs
  // 2. Pour chaque NFT, vérifier ownership on-chain
  // 3. Si désync → Corriger DB + Logger
  // 4. Stats finales + Alerte si > 10 désync
}
```

**Performance :**
- 50 000 NFTs × 100ms = ~1h23min
- Exécuté à 3h du matin (pas d'impact users)

#### 2. `verifyOwnershipForListing()` - Avant listing

```typescript
/**
 * Vérifie que le user possède toujours le NFT
 * avant de l'autoriser à le mettre en vente
 */
async verifyOwnershipForListing(
  nftId: string,
  expectedUserId: string
): Promise<{
  isValid: boolean;
  actualOwnerId?: string;
  ownerWalletAddress?: string;
  wasSynced: boolean;
}> {
  // 1. Vérifier ownership on-chain
  // 2. Comparer avec expectedUserId
  // 3. Si différent → Sync DB + Return false
  // 4. Return résultat
}
```

**Performance :**
- 1 appel RPC = ~300ms
- Acceptable (1 seul NFT par listing)

#### 3. `forceSyncNFT()` - Endpoint admin

```typescript
/**
 * Force la synchronisation d'un NFT spécifique
 * Utilisé pour debug et support client
 */
async forceSyncNFT(nftId: string): Promise<{
  nftId: string;
  tokenId: number;
  ownerIdInDB: string;
  ownerOnChain: string;
  wasOutOfSync: boolean;
}> {
  // Vérifier + Sync + Retourner stats
}
```

---

## 🔧 Intégration

### Étape 1 : Ajouter le service au module

**Fichier :** `src/modules/nft/nft.module.ts`

```typescript
import { NFTSyncService } from './services/nft-sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NFT.name, schema: NFTSchema },
    ]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ], 'users'), // Si User dans DB différente
  ],
  providers: [
    NFTService,
    NFTSyncService, // ✅ Ajouter ici
  ],
  exports: [
    NFTService,
    NFTSyncService, // ✅ Exporter pour MarketplaceModule
  ],
})
export class NFTModule {}
```

### Étape 2 : Activer les cron jobs

**Fichier :** `src/app.module.ts`

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ✅ Activer cron jobs
    ConfigModule.forRoot(),
    MongooseModule.forRoot(...),
    NFTModule,
    // ...
  ],
})
export class AppModule {}
```

### Étape 3 : Intégrer dans MarketplaceService

**Fichier :** `src/modules/marketplace/services/marketplace.service.ts`

```typescript
import { NFTSyncService } from '@/modules/nft/services/nft-sync.service';

@Injectable()
export class MarketplaceService {
  constructor(
    private nftSyncService: NFTSyncService, // ✅ Injecter
    // ... autres services
  ) {}

  async listNFT(
    userId: string,
    nftId: string,
    price: number
  ): Promise<{ nft: NFT; warning?: string }> {
    // ✅ Vérifier ownership AVANT listing
    const { isValid, actualOwnerId } = 
      await this.nftSyncService.verifyOwnershipForListing(nftId, userId);

    if (!isValid) {
      throw new BadRequestException(
        `You don't own this NFT anymore. ` +
        `Current owner: ${actualOwnerId}`
      );
    }

    // Continuer le listing...
    const nft = await this.nftModel.findById(nftId);
    nft.marketType = 'market';
    nft.marketPrice = price;
    await nft.save();

    return { nft };
  }
}
```

### Étape 4 : Ajouter endpoint admin (optionnel)

**Fichier :** `src/modules/admin/controllers/nft-admin.controller.ts`

```typescript
@Controller('admin/nft')
@UseGuards(AdminGuard)
export class NFTAdminController {
  constructor(private nftSyncService: NFTSyncService) {}

  @Post('sync/:id')
  async forceSyncNFT(@Param('id') nftId: string) {
    const result = await this.nftSyncService.forceSyncNFT(nftId);
    return { success: true, data: result };
  }

  @Post('audit')
  async forceAudit() {
    await this.nftSyncService.auditAllNFTs();
    return { success: true, message: 'Audit completed' };
  }
}
```

---

## 🧪 Tests

### Test 1 : Cron job manuel

```bash
# Dans NestJS console
cd cylimit-backend-develop
npm run start:dev

# Dans un autre terminal
curl -X POST http://localhost:3002/v1/admin/nft/audit \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Résultat attendu :**
```
✅ Daily NFT audit complete:
  Duration: 125s
  Total: 1000
  Synced: 3
  Errors: 0
  External wallets: 0
```

### Test 2 : Listing avec NFT désynchronisé

```typescript
// 1. Créer désynchronisation artificielle
await NFTModel.updateOne(
  { tokenId: 123 },
  { ownerId: 'wrong-user-id' }
);

// 2. Essayer de lister
const result = await marketplaceService.listNFT(
  'correct-user-id',
  'nft-id',
  10
);

// 3. Vérifier
// → Devrait throw BadRequestException
// → DB devrait être corrigée automatiquement
```

### Test 3 : Endpoint admin sync

```bash
curl -X POST http://localhost:3002/v1/admin/nft/sync/<NFT_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "nftId": "64f5a3c1...",
    "tokenId": 123,
    "ownerIdInDB": "64f5a3c1...",
    "ownerOnChain": "64f5a3c1...",
    "wasOutOfSync": false
  }
}
```

---

## 📊 Monitoring

### Logs à surveiller

**Logs normaux (tout va bien) :**
```
[NFTSyncService] ✅ NFT Contract initialized: 0x1234...
[NFTSyncService] 🔍 Starting daily NFT audit...
[NFTSyncService] 📊 Total NFTs to audit: 50000
[NFTSyncService] ✅ Daily NFT audit complete:
  Duration: 4825s
  Total: 50000
  Synced: 0
  Errors: 0
  External wallets: 0
```

**Logs d'alerte (problème détecté) :**
```
[NFTSyncService] 🚨 NFT ownership mismatch!
  NFT ID: 64f5a3c1...
  Token ID: 123
  DB owner: 64f5a3c1...
  Blockchain owner: 64f5b4d2...
  Wallet: 0xABCD...
[NFTSyncService] ✅ NFT 64f5a3c1... synced
[NFTSyncService] ⚠️⚠️⚠️ HIGH DESYNC COUNT: 15 NFTs were out of sync!
  This indicates a potential bug in webhooks or marketplace logic.
  Investigation required!
```

### Métriques Alchemy

Dashboard Alchemy : https://dashboard.alchemy.com/

Surveiller :
- **Compute Units** : Devrait être < 20M CU/mois (plan gratuit 300M)
- **Requests** : ~50 000 requests/jour (cron job)
- **Errors** : Devrait être 0%

---

## ❓ FAQ

### Q1 : Que se passe-t-il si le cron job détecte beaucoup de désynchronisations ?

**R :** Si > 10 NFTs désynchronisés en un jour :
1. Log d'alerte automatique
2. Investigation manuelle requise
3. Causes possibles :
   - Bug dans webhooks Alchemy
   - Bug dans marketplace logic
   - Transactions externes (mode urgence activé ?)

### Q2 : Le cron job va-t-il ralentir l'API ?

**R :** Non, car :
- Exécuté à 3h du matin (faible trafic)
- N'impacte pas les requêtes users
- Asynchrone (pas de blocage)

### Q3 : Que faire si un user signale un NFT manquant ?

**R :** 
1. Vérifier ownership on-chain sur PolygonScan
2. Forcer sync manuel : `POST /admin/nft/sync/:id`
3. Si NFT transféré externally → Vérifier mode urgence
4. Si bug → Investiguer logs marketplace

### Q4 : Peut-on désactiver la vérification au listing ?

**R :** Non recommandé, car :
- C'est la seule vérification en temps réel
- Coût négligeable (300ms par listing)
- Évite listings frauduleux

---

## ✅ Checklist déploiement

- [ ] `NFTSyncService` créé dans `src/modules/nft/services/`
- [ ] Service ajouté à `NFTModule.providers`
- [ ] Service exporté dans `NFTModule.exports`
- [ ] `ScheduleModule.forRoot()` dans `AppModule`
- [ ] Intégré dans `MarketplaceService.listNFT()`
- [ ] Variables `.env` configurées (RPC URL, Contract Address)
- [ ] Endpoint admin créé (optionnel)
- [ ] Tests manuels effectués
- [ ] Logs vérifiés (aucune erreur)
- [ ] Dashboard Alchemy vérifié (< 20M CU/mois)

---

**Maintenu par :** Valentin  
**Dernière mise à jour :** 9 octobre 2025

🚀 Prêt pour déploiement !

