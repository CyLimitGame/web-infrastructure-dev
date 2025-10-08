# 🎯 Composant WalletConnect - Documentation

## 📋 Vue d'ensemble

Le composant **WalletConnect** est le nouveau bouton de wallet qui s'affiche dans le header de l'application. Il remplace l'ancien système de wallet et utilise les **Coinbase Smart Accounts (ERC-4337)**.

---

## 🎨 Design et UX

### Affichage selon l'état

| État | Affichage | Action au clic |
|------|-----------|----------------|
| **Pas de wallet** | Bouton bleu "Créer un Wallet" | Crée un nouveau Smart Account |
| **Chargement** | Spinner | Aucune |
| **Erreur** | Bouton rouge "Erreur Wallet" | Ouvre la modal pour diagnostiquer |
| **Wallet actif** | Adresse tronquée + Balance USDC | Ouvre la SmartWalletModal |

### Responsive

- **Desktop** : Affiche l'adresse + balance USDC
- **Mobile** : Affiche uniquement l'icône (via prop `showBalance={false}`)

---

## 📁 Fichiers créés

### 1. `/src/components/WalletConnect/index.tsx`

**Rôle** : Composant principal du bouton wallet dans le header

**Props** :
```typescript
interface Props extends IconProps {
  showBalance?: boolean; // Afficher la balance (default: true)
}
```

**Fonctionnalités** :
- ✅ Affiche l'adresse du wallet tronquée (0x1234...5678)
- ✅ Affiche la balance USDC en temps réel
- ✅ Gère la création du wallet si inexistant
- ✅ Ouvre la modal au clic
- ✅ Gère les états de chargement et d'erreur

**Dépendances** :
- `useWallet` : Hook pour récupérer les données du wallet
- `SmartWalletModal` : Modal de gestion du wallet

---

### 2. `/src/components/SmartWalletModal/index.tsx`

**Rôle** : Modal complète de gestion du Smart Account

**Props** :
```typescript
interface SmartWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Fonctionnalités** :
- ✅ Affiche les informations du wallet (adresse, balance USDC/MATIC)
- ✅ Bouton pour copier l'adresse
- ✅ Bouton pour rafraîchir la balance
- ✅ **Onglet "Déposer"** : Génère un lien Coinbase Onramp pour acheter des USDC
- 🚧 **Onglet "Retirer"** : Formulaire pour transférer des USDC (à implémenter)
- 🚧 **Onglet "Historique"** : Liste des transactions (à implémenter)

**Dépendances** :
- `useWallet` : Hook pour récupérer les données du wallet
- `walletService.getOnrampLink()` : API backend pour générer le lien Coinbase Onramp

---

### 3. `/src/pages/test-wallet-connect.tsx`

**Rôle** : Page de test pour valider le composant avant intégration

**URL** : `/test-wallet-connect`

**Fonctionnalités** :
- Affiche le WalletConnect avec balance
- Affiche le WalletConnect sans balance (mode mobile)
- Instructions de test

---

## 🚀 Comment tester

### 1. Démarrer le backend

```bash
cd cylimit-backend-develop
npm run start:dev
```

### 2. Démarrer le frontend

```bash
cd cylimit-frontend-develop
npm run dev
```

### 3. Ouvrir la page de test

Aller sur : `http://localhost:3000/test-wallet-connect`

### 4. Scénarios de test

#### Scénario 1 : Création du wallet
1. Cliquer sur "Créer un Wallet"
2. Attendre la création (2-3 secondes)
3. Vérifier que l'adresse et la balance s'affichent

#### Scénario 2 : Ouverture de la modal
1. Cliquer sur le bouton wallet
2. Vérifier que la modal s'ouvre
3. Vérifier que les informations sont correctes

#### Scénario 3 : Copie de l'adresse
1. Ouvrir la modal
2. Cliquer sur l'icône "Copier"
3. Vérifier le toast de confirmation
4. Coller l'adresse quelque part pour vérifier

#### Scénario 4 : Rafraîchir la balance
1. Ouvrir la modal
2. Cliquer sur l'icône "Rafraîchir"
3. Vérifier que le spinner apparaît
4. Vérifier le toast de confirmation

#### Scénario 5 : Coinbase Onramp
1. Ouvrir la modal
2. Aller dans l'onglet "Déposer"
3. Choisir un montant (ex: 100 USDC)
4. Cliquer sur "Acheter X USDC avec Coinbase Pay"
5. Vérifier qu'un nouvel onglet s'ouvre avec Coinbase Pay

---

## 🔧 Intégration dans le Header

### Option 1 : Remplacer l'ancien WalletButton (Recommandé)

**Fichier** : `/src/layouts/MainLayout/Header/Right/index.tsx`

**Avant** :
```typescript
import { WalletButton } from '@/features/core/Button';

const Right = () => {
  return (
    <Flex gap={[2, 4]} alignItems="center" pos="relative">
      <Search />
      <WalletButton />
      <NotificationButton />
      <SwitchLang />
      <UserAvatar />
    </Flex>
  );
};
```

