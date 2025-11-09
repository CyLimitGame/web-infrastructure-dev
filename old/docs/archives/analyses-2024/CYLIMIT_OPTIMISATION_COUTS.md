# CyLimit - Plan d'Optimisation des Coûts

## 🚨 Situation Actuelle : 1380$/mois
- **AWS** : 800$/mois 
- **MongoDB** : 580$/mois
- **Total** : 1380$/mois pour un projet en développement

## 🎯 Objectif : Réduire à 150-300$/mois (économie de 1000-1200$/mois)

---

## 📊 Analyse des Coûts Actuels

### **AWS - 800$/mois (Probablement surdimensionné)**
D'après votre docker-compose, vous utilisez :
- ECR (Container Registry) 
- CloudWatch Logs
- Probablement EC2 instances oversized
- S3 pour stockage fichiers/images
- Possiblement RDS ou autres services

### **MongoDB Atlas - 580$/mois**
- Cluster M40+ ou plusieurs clusters
- Probablement en production avec réplication
- Backup automatique
- Monitoring avancé

---

## 🚀 Solutions d'Optimisation Immédiates

### **Phase 1 : MongoDB (Économie 400-500$/mois)**

#### **Option A : Downgrade MongoDB Atlas** ⭐ **RECOMMANDÉ**
```bash
# Configuration actuelle estimée : M40 (~580$/mois)
# ↓ Passage à M20 (~250$/mois) 
# Économie : ~330$/mois

# Spécifications M20 :
- 20GB Storage
- 2.5GB RAM  
- Shared CPU
- Suffisant pour <100k utilisateurs actifs
```

#### **Option B : MongoDB Auto-hébergé** 💰 **MAX ÉCONOMIE**
```bash
# VPS chez Hetzner/DigitalOcean : 40-80$/mois
# vs Atlas 580$/mois
# Économie : ~500$/mois

# Configuration recommandée :
- Hetzner CCX32 : 60€/mois (~65$/mois)
- 8 vCPU, 32GB RAM, 240GB SSD
- MongoDB + Redis + Monitoring
```

### **Phase 2 : AWS (Économie 500-600$/mois)**

#### **Option A : Optimisation AWS** ⭐ **RECOMMANDÉ**
```bash
# 1. EC2 Right-sizing
t3.large → t3.small : -200$/mois
t3.xlarge → t3.medium : -300$/mois

# 2. Reserved Instances (1 an)
Économie : -30-50% sur compute

# 3. S3 Intelligent Tiering
Économie : -20-40% sur stockage

# 4. CloudWatch Logs optimisation
Réduction rétention : -50-100$/mois
```

#### **Option B : Migration VPS** 💰 **MAX ÉCONOMIE**
```bash
# Hetzner CCX52 : 120€/mois (~130$/mois)
# vs AWS 800$/mois
# Économie : ~670$/mois

# Spécifications :
- 16 vCPU, 64GB RAM, 360GB SSD
- Docker Swarm ou Kubernetes
- Backups automatiques
- Monitoring intégré
```

---

## 📋 Plan de Migration Étape par Étape

### **🎯 Phase 1 : Optimisation MongoDB (Semaine 1)**

#### **Étape 1 : Audit Atlas actuel**
```bash
# Vérifier utilisation réelle :
1. Connexions simultanées
2. Utilisation CPU/RAM
3. Taille données réelles
4. Requêtes lentes (profiler)

# Commandes Atlas :
db.runCommand({dbStats: 1})
db.runCommand({serverStatus: 1})
```

#### **Étape 2 : Downgrade Atlas**
```bash
# Migration M40 → M20 :
1. Backup complet
2. Changement cluster size (Atlas UI)
3. Test performance post-migration
4. Monitoring 48h

# Économie immédiate : ~330$/mois
```

### **🎯 Phase 2 : Optimisation AWS (Semaine 2-3)**

#### **Étape 1 : Audit AWS actuel**
```bash
# Utiliser AWS Cost Explorer :
1. Identifier services les plus coûteux
2. Analyser utilisation réelle EC2
3. Vérifier stockage S3 inutilisé
4. Logs CloudWatch oversized

# Outils recommandés :
- AWS Trusted Advisor
- AWS Compute Optimizer
- AWS Cost Anomaly Detection
```

#### **Étape 2 : Right-sizing immédiat**
```bash
# Actions prioritaires :
1. Downsize instances EC2 sur-dimensionnées
2. Reserved Instances pour compute stable
3. S3 Lifecycle policies
4. CloudWatch Logs retention (7-30 jours max)

# Économie estimée : 200-400$/mois
```

### **🎯 Phase 3 : Migration VPS (Optionnel - Semaine 4-6)**

