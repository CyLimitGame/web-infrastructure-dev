# 🏗️ Guide Architecture CyLimit - Procédures Complètes

## 📋 **VUE D'ENSEMBLE DE L'ARCHITECTURE**

### 🎯 **Composants du Système**

```
🌐 FRONTEND                    🔧 BACKEND                     💾 DONNÉES
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│  👥 USER WEB    │ ────────▶ │  🚀 USER API    │ ────────▶ │  🗄️ MongoDB     │
│  cylimit.com    │           │  Port 4000      │           │  cylimit_dev    │
│  Next.js        │           │  Auth, NFT,     │           │  Users, NFT,    │
│                 │           │  Games, Users   │           │  Games, Teams   │
└─────────────────┘           └─────────────────┘           └─────────────────┘
                                       │                             ▲
┌─────────────────┐                    │                             │
│  🏢 ADMIN WEB   │ ───────────────────┼─────────────────────────────┘
│  admin.cylimit  │                    ▼
│  React/Next.js  │           ┌─────────────────┐           ┌─────────────────┐
└─────────────────┘           │  ⚙️ ADMIN API   │           │  ⚡ Redis       │
                              │  Port 3001 ✅   │ ────────▶ │  Background     │
                              │  Gestion, Jobs  │           │  Jobs Queue     │
                              │  Monitoring     │           │                 │
                              └─────────────────┘           └─────────────────┘
```

---

## 🚀 **PROCÉDURES DE LANCEMENT**

### 🔧 **1. DÉVELOPPEMENT LOCAL**

#### **A. Prérequis - Démarrer l'Infrastructure**
```bash
# 1. Aller dans le backend principal
cd "/Users/valentin/Desktop/CyLimit/Code web/cylimit-backend-develop"

# 2. Démarrer MongoDB + Redis via Docker
docker-compose -f docker-compose.local.yml up -d

# 3. Vérifier que les conteneurs tournent
docker ps | grep cylimit
# Doit afficher : cylimit-mongo-local et cylimit-redis-local
```

#### **B. Démarrer l'Admin Backend (Port 3001)**
```bash
# 1. Aller dans l'admin backend
cd "/Users/valentin/Desktop/CyLimit/Code web/cylimit-admin-backend"

# 2. S'assurer d'avoir la bonne configuration
cp env.development .env

# 3. Démarrer l'admin backend
yarn start:dev

# 4. Vérifier l'accès
curl http://localhost:3001/api/docs
# Swagger doit être accessible
```

#### **C. Démarrer le User Backend (Port 4000)**
```bash
# 1. Aller dans le backend principal
cd "/Users/valentin/Desktop/CyLimit/Code web/cylimit-backend-develop"

# 2. S'assurer d'avoir le bon .env (non visible mais doit exister)
# Variables importantes :
# MONGODB_HOST=localhost
# MONGODB_PORT=27017
# MONGODB_DATABASE=cylimit_dev
# REDIS_HOST=localhost
# REDIS_PORT=6379

# 3. Démarrer le backend principal
yarn start:dev

# 4. Vérifier l'accès
curl http://localhost:4000/health
```

#### **D. Démarrer le Frontend User**
```bash
# 1. Aller dans le frontend
cd "/Users/valentin/Desktop/CyLimit/Code web/cylimit-frontend-develop"

# 2. Démarrer le frontend
yarn dev

# 3. Accès : http://localhost:3000
```

#### **E. Frontend Admin (À CRÉER)**
```bash
# Le frontend admin n'existe pas encore
# Il faudra le créer pour pointer vers http://localhost:3001
```

---

### 🌐 **2. PRODUCTION ACTUELLE (AWS)**

#### **Architecture Actuelle**
```
Frontend User ──▶ User Backend (AWS) ──▶ MongoDB Atlas
                       │
                       ▼
Admin Frontend ──▶ Admin Backend (AWS) ──▶ Redis AWS
```

#### **URLs Production**
- **Frontend User** : https://cylimit.com
- **User API** : https://api.cylimit.com
- **Admin API** : https://admin-api.cylimit.com (AWS)
- **Base de données** : MongoDB Atlas

---

### ☁️ **3. PRODUCTION FUTURE (Google Cloud)**

#### **Architecture Cible**
```
Frontend User ──▶ User Backend (Cloud Run) ──▶ Firestore MongoDB
                       │
                       ▼
Admin Frontend ──▶ Admin Backend (Cloud Run) ✅ ──▶ Upstash Redis ✅
```

#### **URLs Futures**
- **Frontend User** : https://cylimit.com (Vercel ou Cloud Run)
- **User API** : https://api.cylimit.com (Cloud Run)
- **Admin API** : https://cylimit-admin-632699768762.europe-west1.run.app ✅
- **Base de données** : Firestore MongoDB-compatible

---

## 📁 **CONFIGURATION DES FICHIERS**

### 🔧 **Admin Backend**
```
cylimit-admin-backend/
├── .env                    # Configuration active (copie de env.development ou env.production)
├── env.development         # Configuration locale (MongoDB local)
├── env.production          # Configuration Cloud Run (Firestore)
└── env.gcloud.example      # Template pour Google Cloud
```

