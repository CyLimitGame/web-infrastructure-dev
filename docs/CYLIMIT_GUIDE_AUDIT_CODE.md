# CyLimit - Guide d'Audit Code et Setup Local

## 🎯 OBJECTIF : Comprendre et Optimiser SANS RISQUE

Vous avez raison d'être prudent ! On va analyser le code en détail pour comprendre ce qui consomme vraiment avant de faire des changements.

---

## 🚀 ÉTAPE 1 : Setup Environnement Local (30 minutes)

### **1.1 Prérequis**
```bash
# Vérifiez que vous avez :
- Docker & Docker Compose
- Node.js 16+ 
- Yarn
- Git

# Vérification :
docker --version
node --version
yarn --version
```

### **1.2 Créer docker-compose.local.yml**
```yaml
# Créez ce fichier dans cylimit-backend-develop/
version: '3.9'

services:
  mongodb-local:
    image: mongo:6.0
    container_name: cylimit-mongodb-local
    ports:
      - "27017:27017"
    volumes:
      - mongodb_local_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=cylimit_dev
    command: mongod --wiredTigerCacheSizeGB 0.5

  redis-local:
    image: redis:alpine
    container_name: cylimit-redis-local
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  mongodb_local_data:
```

### **1.3 Créer .env.local**
```bash
# Créez .env.local dans cylimit-backend-develop/
NODE_ENV=development
PORT=4000
BASE_URL=http://localhost:4000/v1

# MongoDB Local
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=cylimit_dev
MONGODB_USER=
MONGODB_PASSWORD=

# Redis Local  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (utilisez des clés de dev)
JWT_SECRET=dev_secret_key_123
JWT_ADMIN_SECRET=dev_admin_secret_456

# AWS (désactivé en local)
AWS_ACCESS_KEY_ID=disabled
AWS_SECRET_ACCESS_KEY=disabled
AWS_REGION=eu-west-3
AWS_PUBLIC_BUCKET_NAME=disabled

# Autres services (désactivés)
STRIPE_SECRET_KEY=sk_test_disabled
MAILCHIMP_API_KEY=disabled
```

### **1.4 Lancer l'Environnement Local**
```bash
# Dans cylimit-backend-develop/
docker-compose -f docker-compose.local.yml up -d

# Vérifier que ça marche :
docker ps
# Vous devriez voir mongodb-local et redis-local running
```

### **1.5 Installer & Lancer Backend**
```bash
# Dans cylimit-backend-develop/
yarn install
yarn dev

# Si ça marche, vous verrez :
# "Nest application successfully started on port 4000"
```

---

## 🔍 ÉTAPE 2 : Audit des Collections MongoDB (15 minutes)

### **2.1 Connecter à MongoDB Local**
```bash
# Avec MongoDB Compass (GUI) :
mongodb://localhost:27017/cylimit_dev

# Ou en ligne de commande :
docker exec -it cylimit-mongodb-local mongosh cylimit_dev
```

### **2.2 Analyser les Collections Créées**
```javascript
// Dans mongosh :
show collections

// Pour chaque collection, vérifiez la structure :
db.users.findOne()
db.nfts.findOne()
db.address_activities.findOne()
db.payment_transactions.findOne()

// Comptez les documents :
db.users.countDocuments()
db.nfts.countDocuments()
// etc.
```

### **2.3 Identifier les Collections "Logs"**
```javascript
// Collections suspectes (probablement volumineuses en prod) :
db.address_activities.findOne()    // Events blockchain
db.payment_transactions.findOne()  // Logs paiements
db.xp_transactions.findOne()      // Historique XP
db.nft_sales.findOne()            // Historique ventes
db.game_rewards.findOne()         // Historique récompenses

// Questions à se poser :
// - Cette collection grandit-elle indéfiniment ?
// - A-t-on besoin de garder tout l'historique ?
// - Peut-on mettre un TTL ?
```

---

## 🛠️ ÉTAPE 3 : Audit des Tâches Cron (20 minutes)

### **3.1 Analyser le Fichier Principal**
```bash
# Ouvrez : src/cron-job/cron-job.service.ts
# Listez toutes les tâches et leur fréquence :

EVERY_MINUTE:
- autoClaimWinningNftAuctions()
- fetchExchangeRates()

EVERY_15_MINUTES:  
- calculateGameRanking()

EVERY_HOUR:
- syncRidersOnComingGames()

DAILY:
- calculateAverageCapScores()
- claimAllWaitingReferredRewards()
- notifyFavoriteNftAuction()
```

### **3.2 Questions pour Chaque Tâche**
```bash
# Pour chaque tâche cron, demandez-vous :

1. autoClaimWinningNftAuctions() - EVERY_MINUTE
   - Combien d'enchères avez-vous par jour ?
   - Besoin vraiment de vérifier chaque minute ?
   - Peut passer à EVERY_10_MINUTES ?

2. fetchExchangeRates() - EVERY_MINUTE  
   - Les taux changent-ils si souvent ?
   - EVERY_HOUR suffisant ?

3. calculateGameRanking() - EVERY_15_MINUTES
   - Pendant les heures creuses (nuit), nécessaire ?
   - Peut être conditionnel selon l'activité ?
```

### **3.3 Estimer l'Impact CPU**
```bash
# Dans les logs de votre app locale :
# Regardez combien de temps prend chaque tâche
# Calculez : fréquence × temps = charge CPU

# Exemple :
# calculateGameRanking() prend 2 secondes
# Toutes les 15 minutes = 4 fois/heure
# = 8 secondes CPU/heure pour cette tâche seule
```

