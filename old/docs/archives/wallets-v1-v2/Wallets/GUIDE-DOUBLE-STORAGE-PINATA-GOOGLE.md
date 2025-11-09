# 🔄 GUIDE : Système de Double Stockage (Pinata + Google Storage)

**Date :** 15 Octobre 2025  
**Objectif :** Documentation complète du système de double stockage pour les NFTs  
**Status :** ✅ IMPLÉMENTÉ (en test)

---

## 🎯 Vue d'Ensemble

Le système de **double stockage** assure la **redondance maximale** des images et métadatas NFT en les stockant simultanément sur :

1. **Pinata (IPFS)** → Stockage décentralisé (source de vérité blockchain)
2. **Google Cloud Storage** → Stockage centralisé (backup + performance)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│ 1. SOURCE                                           │
│    ├─ MongoDB : NFTs v1 existants                   │
│    └─ AWS S3 : Images actuelles                     │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 2. TRAITEMENT                                       │
│    ├─ Téléchargement image depuis AWS S3            │
│    ├─ Upload image → Pinata (IPFS)                  │
│    │   └─> CID: QmXXX... (déterministe)            │
│    ├─ Upload image → Google Storage (backup)        │
│    │   └─> URL: https://storage.googleapis.com/...  │
│    ├─ Création metadata JSON avec image IPFS        │
│    ├─ Upload metadata → Pinata (IPFS)               │
│    │   └─> CID: QmYYY... (tokenURI)                │
│    └─ Upload metadata → Google Storage (backup)     │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 3. BLOCKCHAIN                                       │
│    └─ Mint NFT v2 avec tokenURI = ipfs://QmYYY...   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 4. BACKUP & MAPPING                                 │
│    ├─ data/cid-mapping.json (CID ↔ filename)       │
│    └─ Google Storage (images + metadata complètes) │
└─────────────────────────────────────────────────────┘
```

---

## 📂 Structure Google Cloud Storage

```
cylimit-nfts-backup/
│
├─ images/
│  ├─ POGACAR_Tadej_2023_pink_1.png
│  ├─ VINGEGAARD_Jonas_2023_blue_150.png
│  └─ ... (31,450 images)
│
├─ metadata/
│  ├─ POGACAR_Tadej_2023_pink_1.json
│  │   {
│  │     "name": "POGACAR Tadej 2023 pink 1",
│  │     "description": "Collect, trade & play...",
│  │     "image": "ipfs://QmXXX...",  ← Image IPFS
│  │     "attributes": [...]
│  │   }
│  └─ ... (31,450 metadata)
│
└─ mappings/
   └─ cid-mapping.json
       {
         "POGACAR_Tadej_2023_pink_1.png": {
           "nftId": "507f1f77bcf86cd799439011",
           "oldTokenId": "12345",
           "imageCid": "QmXXX...",
           "metadataCid": "QmYYY...",
           "gcsImageUrl": "https://storage.googleapis.com/...",
           "gcsMetadataUrl": "https://storage.googleapis.com/..."
         }
       }
```

---

## 🔧 Configuration Requise

### **1. Variables d'Environnement (.env)**

```bash
# Pinata (IPFS)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# Google Cloud Storage
GCS_PROJECT_ID=cylimit-production
GCS_BUCKET_NAME=cylimit-nfts-backup
GCS_KEY_FILE=./cylimit-gcs-key.json

# MongoDB
MONGODB_URI=mongodb+srv://...

# Wallet Testnet
TEST_WALLET_PRIVATE_KEY=0x...

# Polygon RPC
POLYGON_RPC_URL=https://polygon-rpc.com
```

### **2. Créer Bucket Google Cloud Storage**

```bash
# Installer gcloud CLI
brew install google-cloud-sdk

# Authentification
gcloud auth login

# Créer bucket
gsutil mb -p cylimit-production -l EUROPE-WEST1 gs://cylimit-nfts-backup

