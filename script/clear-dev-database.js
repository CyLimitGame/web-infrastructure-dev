#!/usr/bin/env node

/**
 * OBJECTIF : Script pour supprimer toutes les données de la base de données de développement
 * 
 * POURQUOI : Permet de nettoyer complètement la base de développement avant de réimporter
 * des données de production ou de staging. Utile pour les tests et les réinitialisations.
 * 
 * COMMENT :
 * 1. Se connecte à la base de développement MongoDB
 * 2. Liste toutes les collections existantes
 * 3. Demande confirmation avant suppression (sauf avec --force)
 * 4. Supprime toutes les collections une par une avec logs
 * 5. Affiche un résumé des collections supprimées
 * 
 * Appelé depuis : Ligne de commande manuelle
 * Dépendances : mongosh ou mongo (MongoDB Shell) doit être installé sur le système
 */

const { execSync, spawn } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// URI MongoDB de développement
const MONGODB_URI_DEV = 'mongodb://root:mpIxBYXzXioPf52hnP1AYgGSDbjP4cBR2Bs@52.221.20.173:27778/cylimit?authSource=admin&readPreference=primary&directConnection=true&ssl=false';

// Options de ligne de commande
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const help = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run') || args.includes('-d');

if (help) {
  console.log(`
🗑️  Script de Nettoyage Base de Développement MongoDB - CyLimit

Usage:
  node scripts/clear-dev-database.js [options]

Options:
  --force, -f          Supprime sans demander confirmation
  --dry-run, -d        Affiche ce qui serait supprimé sans le faire
  --help, -h           Affiche cette aide

Exemples:
  node scripts/clear-dev-database.js
  node scripts/clear-dev-database.js --force
  node scripts/clear-dev-database.js --dry-run

⚠️  ATTENTION: Ce script supprime TOUTES les données de la base de développement !
   Assurez-vous d'avoir fait un backup si nécessaire.
  `);
  process.exit(0);
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
    return 'cylimit_dev';
  } catch (error) {
    return 'cylimit_dev';
  }
}

/**
 * Obtient la liste des collections de la base de données
 */
async function getCollections(uri) {
  return new Promise((resolve, reject) => {
    const dbName = extractDatabaseName(uri);
    // Utiliser mongosh pour lister les collections
    const command = `mongosh "${uri}" --quiet --eval "db.getCollectionNames().join('\\n')"`;
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });
      
      const collections = output.trim().split('\n')
        .filter(name => name.length > 0 && !name.includes('MongoServerError') && !name.includes('Error'));
      
      resolve(collections);
    } catch (error) {
      // Essayer avec mongo (ancienne version)
      try {
        const commandOld = `mongo "${uri}" --quiet --eval "db.getCollectionNames().join('\\n')"`;
        const output = execSync(commandOld, { 
          encoding: 'utf8',
          timeout: 10000,
          maxBuffer: 1024 * 1024
        });
        
        const collections = output.trim().split('\n')
          .filter(name => name.length > 0 && !name.includes('MongoServerError') && !name.includes('Error'));
        
        resolve(collections);
      } catch (error2) {
        reject(new Error(`Impossible de lister les collections: ${error.message}`));
      }
    }
  });
}

/**
 * Supprime une collection
 */
async function dropCollection(uri, collectionName) {
  return new Promise((resolve, reject) => {
    const dbName = extractDatabaseName(uri);
    const command = `mongosh "${uri}" --quiet --eval "db.${collectionName}.drop()"`;
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1024 * 1024
      });
      
      // Vérifier si la suppression a réussi
      if (output.includes('true') || output.includes('1')) {
        resolve(true);
      } else if (output.includes('false') || output.includes('0')) {
        resolve(false);
      } else {
        // Si pas de réponse claire, considérer comme succès si pas d'erreur
        resolve(true);
      }
    } catch (error) {
      // Essayer avec mongo (ancienne version)
      try {
        const commandOld = `mongo "${uri}" --quiet --eval "db.${collectionName}.drop()"`;
        execSync(commandOld, { 
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 1024 * 1024
        });
        resolve(true);
      } catch (error2) {
        reject(new Error(`Erreur lors de la suppression de ${collectionName}: ${error.message}`));
      }
    }
  });
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
 * Fonction principale
 */
async function main() {
  try {
    const dbName = extractDatabaseName(MONGODB_URI_DEV);
    
    console.log('🗑️  Nettoyage de la base de données de développement');
    console.log(`📁 Base de données: ${dbName}`);
    console.log(`🔗 URI: ${MONGODB_URI_DEV.replace(/:[^:@]+@/, ':****@')}`); // Masquer le mot de passe
    
    if (dryRun) {
      console.log('\n🔍 Mode DRY-RUN: Aucune suppression ne sera effectuée\n');
    }
    
    // Obtenir la liste des collections
    console.log('\n📋 Récupération de la liste des collections...');
    const collections = await getCollections(MONGODB_URI_DEV);
    
    if (collections.length === 0) {
      console.log('✅ La base de données est déjà vide.');
      process.exit(0);
    }
    
    console.log(`\n📊 ${collections.length} collection(s) trouvée(s):`);
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection}`);
    });
    
    // Demander confirmation si pas en mode force
    if (!force && !dryRun) {
      console.log(`\n⚠️  ATTENTION: Vous allez supprimer ${collections.length} collection(s) !`);
      const confirmed = await askConfirmation('Êtes-vous sûr de vouloir continuer ? (oui/non): ');
      
      if (!confirmed) {
        console.log('\n❌ Opération annulée.');
        process.exit(0);
      }
    }
    
    if (dryRun) {
      console.log(`\n✅ Mode DRY-RUN: ${collections.length} collection(s) seraient supprimées`);
      process.exit(0);
    }
    
    // Supprimer les collections
    console.log('\n🗑️  Suppression des collections...\n');
    
    const deleted = [];
    const failed = [];
    
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      try {
        console.log(`   [${i + 1}/${collections.length}] Suppression de ${collection}...`);
        const success = await dropCollection(MONGODB_URI_DEV, collection);
        
        if (success) {
          console.log(`   ✅ ${collection}: supprimée`);
          deleted.push(collection);
        } else {
          console.log(`   ⚠️  ${collection}: peut-être déjà supprimée`);
          deleted.push(collection);
        }
      } catch (error) {
        console.error(`   ❌ ${collection}: ${error.message}`);
        failed.push({ collection, error: error.message });
      }
    }
    
    // Résumé
    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Supprimées: ${deleted.length}`);
    console.log(`   ❌ Échouées: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log(`\n⚠️  Collections en échec:`);
      failed.forEach(({ collection, error }) => {
        console.log(`   - ${collection}: ${error}`);
      });
      process.exit(1);
    }
    
    // Vérifier que la base est vide
    console.log('\n🔍 Vérification finale...');
    const remainingCollections = await getCollections(MONGODB_URI_DEV);
    
    if (remainingCollections.length === 0) {
      console.log('✅ Base de données complètement vidée !');
    } else {
      console.log(`⚠️  ${remainingCollections.length} collection(s) restante(s):`);
      remainingCollections.forEach(collection => {
        console.log(`   - ${collection}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
main();

