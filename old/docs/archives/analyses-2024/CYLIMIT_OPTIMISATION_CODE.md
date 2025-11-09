# CyLimit - Optimisation Code pour Réduire Coûts MongoDB

## 🚨 DIAGNOSTIC Code : Gaspillage Massif de Données

### **Problème Identifié :**
- **33 collections** avec `timestamps: true`
- **Chaque document** = +16 bytes (`createdAt` + `updatedAt`)  
- **Collections volumineuses** : `address_activities`, `payment_transactions`, `xp_transactions`
- **Dev cluster dédié** : 80$/mois minimum (impossible de réduire)

### **Coûts MongoDB Actuels :**
- **Prod** : 500$/mois (M40 probablement)
- **Dev** : 80$/mois (M10 minimum en dédié)
- **Total** : 580$/mois

---

## 🎯 OPTIMISATIONS Code Prioritaires

### **1. Collections "Logs" Inutiles** ⚠️ **PRIORITÉ 1**

#### **`address_activities` - Probablement le plus volumineux**
```typescript
// AVANT : Stockage permanent de tous les events blockchain
@Schema({
  timestamps: true,  // ❌ +16 bytes/document
  collection: 'address_activities',
})
export class AddressActivity {
  public webhookId!: string;
  public rawId!: string;
  public type!: string;
  public event!: Event;  // ❌ Objet complexe volumineux
}

// APRÈS : Optimisations possibles
1. TTL automatique (30-90 jours max)
2. Suppression timestamps si pas nécessaire
3. Compression des events
4. Stockage sélectif (uniquement events critiques)
```

#### **`payment_transactions` - Logs de paiement**
```typescript
// OPTIMISATIONS :
1. Garder timestamps (légalement requis)
2. TTL après 2-3 ans (conformité)
3. Index optimisés
4. Archivage données anciennes
```

#### **`xp_transactions` - Historique XP**
```typescript
// QUESTION : Besoin de l'historique complet ?
// OPTIMISATIONS :
1. Agrégation mensuelle (vs détail par transaction)
2. TTL 1 an maximum
3. Suppression timestamps si pas nécessaire
```

### **2. Timestamps Inutiles** 💰 **ÉCONOMIE RAPIDE**

#### **Collections sans besoin de timestamps :**
```typescript
// Ces collections n'ont probablement pas besoin de timestamps :
- team.schema.ts (données statiques équipes)
- ranking-template.schema.ts (templates réutilisables)  
- bonus-level.schema.ts (configuration statique)
- game-rule.schema.ts (règles statiques)

// ÉCONOMIE : -16 bytes × nb documents = -10-20% taille totale
```

#### **Modification Code :**
```typescript
// AVANT
@Schema({
  timestamps: true,    // ❌ Supprimable
  versionKey: false,
  collection: 'teams'
})

// APRÈS  
@Schema({
  timestamps: false,   // ✅ Économie 16 bytes/doc
  versionKey: false,
  collection: 'teams'
})
```

### **3. TTL (Time To Live) Collections** ⏰ **NETTOYAGE AUTO**

#### **Configuration TTL automatique :**
```typescript
// address_activities - TTL 30 jours
AddressActivitySchema.index(
  { "createdAt": 1 }, 
  { expireAfterSeconds: 2592000 }  // 30 jours
);

// payment_transactions - TTL 3 ans (légal)
PaymentTransactionSchema.index(
  { "createdAt": 1 }, 
  { expireAfterSeconds: 94608000 }  // 3 ans
);

// xp_transactions - TTL 1 an
XpTransactionSchema.index(
  { "createdAt": 1 }, 
  { expireAfterSeconds: 31536000 }  // 1 an
);
```

---

## 💰 SOLUTION MongoDB Dev : Migration Locale

### **Problème Cluster Dédié :**
- MongoDB Atlas dédié = **80$/mois minimum** même pour M10
- Impossible de descendre en dessous
- Surdimensionné pour développement

### **Solution : MongoDB Local Dev** ⭐
```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  mongodb-dev:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_dev_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=cylimit_dev
    command: mongod --wiredTigerCacheSizeGB 0.5
    deploy:
      resources:
        limits:
          memory: 1G

  redis-dev:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb

# COÛT : 0$/mois en dev !
# ÉCONOMIE : 80$/mois = 960$/an
```

