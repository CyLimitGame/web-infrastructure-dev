# 🔧 Page de Maintenance CyLimit

## 📋 Contenu du Dossier

```
maintenance/
├── index.html                      # Page HTML de maintenance (avec traductions FR/EN)
├── cylimit-white.png               # Logo CyLimit (blanc)
├── Dockerfile.maintenance          # Dockerfile nginx alpine
├── cloudbuild.maintenance.yaml     # Configuration Cloud Build
├── deploy-maintenance.sh           # Script de déploiement
└── README.md                       # Ce fichier
```

## ✨ Fonctionnalités

- 🎨 **Design moderne** : Interface élégante avec thème sombre
- 🌍 **Multilingue** : FR/EN avec sélecteur de langue (persiste dans localStorage)
- 🚴 **Messages cyclistes humoristiques** : Rotation automatique de messages thématiques
- 📻 **Radio Course** : Citations et faits amusants sur le cyclisme
- 🔄 **Animations** : Carte 3D animée, effets holographiques
- 📱 **Responsive** : Design adaptatif mobile/desktop
- 🎯 **Logo CyLimit** : Logo blanc intégré

## 🚀 Déploiement Rapide

### Prérequis
- `gcloud` CLI installé et configuré
- Projet GCP : `cylimit-400208`
- Accès Cloudflare pour configuration DNS

### Commandes

```bash
# 1. Se placer dans le dossier infrastructure (PAS dans maintenance/)
cd /Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-infrastructure

# 2. Lancer le déploiement
./maintenance/deploy-maintenance.sh
```

Le script va automatiquement :
- ✅ Builder l'image Docker via Cloud Build
- ✅ Pusher l'image vers Google Container Registry
- ✅ Déployer sur Cloud Run (`cylimit-maintenance`)
- ✅ Fournir l'URL Cloud Run

## 🌐 Configuration DNS Cloudflare

Après le déploiement, configurer le DNS :

### Option 1 : Via Cloudflare Dashboard (Recommandé)
1. Aller sur https://dash.cloudflare.com
2. Sélectionner le domaine `cylimit.com`
3. Aller dans **DNS** > **Records**
4. Cliquer sur **Add record**
5. Configurer :
   - **Type** : `CNAME`
   - **Name** : `maintenance`
   - **Target** : `ghs.googlehosted.com`
   - **Proxy status** : `DNS only` (nuage gris) ⚠️ DÉSACTIVÉ pour cohérence avec les autres services
   - **TTL** : `Auto`
6. Sauvegarder

### Option 2 : Via gcloud CLI
```bash
# Mapper le domaine personnalisé à Cloud Run
gcloud run services update cylimit-maintenance \
  --region europe-west1 \
  --add-custom-domain maintenance.cylimit.com
```

⚠️ **Note** : Après l'ajout du domaine personnalisé, Cloud Run vous donnera des instructions pour configurer les enregistrements DNS si ce n'est pas déjà fait.

## 🔍 Vérification

```bash
# Tester l'URL Cloud Run directement
curl https://cylimit-maintenance-XXXXX-ew.a.run.app

# Tester avec le domaine personnalisé (après config DNS)
curl https://maintenance.cylimit.com
```

## 📊 Monitoring

```bash
# Voir les logs en temps réel
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=cylimit-maintenance"

# Voir le statut du service
gcloud run services describe cylimit-maintenance --region europe-west1

# Lister les révisions
gcloud run revisions list --service cylimit-maintenance --region europe-west1
```

## ⚙️ Configuration Cloud Run

- **Région** : `europe-west1` (Belgique)
- **Instances** : 0 min / 1 max (scaling automatique)
- **Mémoire** : 512 Mi (minimum gen2)
- **CPU** : 1 vCPU
- **Timeout** : 10s
- **Port** : 80 (nginx)

## 🔄 Redéploiement

Pour mettre à jour la page de maintenance :

```bash
# 1. Modifier index.html
vim maintenance/index.html

# 2. Redéployer
./maintenance/deploy-maintenance.sh
```

## 🎯 Utilisation en Production

### Activer la maintenance
Rediriger le trafic vers `maintenance.cylimit.com` via :
- **Cloudflare Workers** (recommandé)
- **Load Balancer** 
- **Modification DNS temporaire**

### Exemple avec Cloudflare Workers
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Rediriger tout le trafic vers la page de maintenance
  if (url.hostname === 'app.cylimit.com' || url.hostname === 'api.cylimit.com') {
    return Response.redirect('https://maintenance.cylimit.com', 302)
  }
  
  return fetch(request)
}
```

## 🛠️ Modification de la Page

Le fichier `index.html` est une page statique HTML/CSS autonome :
- Pas de dépendances externes
- Design responsive
- Animation CSS
- Fichier unique (tout-en-un)

Pour modifier :
1. Éditer `maintenance/index.html`
2. Tester localement avec Docker (optionnel) :
   ```bash
   cd maintenance
   docker build -f Dockerfile.maintenance -t maintenance-test .
   docker run -p 8080:80 maintenance-test
   # Ouvrir http://localhost:8080
   ```
3. Redéployer avec `./maintenance/deploy-maintenance.sh`

## 💰 Coûts

Coûts estimés très faibles :
- **Cloud Run** : ~0.10-0.50€/mois (scaling to zero)
- **Storage GCR** : ~0.01€/mois (image <10MB)
- **Trafic** : Négligeable (page statique légère)

**Total** : < 1€/mois

## 🔐 Sécurité

- ✅ Pas de données sensibles
- ✅ Image officielle nginx:alpine (sécurisée)
- ✅ Pas de code serveur (juste HTML/CSS)
- ✅ HTTPS automatique via Cloud Run
- ✅ DDoS protection via Cloudflare

## 📝 Notes

- La page est servie via **nginx alpine** (ultra-léger, <10MB)
- Le service **scale to zero** quand non utilisé (économie)
- **Démarrage instantané** grâce à la petite taille de l'image
- Compatible avec **tous les navigateurs** (HTML/CSS standard)