---

## 📊 ÉTAPE 4 : Audit des Modèles de Données (25 minutes)

### **4.1 Analyser les Schémas Volumineux**
```bash
# Ouvrez ces fichiers et analysez :

src/modules/nft/schemas/nft.schema.ts
- Combien de champs ?
- Lesquels sont optionnels/inutiles ?
- Index redondants ?

src/modules/user/schemas/user.schema.ts  
- Données personnelles stockées inutilement ?
- Champs calculés qui pourraient être dynamiques ?

src/modules/game/schemas/game.schema.ts
- Résultats stockés en dur vs calculés à la demande ?
```

### **4.2 Identifier les Timestamps Inutiles**
```bash
# Cherchez dans tous les schémas :
grep -r "timestamps.*true" src/modules/*/schemas/

# Pour chaque fichier trouvé, demandez-vous :
# - A-t-on vraiment besoin de createdAt/updatedAt ?
# - Pour l'audit ? Pour l'affichage ? Pour les requêtes ?
# - Peut-on s'en passer ?

# Économie potentielle : 16 bytes × nombre de documents
```

### **4.3 Analyser les Relations**
```bash
# Regardez les références entre collections :
# - Y a-t-il des données dupliquées ?
# - Des jointures coûteuses ?
# - Des données dénormalisées inutiles ?

# Exemple dans nft.schema.ts :
@Prop({ type: Types.ObjectId, ref: 'UserEntity' })
public ownerId!: Types.ObjectId;

# Question : Stocke-t-on aussi des infos user dans le NFT ?
```

---

## 🎯 ÉTAPE 5 : Créer votre Plan d'Optimisation (15 minutes)

### **5.1 Template de Rapport**
```markdown
# Mon Audit CyLimit - [Date]

## Collections Volumineuses Identifiées :
1. [nom_collection] - [taille estimée] - [utilité]
2. [nom_collection] - [taille estimée] - [utilité]

## Tâches Cron Sur-fréquentes :
1. [nom_tâche] - [fréquence actuelle] → [fréquence proposée]
2. [nom_tâche] - [fréquence actuelle] → [fréquence proposée]

## Timestamps Inutiles :
1. [collection] - [justification suppression]
2. [collection] - [justification suppression]

## Économies Estimées :
- Réduction taille MongoDB : -X%
- Réduction charge CPU : -Y%  
- Économies coûts : -Z$/mois
```

### **5.2 Priorisation des Actions**
```bash
# Classez vos optimisations par :
1. Impact économique (économie $/mois)
2. Facilité d'implémentation (heures de dev)
3. Risque (faible/moyen/élevé)

# Commencez par : Impact élevé + Facilité élevée + Risque faible
```

---

## 🛠️ OUTILS d'ANALYSE Recommandés

### **MongoDB Analysis**
```bash
# Dans mongosh, utilisez ces commandes :

# Taille par collection :
db.runCommand("dbStats")
db.stats()

# Top collections par taille :
db.runCommand("listCollections").cursor.firstBatch.forEach(
  function(collection) {
    print(collection.name + ": " + db[collection.name].stats().size + " bytes");
  }
);

# Index analysis :
db.collection_name.getIndexes()
db.collection_name.totalIndexSize()
```

### **Code Analysis Tools**
```bash
# Recherches utiles dans le code :

# Trouve toutes les opérations de création/update :
grep -r "\.save()\|\.create()\|\.insertMany()" src/

# Trouve les timestamps :
grep -r "timestamps.*true" src/

# Trouve les TTL existants :
grep -r "expireAfterSeconds" src/

# Trouve les tâches lourdes :
grep -r "forEach\|map\|filter" src/ | grep -v node_modules
```

---

## 📋 CHECKLIST de Démarrage

### **Aujourd'hui (1 heure) :**
- [ ] Setup environnement local (docker-compose + .env)
- [ ] Lancer backend en local  
- [ ] Connecter à MongoDB local
- [ ] Lister les collections créées

### **Demain (2 heures) :**
- [ ] Audit complet des tâches cron
- [ ] Identifier les 3 collections les plus suspectes
- [ ] Créer votre premier rapport d'audit
- [ ] Prioriser 3 optimisations faciles

### **Cette Semaine :**
- [ ] Implémenter la première optimisation (la plus simple)
- [ ] Tester en local
- [ ] Mesurer l'impact
- [ ] Documenter pour application en prod

---

## ❓ QUESTIONS pour Vous Guider

### **Pendant l'Audit, Demandez-vous :**
1. **Cette donnée est-elle vraiment nécessaire ?**
2. **Combien de temps doit-on la garder ?**
3. **Cette tâche doit-elle tourner si souvent ?**
4. **Peut-on calculer ça à la demande plutôt que de stocker ?**
5. **Cette fonctionnalité est-elle utilisée par nos 200 users ?**

### **Pour Prioriser :**
1. **Quel est l'impact sur la taille MongoDB ?**
2. **Combien ça économise en $/mois ?**
3. **Combien de temps pour implémenter ?**
4. **Quel est le risque de casser quelque chose ?**

---

## 🎯 OBJECTIF Final

**À la fin de cet audit, vous devriez avoir :**
- Une compréhension claire de ce qui consomme dans votre code
- 5-10 optimisations concrètes à implémenter  
- Un plan d'économies chiffré (X$/mois)
- Une roadmap d'implémentation sans risque

**Commencez-vous par le setup local ? C'est la base pour tout comprendre !**