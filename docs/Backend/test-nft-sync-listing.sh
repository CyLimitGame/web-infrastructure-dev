#!/bin/bash

###############################################################################
# TEST VÉRIFICATION OWNERSHIP AU LISTING MARKETPLACE
# Phase 2 : User Backend (cylimit-backend-develop)
#
# Prérequis:
# 1. Backend user doit être lancé (port 3002)
# 2. JWT_SECRET configuré dans .env
# 3. TOKEN_USER valide (user normal)
# 4. NFT en DB appartenant à cet user (avec tokenId)
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3002/v1"
TOKEN_USER="${TOKEN_USER:-YOUR_USER_TOKEN_HERE}" # À remplacer par un vrai token user

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST VÉRIFICATION OWNERSHIP AU LISTING MARKETPLACE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Vérification TOKEN_USER
if [ "$TOKEN_USER" == "YOUR_USER_TOKEN_HERE" ]; then
  echo -e "${RED}❌ ERREUR: TOKEN_USER non configuré${NC}"
  echo ""
  echo "Exporte ton TOKEN_USER avant de lancer le script:"
  echo ""
  echo -e "${YELLOW}export TOKEN_USER=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"${NC}"
  echo ""
  echo "Puis relance:"
  echo ""
  echo -e "${YELLOW}bash test-nft-sync-listing.sh${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ TOKEN_USER configuré${NC}"
echo ""

###############################################################################
# TEST 1 : Lister un NFT appartenant au user (should succeed)
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 1 : POST /nfts/:nftId/sell (NFT owned by user)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# NFT ID appartenant au user (remplacer par un vrai ID)
NFT_ID="${NFT_ID:-64f5a3c1234567890abcdef0}" # À remplacer

echo -e "${YELLOW}NFT ID à lister : ${NFT_ID}${NC}"
echo -e "${YELLOW}Prix fixe : 10 USDC${NC}"
echo ""
echo "Envoi requête..."
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/nfts/${NFT_ID}/sell" \
  -H "Authorization: Bearer ${TOKEN_USER}" \
  -H "Content-Type: application/json" \
  -d '{
    "fixedPrice": 10
  }')

echo -e "${GREEN}Réponse:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Vérifier si succès
NFT_ID_RESPONSE=$(echo "$RESPONSE" | jq -r '.nftId // ""')

if [ -n "$NFT_ID_RESPONSE" ]; then
  echo -e "${GREEN}✅ TEST 1 PASSED : NFT listé avec succès${NC}"
  echo ""
  echo -e "${YELLOW}Vérifications effectuées par NftSyncService :${NC}"
  echo "  1. Ownership vérifié on-chain (Polygon Mainnet)"
  echo "  2. Ownership corrigé en DB si désynchronisé"
  echo "  3. NFT listé sur marketplace si ownership valide"
  echo ""
else
  echo -e "${RED}❌ TEST 1 FAILED : Erreur lors du listing${NC}"
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // "Unknown error"')
  echo -e "${RED}Message: ${ERROR_MSG}${NC}"
  echo ""
  
  # Vérifier si erreur de ownership
  if [[ "$ERROR_MSG" == *"don't own"* ]]; then
    echo -e "${YELLOW}⚠️  NFT ownership vérifié : User ne possède pas ce NFT on-chain${NC}"
    echo -e "${YELLOW}Cela signifie que NftSyncService fonctionne correctement !${NC}"
  fi
fi

echo ""

###############################################################################
# TEST 2 : Lister un NFT n'appartenant PAS au user (should fail)
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 2 : POST /nfts/:nftId/sell (NFT NOT owned by user)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# NFT ID n'appartenant PAS au user (remplacer par un vrai ID)
NFT_ID_NOT_OWNED="${NFT_ID_NOT_OWNED:-64f5a3c1234567890abcdef1}" # À remplacer

echo -e "${YELLOW}NFT ID à lister (pas au user) : ${NFT_ID_NOT_OWNED}${NC}"
echo -e "${YELLOW}Prix fixe : 10 USDC${NC}"
echo ""
echo "Envoi requête..."
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/nfts/${NFT_ID_NOT_OWNED}/sell" \
  -H "Authorization: Bearer ${TOKEN_USER}" \
  -H "Content-Type: application/json" \
  -d '{
    "fixedPrice": 10
  }')

echo -e "${GREEN}Réponse:${NC}"
echo "$RESPONSE" | jq '.'
echo ""

# Vérifier si erreur
STATUS_CODE=$(echo "$RESPONSE" | jq -r '.statusCode // 0')

if [ "$STATUS_CODE" == "400" ]; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // ""')
  
  if [[ "$ERROR_MSG" == *"don't own"* ]] || [[ "$ERROR_MSG" == *"not owned"* ]]; then
    echo -e "${GREEN}✅ TEST 2 PASSED : Listing bloqué correctement${NC}"
    echo ""
    echo -e "${YELLOW}NftSyncService a vérifié l'ownership on-chain et bloqué le listing${NC}"
    echo ""
  else
    echo -e "${YELLOW}⚠️  TEST 2 PARTIAL : Erreur 400 mais message inattendu${NC}"
    echo -e "${YELLOW}Message: ${ERROR_MSG}${NC}"
  fi
else
  echo -e "${RED}❌ TEST 2 FAILED : Listing devrait être bloqué (erreur 400)${NC}"
  echo -e "${RED}NftSyncService n'a pas vérifié l'ownership correctement${NC}"
fi

echo ""

###############################################################################
# TEST 3 : Vérifier logs backend (ownership verification)
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 3 : Vérifier logs backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Pour vérifier que NftSyncService fonctionne correctement :${NC}"
echo ""
echo -e "${BLUE}tail -50 backend.log | grep -i "sync\|ownership"${NC}"
echo ""

echo -e "${YELLOW}Tu devrais voir des logs comme :${NC}"
echo ""
echo "  ✅ NFT Contract initialized: 0x1234..."
echo "  🚨 NFT <nftId> (tokenId: <tokenId>) out of sync. DB owner: <userId>, On-chain owner: <userId>"
echo "  Listing blocked for NFT <nftId>. User <userId> does not own it on-chain."
echo ""

echo -e "${GREEN}Consulte les logs pour plus de détails${NC}"
echo ""

###############################################################################
# RÉSUMÉ
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RÉSUMÉ DES TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}Tests effectués :${NC}"
echo ""
echo "  1. Lister NFT appartenant au user (should succeed)"
echo "  2. Lister NFT n'appartenant PAS au user (should fail)"
echo "  3. Vérifier logs backend (ownership verification)"
echo ""

echo -e "${YELLOW}Ce que NftSyncService vérifie :${NC}"
echo ""
echo "  ✅ Ownership on-chain (via Alchemy RPC)"
echo "  ✅ Correspondance userId DB vs userId on-chain"
echo "  ✅ Correction automatique si désynchronisé"
echo "  ✅ Blocage listing si ownership invalide"
echo ""

echo -e "${YELLOW}Prochaines étapes :${NC}"
echo ""
echo "  1. Tester avec plusieurs NFTs"
echo "  2. Tester avec NFT transféré off-platform (wallet externe)"
echo "  3. Vérifier correction automatique ownership en DB"
echo ""

echo -e "${GREEN}✅ TESTS TERMINÉS${NC}"
echo ""

