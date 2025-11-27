#!/usr/bin/env node

/**
 * OBJECTIF : Script pour restaurer un backup de production dans la base de données de développement
 * 
 * POURQUOI : Permet de copier les données de production dans la base de développement pour
 * tester avec des données réelles ou réinitialiser l'environnement de développement.
 * Supporte la reprise en cas d'interruption pour continuer une restauration incomplète.
 * 
 * COMMENT :
 * 1. Prend le chemin d'un backup MongoDB (créé avec backup-mongodb.js)
 * 2. Se connecte à la base de développement MongoDB
 * 3. En mode normal : Restaure toutes les collections du backup avec mongorestore
 * 4. En mode --resume : Détecte les collections déjà restaurées et ne restaure que les manquantes/incomplètes
 * 5. Affiche la progression en temps réel
 * 6. Vérifie que la restauration s'est bien passée
 * 
 * Appelé depuis : Ligne de commande manuelle
 * Dépendances : mongorestore, mongosh (MongoDB Database Tools) doivent être installés sur le système
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// URI MongoDB de développement
const MONGODB_URI_DEV = 'mongodb+srv://Valentin:8Zf40dyrQmUEptFK@cylimit-dev.m0nbyfo.mongodb.net/';

// Options de ligne de commande
const args = process.argv.slice(2);
const backupPath = args.find(arg => arg.startsWith('--backup='))?.split('=')[1] || args[0] || null;
const force = args.includes('--force') || args.includes('-f');
const help = args.includes('--help') || args.includes('-h');
const drop = args.includes('--drop'); // Supprime les collections existantes avant restauration
const debug = args.includes('--debug') || args.includes('-d'); // Mode debug pour afficher tous les messages
const resume = args.includes('--resume') || args.includes('-r'); // Mode reprise : restaure uniquement les collections manquantes
const verifyOnly = args.includes('--verify-only'); // Mode vérification seule : compare backup et base cible

if (help || !backupPath) {
  console.log(`
📥 Script de Restauration Backup MongoDB - CyLimit

Usage:
  node script/restore-backup-to-dev.js <chemin-backup> [options]
  node script/restore-backup-to-dev.js --backup=<chemin-backup> [options]

Arguments:
  <chemin-backup>              Chemin vers le répertoire de backup à restaurer

Options:
  --drop                       Supprime les collections existantes avant restauration
  --resume, -r                 Mode reprise: restaure uniquement les collections manquantes ou incomplètes
  --verify-only                Vérifie uniquement que le backup correspond à la base cible (sans restaurer)
  --force, -f                  Restaure sans demander confirmation
  --debug, -d                  Mode debug: affiche tous les messages de mongorestore
  --help, -h                   Affiche cette aide

Exemples:
  node script/restore-backup-to-dev.js ./script/backups/cylimit-backup-production-2025-11-20T06-38-40
  node script/restore-backup-to-dev.js --backup=./script/backups/cylimit-backup-production-2025-11-20T06-38-40 --drop
  node script/restore-backup-to-dev.js --backup=./script/backups/cylimit-backup-production-2025-11-20T06-38-40 --force --drop
  node script/restore-backup-to-dev.js --backup=./script/backups/cylimit-backup-production-2025-11-20T06-38-40 --resume
  node script/restore-backup-to-dev.js --backup=./script/backups/cylimit-backup-production-2025-11-20T06-38-40 --verify-only

⚠️  ATTENTION: Ce script va écraser les données de la base de développement !
   Assurez-vous d'avoir fait un backup de dev si nécessaire.
  
💡 Mode --resume:
   Détecte automatiquement les collections déjà restaurées et continue uniquement
   celles qui sont manquantes ou incomplètes. Utile si une restauration a été interrompue.
  `);
  process.exit(0);
}

/**
 * Compte les documents dans une collection du backup en analysant le fichier .bson
 * 
 * À QUOI ELLE SERT :
 * Permet de connaître le nombre exact de documents dans une collection du backup
 * sans avoir à la restaurer, en utilisant bsondump pour analyser le fichier .bson.
 * 
 * CE QU'ELLE FAIT :
 * 1. Utilise bsondump pour extraire les documents du fichier .bson
 * 2. Compte le nombre de lignes (= documents) dans la sortie
 * 3. Retourne le nombre de documents
 * 
 * APPELÉE DEPUIS :
 * - getCollectionsToRestore() dans ce fichier
 * 
 * DÉPENDANCES :
 * - bsondump (MongoDB Database Tools)
 */
function countDocumentsInBackup(bsonFilePath) {
  try {
    // Utiliser bsondump pour compter les documents
    const output = execSync(`bsondump --quiet "${bsonFilePath}" 2>/dev/null | wc -l`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50MB
    });
    return parseInt(output.trim()) || 0;
  } catch (error) {
    // Si bsondump échoue, essayer une estimation via la taille du fichier
    try {
      const stats = fs.statSync(bsonFilePath);
      // Estimation grossière : ~100 bytes par document en moyenne
      return Math.floor(stats.size / 100);
    } catch (err) {
      return 0;
    }
  }
}

/**
 * Récupère le nombre de documents dans une collection de la base cible
 * 
 * À QUOI ELLE SERT :
 * Permet de vérifier combien de documents sont déjà présents dans une collection
 * de la base de données cible, pour déterminer si elle a été complètement restaurée.
 * 
 * CE QU'ELLE FAIT :
 * 1. Se connecte à la base cible avec mongosh
 * 2. Exécute countDocuments() sur la collection
 * 3. Parse et retourne le résultat
 * 4. Retourne 0 si la collection n'existe pas
 * 
 * APPELÉE DEPUIS :
 * - getCollectionsToRestore() dans ce fichier
 * 
 * DÉPENDANCES :
 * - mongosh
 */
