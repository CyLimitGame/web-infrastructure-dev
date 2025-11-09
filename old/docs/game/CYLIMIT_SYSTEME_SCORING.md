# CyLimit - Detailed Scoring System

## 🎯 Overview

CyLimit uses a sophisticated scoring system based on **multiple roles** of cycling riders. Unlike traditional fantasy games with a single score, each rider can excel in different **specialized roles**.

## 🏆 Cycling Roles Concept

### CyLimit Roles (Official List)
- **leader** : Score for riders in general classification of stage races, or ability to win one-day races
- **climber** : Score for best climbers (mountain stages, uphill finishes)
- **sprinter** : Score for best sprinters (sprint finishes, flat stages)
- **domestic** : Score for riders who help their teammates most (domestique, water carrier)
- **free_electron** : Score for riders who often go in breakaways (attackers, baroudeurs)
- **cap** : Overall score to measure general quality of a rider regardless of profile

### Business Logic
```typescript
// A rider can have multiple roles with different performances
const riderResult = {
  pcsRiderId: 1234,
  roles: [
    { name: 'leader', points: 85 },       // Excellent leader/GC
    { name: 'climber', points: 67 },      // Good climber
    { name: 'sprinter', points: 12 },     // Weak sprinter
    { name: 'cap', points: 74 }           // Good overall score
  ],
  points: [
    // Calculation details for each MatrixRoleEnum
    { type: 'GENERAL_CLASSIFICATION_RANKING', value: 45, roles: [...] },
    { type: 'STAGE_RANKING', value: 8, roles: [...] },
    { type: 'KOM_POINTS', value: 32, roles: [...] }
  ]
}
```

## 📊 Scoring Data Structure

### DetailedRiderResult (Final Result)
```typescript
export type DetailedRiderResult = {
  pcsRiderId: number;
  teamid?: number;
  points: RiderPoint[];     // Calculation details by point type
  roles?: Role[];           // Final aggregated points by role ⭐ IMPORTANT
  // ❌ NO global totalPoint - each role has its own total
}
```

### RiderPoint (Calculation Details)
```typescript
export type RiderPoint = {
  type: MatrixRoleEnum;     // Point type (stage_ranking, breakaway, etc.)
  value: number;            // Calculated value for this point type
  roles: Role[];            // Role coefficients applied to this point type
}
```

### Role (Final Score by Role)
```typescript
export type Role = {
  name: string;             // Role name (leader, climber, sprinter, etc.)
  points: number;           // Final aggregated points for this role
}
```

## 🔢 Point Calculation Logic

### Step 1: Calculate Point Values by Type
Each point type (MatrixRoleEnum) is calculated by ranking formulas in `ranking-template/`:

```typescript
// Example: Stage ranking calculated by formulas
const stageRankingValue = 45;  // Calculated by ranking-template formulas

// Coefficients retrieved from database (ranking_template.matrixRoles)
const coefficients = {
  'STAGE_RANKING': {
    roles: [
      { name: 'leader', value: 80 },    // 80% coefficient stored in DB
      { name: 'cap', value: 30 }        // 30% coefficient stored in DB
    ]
  }
}
```

### Step 2: Apply Role Coefficients
Coefficients are applied using `mapEntryPointsWithRoles()`:

```typescript
// In ranking-formula.service.ts
public mapEntryPointsWithRoles(entryPoints, type, matrixRoles) {
  const foundMatrixRole = findMatrixRole(type, matrixRoles);
  
  return entryPoints.map(entryPoint => ({
    ...entryPoint,
    roles: foundMatrixRole.roles.map(role => ({
      name: role.name,           // 'leader', 'climber', etc.
      value: (role.value / 100) * entryPoint.point  // 80% * 45 = 36
    }))
  }));
}
```

### Step 3: Final Data Structure
```typescript
const riderResult = {
  pcsRiderId: 1234,
  points: [                    // Details by point type (MatrixRoleEnum)
    { 
      type: 'STAGE_RANKING', 
      value: 45,               // Calculated by ranking formulas
      roles: [                 // Coefficients applied from database
        { name: 'leader', value: 36 },    // 45 * 0.8 (80% coefficient)
        { name: 'cap', value: 13.5 }      // 45 * 0.3 (30% coefficient)
      ]
    },
    { 
      type: 'BREAKAWAY', 
      value: 20,               // Calculated by ranking formulas
      roles: [                 // Coefficients applied from database
        { name: 'free_electron', value: 18 }, // 20 * 0.9 (90% coefficient)
        { name: 'cap', value: 6 }              // 20 * 0.3 (30% coefficient)
      ]
    }
  ],
  roles: [                     // Final aggregated points by role
    { name: 'leader', points: 36 },        // Sum: 36 + 0 + ... (from all point types)
    { name: 'free_electron', points: 18 }, // Sum: 0 + 18 + ... (from all point types)
    { name: 'cap', points: 19.5 }          // Sum: 13.5 + 6 + ... (from all point types)
  ]
  // ❌ NO totalPoint - each role has its own points, no global total
}
```

### Step 4: Role Aggregation
Final role points are calculated by `calculateRidersMultiRaces()`:

```typescript
// Sum all point types for each role
roles: [
  { 
    name: 'leader', 
    points: stageRankingPoints + gcRankingPoints + ... // Sum across all types
  },
  { 
    name: 'climber', 
    points: komPoints + mountainStagePoints + ... // Sum across all types
  }
]
```

## 🎮 Impact on Gameplay

### Team Strategy
- **No global rider score** - Players must consider role-specific performance
- **Balanced team composition** - Need riders strong in different roles
- **Strategic role selection** - Choose riders based on race characteristics

### Scoring Examples
```typescript
// Tour de France rider (GC specialist)
{
  roles: [
    { name: 'leader', points: 95 },     // Excellent GC rider
    { name: 'climber', points: 78 },    // Good climber
    { name: 'sprinter', points: 5 },    // Poor sprinter
    { name: 'cap', points: 82 }         // High overall quality
  ]
}

// Classics specialist
{
  roles: [
    { name: 'leader', points: 72 },     // Good one-day race ability
    { name: 'free_electron', points: 88 }, // Excellent attacker
    { name: 'domestic', points: 45 },   // Moderate team player
    { name: 'cap', points: 68 }         // Good overall quality
  ]
}
```

## 🔧 Technical Implementation

### Key Services
- **`ranking-formula.service.ts`** : Calculates point values using formulas
- **`game-ranking-point.service.ts`** : Orchestrates the calculation flow
- **`calculateRidersMultiRaces()`** : Aggregates points by role

### Key Functions
- **`mapEntryPointsWithRoles()`** : Applies role coefficients
- **`calculateRiderScore()`** : Main calculation orchestrator
- **`mapPointsResult()`** : Maps calculated points to final structure

### Database Storage
- **`ranking_template.matrixRoles`** : Stores role coefficients
- **`races_results`** : Stores detailed calculation results
- **`pcs_races.riderResults`** : Stores simplified role totals only

## 💡 Key Insights

1. **No Global Score** : Each rider excels in specific roles, not overall
2. **Formula-Based Calculation** : Point values calculated by complex ranking formulas
3. **Coefficient Application** : Role-specific multipliers applied to base values
4. **Role Aggregation** : Final role scores sum all relevant point types
5. **Strategic Depth** : Players must understand role specializations for optimal team building

This system creates rich strategic gameplay where understanding rider specializations and race characteristics is crucial for success.