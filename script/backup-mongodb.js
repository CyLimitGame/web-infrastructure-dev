#!/usr/bin/env node

/**
 * OBJECTIF : Script de sauvegarde complète de la base de données MongoDB CyLimit
 * 
 * POURQUOI : Permet de créer des backups complets de la base de données avant toute
 * opération risquée (migrations, suppressions, etc.). Conforme à la règle absolue
 * de toujours faire un backup avant toute opération destructive.
 * 
 * COMMENT :
 * 1. Parse l'URL MongoDB fournie pour extraire les informations de connexion
 * 2. Crée un répertoire de backup avec timestamp unique
 * 3. Exécute mongodump avec retry automatique et gestion d'erreurs robuste
 * 4. Sauvegarde collection par collection pour éviter la perte totale en cas d'erreur
 * 5. Vérifie l'intégrité du backup créé
 * 6. Affiche la taille et le chemin du backup
 * 7. Optionnellement compresse le backup en archive tar.gz
 * 
 * Appelé depuis : Ligne de commande manuelle ou autres scripts de migration
 * Dépendances : mongodump (MongoDB Database Tools) doit être installé sur le système
 */

const { execSync, exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// URL MongoDB fournie
// NOTE: Assurez-vous que le nom de la base de données dans l'URI est correct (cylimit, pas test)
const MONGODB_URI = 'mongodb+srv://cylimit2:rundeal974@cylimit.en0by.mongodb.net/cylimit?authSource=admin&replicaSet=atlas-v3fgec-shard-0&readPreference=primary&ssl=true';
//const MONGODB_URI_DEV = 'mongodb://root:123456@localhost:27444/cylimit_dev?authSource=admin';

// Options de ligne de commande
const args = process.argv.slice(2);
const shouldCompress = args.includes('--compress') || args.includes('-c');
const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || null;
const retryCount = parseInt(args.find(arg => arg.startsWith('--retry='))?.split('=')[1] || '3');
const resumeBackup = args.find(arg => arg.startsWith('--resume='))?.split('=')[1] || null;
const collectionOnly = args.find(arg => arg.startsWith('--collection='))?.split('=')[1] || null;
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
📦 Script de Backup MongoDB - CyLimit

Usage:
  node script/backup-mongodb.js [options]

Options:
  --compress, -c          Compresse le backup en archive tar.gz
  --output=<dir>         Spécifie le répertoire de sortie (défaut: ./backups/)
  --retry=<n>            Nombre de tentatives en cas d'erreur (défaut: 3)
  --resume=<backupDir>   Reprend un backup partiel existant
  --collection=<name>    Sauvegarde uniquement une collection spécifique
  --help, -h             Affiche cette aide

Exemples:
  node script/backup-mongodb.js
  node script/backup-mongodb.js --compress
  node script/backup-mongodb.js --output=/path/to/backups --compress
  node script/backup-mongodb.js --retry=5
  node script/backup-mongodb.js --resume=./backups/cylimit-backup-2025-11-20T03-56-53
  node script/backup-mongodb.js --collection=game_teams

⚠️  IMPORTANT: Assurez-vous que mongodump est installé sur votre système.
   Installation: https://www.mongodb.com/try/download/database-tools
  `);
  process.exit(0);
}

/**
 * Obtient la liste des collections de la base de données
 * Utilise mongodump avec --dryRun pour lister les collections sans les sauvegarder
 * 
 * @param {string} uri - URI de connexion MongoDB
 * @returns {Promise<string[]>} Liste des noms de collections
 */
async function getCollections(uri) {
  try {
    // Essayer d'abord avec mongosh si disponible
    try {
      const command = `mongosh "${uri}" --quiet --eval "db.getCollectionNames().join('\\n')"`;
      const { stdout } = await execAsync(command, { timeout: 10000 });
      const collections = stdout.trim().split('\n').filter(name => name.length > 0 && !name.includes('MongoServerError'));
      if (collections.length > 0) {
        return collections;
      }
    } catch (mongoshError) {
      // mongosh n'est pas disponible, on continue avec mongodump
    }
    
    // Fallback: utiliser mongodump avec --dryRun pour lister les collections
    // Note: mongodump ne supporte pas --dryRun, donc on utilise une autre approche
    // On va simplement essayer de sauvegarder toutes les collections et laisser
    // mongodump gérer les erreurs pour les collections inexistantes
    return null; // Retourner null pour utiliser le backup complet
  } catch (error) {
    console.warn('⚠️  Impossible de lister les collections, utilisation du backup complet');
    return null;
  }
}

/**
 * Vérifie si une collection est déjà sauvegardée
 * 
 * @param {string} backupDir - Répertoire de backup
 * @param {string} collectionName - Nom de la collection
 * @param {string} dbName - Nom de la base de données
 * @returns {boolean} True si la collection existe déjà
 */
function isCollectionBackedUp(backupDir, collectionName, dbName = 'cylimit') {
  const dbBackupPath = path.join(backupDir, dbName);
  const bsonFile = path.join(dbBackupPath, `${collectionName}.bson`);
  const metadataFile = path.join(dbBackupPath, `${collectionName}.metadata.json`);
  
  return fs.existsSync(bsonFile) && fs.existsSync(metadataFile);
}

/**
 * Sauvegarde une collection spécifique avec retry
 * 
 * @param {string} uri - URI de connexion MongoDB
 * @param {string} backupDir - Répertoire de backup
 * @param {string} collectionName - Nom de la collection
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @returns {Promise<void>}
 */
async function backupCollection(uri, backupDir, collectionName, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   🔄 Tentative ${attempt}/${maxRetries} pour ${collectionName}...`);
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 2), 10000)));
      }
      
      const dbName = extractDatabaseName(uri);
      const command = `mongodump --uri="${uri}" --db=${dbName} --collection="${collectionName}" --out="${backupDir}" --numParallelCollections=1`;
      
      // Utiliser spawn pour afficher les logs en temps réel
      return new Promise((resolve, reject) => {
        // Construire les arguments directement sans parser la commande
        // Cela évite les problèmes de parsing avec les caractères spéciaux dans l'URI
        const args = [
          '--uri', uri,
          '--db', dbName,
          '--collection', collectionName,
          '--out', backupDir,
          '--numParallelCollections', '1'
        ];
        
        const mongodump = spawn('mongodump', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false
        });
        
        let lastProgressTime = Date.now();
        
        // mongodump écrit ses logs sur stderr, pas stdout !
        mongodump.stderr.on('data', (data) => {
          const output = data.toString();
          const lines = output.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            if (line.includes('writing')) {
              console.log(`   📦 ${collectionName}: Début de la sauvegarde...`);
              lastProgressTime = Date.now();
            } else if (line.includes('done dumping')) {
              const match = line.match(/done dumping\s+(\S+)\s+\((\d+)\s+documents\)/);
              if (match) {
                const docCount = parseInt(match[2]).toLocaleString();
                console.log(`   📊 ${collectionName}: ${docCount} documents traités`);
              }
            } else if (line.includes('[') && line.includes('%')) {
              const match = line.match(/(\[.*?\])\s+(\S+)\s+(\d+)\/(\d+)\s+\(([\d.]+)%\)/);
              if (match) {
                const current = parseInt(match[3]);
                const total = parseInt(match[4]);
                const percent = parseFloat(match[5]);
                const currentFormatted = current.toLocaleString();
                const totalFormatted = total.toLocaleString();
                
                // Afficher toutes les 2 secondes
                const now = Date.now();
                if (now - lastProgressTime > 2000 || percent >= 100) {
                  console.log(`   📊 ${collectionName}: ${currentFormatted}/${totalFormatted} (${percent.toFixed(1)}%)`);
                  lastProgressTime = now;
                }
              }
            } else if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
              console.error(`   ⚠️  ${line}`);
            }
          });
        });
        
        // stdout peut contenir des informations aussi
        mongodump.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.trim()) {
            console.log(`   ℹ️  ${output.trim()}`);
          }
        });
        
        mongodump.on('close', async (code) => {
          if (code === 0) {
            // Vérifier que le fichier a été créé
            const dbBackupPath = path.join(backupDir, dbName);
            const bsonFile = path.join(dbBackupPath, `${collectionName}.bson`);
            
            if (fs.existsSync(bsonFile)) {
              const stats = fs.statSync(bsonFile);
              const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
              console.log(`   ✅ ${collectionName}: ${sizeMB} MB`);
              resolve(); // Succès
            } else {
              reject(new Error(`Fichier ${bsonFile} non créé`));
            }
          } else {
            reject(new Error(`mongodump s'est terminé avec le code ${code}`));
          }
        });
        
        mongodump.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || error.stderr || String(error);
      
      // Si c'est une erreur de connexion, on réessaye
      if (errorMsg.includes('connection reset') || 
          errorMsg.includes('connection closed') ||
          errorMsg.includes('incomplete read') ||
          errorMsg.includes('timeout')) {
        if (attempt < maxRetries) {
          console.log(`   ⚠️  Erreur de connexion pour ${collectionName}, nouvelle tentative...`);
          continue;
        }
      }
      
      // Pour les autres erreurs, on arrête
      throw error;
    }
  }
  
  throw lastError || new Error(`Échec après ${maxRetries} tentatives pour ${collectionName}`);
}