function getCollectionDocumentCount(targetUri, dbName, collectionName) {
  try {
    const countScript = `db.getSiblingDB('${dbName}').getCollection('${collectionName}').countDocuments({})`;
    const countOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${countScript}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const count = parseInt(countOutput.trim().split('\n').find(line => /^\d+$/.test(line.trim())) || '0');
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Détermine quelles collections doivent être restaurées en mode reprise
 * 
 * À QUOI ELLE SERT :
 * Compare l'état actuel de la base de données avec le backup pour identifier
 * les collections manquantes ou incomplètes à restaurer.
 * 
 * CE QU'ELLE FAIT :
 * 1. Liste tous les fichiers .bson du backup
 * 2. Pour chaque collection, compte les documents dans le backup
 * 3. Vérifie combien de documents sont déjà dans la base cible
 * 4. Marque comme à restaurer si manquante ou si moins de 95% des documents sont présents
 * 5. Retourne la liste des collections à restaurer avec leurs statistiques
 * 
 * APPELÉE DEPUIS :
 * - main() dans ce fichier (en mode --resume)
 * 
 * DÉPENDANCES :
 * - countDocumentsInBackup()
 * - getCollectionDocumentCount()
 */
async function getCollectionsToRestore(backupPath, targetUri) {
  const dbName = extractDatabaseName(targetUri);
  
  // Trouver le répertoire de la base de données dans le backup
  const entries = fs.readdirSync(backupPath);
  const dbDir = entries.find(entry => {
    const fullPath = path.join(backupPath, entry);
    return fs.statSync(fullPath).isDirectory();
  });
  
  if (!dbDir) {
    throw new Error(`Aucune base de données trouvée dans le backup: ${backupPath}`);
  }
  
  const dbPath = path.join(backupPath, dbDir);
  const bsonFiles = fs.readdirSync(dbPath).filter(file => file.endsWith('.bson'));
  
  console.log(`\n🔍 Analyse du backup et de la base cible...`);
  console.log(`   Backup: ${bsonFiles.length} collection(s) trouvée(s)`);
  
  const collectionsToRestore = [];
  const collectionsAlreadyDone = [];
  
  for (const bsonFile of bsonFiles) {
    const collectionName = path.basename(bsonFile, '.bson');
    const bsonFilePath = path.join(dbPath, bsonFile);
    
    // Compter les documents dans le backup
    console.log(`   📊 Analyse de ${collectionName}...`);
    const backupCount = countDocumentsInBackup(bsonFilePath);
    
    // Compter les documents dans la base cible
    const targetCount = getCollectionDocumentCount(targetUri, dbName, collectionName);
    
    // Déterminer si la collection doit être restaurée
    // On considère qu'une collection est complète si elle a >= 95% des documents
    const completionRatio = backupCount > 0 ? targetCount / backupCount : 0;
    const isComplete = completionRatio >= 0.95;
    
    if (isComplete && targetCount > 0) {
      console.log(`   ✅ ${collectionName}: ${targetCount.toLocaleString()}/${backupCount.toLocaleString()} docs (${(completionRatio * 100).toFixed(1)}%) - COMPLÈTE`);
      collectionsAlreadyDone.push({
        name: collectionName,
        backupCount,
        targetCount,
        complete: true
      });
    } else {
      const status = targetCount === 0 ? 'MANQUANTE' : `INCOMPLÈTE (${(completionRatio * 100).toFixed(1)}%)`;
      console.log(`   🔄 ${collectionName}: ${targetCount.toLocaleString()}/${backupCount.toLocaleString()} docs - ${status}`);
      collectionsToRestore.push({
        name: collectionName,
        bsonFile,
        bsonFilePath,
        backupCount,
        targetCount,
        complete: false
      });
    }
  }
  
  return {
    toRestore: collectionsToRestore,
    alreadyDone: collectionsAlreadyDone,
    dbPath
  };
}

/**
 * Extrait le nom de la base de données de l'URI MongoDB
 */
function extractDatabaseName(uri) {
  try {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1]) {
      return match[1];
    }
    return 'cylimit';
  } catch (error) {
    return 'cylimit';
  }
}

/**
 * Vérifie que le backup existe et contient des fichiers
 */
function validateBackup(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Le répertoire de backup n'existe pas: ${backupPath}`);
  }
  
  // Chercher le répertoire de la base de données dans le backup
  const entries = fs.readdirSync(backupPath);
  const dbDir = entries.find(entry => {
    const fullPath = path.join(backupPath, entry);
    return fs.statSync(fullPath).isDirectory();
  });
  
  if (!dbDir) {
    throw new Error(`Aucune base de données trouvée dans le backup: ${backupPath}`);
  }
  
  const dbPath = path.join(backupPath, dbDir);
  const bsonFiles = fs.readdirSync(dbPath).filter(file => file.endsWith('.bson'));
  
  if (bsonFiles.length === 0) {
    throw new Error(`Aucune collection trouvée dans le backup: ${dbPath}`);
  }
  
  return { dbDir, dbPath, collections: bsonFiles.length };
}

/**
 * Demande confirmation à l'utilisateur
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Restaure une seule collection depuis un fichier .bson
 * 
 * À QUOI ELLE SERT :
 * Permet de restaurer une collection spécifique plutôt que toutes les collections,
 * utile en mode reprise pour ne restaurer que les collections manquantes.
 * 
 * CE QU'ELLE FAIT :
 * 1. Prépare les arguments mongorestore pour une collection spécifique
 * 2. Lance mongorestore avec --collection pour cibler une seule collection
 * 3. Affiche la progression en temps réel
 * 4. Retourne les statistiques de restauration
 * 
 * APPELÉE DEPUIS :
 * - restoreCollections() dans ce fichier (en mode --resume)
 * 
 * DÉPENDANCES :
 * - mongorestore
 */
