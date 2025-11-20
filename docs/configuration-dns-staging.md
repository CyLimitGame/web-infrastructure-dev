# Configuration DNS et Coinbase pour Frontend Staging

Guide complet pour configurer le DNS et les services tiers pour l'environnement staging du frontend.

## 📋 Informations de base

### URLs et Services

| Service | URL Cloud Run | Domaine cible |
|---------|---------------|---------------|
| Frontend Staging | `https://cylimit-frontend-staging-599672253621.europe-west1.run.app` | `frontend-staging.cylimit.com` |

### Identifiants

- **GCP Project ID**: `cylimit-400208`
- **Région**: `europe-west1`
- **Coinbase CDP Project ID**: `f9be0307-08e6-49d5-aad0-ab5daeb41cb1`

---

## 🌐 Partie 1 : Configuration DNS

### 🔷 Cloudflare (Recommandé)

**Pourquoi Cloudflare ?**
- ✅ CDN gratuit avec cache mondial
- ✅ Protection DDoS intégrée
- ✅ Analytics et firewall
- ✅ Interface simple et rapide
- ✅ Certificats SSL flexibles

#### Étape 1 : Ajouter l'enregistrement DNS dans Cloudflare

1. Se connecter à [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sélectionner le domaine `cylimit.com`
3. Aller dans **DNS** → **Records**
4. Cliquer sur **Add record**
5. Remplir les champs :

```
Type: CNAME
Name: frontend-staging
Target: ghs.googlehosted.com
Proxy status: DNS only (☁️ gris, PAS 🟠 orange)
TTL: Auto
```

> ⚠️ **TRÈS IMPORTANT** : Le proxy Cloudflare doit être **DÉSACTIVÉ** (nuage gris ☁️)
> 
> Pourquoi ? Cloud Run gère son propre certificat SSL et a besoin d'une connexion directe.
> Si le proxy est activé (🟠), le mapping Cloud Run échouera.

6. Cliquer sur **Save**

#### Étape 2 : Mapper le domaine à Cloud Run

##### Via Google Cloud Console

1. Ouvrir [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionner le projet `cylimit-400208`
3. Aller dans **Navigation Menu** → **Cloud Run**
4. Cliquer sur le service `cylimit-frontend-staging`
5. Aller dans l'onglet **"Manage Custom Domains"** / **"Gérer les domaines personnalisés"**
6. Cliquer sur **"Add Mapping"** / **"Ajouter un mapping"**
7. Suivre les instructions pour vérifier le domaine
8. Sélectionner `frontend-staging.cylimit.com`
9. Cliquer sur **"Continue"** puis **"Add Mapping"**

##### Via gcloud CLI

```bash
# 1. Se connecter au projet
gcloud config set project cylimit-400208

# 2. Mapper le domaine personnalisé à Cloud Run
gcloud run domain-mappings create \
  --service=cylimit-frontend-staging \
  --domain=frontend-staging.cylimit.com \
  --region=europe-west1

# 3. Vérifier le mapping
gcloud run domain-mappings describe \
  --domain=frontend-staging.cylimit.com \
  --region=europe-west1
```

#### Étape 3 : Vérifier la configuration

Attendre 2-5 minutes (Cloudflare est rapide) puis :

```bash
# Vérifier le CNAME
dig frontend-staging.cylimit.com CNAME

# Tester le site
curl -I https://frontend-staging.cylimit.com
```


### 📊 Vérification DNS (toutes options)

```bash
# Vérifier que le CNAME pointe vers Google
dig frontend-staging.cylimit.com CNAME

# Vérifier que le domaine répond
curl -I https://frontend-staging.cylimit.com

# Test complet
curl https://frontend-staging.cylimit.com

# Vérifier la propagation DNS mondiale (si besoin)
# https://dnschecker.org/#CNAME/frontend-staging.cylimit.com
```

---

## 🪙 Partie 2 : Configuration Coinbase CDP (Allowlist)

### Pourquoi c'est nécessaire ?

Coinbase CDP (Embedded Wallets) nécessite que toutes les URLs d'origine soient explicitement autorisées pour des raisons de sécurité. Sans cela, les utilisateurs ne pourront pas se connecter avec leur wallet.

### Accéder au Dashboard Coinbase

1. Se connecter à [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Sélectionner le projet avec l'ID : `f9be0307-08e6-49d5-aad0-ab5daeb41cb1`
3. Aller dans **Settings** → **Allowed Origins** (ou **Security**)

### URLs à ajouter à l'Allowlist

Ajouter les URLs suivantes dans la section **Allowed Origins** :

#### ✅ URLs obligatoires pour Staging

```
https://frontend-staging.cylimit.com
https://cylimit-frontend-staging-599672253621.europe-west1.run.app
```

#### 🔍 URLs existantes à vérifier (dev/local)

Ces URLs devraient déjà être présentes, les conserver :

```
http://localhost:3001
http://localhost:3000
https://frontend-dev.cylimit.com
```

#### 📝 Format exact dans Coinbase

Dans le champ **"Allowed Origins"**, entrer une URL par ligne :

```
http://localhost:3000
http://localhost:3001
https://frontend-dev.cylimit.com
https://frontend-staging.cylimit.com
https://cylimit-frontend-staging-599672253621.europe-west1.run.app
```

### Ce qui se passe si l'allowlist n'est pas configurée

❌ **Erreurs possibles** :
- `Origin not allowed` dans la console
- Impossible de se connecter avec Coinbase Wallet
- Erreur CORS lors de l'authentification
- Écran blanc ou timeout lors du login

---

## 🔐 Partie 3 : Autres Services à Vérifier (Optionnel)

### Google OAuth (si utilisé)

Si vous utilisez Google Sign-In, ajouter les URLs autorisées :

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Sélectionner le client OAuth (`330041048247-185g5p39s1j35nvh28oahmo16o1jri21`)
3. Dans **"Authorized JavaScript origins"**, ajouter :
   ```
   https://frontend-staging.cylimit.com
   https://cylimit-frontend-staging-599672253621.europe-west1.run.app
   ```
4. Dans **"Authorized redirect URIs"**, ajouter :
   ```
   https://frontend-staging.cylimit.com/auth/callback
   https://cylimit-frontend-staging-599672253621.europe-west1.run.app/auth/callback
   ```

### Facebook OAuth (si utilisé)

Si vous utilisez Facebook Login (App ID: `757379305926727`) :

1. [Facebook Developers](https://developers.facebook.com/)
2. Sélectionner votre app
3. **Settings** → **Basic** → **App Domains**, ajouter :
   ```
   frontend-staging.cylimit.com
   cylimit-frontend-staging-599672253621.europe-west1.run.app
   ```
4. **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**, ajouter :
   ```
   https://frontend-staging.cylimit.com/auth/facebook/callback
   ```

## ✅ Partie 4 : Checklist de Vérification

### Après configuration DNS

- [ ] `dig frontend-staging.cylimit.com` retourne le CNAME vers `ghs.googlehosted.com`
- [ ] `curl -I https://frontend-staging.cylimit.com` retourne un code 200
- [ ] Le site s'affiche correctement dans le navigateur
- [ ] Pas d'erreur de certificat SSL (Google gère automatiquement)

### Après configuration Coinbase

- [ ] Ouvrir `https://frontend-staging.cylimit.com` dans le navigateur
- [ ] Tester la connexion avec Coinbase Wallet
- [ ] Vérifier qu'il n'y a pas d'erreur `Origin not allowed` dans la console
- [ ] Tester une transaction simple (si possible)

### Tests fonctionnels complets

```bash
# 1. Vérifier que la page charge
curl https://frontend-staging.cylimit.com

# 2. Vérifier les headers de sécurité
curl -I https://frontend-staging.cylimit.com

# 3. Vérifier que l'API backend est accessible
# (devrait être configuré dans NEXT_PUBLIC_API_URL)
```

#### Dans le navigateur :

1. ✅ **Page d'accueil** : S'affiche correctement
2. ✅ **Login Coinbase** : Connexion fonctionne
3. ✅ **Marketplace** : Affichage des NFTs
4. ✅ **Wallet** : Balance et transactions visibles
5. ✅ **Console** : Pas d'erreurs CORS ou Origin

---

## 🚨 Troubleshooting

### DNS ne résout pas avec Cloudflare

```bash
# Vérifier la propagation DNS globalement
https://dnschecker.org/#CNAME/frontend-staging.cylimit.com

# Forcer le flush DNS local (Mac)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Forcer le flush DNS local (Linux)
sudo systemd-resolve --flush-caches

# Forcer le flush DNS local (Windows)
ipconfig /flushdns
```

**Checklist Cloudflare** :
- [ ] Le CNAME pointe bien vers `ghs.googlehosted.com`
- [ ] Le proxy Cloudflare est **DÉSACTIVÉ** (☁️ gris, pas 🟠)
- [ ] Le domaine a été mappé dans Cloud Run
- [ ] Attendre 2-5 minutes pour la propagation

### Erreur "Failed to verify domain ownership" (Cloud Run)

Si vous voyez cette erreur lors du mapping du domaine dans Cloud Run :

1. **Vérifier que le CNAME existe bien** :
   ```bash
   dig frontend-staging.cylimit.com CNAME
   ```
   Doit retourner `ghs.googlehosted.com`

2. **S'assurer que le proxy Cloudflare est désactivé** :
   - Dans Cloudflare Dashboard → DNS
   - Le nuage doit être **GRIS** ☁️, pas orange 🟠
   - Si orange, cliquer dessus pour le désactiver

3. **Attendre quelques minutes** et réessayer le mapping

### Erreur "Origin not allowed" de Coinbase

1. Vérifier que l'URL est **exactement** celle du navigateur (avec/sans trailing slash)
2. Attendre 5-10 minutes après l'ajout (propagation)
3. Vider le cache du navigateur et cookies
4. Tester en navigation privée

### Certificat SSL invalide

Cloud Run gère automatiquement les certificats SSL. Si problème :

```bash
# Vérifier le statut du mapping
gcloud run domain-mappings describe \
  --domain=frontend-staging.cylimit.com \
  --region=europe-west1

# Le statut doit être "Ready"
```

### Site inaccessible

```bash
# Vérifier que le service Cloud Run est actif
gcloud run services describe cylimit-frontend-staging \
  --region=europe-west1 \
  --format="value(status.url)"

# Vérifier les logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=cylimit-frontend-staging" \
  --limit=50
```

---

## 📚 Ressources

- [Google Cloud DNS Documentation](https://cloud.google.com/dns/docs)
- [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Coinbase CDP Documentation](https://docs.cdp.coinbase.com/)
- [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)

---

## 📝 Notes

- Les modifications DNS peuvent prendre **5 à 30 minutes** pour se propager
- Google Cloud Run génère automatiquement des certificats SSL via Let's Encrypt
- Les certificats sont automatiquement renouvelés
- L'allowlist Coinbase est sensible à la casse et au trailing slash
- Conserver toujours les URLs Cloud Run natives en backup (même après DNS custom)

---

**Dernière mise à jour** : 17 novembre 2025  
**URL de déploiement** : `https://cylimit-frontend-staging-599672253621.europe-west1.run.app`  
**Domaine cible** : `https://frontend-staging.cylimit.com`

