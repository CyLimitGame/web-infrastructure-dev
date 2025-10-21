# 🔧 SETUP : Configuration Pinata + Google Cloud Storage

**Date :** 15 Octobre 2025  
**Objectif :** Guide pas-à-pas pour configurer Pinata et Google Cloud Storage  
**Durée :** 30-45 minutes

---

## 📋 Prérequis

- ✅ Compte Gmail / Google Cloud
- ✅ Carte bancaire (pour Google Cloud, gratuit mais requis)
- ✅ Email valide (pour Pinata)

---

## 1️⃣ Configuration Pinata

### **Étape 1.1 : Créer un compte Pinata**

1. Aller sur https://www.pinata.cloud/?via=nftstorage
2. Cliquer sur **"Sign Up"**
3. Utiliser ton email **valentin@cylimit.com**
4. Vérifier l'email de confirmation

### **Étape 1.2 : Choisir un plan**

1. Se connecter à Pinata
2. Aller dans **"Billing"**
3. Sélectionner le plan **"Picnic"** ($20/mois)
4. Utiliser le code promo : **`NFTSTORAGE50`** (50% off premier mois)
5. Entrer les infos de paiement

**Coût :** $10 le premier mois, puis $20/mois

### **Étape 1.3 : Créer les API Keys**

1. Aller dans **"API Keys"** (menu gauche)
2. Cliquer sur **"New Key"**
3. Nom : `CyLimit NFT Remint`
4. Permissions :
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
   - ✅ `pinList`
   - ✅ `userPinPolicy`
5. Cliquer sur **"Create Key"**
6. **⚠️ IMPORTANT :** Copier immédiatement :
   - `API Key` → `PINATA_API_KEY`
   - `API Secret` → `PINATA_SECRET_API_KEY`
7. **⚠️ Tu ne pourras plus voir le Secret après !**

### **Étape 1.4 : Tester la connexion**

```bash
# Tester avec curl
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET_KEY"

# Résultat attendu :
# {"message":"Congratulations! You are communicating with the Pinata API!"}
```

### **Étape 1.5 : Ajouter au .env**

```bash
# Dans cylimit-admin-backend/.env
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here
```

✅ **Pinata configuré !**

---

## 2️⃣ Configuration Google Cloud Storage

### **Étape 2.1 : Créer un projet Google Cloud**

1. Aller sur https://console.cloud.google.com/
2. Se connecter avec ton compte Gmail
3. Cliquer sur **"Select a project"** (en haut)
4. Cliquer sur **"NEW PROJECT"**
5. Nom : `cylimit-production`
6. Organisation : Aucune (ou ton organisation)
7. Cliquer sur **"CREATE"**
8. Attendre 30 secondes → Projet créé ✅

### **Étape 2.2 : Activer l'API Cloud Storage**

1. Aller dans **"APIs & Services"** → **"Library"**
2. Rechercher : `Cloud Storage API`
3. Cliquer dessus
4. Cliquer sur **"ENABLE"**
5. Attendre activation (quelques secondes)

### **Étape 2.3 : Créer un Service Account**

1. Aller dans **"IAM & Admin"** → **"Service Accounts"**
2. Cliquer sur **"CREATE SERVICE ACCOUNT"**
3. Nom : `cylimit-nft-uploader`
4. Description : `Service account for uploading NFT images and metadata`
5. Cliquer sur **"CREATE AND CONTINUE"**
6. Role : Sélectionner **"Storage Object Admin"**
7. Cliquer sur **"CONTINUE"**
8. Cliquer sur **"DONE"**

### **Étape 2.4 : Créer une clé JSON**

1. Dans la liste des Service Accounts, cliquer sur `cylimit-nft-uploader@...`
2. Aller dans l'onglet **"KEYS"**
3. Cliquer sur **"ADD KEY"** → **"Create new key"**
4. Type : **JSON**
5. Cliquer sur **"CREATE"**
6. Un fichier JSON est téléchargé automatiquement
7. **Renommer le fichier** : `cylimit-gcs-key.json`
8. **Déplacer le fichier** vers `cylimit-admin-backend/cylimit-gcs-key.json`

**⚠️ IMPORTANT :** Ne JAMAIS commit ce fichier dans Git !

```bash
# Ajouter dans .gitignore
echo "cylimit-gcs-key.json" >> .gitignore
```

### **Étape 2.5 : Créer un bucket**

#### **Option A : Via Console Web (plus simple)**

1. Aller dans **"Cloud Storage"** → **"Buckets"**
2. Cliquer sur **"CREATE BUCKET"**
3. Nom : `cylimit-nfts-backup` (doit être unique mondialement)
   - Si déjà pris, essayer : `cylimit-nfts-backup-2025`
4. Location type : **Region**
5. Region : **europe-west1** (Belgique - proche de la France)
6. Storage class : **Standard**
7. Access control : **Uniform**
8. Public access : **Fine-grained** (on configure après)
9. Cliquer sur **"CREATE"**

#### **Option B : Via gcloud CLI (avancé)**

```bash
# Installer gcloud CLI (si pas déjà fait)
brew install google-cloud-sdk

# Authentification
gcloud auth login

# Créer bucket
gsutil mb -p cylimit-production -l europe-west1 gs://cylimit-nfts-backup
```