async function restoreCollection(bsonFilePath, targetUri, collectionName, dropIfExists = false) {
  return new Promise((resolve, reject) => {
    const dbName = extractDatabaseName(targetUri);
    
    // Construire les arguments pour mongorestore
    const args = [
      '--uri', targetUri,
      '--db', dbName,
      '--collection', collectionName,
      bsonFilePath,
      '--verbose'
    ];
    
    if (dropIfExists) {
      args.push('--drop');
    }
    
    console.log(`\n   📦 Restauration de ${collectionName}...`);
    
    const mongorestore = spawn('mongorestore', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    
    let allStderrOutput = '';
    let allStdoutOutput = '';
    let lastProgressTime = Date.now();
    let documentsRestored = 0;
    
    mongorestore.stderr.on('data', (data) => {
      const output = data.toString();
      allStderrOutput += output;
      const lines = output.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.includes('building indexes')) {
          console.log(`      🔨 Création des index...`);
        } else if (line.includes('finished restoring')) {
          const match = line.match(/finished restoring.*?\((\d+)\s+documents\)/);
          if (match) {
            documentsRestored = parseInt(match[1]);
            console.log(`      ✅ ${documentsRestored.toLocaleString()} documents restaurés`);
          }
        } else if (line.includes('[') && line.includes('%')) {
          const match = line.match(/(\d+)\/(\d+)\s+\(([\d.]+)%\)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            const percent = parseFloat(match[3]);
            
            const now = Date.now();
            if (now - lastProgressTime > 3000 || percent >= 100) {
              console.log(`      📊 ${current.toLocaleString()}/${total.toLocaleString()} (${percent.toFixed(1)}%)`);
              lastProgressTime = now;
            }
          }
        } else if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
          console.error(`      ⚠️  ${line}`);
        } else if (debug && line.trim()) {
          console.log(`      ℹ️  ${line}`);
        }
      });
    });
    
    mongorestore.stdout.on('data', (data) => {
      const output = data.toString();
      allStdoutOutput += output;
      if (debug) {
        const lines = output.split('\n').filter(line => line.trim());
        lines.forEach(line => console.log(`      ℹ️  ${line.trim()}`));
      }
    });
    
    mongorestore.on('close', (code) => {
      if (code === 0) {
        resolve({ 
          collection: collectionName, 
          documentsRestored,
          stderr: allStderrOutput, 
          stdout: allStdoutOutput 
        });
      } else {
        console.error(`      ❌ Erreur (code ${code})`);
        reject(new Error(`mongorestore failed with code ${code} for collection ${collectionName}`));
      }
    });
    
    mongorestore.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Restaure plusieurs collections en séquence
 * 
 * À QUOI ELLE SERT :
 * Orchestre la restauration de plusieurs collections une par une,
 * utilisé en mode reprise pour restaurer uniquement les collections manquantes.
 * 
 * CE QU'ELLE FAIT :
 * 1. Parcourt la liste des collections à restaurer
 * 2. Restaure chaque collection avec restoreCollection()
 * 3. Gère les erreurs pour continuer même si une collection échoue
 * 4. Compile les statistiques finales
 * 
 * APPELÉE DEPUIS :
 * - main() dans ce fichier (en mode --resume)
 * 
 * DÉPENDANCES :
 * - restoreCollection()
 */