**Variables importantes :**
```bash
# Développement Local
DATABASE_URL=mongodb://localhost:27017/cylimit_dev
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379

# Production Cloud Run
DATABASE_URL=mongodb://admin:xxx@firestore.goog:443/cylimit
NODE_ENV=production
PORT=8080
REDIS_URL=rediss://xxx@upstash.io:6379
```

### 🚀 **User Backend**
```
cylimit-backend-develop/
├── .env                    # Configuration active (invisible)
├── docker-compose.local.yml # MongoDB + Redis local
└── src/config/envs/        # Configuration par environnement
```

---

## 🎯 **PROCÉDURES PAR CAS D'USAGE**

### 🧪 **Tester les fonctions Admin en local**
```bash
# 1. Démarrer l'infrastructure
cd cylimit-backend-develop
docker-compose -f docker-compose.local.yml up -d

# 2. Démarrer l'admin backend
cd ../cylimit-admin-backend
cp env.development .env
yarn start:dev

# 3. Accéder à Swagger
open http://localhost:3001/api/docs

# 4. Tester les endpoints admin
curl -X POST http://localhost:3001/admin/auth/check
```

### 🔄 **Développer une nouvelle fonctionnalité**
```bash
# 1. Démarrer TOUT l'environnement local
# Infrastructure
cd cylimit-backend-develop && docker-compose -f docker-compose.local.yml up -d

# Admin Backend
cd ../cylimit-admin-backend && cp env.development .env && yarn start:dev &

# User Backend  
cd ../cylimit-backend-develop && yarn start:dev &

# Frontend
cd ../cylimit-frontend-develop && yarn dev &

# 2. URLs de développement
# Frontend User : http://localhost:3000
# User API : http://localhost:4000
# Admin API : http://localhost:3001
# Swagger Admin : http://localhost:3001/api/docs
```

### 🚀 **Déployer en production**
```bash
# Admin Backend (DÉJÀ FAIT ✅)
cd cylimit-admin-backend
cp env.production .env
./deploy-cloud-run.sh

# User Backend (À FAIRE)
cd cylimit-backend-develop
# Créer Dockerfile.gcloud
# Configurer variables Cloud Run
# Déployer sur Cloud Run

# Frontend (À FAIRE)
cd cylimit-frontend-develop
# Déployer sur Vercel ou Cloud Run
```

---

## 🔍 **DÉPANNAGE**

### ❌ **Erreurs Communes**

#### **Port déjà utilisé**
```bash
# Trouver le processus qui utilise le port
lsof -ti:3001
# Arrêter le processus
lsof -ti:3001 | xargs kill -9
```

#### **Base de données vide**
```bash
# Vérifier la base
mongosh cylimit_dev --eval "db.stats()"

# Si vide, démarrer le backend principal une fois
cd cylimit-backend-develop
yarn start:dev
# Cela va créer les collections nécessaires
```

#### **Conteneurs Docker**
```bash
# Voir les conteneurs
docker ps -a | grep cylimit

# Redémarrer les conteneurs
cd cylimit-backend-develop
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d
```

#### **Mauvaise configuration**
```bash
# Admin Backend
cd cylimit-admin-backend
cp env.development .env  # Pour local
cp env.production .env   # Pour production

# Vérifier la config active
head -5 .env
```

---

## 📊 **ÉTAT ACTUEL DE LA MIGRATION**

### ✅ **TERMINÉ**
- ✅ **Admin Backend** : Déployé sur Cloud Run
- ✅ **Configuration locale** : Admin backend fonctionne en local
- ✅ **Base de données** : Configuration unifiée cylimit_dev
- ✅ **Redis** : Upstash gratuit configuré
- ✅ **Documentation** : Swagger accessible

### 🔄 **EN COURS**
- 🔄 **User Backend** : Migration vers Cloud Run
- 🔄 **Frontend** : Migration vers Vercel/Cloud Run
- 🔄 **Frontend Admin** : À recréer

### 📋 **À FAIRE**
- 📋 **Optimisation MongoDB** : Nettoyer les collections lourdes
- 📋 **Firebase Auth** : Migration prévue janvier 2025
- 📋 **Monitoring** : Mise en place des alertes

---

## 💡 **CONSEILS**

### 🎯 **Bonnes Pratiques**
1. **Toujours démarrer l'infrastructure en premier** (MongoDB + Redis)
2. **Utiliser les bons fichiers de config** selon l'environnement
3. **Vérifier les ports** avant de démarrer les services
4. **Tester avec Swagger** pour les APIs
5. **Garder les fichiers env.* synchronisés**

### 🚨 **Points d'Attention**
- **Fichiers .env invisibles** : Utiliser les fichiers `env` (sans point) pour les voir
- **Ports par défaut** : Admin=3001, User=4000, Frontend=3000
- **Base de données** : Toujours utiliser `cylimit_dev` en local
- **Docker** : Redémarrer les conteneurs si problème de connexion

---

## 🎯 **PROCHAINES ÉTAPES RECOMMANDÉES**

1. **Tester l'admin backend** avec des données réelles
2. **Migrer le user backend** vers Cloud Run
3. **Créer le frontend admin** 
4. **Optimiser MongoDB** (économie 300$/mois)
5. **Planifier Firebase Auth** (janvier 2025)

**Économie totale projetée : ~900$/mois soit ~10 800€/an** 🚀
