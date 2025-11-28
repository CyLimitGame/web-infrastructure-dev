# CyLimit - Coinbase OnRamp Integration Summary
**Website:** https://frontend-staging.cylimit.com (production)

---

## What is CyLimit?

**CyLimit is a fantasy cycling game where users collect NFT cyclist cards, build teams for real races, and earn USDC rewards based on real-life performance.**

---

## Complete End-to-End Flow

### User Journey with OnRamp

```
1. User Registration
   ↓
2. Embedded Wallet Creation (Coinbase CDP)
   ↓
3. User clicks "Add Funds" → OnRamp Opens
   ↓
4. User buys USDC via Coinbase Pay (credit card)
   ↓
5. USDC arrives in Embedded Wallet (Base Mainnet)
   ↓
6. User buys NFT cards on marketplace
   ↓
7. User plays fantasy games & earns USDC
   ↓
8. User needs more USDC → Returns to Step 3
```

---

## Technical Integration Flow

### Step-by-Step Implementation

**STEP 1: User initiates deposit**
- User opens wallet modal in CyLimit app
- Clicks "Add Funds" button
- Frontend prepares OnRamp request

**STEP 2: Frontend → Backend API call**
```
POST /onramp/simple-link
Authorization: Bearer <JWT_TOKEN>
Body: {
  destinationAddress: "0x742d35Cc...",
  cryptoCurrency: "USDC",
  network: "base"
}
```

**STEP 3: Backend validates & prepares**
- Verifies user authentication (JWT)
- Verifies wallet ownership (security check)
- Retrieves Coinbase API credentials from Google Secret Manager

**STEP 4: Backend generates Coinbase JWT**
```typescript
import { generateJwt } from '@coinbase/cdp-sdk/auth';

const jwt = await generateJwt({
  apiKeyId: this.apiKeyId,
  apiKeySecret: this.apiKeySecret,
  expiresIn: '1h'
});
```

**STEP 5: Backend calls Coinbase OnRamp API**
```
POST https://api.developer.coinbase.com/onramp/v1/token
Authorization: Bearer <COINBASE_JWT>
Body: {
  addresses: [{
    address: "0x742d35Cc...",
    blockchains: ["base"]
  }],
  assets: ["USDC"]
}
Response: { token: "xyz123abc..." }
```

**STEP 6: Backend returns OnRamp URL**
```
URL: https://pay.coinbase.com/buy?sessionToken=xyz123abc...
Returns to Frontend: { onrampUrl: "https://pay.coinbase.com/buy?..." }
```

**STEP 7: Frontend redirects user**
```typescript
window.open(onrampUrl, '_blank');
```

**STEP 8: Coinbase Pay handles payment**
- Auto-detects user location (IP-based)
- User enters amount and payment details
- Coinbase processes payment (KYC/AML)
- USDC minted on Base Mainnet
- USDC sent to user's wallet

**STEP 9: User returns to CyLimit**
- Balance updated in UI
- User can now purchase NFT cards

**Total time:** 2-3 minutes

---

## Backend Implementation

### Service: OnrampService

**File:** `src/modules/wallet/services/onramp.service.ts`

