#!/usr/bin/env node

/**
 * OBJECTIF : Script de vérification d'intégrité d'un backup MongoDB
 * 
 * POURQUOI : Permet de vérifier qu'un backup contient bien toutes les données
 * attendues en comparant le nombre de documents dans le backup avec ceux
 * présents dans la base de données source.
 * 
 * COMMENT :
 * 1. Lit les métadonnées (.metadata.json) de chaque collection du backup
 * 2. Se connecte à la base de données MongoDB source
 * 3. Compare le nombre de documents pour chaque collection
 * 4. Affiche un rapport détaillé avec tailles et écarts éventuels
 * 
 * Appelé depuis : Ligne de commande manuelle après un backup
 * Dépendances : mongodb driver npm package, accès à la base de données source
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = 'mongodb+srv://cylimit2:rundeal974@cylimit.en0by.mongodb.net/cylimit?authSource=admin&replicaSet=atlas-v3fgec-shard-0&readPreference=primary&ssl=true';
const BACKUP_DIR = process.argv[2] || '/Users/valentin_cylimit/Documents/CyLimit/Code/cylimit-infrastructure/backups/cylimit-backup-2025-11-24T01-55-19';

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
 * Analyse le backup et extrait les métadonnées
 */
function analyzeBackup(backupDir, dbName) {
  const dbBackupPath = path.join(backupDir, dbName);
  
  if (!fs.existsSync(dbBackupPath)) {
    throw new Error(`Répertoire de backup introuvable: ${dbBackupPath}`);
  }
  
  const collections = [];
  const files = fs.readdirSync(dbBackupPath);
  
  // Parcourir tous les fichiers .bson
  files.forEach(file => {
    if (file.endsWith('.bson')) {
      const collectionName = file.replace('.bson', '');
      const bsonPath = path.join(dbBackupPath, file);
      const metadataPath = path.join(dbBackupPath, `${collectionName}.metadata.json`);
      
      // Récupérer la taille du fichier BSON
      const bsonStats = fs.statSync(bsonPath);
      const sizeMB = (bsonStats.size / (1024 * 1024)).toFixed(2);
      
      // Lire les métadonnées si disponibles
      let metadata = null;
      let documentCount = null;
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } catch (error) {
          console.warn(`⚠️  Impossible de lire les métadonnées pour ${collectionName}`);
        }
      }
      
      collections.push({
        name: collectionName,
        sizeMB: parseFloat(sizeMB),
        sizeBytes: bsonStats.size,
        metadata,
        bsonPath
      });
    }
  });
  
  return collections.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

/**
 * Compte les documents dans les fichiers BSON du backup
 * En utilisant bsondump si disponible, sinon estimation
 */
async function countDocumentsInBson(bsonPath) {
  const { execSync } = require('child_process');
  
  try {
    // Essayer avec bsondump si disponible
    const output = execSync(`bsondump "${bsonPath}" 2>&1 | grep -i "exported" || echo "0"`, {
      encoding: 'utf8',
      timeout: 30000
    });
    
    const match = output.match(/(\d+)\s+document/i);
    if (match) {
      return parseInt(match[1]);
    }
  } catch (error) {
    // bsondump non disponible, on va compter manuellement
  }
  
  // Fallback: estimation basée sur la taille (approximatif)
  // Un document BSON moyen fait environ 200-500 bytes
  // On va lire le fichier et compter les documents
  try {
    const buffer = fs.readFileSync(bsonPath);
    let count = 0;
    let pos = 0;
    
    while (pos < buffer.length) {
      if (pos + 4 > buffer.length) break;
      
      // Lire la taille du document BSON (4 premiers bytes en little-endian)
      const docSize = buffer.readInt32LE(pos);
      
      // Validation basique
      if (docSize <= 0 || docSize > 16 * 1024 * 1024) { // Max 16MB par document
        break;
      }
      
      count++;
      pos += docSize;
    }
    
    return count;
  } catch (error) {
    return null; // Impossible de compter
  }
}

