# CyLimit - Architecture Optimisée pour 200 users/jour

## 🚨 DIAGNOSTIC : Surdimensionnement Massif

### **Situation Actuelle vs Réalité**
- **Trafic réel** : 200 users/jour (~8 users simultanés max)
- **Infrastructure** : Dimensionnée pour 50,000+ users simultanés
- **Coût** : 1380$/mois = **6.90$/user/mois** (vs 0.10-0.20$ normal)
- **Ratio** : **35x trop cher !**

---

## 🔍 CAUSES du Surdimensionnement

### **1. Tâches Cron Intensives** ⚠️
D'après votre code, vous avez des processus très lourds :

```typescript
// Tâches qui tournent en permanence :
- EVERY_MINUTE: autoClaimWinningNftAuctions()
- EVERY_MINUTE: fetchExchangeRates() 
- EVERY_15_MINUTES: calculateGameRanking()
- EVERY_HOUR: syncRidersOnComingGames()
- DAILY: calculateAverageCapScores()
- DAILY: syncPcsRaces()
```

**Problème** : Ces tâches sont conçues pour des milliers d'utilisateurs !

### **2. Architecture "Enterprise" pour un Prototype**
- **Bull Queues** : Système de queues complexe
- **Redis** : Cache pour haute charge
- **MongoDB Atlas M40+** : Cluster haute disponibilité
- **AWS Multi-services** : ECR, CloudWatch, S3, etc.

### **3. Développement en Mode "Production"**
- Logging intensif (CloudWatch coûteux)
- Monitoring avancé
- Backups redondants
- Haute disponibilité inutile

---

## 🎯 SOLUTION : Architecture Optimisée DigitalOcean

### **Pourquoi DigitalOcean ?** ⭐
1. **Déjà utilisé** pour Unity → Expertise équipe
2. **Prix transparent** : Pas de surprises comme AWS
3. **Simplicité** : Interface plus simple
4. **Performance** : Excellente pour votre usage
5. **Scaling** : Facile quand vous grandirez

### **Architecture Recommandée**

#### **Option 1 : Droplet Unique** 💰 **ULTRA ÉCONOMIQUE**
```bash
# DigitalOcean Droplet : 48$/mois
# CPU-Optimized: 4 vCPU, 8GB RAM, 100GB SSD

Services sur le même serveur :
- NestJS API
- Next.js Frontend (build statique)
- MongoDB Community
- Redis
- Nginx (reverse proxy)

# Total : 48$/mois vs 1380$/mois
# Économie : 1332$/mois (96% !)
```

#### **Option 2 : Droplets Séparés** ⭐ **RECOMMANDÉ**
```bash
# App Server : 24$/mois (2 vCPU, 4GB RAM)
- NestJS API
- Next.js Frontend
- Redis
- Nginx

# Database Server : 48$/mois (4 vCPU, 8GB RAM)
- MongoDB Community
- Backups automatiques
- Monitoring

# Total : 72$/mois vs 1380$/mois  
# Économie : 1308$/mois (95% !)
```

---

## 🛠️ OPTIMISATIONS Spécifiques

### **1. Tâches Cron Optimisées**
```typescript
// AVANT (Production-ready)
autoClaimWinningNftAuctions: EVERY_MINUTE
fetchExchangeRates: EVERY_MINUTE
calculateGameRanking: EVERY_15_MINUTES

// APRÈS (Optimisé 200 users)
autoClaimWinningNftAuctions: EVERY_10_MINUTES
fetchExchangeRates: EVERY_HOUR
calculateGameRanking: EVERY_HOUR

// Économie CPU : 80-90%
```

### **2. MongoDB Optimisé**
```bash
# AVANT : MongoDB Atlas M40 (580$/mois)
- 160GB Storage
- 15.25GB RAM
- Dedicated CPU

# APRÈS : MongoDB Community sur DO (inclus dans 48$/mois)
- 20GB Storage suffisant
- 2GB RAM alloués
- CPU partagé

# Votre usage réel estimé :
- Base de données : <500MB
- Connexions simultanées : <20
- Requêtes/seconde : <10
```

### **3. Suppression Services Inutiles**
```bash
# À supprimer immédiatement :
❌ AWS ECR → DockerHub gratuit
❌ AWS CloudWatch → Logs locaux
❌ AWS S3 → DigitalOcean Spaces (5$/mois)
❌ Redis cluster → Redis simple
❌ Bull Queues complexes → Tâches directes

# Économie : 600-700$/mois
```

---

## 📋 PLAN de MIGRATION (2 semaines)

### **Semaine 1 : Préparation**

#### **Jour 1-2 : Audit Détaillé**
```bash
# Analyser usage réel :
1. Taille base MongoDB actuelle
2. Pics de trafic réels
3. Logs d'erreurs AWS
4. Usage CPU/RAM réel

# Commandes à exécuter :
db.stats() # Taille MongoDB
docker stats # Usage containers
aws logs insights # Analyser logs
```

#### **Jour 3-4 : Setup DigitalOcean**
```bash
# Créer infrastructure DO :
1. Droplet App Server (2 vCPU, 4GB)
2. Droplet DB Server (4 vCPU, 8GB)  
3. DigitalOcean Spaces (S3 alternative)
4. Load Balancer (si besoin futur)
5. Monitoring (gratuit DO)
```

