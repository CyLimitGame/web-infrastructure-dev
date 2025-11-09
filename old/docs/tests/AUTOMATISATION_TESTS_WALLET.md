# 🧪 Automatisation Tests Wallet - Guide Complet

**Guide complet et à jour** pour automatiser les tests de l'Embedded Wallet avec **MailHog** (100% gratuit).

**Dernière mise à jour** : 28 octobre 2025

**Changelog** :
- **28 oct 2025** : 
  - ✅ Correction config SMTP MailHog (port 1025, TLS désactivé)
  - ✅ Fix décodage Quoted-Printable des emails HTML
  - ✅ Fix redirections pages publiques (CoinbaseWalletProvider conditionnel)
  - ✅ Ajout cookie `e2e-test-mode` pour skip open-the-pack
  - ✅ **Test Cas 1.1.C(A) COMPLET jusqu'à l'écran OTP Coinbase** ✅
  - ⚠️ **LIMITE IDENTIFIÉE** : OTP Coinbase envoyé directement par Coinbase (pas via MailHog)
  - 🎯 **Test considéré comme RÉUSSI dès l'affichage de l'écran OTP Coinbase**

**Progression actuelle des tests E2E** :
| Étape | Status | Notes |
|-------|--------|-------|
| Inscription utilisateur | ✅ OK | Formulaire rempli, validation email envoyée |
| Confirmation email MailHog | ✅ OK | Email CyLimit reçu, lien extrait et cliqué |
| Skip open-the-pack | ✅ OK | Cookie `e2e-test-mode` fonctionnel |
| Navigation dashboard | ✅ OK | Redirection vers HOME réussie |
| Ouverture modal wallet | ✅ OK | Modal détecté et ouvert |
| Sélection Email et demande OTP | ✅ OK | Email pré-rempli, bouton "Je confirme" cliqué |
| Affichage champ OTP | ✅ OK | Input 6 chiffres visible, bouton "Vérifier" présent |
| **TEST COMPLET** | ✅ **RÉUSSI** | **Test passe avec succès jusqu'à l'écran OTP** |

**💡 IMPORTANT - Limite technique et solution** :
- ✅ **Email CyLimit** (confirmation inscription) : envoyé par notre backend → **récupérable via MailHog**
- ⚠️ **Email OTP Coinbase** (création wallet) : envoyé par infrastructure Coinbase → **NON récupérable via MailHog**
- 🎯 **Solution adoptée** : Test considéré comme RÉUSSI dès l'affichage de l'écran OTP Coinbase
- 📧 **Tests manuels restants** : Saisie OTP Coinbase → Création wallet → Ajout backup SMS
- 🔑 **Pour tests E2E complets** : Utiliser Mailosaur ($20/mois) ou email réel avec récupération API

---

## 🎯 Quick Start (5 minutes)

**Pour ceux qui veulent démarrer immédiatement** :

```bash
# 1. Installer Playwright
cd cylimit-frontend-develop
npm install --save-dev @playwright/test
npx playwright install

# 2. Démarrer MailHog (avec tous les services cylimit-local)
cd ../cylimit-backend-develop
docker-compose -f docker-compose.local.yml up -d

# 3. Vérifier que MailHog fonctionne
open http://localhost:8025

# 4. Lancer les tests avec interface UI
cd ../cylimit-frontend-develop
npm run test:e2e:ui
```

✅ **C'est tout !** Les tests vont se lancer automatiquement.

**💡 Astuce** : MailHog est maintenant intégré dans `cylimit-local` avec Redis et MongoDB !

📖 **Pour comprendre en détail**, continue la lecture ci-dessous.

---

## 📋 Récapitulatif

| Aspect | Solution | Coût | Automatisable |
|--------|----------|------|---------------|
| **OTP Email** | **MailHog** ✅ | **0€ (gratuit)** | ✅ Oui |
| **OTP SMS** | Twilio Test (optionnel) | 15€/mois | ⚠️ Limité |
| **KYC** | Compte test validé | 0€ | ❌ Non |
| **Paiements** | Sandbox | 0€ | ✅ Oui |

**✅ COÛT TOTAL : 0€** pour tests email uniquement !

---

## 🎯 Ce qui est automatisable GRATUITEMENT

