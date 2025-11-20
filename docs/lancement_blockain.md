1. Création des wallets sur Coinbase 
cylimit-admin-backend/scripts/base/0-create-production-master-smart-account.cjs
Obtention d'un Wallet EOA : propriétaire du Wallet Smart Account qui permet d'accorder les whitelist
Obtention d'un Wallet Smart Account qui va tout gérer et être owner de tout :
- Contrat NFT
- Contrat Marketplace
- NFTS lors du mint

ETAPE 1 FAIT

2. Création des contrats NFT et Marketplace
Sur Remix, (https://remix.ethereum.org/)
2.1. Importer chaque contrat .SOL
2.2. Le Compiler (version: 0.8.20, evm:paris, optimization:200)
2.3. Le déployer en connectant le MasterWallet EoA à Metamask

Constructor params NFT :

DEV
- name: "CyLimit V2 Testnet"
- symbol: "CYLMT-TEST"
- initialOwner: 0x9f682058A2Bdc8Fb5CE5269B414fEd9e85a6D896

PROD
- name: "CyLimit V2"
- symbol: "CYLMT"
- initialOwner: 0xC67f1f57763e522D4F80Ca477209C5Af44Bb28e1

Récupérer l'adresse du contrat NFT

DEV : 0x8Ec2137940F9666bD1802394cb5f1cdD5E3C18d0
PROD :

Constructor params Marketplace :

DEV
- _nftContract: 0x8Ec2137940F9666bD1802394cb5f1cdD5E3C18d0
- _usdcContract: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- initialOwner: 0x9f682058A2Bdc8Fb5CE5269B414fEd9e85a6D896

PROD
- _nftContract: 
- _usdcContract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- initialOwner: 0xC67f1f57763e522D4F80Ca477209C5Af44Bb28e1

Récupérer l'adresse du contrat Marketplace

DEV : 0xa8c8d7Aded2dA1c3A4E8479E61B60E699B7df554




3. Valider les contrats dans Remix

4. Whitelist de la marketplace auprès du contrat NFT
cylimit-admin-backend/scripts/base/1-whitelist-marketplace-v2.cjs
Ensuite l'user donera son approvalforall à la marketplace et cela permettra à la marketplace de transférer les nfts sans besoin de sa signature (on en aura toujorus besoin s'il y a des usdc que l'user va donner dans le transfert)

DEV :
NODE_ENV=local node scripts/base/1-whitelist-marketplace-v2.cjs testnet marketplace

PROD : 
NODE_ENV=local node scripts/base/1-whitelist-marketplace-v2.cjs mainnet marketplace

Pas besoin de faire le MasterWallet, il est déjà automatiquement Whitelisté à la création du contrat

5. Minter les nfts
cylimit-admin-backend/scripts/base/2-rebuild-metadata-dual-storage.cjs

6. Autoriser le Paymaster sur coinbase
docs/PAYMASTER_CONFIGURATION.md