#### **Architecture Recommandée Hetzner**
```yaml
# Stack complet sur 2 serveurs :

# Serveur 1 - Application (CCX32 - 65$/mois)
- Docker Swarm Manager
- NestJS API (2 replicas)
- Next.js Frontend
- Redis
- Monitoring (Grafana/Prometheus)

# Serveur 2 - Base de données (CCX32 - 65$/mois)  
- MongoDB (Primary)
- MongoDB Backups
- Logs centralisés

# Total : 130$/mois vs 1380$/mois
# Économie : 1250$/mois (90% de réduction !)
```

---

## 🛠️ Configurations Techniques Optimisées

### **MongoDB Configuration Optimisée**
```javascript
// mongod.conf optimisé pour M20/VPS
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1.5  // 60% de la RAM disponible
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

net:
  compression:
    compressors: "snappy,zstd"
```

### **Docker Compose Production Optimisé**
```yaml
version: '3.9'
services:
  api:
    image: cylimit-api:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=768
    
  redis:
    image: redis:alpine
    deploy:
      resources:
        limits:
          memory: 256M
    command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru

  mongodb:
    image: mongo:6.0
    deploy:
      resources:
        limits:
          memory: 2G
    command: mongod --wiredTigerCacheSizeGB 1.5
```

### **Optimisations Code Backend**
```typescript
// Configuration MongoDB optimisée
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: process.env.MONGODB_URI,
    // Optimisations connexion
    maxPoolSize: 10,        // vs 100 par défaut
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // Compression
    compressors: ['snappy'],
    // Cache optimisé
    bufferMaxEntries: 0,
    bufferCommands: false,
  }),
}),

// Redis configuration optimisée  
RedisModule.forRootAsync({
  useFactory: () => ({
    config: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      // Optimisations mémoire
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // TTL par défaut
      keyPrefix: 'cylimit:',
    },
  }),
}),
```

---

## 💰 Comparatif des Économies

### **Scénario 1 : Optimisation AWS/MongoDB** ⭐ **RECOMMANDÉ**
| Service | Actuel | Optimisé | Économie |
|---------|--------|----------|----------|
| MongoDB Atlas | 580$/mois | 250$/mois | **330$/mois** |
| AWS EC2 | ~400$/mois | 150$/mois | **250$/mois** |
| AWS S3/Autres | ~400$/mois | 100$/mois | **300$/mois** |
| **TOTAL** | **1380$/mois** | **500$/mois** | **🎯 880$/mois** |

### **Scénario 2 : Migration VPS Complète** 💰 **MAX ÉCONOMIE**
| Service | Actuel | VPS | Économie |
|---------|--------|-----|----------|
| MongoDB Atlas | 580$/mois | 0$/mois | **580$/mois** |
| AWS | 800$/mois | 0$/mois | **800$/mois** |
| Hetzner VPS (2x) | 0$/mois | 130$/mois | - |
| Monitoring/Backup | 0$/mois | 20$/mois | - |
| **TOTAL** | **1380$/mois** | **150$/mois** | **🚀 1230$/mois** |

---

## ⚠️ Risques et Précautions

### **Risques Optimisation**
1. **Performance** : Monitoring crucial post-downgrade
2. **Disponibilité** : Tests de charge nécessaires
3. **Backup** : Vérification stratégie de sauvegarde
4. **Monitoring** : Alertes sur métriques critiques

### **Risques Migration VPS**
1. **Expertise DevOps** : Gestion infrastructure manuelle
2. **Haute disponibilité** : Configuration multi-zones
3. **Sécurité** : Hardening serveurs requis
4. **Maintenance** : Updates/patches à gérer

### **Plan de Contingence**
```bash
# Rollback rapide si problèmes :
1. Backup complet avant migration
2. DNS switch rapide possible
3. Monitoring alertes configurées
4. Procédures documentées
```

---

## 🎯 Recommandations Immédiates (Cette Semaine)

### **Action 1 : Audit MongoDB Atlas** (2h)
```bash
# Vérifier utilisation réelle :
1. Se connecter à Atlas
2. Metrics → Performance Advisor
3. Identifier pics d'utilisation
4. Vérifier si M20 suffisant
```

### **Action 2 : AWS Cost Explorer** (1h)
```bash
# Identifier gaspillages :
1. AWS Console → Cost Management
2. Grouper par service
3. Analyser tendances 3 derniers mois
4. Identifier instances over-provisioned
```

### **Action 3 : Test Downgrade MongoDB** (1 jour)
```bash
# Test en staging d'abord :
1. Créer cluster M20 test
2. Migrer données staging
3. Tests de performance
4. Si OK → Migration production
```

## 💡 Conclusion

**Économie réaliste immédiate : 800-900$/mois** avec optimisations AWS/MongoDB.

**Économie maximale : 1200$/mois** avec migration VPS complète.

**ROI** : Investissement 1-2 semaines de travail pour économiser 10,000-15,000$/an.

**Recommandation** : Commencer par l'optimisation (moins de risques) puis évaluer la migration VPS selon votre appétit pour la gestion d'infrastructure.
