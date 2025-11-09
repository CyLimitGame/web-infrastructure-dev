# 🔐 CONTEXTE COMPLET - AUTHENTIFICATION CYLIMIT

**Date :** 6 Novembre 2025  
**Version :** 1.0 - Documentation Système Auth Actuel  
**Objectif :** Document de référence pour comprendre le système d'authentification CyLimit

---

## 💰 COÛT DE CHARGEMENT DE CE CONTEXTE

**Taille du fichier :** 669 lignes  
**Nombre de tokens :** ~8,360 tokens  
**Coût par chargement :** ~$0.025 (à $3/M tokens input)  
**Budget token restant après chargement :** ~991,640 tokens (sur 1M)

**⚠️ RÈGLE IMPORTANTE :**
- ✅ **TOUJOURS mettre à jour ces chiffres** après chaque modification de ce fichier
- ✅ Compter les lignes avec `wc -l CONTEXT_AUTH.md`
- ✅ Estimer tokens : ~12.5 tokens par ligne en moyenne
- ✅ Recalculer le coût : (nombre_tokens / 1,000,000) × $3
- ✅ Mettre à jour la date de dernière modification

**Dernière mise à jour compteurs :** 6 Novembre 2025 - 12h15

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Actuelle](#architecture-actuelle)
3. [Flow Inscription](#flow-inscription)
4. [Flow Connexion](#flow-connexion)
5. [OAuth Social Login](#oauth-social-login)
6. [Vérification Email](#vérification-email)
7. [Reset Password](#reset-password)
8. [JWT & Sessions](#jwt--sessions)
9. [Admin Auth](#admin-auth)
10. [Migration Firebase Auth (Planifiée)](#migration-firebase-auth-planifiée)

---

## 🎯 VUE D'ENSEMBLE

### Système Actuel (Custom JWT)

CyLimit utilise actuellement un **système d'authentification custom** basé sur :
- **JWT (JSON Web Tokens)** pour les sessions
- **Passport.js** pour les stratégies d'auth
- **bcrypt** pour le hashing des mots de passe
- **OTP (One-Time Password)** pour la vérification email
- **OAuth 2.0** pour Google et Facebook

### Providers Supportés

| Provider | Type | Statut | Usage |
|----------|------|--------|-------|
| **Email/Password** | LOCAL | ✅ Actif | Auth principale |
| **Google** | OAuth 2.0 | ✅ Actif | Social login |
| **Facebook** | OAuth 2.0 | ✅ Actif | Social login |
| **Firebase Auth** | ⏳ Planifié | 🔜 Prochaine migration | OTP & 2FA mobile |

---

## 🏗️ ARCHITECTURE ACTUELLE

### Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  - Pages: /sign-up, /sign-in, /forgot-password             │
│  - Storage: localStorage ('TOKEN')                          │
│  - API calls: axios + Bearer token                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓ HTTP (JWT Bearer)
┌─────────────────────────────────────────────────────────────┐
│              BACKEND USER (NestJS + Passport.js)            │
│                                                             │
│  AuthController                                             │
│  ├─ POST /auth/register                                     │
│  ├─ POST /auth/login                                        │
│  ├─ POST /auth/google                                       │
│  ├─ POST /auth/facebook                                     │
│  ├─ GET /auth/email/verify                                  │
│  ├─ POST /auth/email/password-reset                         │
│  └─ POST /auth/check                                        │
│                                                             │
│  AuthService                                                │
│  ├─ register() → Create user + Send OTP                     │
│  ├─ login() → Validate + Return JWT                         │
│  ├─ verifyEmail() → Activate account                        │
│  └─ validateOrCreateSocialLogin() → OAuth flow              │
│                                                             │
│  Strategies (Passport.js)                                   │
│  ├─ JwtStrategy → Validate Bearer token                     │
│  └─ LocalStrategy → Validate email/password                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    MONGODB (Database)                        │
│  Collection: users                                          │
│  - email (unique, indexed)                                  │
│  - password (hashed bcrypt)                                 │
│  - isEmailVerified (boolean)                                │
│  - authProvider (LOCAL | GOOGLE | FACEBOOK)                 │
│  - roles (USER | ADMIN | SUPER_ADMIN)                       │
└─────────────────────────────────────────────────────────────┘
```

### Services Externes

```typescript
// Mail Service (Emails OTP)
MailerService
  └─ SMTP Config (Gmail/SendGrid/autre)
  └─ Templates: verify-email.hbs, reset-password.hbs

// OAuth Services
Google OAuth 2.0
  └─ Client ID/Secret (env vars)
  └─ Scopes: email, profile

Facebook OAuth 2.0
  └─ App ID/Secret (env vars)
  └─ Scopes: email, public_profile
```

---

## 📝 FLOW INSCRIPTION

### Étapes Utilisateur

```
1. User → Page /sign-up
   ├─ Remplit formulaire (email, password, nickName, conditions)
   └─ Clique "S'inscrire"
   
2. Frontend → POST /auth/register
   ├─ Body: { email, password, nickName, refInvitationCode }
   └─ Validation: password strength, email format
   
3. Backend AuthService.register()
   ├─ Vérifie email unique (MongoDB)
   ├─ Hash password (bcrypt, 10 rounds)
   ├─ Crée user en DB (isEmailVerified: false)
   ├─ Génère OTP code (6 chiffres, expiration 10min)
   └─ Envoie email de vérification
   
4. User reçoit email
   ├─ Template: "Verify your email"
   ├─ Bouton → /auth/email/verify?code=123456&uid=...
   └─ Expiration: 10 minutes
   
5. User clique lien → GET /auth/email/verify
   ├─ Backend vérifie OTP (code + userId)
   ├─ Marque isEmailVerified = true
   ├─ Génère JWT token
   └─ Redirect /email-verified?token=...
   
6. Frontend récupère token
   ├─ Stocke dans localStorage ('TOKEN')
   ├─ Configure axios headers (Authorization: Bearer ...)
   └─ Redirect /dashboard ou /onboarding
```

### Code Backend (Simplifié)

```typescript
// auth.service.ts
async register(registerUserDto: RegisterUserDto): Promise<UserEntity> {
  const { email, password, nickName } = registerUserDto;
  
  // 1. Vérifier email unique
  const existingUser = await this.userService.findByEmail(email);
  if (existingUser) {
    throw new BadRequestException('email_already_exists');
  }
  
  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 3. Créer user
  const user = await this.userService.create({
    email,
    password: hashedPassword,
    nickName,
    isEmailVerified: false,
    authProvider: AuthProvider.LOCAL,
    roles: Role.USER,
  });
  
  // 4. Générer OTP
  const otpCode = await this.otpService.generateNewOtpCode(
    user._id,
    OtpTypesEnum.USER_VERIFY_EMAIL
  );
  
  // 5. Envoyer email
  await this.mailService.sendVerifyEmail(user.email, {
    otpCode,
    userId: user._id,
  });
  
  return user;
}
```

---

## 🔑 FLOW CONNEXION

### Étapes Utilisateur

```
1. User → Page /sign-in
   ├─ Email + Password
   └─ Clique "Se connecter"
   
2. Frontend → POST /auth/login
   └─ Body: { email, password }
   
3. Backend AuthService.login()
   ├─ Valide credentials (bcrypt.compare)
   ├─ Vérifie isEmailVerified
   │  ├─ Si false → Renvoie OTP + Error 403
   │  └─ Si true → Continue
   ├─ Génère JWT token
   │  └─ Payload: { userId, email, walletAddress }
   └─ Retourne { accessToken, user }
   
4. Frontend reçoit token
   ├─ Stocke localStorage ('TOKEN')
   ├─ Set cookie 'tk' (30 jours, httpOnly: false)
   └─ Configure axios defaults
   
5. Redirect /dashboard
```

### Validation Credentials

```typescript
// auth.service.ts
async validateUser(email: string, password: string): Promise<UserEntity | null> {
  const user = await this.userService.findByEmailWithPassword(email);
  
  if (!user) return null;
  
  // Vérifier password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return null;
  
  return user;
}

async login(loginDto: LoginUserDto): Promise<LoginUserResultDto> {
  const { email, password } = loginDto;
  
  // 1. Valider credentials
  const user = await this.validateUser(email, password);
  if (!user) {
    throw new BadRequestException('username_or_password_incorrect');
  }
  
  // 2. Vérifier email
  if (!user.isEmailVerified) {
    // Renvoyer OTP
    const otpCode = await this.otpService.generateNewOtpCode(
      user._id,
      OtpTypesEnum.USER_VERIFY_EMAIL
    );
    
    await this.mailService.sendVerifyEmail(user.email, { otpCode, userId: user._id });
    
    throw new ForbiddenException('email_not_verified');
  }
  
  // 3. Générer JWT
  return this.signUserAccessToken(user);
}
```

---

## 🌐 OAUTH SOCIAL LOGIN

### Providers Configurés

#### Google OAuth 2.0

```typescript
// auth-google.service.ts
class AuthGoogleService {
  private oauth2Client: Auth.OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }
  
  async getProfileByToken(token: string): Promise<SocialUserLoginDto> {
    this.oauth2Client.setCredentials({ access_token: token });
    const userInfoClient = google.oauth2('v2').userinfo;
    const response = await userInfoClient.get({ auth: this.oauth2Client });
    
    return {
      email: response.data.email,
      nickName: response.data.name,
      avatarUrl: response.data.picture,
    };
  }
}
```

#### Facebook OAuth 2.0

```typescript
// auth-facebook.service.ts
class AuthFacebookService {
  async getProfileByToken(token: string): Promise<SocialUserLoginDto> {
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
    );
    
    return {
      email: response.data.email,
      nickName: response.data.name,
      avatarUrl: response.data.picture.data.url,
    };
  }
}
```

### Flow OAuth Complet

```
1. User clique "Se connecter avec Google/Facebook"
   
2. Frontend → Ouvre popup OAuth provider
   ├─ Google: accounts.google.com/oauth
   └─ Facebook: www.facebook.com/dialog/oauth
   
3. User accepte permissions
   └─ Provider → Redirect avec access_token
   
4. Frontend → POST /auth/google (ou /auth/facebook)
   └─ Body: { token: "...", refInvitationCode: "..." }
   
5. Backend AuthService.validateOrCreateSocialLogin()
   ├─ Récupère profile via token
   ├─ Cherche user par email en DB
   │  ├─ Si existe → Login
   │  └─ Si n'existe pas → Create + Login
   ├─ Marque isEmailVerified = true (trusté par provider)
   ├─ Sauvegarde authProvider (GOOGLE | FACEBOOK)
   └─ Génère JWT
   
6. Frontend reçoit token
   └─ Même flow que login classique
```

---

## ✉️ VÉRIFICATION EMAIL

### Système de Vérification par Lien (Magic Link)

**Important :** CyLimit utilise un **lien de vérification** (pas un code OTP à saisir manuellement).

Le code OTP est généré mais **intégré dans l'URL** envoyée par email.

```typescript
// otp.service.ts
const LIMIT_LIVE_MINUTES = 30; // ⚠️ IMPORTANT : 30 minutes, pas 10

async generateNewOtpCode(
  userId: string, 
  type: OtpTypesEnum,
  codeLength: number = 10 // ⚠️ 10 caractères par défaut
): Promise<string> {
  // Générer code alphanumérique (otp-generator)
  const otpCode = generate(codeLength, {
    digits: true,
    lowerCaseAlphabets: true,
    upperCaseAlphabets: true,
    specialChars: false,
  });
  
  // Sauvegarder en DB (pas d'expiration stricte, vérification au moment du verify)
  const existingOtp = await this.otpModel.findOne({ userId, type });
  
  if (existingOtp) {
    // Update code existant
    await existingOtp.updateOne({
      code: otpCode,
      generatedAt: Date.now(),
    });
  } else {
    // Créer nouveau
    await this.otpModel.create({
      userId,
      code: otpCode,
      type,
      generatedAt: Date.now(),
    });
  }
  
  return otpCode;
}

async verifyOtpCode(
  userId: string, 
  code: string, 
  type: OtpTypesEnum,
  limitMinutes: number = LIMIT_LIVE_MINUTES
): Promise<void> {
  const otp = await this.otpModel.findOne({ userId, code, type });
  
  if (!otp) {
    throw new BadRequestException('otp_not_found');
  }
  
  // Vérifier expiration (30 minutes par défaut)
  const now = moment();
  const generated = moment(otp.generatedAt);
  const diffSeconds = now.diff(generated, 'seconds');
  
  if (diffSeconds >= limitMinutes * 60) {
    throw new BadRequestException('otp_expired', 'OTP time expired');
  }
}
```

### Email Template (Lien de Vérification)

```html
<!-- verify-email.hbs -->
<div>
  <h1>To continue, please confirm your email address</h1>
  <p>This ensure we have the right email in case we need to contact you.</p>
  
  <!-- ✅ LIEN avec code OTP intégré -->
  <a href="{{verifyUrl}}" target="_blank">
    <!-- Format URL: /auth/email/verify?code=abc123xyz&uid=507f1f77... -->
    <button>Verify</button>
  </a>
  
  <p>If this was a mistake, just ignore this email and nothing will happen.</p>
</div>
```

**Ce que reçoit le user :**
- Email avec bouton "Verify"
- Clic → Redirect vers `/auth/email/verify?code=abc123xyz&uid=507f1f77...`
- Backend vérifie code + userId
- Si valide (< 30min) → Email marqué vérifié
- Redirect → `/email-verified?token=...` (connecté automatiquement)

---

## 🔒 RESET PASSWORD

### Flow

```
1. User → Page /forgot-password
   └─ Entre son email
   
2. Frontend → POST /auth/email/password-reset
   └─ Body: { email }
   
3. Backend
   ├─ Génère OTP code
   ├─ Envoie email avec lien reset
   └─ Lien: /reset-password?code=...&uid=...
   
4. User clique lien → Page /reset-password
   ├─ Entre nouveau password
   └─ POST /auth/email/password-reset/confirm
   
5. Backend
   ├─ Vérifie OTP
   ├─ Hash nouveau password
   ├─ Update user.password
   └─ Invalide tous les tokens précédents
```

---

## 🎫 JWT & SESSIONS

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  walletAddress?: string;
}
```

### Configuration JWT

```typescript
// jwt.strategy.ts
class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwtSecret'),
    });
  }
  
  validate(payload: JwtPayload): Partial<Payload> {
    return {
      email: payload.email,
      userId: payload.userId,
      walletAddress: payload.walletAddress,
    };
  }
}
```

### Durée de Session

```typescript
// auth.controller.ts
res.cookie('tk', data.accessToken, {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
  httpOnly: false, // Accessible JS
  secure: false, // HTTP OK (dev)
  sameSite: 'none',
});
```

---

## 👨‍💼 ADMIN AUTH

### Différences vs User Auth

| Critère | User Auth | Admin Auth |
|---------|-----------|------------|
| **Endpoint** | `/auth/login` | `/admin/auth/login` |
| **Cookie** | `tk` | `tk_ad` |
| **Vérification email** | ✅ Obligatoire | ❌ Non |
| **OAuth** | ✅ Google, Facebook | ❌ Non |
| **Rôles vérifiés** | USER | ADMIN, SUPER_ADMIN |

### Code Admin Login

```typescript
// admin-auth.service.ts
async validateAdmin(email: string, password: string): Promise<UserEntity | null> {
  const user = await this.userService.findByEmailWithPassword(email);
  
  if (!user) return null;
  
  // Vérifier rôle ADMIN
  if (user.roles !== Role.ADMIN && user.roles !== Role.SUPER_ADMIN) {
    return null;
  }
  
  // Vérifier password
  if (await bcrypt.compare(password, user.password)) {
    return user;
  }
  
  return null;
}
```

---

## 🔜 MIGRATION FIREBASE AUTH (PLANIFIÉE)

### Pourquoi Migrer ?

| Feature | Custom JWT (Actuel) | Firebase Auth (Futur) |
|---------|---------------------|----------------------|
| **Email/Password** | ✅ Supporté | ✅ Supporté |
| **OAuth Social** | ✅ Google, Facebook | ✅ Google, Facebook, Apple, etc. |
| **OTP SMS** | ❌ Non | ✅ Natif |
| **2FA Mobile** | ❌ Non | ✅ Natif (TOTP, SMS) |
| **Session Management** | ⚠️ Manuel | ✅ Automatique |
| **Scalabilité** | ⚠️ Limitée | ✅ Illimitée |
| **Coût** | $0 (custom) | ~$25-50/mois (estimé) |

### Plan de Migration

```
📅 PHASE 1 : Préparation (Après migration Google Cloud Run)
- Créer projet Firebase
- Configurer Firebase Auth
- Tester en parallèle (dual-mode)

📅 PHASE 2 : Migration Progressive
- Nouveaux users → Firebase Auth
- Anciens users → Maintien JWT (temporaire)
- Migration automatique au login

📅 PHASE 3 : Bascule Complète
- Tous users → Firebase Auth
- Suppression code JWT custom
- Activation 2FA mobile

📅 PHASE 4 : Nouvelles Features
- OTP SMS natif
- 2FA TOTP (Google Authenticator)
- Biométrie mobile (Face ID, Touch ID)
```

### Bénéfices Attendus

- ✅ **Sécurité renforcée** : 2FA, détection anomalies
- ✅ **UX améliorée** : OTP SMS, social login étendu
- ✅ **Maintenance réduite** : Firebase gère tout
- ✅ **Scalabilité** : Pas de limite users
- ✅ **Features mobiles** : Biométrie, push notifications

---

## 📊 MÉTRIQUES ACTUELLES

### Utilisation Auth Providers

```
Total users : ~6000
├─ LOCAL (Email/Password) : ~5400 (90%)
├─ GOOGLE : ~500 (8%)
└─ FACEBOOK : ~100 (2%)
```

### Taux de Vérification Email

```
Users inscrits : 100%
├─ Email vérifié : ~95%
└─ Email non vérifié : ~5%
```

---

## 🔧 CONFIGURATION ENVIRONNEMENT

### Variables d'Environnement Requises

```bash
# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=30d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Facebook OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@cylimit.com
MAIL_PASSWORD=...

# URLs
BASE_URL=https://cylimit.com
CLIENT_VERIFY_URL=https://cylimit.com/email-verified
```

---

**Maintenu par :** Équipe CyLimit  
**Date :** 6 Novembre 2025  
**Version :** 1.0 - Documentation Système Auth Actuel