**Après** :
```typescript
import { WalletConnect } from '@/components';

const Right = () => {
  return (
    <Flex gap={[2, 4]} alignItems="center" pos="relative">
      <Search />
      <WalletConnect showBalance={true} />
      <NotificationButton />
      <SwitchLang />
      <UserAvatar />
    </Flex>
  );
};
```

### Option 2 : Ajouter en parallèle (pour tester)

Garder l'ancien `<WalletButton />` et ajouter `<WalletConnect />` à côté pour comparer.

---

## 🎨 Personnalisation

### Changer les couleurs

**Fichier** : `/src/components/WalletConnect/index.tsx`

```typescript
// Bouton "Créer un Wallet"
bg="blue.500"        // Couleur de fond
color="white"        // Couleur du texte
_hover={{ bg: 'blue.600' }}  // Couleur au survol

// Wallet actif
bg="gray.100"        // Couleur de fond
_hover={{ bg: 'gray.200' }}  // Couleur au survol
```

### Changer le format de l'adresse

```typescript
// Actuellement : 0x1234...5678 (6 premiers + 4 derniers)
const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Pour plus court : 0x12...78 (4 premiers + 2 derniers)
const truncateAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-2)}`;
};
```

### Changer le format de la balance

```typescript
// Actuellement : 123.45 USDC (2 décimales)
const formatUSDC = (amount: number): string => {
  return amount.toFixed(2);
};

// Pour aucune décimale : 123 USDC
const formatUSDC = (amount: number): string => {
  return Math.floor(amount).toString();
};
```

---

## 🐛 Résolution de problèmes

### Le bouton "Créer un Wallet" ne fait rien

**Cause** : Le backend n'est pas démarré ou les API keys Coinbase ne sont pas configurées

**Solution** :
1. Vérifier que le backend tourne : `npm run start:dev`
2. Vérifier les logs du backend pour voir les erreurs
3. Vérifier que `COINBASE_API_KEY_NAME` et `COINBASE_API_KEY_PRIVATE_KEY` sont dans `.env`

### La balance affiche toujours 0.00 USDC

**Cause** : Le wallet vient d'être créé et n'a pas encore de fonds

**Solution** :
1. Ouvrir la modal
2. Aller dans l'onglet "Déposer"
3. Acheter des USDC via Coinbase Onramp
4. Attendre quelques minutes que la transaction soit confirmée
5. Cliquer sur "Rafraîchir la balance"

### Le lien Coinbase Onramp ne s'ouvre pas

**Cause** : Le navigateur bloque les popups

**Solution** :
1. Autoriser les popups pour `localhost:3000`
2. Ou copier le lien manuellement et l'ouvrir dans un nouvel onglet

### Erreur "Wallet non initialisé"

**Cause** : Le hook `useWallet` n'a pas encore chargé les données

**Solution** :
- Attendre quelques secondes
- Rafraîchir la page
- Vérifier les logs du navigateur (Console DevTools)

---

## 📊 Métriques et Analytics (à implémenter)

Pour suivre l'utilisation du wallet, ajouter des événements analytics :

```typescript
// Lors de la création du wallet
analytics.track('wallet_created', {
  walletId: wallet.walletId,
  network: wallet.network,
});

// Lors de l'ouverture de la modal
analytics.track('wallet_modal_opened');

// Lors de l'ouverture de Coinbase Onramp
analytics.track('onramp_opened', {
  amount: depositAmount,
});
```

---

## 🚀 Prochaines étapes

### Fonctionnalités à implémenter

1. **Onglet "Retirer"** : Permettre le transfert d'USDC vers une autre adresse
2. **Onglet "Historique"** : Afficher les transactions passées
3. **Notifications** : Alerter l'utilisateur quand une transaction est confirmée
4. **Multi-wallet** : Permettre de gérer plusieurs wallets
5. **Export de clés** : Permettre d'exporter les clés privées (avec confirmation)

### Améliorations UX

1. **Animation** : Ajouter des animations lors de l'ouverture de la modal
2. **Skeleton** : Afficher un skeleton pendant le chargement de la balance
3. **Tooltip** : Ajouter des tooltips pour expliquer les fonctionnalités
4. **Dark mode** : Améliorer le contraste en mode sombre

---

## 📚 Ressources

- [Documentation Coinbase SDK](https://docs.cdp.coinbase.com/wallet-sdk/docs/welcome)
- [Documentation Coinbase Onramp](https://docs.cdp.coinbase.com/onramp/docs/welcome)
- [Chakra UI Modal](https://chakra-ui.com/docs/components/modal)
- [React Hooks](https://react.dev/reference/react)

---

## ✅ Checklist d'intégration

- [x] Créer le composant `WalletConnect`
- [x] Créer la modal `SmartWalletModal`
- [x] Créer la page de test `/test-wallet-connect`
- [x] Tester la création de wallet
- [x] Tester l'affichage de la balance
- [x] Tester la copie de l'adresse
- [x] Tester le rafraîchissement de la balance
- [x] Tester le lien Coinbase Onramp
- [ ] Intégrer dans le header (remplacer l'ancien WalletButton)
- [ ] Tester sur mobile
- [ ] Tester en production
- [ ] Implémenter l'onglet "Retirer"
- [ ] Implémenter l'onglet "Historique"

---

**Dernière mise à jour** : 6 octobre 2025
