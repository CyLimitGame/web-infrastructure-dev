# 🌐 WordPress CyLimit - Compute Engine

## 📍 Informations de Production

| Élément | Valeur |
|---------|--------|
| **URL** | https://cylimit.com |
| **VM** | `cylimit-wordpress-vm` |
| **Zone** | `europe-west1-b` |
| **IP** | `34.78.70.230` |
| **Base de données** | Cloud SQL `cylimit-wordpress` |
| **DB Host** | `35.205.135.30` |

---

## 🔧 Commandes Utiles

### Accès SSH à la VM
```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b
```

### Voir les logs WordPress
```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker logs wordpress -f'
```

### Redémarrer WordPress
```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='cd /opt/wordpress && sudo docker-compose restart'
```

### Voir l'état du conteneur
```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker ps'
```

---

## 🚨 Dépannage

### Erreur 521 (Web server is down)

**Cause** : Cloudflare ne peut pas atteindre le serveur.

**Vérifications** :
1. Vérifier que le conteneur tourne :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker ps'
   ```

2. Vérifier les logs :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker logs wordpress --tail=50'
   ```

3. Redémarrer le conteneur :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='cd /opt/wordpress && sudo docker-compose restart'
   ```

4. Vérifier le mode SSL sur Cloudflare :
   - Aller sur **Cloudflare** → **SSL/TLS** → **Overview**
   - Mettre en mode **"Flexible"** (pas "Full")

### Erreur 500 (Internal Server Error)

**Cause** : Erreur PHP ou base de données.

**Vérifications** :
1. Voir les logs Apache :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker logs wordpress --tail=100'
   ```

2. Vérifier la connexion à la base de données :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='sudo docker exec wordpress wp db check --allow-root'
   ```

### Erreur "Error establishing a database connection"

**Cause** : WordPress ne peut pas se connecter à Cloud SQL.

**Vérifications** :
1. Vérifier que Cloud SQL est accessible :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='nc -zv 35.205.135.30 3306'
   ```

2. Vérifier les credentials dans docker-compose.yml :
   ```bash
   gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='cat /opt/wordpress/docker-compose.yml'
   ```

3. Vérifier que l'IP de la VM est autorisée dans Cloud SQL :
   - Aller sur **Google Cloud Console** → **SQL** → **cylimit-wordpress**
   - **Connections** → **Authorized networks**
   - Ajouter l'IP de la VM si nécessaire

---

## 📁 Structure sur la VM

```
/opt/wordpress/
├── docker-compose.yml    # Configuration Docker
└── wp-content/           # Plugins, thèmes, uploads (PERSISTANT)
    ├── plugins/
    ├── themes/
    ├── uploads/
    └── ...
```

---

## 🔄 Mise à jour WordPress

### Depuis l'admin WordPress
Tout fonctionne comme sur un serveur classique :
- ✅ Installer des plugins
- ✅ Installer des thèmes
- ✅ Mettre à jour WordPress
- ✅ Uploader des médias

### Mise à jour de l'image Docker
Si besoin de mettre à jour l'image WordPress :

```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='
cd /opt/wordpress
sudo docker-compose pull
sudo docker-compose up -d
'
```

---

## 🛡️ Sauvegardes

### Backup wp-content
```bash
# Depuis la VM
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='
sudo tar -czvf /tmp/wp-content-backup-$(date +%Y%m%d).tar.gz /opt/wordpress/wp-content
'

# Télécharger le backup
gcloud compute scp cylimit-wordpress-vm:/tmp/wp-content-backup-*.tar.gz . --zone=europe-west1-b
```

### Backup base de données
```bash
gcloud compute ssh cylimit-wordpress-vm --zone=europe-west1-b --command='
sudo docker exec wordpress wp db export /tmp/backup.sql --allow-root
sudo docker cp wordpress:/tmp/backup.sql /tmp/db-backup-$(date +%Y%m%d).sql
'

# Télécharger
gcloud compute scp cylimit-wordpress-vm:/tmp/db-backup-*.sql . --zone=europe-west1-b
```

---

## 🌍 Configuration DNS (Cloudflare)

| Type | Nom | Contenu | Proxy |
|------|-----|---------|-------|
| A | @ | 34.78.70.230 | Proxied (orange) |

**Important** : Le mode SSL doit être sur **"Flexible"** car le serveur n'a pas de certificat SSL (Cloudflare gère le HTTPS).

---

## 💰 Coûts Estimés

| Service | Coût/mois |
|---------|-----------|
| VM e2-small | ~$15 |
| Cloud SQL db-f1-micro | ~$10 |
| Stockage (30GB SSD) | ~$5 |
| **Total** | **~$30/mois** |

---

## 📞 En cas d'urgence

### Site complètement down

1. **Vérifier l'état de la VM** :
   ```bash
   gcloud compute instances list --filter="name=cylimit-wordpress-vm"
   ```

2. **Redémarrer la VM si nécessaire** :
   ```bash
   gcloud compute instances reset cylimit-wordpress-vm --zone=europe-west1-b
   ```

3. **Attendre 2-3 minutes**, puis vérifier :
   ```bash
   curl -I http://34.78.70.230
   ```

### Rollback complet

Si tout est cassé, relancer le script de migration :
```bash
cd /path/to/cylimit-infrastructure/wordpress
./migrate-to-compute-engine.sh
```

---

## 📝 Fichiers de ce dossier

| Fichier | Description |
|---------|-------------|
| `README.md` | Cette documentation |
| `migrate-to-compute-engine.sh` | Script de déploiement/migration |
| `.env` | Variables d'environnement (credentials) |
| `wp-content/` | Backup local du contenu WordPress |

---

*Dernière mise à jour : 25 novembre 2025*
