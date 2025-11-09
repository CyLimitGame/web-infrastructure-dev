from web3 import Web3
import os
import requests
from pathlib import Path
import json
from web3.logs import STRICT, IGNORE, DISCARD, WARN
import time
from web3.exceptions import TimeExhausted
import subprocess

# Remplacez ces valeurs par les vôtres
POLYGON_RPC_URL = 'https://polygon-rpc.com/'
CONTRACT_ADDRESS = '0xA049a83533e437BdeeCaab8eD8DF9934d0A8c06F'
PRIVATE_KEY = '15877b347fc1848d4a1ef97fd158d2c6cba95d82b87329639ed6697ae594de37'

#NFT_STORAGE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDI4RTYyNzc2ZjIzODFFNTdBODIzNUJmMmRDNTFjNEY4MkFiRTRFQTAiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcwNzkzMDkyMTI0MSwibmFtZSI6IkN5TGltaXQifQ.RUpWWTnofmFsjLrKhDP2XP_M-n2nRXSd_TW1GCwcQHY'  # Remplacez par votre clé d'API NFT.storage

NFT_STORAGE_API_KEY='49ea6ae1.cad5b78dcbd94aa6b38c0be73251ddf7'

nft_storage_endpoint = "https://api.nft.storage/upload"

# Vos identifiants Infura
project_id = 'CyLimit'
project_secret = 'YdZKt5Y3rUzJgy+7UMYlxQhXQnOzUDBjtbPuG9WUGNg72tarlVM0dQ'
infura_endpoint = f"https://ipfs.infura.io:5001/api/v0/add"

Presence_ABI=True

if Presence_ABI==True:
    # Définissez l'ABI du contrat
    CONTRACT_ABI = '[{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"address","name":"_royaltyRecipient","type":"address"},{"internalType":"uint128","name":"_royaltyBps","type":"uint128"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ApprovalCallerNotOwnerNorApproved","type":"error"},{"inputs":[],"name":"ApprovalQueryForNonexistentToken","type":"error"},{"inputs":[],"name":"ApprovalToCurrentOwner","type":"error"},{"inputs":[],"name":"ApproveToCaller","type":"error"},{"inputs":[],"name":"BalanceQueryForZeroAddress","type":"error"},{"inputs":[],"name":"MintToZeroAddress","type":"error"},{"inputs":[],"name":"MintZeroQuantity","type":"error"},{"inputs":[],"name":"OwnerQueryForNonexistentToken","type":"error"},{"inputs":[],"name":"TransferCallerNotOwnerNorApproved","type":"error"},{"inputs":[],"name":"TransferFromIncorrectOwner","type":"error"},{"inputs":[],"name":"TransferToNonERC721ReceiverImplementer","type":"error"},{"inputs":[],"name":"TransferToZeroAddress","type":"error"},{"inputs":[],"name":"URIQueryForNonexistentToken","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prevURI","type":"string"},{"indexed":false,"internalType":"string","name":"newURI","type":"string"}],"name":"ContractURIUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newRoyaltyRecipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"newRoyaltyBps","type":"uint256"}],"name":"DefaultRoyalty","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"prevOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"royaltyRecipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"royaltyBps","type":"uint256"}],"name":"RoyaltyForToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"mintedTo","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenIdMinted","type":"uint256"},{"indexed":false,"internalType":"string","name":"uri","type":"string"}],"name":"TokensMinted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_quantity","type":"uint256"},{"internalType":"string","name":"_baseURI","type":"string"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"batchMintTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"contractURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBaseURICount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getBatchIdAtIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getDefaultRoyaltyInfo","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"getRoyaltyInfoForToken","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_operator","type":"address"},{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"isApprovedOrOwner","outputs":[{"internalType":"bool","name":"isApprovedOrOwnerOf","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"string","name":"_tokenURI","type":"string"}],"name":"mintTo","outputs":[{"internalType":"uint256","name":"tokenIdToMint","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextTokenIdToMint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"salePrice","type":"uint256"}],"name":"royaltyInfo","outputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"royaltyAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_uri","type":"string"}],"name":"setContractURI","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_royaltyRecipient","type":"address"},{"internalType":"uint256","name":"_royaltyBps","type":"uint256"}],"name":"setDefaultRoyaltyInfo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"},{"internalType":"address","name":"_recipient","type":"address"},{"internalType":"uint256","name":"_bps","type":"uint256"}],"name":"setRoyaltyInfoForToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"}]'

