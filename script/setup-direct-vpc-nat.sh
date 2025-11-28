#!/bin/bash

################################################################################
# SCRIPT : Configuration Direct VPC Egress + NAT pour IP fixe sur Cloud Run
################################################################################
#
# OBJECTIF : Créer une IP sortante fixe pour Cloud Run → MongoDB Atlas
# COÛT : ~3-5€/mois (vs ~20€+ pour VPC Connector)
#
# INFRASTRUCTURE :
# 1. Cloud Router (Gratuit si pas de trafic inter-région)
# 2. IP Statique Externe (Payant)
# 3. Cloud NAT (Payant au trafic + frais fixes faibles)
# 4. Pas de VPC Connector (Économie majeure)
#
################################################################################

set -e

PROJECT_ID="cylimit-400208"
REGION="europe-west1"
VPC_NETWORK="default"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Configuration Direct VPC Egress + NAT (Option Économique)${NC}\n"

# ============================================================================
# 1. Créer Cloud Router
# ============================================================================

echo -e "${YELLOW}🔀 Création Cloud Router...${NC}"

if ! gcloud compute routers describe cylimit-router --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    gcloud compute routers create cylimit-router \
      --network=$VPC_NETWORK \
      --region=$REGION \
      --project=$PROJECT_ID
    echo -e "${GREEN}✅ Cloud Router créé${NC}"
else
    echo -e "${GREEN}✅ Cloud Router existe déjà${NC}"
fi

echo -e ""

# ============================================================================
# 2. Créer IP statique externe
# ============================================================================

echo -e "${YELLOW}🌐 Création IP statique...${NC}"

if ! gcloud compute addresses describe cylimit-nat-ip --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    gcloud compute addresses create cylimit-nat-ip \
      --region=$REGION \
      --project=$PROJECT_ID
    echo -e "${GREEN}✅ IP statique créée${NC}"
else
    echo -e "${GREEN}✅ IP statique existe déjà${NC}"
fi

# Récupérer l'IP
NAT_IP=$(gcloud compute addresses describe cylimit-nat-ip \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='get(address)')

echo -e "${GREEN}➡️  IP assignée : ${NAT_IP}${NC}\n"

# ============================================================================
# 3. Créer Cloud NAT
# ============================================================================

echo -e "${YELLOW}🚪 Création Cloud NAT...${NC}"

if ! gcloud compute routers nats describe cylimit-nat --router=cylimit-router --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    gcloud compute routers nats create cylimit-nat \
      --router=cylimit-router \
      --region=$REGION \
      --nat-external-ip-pool=cylimit-nat-ip \
      --nat-all-subnet-ip-ranges \
      --enable-logging \
      --project=$PROJECT_ID
    echo -e "${GREEN}✅ Cloud NAT créé${NC}"
else
    echo -e "${GREEN}✅ Cloud NAT existe déjà${NC}"
fi

echo -e ""

# ============================================================================
# 4. Vérification Private Google Access (Recommandé)
# ============================================================================

echo -e "${YELLOW}🔍 Vérification Private Google Access sur le subnet default...${NC}"
# Note: Pour Direct VPC Egress, le subnet doit exister. On assume 'default'.
# On active le Private Google Access pour que le build/pull soit fluide si besoin.
gcloud compute networks subnets update default \
    --region=$REGION \
    --enable-private-ip-google-access \
    --project=$PROJECT_ID || echo "Note: Impossible de modifier le subnet (peut-être déjà activé ou permissions manquantes)"

echo -e ""

# ============================================================================
# 5. Instructions finales
# ============================================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ INFRASTRUCTURE PRÊTE !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "${BLUE}📍 Votre IP sortante fixe :${NC}"
echo -e "   ${GREEN}${NAT_IP}${NC}"
echo -e ""
echo -e "${BLUE}🔒 À faire sur MongoDB Atlas :${NC}"
echo -e "   1. Allez sur https://cloud.mongodb.com"
echo -e "   2. Network Access → Add IP Address"
echo -e "   3. Ajoutez : ${GREEN}${NAT_IP}/32${NC}"
echo -e "   4. Description : Cloud Run Production (Direct Egress NAT)"
echo -e ""
echo -e "${BLUE}🚀 Pour déployer :${NC}"
echo -e "   Utilisez le script : ./deploy-production-admin.sh"
echo -e "   (Il a été configuré pour utiliser --network=default --vpc-egress=all-traffic)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