/**
 * Récupère les stats des collections de la base de données MongoDB
 */
async function getMongoDBStats(uri, dbName) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connexion à MongoDB établie\n');
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    const stats = [];
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const collection = db.collection(collName);
      
      try {
        const count = await collection.countDocuments();
        const collStats = await db.command({ collStats: collName });
        
        stats.push({
          name: collName,
          count,
          size: collStats.size,
          storageSize: collStats.storageSize,
          avgObjSize: collStats.avgObjSize || 0
        });
      } catch (error) {
        console.warn(`⚠️  Impossible de récupérer les stats pour ${collName}: ${error.message}`);
        stats.push({
          name: collName,
          count: 0,
          size: 0,
          storageSize: 0,
          avgObjSize: 0,
          error: error.message
        });
      }
    }
    
    return stats;
  } finally {
    await client.close();
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('🔍 Vérification du backup MongoDB\n');
    console.log(`📁 Backup: ${BACKUP_DIR}`);
    console.log(`🔗 MongoDB: ${MONGODB_URI.replace(/:[^:@]+@/, ':***@')}\n`);
    
    const dbName = extractDatabaseName(MONGODB_URI);
    
    // Analyser le backup
    console.log('📦 Analyse du backup...');
    const backupCollections = analyzeBackup(BACKUP_DIR, dbName);
    console.log(`✅ ${backupCollections.length} collections trouvées dans le backup\n`);
    
    // Compter les documents dans le backup
    console.log('📊 Comptage des documents dans le backup...');
    for (const coll of backupCollections) {
      const count = await countDocumentsInBson(coll.bsonPath);
      coll.backupCount = count;
      if (count !== null) {
        console.log(`   ✓ ${coll.name}: ${count.toLocaleString()} documents`);
      } else {
        console.log(`   ⚠️  ${coll.name}: impossible de compter`);
      }
    }
    
    // Récupérer les stats MongoDB
    console.log('\n🔗 Récupération des stats de la base de données...');
    const mongoStats = await getMongoDBStats(MONGODB_URI, dbName);
    
    // Créer un map pour lookup rapide
    const mongoStatsMap = new Map();
    mongoStats.forEach(stat => mongoStatsMap.set(stat.name, stat));
    
    // Comparer et afficher le rapport
    console.log('\n' + '='.repeat(120));
    console.log('📊 RAPPORT DE VÉRIFICATION DU BACKUP');
    console.log('='.repeat(120));
    console.log();
    
    // En-têtes du tableau
    console.log(
      'Collection'.padEnd(35) +
      'Backup (docs)'.padStart(20) +
      'MongoDB (docs)'.padStart(20) +
      'Écart'.padStart(15) +
      'Taille Backup'.padStart(18) +
      'Taille MongoDB'.padStart(18)
    );
    console.log('─'.repeat(120));
    
    let totalBackupDocs = 0;
    let totalMongoDocs = 0;
    let totalBackupSize = 0;
    let totalMongoSize = 0;
    let mismatches = [];
    let missing = [];
    
    for (const backupColl of backupCollections) {
      const mongoStat = mongoStatsMap.get(backupColl.name);
      const backupCount = backupColl.backupCount || 0;
      const mongoCount = mongoStat ? mongoStat.count : 0;
      const diff = backupCount - mongoCount;
      const diffPercent = mongoCount > 0 ? ((diff / mongoCount) * 100) : 0;
      
      totalBackupDocs += backupCount;
      totalMongoDocs += mongoCount;
      totalBackupSize += backupColl.sizeBytes;
      totalMongoSize += mongoStat ? mongoStat.size : 0;
      
      // Indicateur de status
      let status = '✅';
      if (!mongoStat) {
        status = '❓';
        missing.push(backupColl.name);
      } else if (Math.abs(diff) > 0) {
        status = '⚠️ ';
        mismatches.push({
          name: backupColl.name,
          backupCount,
          mongoCount,
          diff,
          diffPercent
        });
      }
      
      const backupCountStr = backupCount > 0 ? backupCount.toLocaleString() : '-';
      const mongoCountStr = mongoCount > 0 ? mongoCount.toLocaleString() : '-';
      const diffStr = diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toLocaleString()}` : '0';
      const backupSizeStr = `${backupColl.sizeMB} MB`;
      const mongoSizeStr = mongoStat ? `${(mongoStat.size / (1024 * 1024)).toFixed(2)} MB` : '-';
      
      console.log(
        `${status} ${backupColl.name}`.padEnd(35) +
        backupCountStr.padStart(20) +
        mongoCountStr.padStart(20) +
        diffStr.padStart(15) +
        backupSizeStr.padStart(18) +
        mongoSizeStr.padStart(18)
      );
    }
    
    // Vérifier les collections dans MongoDB mais pas dans le backup
    const backupCollNames = new Set(backupCollections.map(c => c.name));
    const missingInBackup = mongoStats.filter(stat => !backupCollNames.has(stat.name));
    
    if (missingInBackup.length > 0) {
      console.log('\n⚠️  Collections présentes dans MongoDB mais absentes du backup:');
      missingInBackup.forEach(stat => {
        console.log(`   - ${stat.name}: ${stat.count.toLocaleString()} documents`);
      });
    }
    
    // Totaux
    console.log('─'.repeat(120));
    console.log(
      'TOTAL'.padEnd(35) +
      totalBackupDocs.toLocaleString().padStart(20) +
      totalMongoDocs.toLocaleString().padStart(20) +
      (totalBackupDocs - totalMongoDocs).toLocaleString().padStart(15) +
      `${(totalBackupSize / (1024 * 1024)).toFixed(2)} MB`.padStart(18) +
      `${(totalMongoSize / (1024 * 1024)).toFixed(2)} MB`.padStart(18)
    );
    console.log('='.repeat(120));
    
    // Résumé
    console.log('\n📋 RÉSUMÉ:');
    console.log(`   Collections dans le backup: ${backupCollections.length}`);
    console.log(`   Collections dans MongoDB: ${mongoStats.length}`);
    console.log(`   Documents dans le backup: ${totalBackupDocs.toLocaleString()}`);
    console.log(`   Documents dans MongoDB: ${totalMongoDocs.toLocaleString()}`);
    console.log(`   Taille du backup: ${(totalBackupSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`   Taille MongoDB: ${(totalMongoSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    
    if (mismatches.length > 0) {
      console.log(`\n⚠️  ATTENTION: ${mismatches.length} collection(s) avec des écarts:`);
      mismatches.forEach(m => {
        console.log(`   - ${m.name}: ${m.diff > 0 ? '+' : ''}${m.diff.toLocaleString()} documents (${m.diffPercent.toFixed(2)}%)`);
      });
    }
    
    if (missing.length > 0) {
      console.log(`\n❓ ${missing.length} collection(s) dans le backup mais pas dans MongoDB (collections supprimées?)`);
    }
    
    if (missingInBackup.length > 0) {
      console.log(`\n❌ ${missingInBackup.length} collection(s) dans MongoDB mais absentes du backup!`);
    }
    
    if (mismatches.length === 0 && missingInBackup.length === 0) {
      console.log('\n✅ Le backup est complet et cohérent avec la base de données!');
    } else {
      console.log('\n⚠️  Des incohérences ont été détectées. Vérifiez les détails ci-dessus.');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Vérifier si mongodb est installé
try {
  require.resolve('mongodb');
} catch (error) {
  console.error('❌ Le package "mongodb" n\'est pas installé.');
  console.error('   Installez-le avec: npm install mongodb');
  process.exit(1);
}

// Exécuter le script
main();

