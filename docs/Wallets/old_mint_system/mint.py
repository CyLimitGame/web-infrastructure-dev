import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fonctions.fonctions_AWS import upload_AWS
from fonctions.fonctions_PCS import get_rider_info_fromPCSrider
from fonctions.database_connexion import mongo_connexion,free_cards,teams,riders,nfts
from fonctions.fonctions_web3 import upload_metadata_to_fleek,write_contract_function,upload_file_to_fleek,get_gas_price,get_fleek_filename
import json
from fonctions.autres import type_of_card,get_country_name
from datetime import datetime
import pandas as pd
from pymongo import MongoClient
from bson import ObjectId
import shutil
import time

dossier_nft = "mint/cards_to_mint"
path=dossier_nft+"/"
_id_CyLimit=ObjectId('638d9c12cac989501fa18840')

year_now = datetime.now().year

# Obtenez le chemin complet du répertoire "nft"
chemin_complet_nft = os.path.join(os.getcwd(), dossier_nft)


# Listez tous les fichiers dans le dossier
fichiers = [os.path.join(chemin_complet_nft, f) for f in os.listdir(chemin_complet_nft) if os.path.isfile(os.path.join(chemin_complet_nft, f))]

nb_fichiers=len(fichiers)
num_fichier=1

# Pour chaque fichier dans white_cards
for path_fichier in fichiers:
    fichier=os.path.basename(path_fichier)
    print(f"{num_fichier}/{nb_fichiers} - {fichier}")
    num_fichier+=1
    parties = fichier.split("_")
    pcs_rider_id=int(parties[0])
    rarity=parties[1].lower()
    year_of_edition=int(parties[2])
    serial_number=int(parties[-1].rstrip(".png"))
    if(rarity!="yellow" and rarity!="blue" and rarity!="pink"):
        print("il s'agit d'une white card")
        continue
    
    pcs_rider=get_rider_info_fromPCSrider(pcs_rider_id)
    nationality=pcs_rider["nationality"]
    pcs_url=pcs_rider["pcs_url"]
    actualTeam=pcs_rider["actualTeam"]
    typeOfCard=type_of_card(actualTeam["class"])
    team_name=actualTeam["name"]
    
    if rarity=="blue":
        lastSerialNumber=300
    elif rarity=="pink":
        lastSerialNumber=30
    else:
        lastSerialNumber=1

    # Tester s'il y a au moins deux documents
    resultats = list(riders.find({"pcsRiderId": pcs_rider_id}))
    if len(resultats) >= 2:
        print("Il y a au moins deux riders dans riders correspondants au pcs_rider_id : ",pcs_rider_id)
        continue
    
    rider = riders.find_one({"pcsRiderId": pcs_rider_id})
    rider_id=rider["_id"]
    rider_name=rider["name"]
    
    if rider_name=="MAEKELE Milkias":
        actualTeam=rider["actualTeam"]
        typeOfCard=rider["typeOfCard"]
        team_name=actualTeam["name"]
    
    birth_date= datetime.strptime(pcs_rider.get('birthdate'), "%Y-%m-%d")
    birth_year=birth_date.year
    age=year_now-birth_year-1

    #on test s'il existe déjà
    nft_already_here=nfts.find_one(
        {
            "riderId": rider_id,
            "rarity":rarity,
            "serialNumber":serial_number,
            "yearOfEdition":year_of_edition,        
        }
    )
    metadata_name=rider_name+ " "+str(year_of_edition)+ " "+parties[1] + " " +str(serial_number)+"/"+str(lastSerialNumber)
    if nft_already_here is not None:
        print("nft déjà présent : ",metadata_name)
        continue
    
    team = teams.find_one({"name": team_name})
    if team is None:
        if rider_name=="BERNARD Julien":
            team_name="CyLimit"
            team = teams.find_one({"name": team_name})
        else:
            print("équipe du coureur introuvable : ",team_name)
            continue
    
    team_id=team["_id"]
    
    
    if rider_id:
        #upload sur AWS
        file_path=path+fichier
        print(f"Traitement du fichier : {fichier}")
        
        print("name : ",metadata_name)

        add_price_to_gas=10
        gas_price=float(get_gas_price())+add_price_to_gas
        #si l'api de polygon est en panne :
        #gas_price=200
        
        print(f"Prix du gas : {gas_price}")
        
        trygas_price=1
        max_retries_gas=100
        
        while gas_price>250 or gas_price==add_price_to_gas:
            print(f"Prix du gas inconnu ou trop élevé : {gas_price}")
            print(f"Nouvelle tentative dans 30 secondes pour le gas numéro : {trygas_price}")
            time.sleep(30)
            gas_price=float(get_gas_price())+add_price_to_gas
            trygas_price+=1
            if trygas_price == max_retries_gas:
                print(f"Échec après {max_retries_gas} tentatives. Veuillez vérifier et ajuster si nécessaire.")
                break
        
        # Téléchargez le fichier sur NFT.Fleek
        #print(get_fleek_filename(fichier))
        if get_fleek_filename(fichier) is None :
            upload_file_to_fleek(file_path)
        
        image_hash=get_fleek_filename(fichier)
        token_uri_img = f'https://ipfs.io/ipfs/{image_hash}' # fleek a une limite de 150 fichiers/jour
        print(f"token_uri_img : {token_uri_img}")

        if "Warning!" in token_uri_img or token_uri_img is None:
            print(f"Problème pour la mise sur l'ipfs avec : {fichier}")
            break
        
        # Données à télécharger sur Infura
        metadata = {
            "attributes": [
                {"trait_type": "age", "value": age},
                {"trait_type": "gender", "value": "male"},
                {"trait_type": "yearOfEdition", "value": year_of_edition},
                {"trait_type": "rarity", "value": rarity},
                {"trait_type": "serialNumber", "value": serial_number},
                {"trait_type": "lastSerialNumber", "value": lastSerialNumber},
                {"trait_type": "nationality", "value": get_country_name(nationality),},
                {"trait_type": "team", "value": team_name}
            ],
            "description": "Collect, trade & play on app.cylimit.com with official cards in limited editions",
            "name": metadata_name,
            "image": token_uri_img
        }

        
        # Téléchargez le fichier sur Fleek
        base_name = os.path.splitext(fichier)[0]  # retire l'extension actuelle
        fichier_metadata = f"{base_name}.json"
        
        if get_fleek_filename(fichier_metadata) is None :
            upload_metadata_to_fleek(metadata,fichier_metadata)
        
        cid = get_fleek_filename(fichier_metadata)
        print(f"metadata_cid : {cid}")

        if cid and "Warning!" not in cid:
            # Construisez l'URI complet avec la passerelle IPFS
            token_uri = f'https://ipfs.io/ipfs/{cid}'
            #token_uri=f"ipfs://{cid}/metadata.json"
            print(token_uri)

            # Appelez la fonction de mint avec l'URI
            max_retries = 5  # Nombre maximal de tentatives
            retry_count = 0

            while retry_count < max_retries:
                try:
                    MintResult = write_contract_function(token_uri, gas_price)
                    break  # Sortir de la boucle si la fonction réussit
                except ValueError as e:
                    if 'nonce too low' in str(e):
                        print(f"Erreur : nonce trop bas - Tentative {retry_count + 1}/{max_retries}")
                        retry_count += 1
                        time.sleep(30)
                        # Vous pouvez également ajouter une pause ici si nécessaire (time.sleep(quelque_choses))
                    elif 'replacement transaction underpriced' in str(e):
                        print(f"Erreur : replacement transaction underpriced - Tentative {retry_count + 1}/{max_retries}")
                        retry_count += 1
                        time.sleep(30)
                        # Vous pouvez également ajouter une pause ici si nécessaire (time.sleep(quelque_choses))
                    else:
                        # Gérer d'autres erreurs ici si nécessaire
                        print(f"Autre erreur : {e}")
                        break  # Sortir de la boucle en cas d'autres erreurs

            if retry_count == max_retries:
                print(f"Échec après {max_retries} tentatives. Veuillez vérifier et ajuster si nécessaire.")
                break
            
        else:
            print(f"Problème pour la mise sur l'ipfs du metadata avec : {file_path}")
            break
        
        
        AWS_fichier="nft/"+fichier
        imageUrl=upload_AWS(file_path,AWS_fichier)
        
        #modifier les champs des nfts 
        print("rider_id : ",rider_id)

        new_nft = {
            "name":rider_name,
            "gender":"male",
            "age":age,
            "nationality":nationality,
            "score":0, #à enlever ?
            "rarity":rarity,
            "status":"domestic", #à enlever ?
            "yearOfEdition":year_of_edition,
            "typeOfCard":typeOfCard,
            "serialNumber": serial_number,
            "lastSerialNumber":lastSerialNumber,
            "cid":cid,
            "imageUrl": imageUrl,
            "tokenId":MintResult["token_id"],
            "contractAddress":MintResult["contractAddress"],
            "teamId":team_id,
            "ownerId":_id_CyLimit,
            "marketType": "none",
            "isLocked":False,
            "sales":[],
            "auctionBids":[],
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "riderId": rider_id,
            "isActive":True,
            "auctionStepMinPrice":0.1,
            "auctionStepMinRatio":0.08
        }

        # Insérer le nouveau document dans la collection
        result = nfts.insert_one(new_nft)
        
        # Vérifier si l'insertion a réussi
        if result.inserted_id:
            print(f"Document inséré avec l'ID : {result.inserted_id}")
        else:
            print("Échec de l'insertion du document.")
        
        #modifier les champs dans riders
        riders.update_one(
            {"pcsRiderId": pcs_rider_id},
            {"$set": {
                "nationality":nationality,
                "pcsUrl":pcs_url,
                "typeOfCard":typeOfCard,
                "actualTeam":actualTeam,
                "dob":birth_date,
                "updatedAt":datetime.now()
                }
            }
        )
        print("Mis à jour dans dans riders")
        
        fichier_done = os.path.join(os.getcwd(), "mint", "done", os.path.basename(path_fichier))
        shutil.move(path_fichier, fichier_done)
        print(f"Fichier déplacé vers {fichier_done}")
    else:
        print("Aucun rider trouvé dans riders avec ce pcs_rider_id")
    