# Vérifiez si la clé privée est définie
assert PRIVATE_KEY, "Clé privée non trouvée"

# Connexion au réseau Polygon
web3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))
assert web3.is_connected(), "La connexion au réseau Polygon a échoué"

# Chargement du contrat
contract = web3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)


# Fonction pour effectuer une lecture sur le contrat
def read_contract_function():
    # Remplacez 'exampleFunction' par le nom de la fonction que vous souhaitez appeler
    function_name = 'exampleFunction'
    function = getattr(contract.functions, function_name)
    result = function().call()
    print(f"Résultat de la fonction {function_name}: {result}")

# Fonction pour effectuer une écriture sur le contrat
def write_contract_function(token_uri,gas_price):
    #print("PRIVATE_KEY : ",PRIVATE_KEY)
    # Obtention de l'adresse du compte à partir de la clé privée
    account_address = web3.eth.account.from_key(PRIVATE_KEY).address
    #print("account_address : ",account_address)
    # Obtention du nonce du compte
    nonce = web3.eth.get_transaction_count(account_address, 'pending')
    #print("nonce : ",nonce)
    #print("token_uri : ",token_uri)
    #print("gasPrice : ",gas_price)
    # Fonction contract mintTo prise dans l'ABI
    mint_to_function = contract.functions.mintTo
    
    # Configuration de la transaction
    mint_to_tx = mint_to_function(account_address, token_uri).build_transaction({
        'chainId': 137,  # ID de chaîne pour Polygon Mainnet
        'gas': 2000000,
        'gasPrice': web3.to_wei(str(gas_price), 'gwei'),
        'nonce': nonce,
    })

    # Signature de la transaction pour la fonction mintTo
    signed_mint_to_tx = web3.eth.account.sign_transaction(mint_to_tx, PRIVATE_KEY)

    # Envoi de la transaction signée pour la fonction mintTo
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            mint_to_tx_hash = web3.eth.send_raw_transaction(signed_mint_to_tx.rawTransaction)

            # Attente de la confirmation de la transaction pour la fonction mintTo
            print(f"Transaction mintTo envoyée, en attente de confirmation... Hash: {mint_to_tx_hash.hex()}")


            mint_to_tx_receipt = web3.eth.wait_for_transaction_receipt(mint_to_tx_hash)
            print(f"Transaction mintTo confirmée - Block Number: {mint_to_tx_receipt.blockNumber}, Tx Hash: {mint_to_tx_receipt.transactionHash.hex()}")
            # Si la transaction est confirmée, sortir de la boucle
            break
        except TimeExhausted as e:
            print(f"Timeout de 120 secondes atteint. Retentative {retry_count + 1}/{max_retries}.")
            retry_count += 1
        except Exception as e:
            if 'nonce too low' in str(e):
                print("Erreur : nonce trop bas")
                raise e  # Renvoyer l'erreur "nonce too low"
            else:
                print(f"Une autre erreur est survenue : {e}")
                break  # Sortir de la boucle en cas d'autres erreurs

    if retry_count == max_retries:
        print(f"Échec après {max_retries} tentatives. Veuillez vérifier et ajuster si nécessaire.")
    
    # Récupération du token_id à partir des logs de l'événement TokensMinted
    logs = contract.events.TokensMinted().process_receipt(mint_to_tx_receipt, errors=DISCARD)
    if logs:
        token_id = logs[0]['args']['tokenIdMinted']
        print(f"Token ID du NFT créé : {token_id}")
        return {"contractAddress":CONTRACT_ADDRESS,"token_id":token_id}
        
    else:
        print("Aucun log d'événement TokensMinted trouvé dans la transaction.")
        

def get_gas_price():
    polygon_scan_api_url = "https://api.polygonscan.com/api"
    params = {
        "module": "gastracker",
        "action": "gasoracle",
        "apikey": "YourApiKeyToken"  # Remplacez par votre clé API PolygonScan
    }

    try:
        response = requests.get(polygon_scan_api_url, params=params)
        response.raise_for_status()

        data = response.json()
        result = data.get("result", {})

        if result:
            gas_prices = result.get("FastGasPrice", "N/A")
            a={
                "SafeGasPrice": result.get("SafeGasPrice", "N/A"),
                "ProposeGasPrice": result.get("ProposeGasPrice", "N/A"),
                "FastGasPrice": result.get("FastGasPrice", "N/A"),
            }

            return gas_prices
        else:
            print("Réponse invalide de l'API PolygonScan")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la récupération du prix du gaz : {e}")
        return None