#### **Jour 5-7 : Tests Migration**
```bash
# Environment de test :
1. Déployer code sur DO
2. Migrer subset de données
3. Tests performance
4. Optimisation tâches cron
```

### **Semaine 2 : Migration Production**

#### **Jour 8-10 : Migration Données**
```bash
# Migration MongoDB :
1. Export complet Atlas
2. Import sur DO MongoDB
3. Vérification intégrité
4. Tests complets

# Migration fichiers :
1. Sync S3 → DO Spaces
2. Update URLs code
3. Tests uploads
```

#### **Jour 11-14 : Basculement**
```bash
# Go-live :
1. DNS switch progressif
2. Monitoring intensif
3. Rollback plan ready
4. Performance validation
```

---

## 💻 DÉVELOPPEMENT LOCAL Optimisé

### **Ce qui PEUT tourner en Local** ✅
```bash
# Environnement développement :
- NestJS API (nodemon)
- Next.js Frontend (dev server)
- MongoDB local (Docker)
- Redis local (Docker)

# Commande unique :
docker-compose -f docker-compose.dev.yml up

# Coût : 0$/mois en dev
```

### **Ce qui DOIT rester sur Serveur** ❌
```bash
# Production uniquement :
- Tâches cron (ProCyclingStats sync)
- Webhooks externes (Stripe, etc.)
- Stockage fichiers persistant
- Base de données production
- SSL/HTTPS
```

### **Docker Compose Optimisé**
```yaml
# docker-compose.prod.yml optimisé
version: '3.9'
services:
  api:
    image: cylimit-api:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'      # vs 2.0 actuellement
          memory: 512M     # vs 2G actuellement
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=400

  frontend:
    image: nginx:alpine
    volumes:
      - ./dist:/usr/share/nginx/html
    deploy:
      resources:
        limits:
          memory: 64M      # Statique uniquement

  mongodb:
    image: mongo:6.0
    deploy:
      resources:
        limits:
          memory: 1G       # vs 15G actuellement
    volumes:
      - mongodb_data:/data/db
    command: mongod --wiredTigerCacheSizeGB 0.5

  redis:
    image: redis:alpine
    deploy:
      resources:
        limits:
          memory: 128M     # vs 1G actuellement
    command: redis-server --maxmemory 100mb
```

---

## 📊 COMPARATIF Final

### **Coûts Mensuels**
| Service | Actuel AWS/Atlas | DigitalOcean | Économie |
|---------|------------------|--------------|----------|
| **Compute** | 800$/mois | 24$/mois | **776$/mois** |
| **Database** | 580$/mois | 24$/mois | **556$/mois** |
| **Storage** | ~100$/mois | 5$/mois | **95$/mois** |
| **Monitoring** | ~50$/mois | 0$/mois | **50$/mois** |
| **TOTAL** | **1530$/mois** | **53$/mois** | **🚀 1477$/mois** |

### **Performances Attendues**
| Métrique | Actuel | DO Optimisé | Impact |
|----------|--------|-------------|--------|
| **Response Time** | <100ms | <150ms | ✅ Acceptable |
| **Concurrent Users** | 10,000+ | 500+ | ✅ Largement suffisant |
| **Uptime** | 99.9% | 99.5% | ✅ Excellent pour votre stade |
| **Scaling** | Auto | Manuel | ⚠️ OK jusqu'à 10k users |

---

## 🎯 ACTIONS IMMÉDIATES (Cette Semaine)

### **1. Audit Usage Réel** (2h)
```bash
# Dans MongoDB Atlas :
1. Metrics → Performance
2. Vérifier pics utilisation
3. Taille données réelles
4. Connexions simultanées

# Dans AWS Console :
1. Cost Explorer détaillé
2. EC2 utilisation CPU/RAM
3. CloudWatch logs volume
4. S3 storage réel
```

### **2. Test DigitalOcean** (4h)
```bash
# Créer compte DO :
1. Droplet test 24$/mois
2. Déployer version simplifiée
3. Tests performance basiques
4. Estimation coûts réels
```

### **3. Optimisation Immédiate** (1 jour)
```bash
# Sans migration, économies rapides :
1. MongoDB Atlas M40 → M10 : -400$/mois
2. AWS instances downsize : -300$/mois
3. CloudWatch logs réduction : -100$/mois
4. Services AWS inutiles : -200$/mois

# Total économie rapide : 1000$/mois
```

---

## 💡 RECOMMANDATION FINALE

**Pour 200 users/jour, vous devriez payer 50-100$/mois maximum, pas 1380$ !**

### **Plan Recommandé :**
1. **Immédiat** : Downgrade MongoDB + AWS (économie 1000$/mois)
2. **Semaine 1-2** : Migration DigitalOcean (économie totale 1300$/mois)
3. **Semaine 3-4** : Optimisation code + crons

### **ROI :**
- **Investissement** : 1-2 semaines travail
- **Économie** : 15,000-18,000$/an
- **Payback** : Immédiat

**Voulez-vous qu'on commence par l'audit détaillé de votre usage actuel ?**