### **Migration Dev → Local :**
```bash
# 1. Export données dev Atlas
mongodump --uri="mongodb+srv://user:pass@cluster-dev.mongodb.net/cylimit_dev"

# 2. Import en local
mongorestore --db=cylimit_dev dump/

# 3. Update .env.development
MONGODB_URI=mongodb://localhost:27017/cylimit_dev

# 4. Arrêt cluster dev Atlas
# ÉCONOMIE IMMÉDIATE : 80$/mois
```

---

## 🎯 PLAN D'OPTIMISATION (1 semaine)

### **Jour 1 : Audit Collections Volumineuses**
```bash
# Connectez-vous MongoDB Atlas prod :
db.runCommand("dbStats")

# Pour chaque collection :
db.address_activities.stats()
db.payment_transactions.stats()  
db.xp_transactions.stats()
db.nft_sales.stats()
db.game_rewards.stats()

# Identifiez les 5 plus volumineuses
```

### **Jour 2 : TTL Configuration**
```typescript
// Ajoutez TTL aux collections identifiées :
// 1. address_activities (30 jours)
// 2. xp_transactions (1 an)  
// 3. payment_transactions (3 ans)
// 4. Autres logs temporaires

// Test en staging d'abord !
```

### **Jour 3 : Suppression Timestamps Inutiles**
```typescript
// Collections candidates (à vérifier) :
- team.schema.ts
- ranking-template.schema.ts
- bonus-level.schema.ts
- game-rule.schema.ts
- game-division.schema.ts

// Modification : timestamps: false
// Migration : suppression champs existants
```

### **Jour 4-5 : Migration Dev Local**
```bash
# Setup environnement dev local
# Export/Import données dev
# Tests complets
# Arrêt cluster dev Atlas
```

---

## 📊 ÉCONOMIES Estimées

### **Optimisations Code (Sans Migration)**
| Optimisation | Économie Taille | Économie Coût |
|--------------|----------------|---------------|
| **TTL address_activities** | -40-60% | -200$/mois |
| **Suppression timestamps** | -10-15% | -50$/mois |
| **TTL autres logs** | -20-30% | -100$/mois |
| **TOTAL Prod** | **-50-70%** | **-350$/mois** |

### **Migration Dev Local**
| Changement | Économie |
|------------|----------|
| **Arrêt cluster dev** | **-80$/mois** |
| **Setup local** | **0$/mois** |
| **TOTAL Dev** | **-80$/mois** |

### **ÉCONOMIE TOTALE : 430$/mois (74% de réduction !)**

---

## ⚠️ PRÉCAUTIONS Importantes

### **Avant Suppression Timestamps :**
```typescript
// Vérifiez utilisation dans le code :
// 1. Recherchez "createdAt" dans tout le projet
// 2. Recherchez "updatedAt" dans tout le projet  
// 3. Vérifiez les queries avec sort par date
// 4. Vérifiez les APIs qui retournent ces champs

// Exemple recherche :
grep -r "createdAt" src/
grep -r "updatedAt" src/
```

### **Avant TTL :**
```bash
# Test TTL en staging d'abord :
1. Créer index TTL sur staging
2. Attendre 24h
3. Vérifier suppression automatique
4. Valider fonctionnalités non cassées
5. Appliquer en prod
```

### **Backup Avant Changements :**
```bash
# Backup complet avant optimisations :
mongodump --uri="mongodb+srv://..." --out=backup_before_optimization
```

---

## 🚀 RECOMMANDATIONS Immédiates

### **Cette Semaine (2 jours) :**

#### **Jour 1 : Audit Rapide**
```bash
# Dans MongoDB Atlas prod, exécutez :
db.runCommand("dbStats")
db.getCollectionNames().forEach(function(collection) {
   var stats = db[collection].stats();
   print(collection + ": " + stats.size + " bytes, " + stats.count + " docs");
});

# Identifiez la collection la plus volumineuse
```

#### **Jour 2 : Dev Local Setup**
```bash
# Setup environnement dev local :
1. docker-compose.dev.yml avec MongoDB
2. Export données dev Atlas (subset)
3. Import local
4. Tests basiques
5. Si OK → arrêt cluster dev Atlas

# ÉCONOMIE IMMÉDIATE : 80$/mois
```

### **Questions pour Prioriser :**
1. **Quelle collection** prend le plus de place dans votre 1GB ?
2. **Historique address_activities** : combien de temps devez-vous garder ?
3. **Dev local** : votre équipe est-elle OK pour dev en local ?
4. **Timestamps** : sur quelles collections sont-ils vraiment nécessaires ?

**Avec ces optimisations, vous passez de 580$/mois à 150$/mois pour MongoDB !**