async function restoreCollections(collectionsInfo, targetUri, dropIfExists = false) {
  const results = {
    success: [],
    failed: [],
    totalDocuments: 0
  };
  
  console.log(`\n📥 Restauration de ${collectionsInfo.length} collection(s)...`);
  
  for (let i = 0; i < collectionsInfo.length; i++) {
    const info = collectionsInfo[i];
    console.log(`\n[${i + 1}/${collectionsInfo.length}] ${info.name}`);
    
    try {
      const result = await restoreCollection(
        info.bsonFilePath,
        targetUri,
        info.name,
        dropIfExists
      );
      
      results.success.push({
        name: info.name,
        documentsRestored: result.documentsRestored
      });
      results.totalDocuments += result.documentsRestored;
      
      console.log(`      ✅ ${info.name} terminée`);
    } catch (error) {
      console.error(`      ❌ Échec de ${info.name}: ${error.message}`);
      results.failed.push({
        name: info.name,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Restaure le backup avec mongorestore
 */
async function restoreBackup(backupPath, targetUri, dropCollections = false) {
  return new Promise((resolve, reject) => {
    const dbName = extractDatabaseName(targetUri);
    
    // Trouver le répertoire de la base de données dans le backup
    const entries = fs.readdirSync(backupPath);
    const dbDir = entries.find(entry => {
      const fullPath = path.join(backupPath, entry);
      return fs.statSync(fullPath).isDirectory();
    });
    
    if (!dbDir) {
      reject(new Error(`Aucune base de données trouvée dans le backup: ${backupPath}`));
      return;
    }
    
    // mongorestore avec --dir attend un répertoire contenant directement les fichiers .bson
    // Notre backup a la structure: backup/cylimit/*.bson
    // On doit passer le chemin vers le sous-dossier directement qui contient les fichiers
    const dbPath = path.join(backupPath, dbDir);
    
    // Vérifier que le dossier de la base contient des fichiers .bson
    const bsonFiles = fs.readdirSync(dbPath).filter(f => f.endsWith('.bson'));
    if (bsonFiles.length === 0) {
      reject(new Error(`Aucun fichier .bson trouvé dans ${dbPath}`));
      return;
    }
    
    // Construire les arguments pour mongorestore
    // On passe directement le chemin vers le dossier contenant les fichiers .bson
    // et on spécifie explicitement la base de données cible
    const args = [
      '--uri', targetUri,
      '--db', dbName, // Spécifier explicitement la base de données cible
      '--dir', dbPath, // Chemin direct vers le dossier contenant les fichiers .bson
      '--numParallelCollections', '1',
      '--verbose' // Mode verbose pour voir tous les messages
    ];
    
    // Note: mongorestore restaurera toutes les collections trouvées dans dbPath
    // dans la base spécifiée par --db (qui correspond à celle dans l'URI)
    
    if (dropCollections) {
      args.push('--drop');
    }
    
    console.log(`\n📥 Restauration du backup...`);
    console.log(`   Source (backup): ${backupPath}`);
    console.log(`   Source (fichiers .bson): ${dbPath}`);
    console.log(`   Base de données dans backup: ${dbDir}`);
    console.log(`   Fichiers .bson trouvés: ${bsonFiles.length}`);
    console.log(`   Destination: ${dbName}`);
    if (dbDir !== dbName) {
      console.log(`   🔄 Mapping: ${dbDir}.* → ${dbName}.*`);
    } else {
      console.log(`   ✅ Restauration directe dans ${dbName} (nom identique)`);
    }
    if (dropCollections) {
      console.log(`   ⚠️  Mode --drop: les collections existantes seront supprimées`);
    }
    console.log(`\n⏳ Veuillez patienter, cela peut prendre plusieurs minutes...\n`);
    
    const mongorestore = spawn('mongorestore', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    
    let allStderrOutput = '';
    let allStdoutOutput = '';
    let lastProgressTime = Date.now();
    let lastCollection = '';
    let collectionsProcessed = new Set();
    let restoredCollections = [];
    
    // mongorestore écrit ses logs sur stderr
    mongorestore.stderr.on('data', (data) => {
      const output = data.toString();
      allStderrOutput += output;
      const lines = output.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        // Filtrer et formater les messages de progression
        if (line.includes('building indexes')) {
          const match = line.match(/building indexes.*?collection:\s+(\S+)/);
          if (match) {
            const collectionName = match[1].split('.').pop();
            console.log(`   🔨 ${collectionName}: Création des index...`);
          }
        } else if (line.includes('finished restoring')) {
          const match = line.match(/finished restoring\s+(\S+)\s+\((\d+)\s+documents\)/);
          if (match) {
            const collectionName = match[1].split('.').pop();
            const docCount = parseInt(match[2]);
            console.log(`   ✅ ${collectionName}: ${docCount.toLocaleString()} documents restaurés`);
            restoredCollections.push({ name: collectionName, count: docCount });
          }
        } else if (line.includes('restoring')) {
          const match = line.match(/restoring\s+(\S+)\s+from/);
          if (match && match[1] !== lastCollection) {
            lastCollection = match[1];
            const collectionName = match[1].split('.').pop();
            if (!collectionsProcessed.has(collectionName)) {
              console.log(`\n   📦 Restauration de la collection: ${collectionName}...`);
              collectionsProcessed.add(collectionName);
              lastProgressTime = Date.now();
            }
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
        } else if (line.includes('error') || line.includes('Error') || line.includes('Failed') || line.includes('warning') || line.includes('Warning')) {
          console.error(`   ⚠️  ${line}`);
        } else if (debug || line.trim() && !line.includes('The --db and --collection flags are deprecated')) {
          // Afficher les autres messages importants (tous en mode debug)
          if (debug || line.includes('done') || line.includes('success') || line.includes('completed') || line.includes('restored')) {
            console.log(`   ℹ️  ${line}`);
          }
        }
      });
    });
    
    // stdout peut contenir des informations aussi
    mongorestore.stdout.on('data', (data) => {
      const output = data.toString();
      allStdoutOutput += output;
      const lines = output.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim() && !line.includes('restoring')) {
          console.log(`   ℹ️  ${line.trim()}`);
        }
      });
    });
    
    mongorestore.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Restauration terminée avec succès !`);
        if (restoredCollections.length > 0) {
          console.log(`\n📊 Résumé de la restauration:`);
          restoredCollections.forEach(col => {
            console.log(`   ✅ ${col.name}: ${col.count.toLocaleString()} documents`);
          });
        } else {
          console.log(`\n⚠️  Aucune collection restaurée détectée dans les logs`);
          if (debug) {
            console.log(`\n📋 Messages stderr complets:`);
            console.log(allStderrOutput);
            console.log(`\n📋 Messages stdout complets:`);
            console.log(allStdoutOutput);
          } else {
            console.log(`\n💡 Utilisez --debug pour voir tous les messages de mongorestore`);
          }
        }
        resolve({ restoredCollections, stderr: allStderrOutput, stdout: allStdoutOutput });
      } else {
        console.error(`\n❌ Erreur de mongorestore (code ${code})`);
        console.error(`\nSortie stderr:`);
        console.error(allStderrOutput);
        console.error(`\nSortie stdout:`);
        console.error(allStdoutOutput);
        reject(new Error(`mongorestore s'est terminé avec le code ${code}`));
      }
    });
    
    mongorestore.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('mongorestore n\'est pas installé. Installez MongoDB Database Tools.'));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * Vérifie en détail que le backup correspond à la base cible
 * 
 * À QUOI ELLE SERT :
 * Compare exhaustivement le nombre de documents et la taille de chaque collection
 * entre le backup et la base cible pour détecter les incohérences ou données manquantes.
 * 
 * CE QU'ELLE FAIT :
 * 1. Liste toutes les collections du backup avec leur nombre de documents
 * 2. Pour chaque collection, compare avec la base cible :
 *    - Nombre de documents (backup vs cible)
 *    - Taille des données
 *    - Taille des index
 * 3. Calcule le pourcentage de complétion
 * 4. Identifie les collections manquantes, incomplètes ou en surplus
 * 5. Affiche un rapport détaillé avec code couleur
 * 
 * APPELÉE DEPUIS :
 * - main() dans ce fichier (en mode --verify-only)
 * 
 * DÉPENDANCES :
 * - countDocumentsInBackup()
 * - mongosh (pour récupérer les stats des collections)
 */
async function verifyBackupIntegrity(backupPath, targetUri) {
  const dbName = extractDatabaseName(targetUri);
  
  console.log(`\n🔍 VÉRIFICATION DÉTAILLÉE DE L'INTÉGRITÉ`);
  console.log(`═══════════════════════════════════════════════\n`);
  
  // Trouver le répertoire de la base de données dans le backup
  const entries = fs.readdirSync(backupPath);
  const dbDir = entries.find(entry => {
    const fullPath = path.join(backupPath, entry);
    return fs.statSync(fullPath).isDirectory();
  });
  
  if (!dbDir) {
    throw new Error(`Aucune base de données trouvée dans le backup: ${backupPath}`);
  }
  
  const dbPath = path.join(backupPath, dbDir);
  const bsonFiles = fs.readdirSync(dbPath).filter(file => file.endsWith('.bson'));
  
  // Récupérer la liste des collections dans la base cible
  const listCollectionsScript = `
    const db = db.getSiblingDB('${dbName}');
    const collections = db.getCollectionNames();
    print(JSON.stringify(collections));
  `;
  
  let targetCollections = [];
  try {
    const collectionsOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${listCollectionsScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    targetCollections = JSON.parse(collectionsOutput.trim());
  } catch (error) {
    console.error(`⚠️  Erreur lors de la récupération des collections cibles: ${error.message}`);
  }
  
  const results = {
    perfect: [],      // 100% des documents
    complete: [],     // >= 95% des documents
    incomplete: [],   // < 95% des documents
    missing: [],      // 0 document
    extra: []         // Collections dans cible mais pas dans backup
  };
  
  let totalBackupDocs = 0;
  let totalTargetDocs = 0;
  let totalBackupSize = 0;
  let totalTargetSize = 0;
  
  console.log(`📊 Analyse de ${bsonFiles.length} collection(s) du backup...\n`);
  
  // Analyser chaque collection du backup
  for (const bsonFile of bsonFiles) {
    const collectionName = path.basename(bsonFile, '.bson');
    const bsonFilePath = path.join(dbPath, bsonFile);
    
    // Stats du backup
    const backupCount = countDocumentsInBackup(bsonFilePath);
    const backupStats = fs.statSync(bsonFilePath);
    const backupSize = backupStats.size;
    
    totalBackupDocs += backupCount;
    totalBackupSize += backupSize;
    
    // Stats de la cible
    let targetCount = 0;
    let targetSize = 0;
    let targetIndexSize = 0;
    
    try {
      // Utiliser collStats pour avoir des informations détaillées
      const statsScript = `
        const db = db.getSiblingDB('${dbName}');
        const stats = db.getCollection('${collectionName}').stats();
        print(JSON.stringify({
          count: stats.count || 0,
          size: stats.size || 0,
          totalIndexSize: stats.totalIndexSize || 0,
          avgObjSize: stats.avgObjSize || 0
        }));
      `;
      
      const statsOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${statsScript.replace(/\n/g, ' ')}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });
      
      const lines = statsOutput.trim().split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const stats = JSON.parse(jsonLine);
        targetCount = stats.count || 0;
        targetSize = stats.size || 0;
        targetIndexSize = stats.totalIndexSize || 0;
      }
    } catch (error) {
      // Collection n'existe pas dans la cible
      targetCount = 0;
      targetSize = 0;
      targetIndexSize = 0;
    }
    
    totalTargetDocs += targetCount;
    totalTargetSize += targetSize;
    
    // Calculer le ratio de complétion
    const completionRatio = backupCount > 0 ? targetCount / backupCount : 0;
    const percentComplete = (completionRatio * 100).toFixed(2);
    
    const collectionInfo = {
      name: collectionName,
      backupCount,
      backupSize,
      targetCount,
      targetSize,
      targetIndexSize,
      completionRatio,
      percentComplete: parseFloat(percentComplete),
      docsDiff: targetCount - backupCount
    };
    
    // Catégoriser
    if (targetCount === 0) {
      results.missing.push(collectionInfo);
    } else if (completionRatio >= 1.0 && targetCount === backupCount) {
      results.perfect.push(collectionInfo);
    } else if (completionRatio >= 0.95) {
      results.complete.push(collectionInfo);
    } else {
      results.incomplete.push(collectionInfo);
    }
  }
  
  // Trouver les collections dans la cible mais pas dans le backup
  const backupCollectionNames = bsonFiles.map(f => path.basename(f, '.bson'));
  for (const targetCol of targetCollections) {
    if (!backupCollectionNames.includes(targetCol)) {
      try {
        const countScript = `db.getSiblingDB('${dbName}').getCollection('${targetCol}').countDocuments({})`;
        const countOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${countScript}"`, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024
        });
        const count = parseInt(countOutput.trim().split('\n').find(line => /^\d+$/.test(line.trim())) || '0');
        
        results.extra.push({
          name: targetCol,
          count
        });
      } catch (error) {
        // Ignorer
      }
    }
  }
  
  // Afficher le rapport
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`                        📊 RAPPORT DE VÉRIFICATION`);
  console.log(`${'═'.repeat(80)}\n`);
  
  // Résumé global
  const globalCompletionRatio = totalBackupDocs > 0 ? totalTargetDocs / totalBackupDocs : 0;
  const globalPercent = (globalCompletionRatio * 100).toFixed(2);
  
  console.log(`📈 RÉSUMÉ GLOBAL:`);
  console.log(`   Documents backup:  ${totalBackupDocs.toLocaleString()}`);
  console.log(`   Documents cible:   ${totalTargetDocs.toLocaleString()}`);
  console.log(`   Différence:        ${(totalTargetDocs - totalBackupDocs).toLocaleString()} docs`);
  console.log(`   Complétion:        ${globalPercent}%`);
  console.log(`   Taille backup:     ${formatBytes(totalBackupSize)}`);
  console.log(`   Taille cible:      ${formatBytes(totalTargetSize)}\n`);
  
  // Collections parfaites
  if (results.perfect.length > 0) {
    console.log(`✅ COLLECTIONS PARFAITES (${results.perfect.length}):`);
    console.log(`   ${'-'.repeat(76)}`);
    console.log(`   ${'Collection'.padEnd(30)} ${'Backup'.padStart(12)} ${'Cible'.padStart(12)} ${'Taille'.padStart(12)}`);
    console.log(`   ${'-'.repeat(76)}`);
    
    results.perfect.forEach(col => {
      console.log(`   ${col.name.padEnd(30)} ${col.backupCount.toLocaleString().padStart(12)} ${col.targetCount.toLocaleString().padStart(12)} ${formatBytes(col.targetSize).padStart(12)}`);
    });
    console.log();
  }
  
  // Collections complètes (>= 95%)
  if (results.complete.length > 0) {
    console.log(`✅ COLLECTIONS COMPLÈTES (${results.complete.length}) - >= 95%:`);
    console.log(`   ${'-'.repeat(88)}`);
    console.log(`   ${'Collection'.padEnd(25)} ${'Backup'.padStart(12)} ${'Cible'.padStart(12)} ${'Diff'.padStart(10)} ${'%'.padStart(8)} ${'Taille'.padStart(12)}`);
    console.log(`   ${'-'.repeat(88)}`);
    
    results.complete.forEach(col => {
      const diffStr = col.docsDiff >= 0 ? `+${col.docsDiff}` : col.docsDiff.toString();
      console.log(`   ${col.name.padEnd(25)} ${col.backupCount.toLocaleString().padStart(12)} ${col.targetCount.toLocaleString().padStart(12)} ${diffStr.padStart(10)} ${col.percentComplete.toFixed(1).padStart(7)}% ${formatBytes(col.targetSize).padStart(12)}`);
    });
    console.log();
  }
  
  // Collections incomplètes
  if (results.incomplete.length > 0) {
    console.log(`⚠️  COLLECTIONS INCOMPLÈTES (${results.incomplete.length}) - < 95%:`);
    console.log(`   ${'-'.repeat(88)}`);
    console.log(`   ${'Collection'.padEnd(25)} ${'Backup'.padStart(12)} ${'Cible'.padStart(12)} ${'Manquant'.padStart(12)} ${'%'.padStart(8)} ${'Taille'.padStart(12)}`);
    console.log(`   ${'-'.repeat(88)}`);
    
    results.incomplete.forEach(col => {
      const missing = col.backupCount - col.targetCount;
      console.log(`   ${col.name.padEnd(25)} ${col.backupCount.toLocaleString().padStart(12)} ${col.targetCount.toLocaleString().padStart(12)} ${missing.toLocaleString().padStart(12)} ${col.percentComplete.toFixed(1).padStart(7)}% ${formatBytes(col.targetSize).padStart(12)}`);
    });
    console.log();
  }
  
  // Collections manquantes
  if (results.missing.length > 0) {
    console.log(`❌ COLLECTIONS MANQUANTES (${results.missing.length}):`);
    console.log(`   ${'-'.repeat(60)}`);
    console.log(`   ${'Collection'.padEnd(35)} ${'Documents backup'.padStart(20)}`);
    console.log(`   ${'-'.repeat(60)}`);
    
    results.missing.forEach(col => {
      console.log(`   ${col.name.padEnd(35)} ${col.backupCount.toLocaleString().padStart(20)}`);
    });
    console.log();
  }
  
  // Collections en surplus
  if (results.extra.length > 0) {
    console.log(`ℹ️  COLLECTIONS EN SURPLUS (${results.extra.length}) - Dans cible mais pas dans backup:`);
    console.log(`   ${'-'.repeat(60)}`);
    console.log(`   ${'Collection'.padEnd(35)} ${'Documents cible'.padStart(20)}`);
    console.log(`   ${'-'.repeat(60)}`);
    
    results.extra.forEach(col => {
      console.log(`   ${col.name.padEnd(35)} ${col.count.toLocaleString().padStart(20)}`);
    });
    console.log();
  }
  
  // Verdict final
  console.log(`${'═'.repeat(80)}`);
  
  const allPerfect = results.missing.length === 0 && 
                     results.incomplete.length === 0 && 
                     results.complete.length === 0;
  
  const allComplete = results.missing.length === 0 && results.incomplete.length === 0;
  
  if (allPerfect) {
    console.log(`\n🎉 VERDICT: PARFAIT !`);
    console.log(`   Toutes les collections sont parfaitement restaurées (100% des documents).`);
  } else if (allComplete) {
    console.log(`\n✅ VERDICT: COMPLET`);
    console.log(`   Toutes les collections sont présentes avec >= 95% des documents.`);
    if (results.complete.length > 0) {
      console.log(`   ⚠️  ${results.complete.length} collection(s) ont de légères différences (voir détails ci-dessus).`);
    }
  } else {
    console.log(`\n⚠️  VERDICT: INCOMPLET`);
    if (results.missing.length > 0) {
      console.log(`   ❌ ${results.missing.length} collection(s) manquante(s)`);
    }
    if (results.incomplete.length > 0) {
      console.log(`   ⚠️  ${results.incomplete.length} collection(s) incomplète(s) (< 95%)`);
    }
    console.log(`\n   💡 Utilisez --resume pour restaurer uniquement les données manquantes.`);
  }
  
  console.log(`${'═'.repeat(80)}\n`);
  
  return {
    allPerfect,
    allComplete,
    totalBackupDocs,
    totalTargetDocs,
    globalCompletionRatio,
    ...results
  };
}