# Rendre public (lecture seule)
gsutil iam ch allUsers:objectViewer gs://cylimit-nfts-backup

# Configurer CORS (pour accès web)
echo '[{"origin": ["*"], "method": ["GET"], "maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://cylimit-nfts-backup
```

### **3. Créer Service Account Google Cloud**

```bash
# Créer service account
gcloud iam service-accounts create cylimit-nft-uploader \
  --display-name="CyLimit NFT Uploader"

# Donner permissions sur le bucket
gsutil iam ch serviceAccount:cylimit-nft-uploader@cylimit-production.iam.gserviceaccount.com:objectAdmin \
  gs://cylimit-nfts-backup

# Générer clé JSON
gcloud iam service-accounts keys create cylimit-gcs-key.json \
  --iam-account=cylimit-nft-uploader@cylimit-production.iam.gserviceaccount.com

# Copier la clé dans le projet
cp cylimit-gcs-key.json /path/to/cylimit-admin-backend/
```

---

## 🚀 Utilisation

### **Test sur Testnet (3 NFTs)**

```bash
cd cylimit-admin-backend

# Configurer .env avec PINATA_API_KEY, GCS_PROJECT_ID, etc.

# Lancer le test
node scripts/test-mint-nft-testnet-double-storage.cjs
```

**Ce que fait le script :**
1. ✅ Récupère 3 NFTs depuis MongoDB
2. ✅ Télécharge leurs images depuis AWS S3
3. ✅ Upload images vers Pinata (IPFS)
4. ✅ Upload images vers Google Storage (backup)
5. ✅ Créer métadatas JSON avec image IPFS
6. ✅ Upload métadatas vers Pinata (IPFS)
7. ✅ Upload métadatas vers Google Storage (backup)
8. ✅ Mint NFTs v2 sur testnet avec CIDs IPFS
9. ✅ Sauvegarde mappings CID dans `data/cid-mapping.json`

**Durée estimée :** 2-3 minutes pour 3 NFTs

---

### **Production sur Mainnet (31,450 NFTs)**

```bash
cd cylimit-admin-backend

# Utiliser le script de batch remint (à créer)
node scripts/remint-nfts-v2-batch-double-storage.js

# Avec options :
# --batch-size 100  (100 NFTs par batch)
# --start-from 0    (commencer à l'index 0)
# --dry-run         (test sans mint réel)
```

**Durée estimée :** 10-15 heures pour 31,450 NFTs (en parallèle)

---

## 💰 Coûts Estimés

### **Pinata**
```
Plan Picnic : $20/mois
├─ 1000 pins
├─ Custom gateway
├─ 99.9% uptime
└─ Support prioritaire

NFTs CyLimit :
├─ 31,450 images (pins)
├─ 31,450 metadata (pins)
└─ Total : 62,900 pins

Coût : $20/mois (suffisant pour 1000 pins, puis $0.01/pin supplémentaire)
→ $20 + (62,900 - 1000) × $0.01 = $649/mois
⚠️ À vérifier avec Pinata (peut-être forfait custom)
```

### **Google Cloud Storage**
```
Stockage :
├─ 31,450 images × 500 KB = 15 GB
├─ 31,450 metadata × 5 KB = 0.15 GB
└─ Total : ~15.15 GB

Coût stockage :
15.15 GB × $0.020/GB/mois = $0.30/mois

Bande passante (trafic sortant) :
├─ Premiers 1 TB/mois = GRATUIT
├─ 100,000 vues/mois × 500KB = 50 GB
└─ Coût : $0/mois (dans la limite gratuite)

