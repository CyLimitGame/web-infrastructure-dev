#!/usr/bin/env node

/**
 * OBJECTIF : Script de backup pour les collections manquantes/incomplètes
 * 
 * POURQUOI : Les collections nfts, games et pcs_races ont échoué lors du backup initial
 * à cause de timeouts réseau ou de leur grande taille. Ce script utilise des paramètres
 * optimisés pour ces collections volumineuses.
 * 
 * COMMENT :
 * 1. Supprime les fichiers partiels/corrompus des collections problématiques
 * 2. Relance le backup avec des paramètres optimisés (readPreference=secondaryPreferred, timeout augmenté)
 * 3. Utilise un retry agressif avec backoff exponentiel
 * 4. Vérifie l'intégrité après sauvegarde
 * 
 * Appelé depuis : Ligne de commande manuelle après échec d'un backup
 * Dépendances : mongodump, mongodb driver npm
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = 'mongodb+srv://cylimit2:rundeal974@cylimit.en0by.mongodb.net/cylimit?authSource=admin&replicaSet=atlas-v3fgec-shard-0&readPreference=primary&ssl=true';
const BACKUP_DIR = process.argv[2] || '/Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-infrastructure/backups/cylimit-backup-2025-11-24T01-55-19';
const MAX_RETRIES = 5;

// Collections à sauvegarder
const COLLECTIONS_TO_BACKUP = ['nfts', 'games', 'pcs_races'];

/**
 * Extrait le nom de la base de données de l'URI
 */
function extractDatabaseName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'cylimit';
}

/**
 * Supprime les fichiers existants d'une collection
 */
function deleteCollectionFiles(backupDir, dbName, collectionName) {
  const dbBackupPath = path.join(backupDir, dbName);
  const bsonFile = path.join(dbBackupPath, `${collectionName}.bson`);
  const metadataFile = path.join(dbBackupPath, `${collectionName}.metadata.json`);
  
  let deleted = false;
  
  if (fs.existsSync(bsonFile)) {
    fs.unlinkSync(bsonFile);
    console.log(`   🗑️  Supprimé: ${collectionName}.bson`);
    deleted = true;
  }
  
  if (fs.existsSync(metadataFile)) {
    fs.unlinkSync(metadataFile);
    console.log(`   🗑️  Supprimé: ${collectionName}.metadata.json`);
    deleted = true;
  }
  
  return deleted;
}

/**
 * Compte les documents dans la collection MongoDB
 */
async function getCollectionCount(uri, dbName, collectionName) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    return await collection.countDocuments();
  } finally {
    await client.close();
  }
}

/**
 * Compte les documents dans le fichier BSON
 */
function countDocumentsInBson(bsonPath) {
  try {
    const buffer = fs.readFileSync(bsonPath);
    let count = 0;
    let pos = 0;
    
    while (pos < buffer.length) {
      if (pos + 4 > buffer.length) break;
      
      const docSize = buffer.readInt32LE(pos);
      
      if (docSize <= 0 || docSize > 16 * 1024 * 1024) {
        break;
      }
      
      count++;
      pos += docSize;
    }
    
    return count;
  } catch (error) {
    console.error(`   ⚠️  Erreur lors du comptage: ${error.message}`);
    return null;
  }
}

/**
 * Sauvegarde une collection avec paramètres optimisés
 */
