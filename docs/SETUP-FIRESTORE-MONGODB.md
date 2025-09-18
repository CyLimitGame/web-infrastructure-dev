# 🔥 Configuration Firestore MongoDB-Compatible

## 🎯 **Étape 1 : Créer la Base Firestore**

### **Via la Console Web (Recommandé)**
1. Va sur [console.cloud.google.com/firestore](https://console.cloud.google.com/firestore)
2. **Sélectionner le projet** : `bionic-plate-471712-b8`
3. Cliquer sur **"Créer une base de données"**

### **Configuration Importante** ⚠️
- **Mode** : Sélectionner **"Firestore en mode MongoDB"** 🎯
- **Région** : `europe-west1` (Belgique - proche de toi)
- **Type** : Production (pas test)

## 🔧 **Étape 2 : Configuration Automatique**

Une fois Firestore créé, on pourra :

### **2.1 Créer le Compte de Service**
```bash
gcloud iam service-accounts create cylimit-backend \
  --display-name="CyLimit Backend Service"
```

### **2.2 Donner les Permissions**
```bash
gcloud projects add-iam-policy-binding bionic-plate-471712-b8 \
  --member="serviceAccount:cylimit-backend@bionic-plate-471712-b8.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### **2.3 Créer la Clé d'Authentification**
```bash
gcloud iam service-accounts keys create cylimit-service-key.json \
  --iam-account=cylimit-backend@bionic-plate-471712-b8.iam.gserviceaccount.com
```

## 🎯 **Prochaines Étapes**

1. ✅ **APIs activées**
2. 🔄 **Créer Firestore** (via console web)
3. 🔑 **Configurer l'authentification**
4. 🚀 **Premier test de connexion**

**Va sur la console Firestore et dis-moi quand c'est créé !**
