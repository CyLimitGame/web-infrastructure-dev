import boto3
import botocore
from botocore.exceptions import NoCredentialsError

def upload_to_aws(local_file, s3_bucket, s3_file, content_type='image/png', public_read=True):
    s3 = boto3.client('s3', aws_access_key_id='YOUR_AWS_ACCESS_KEY_ID',
                      aws_secret_access_key='YOUR_AWS_SECRET_ACCESS_KEY')

    try:
        # Ajoutez 'ContentType' dans ExtraArgs pour spécifier le type de contenu
        extra_args = {'ContentType': content_type}
        s3.upload_file(local_file, s3_bucket, s3_file, ExtraArgs=extra_args)
        
        # Autoriser l'accès en lecture publique si nécessaire
        if public_read:
            s3.put_object_acl(Bucket=s3_bucket, Key=s3_file, ACL='public-read')

        print(f"Upload réussi. Lien S3 : {get_s3_link(s3_bucket, s3_file)}")
        return True
    except FileNotFoundError:
        print("Le fichier n'a pas été trouvé.")
        return False
    except NoCredentialsError:
        print("Informations d'identification AWS introuvables.")
        return False

def get_s3_link(bucket, s3_file):
    return f"https://{bucket}.s3.eu-west-3.amazonaws.com/{s3_file}"

# Utilisation du script
#file_path = "131022_White_2024_1.png"
s3_bucket_name = "cylimit-public"

def upload_AWS(file_path,file_name):
    if upload_to_aws(file_path, s3_bucket_name, file_name):
        s3_link = get_s3_link(s3_bucket_name, file_name)
        print("Lien S3 de l'image:", s3_link)
        return s3_link
    else:
        print("Échec de l'upload.")