#!/bin/bash

################################################################################
# SCRIPT DÉPLOIEMENT PAGE MAINTENANCE
################################################################################
#
# OBJECTIF :
# Déployer la page de maintenance sur Google Cloud Run
#
# POURQUOI :
# - Afficher une page élégante pendant les maintenances
# - Accessible via maintenance.cylimit.com
# - Ultra-rapide et léger (nginx alpine)
#
# PRÉREQUIS :
# 1. gcloud CLI installé et configuré
# 2. Dockerfile.maintenance présent
# 3. maintenance/index.html présent
#
# COMMENT :
# ./deploy-maintenance.sh
# - Build via Cloud Build (pas besoin de Docker local)
# - Push automatique vers GCR
# - Déploie sur Cloud Run
# - Configure pour maintenance.cylimit.com
#
################################################################################

set -e  # Exit on error

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement Page Maintenance - CyLimit${NC}\n"

# ============================================================================
# Configuration
# ============================================================================

PROJECT_ID="cylimit-400208"
REGION="europe-west1"
SERVICE_NAME="cylimit-maintenance"
IMAGE_NAME="gcr.io/${PROJECT_ID}/maintenance:latest-$(date +%Y%m%d-%H%M%S)"
MIN_INSTANCES=0
MAX_INSTANCES=1
MEMORY="512Mi"
CPU=1
TIMEOUT=10

# ============================================================================
# Vérifications préalables
# ============================================================================

echo -e "${YELLOW}📋 Vérifications préalables...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI non trouvé${NC}"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    gcloud config set project $PROJECT_ID
fi

if [ ! -f "maintenance/Dockerfile.maintenance" ]; then
    echo -e "${RED}❌ maintenance/Dockerfile.maintenance manquant${NC}"
    exit 1
fi

if [ ! -f "maintenance/index.html" ]; then
    echo -e "${RED}❌ maintenance/index.html manquant${NC}"
    exit 1
fi

if [ ! -f "maintenance/cloudbuild.maintenance.yaml" ]; then
    echo -e "${RED}❌ maintenance/cloudbuild.maintenance.yaml manquant${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vérifications OK${NC}\n"

# ============================================================================
# Build & Push Docker Image via Cloud Build
# ============================================================================

echo -e "${YELLOW}🔨 Build de l'image Docker via Cloud Build...${NC}"

set +e
gcloud builds submit \
  --config maintenance/cloudbuild.maintenance.yaml \
  --substitutions _IMAGE_NAME=$IMAGE_NAME \
  --timeout=600s \
  --region=$REGION \
  .
BUILD_EXIT_CODE=$?
set -e

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Build Cloud Build échoué${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build et push réussi : $IMAGE_NAME${NC}\n"

# ============================================================================
# Déploiement Cloud Run
# ============================================================================

echo -e "${YELLOW}☁️  Déploiement sur Cloud Run...${NC}"

set +e
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 80 \
  --memory $MEMORY \
  --cpu $CPU \
  --timeout ${TIMEOUT}s \
  --min-instances $MIN_INSTANCES \
  --max-instances $MAX_INSTANCES \
  --execution-environment gen2
DEPLOY_EXIT_CODE=$?
set -e

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Déploiement échoué${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Déploiement réussi${NC}\n"

# ============================================================================
# Récupérer URL du service
# ============================================================================

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DÉPLOIEMENT PAGE MAINTENANCE TERMINÉ !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "${BLUE}📍 URL du service Cloud Run :${NC}"
echo -e "   ${SERVICE_URL}"
echo -e ""
echo -e "${BLUE}🔗 Configuration DNS Cloudflare :${NC}"
echo -e "   1. Aller sur Cloudflare Dashboard"
echo -e "   2. Sélectionner cylimit.com"
echo -e "   3. DNS > Add record"
echo -e "   4. Type: CNAME"
echo -e "   5. Name: maintenance"
echo -e "   6. Target: ghs.googlehosted.com"
echo -e "   7. Proxy status: Proxied (orange cloud)"
echo -e ""
echo -e "${BLUE}🔗 Mapper le domaine personnalisé :${NC}"
echo -e "   gcloud run services update $SERVICE_NAME \\"
echo -e "     --region $REGION \\"
echo -e "     --add-custom-domain maintenance.cylimit.com"
echo -e ""
echo -e "${BLUE}🔍 Test direct :${NC}"
echo -e "   curl ${SERVICE_URL}"
echo -e ""
echo -e "${BLUE}📊 Logs en temps réel :${NC}"
echo -e "   gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\""
echo -e ""
echo -e "${BLUE}🎯 Prochaines étapes :${NC}"
echo -e "   1. Configurer DNS sur Cloudflare (voir ci-dessus)"
echo -e "   2. Mapper le domaine personnalisé (voir commande ci-dessus)"
echo -e "   3. Tester https://maintenance.cylimit.com"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