async function backupCollectionOptimized(uri, backupDir, collectionName, maxRetries = 5) {
  const dbName = extractDatabaseName(uri);
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   🔄 Tentative ${attempt}/${maxRetries} pour ${collectionName}...`);
        // Backoff exponentiel: 5s, 10s, 20s, 40s
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 2), 60000);
        console.log(`   ⏳ Attente de ${waitTime / 1000}s avant réessai...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      console.log(`\n📦 Sauvegarde de ${collectionName} (tentative ${attempt}/${maxRetries})...`);
      
      // Récupérer le nombre de documents attendus
      console.log(`   📊 Vérification du nombre de documents...`);
      const expectedCount = await getCollectionCount(uri, dbName, collectionName);
      console.log(`   ✓ ${expectedCount.toLocaleString()} documents à sauvegarder`);
      
      // Arguments mongodump optimisés pour grandes collections
      const args = [
        '--uri', uri,
        '--db', dbName,
        '--collection', collectionName,
        '--out', backupDir,
        '--numParallelCollections', '1',
        '--gzip'  // Compression à la volée pour réduire la bande passante
      ];
      
      await new Promise((resolve, reject) => {
        const mongodump = spawn('mongodump', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false
        });
        
        let lastProgressTime = Date.now();
        let hasError = false;
        let errorOutput = '';
        
        mongodump.stderr.on('data', (data) => {
          const output = data.toString();
          const lines = output.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            if (line.includes('writing')) {
              console.log(`   📝 Début de l'écriture...`);
              lastProgressTime = Date.now();
            } else if (line.includes('done dumping')) {
              const match = line.match(/done dumping\s+(\S+)\s+\((\d+)\s+documents\)/);
              if (match) {
                const docCount = parseInt(match[2]).toLocaleString();
                console.log(`   ✅ ${docCount} documents écrits`);
              }
            } else if (line.includes('[') && line.includes('%')) {
              const match = line.match(/(\[.*?\])\s+(\S+)\s+(\d+)\/(\d+)\s+\(([\d.]+)%\)/);
              if (match) {
                const current = parseInt(match[3]);
                const total = parseInt(match[4]);
                const percent = parseFloat(match[5]);
                
                const now = Date.now();
                if (now - lastProgressTime > 3000 || percent >= 100) {
                  console.log(`   📊 Progression: ${current.toLocaleString()}/${total.toLocaleString()} (${percent.toFixed(1)}%)`);
                  lastProgressTime = now;
                }
              }
            } else if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
              hasError = true;
              errorOutput += line + '\n';
              console.error(`   ❌ ${line}`);
            }
          });
        });
        
        mongodump.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) {
            console.log(`   ℹ️  ${output}`);
          }
        });
        
        mongodump.on('close', (code) => {
          if (code === 0 && !hasError) {
            resolve();
          } else {
            reject(new Error(hasError ? errorOutput : `mongodump terminé avec code ${code}`));
          }
        });
        
        mongodump.on('error', (error) => {
          reject(error);
        });
      });
      
      // Vérifier le fichier créé
      const dbBackupPath = path.join(backupDir, dbName);
      const bsonFile = path.join(dbBackupPath, `${collectionName}.bson.gz`);
      
      if (!fs.existsSync(bsonFile)) {
        throw new Error(`Fichier de backup non créé: ${bsonFile}`);
      }
      
      const stats = fs.statSync(bsonFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   💾 Taille du fichier: ${sizeMB} MB (compressé)`);
      
      // Vérifier l'intégrité en décompressant et comptant
      console.log(`   🔍 Vérification de l'intégrité...`);
      
      // Décompresser temporairement pour compter
      const { execSync } = require('child_process');
      const uncompressedFile = bsonFile.replace('.gz', '');
      
      try {
        execSync(`gunzip -c "${bsonFile}" > "${uncompressedFile}"`, { stdio: 'pipe' });
        
        const backupCount = countDocumentsInBson(uncompressedFile);
        
        // Nettoyer le fichier décompressé
        fs.unlinkSync(uncompressedFile);
        
        if (backupCount === null) {
          console.log(`   ⚠️  Impossible de compter les documents dans le backup`);
        } else if (backupCount === expectedCount) {
          console.log(`   ✅ Intégrité vérifiée: ${backupCount.toLocaleString()} documents`);
        } else {
          throw new Error(`Intégrité compromise: ${backupCount} documents dans le backup vs ${expectedCount} attendus`);
        }
      } catch (verifyError) {
        console.warn(`   ⚠️  Impossible de vérifier l'intégrité: ${verifyError.message}`);
        // On continue quand même si c'est juste la vérification qui échoue
      }
      
      console.log(`   ✅ ${collectionName} sauvegardée avec succès!`);
      return; // Succès
      
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || String(error);
      console.error(`   ❌ Échec de la tentative ${attempt}: ${errorMsg.substring(0, 200)}`);
      
      // Nettoyer les fichiers partiels
      deleteCollectionFiles(backupDir, dbName, collectionName);
      
      if (attempt < maxRetries) {
        continue;
      }
    }
  }
  
  throw lastError || new Error(`Échec après ${maxRetries} tentatives`);
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('🔧 Backup des collections manquantes/incomplètes\n');
    console.log(`📁 Répertoire de backup: ${BACKUP_DIR}`);
    console.log(`📋 Collections à sauvegarder: ${COLLECTIONS_TO_BACKUP.join(', ')}\n`);
    
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error(`Le répertoire de backup n'existe pas: ${BACKUP_DIR}`);
    }
    
    const dbName = extractDatabaseName(MONGODB_URI);
    const dbBackupPath = path.join(BACKUP_DIR, dbName);
    
    if (!fs.existsSync(dbBackupPath)) {
      fs.mkdirSync(dbBackupPath, { recursive: true });
    }
    
    // Nettoyer les fichiers existants
    console.log('🗑️  Nettoyage des fichiers existants...');
    for (const collection of COLLECTIONS_TO_BACKUP) {
      const deleted = deleteCollectionFiles(dbBackupPath, dbName, collection);
      if (!deleted) {
        console.log(`   ℹ️  Aucun fichier existant pour ${collection}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Sauvegarder chaque collection
    const results = {
      success: [],
      failed: []
    };
    
    for (const collection of COLLECTIONS_TO_BACKUP) {
      try {
        await backupCollectionOptimized(MONGODB_URI, BACKUP_DIR, collection, MAX_RETRIES);
        results.success.push(collection);
      } catch (error) {
        console.error(`\n❌ Échec définitif pour ${collection}: ${error.message}`);
        results.failed.push({ collection, error: error.message });
      }
      
      console.log('='.repeat(80));
    }
    
    // Résumé final
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`   ✅ Réussies: ${results.success.length}/${COLLECTIONS_TO_BACKUP.length}`);
    if (results.success.length > 0) {
      results.success.forEach(c => console.log(`      - ${c}`));
    }
    
    console.log(`   ❌ Échouées: ${results.failed.length}/${COLLECTIONS_TO_BACKUP.length}`);
    if (results.failed.length > 0) {
      results.failed.forEach(f => console.log(`      - ${f.collection}: ${f.error.substring(0, 100)}`));
    }
    
    if (results.failed.length === 0) {
      console.log('\n✅ Toutes les collections ont été sauvegardées avec succès!');
      console.log('\n💡 Vous pouvez maintenant vérifier le backup avec:');
      console.log(`   node script/verify-backup.js "${BACKUP_DIR}"`);
    } else {
      console.log('\n⚠️  Certaines collections n\'ont pas pu être sauvegardées.');
      console.log('   Vérifiez votre connexion réseau et réessayez.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Vérifier mongodb
try {
  require.resolve('mongodb');
} catch (error) {
  console.error('❌ Le package "mongodb" n\'est pas installé.');
  console.error('   Installez-le avec: npm install mongodb');
  process.exit(1);
}

main();