# Fonction pour télécharger un fichier sur NFT.storage et récupérer l'URI
def upload_to_nft_storage(metadata):
    url = 'https://api.nft.storage/upload'
    headers = {
        'Authorization': f'Bearer {NFT_STORAGE_API_KEY}'
    }
    
    # Conversion du JSON de métadonnées en chaîne JSON
    metadata_json = json.dumps(metadata)
    
    response = requests.post(url, headers=headers, data=metadata_json)

    if response.status_code == 200:
        result = response.json()
        return result.get('value', {}).get('cid', '')
    else:
        print(f"Échec du téléchargement sur NFT.storage. Code d'erreur : {response.status_code}")
        return None
    
# Fonction pour télécharger un fichier sur NFT.storage et récupérer l'URI
def upload_image_to_nft_storage(file_path):
    url = 'https://api.nft.storage/upload'
    headers = {
        'Authorization': f'Bearer {NFT_STORAGE_API_KEY}'
    }

    with open(file_path, 'rb') as file:
        files = {
            'file': file,
        }
        response = requests.post(url, headers=headers, files=files)

    if response.status_code == 200:
        result = response.json()
        return result.get('value', {}).get('cid', '')
    else:
        print(f"Échec du téléchargement sur NFT.storage. Code d'erreur : {response.status_code}")
        return None
    
    # Fonction pour télécharger un fichier sur NFT.storage et récupérer l'URI
    
def get_usdc_balance(wallet_address):
    # Adresse du contrat USDC sur Polygon (Matic)
    usdc_contract_address = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"

    # API pour récupérer les informations du contrat USDC
    api_url = f"https://api.polygonscan.com/api?module=account&action=tokenbalance&contractaddress={usdc_contract_address}&address={wallet_address}&tag=latest&apikey=PDNDRMYJD91FQFDDA676BMXHVQBPEWIZAQ"

    try:
        # Limitez le taux d'appels à l'API à 5 par seconde
        time.sleep(0.2)
        response = requests.get(api_url)
        data = response.json()
        usdc_balance = int(data["result"]) / 10**6  # Le contrat USDC a 6 décimales
        return usdc_balance
    except Exception as e:
        print(f"Erreur lors de la récupération du solde USDC : {e}")
        return None
    
    
# Fonction pour télécharger un fichier sur NFT.storage et récupérer l'URI
def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        output = result.stdout.decode().strip()
        return output, None
    except subprocess.CalledProcessError as e:
        return None, e.stderr.decode()

def upload_file_to_fleek(file_path):
    command = f'fleek storage add "{file_path}"'
    output, error = run_command(command)
    if error:
        print("Erreur lors de l'upload :", error)
        return None
    print(output)
    return output

def upload_metadata_to_fleek(metadata,metadata_name):


    with open(metadata_name, 'w') as f:
        json.dump(metadata, f)
    
    # Upload the metadata file
    metadata_hash = upload_file_to_fleek(metadata_name)
    
    os.remove(metadata_name)

    return metadata_hash

def get_fleek_filename(file_name):
    command = f'fleek storage get --name "{file_name}"'
    output, error = run_command(command)
    if error:
        print("Erreur lors de la récupération des informations :", error)
        return None
    
    # Supposons que la sortie soit sous la forme "CID: <CID>", vous devrez ajuster ceci selon la sortie réelle
    cid = parse_output_for_cid(output,file_name)
    if "Warning!" in cid:
        #print("Impossible de trouver le CID dans la sortie :", output)
        return None
    if cid:
        return cid
    else:
        print("Impossible de trouver le CID dans la sortie :", output)
        return None

def parse_output_for_cid(output, file_name):
    # Diviser la sortie en lignes
    lines = output.splitlines()
    # Trouver la ligne qui contient les informations du fichier (habituellement après les en-têtes)
    for line in lines:
        if file_name in line:
            parts = line.split()
            cid = parts[1]  # Supposer que le CID est à la deuxième position
            return cid
    return None