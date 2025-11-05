# CyLimit - Plan Migration Optimisé (2-3j/semaine)

## 📊 SITUATION ANALYSÉE

### **Données Réelles :**
- **MongoDB** : 1GB → 0.7GB après nettoyage
- **Trafic** : Constant 11h-19h, pic léger à 12h
- **Users** : 200/jour (~25 simultanés max)
- **Temps disponible** : 2-3 jours/semaine

### **Surdimensionnement Actuel :**
- **MongoDB Atlas** : 160GB disponible pour 1GB utilisé = **0.6% d'usage !**
- **AWS** : Dimensionné pour 50k+ users simultanés vs 25 réels
- **Coût/GB** : 580$/mois pour 1GB = **580$/GB !** (normal : 0.50$/GB)

---

## 🎯 PLAN OPTIMISÉ (6 semaines, 2-3j/semaine)

### **PHASE 1 : Audit & Nettoyage (Semaine 1-2)**

#### **Semaine 1 : MongoDB Cleanup** 
```bash
# Objectif : 1GB → 0.7GB
# Temps : 2-3 jours

# Actions prioritaires :
1. Analyser collections volumineuses
2. Supprimer données obsolètes/test
3. Optimiser indexes redondants
4. Archiver logs anciens

# Commandes d'audit :
db.runCommand("dbStats")
db.runCommand("collStats", "collection_name")
db.collection.totalIndexSize()
```

#### **Semaine 2 : Audit Tâches Cron**
```bash
# Objectif : Identifier tâches inutiles/sur-fréquentes
# Temps : 2-3 jours

# Analyser chaque tâche :
✅ autoClaimWinningNftAuctions (EVERY_MINUTE)
   → Nécessaire ? Fréquence optimale ?
   
✅ fetchExchangeRates (EVERY_MINUTE)  
   → Peut passer à EVERY_HOUR ?
   
✅ calculateGameRanking (EVERY_15_MINUTES)
   → Peut passer à EVERY_HOUR pendant faible trafic ?

# Gain CPU estimé : 70-80%
```

### **PHASE 2 : Migration DigitalOcean (Semaine 3-4)**

#### **Semaine 3 : Setup & Tests**
```bash
# Objectif : Environnement DO fonctionnel
# Temps : 3 jours

Jour 1 : Infrastructure DO
- Créer 2 Droplets (App + DB)
- Setup MongoDB Community
- Configuration réseau/firewall

Jour 2 : Déploiement Code  
- Docker containers optimisés
- Variables environnement
- Tests basiques

Jour 3 : Migration Données Test
- Export subset MongoDB Atlas
- Import sur DO MongoDB  
- Tests performance
```

#### **Semaine 4 : Optimisation**
```bash
# Objectif : Performance égale/supérieure
# Temps : 2-3 jours

Jour 1 : Optimisation Crons
- Réduire fréquences identifiées
- Tests charge avec nouveau timing
- Monitoring ressources

Jour 2-3 : Tests Complets
- Tests tous endpoints
- Simulation trafic 11h-19h
- Validation performances
```

### **PHASE 3 : Migration Production (Semaine 5-6)**

#### **Semaine 5 : Migration Données**
```bash
# Objectif : Données complètes sur DO
# Temps : 2-3 jours

Jour 1 : Export Complet Atlas
- Backup complet sécurisé
- Vérification intégrité
- Plan rollback

Jour 2 : Import DO + Tests
- Import données production
- Tests intégrité complets
- Validation fonctionnelle

Jour 3 : Sync Final
- Sync données différentielles
- Tests finaux
- Préparation basculement
```

#### **Semaine 6 : Go-Live**
```bash
# Objectif : Basculement production
# Temps : 2 jours + monitoring

Jour 1 : Basculement
- DNS switch progressif
- Monitoring intensif temps réel
- Tests utilisateurs

Jour 2 : Validation & Cleanup
- Validation stabilité 24h
- Arrêt services AWS/Atlas
- Documentation finale
```

---

## 💰 ÉCONOMIES PROGRESSIVES

### **Après Phase 1 (Semaine 2)**
```bash
# MongoDB Cleanup + Cron Optimization
MongoDB Atlas : M40 → M20 = -330$/mois
AWS CPU réduction : -200$/mois (moins de crons)
ÉCONOMIE : 530$/mois (gardez AWS/Atlas)
```

### **Après Phase 3 (Semaine 6)**
```bash
# Migration DigitalOcean Complète
DigitalOcean : 2 Droplets = 72$/mois
Arrêt AWS : -800$/mois  
Arrêt MongoDB Atlas : -580$/mois
ÉCONOMIE TOTALE : 1308$/mois

ROI : 6 semaines × 2.5j = 15 jours de travail
Économie annuelle : 15,700$/an
ROI : 1047$/jour économisé ! 🚀
```

---

## 🛠️ ARCHITECTURE DigitalOcean Détaillée

### **Droplet 1 : Application Server** (24$/mois)
```yaml
# Specs : 2 vCPU, 4GB RAM, 80GB SSD
services:
  cylimit-api:
    image: cylimit-api:latest
    ports: ["4000:4000"]
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://db-server:27017/cylimit
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G

  cylimit-frontend:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
      - ./dist:/usr/share/nginx/html

  redis:
    image: redis:alpine
    command: redis-server --maxmemory 512mb
    deploy:
      resources:
        limits:
          memory: 512M
```

