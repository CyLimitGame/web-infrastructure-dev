#!/bin/bash

# ═══════════════════════════════════════════════════════════
# Script de bascule environnement frontend
# ═══════════════════════════════════════════════════════════
# Usage: ./switch-frontend-env.sh [local|staging|production]
# Créé le 10 Novembre 2025

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# Variables
# ============================================================================

FRONTEND_DIR="/Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-frontend-develop"
ENV_FILE="$FRONTEND_DIR/.env.local"

# URLs des backends
LOCAL_API_URL="http://localhost:3002/v1"
STAGING_API_URL="https://cylimit-user-api-staging-599672253621.europe-west1.run.app/v1"
PRODUCTION_API_URL="https://api.cylimit.com/v1"

# ============================================================================
# Fonctions
# ============================================================================

show_usage() {
  cat << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 SWITCH FRONTEND ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: $0 [ENVIRONMENT]

Environnements disponibles:
  local       → Backend local (localhost:3002)
  staging     → Backend Cloud Run staging
  production  → Backend Cloud Run production

Exemple:
  $0 staging

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
  exit 1
}

backup_env() {
  echo -e "${YELLOW}📦 Backup de .env.local...${NC}"
  cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d-%H%M%S)"
  echo -e "${GREEN}✅ Backup créé${NC}\n"
}

switch_to_local() {
  echo -e "${YELLOW}🏠 Bascule vers LOCAL...${NC}\n"
  
  backup_env
  
  sed -i '' "s|^NEXT_PUBLIC_ENV=.*|NEXT_PUBLIC_ENV=development|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_APP_ENV=.*|NEXT_PUBLIC_APP_ENV=development|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$LOCAL_API_URL|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=http://localhost:3002|" "$ENV_FILE"
  
  echo -e "${GREEN}✅ Frontend configuré pour LOCAL${NC}"
  echo -e "${GREEN}   API URL: $LOCAL_API_URL${NC}\n"
}

switch_to_staging() {
  echo -e "${YELLOW}☁️  Bascule vers STAGING (Cloud Run)...${NC}\n"
  
  backup_env
  
  sed -i '' "s|^NEXT_PUBLIC_ENV=.*|NEXT_PUBLIC_ENV=staging|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_APP_ENV=.*|NEXT_PUBLIC_APP_ENV=staging|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$STAGING_API_URL|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://cylimit-user-api-staging-599672253621.europe-west1.run.app|" "$ENV_FILE"
  
  echo -e "${GREEN}✅ Frontend configuré pour STAGING${NC}"
  echo -e "${GREEN}   API URL: $STAGING_API_URL${NC}\n"
}

switch_to_production() {
  echo -e "${YELLOW}🚀 Bascule vers PRODUCTION (Cloud Run)...${NC}\n"
  
  # Confirmation pour production
  echo -e "${RED}⚠️  ATTENTION : Vous allez basculer vers PRODUCTION !${NC}"
  read -p "Êtes-vous sûr ? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ Bascule annulée${NC}"
    exit 0
  fi
  
  backup_env
  
  sed -i '' "s|^NEXT_PUBLIC_ENV=.*|NEXT_PUBLIC_ENV=production|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_APP_ENV=.*|NEXT_PUBLIC_APP_ENV=production|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$PRODUCTION_API_URL|" "$ENV_FILE"
  sed -i '' "s|^NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://api.cylimit.com|" "$ENV_FILE"
  
  echo -e "${GREEN}✅ Frontend configuré pour PRODUCTION${NC}"
  echo -e "${GREEN}   API URL: $PRODUCTION_API_URL${NC}\n"
}

show_current_env() {
  echo -e "${YELLOW}📊 Configuration actuelle :${NC}\n"
  
  current_env=$(grep "^NEXT_PUBLIC_ENV=" "$ENV_FILE" | cut -d '=' -f2)
  current_api_url=$(grep "^NEXT_PUBLIC_API_URL=" "$ENV_FILE" | cut -d '=' -f2)
  
  echo -e "   Environment: ${GREEN}$current_env${NC}"
  echo -e "   API URL: ${GREEN}$current_api_url${NC}\n"
}

# ============================================================================
# Main
# ============================================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔄 SWITCH FRONTEND ENVIRONMENT${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Vérifier que le fichier .env.local existe
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Erreur: $ENV_FILE n'existe pas${NC}"
  exit 1
fi

# Afficher config actuelle
show_current_env

# Si aucun argument, afficher usage
if [ $# -eq 0 ]; then
  show_usage
fi

# Traiter l'argument
case "$1" in
  local)
    switch_to_local
    ;;
  staging)
    switch_to_staging
    ;;
  production)
    switch_to_production
    ;;
  *)
    echo -e "${RED}❌ Environnement invalide: $1${NC}\n"
    show_usage
    ;;
esac

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Bascule terminée !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🎯 Prochaines étapes :${NC}\n"
echo -e "   1. Redémarrer le frontend : ${GREEN}npm run dev${NC}"
echo -e "   2. Vérifier dans la console : ${GREEN}process.env.NEXT_PUBLIC_API_URL${NC}\n"
echo -e "   Backups sauvegardés dans: ${GREEN}$FRONTEND_DIR/.env.local.backup.*${NC}\n"

show_current_env