/**
 * Crée un backup complet de la base de données MongoDB avec gestion d'erreurs robuste
 * 
 * @param {string} uri - URI de connexion MongoDB complète
 * @param {string} backupDir - Répertoire de destination du backup
 * @param {number} maxRetries - Nombre de tentatives en cas d'erreur
 * @param {string[]} collectionsToSkip - Collections déjà sauvegardées à ignorer
 * @returns {Promise<string>} Chemin du répertoire de backup créé
 */
async function createBackup(uri, backupDir, maxRetries = 3, collectionsToSkip = []) {
  const dbName = extractDatabaseName(uri);
  
  console.log('💾 Création du backup MongoDB...');
  console.log(`📁 Répertoire: ${backupDir}`);
  console.log(`🔗 Base de données: ${dbName}`);
  console.log(`🔄 Tentatives max par collection: ${maxRetries}`);
  
  // Créer le répertoire de backup s'il n'existe pas
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const dbBackupPath = path.join(backupDir, dbName);
  if (!fs.existsSync(dbBackupPath)) {
    fs.mkdirSync(dbBackupPath, { recursive: true });
  }
  
  // Si une seule collection est demandée
  if (collectionOnly) {
    console.log(`📦 Sauvegarde de la collection: ${collectionOnly}`);
    await backupCollection(uri, backupDir, collectionOnly, maxRetries);
  } else {
    // Obtenir la liste des collections
    console.log('📋 Récupération de la liste des collections...');
    let collections = await getCollections(uri);
    
    if (!collections || collections.length === 0) {
      // Fallback: utiliser mongodump complet avec retry
      console.log('⏳ Exécution de mongodump complet (toutes collections)...');
      await backupWithRetry(uri, backupDir, maxRetries);
    } else {
      // Sauvegarder collection par collection
      console.log(`📊 ${collections.length} collections trouvées\n`);
      
      const skipped = [];
      const failed = [];
      const succeeded = [];
      
      for (const collection of collections) {
        // Ignorer les collections déjà sauvegardées
        if (collectionsToSkip.includes(collection) || isCollectionBackedUp(backupDir, collection, dbName)) {
          skipped.push(collection);
          console.log(`   ⏭️  ${collection}: déjà sauvegardée`);
          continue;
        }
        
        try {
          await backupCollection(uri, backupDir, collection, maxRetries);
          succeeded.push(collection);
        } catch (error) {
          failed.push({ collection, error: error.message });
          console.error(`   ❌ ${collection}: ${error.message}`);
        }
      }
      
      // Résumé
      console.log(`\n📊 Résumé du backup:`);
      console.log(`   ✅ Réussies: ${succeeded.length}`);
      console.log(`   ⏭️  Ignorées: ${skipped.length}`);
      console.log(`   ❌ Échouées: ${failed.length}`);
      
      if (failed.length > 0) {
        console.log(`\n⚠️  Collections en échec:`);
        failed.forEach(({ collection, error }) => {
          console.log(`   - ${collection}: ${error}`);
        });
        throw new Error(`${failed.length} collection(s) n'ont pas pu être sauvegardées`);
      }
    }
  }
  
  // Vérifier que le backup existe et afficher les statistiques
  // dbBackupPath est déjà défini plus haut dans la fonction
  
  if (fs.existsSync(dbBackupPath)) {
    const collections = fs.readdirSync(dbBackupPath).filter(file => {
      const filePath = path.join(dbBackupPath, file);
      return fs.statSync(filePath).isFile() && file.endsWith('.bson');
    });
    
    if (collections.length === 0) {
      throw new Error(`Aucune collection sauvegardée dans ${dbBackupPath}. Vérifiez que la base de données "${dbName}" existe et contient des collections.`);
    }
    
    console.log(`\n✅ Backup créé avec succès !`);
    console.log(`📊 Collections sauvegardées: ${collections.length}`);
    
    let totalSize = 0;
    collections.forEach(collection => {
      const collectionPath = path.join(dbBackupPath, collection);
      const stats = fs.statSync(collectionPath);
      totalSize += stats.size;
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${collection.replace('.bson', '')}: ${sizeMB} MB`);
    });
    
    // Afficher la taille totale
    try {
      const totalSizeStr = execSync(`du -sh "${backupDir}"`, { encoding: 'utf8' }).trim();
      console.log(`📦 Taille totale: ${totalSizeStr}`);
    } catch (error) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      console.log(`📦 Taille totale: ${totalSizeMB} MB`);
    }
    
    return backupDir;
  } else {
    throw new Error(`Backup créé mais répertoire non trouvé: ${dbBackupPath}. Vérifiez que la base de données "${dbName}" existe dans l'URI MongoDB.`);
  }
}

/**
 * Extrait le nom de la base de données de l'URI MongoDB
 * 
 * @param {string} uri - URI MongoDB
 * @returns {string} Nom de la base de données
 */
function extractDatabaseName(uri) {
  try {
    // Format: mongodb://host/dbname ou mongodb+srv://host/dbname
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback: utiliser 'cylimit' par défaut
    return 'cylimit';
  } catch (error) {
    return 'cylimit';
  }
}

/**
 * Backup complet avec retry (fallback si la liste des collections échoue)
 */
async function backupWithRetry(uri, backupDir, maxRetries = 3) {
  let lastError = null;
  const dbName = extractDatabaseName(uri);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Tentative ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
      
      const command = `mongodump --uri="${uri}" --out="${backupDir}" --numParallelCollections=1`;
      
      console.log(`   Exécution: mongodump pour la base "${dbName}"...`);
      console.log(`   ⏳ Veuillez patienter, cela peut prendre plusieurs minutes...\n`);
      
      // Utiliser spawn pour afficher les logs en temps réel
      return new Promise((resolve, reject) => {
        // Construire les arguments directement sans parser la commande
        // Cela évite les problèmes de parsing avec les caractères spéciaux dans l'URI
        const args = [
          '--uri', uri,
          '--out', backupDir,
          '--numParallelCollections', '1'
        ];
        
        const mongodump = spawn('mongodump', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false
        });
        
        let lastProgressTime = Date.now();
        let lastCollection = '';
        let collectionsProcessed = new Set();
        
        // mongodump écrit ses logs sur stderr, pas stdout !
        mongodump.stderr.on('data', (data) => {
          const output = data.toString();
          const lines = output.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            // Filtrer et formater les messages de progression
            if (line.includes('writing')) {
              const match = line.match(/writing\s+(\S+)\s+to/);
              if (match && match[1] !== lastCollection) {
                lastCollection = match[1];
                const collectionName = match[1].split('.').pop();
                if (!collectionsProcessed.has(collectionName)) {
                  console.log(`\n   📦 Sauvegarde de la collection: ${collectionName}...`);
                  collectionsProcessed.add(collectionName);
                  lastProgressTime = Date.now();
                }
              }
            } else if (line.includes('done dumping')) {
              const match = line.match(/done dumping\s+(\S+)\s+\((\d+)\s+documents\)/);
              if (match) {
                const collectionName = match[1].split('.').pop();
                const docCount = parseInt(match[2]).toLocaleString();
                console.log(`   ✅ ${collectionName}: ${docCount} documents sauvegardés`);
              }
            } else if (line.includes('[') && line.includes('%')) {
              // Barre de progression
              const match = line.match(/(\[.*?\])\s+(\S+)\s+(\d+)\/(\d+)\s+\(([\d.]+)%\)/);
              if (match) {
                const collectionName = match[2].split('.').pop();
                const current = parseInt(match[3]);
                const total = parseInt(match[4]);
                const percent = parseFloat(match[5]);
                const currentFormatted = current.toLocaleString();
                const totalFormatted = total.toLocaleString();
                
                // Afficher seulement toutes les 3 secondes pour éviter le spam
                const now = Date.now();
                if (now - lastProgressTime > 3000 || percent >= 100) {
                  console.log(`   📊 ${collectionName}: ${currentFormatted}/${totalFormatted} (${percent.toFixed(1)}%)`);
                  lastProgressTime = now;
                }
              }
            } else if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
              console.error(`   ⚠️  ${line}`);
            }
          });
        });
        
        // stdout peut contenir des informations aussi
        mongodump.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.trim()) {
            console.log(`   ℹ️  ${output.trim()}`);
          }
        });
        
        mongodump.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`mongodump s'est terminé avec le code ${code}`));
          }
        });
        
        mongodump.on('error', (error) => {
          reject(error);
        });
      });
      
      // Vérifier que des fichiers ont été créés
      const dbBackupPath = path.join(backupDir, dbName);
      if (!fs.existsSync(dbBackupPath)) {
        throw new Error(`Le répertoire de backup n'a pas été créé: ${dbBackupPath}. Vérifiez que la base de données "${dbName}" existe et contient des collections.`);
      }
      
      const files = fs.readdirSync(dbBackupPath).filter(f => f.endsWith('.bson'));
      if (files.length === 0) {
        throw new Error(`Aucune collection sauvegardée. Vérifiez que la base de données "${dbName}" existe et contient des collections.`);
      }
      
      console.log(`   ✅ ${files.length} collection(s) sauvegardée(s)`);
      return; // Succès
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || error.stderr || String(error);
      
      // Afficher l'erreur pour debug
      if (attempt === 1) {
        console.error(`   ❌ Erreur: ${errorMsg.substring(0, 200)}...`);
      }
      
      if (errorMsg.includes('connection reset') || 
          errorMsg.includes('connection closed') ||
          errorMsg.includes('incomplete read') ||
          errorMsg.includes('timeout')) {
        if (attempt < maxRetries) {
          continue;
        }
      }
      
      // Si c'est une erreur de base de données inexistante, ne pas réessayer
      if (errorMsg.includes('not found') || 
          errorMsg.includes('does not exist') ||
          errorMsg.includes('authentication failed')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error(`Échec après ${maxRetries} tentatives`);
}