TOTAL : $0.30/mois 🎉
```

**TOTAL GLOBAL : ~$20-650/mois** (selon forfait Pinata)

---

## 🔄 Plan de Reprise (Si Pinata Crash)

### **Scénario : Pinata ferme définitivement**

**Étape 1 : Récupération des fichiers**
```bash
# Télécharger tous les fichiers depuis Google Storage
gsutil -m cp -r gs://cylimit-nfts-backup/images ./backup/images
gsutil -m cp -r gs://cylimit-nfts-backup/metadata ./backup/metadata
```

**Étape 2 : Re-upload vers nouveau service IPFS**
```bash
# Exemple : Upload vers NFT.Storage
node scripts/restore-to-nft-storage.js --source ./backup

# Ou vers Lighthouse
node scripts/restore-to-lighthouse.js --source ./backup
```

**Étape 3 : Vérification des CIDs**
```javascript
// Les CIDs IPFS sont déterministes !
// Même fichier = Même CID (toujours)

originalImageCid = "QmXXX..."
newImageCid = uploadToNFTStorage(imageBuffer)

if (originalImageCid === newImageCid) {
  console.log('✅ CID identique ! NFT restauré.');
  // Les NFTs on-chain fonctionnent toujours !
} else {
  console.error('❌ CID différent ! Problème de fichier.');
}
```

**Résultat :** Tes NFTs refonctionnent sans modification on-chain ! 🎉

---

## 📊 Monitoring

### **Vérifier l'état des uploads**

```bash
# Vérifier Pinata
curl -X GET https://api.pinata.cloud/data/pinList \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_API_KEY"

# Vérifier Google Storage
gsutil ls -lh gs://cylimit-nfts-backup/images/ | wc -l
gsutil ls -lh gs://cylimit-nfts-backup/metadata/ | wc -l
```

### **Vérifier les CIDs**

```bash
# Lire le mapping
cat scripts/data/cid-mapping.json | jq '.[] | {imageCid, metadataCid}'

# Tester accessibilité IPFS
curl -I https://ipfs.io/ipfs/QmXXX...
curl -I https://gateway.pinata.cloud/ipfs/QmXXX...

# Tester accessibilité Google Storage
curl -I https://storage.googleapis.com/cylimit-nfts-backup/images/POGACAR_Tadej_2023_pink_1.png
```

---

## ✅ Avantages du Double Stockage

| Critère | Pinata Seul | Google Storage Seul | **Double Stockage** |
|---------|-------------|---------------------|---------------------|
| **Décentralisé** | ✅ Oui | ❌ Non | ✅ Oui |
| **Vitesse** | ⚡⚡ Bon | ⚡⚡⚡ Excellent | ⚡⚡⚡ Excellent |
| **Redondance** | ⚠️ Moyenne | ⚠️ Moyenne | ✅ Maximale |
| **Backup** | ❌ Non | ❌ Non | ✅ Oui |
| **Coût** | $20-650/mois | $0.30/mois | $20-650/mois |
| **Si crash** | ⚠️ Risque perte | ❌ Perte totale | ✅ Restauration facile |

**Verdict : Double Stockage = Sécurité Maximale** 🏆

---

## 🔗 Ressources

- **Pinata :** https://www.pinata.cloud/
- **Google Cloud Storage :** https://cloud.google.com/storage
- **IPFS :** https://ipfs.io/
- **Pinata API Docs :** https://docs.pinata.cloud/
- **GCS API Docs :** https://cloud.google.com/storage/docs

---

## 📝 Prochaines Étapes

1. ✅ **Test sur testnet** (3 NFTs) → `test-mint-nft-testnet-double-storage.cjs`
2. ⏳ **Vérifier les NFTs sur Polygonscan et OpenSea testnet**
3. ⏳ **Adapter pour production** → `remint-nfts-v2-batch-double-storage.js`
4. ⏳ **Remint des 31,450 NFTs sur mainnet**
5. ⏳ **Script de monitoring automatique** (cron quotidien)
6. ⏳ **Script de backup automatique** (cron hebdomadaire)

---

**Date de mise à jour :** 15 Octobre 2025  
**Status :** ✅ Système implémenté et prêt pour tests


