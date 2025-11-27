#!/bin/bash
################################################################################
# SCRIPT MIGRATION WORDPRESS - CLOUD RUN → COMPUTE ENGINE
################################################################################
#
# OBJECTIF :
# Migrer WordPress de Cloud Run vers Compute Engine avec persistance complète
#
# ÉTAPES :
# 1. Créer la VM Compute Engine
# 2. Importer wp-content depuis Cloud Storage
# 3. Configurer WordPress avec Cloud SQL
# 4. Mettre à jour le DNS
#
################################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Migration WordPress vers Compute Engine${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ============================================================================
# Configuration
# ============================================================================

PROJECT_ID="cylimit-400208"
REGION="europe-west1"
ZONE="europe-west1-b"
INSTANCE_NAME="cylimit-wordpress-vm"
MACHINE_TYPE="e2-small"  # 2 vCPU, 2GB RAM - ~$15/mois
DISK_SIZE="30"  # 30 GB SSD pour WordPress + médias

# Cloud SQL
DB_HOST="35.205.135.30"

# Bucket contenant wp-content
GCS_BUCKET="cylimit-wordpress-content"

# ============================================================================
# Charger les variables d'environnement (méthode robuste)
# ============================================================================

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Fichier .env manquant${NC}"
    exit 1
fi

# Charger uniquement les variables nécessaires (évite les problèmes avec les caractères spéciaux)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2-)
DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2-)
DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2-)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2-)

echo -e "${GREEN}✅ Configuration chargée${NC}"
echo -e "   DB_HOST: $DB_HOST"
echo -e "   DB_NAME: $DB_NAME"
echo -e "   DB_USER: $DB_USER\n"

# ============================================================================
# Étape 1 : Créer la VM
# ============================================================================

echo -e "${YELLOW}📦 Étape 1/4 : Création de la VM Compute Engine...${NC}"

# Vérifier si l'instance existe
INSTANCE_EXISTS=$(gcloud compute instances list --filter="name=$INSTANCE_NAME" --format="value(name)" 2>/dev/null || true)

if [ -n "$INSTANCE_EXISTS" ]; then
    echo -e "${YELLOW}⚠️  L'instance $INSTANCE_NAME existe déjà${NC}"
    echo -e "${BLUE}ℹ️  On continue avec l'instance existante${NC}"
else
    gcloud compute instances create $INSTANCE_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size=${DISK_SIZE}GB \
        --boot-disk-type=pd-ssd \
        --tags=http-server,https-server \
        --metadata=google-logging-enabled=true \
        --scopes=cloud-platform

    echo -e "${GREEN}✅ VM créée${NC}"
    
    # Attendre le démarrage
    echo -e "${YELLOW}⏳ Attente du démarrage (60s)...${NC}"
    sleep 60
fi

# ============================================================================
# Étape 2 : Configurer le firewall
# ============================================================================

echo -e "\n${YELLOW}🔥 Configuration du firewall...${NC}"

gcloud compute firewall-rules create allow-http-$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --allow=tcp:80 \
    --target-tags=http-server \
    --description="Allow HTTP" 2>/dev/null || echo "Règle HTTP existe déjà"

gcloud compute firewall-rules create allow-https-$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --allow=tcp:443 \
    --target-tags=https-server \
    --description="Allow HTTPS" 2>/dev/null || echo "Règle HTTPS existe déjà"

echo -e "${GREEN}✅ Firewall OK${NC}"

# ============================================================================
# Étape 3 : Installer Docker et configurer WordPress
# ============================================================================

echo -e "\n${YELLOW}🐳 Étape 2/4 : Installation de Docker...${NC}"

gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    set -e
    
    # Installer Docker si pas présent
    if ! command -v docker &> /dev/null; then
        echo '📦 Installing Docker...'
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker \$USER
    fi
    
    echo '✅ Docker installed'
"

echo -e "${GREEN}✅ Docker installé${NC}"

# ============================================================================
# Étape 4 : Télécharger wp-content depuis Cloud Storage
# ============================================================================

echo -e "\n${YELLOW}📥 Étape 3/4 : Import de wp-content depuis Cloud Storage...${NC}"

gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    set -e
    
    # Créer le répertoire WordPress
    sudo mkdir -p /opt/wordpress/wp-content
    
    # Télécharger wp-content depuis GCS
    echo '📥 Downloading wp-content from Cloud Storage...'
    echo '   This may take a few minutes for 2.3GB...'
    
    sudo gsutil -m cp -r gs://${GCS_BUCKET}/* /opt/wordpress/wp-content/ || {
        echo '⚠️  gsutil not found, installing...'
        sudo apt-get install -y apt-transport-https ca-certificates gnupg
        echo 'deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main' | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
        curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
        sudo apt-get update && sudo apt-get install -y google-cloud-cli
        sudo gsutil -m cp -r gs://${GCS_BUCKET}/* /opt/wordpress/wp-content/
    }
    
    # Permissions
    sudo chown -R www-data:www-data /opt/wordpress/wp-content 2>/dev/null || sudo chown -R 33:33 /opt/wordpress/wp-content
    
    echo '✅ wp-content downloaded'
"

echo -e "${GREEN}✅ wp-content importé${NC}"

# ============================================================================
# Étape 5 : Créer docker-compose.yml et démarrer WordPress
# ============================================================================

echo -e "\n${YELLOW}🚀 Étape 4/4 : Démarrage de WordPress...${NC}"

# Créer le docker-compose.yml localement
cat > /tmp/docker-compose-ce.yml << EOF
version: '3.8'

services:
  wordpress:
    image: wordpress:php8.2-apache
    container_name: wordpress
    restart: always
    ports:
      - "80:80"
    environment:
      WORDPRESS_DB_HOST: ${DB_HOST}
      WORDPRESS_DB_NAME: ${DB_NAME:-wordpress}
      WORDPRESS_DB_USER: ${DB_USER:-root}
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
      WORDPRESS_TABLE_PREFIX: wp_
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_HOME', 'https://cylimit.com');
        define('WP_SITEURL', 'https://cylimit.com');
        define('FORCE_SSL_ADMIN', true);
        define('FS_METHOD', 'direct');
        define('WP_MEMORY_LIMIT', '256M');
        if (isset(\\\$_SERVER['HTTP_X_FORWARDED_PROTO']) && \\\$_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            \\\$_SERVER['HTTPS'] = 'on';
        }
    volumes:
      - /opt/wordpress/wp-content:/var/www/html/wp-content
    networks:
      - wordpress_net

networks:
  wordpress_net:
    driver: bridge
EOF

# Copier sur la VM
gcloud compute scp /tmp/docker-compose-ce.yml $INSTANCE_NAME:/tmp/docker-compose.yml --zone=$ZONE

# Démarrer WordPress
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    set -e
    
    sudo mkdir -p /opt/wordpress
    sudo cp /tmp/docker-compose.yml /opt/wordpress/docker-compose.yml
    cd /opt/wordpress
    
    # Arrêter si déjà en cours
    sudo docker-compose down 2>/dev/null || true
    
    # Démarrer
    sudo docker-compose up -d
    
    # Attendre
    sleep 15
    
    # Vérifier
    sudo docker-compose ps
    
    echo '✅ WordPress is running!'
"

echo -e "${GREEN}✅ WordPress démarré${NC}"

# ============================================================================
# Récupérer l'IP et afficher les instructions
# ============================================================================

EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ MIGRATION TERMINÉE !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "${BLUE}📍 IP de la VM :${NC}"
echo -e "   ${EXTERNAL_IP}"
echo -e ""
echo -e "${BLUE}🔗 ÉTAPE SUIVANTE - Mettre à jour Cloudflare :${NC}"
echo -e "   1. Aller sur Cloudflare > DNS"
echo -e "   2. Modifier l'enregistrement A pour cylimit.com"
echo -e "   3. Mettre l'IP : ${EXTERNAL_IP}"
echo -e "   4. Activer le Proxy (orange) pour SSL"
echo -e ""
echo -e "${BLUE}🔧 Commandes utiles :${NC}"
echo -e "   # SSH sur la VM"
echo -e "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo -e ""
echo -e "   # Logs WordPress"
echo -e "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo docker logs wordpress -f'"
echo -e ""
echo -e "   # Redémarrer WordPress"
echo -e "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='cd /opt/wordpress && sudo docker-compose restart'"
echo -e ""
echo -e "${BLUE}🎯 Ce qui fonctionne maintenant :${NC}"
echo -e "   ✅ Installer des plugins depuis l'admin WP → PERSISTANT"
echo -e "   ✅ Installer des thèmes depuis l'admin WP → PERSISTANT"
echo -e "   ✅ Uploader des médias → PERSISTANT"
echo -e "   ✅ Mettre à jour WordPress → PERSISTANT"
echo -e "   ✅ Tout comme sur AWS EC2 !"
echo -e ""
echo -e "${YELLOW}⚠️  N'oublie pas de supprimer le service Cloud Run après migration :${NC}"
echo -e "   gcloud run services delete cylimit-wordpress --region=europe-west1"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