/**
 * Calcule la taille d'un répertoire de manière récursive (fallback pour Windows)
 */
function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

/**
 * Compresse le backup en archive tar.gz
 * 
 * @param {string} backupDir - Répertoire à compresser
 * @returns {Promise<string>} Chemin de l'archive créée
 */
async function compressBackup(backupDir) {
  return new Promise((resolve, reject) => {
    try {
      const archivePath = `${backupDir}.tar.gz`;
      console.log(`\n🗜️  Compression du backup...`);
      console.log(`📦 Archive: ${archivePath}`);
      
      // Créer l'archive tar.gz
      const dirName = path.basename(backupDir);
      const parentDir = path.dirname(backupDir);
      
      execSync(`cd "${parentDir}" && tar -czf "${path.basename(archivePath)}" "${dirName}"`, {
        stdio: 'inherit',
        encoding: 'utf8'
      });
      
      // Afficher la taille de l'archive
      const stats = fs.statSync(archivePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ Archive créée: ${sizeMB} MB`);
      
      resolve(archivePath);
    } catch (error) {
      console.error('❌ Erreur lors de la compression:', error.message);
      reject(error);
    }
  });
}

/**
 * Obtient les collections déjà sauvegardées dans un backup existant
 */
function getBackedUpCollections(backupDir, dbName = 'cylimit') {
  const dbBackupPath = path.join(backupDir, dbName);
  if (!fs.existsSync(dbBackupPath)) {
    return [];
  }
  
  return fs.readdirSync(dbBackupPath)
    .filter(file => file.endsWith('.bson'))
    .map(file => file.replace('.bson', ''));
}

/**
 * Fonction principale
 */
async function main() {
  let backupDir = null; // Déclarer en dehors du try pour être accessible dans le catch
  
  try {
    let collectionsToSkip = [];
    
    // Si on reprend un backup existant
    if (resumeBackup) {
      if (!fs.existsSync(resumeBackup)) {
        throw new Error(`Le répertoire de backup spécifié n'existe pas: ${resumeBackup}`);
      }
      backupDir = resumeBackup;
      const dbName = extractDatabaseName(MONGODB_URI);
      collectionsToSkip = getBackedUpCollections(backupDir, dbName);
      console.log(`🔄 Reprise du backup existant: ${backupDir}`);
      console.log(`📋 Collections déjà sauvegardées: ${collectionsToSkip.length}`);
      if (collectionsToSkip.length > 0) {
        console.log(`   ${collectionsToSkip.slice(0, 5).join(', ')}${collectionsToSkip.length > 5 ? '...' : ''}`);
      }
    } else {
      // Créer le nom du répertoire de backup avec timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseBackupDir = outputDir || path.join(process.cwd(), 'backups');
      backupDir = path.join(baseBackupDir, `cylimit-backup-${timestamp}`);
    }
    
    // Créer le backup
    await createBackup(MONGODB_URI, backupDir, retryCount, collectionsToSkip);
    
    // Compresser si demandé
    if (shouldCompress) {
      await compressBackup(backupDir);
      console.log(`\n🎉 Backup compressé disponible: ${backupDir}.tar.gz`);
    } else {
      console.log(`\n🎉 Backup disponible: ${backupDir}`);
    }
    
    console.log(`\n💡 Pour restaurer ce backup, utilisez:`);
    console.log(`   mongorestore --uri="<URI>" "${backupDir}"`);
    
    // Si le backup était partiel, suggérer de reprendre
    if (resumeBackup && collectionsToSkip.length > 0) {
      console.log(`\n💡 Pour reprendre ce backup, utilisez:`);
      console.log(`   node script/backup-mongodb.js --resume="${backupDir}"`);
    }
    
  } catch (error) {
    console.error('\n❌ Échec du backup:', error.message);
    
    // Si le backup était partiel, suggérer de reprendre
    if (!resumeBackup && backupDir && fs.existsSync(backupDir)) {
      const dbName = extractDatabaseName(MONGODB_URI);
      const backedUp = getBackedUpCollections(backupDir, dbName);
      if (backedUp.length > 0) {
        console.log(`\n💡 ${backedUp.length} collection(s) ont été sauvegardées avant l'erreur.`);
        console.log(`   Pour reprendre le backup, utilisez:`);
        console.log(`   node script/backup-mongodb.js --resume="${backupDir}"`);
      }
    }
    
    process.exit(1);
  }
}

// Exécuter le script
main();