/**
 * Formate un nombre d'octets en format lisible (KB, MB, GB)
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Vérifie que la restauration s'est bien passée en comptant les documents avec mongosh
 */
async function verifyRestore(targetUri, expectedCollections) {
  const dbName = extractDatabaseName(targetUri);
  
  console.log(`\n🔍 Vérification de la restauration...`);
  
  try {
    // Utiliser mongosh pour lister les collections et compter les documents
    const listCollectionsScript = `
      const db = db.getSiblingDB('${dbName}');
      const collections = db.getCollectionNames();
      print(JSON.stringify(collections));
    `;
    
    const collectionsOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${listCollectionsScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });
    
    let actualCollectionNames = [];
    try {
      actualCollectionNames = JSON.parse(collectionsOutput.trim()).sort();
    } catch (error) {
      // Si le parsing échoue, essayer de parser ligne par ligne
      actualCollectionNames = collectionsOutput.trim().split('\n')
        .filter(line => line.trim() && !line.startsWith('MongoDB'))
        .map(line => line.trim().replace(/[\[\]"]/g, ''))
        .filter(name => name && !name.includes('connecting'));
    }
    
    console.log(`\n📊 Collections trouvées dans la base: ${actualCollectionNames.length}`);
    
    let totalDocs = 0;
    let verifiedCount = 0;
    const collectionCounts = [];
    
    for (const collectionName of actualCollectionNames) {
      try {
        const countScript = `db.getSiblingDB('${dbName}').getCollection('${collectionName}').countDocuments({})`;
        const countOutput = execSync(`mongosh "${targetUri}" --quiet --eval "${countScript}"`, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024
        });
        
        const count = parseInt(countOutput.trim().split('\n').find(line => /^\d+$/.test(line.trim())) || '0');
        totalDocs += count;
        collectionCounts.push({ name: collectionName, count });
        
        if (count > 0) {
          console.log(`   ✅ ${collectionName}: ${count.toLocaleString()} documents`);
          verifiedCount++;
        } else {
          console.log(`   ⚪ ${collectionName}: 0 document`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${collectionName}: Erreur lors du comptage (${error.message})`);
      }
    }
    
    console.log(`\n📈 Total: ${totalDocs.toLocaleString()} documents dans ${verifiedCount} collection(s) non vide(s)`);
    
    if (expectedCollections && actualCollectionNames.length < expectedCollections) {
      console.log(`\n⚠️  Attention: ${actualCollectionNames.length} collections trouvées, ${expectedCollections} attendues`);
    }
    
    return { 
      collectionsCount: actualCollectionNames.length, 
      totalDocuments: totalDocs,
      verifiedCollections: verifiedCount,
      collectionCounts
    };
  } catch (error) {
    console.error(`\n⚠️  Erreur lors de la vérification: ${error.message}`);
    console.error(`💡 Assurez-vous que mongosh est installé: brew install mongosh`);
    return { 
      collectionsCount: 0, 
      totalDocuments: 0,
      verifiedCollections: 0,
      error: error.message
    };
  }
}

/**
 * Fonction principale
 * 
 * À QUOI ELLE SERT :
 * Point d'entrée du script, orchestre toute la logique de restauration
 * selon le mode choisi (normal ou reprise).
 * 
 * CE QU'ELLE FAIT :
 * 1. Valide les paramètres et le backup
 * 2. En mode normal : Restaure toutes les collections avec mongorestore
 * 3. En mode --resume : Analyse les collections déjà restaurées et ne restaure que les manquantes
 * 4. Demande confirmation si nécessaire
 * 5. Lance la restauration appropriée
 * 6. Vérifie le résultat final
 * 
 * APPELÉE DEPUIS :
 * - Fin du script (main())
 * 
 * DÉPENDANCES :
 * - validateBackup()
 * - getCollectionsToRestore() (mode resume)
 * - restoreCollections() (mode resume)
 * - restoreBackup() (mode normal)
 * - verifyRestore()
 */
async function main() {
  try {
    const dbName = extractDatabaseName(MONGODB_URI_DEV);
    
    console.log('📥 Restauration d\'un backup de production vers la base de développement');
    console.log(`📁 Backup: ${backupPath}`);
    console.log(`🔗 Base de données cible: ${dbName}`);
    console.log(`🔗 URI: ${MONGODB_URI_DEV.replace(/:[^:@]+@/, ':****@')}`); // Masquer le mot de passe
    
    if (resume) {
      console.log(`🔄 Mode REPRISE activé`);
    }
    
    if (verifyOnly) {
      console.log(`🔍 Mode VÉRIFICATION SEULE activé`);
    }
    
    // Valider le backup
    console.log('\n🔍 Vérification du backup...');
    const { dbDir, dbPath, collections } = validateBackup(backupPath);
    console.log(`✅ Backup valide: ${collections} collection(s) trouvée(s) dans ${dbDir}`);
    
    // Mode vérification seule
    if (verifyOnly) {
      console.log(`\n🔍 Lancement de la vérification détaillée...`);
      const verificationResult = await verifyBackupIntegrity(backupPath, MONGODB_URI_DEV);
      
      // Exit avec code approprié
      if (verificationResult.allPerfect) {
        process.exit(0);
      } else if (verificationResult.allComplete) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    }
    
    let collectionsToRestore = [];
    let collectionsAlreadyDone = [];
    
    // En mode reprise, analyser les collections déjà restaurées
    if (resume) {
      const analysis = await getCollectionsToRestore(backupPath, MONGODB_URI_DEV);
      collectionsToRestore = analysis.toRestore;
      collectionsAlreadyDone = analysis.alreadyDone;
      
      console.log(`\n📊 Résumé de l'analyse:`);
      console.log(`   ✅ ${collectionsAlreadyDone.length} collection(s) déjà complète(s)`);
      console.log(`   🔄 ${collectionsToRestore.length} collection(s) à restaurer`);
      
      if (collectionsToRestore.length === 0) {
        console.log(`\n🎉 Toutes les collections sont déjà complètement restaurées !`);
        console.log(`💡 Aucune action nécessaire.`);
        
        // Proposer de lancer une vérification détaillée
        if (!force) {
          const wantVerify = await askConfirmation('\nVoulez-vous lancer une vérification détaillée ? (oui/non): ');
          if (wantVerify) {
            console.log(`\n🔍 Lancement de la vérification détaillée...`);
            await verifyBackupIntegrity(backupPath, MONGODB_URI_DEV);
          }
        }
        
        process.exit(0);
      }
      
      console.log(`\n📋 Collections à restaurer:`);
      collectionsToRestore.forEach(col => {
        const statusDetail = col.targetCount === 0 
          ? 'manquante' 
          : `${col.targetCount.toLocaleString()} docs présents`;
        console.log(`   - ${col.name}: ${statusDetail} / ${col.backupCount.toLocaleString()} attendus`);
      });
    }
    
    // Demander confirmation si pas en mode force
    if (!force) {
      const countToRestore = resume ? collectionsToRestore.length : collections;
      console.log(`\n⚠️  ATTENTION: Vous allez restaurer ${countToRestore} collection(s) dans la base de développement !`);
      
      if (resume && collectionsAlreadyDone.length > 0) {
        console.log(`   ${collectionsAlreadyDone.length} collection(s) seront ignorées car déjà complètes.`);
      }
      
      if (drop) {
        console.log(`⚠️  Les collections existantes seront supprimées avant restauration !`);
      }
      
      const confirmed = await askConfirmation('Êtes-vous sûr de vouloir continuer ? (oui/non): ');
      
      if (!confirmed) {
        console.log('\n❌ Opération annulée.');
        process.exit(0);
      }
    }
    
    // Restaurer selon le mode
    let restoreResult;
    
    if (resume) {
      // Mode reprise : restaurer uniquement les collections manquantes
      restoreResult = await restoreCollections(collectionsToRestore, MONGODB_URI_DEV, drop);
      
      console.log(`\n📊 Résumé de la restauration en mode reprise:`);
      console.log(`   ✅ ${restoreResult.success.length} collection(s) restaurée(s) avec succès`);
      if (restoreResult.failed.length > 0) {
        console.log(`   ❌ ${restoreResult.failed.length} collection(s) en échec`);
        restoreResult.failed.forEach(fail => {
          console.log(`      - ${fail.name}: ${fail.error}`);
        });
      }
      console.log(`   📈 Total: ${restoreResult.totalDocuments.toLocaleString()} documents restaurés`);
    } else {
      // Mode normal : restaurer toutes les collections
      restoreResult = await restoreBackup(backupPath, MONGODB_URI_DEV, drop);
    }
    
    // Vérifier la restauration
    const verification = await verifyRestore(MONGODB_URI_DEV, collections);
    
    console.log(`\n🎉 Restauration terminée !`);
    console.log(`💡 La base de données ${dbName} contient maintenant les données du backup.`);
    console.log(`📊 ${verification.collectionsCount} collection(s) au total, ${verification.totalDocuments.toLocaleString()} document(s)`);
    
    if (resume && collectionsAlreadyDone.length > 0) {
      console.log(`\n💾 Collections qui étaient déjà complètes:`);
      collectionsAlreadyDone.forEach(col => {
        console.log(`   ✅ ${col.name}: ${col.targetCount.toLocaleString()} documents`);
      });
    }
    
    // Proposer une vérification détaillée après restauration
    if (!verifyOnly && !force) {
      const wantVerify = await askConfirmation('\n🔍 Voulez-vous lancer une vérification détaillée de l\'intégrité ? (oui/non): ');
      if (wantVerify) {
        console.log(`\n🔍 Lancement de la vérification détaillée...`);
        await verifyBackupIntegrity(backupPath, MONGODB_URI_DEV);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    
    if (error.message.includes('mongorestore n\'est pas installé')) {
      console.error('\n💡 Pour installer mongorestore:');
      console.error('   macOS: brew install mongodb-database-tools');
      console.error('   Ou téléchargez depuis: https://www.mongodb.com/try/download/database-tools');
    }
    
    if (error.message.includes('bsondump')) {
      console.error('\n💡 bsondump est requis pour le mode --resume');
      console.error('   Il fait partie de MongoDB Database Tools');
    }
    
    process.exit(1);
  }
}

// Exécuter le script
main();