```typescript
@Injectable()
export class OnrampService {
  constructor(private readonly configService: ConfigService) {
    this.networkId = 'base'; // Base Mainnet
    this.initializeApiKeys(); // From Google Secret Manager
  }

  public async generateSimpleOnrampLink(
    destinationAddress: string,
    cryptoCurrency: string = 'USDC',
    network: string = 'base',
    clientIp?: string
  ): Promise<{ onrampUrl: string }> {
    // 1. Generate JWT
    const jwt = await generateJwt({
      apiKeyId: this.apiKeyId,
      apiKeySecret: this.apiKeySecret,
      expiresIn: '1h'
    });

    // 2. Call Coinbase API to get session token
    const response = await axios.post(
      'https://api.developer.coinbase.com/onramp/v1/token',
      {
        addresses: [{
          address: destinationAddress,
          blockchains: [network]
        }],
        assets: [cryptoCurrency],
        ...(clientIp && { clientIp })
      },
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 3. Return OnRamp URL
    const sessionToken = response.data.token;
    const onrampUrl = `https://pay.coinbase.com/buy?sessionToken=${sessionToken}`;
    
    return { onrampUrl };
  }
}
```

### Controller: OnrampController

**File:** `src/modules/wallet/controllers/onramp.controller.ts`

```typescript
@Controller()
export class OnrampController {
  @Post('onramp/simple-link')
  @UseGuards(AuthGuard('jwt'))
  async generateSimpleOnrampLink(@Body() body: any, @Req() req: Request) {
    const clientIp = req.headers['x-forwarded-for'] || req.ip;
    
    return this.onrampService.generateSimpleOnrampLink(
      body.destinationAddress,
      body.cryptoCurrency || 'USDC',
      body.network || 'base',
      clientIp
    );
  }
}
```

---

## Frontend Implementation

### API Client

**File:** `src/apis/onramp.ts`

```typescript
export const fetchSimpleOnrampLink = async (params: {
  destinationAddress: string;
  cryptoCurrency?: string;
  network?: string;
}): Promise<{ onrampUrl: string }> => {
  const token = localStorage.getItem('TOKEN');
  
  const response = await axios.post(
    `${API_URL}/onramp/simple-link`,
    {
      destinationAddress: params.destinationAddress,
      cryptoCurrency: params.cryptoCurrency || 'USDC',
      network: params.network || 'base'
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

### Hook: useCoinbaseWallet

**File:** `src/hooks/useCoinbaseWallet.ts`

```typescript
export const useCoinbaseWallet = () => {
  const { currentUser } = useCurrentUser();
  const evmAddress = currentUser?.evmSmartAccounts?.[0];

  const openOnRamp = async () => {
    const { onrampUrl } = await fetchSimpleOnrampLink({
      destinationAddress: evmAddress,
      cryptoCurrency: 'USDC'
    });

    window.open(onrampUrl, '_blank');
  };

  return { openOnRamp, address: evmAddress };
};
```

---

## Use Cases

### Use Case 1: New User - First Deposit

**Marie, 28, cycling fan from France**

```
Step 1: Marie registers on CyLimit
- Account created in 2 minutes
- Embedded Wallet: 0x742d35Cc... (automatic)
- Balance: 0 USDC

Step 2: Marie clicks "Add Funds"
- OnRamp URL generated in ~500ms
- Redirected to Coinbase Pay

Step 3: Coinbase Pay opens
- Auto-detected: France → EUR currency
- Payment methods: Visa, Mastercard, Apple Pay

Step 4: Marie enters purchase
- Amount: 50 EUR
- Enters Visa card details
- Coinbase processes payment

Step 5: USDC arrives
- Time: ~2 minutes
- Balance: 47.35 USDC (after fees)
- Marie buys her first NFT cards

Result: 3 minutes total, simple experience
```

## Configuration

### Backend Environment (.env.cloudrun.staging)

```bash
# Network (Base Mainnet - Production)
NETWORK_ID=base
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Coinbase CDP API Keys (stored in Google Secret Manager)
CDP_API_KEY_ID=<stored in secret manager>
CDP_API_KEY_SECRET_PATH=<stored in secret manager>

# URLs
API_URL=https://api-staging.cylimit.com
FRONTEND_URL=https://frontend-staging.cylimit.com
```

### Frontend Environment (.env.staging)

```bash
NEXT_PUBLIC_API_URL=https://api-staging.cylimit.com
NEXT_PUBLIC_CDP_PROJECT_ID=<your_project_id>
NEXT_PUBLIC_NETWORK=base
NEXT_PUBLIC_CHAIN_ID=8453
```

### Dependencies

**Backend:**
```json
{
  "@coinbase/cdp-sdk": "^1.38.4",
  "@google-cloud/secret-manager": "^6.1.1",
  "axios": "^1.12.2",
  "viem": "^2.38.0"
}
```

**Frontend:**
```json
{
  "@coinbase/cdp-react": "^0.0.62",
  "@coinbase/cdp-hooks": "^0.0.62",
  "axios": "^0.26.0"
}
```

---

## Security

### Multi-Layer Security

1. **Authentication:** JWT tokens validate user identity
2. **Wallet Ownership:** Backend verifies destinationAddress belongs to authenticated user
3. **API Keys:** Stored securely in Google Secret Manager (not in code)
4. **Session Tokens:** 1-hour expiry limits OnRamp URL validity
5. **HTTPS/TLS:** All API communications encrypted
6. **Client IP:** Passed to Coinbase for fraud detection

### Security Check Example

```typescript
async verifyWalletOwnership(userId: string, walletAddress: string) {
  const user = await this.userModel.findById(userId);
  
  if (!user || user.baseWalletAddress !== walletAddress) {
    throw new Error('Wallet does not belong to this user');
  }
  
  return true;
}
```

---

## Current Status

### Production Deployment

| Component | Status | Details |
|-----------|--------|---------|
| **OnRamp Integration** | 🟢 **LIVE** | Production on Base Mainnet |
| **Backend API** | ✅ Live | Google Cloud Run |
| **Frontend UI** | ✅ Live | frontend-staging.cylimit.com |
| **Network** | ✅ Base Mainnet | Chain ID: 8453 |
| **Testing** | ✅ Complete | Production tested |

### Production URLs

- **Frontend:** https://frontend-staging.cylimit.com
- **Backend API:** https://api-staging.cylimit.com
- **Network:** Base Mainnet (Chain ID: 8453)
- **USDC Contract:** 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

---