### **Droplet 2 : Database Server** (48$/mois)
```yaml
# Specs : 4 vCPU, 8GB RAM, 160GB SSD
services:
  mongodb:
    image: mongo:6.0
    ports: ["27017:27017"]
    volumes:
      - mongodb_data:/data/db
      - ./mongod.conf:/etc/mongod.conf
    command: mongod --config /etc/mongod.conf
    deploy:
      resources:
        limits:
          memory: 6G
    environment:
      - MONGO_INITDB_DATABASE=cylimit

  # Backup automatique
  mongodb-backup:
    image: alpine:latest
    volumes:
      - mongodb_data:/data/db:ro
      - ./backups:/backups
    command: |
      sh -c "
        apk add --no-cache mongodb-tools &&
        while true; do
          mongodump --host mongodb --out /backups/$(date +%Y%m%d_%H%M%S)
          find /backups -type d -mtime +7 -exec rm -rf {} +
          sleep 86400
        done
      "
```

### **Configuration MongoDB Optimisée**
```yaml
# mongod.conf pour 0.7GB données
storage:
  dbPath: /data/db
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2  # 25% de la RAM
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: reopen

net:
  port: 27017
  bindIp: 0.0.0.0
  compression:
    compressors: "snappy,zstd"

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

setParameter:
  maxLogSizeKB: 10000
```

---

## 📋 CHECKLIST Détaillée par Semaine

### **✅ Semaine 1 : MongoDB Cleanup**
```bash
□ Connexion MongoDB Atlas
□ Audit db.stats() complet
□ Identification collections volumineuses
□ Suppression données test/obsolètes
□ Optimisation indexes
□ Validation 0.7GB atteint
□ Documentation changements
```

### **✅ Semaine 2 : Cron Audit**
```bash
□ Liste complète tâches cron actuelles
□ Analyse logs exécution (fréquence réelle)
□ Test réduction fréquences (env staging)
□ Mesure impact CPU/RAM
□ Validation fonctionnelle
□ Mise à jour configuration prod
□ Monitoring nouvelles performances
```

### **✅ Semaine 3 : DO Setup**
```bash
□ Compte DigitalOcean configuré
□ Création 2 Droplets
□ Configuration réseau/firewall
□ Installation Docker/Docker-compose
□ Setup MongoDB Community
□ Configuration SSL/domaines
□ Tests connectivité
```

### **✅ Semaine 4 : Tests Performance**
```bash
□ Déploiement code sur DO
□ Migration données test (subset)
□ Tests endpoints critiques
□ Simulation charge 11h-19h
□ Comparaison performances AWS vs DO
□ Optimisations identifiées
□ Validation OK pour prod
```

### **✅ Semaine 5 : Migration Données**
```bash
□ Export complet MongoDB Atlas
□ Vérification intégrité backup
□ Import sur DO MongoDB
□ Tests intégrité données
□ Validation fonctionnelle complète
□ Sync données différentielles
□ Plan rollback finalisé
```

### **✅ Semaine 6 : Go-Live**
```bash
□ DNS switch progressif (50% trafic)
□ Monitoring temps réel 2h
□ Switch 100% si OK
□ Monitoring 24h continu
□ Validation stabilité
□ Arrêt facturations AWS/Atlas
□ Documentation post-migration
```

---

## 🚨 PLAN de CONTINGENCE

### **Rollback Rapide**
```bash
# Si problème critique en production :
1. DNS switch retour AWS (5 minutes)
2. Reactive services AWS/Atlas 
3. Sync données différentielles
4. Validation fonctionnelle
5. Investigation problème DO

# Coût rollback : 0$ (services AWS pausés, pas supprimés)
```

### **Monitoring Critique**
```bash
# Métriques à surveiller H24 :
- Response time API (<200ms)
- Erreur rate (<1%)  
- MongoDB connexions (<50)
- CPU usage (<70%)
- RAM usage (<80%)
- Disk usage (<70%)

# Alertes automatiques configurées
```

---

## 💡 RECOMMANDATIONS Immédiates

### **Cette Semaine (2-3 jours)**
1. **MongoDB Audit** : Connectez-vous Atlas, faites `db.stats()` sur toutes collections
2. **Crons Analysis** : Listez toutes les tâches, leur fréquence réelle d'utilisation
3. **DO Account** : Créez compte DigitalOcean, familiarisez-vous interface

### **Semaine Prochaine**
1. **Cleanup MongoDB** : Supprimez données test/obsolètes
2. **Test DO** : Créez premier Droplet test 24$/mois
3. **Crons Optimization** : Réduisez fréquences non-critiques

### **Questions pour Affiner**
1. **Quelles tâches cron sont vraiment critiques** pour vos 200 users ?
2. **Avez-vous des données de test/dev** dans MongoDB prod ?
3. **Quel est votre niveau de confort** avec DigitalOcean ?

**Avec ce plan, vous économisez 1300$/mois en 6 semaines de travail à temps partiel !**