### **Étape 2.6 : Rendre le bucket public (lecture seule)**

1. Aller sur le bucket `cylimit-nfts-backup`
2. Onglet **"PERMISSIONS"**
3. Cliquer sur **"GRANT ACCESS"**
4. New principals : `allUsers`
5. Role : **Storage Object Viewer**
6. Cliquer sur **"SAVE"**
7. Confirmer "Allow public access"

**Résultat :** Tous les fichiers uploadés seront accessibles publiquement en lecture.

### **Étape 2.7 : Configurer CORS (optionnel)**

Si tu veux accéder aux images depuis ton site web :

```bash
# Créer fichier cors.json
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Appliquer CORS
gsutil cors set cors.json gs://cylimit-nfts-backup
```

### **Étape 2.8 : Ajouter au .env**

```bash
# Dans cylimit-admin-backend/.env
GCS_PROJECT_ID=cylimit-production
GCS_BUCKET_NAME=cylimit-nfts-backup
GCS_KEY_FILE=./cylimit-gcs-key.json
```

### **Étape 2.9 : Tester la connexion**

```bash
# Installer le package (si pas déjà fait)
npm install @google-cloud/storage --legacy-peer-deps

# Tester upload
node -e "
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: 'cylimit-production',
  keyFilename: './cylimit-gcs-key.json',
});
const bucket = storage.bucket('cylimit-nfts-backup');

bucket.exists().then(([exists]) => {
  if (exists) {
    console.log('✅ Connexion Google Storage OK !');
  } else {
    console.error('❌ Bucket introuvable !');
  }
}).catch(console.error);
"
```

✅ **Google Cloud Storage configuré !**

---

## 3️⃣ Vérification Finale

### **Vérifier les variables d'environnement**

```bash
cd cylimit-admin-backend

# Vérifier .env
cat .env | grep -E 'PINATA|GCS'

# Doit afficher :
# PINATA_API_KEY=...
# PINATA_SECRET_API_KEY=...
# GCS_PROJECT_ID=cylimit-production
# GCS_BUCKET_NAME=cylimit-nfts-backup
# GCS_KEY_FILE=./cylimit-gcs-key.json
```

### **Tester les connexions**

```bash
# Lancer le script de test
node scripts/test-mint-nft-testnet-double-storage.cjs

# Résultat attendu :
# ✅ Clients initialisés
# ✅ Connexion Pinata OK
# ✅ Connexion Google Storage OK (bucket: cylimit-nfts-backup)
```

---

## 4️⃣ Sécurité

### **⚠️ Fichiers à NE JAMAIS commit sur Git**

```bash
# Ajouter dans .gitignore
cylimit-gcs-key.json
.env
.env.local
.env.production
```

### **🔐 Bonnes pratiques**

1. ✅ Ne JAMAIS partager les API keys Pinata
2. ✅ Ne JAMAIS commit le fichier `cylimit-gcs-key.json`
3. ✅ Utiliser des variables d'environnement
4. ✅ Restreindre les permissions du Service Account au minimum
5. ✅ Activer l'authentification 2FA sur Pinata et Google Cloud

---

## 5️⃣ Coûts Estimés

### **Pinata**
```
Plan Picnic : $20/mois
Code promo NFTSTORAGE50 : $10 le 1er mois

Après 1000 pins :
- $0.01/pin supplémentaire
- Pour 62,900 pins (31,450 images + 31,450 metadata)
- Coût : $20 + (62,900 - 1000) × $0.01 = $649/mois

⚠️ À négocier avec Pinata pour un forfait custom !
```

### **Google Cloud Storage**
```
Stockage : 15 GB × $0.020/GB/mois = $0.30/mois
Bande passante : 50 GB/mois (dans les 1 TB gratuits) = $0/mois

TOTAL : $0.30/mois 🎉
```

**TOTAL GLOBAL : $20-650/mois** (selon forfait Pinata)

---

## ✅ Checklist Finale

- [ ] Compte Pinata créé
- [ ] Plan Picnic activé ($20/mois)
- [ ] API Keys Pinata créées et testées
- [ ] Projet Google Cloud créé
- [ ] Service Account créé
- [ ] Clé JSON téléchargée et sécurisée
- [ ] Bucket Google Storage créé
- [ ] Bucket rendu public (lecture seule)
- [ ] Variables d'environnement configurées dans .env
- [ ] Connexions testées avec succès
- [ ] Fichiers sensibles ajoutés au .gitignore

---

## 🆘 Dépannage

### **Erreur : "Pinata authentication failed"**
→ Vérifier que `PINATA_API_KEY` et `PINATA_SECRET_API_KEY` sont corrects dans `.env`

### **Erreur : "Bucket not found"**
→ Vérifier que `GCS_BUCKET_NAME` est correct et que le bucket existe

### **Erreur : "Permission denied"**
→ Vérifier que le Service Account a le rôle "Storage Object Admin"

### **Erreur : "File not found: cylimit-gcs-key.json"**
→ Vérifier que le fichier est bien dans le dossier `cylimit-admin-backend/`

---

**Date de mise à jour :** 15 Octobre 2025  
**Status :** ✅ Guide complet prêt


