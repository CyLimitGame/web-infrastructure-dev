# 🚀 Setup Google Cloud pour CyLimit

## 📋 **Étape 1 : Création du Projet**

### **1.1 Accéder à Google Cloud Console**
- Aller sur [console.cloud.google.com](https://console.cloud.google.com)
- Se connecter avec ton compte Google
- Accepter les **300$ de crédits gratuits** 💰

### **1.2 Créer le Projet**
1. Cliquer sur **"Sélectionner un projet"** en haut
2. Cliquer sur **"Nouveau projet"**
3. **Nom du projet** : `cylimit-production`
4. **ID du projet** : `cylimit-prod-2024` (doit être unique)
5. Cliquer sur **"Créer"**

### **1.3 Activer la Facturation**
1. Menu ☰ → **Facturation**
2. **Associer un compte de facturation**
3. Ajouter une carte bancaire (obligatoire, pas débitée avec les crédits)

---

## 🔧 **Étape 2 : Installation Google Cloud CLI**

### **2.1 Installer gcloud CLI**
```bash
# Sur macOS avec Homebrew
brew install google-cloud-sdk

# Ou télécharger depuis :
# https://cloud.google.com/sdk/docs/install
```

### **2.2 Authentification**
```bash
# Se connecter à Google Cloud
gcloud auth login

# Configurer le projet par défaut
gcloud config set project cylimit-prod-2024

# Vérifier la configuration
gcloud config list
```

---

## 🗄️ **Étape 3 : Activer les APIs Nécessaires**

```bash
# Activer les APIs requises
gcloud services enable \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  firebase.googleapis.com
```

---

## 🔥 **Étape 4 : Configurer Firestore MongoDB-Compatible**

### **4.1 Créer la Base Firestore**
1. Console Cloud → **Firestore**
2. **Créer une base de données**
3. Choisir **"Firestore en mode MongoDB"** 🎯
4. **Région** : `europe-west1` (Belgique - proche de toi)
5. **Mode** : Production

### **4.2 Configurer l'Accès**
```bash
# Créer un compte de service
gcloud iam service-accounts create cylimit-backend \
  --display-name="CyLimit Backend Service"

# Donner les permissions Firestore
gcloud projects add-iam-policy-binding cylimit-prod-2024 \
  --member="serviceAccount:cylimit-backend@cylimit-prod-2024.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Créer et télécharger la clé
gcloud iam service-accounts keys create cylimit-service-key.json \
  --iam-account=cylimit-backend@cylimit-prod-2024.iam.gserviceaccount.com
```

---

## 🚀 **Étape 5 : Préparer Cloud Run**

### **5.1 Configurer Docker**
```bash
# Configurer Docker pour Google Container Registry
gcloud auth configure-docker
```

### **5.2 Variables d'Environnement**
Créer `.env.gcloud` :
```bash
# Base de données Firestore MongoDB-compatible
DATABASE_URL=mongodb://firestore-mongodb-endpoint/cylimit
GOOGLE_APPLICATION_CREDENTIALS=./cylimit-service-key.json

# Autres variables (identiques à ton .env actuel)
JWT_SECRET=ton-jwt-secret
STRIPE_SECRET_KEY=sk_...
AWS_ACCESS_KEY_ID=...
```

---

## 📊 **Étape 6 : Monitoring et Coûts**

### **6.1 Configurer les Alertes de Coût**
1. Console → **Facturation** → **Budgets et alertes**
2. **Créer un budget** : $50/mois
3. **Alertes** : 50%, 90%, 100%
4. **Email** : ton-email@domain.com

### **6.2 Monitoring**
```bash
# Activer le monitoring
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

---

## ✅ **Vérification de l'Installation**

```bash
# Vérifier que tout est configuré
gcloud config list
gcloud services list --enabled
gcloud projects describe cylimit-prod-2024
```

---

## 🎯 **Prochaines Étapes**

1. ✅ **Projet créé** et configuré
2. 🔄 **Migrer un subset de données** vers Firestore
3. 🚀 **Déployer cylimit-admin-backend** sur Cloud Run
4. 📊 **Tester performance** et coûts

**Une fois ces étapes terminées, on pourra commencer la migration !** 🚀