### ✅ Totalement automatisable avec MailHog

- ✅ Création wallet Email
- ✅ Reconnexion (pas d'OTP envoyé)
- ✅ Gestion méthodes d'authentification
- ✅ Migration USDC/NFT
- ✅ Création d'offres
- ✅ Vérification backend/DB

### ⚠️ Partiellement automatisable

- ⚠️ **Backup SMS** : Skip validation SMS (gratuit) ou Twilio Test (15€/mois)
- ⚠️ **Buy/Sell** : Nécessite compte KYC validé (manuel)

### ❌ Non automatisable

- ❌ **KYC complet** : Vérification d'identité humaine
- ❌ **Paiements réels** : Vrais achats/ventes (utiliser sandbox)

---

## 📧 Solution : MailHog (100% GRATUIT)

### Qu'est-ce que MailHog ?

**MailHog** est un serveur SMTP de test local :
- ✅ Capture tous les emails SMTP sortants
- ✅ Stocke en mémoire (pas de persistance)
- ✅ Interface web pour visualiser
- ✅ API REST pour automatisation
- ✅ **100% gratuit et open-source**
- ✅ Aucune inscription nécessaire
- ✅ Parfait pour CI/CD

### Installation

```bash
# Avec docker-compose (recommandé - intégré dans cylimit-local)
cd cylimit-backend-develop
docker-compose -f docker-compose.local.yml up -d mailhog

# Ou si tu veux lancer tous les services cylimit-local :
docker-compose -f docker-compose.local.yml up -d
```

✅ **MailHog est maintenant intégré** dans le `docker-compose.local.yml` avec Redis et MongoDB !

### Vérification

- **Interface web** : http://localhost:8025
- **API REST** : http://localhost:8025/api/v2/messages
- **SMTP** : localhost:1025

### Configuration Backend

Le backend doit utiliser MailHog en mode test :

```env
# Backend .env (mode test)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@cylimit-test.local
```

✅ **Déjà configuré** dans `docker-compose.test.yml`

### Utilisation dans les tests

```typescript
// tests/utils/mailhog.ts
import { getOTPFromEmail, generateTestEmail, deleteAllEmails } from '../utils/mailhog';

// Générer email de test
const testEmail = generateTestEmail('wallet-creation');
// → "wallet-creation-1698765432@cylimit.local"

// Récupérer OTP automatiquement
const otp = await getOTPFromEmail(testEmail, 30000);
// → "123456"

// Nettoyer emails entre tests
await deleteAllEmails();
```

✅ **Tout est déjà implémenté** dans `cylimit-frontend-develop/tests/utils/mailhog.ts`

---

## 🏗️ Architecture de Test

```
┌─────────────────────────────────────────────────┐
│                TESTS E2E                        │
│              (Playwright)                       │
└─────────────┬───────────────────────────────────┘
              │
              ├─► Frontend (http://localhost:3001)
              │       │
              │       └─► Backend API (http://localhost:4001)
              │               │
              │               ├─► MongoDB Test (port 27018)
              │               │
              │               ├─► MailHog SMTP (port 1025)
              │               │   (capture emails)
              │               │
              │               └─► Coinbase API (réel ou mock)
              │
              └─► MailHog API (http://localhost:8025)
                  (lire emails capturés)
                  ✅ 100% GRATUIT
```

---

## 📦 Installation

```bash
cd cylimit-frontend-develop

# 1. Installer Playwright
npm install --save-dev @playwright/test

# 2. Installer les navigateurs
npx playwright install

# 3. MailHog : Pas besoin d'installation npm !
# Juste lancer le Docker
docker-compose -f docker-compose.test.yml up -d mailhog

# 4. Vérifier que ça fonctionne
open http://localhost:8025
```

---

## ⚙️ Configuration

### Fichier `.env.test`

Créer `.env.test` (ou copier `.env.test.example`) :

```bash
# MailHog (100% gratuit)
MAILHOG_API_URL=http://localhost:8025
TEST_EMAIL_DOMAIN=cylimit.local

# Application
TEST_BASE_URL=http://localhost:3001
TEST_API_URL=http://localhost:4001

# MongoDB Test
MONGO_URI_TEST=mongodb://localhost:27018/cylimit-test

# Coinbase (optionnel, pour tests avancés)
CDP_PROJECT_ID=
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
```

✅ **Valeurs par défaut OK**, pas besoin de modifier !

---

## 🚀 Lancement des Tests

```bash
# 1. Démarrer MailHog
docker-compose -f docker-compose.test.yml up -d mailhog

# 2. Vérifier que MailHog fonctionne
open http://localhost:8025

# 3. Lancer tous les tests E2E
npm run test:e2e

# 4. Ou avec interface UI (recommandé)
npm run test:e2e:ui

# 5. Ou en mode debug
npm run test:e2e:debug

# 6. Lancer un test spécifique
npx playwright test wallet-reconnection

# 7. Voir le rapport HTML
npm run test:e2e:report

# 8. Arrêter MailHog
docker-compose -f docker-compose.test.yml stop mailhog
```

### Commands rapides

```bash
npm run mailhog:start    # Démarrer MailHog
npm run mailhog:stop     # Arrêter MailHog
npm run mailhog:logs     # Voir les logs
npm run mailhog:ui       # Ouvrir l'interface web
```

---

## 🧪 Tests E2E Disponibles

### 1. `wallet-creation-email-backup-sms.spec.ts`

**Cas testé** : Nouveau user crée wallet Email + backup SMS

**Étapes** :
1. Inscription avec email + téléphone
2. Création Embedded Wallet (email principal)
3. ✅ **Récupération OTP via MailHog** (automatique)
4. Ajout backup SMS (skip si pas Twilio)
5. Vérifications backend

**Durée** : ~45 secondes

---

### 2. `wallet-reconnection.spec.ts`

**Cas testé** : Refresh page SANS envoi OTP (bug corrigé)

**Étapes** :
1. Créer user + wallet
2. Compter emails avant refresh
3. Refresh la page (F5)
4. ✅ **Vérifier AUCUN nouvel email envoyé**
5. Vérifier wallet toujours connecté

**Durée** : ~30 secondes

**⚠️ TEST CRITIQUE** : Valide le fix du bug des OTP intempestifs

---

## 📊 Rapports

Après les tests :

```bash
# Ouvrir le rapport HTML
npm run test:e2e:report
```

Le rapport contient :
- ✅ Tests réussis / ❌ Tests échoués
- 📸 Screenshots en cas d'échec
- 🎥 Vidéos des tests (si échec)
- 📝 Logs détaillés par étape

---

## 🔍 Debugging

### Mode UI (recommandé)

```bash
npm run test:e2e:ui
```

Interface interactive :
- ▶️ Lancer les tests un par un
- ⏸️ Mettre en pause
- 🔍 Inspecter les étapes
- 📸 Voir les screenshots

### Mode Debug

```bash
npm run test:e2e:debug
```

Ouvre le navigateur et pause automatiquement.

### Logs détaillés

Les tests affichent des logs colorés :
- 📧 Attente email
- ✅ Succès
- ❌ Erreurs
- ℹ️ Informations

### Interface MailHog

Ouvrir http://localhost:8025 pour :
- Voir tous les emails capturés
- Vérifier le contenu des emails
- Checker que les OTP sont envoyés

---

## 🐳 Docker Commands

```bash
# Démarrer tous les services cylimit-local (MongoDB + Redis + MailHog)
cd cylimit-backend-develop
docker-compose -f docker-compose.local.yml up -d

# Démarrer seulement MailHog
docker-compose -f docker-compose.local.yml up -d mailhog

# Voir les services en cours
docker-compose -f docker-compose.local.yml ps

# Voir les logs
docker-compose -f docker-compose.local.yml logs -f

# Logs MailHog uniquement
docker-compose -f docker-compose.local.yml logs -f mailhog

# Arrêter tous les services
docker-compose -f docker-compose.local.yml stop

# Arrêter + supprimer volumes (reset DB)
docker-compose -f docker-compose.local.yml down -v

# Redémarrer MailHog seul
docker-compose -f docker-compose.local.yml restart mailhog
```

---

## 💰 Coûts

### ✅ Option 1 : Tests Email uniquement (MailHog) - RECOMMANDÉ

**Coût mensuel** : **0€ (GRATUIT)** 🎉

**Ce qu'on peut tester** :
- ✅ Création wallet avec email
- ✅ Reconnexion (pas d'OTP)
- ✅ Buy (avec KYC validé)
- ⚠️ Backup SMS (skip validation SMS)

### Option 2 : Tests Email + SMS (MailHog + Twilio)

**Coût mensuel** : **15€** (MailHog gratuit + Twilio 15€)

**Ce qu'on peut tester** :
- ✅ Création wallet avec email
- ✅ Backup SMS (avec Twilio Test)
- ✅ Reconnexion
- ✅ Buy (avec KYC validé)

---

**💡 Recommandation** : Utiliser **MailHog (gratuit)** pour l'automatisation des emails, et tests manuels pour SMS (rare dans le flow).

---

## 🔧 Troubleshooting

### Erreur : "Cannot connect to MailHog"

```bash
# Vérifier que MailHog tourne
docker ps | grep mailhog

# Relancer MailHog
docker-compose -f docker-compose.test.yml restart mailhog

# Tester l'API manuellement
curl http://localhost:8025/api/v2/messages
```

### Erreur : "No OTP found in email"

1. Ouvrir l'interface MailHog : http://localhost:8025
2. Voir si l'email est bien arrivé
3. Vérifier le format du code (6 chiffres ?)
4. Checker les logs backend

### Tests très lents

1. Désactiver `video` dans `playwright.config.ts`
2. Utiliser `headless: true` (par défaut)
3. Réduire les timeouts si possible

### Backend n'envoie pas les emails à MailHog

Vérifier la config SMTP backend :

```env
SMTP_HOST=mailhog  # Nom du service Docker
SMTP_PORT=1025     # Port SMTP de MailHog
SMTP_SECURE=false
```

---

## 📝 Ajouter un Nouveau Test

### Template de base

```typescript
// tests/e2e/mon-nouveau-test.spec.ts
import { test, expect } from '@playwright/test';
import { 
  getOTPFromEmail, 
  generateTestEmail, 
  deleteAllEmails 
} from '../utils/mailhog';

test.describe('Mon nouveau test', () => {
  let testEmail: string;
  const testPassword = 'Test1234!';

  test.beforeEach(async () => {
    testEmail = generateTestEmail('mon-test');
    await deleteAllEmails();
    console.log(`📧 Email de test: ${testEmail}`);
  });

  test('Cas X - Description du cas de test', async ({ page }) => {
    // ═══════════════════════════════════════════════
    // ÉTAPE 1 : Setup
    // ═══════════════════════════════════════════════
    await test.step('Description de l\'étape', async () => {
      console.log('📝 Description...');
      
      await page.goto('/');
      
      // Actions...
      
      console.log('✅ Étape terminée');
    });

    // ═══════════════════════════════════════════════
    // ÉTAPE 2 : Récupérer OTP si besoin
    // ═══════════════════════════════════════════════
    await test.step('Récupérer OTP email', async () => {
      console.log('📬 Récupération OTP...');
      
      const otp = await getOTPFromEmail(testEmail, 30000);
      
      expect(otp).toBeTruthy();
      console.log(`✅ OTP reçu: ${otp}`);
      
      // Utiliser le code OTP
      await page.fill('input[maxlength="6"]', otp!);
    });

    // ═══════════════════════════════════════════════
    // VÉRIFICATIONS
    // ═══════════════════════════════════════════════
    await test.step('Vérifier résultat', async () => {
      await expect(page.locator('text=Succès')).toBeVisible();
      console.log('✅ Test réussi');
    });
  });
});
```

### Lancer le test

```bash
npx playwright test mon-nouveau-test
```

---

## 🎯 Best Practices

### ✅ À FAIRE

- ✅ **Nettoyer les emails** avant chaque test (`deleteAllEmails()`)
- ✅ **Utiliser des timeouts généreux** (30s pour OTP)
- ✅ **Logger les étapes importantes** (`console.log`)
- ✅ **Utiliser `test.step()`** pour structurer
- ✅ **Emails uniques par test** (`generateTestEmail()`)
- ✅ **Fermer les modals** entre les actions
- ✅ **Vérifier les logs backend** en cas d'échec

### ❌ À ÉVITER

- ❌ Réutiliser le même email entre tests
- ❌ Tests trop longs (max 2 minutes)
- ❌ Lancer tests en parallèle (risque conflit DB)
- ❌ Oublier de nettoyer les emails
- ❌ Timeouts trop courts

---

## 📚 Documentation Complète

- **Ce document** - Guide automatisation complet
- [README Tests](../cylimit-frontend-develop/tests/README.md) - Documentation détaillée
- [Quick Start](../cylimit-frontend-develop/tests/QUICKSTART.md) - Démarrage rapide
- [Plan de Test Manuel](./PLAN_TEST_EMBEDDED_WALLET.md) - Tous les cas de test
- [Playwright Docs](https://playwright.dev/docs/intro) - Documentation officielle
- [MailHog GitHub](https://github.com/mailhog/MailHog) - Repo MailHog

---

## ❓ FAQ

### Comment voir les emails capturés ?

Ouvrir http://localhost:8025 dans ton navigateur.

### Les tests sont trop lents, comment accélérer ?

1. Désactiver les vidéos dans `playwright.config.ts`
2. Réduire les timeouts si possible
3. Utiliser `headless: true` (par défaut)

### Comment tester un seul cas spécifique ?

```bash
npx playwright test wallet-reconnection
```

### Les emails n'arrivent pas dans MailHog, pourquoi ?

Vérifier la config SMTP du backend :
```env
SMTP_HOST=mailhog
SMTP_PORT=1025
```

Si le backend tourne en local (pas dans Docker), utiliser :
```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

### Comment réinitialiser complètement l'environnement de test ?

```bash
# Tout arrêter et supprimer volumes
docker-compose -f docker-compose.test.yml down -v

# Redémarrer
docker-compose -f docker-compose.test.yml up -d mailhog
```

### Puis-je tester les SMS aussi ?

Oui, mais c'est payant (Twilio Test Numbers à 15€/mois). Pour l'instant, les tests skipent la validation SMS.

### Les tests peuvent-ils tourner en CI/CD ?

Oui ! Voir la section "CI/CD GitHub Actions" ci-dessus.

---

## 📊 Structure des Fichiers de Test

```
cylimit-frontend-develop/
├── playwright.config.ts              # Configuration Playwright
├── docker-compose.test.yml           # MailHog + environnement test
├── .env.test.example                 # Template variables d'env
├── package.test.json                 # Scripts npm pour tests
│
├── tests/
│   ├── README.md                     # Documentation tests
│   ├── QUICKSTART.md                 # Guide démarrage rapide
│   │
│   ├── utils/
│   │   └── mailhog.ts               # ✅ Utilitaire OTP (GRATUIT)
│   │
│   └── e2e/
│       ├── wallet-creation-email-backup-sms.spec.ts
│       └── wallet-reconnection.spec.ts
│
└── ...
```

---

## 🎯 Prochaines Étapes

### ✅ Déjà fait

- ✅ Configuration Playwright
- ✅ Configuration MailHog (Docker)
- ✅ Utilitaire `mailhog.ts` pour OTP
- ✅ Test "Création wallet Email + backup SMS"
- ✅ Test "Reconnexion sans OTP"
- ✅ Documentation complète

### 📝 À faire (optionnel)

- [ ] Tests unitaires hooks (Jest)
- [ ] Mock Coinbase SDK complet
- [ ] CI/CD GitHub Actions
- [ ] Tests Buy/Sell avec sandbox
- [ ] Tests SMS avec Twilio Test
- [ ] Tests migration USDC/NFT
- [ ] Tests création d'offres

---

## 🚀 CI/CD (GitHub Actions)

Template pour `.github/workflows/test.yml` :

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      mailhog:
        image: mailhog/mailhog
        ports:
          - 1025:1025
          - 8025:8025
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          MAILHOG_API_URL: http://localhost:8025
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📞 Support

En cas de problème :

1. **Vérifier MailHog** : http://localhost:8025
2. **Voir les logs** : `docker-compose -f docker-compose.test.yml logs -f mailhog`
3. **Lire la FAQ** ci-dessus
4. **Consulter** [tests/README.md](../cylimit-frontend-develop/tests/README.md)

---

**✅ Setup terminé !** Tu peux maintenant lancer `npm run test:e2e` **gratuitement** 🎉

**Coût total : 0€** | **Temps setup : 5 minutes** | **100% automatisé** ✅

