# 🎯 Documentation Système Wallets & Paiements CyLimit

## 📄 Document Principal

**Tout est dans un seul document :** 

👉 **[SYSTEME-WALLETS-COMPLET.md](./SYSTEME-WALLETS-COMPLET.md)**

---

## 📋 Ce que contient le document

- ✅ Vue d'ensemble et décisions finales
- ✅ Architecture technique (Coinbase Smart Accounts)
- ✅ Système de paiement (USDC / Coinbase / Stripe)
- ✅ Système de fees (actuel + futur avec Premium)
- ✅ Flux utilisateur complets (inscription, dépôt, achat, retrait)
- ✅ Code d'implémentation (Smart Contract, Services, Tests)
- ✅ Migration depuis l'existant (step-by-step)
- ✅ Coûts & Timeline (8 semaines)
- ✅ FAQ (10 questions/réponses)

---

## 🎯 Résumé Exécutif (TL;DR)

### Décisions Finales

| Critère | Décision |
|---------|----------|
| **Blockchain** | Polygon (pas de migration) |
| **Wallet Tech** | Coinbase Smart Accounts (ERC-4337) |
| **Transactions** | Atomiques (USDC + NFT ensemble) |
| **Paiement** | 3 options : USDC > Coinbase > Stripe |
| **Fees Actuelles** | 0.05 USDC vendeur only |
| **Fees Futures** | max(0.05, 5%) vendeur + 5% acheteur (sauf Premium) |
| **Stripe + Premium** | ❌ Premium N'annule PAS fees Stripe (25% toujours) |
| **NFTs Externes** | Bloqués (CyLimit only) |
| **Audit** | Pas requis (ERC-4337 déjà audité) |
| **Timeline** | 8 semaines |
| **Budget** | ~1 140€/an (10k users) |

### Pourquoi Coinbase Smart Accounts ?

1. ✅ **Atomique** : USDC + NFT transférés ensemble (tout ou rien)
2. ✅ **Sécurisé** : ERC-4337 audité par Coinbase
3. ✅ **Simple** : Pas de Solidity custom à coder/auditer
4. ✅ **Économique** : Pas d'audit requis (5-10k€ économisés)
5. ✅ **Flexible** : Ajout facile de nouvelles features

### Point Clé : Stripe + Premium

```
Premium annule SEULEMENT les fees CyLimit internes (0-5%)
Premium N'annule JAMAIS les fees externes :
  - Stripe : 25% (toujours)
  - Coinbase Onramp : 3.5% (toujours)
```

**Pourquoi ?**  
Stripe facture CyLimit directement → CyLimit ne peut pas absorber ce coût même avec Premium.

**Solution UX :**  
Afficher clairement "+25% frais" pour Stripe, encourager Coinbase Onramp (+3.5% seulement).

---

## 🚀 Prochaines Étapes

1. **Valider** : Lire le document complet
2. **Questionner** : Poser toutes tes questions
3. **Développer** : Commencer par le Smart Contract v2
4. **Tester** : Déployer sur Mumbai testnet
5. **Migrer** : Users + NFTs existants
6. **Lancer** : Go-live progressif

---

## 📞 Contact

**Maintenu par :** Valentin  
**Dernière mise à jour :** 2 octobre 2025  
**Version :** 1.0 Finale

---

**🎉 Prêt pour développement !**

