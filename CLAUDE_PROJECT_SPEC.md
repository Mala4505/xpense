# Expense Tracker App — Complete Project Specification for Claude Code

> **Read this entire file before writing any code.**
> Every decision — architecture, naming, logic, UI — is defined here.
> When in doubt, refer back to this file. Do not improvise on core logic.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Theme System](#4-theme-system)
5. [Database Schema](#5-database-schema)
6. [Business Logic Rules](#6-business-logic-rules)
7. [Navigation Structure](#7-navigation-structure)
8. [Screens — Full Specification](#8-screens--full-specification)
9. [Quick Entry Overlay](#9-quick-entry-overlay)
10. [Back-Tap Native Module](#10-back-tap-native-module)
11. [Notifications](#11-notifications)
12. [Build Order](#12-build-order)
13. [Component Library](#13-component-library)
14. [Data Flow Examples](#14-data-flow-examples)

---

## 1. Project Overview

**App Name:** Expense Tracker (internal codename: `hisaab`)
**Platform:** Android (primary), iOS (future)
**Purpose:** A daily personal finance tracker for one user.
Fast, minimal, handy. Built for real daily use — not a demo.

### What This App Does

Every financial event the user experiences becomes a
**Transaction** — either money coming IN or money going OUT.
The app records these transactions and shows live summaries
across four views: Income, Expense, Khumus, and Loans.

There are no separate bank accounts or wallets.
This is a personal ledger. One table. Everything computed live.

### What Makes This App Unique

- **Triple back-tap** on the phone triggers a floating overlay
  for logging transactions in under 10 seconds
- **Khumus calculation** — a religious financial obligation —
  is automatically computed from eligible income categories
- **Loan tracking** that integrates directly into the
  main balance without double-counting
- All currencies stored per-transaction — never retroactively changed

---

## 2. Tech Stack

### Core

```
React Native          Expo SDK 51+ (managed workflow)
TypeScript            Strict mode enabled. No `any` types.
NativeWind v4         Tailwind CSS for React Native
```

### Navigation

```
@react-navigation/native
@react-navigation/bottom-tabs
@react-navigation/native-stack
```

### Database

```
@nozbe/watermelondb    Local SQLite database
                       Reactive queries — UI updates automatically
                       All data stored on device
```

### State Management

```
zustand               Global app state (settings, UI state)
                      WatermelonDB handles all data state
```

### Fonts

```
@expo-google-fonts/plus-jakarta-sans    Primary font
@expo-google-fonts/space-mono           Numbers and amounts only
expo-font
```

### Animations

```
react-native-reanimated v3    All animations
react-native-gesture-handler  Gesture support
```

### Notifications

```
expo-notifications    Monthly summary push notification
```

### Sensors (Back-Tap)

```
expo-sensors          Accelerometer for triple-tap detection
```

### Other

```
expo-haptics          Haptic feedback on transaction save
expo-file-system      PDF export, backup/restore
expo-sharing          Share exported files
react-native-svg      Icons and chart elements
victory-native        Line chart in Reports screen
date-fns              Date formatting and calculations
```

### Install Command

```bash
npx create-expo-app hisaab --template blank-typescript
cd hisaab
npx expo install nativewind tailwindcss
npx expo install @nozbe/watermelondb
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install expo-notifications expo-sensors expo-haptics
npx expo install expo-file-system expo-sharing
npx expo install react-native-svg victory-native
npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/space-mono expo-font
npx expo install zustand date-fns
```

---

## 3. Project Structure

```
hisaab/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout, font loading, navigation
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator
│   │   ├── index.tsx             # Home screen
│   │   ├── history.tsx           # Transaction history
│   │   ├── reports.tsx           # Reports + charts
│   │   └── settings.tsx          # Settings
│   ├── add.tsx                   # Full add transaction form (modal)
│   ├── khumus.tsx                # Khumus detail screen
│   ├── loans.tsx                 # Loans detail screen
│   └── pending.tsx               # Pending dues screen
│
├── src/
│   ├── db/                       # WatermelonDB
│   │   ├── index.ts              # Database instance
│   │   ├── schema.ts             # Full database schema
│   │   └── models/
│   │       ├── Transaction.ts
│   │       ├── Category.ts
│   │       └── Loan.ts
│   │
│   ├── queries/                  # All database queries
│   │   ├── transactions.ts       # CRUD + filters
│   │   ├── computed.ts           # Income total, expense total, khumus due
│   │   └── loans.ts              # Loan queries grouped by person
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── settingsStore.ts      # Currency, theme, preferences
│   │   └── overlayStore.ts       # Quick entry overlay state
│   │
│   ├── theme/
│   │   ├── colors.ts             # All color constants
│   │   ├── fonts.ts              # Font name constants
│   │   ├── spacing.ts            # Spacing scale
│   │   └── index.ts              # Re-exports everything
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── CategoryIcon.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── AmountText.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Toast.tsx
│   │   ├── home/
│   │   │   ├── HeroCards.tsx
│   │   │   ├── PendingStrip.tsx
│   │   │   └── RecentList.tsx
│   │   └── overlay/
│   │       ├── QuickEntryOverlay.tsx
│   │       ├── StepAmount.tsx
│   │       ├── StepCategory.tsx
│   │       └── StepNote.tsx
│   │
│   ├── hooks/
│   │   ├── useBackTap.ts         # Triple back-tap detection
│   │   ├── useTransactions.ts    # Reactive transaction queries
│   │   └── useComputed.ts        # Live computed totals
│   │
│   ├── utils/
│   │   ├── currency.ts           # Currency formatting
│   │   ├── date.ts               # Date helpers
│   │   ├── khumus.ts             # Khumus calculation helpers
│   │   └── categories.ts         # Default categories seed data
│   │
│   └── types/
│       └── index.ts              # All TypeScript interfaces
│
├── tailwind.config.js            # NativeWind theme config
├── babel.config.js
├── app.json
└── tsconfig.json
```

---

## 4. Theme System

### tailwind.config.js — Full Config

```javascript
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        'brand-navy':       '#1E1058',
        'brand-violet':     '#9B6EF0',
        'brand-yellow':     '#EDD900',
        'brand-purple':     '#5B35D4',
        'brand-pale':       '#EEEAF8',

        // Surfaces
        'surface-bg':       '#F5F4FC',
        'surface-card':     '#FFFFFF',
        'surface-border':   '#EEE8F8',
        'surface-elevated': '#EDE9FA',

        // Text
        'text-primary':     '#1A1040',
        'text-secondary':   '#5B35D4',
        'text-muted':       '#9080B8',
        'text-disabled':    '#C0B8E0',
        'text-inverse':     '#FFFFFF',

        // Semantic
        'income':           '#22C87A',
        'income-bg':        '#E8F8F0',
        'expense':          '#E05C5C',
        'expense-bg':       '#FEEDED',
        'khumus':           '#F0B429',
        'khumus-bg':        '#FFF8E0',
        'loan':             '#C48A00',
        'loan-bg':          '#FFF3D0',
        'pending':          '#3B82F6',
        'pending-bg':       '#EFF6FF',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
        mono: ['SpaceMono_400Regular'],
        'mono-bold': ['SpaceMono_700Bold'],
      },
    },
  },
  plugins: [],
};
```

### src/theme/colors.ts

```typescript
export const colors = {
  brandNavy:      '#1E1058',
  brandViolet:    '#9B6EF0',
  brandYellow:    '#EDD900',
  brandPurple:    '#5B35D4',
  brandPale:      '#EEEAF8',
  surfaceBg:      '#F5F4FC',
  surfaceCard:    '#FFFFFF',
  surfaceBorder:  '#EEE8F8',
  textPrimary:    '#1A1040',
  textMuted:      '#9080B8',
  textDisabled:   '#C0B8E0',
  textInverse:    '#FFFFFF',
  income:         '#22C87A',
  incomeBg:       '#E8F8F0',
  expense:        '#E05C5C',
  expenseBg:      '#FEEDED',
  khumus:         '#F0B429',
  khumusBg:       '#FFF8E0',
  loan:           '#C48A00',
  loanBg:         '#FFF3D0',
  pending:        '#3B82F6',
  pendingBg:      '#EFF6FF',
} as const;
```

---

## 5. Database Schema

### src/db/schema.ts

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [

    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'flow',         type: 'string'  }, // 'IN' | 'OUT'
        { name: 'amount',       type: 'number'  },
        { name: 'currency',     type: 'string'  }, // e.g. 'INR', stored at creation, NEVER updated
        { name: 'category_id',  type: 'string'  }, // FK → categories.id
        { name: 'status',       type: 'string'  }, // 'completed' | 'pending' | 'partial' | 'cancelled'
        { name: 'paid_amount',  type: 'number'  }, // only used when status = 'partial'
        { name: 'method',       type: 'string'  }, // 'cash' | 'card' | 'gpay' | 'bank' | 'cheque' | 'other'
        { name: 'note',         type: 'string',  isOptional: true },
        { name: 'loan_id',      type: 'string',  isOptional: true }, // FK → loans.id, only for loan transactions
        { name: 'khumus_share', type: 'number',  isOptional: true }, // amount / 5, only if category.khumus_eligible = true
        { name: 'created_at',   type: 'number'  }, // Unix timestamp
        { name: 'updated_at',   type: 'number'  },
      ],
    }),

    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name',             type: 'string'  },
        { name: 'flow_type',        type: 'string'  }, // 'IN' | 'OUT' | 'BOTH'
        { name: 'khumus_eligible',  type: 'boolean' }, // true = 20% auto-added to khumus_share
        { name: 'is_loan_type',     type: 'boolean' }, // true = direction is locked, never khumus
        { name: 'color',            type: 'string'  }, // hex color
        { name: 'icon',             type: 'string'  }, // icon name string
        { name: 'is_system',        type: 'boolean' }, // true = cannot be deleted by user
        { name: 'sort_order',       type: 'number'  },
        { name: 'created_at',       type: 'number'  },
        { name: 'updated_at',       type: 'number'  },
      ],
    }),

    tableSchema({
      name: 'loans',
      columns: [
        { name: 'type',          type: 'string'  }, // 'lent' | 'borrowed'
        { name: 'person_name',   type: 'string'  },
        { name: 'principal',     type: 'number'  },
        { name: 'currency',      type: 'string'  }, // stored at creation, NEVER updated
        { name: 'status',        type: 'string'  }, // 'active' | 'partial' | 'settled'
        { name: 'created_at',    type: 'number'  },
        { name: 'updated_at',    type: 'number'  },
        // total_repaid and remaining are COMPUTED, never stored
      ],
    }),

  ],
});
```

### Default Categories Seed Data

Seed these on first app launch in `src/utils/categories.ts`:

```typescript
export const DEFAULT_CATEGORIES = [
  // ── IN categories ──
  { name: 'Salary',         flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#22C87A', icon: 'briefcase',    is_system: true,  sort_order: 1  },
  { name: 'Freelance',      flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#4ADE80', icon: 'laptop',       is_system: true,  sort_order: 2  },
  { name: 'Gift Received',  flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#A78BFA', icon: 'gift',         is_system: true,  sort_order: 3  },
  { name: 'Refund',         flow_type: 'IN',   khumus_eligible: false, is_loan_type: false, color: '#38BDF8', icon: 'refresh',      is_system: true,  sort_order: 4  },
  { name: 'Investment',     flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#FB923C', icon: 'trending-up',  is_system: true,  sort_order: 5  },
  { name: 'Found Money',    flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#FBBF24', icon: 'search',       is_system: true,  sort_order: 6  },
  { name: 'Other Income',   flow_type: 'IN',   khumus_eligible: false, is_loan_type: false, color: '#94A3B8', icon: 'plus-circle',  is_system: true,  sort_order: 7  },

  // ── OUT categories ──
  { name: 'Daily Expenses', flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#E05C5C', icon: 'shopping-bag', is_system: true,  sort_order: 10 },
  { name: 'Grocery',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F87171', icon: 'shopping-cart',is_system: true,  sort_order: 11 },
  { name: 'Bills',          flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#FB923C', icon: 'zap',          is_system: true,  sort_order: 12 },
  { name: 'Shopping',       flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F472B6', icon: 'tag',          is_system: true,  sort_order: 13 },
  { name: 'Medical',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#34D399', icon: 'heart',        is_system: true,  sort_order: 14 },
  { name: 'Education',      flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#60A5FA', icon: 'book',         is_system: true,  sort_order: 15 },
  { name: 'Gift Given',     flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#C084FC', icon: 'gift',         is_system: true,  sort_order: 16 },
  { name: 'Sadaqah',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#2DD4BF', icon: 'heart-hand',   is_system: true,  sort_order: 17 },
  { name: 'Wakaf',          flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#4ADE80', icon: 'home',         is_system: true,  sort_order: 18 },
  { name: 'Nazrul Maqam',   flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F0B429', icon: 'star',         is_system: true,  sort_order: 19 },
  { name: 'Other Expense',  flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#94A3B8', icon: 'minus-circle', is_system: true,  sort_order: 20 },

  // ── LOAN categories (is_loan_type: true = direction locked, NEVER khumus) ──
  { name: 'Loan Given',       flow_type: 'OUT', khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-up-right',   is_system: true, sort_order: 30 },
  { name: 'Loan Received',    flow_type: 'IN',  khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-down-left',  is_system: true, sort_order: 31 },
  { name: 'Loan Repaid',      flow_type: 'IN',  khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-return-left',is_system: true, sort_order: 32 },
  { name: 'I Repaid Loan',    flow_type: 'OUT', khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-return-right',is_system: true,sort_order: 33 },

  // ── KHUMUS payment ──
  { name: 'Khumus Paid',    flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F0B429', icon: 'check-circle',is_system: true,  sort_order: 40 },
];
```

---

## 6. Business Logic Rules

> These are non-negotiable. Enforce them in the data layer, not just the UI.

### Rule 1 — Currency is Immutable

When a transaction is created, the app's current default currency
is stored in `transaction.currency`. This field is **never updated**
after creation. Changing the default currency in Settings only affects
new transactions going forward. Old records always show their original currency.

### Rule 2 — Khumus is Never Calculated on Loans

If `category.is_loan_type === true`, then `transaction.khumus_share`
must always be `null`. Enforce this in the transaction creation function:

```typescript
function createTransaction(data) {
  const category = await getCategory(data.category_id);

  const khumus_share =
    category.khumus_eligible === true &&
    category.is_loan_type === false
      ? data.amount / 5
      : null;

  // ...save transaction with khumus_share
}
```

### Rule 3 — Loan Direction is Locked

If `category.is_loan_type === true`, the `flow` field is
determined by the category, not the user:

```typescript
const LOAN_FLOW_MAP = {
  'Loan Given':    'OUT',
  'Loan Received': 'IN',
  'Loan Repaid':   'IN',
  'I Repaid Loan': 'OUT',
};
```

The UI must reflect this lock — the `+/−` toggle becomes
disabled and shows an info message when a loan category is selected.

### Rule 4 — Loan Balance is Always Computed

Never store `total_repaid` or `remaining` on the Loan record.
Always calculate live:

```typescript
// For a loan of type 'lent':
const total_repaid = transactions
  .filter(t => t.loan_id === loan.id && t.flow === 'IN')
  .reduce((sum, t) => sum + t.amount, 0);

const remaining = loan.principal - total_repaid;
const status = remaining <= 0 ? 'settled' : total_repaid > 0 ? 'partial' : 'active';
```

### Rule 5 — Net Balance Excludes Nothing

Loan transactions ARE included in net balance because the money
physically moved. The balance reflects physical reality:

```
Net Balance = SUM(all IN transactions) - SUM(all OUT transactions)
```

Loan transactions have a visual tag in the UI but are not
excluded from the balance calculation.

### Rule 6 — Khumus Due is a Running Total

No year cycles. No resets. Khumus accumulates from day one
of using the app until manually paid.

```typescript
const khumusDue =
  SUM(transaction.khumus_share WHERE khumus_share IS NOT NULL)
  - SUM(transaction.amount WHERE category.name = 'Khumus Paid')
```

### Rule 7 — Partial Status

When `status === 'partial'`, the `paid_amount` field stores
how much has been paid so far. The outstanding amount is:
`transaction.amount - transaction.paid_amount`.

---

## 7. Navigation Structure

```
Root Stack
├── (tabs)                        ← Bottom tab navigator
│   ├── index (Home)
│   ├── history (History)
│   ├── add (FAB → modal)         ← Center tab opens modal, not a screen
│   ├── reports (Reports)
│   └── settings (Settings)
│
├── add (modal, full screen)      ← Full transaction form
├── khumus (stack screen)         ← Khumus detail
├── loans (stack screen)          ← Loans detail
└── pending (stack screen)        ← Pending dues
```

### Bottom Tab Bar Specification

```typescript
// Tab bar styling
tabBarStyle: {
  backgroundColor: '#FFFFFF',
  borderTopColor: '#EEE8F8',
  borderTopWidth: 0.5,
  height: 64,
  paddingBottom: 10,
}

// Active tint: '#1E1058'
// Inactive tint: '#C0B8E0'
```

### Center FAB Tab (Add)

The center tab does NOT navigate to a screen.
It opens the full Add Transaction modal.
Style it as an elevated circle:

```typescript
tabBarButton: (props) => (
  <TouchableOpacity
    style={{
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#1E1058',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -16,
      borderWidth: 2,
      borderColor: '#F5F4FC',
      shadowColor: '#1E1058',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}
    onPress={() => navigation.navigate('add')}
  >
    <PlusIcon color="#EDD900" size={22} />
  </TouchableOpacity>
)
```

---

## 8. Screens — Full Specification

---

### 8.1 Home Screen (`app/(tabs)/index.tsx`)

**Purpose:** Financial snapshot at a glance. Most-viewed screen.

**Layout (ScrollView, bg `#F5F4FC`, horizontal padding 16px):**

#### Header Row
- Left: Avatar circle (36px, bg `#1E1058`, initials, color `#C8C0F8`)
  + Column: "Good Morning" (10px, `#9080B8`) / User name (15px, `#1A1040`, weight 500)
- Right: Bell icon circle (32px, bg `#EEEAF8`) with red dot if notifications exist

#### Stacked Hero Cards (position relative, height 190px, marginTop 16px)

**Back card** (position absolute, top 0, full width, bg `#1E1058`, borderRadius 22px, height 145px):
- Label: "Current Balance" (10px, rgba white 0.45)
- Amount: net balance in Space Mono 24px white (e.g. `INR 32,400`)
- Below amount: percentage change row (arrow icon + text in `#22C87A`)
- Decorative circles: top-right, rgba white 0.05 borders, no fill

**Front card** (position absolute, bottom 0, left 8, right 8, bg `#9B6EF0`, borderRadius 18px):
- Label: "Total Revenue" (10px, rgba white 0.55)
- Amount: income total in Space Mono 19px white
- Right: percentage badge (rgba white 0.18 bg, white text + up arrow)

#### Yellow Expense Card (marginTop 8px, bg `#EDD900`, borderRadius 16px)
- Label: "Total Expense" (10px, rgba navy 0.55)
- Amount: expense total in Space Mono 18px `#1A1040`
- Right: percentage badge (rgba navy 0.1 bg, dark text + down arrow)

#### Pending Strip (only renders if pendingCount > 0)
- bg `#EFF6FF`, border `#BFDBFE`, borderRadius 12px
- Blue dot + "N Pending" bold `#1D4ED8` + "INR X outstanding" muted
- "View →" button, right side, blue border
- `onPress`: navigate to `/pending`

#### Recent Transactions Card (bg white, borderRadius 18px, border `#EEE8F8`)
- Header: "Recent" + "See all" (→ history)
- Shows last 5 transactions from database (reactive query)
- Each row: `<TransactionRow />` component (see Component Library)
- Empty state: icon + "No transactions yet. Tap + to add your first."

**Data requirements:**
```typescript
// Reactive queries needed:
const netBalance = useNetBalance();          // income total - expense total
const incomeTotal = useIncomeTotal();        // current month
const expenseTotal = useExpenseTotal();      // current month
const pendingCount = usePendingCount();      // all time
const pendingTotal = usePendingTotal();      // all time
const recentTransactions = useRecentTransactions(5);
```

---

### 8.2 Transaction History Screen (`app/(tabs)/history.tsx`)

**Purpose:** Full list of all transactions with search and filters.

**Layout:**

#### Search Bar (top, always visible)
- Pill shape, bg white, border `#EEE8F8`, placeholder "Search transactions..."
- Searches: note text, category name, person name, amount (as string)
- Instant results, no submit button

#### Filter Row (horizontal scroll, below search)
- Filter chips: All | Income | Expense | Pending | Partial | Loans
- Active chip: bg `#1E1058`, white text
- Inactive chip: bg `#EEEAF8`, `#5B35D4` text

#### Date Range Selector (optional, collapsible row)
- "This Month" default
- Options: Today, This Week, This Month, Last Month, All Time, Custom

#### Transaction List (FlatList, performant)
- Grouped by date (e.g. "Today", "Yesterday", "Apr 23")
- Each group has a date header in muted text
- Each item: `<TransactionRow />` component
- Pull-to-refresh
- Long press → Edit / Delete action sheet

---

### 8.3 Add Transaction Screen (`app/add.tsx`) — Modal

**Purpose:** Full transaction entry form for detailed logging.

**Layout (ScrollView, modal presentation):**

#### Direction Toggle (top, full width)
- Two large segmented buttons: `[ − Expense ]` `[ + Income ]`
- Active expense: bg `#FEEDED`, border `#E05C5C`, text `#E05C5C`
- Active income: bg `#E8F8F0`, border `#22C87A`, text `#22C87A`

#### Amount Field
- Large centered number input
- keyboardType `numeric`
- Font: Space Mono 32px
- Color matches direction (red/green)
- Currency label left of input (e.g. "INR")
- Below input: inline calculator row `[+][-][×][=]`
  for splitting bills (e.g. tap +, type 200, tap = → adds to amount)

#### Category Picker
- Label "Category"
- Grid of category chips (2 columns)
- Only shows categories matching current direction
- Loan categories shown at bottom of list with amber color
- Selecting a loan category: shows Person Name field below picker
- Selecting khumus-eligible category: shows small gold info strip:
  "Khumus share: INR X will be added automatically"

#### Date & Time
- Default: current date and time
- Tap to open date picker
- Shows formatted: "Today, 3:45 PM"

#### Status Dropdown
- Options: Completed, Pending, Partial, Cancelled
- Default: Completed
- If Partial: shows "Amount paid so far" number input below

#### Payment Method
- Row of pill chips: Cash | Card | GPay | Bank | Cheque | Other
- Single select
- Default: Cash

#### Note Field
- Optional plain text input
- Placeholder: "Add a note (optional)"
- keyboardType `default`

#### Save Button (bottom, sticky)
- bg `#1E1058`, full width, borderRadius 14px
- Text: "Save Transaction" in `#EDD900`
- Disabled state when amount is 0

---

### 8.4 Reports Screen (`app/(tabs)/reports.tsx`)

**Purpose:** Visual spending analysis over time.

**Layout:**

#### Time Filter Pills
- Options: 1D | 7D | 1M | 3M | 1Y
- Active: bg `#1E1058`, white text, borderRadius full
- Inactive: transparent, `#9080B8` text

#### Line Chart (full width, height ~220px)
- Line color: `#9B6EF0`
- Area fill: rgba(155, 110, 240, 0.1)
- X axis: day/month labels in `#9080B8`, 10px
- Y axis: amount labels in `#9080B8`, 10px
- Touch point: circle on line + vertical dashed line
  + tooltip above showing amount in navy card
- Show TWO lines: income (green `#22C87A`) and expense (red `#E05C5C`)
- Library: Victory Native

#### Category Breakdown
- Section header: "Spending by Category"
- Each row: category icon + name + amount + percentage bar
- Bar: bg `#EEEAF8`, fill color matches category color
- Sorted by amount descending

#### Export Button (bottom)
- bg `#EDD900`, full width, borderRadius 14px
- Text: "Export PDF Report" in `#1A1040`
- Generates PDF using expo-file-system + expo-sharing

---

### 8.5 Khumus Screen (`app/khumus.tsx`)

**Purpose:** Track the 20% religious financial obligation.

**Layout:**

#### Summary Card (bg `#1E1058`, borderRadius 22px)
- "Khumus Summary" label
- Row: Accumulated | Paid | Remaining Due
- Remaining Due is highlighted in `#F0B429` if > 0

#### Pay Khumus Button
- bg `#F0B429`, borderRadius 14px
- Opens quick entry with "Khumus Paid" category pre-selected

#### Category Breakdown
- Each khumus-eligible category that has transactions
- Shows: category name, total income from it, khumus share (÷5)

#### Payment History
- All "Khumus Paid" transactions in reverse chronological order
- Each row: date, amount, method, note

---

### 8.6 Loans Screen (`app/loans.tsx`)

**Purpose:** Track all money lent and borrowed.

**Layout:**

#### Summary Row
- "People Owe Me: INR X" (green)
- "I Owe: INR X" (red)
- "Net: INR X" (colored by sign)

#### Tabs: [ I Lent ] [ I Borrowed ]

#### Loan Cards (one per person)
- Person name (bold)
- Original amount
- Repayment progress bar
- Outstanding amount (colored)
- Status badge: Active | Partial | Settled
- Tap → expanded view with all related transactions
- "Log Repayment" button on active/partial loans
- Settled loans shown greyed out at bottom

---

### 8.7 Pending Screen (`app/pending.tsx`)

**Purpose:** All unresolved transactions in one place.

**Layout:**

#### Section: "To Receive" (IN transactions with pending/partial status)
#### Section: "To Pay" (OUT transactions with pending/partial status)

Each row: full transaction detail + "Mark Done" button
"Mark Done" → opens a confirmation then updates status to 'completed'

---

### 8.8 Settings Screen (`app/(tabs)/settings.tsx`)

**Sections:**

#### Preferences
- Default Currency: searchable dropdown of world currencies
  ⚠️ Changing this does NOT retroactively update old transactions
  Show warning: "This only affects new transactions"
- Theme: Light / Dark (toggle)

#### Categories
- List of all categories with icon + name + khumus toggle
- Swipe to delete (user-created only, system categories cannot be deleted)
- "+ Add Category" button → form with name, direction, khumus toggle, color, icon
- Khumus toggle: only shows on IN and BOTH type categories

#### Data
- Export CSV: exports all transactions
- Backup: saves JSON file to device
- Restore: imports JSON backup file

#### About
- App version
- Built with ❤️

---

## 9. Quick Entry Overlay

This is the most important feature. It must work perfectly.

### Trigger Methods
1. Triple back-tap via accelerometer (see Section 10)
2. Center FAB button in bottom tab bar (for non-back-tap usage)

### Visual Behavior
The overlay is a **floating card**, NOT a bottom sheet.
It appears in the upper portion of the screen.
The app behind it is visible and slightly blurred/dimmed.
The screen is NOT blacked out.

Reference: iOS Shortcuts widget popup — small frosted card
floating over the home screen, system keyboard below.

### Implementation

Use React Native's `Modal` component with `transparent={true}`
and `animationType="fade"`. The card itself slides in from
slightly above using Reanimated.

```typescript
// Overlay container
<Modal transparent visible={overlayVisible} animationType="none">
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(26, 16, 64, 0.35)',  // dim but not black
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 16,
  }}>
    <Animated.View style={[cardStyle, animatedCardStyle]}>
      {/* Card content */}
    </Animated.View>
  </View>
</Modal>
```

### Card Style (all 3 steps share this)

```typescript
cardStyle: {
  backgroundColor: 'rgba(245, 244, 252, 0.95)',
  borderRadius: 20,
  borderWidth: 0.5,
  borderColor: 'rgba(255, 255, 255, 0.9)',
  padding: 20,
  // iOS shadow
  shadowColor: '#1E1058',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  // Android shadow
  elevation: 12,
}
```

### Step 1 — Amount

**Amount Input Row:**
```
[ − toggle ]  |  [ amount display ]  INR
```

**Sign Toggle Button:**
- Minus state: bg `#FEEDED`, text `#E05C5C`, shows "−"
- Plus state: bg `#E8F8F0`, text `#22C87A`, shows "+"
- One tap toggles between states
- Width ~44px, height ~44px, borderRadius 10px
- `onPress`: toggles flow between 'OUT' and 'IN'

**Amount Display:**
- Large text, Space Mono, 32px
- Color: `#E05C5C` when minus, `#22C87A` when plus
- Placeholder: "0" in `#C0B8E0`
- Tapping anywhere on this row focuses the text input
- `keyboardType="numeric"` (system keyboard, NOT custom numpad)

**Buttons Row:**
- Left: "Cancel" pill (bg `#F0EAF8`, text `#9080B8`)
- Right: "Next →" pill (bg `#1E1058`, text `#EDD900`)
  Disabled when amount === '0' or empty

### Step 2 — Category

**Top Strip (read-only):**
- Shows: sign + amount in Space Mono (colored)
- e.g. "− INR 3,200" in red
- Separator line below

**Recent chips:**
- Label "Recent" in 10px muted
- Up to 3 chips from last used categories
- Chip: bg `#EEEAF8`, text `#5B35D4`, borderRadius full
- Stored in `settingsStore.recentCategories` array
- One tap selects and advances to step 3

**Category List (ScrollView):**
- Filtered by current flow direction automatically
- Each row: colored icon square + category name
- Row height 44px for thumb comfort
- Loan categories at bottom with amber color
- When loan category selected:
  - Direction toggle locks (show lock icon)
  - Info strip: "Direction set automatically for loans" in blue

**Footer note:** "To add categories, go to Settings"

**Buttons:** Cancel | Next →

### Step 3 — Note

**Top Strip (read-only):**
- Shows: sign + amount + category name
- e.g. "− INR 3,200 · Grocery"

**Note Input:**
- `keyboardType="default"` (text keyboard opens)
- Placeholder: "Text" in muted (matching reference screenshots)
- Optional — no validation required

**Buttons:**
- Left: "Cancel"
- Right: "Done" (bg `#1E1058`, text `#EDD900`)
  Always enabled (user can skip note)

**On Done:**
1. Save transaction to database
2. Update `settingsStore.recentCategories`
3. Trigger `Haptics.notificationAsync(NotificationFeedbackType.Success)`
4. Close overlay
5. Show Toast notification (see below)

### Toast Notification

Appears at top of screen after transaction saved.
Auto-dismisses after 2500ms.
Slides down from top, fades out.

```
[ ✓ ]  Transaction added      ← white text
       − INR 3,200 · Grocery  ← muted white text, smaller
```

Style: bg `#1E1058`, borderRadius full, padding 10 14,
centered horizontally, position absolute top 48.

---

## 10. Back-Tap Native Module

### Detection Method

Use `expo-sensors` Accelerometer. No custom native module needed
for basic implementation. The accelerometer provides x, y, z values.
A tap on the back of the phone creates a characteristic spike pattern.

```typescript
// src/hooks/useBackTap.ts

import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';

const TAP_THRESHOLD = 1.8;        // spike magnitude to count as tap
const TAP_WINDOW_MS = 600;        // time window for 3 taps
const COOLDOWN_MS = 1500;         // minimum time between triggers

export function useBackTap(onTripleTap: () => void) {
  const tapsRef = useRef<number[]>([]);
  const lastTriggerRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude > TAP_THRESHOLD) {
        const now = Date.now();

        // Remove taps outside the window
        tapsRef.current = tapsRef.current.filter(
          t => now - t < TAP_WINDOW_MS
        );

        tapsRef.current.push(now);

        if (tapsRef.current.length >= 3) {
          if (now - lastTriggerRef.current > COOLDOWN_MS) {
            lastTriggerRef.current = now;
            tapsRef.current = [];
            onTripleTap();
          }
        }
      }
    });

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [onTripleTap]);
}
```

**Usage in root layout:**
```typescript
useBackTap(() => {
  overlayStore.openOverlay();
});
```

**Note on sensitivity:**
Add a sensitivity setting in Settings screen (Low / Medium / High)
that adjusts `TAP_THRESHOLD` between 1.5 and 2.2.
Store in `settingsStore.backTapSensitivity`.

---

## 11. Notifications

### Monthly Summary Notification

Fires on the 1st of every month at 9:00 AM.
Summarizes the previous month.

```typescript
// src/utils/notifications.ts

import * as Notifications from 'expo-notifications';

export async function scheduleMonthlySummary(
  incomeTotal: number,
  expenseTotal: number,
  netBalance: number,
  khumusDue: number,
  currency: string
) {
  // Cancel existing scheduled notification first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${getMonthName(now)} Summary`,
      body: `Income: ${currency} ${formatAmount(incomeTotal)} · Expense: ${currency} ${formatAmount(expenseTotal)} · Net: ${currency} ${formatAmount(netBalance)}${khumusDue > 0 ? ` · Khumus due: ${currency} ${formatAmount(khumusDue)}` : ''}`,
      data: { type: 'monthly_summary' },
    },
    trigger: {
      date: nextMonth,
    },
  });
}
```

Request notification permissions on app first launch.
Schedule on every app open (reschedules if already set, harmless).

---

## 12. Build Order

> Follow this order exactly. Do not skip ahead.
> Each phase must be fully working before starting the next.

### Phase 1 — Foundation (No UI)

**Goal:** Data layer is complete and tested before any screen is built.

Steps:
1. Create Expo project with TypeScript
2. Install all dependencies
3. Configure NativeWind + tailwind.config.js
4. Set up WatermelonDB schema (`src/db/schema.ts`)
5. Create model files (`Transaction.ts`, `Category.ts`, `Loan.ts`)
6. Create `src/db/index.ts` database instance
7. Write all queries in `src/queries/`
8. Seed default categories on first launch
9. Create `src/stores/settingsStore.ts` and `overlayStore.ts`
10. Create `src/theme/` files

**Verification before Phase 2:**
```typescript
// In a test component or console, verify:
// 1. Can insert a transaction
// 2. incomeTotal updates reactively after insert
// 3. expenseTotal updates reactively after insert
// 4. khumus_share is calculated correctly
// 5. khumus_share is null for loan categories
// 6. netBalance = incomeTotal - expenseTotal
// 7. Currency is stored correctly and not changed on settings update
```

### Phase 2 — Quick Entry Overlay + Basic Navigation

**Goal:** The most important user interaction works perfectly.

Steps:
1. Set up React Navigation (tabs + stack)
2. Build bottom tab bar with FAB center button
3. Build `QuickEntryOverlay` component (3 steps)
4. Build `useBackTap` hook
5. Wire back-tap → overlay open
6. Build `Toast` component
7. Wire overlay save → database → toast

**Verification before Phase 3:**
- Triple back-tap opens overlay
- FAB opens overlay
- Can enter amount, select category, add note
- Transaction saves to database
- Toast confirms save
- Loan categories lock direction
- Khumus categories show correct share

### Phase 3 — Core Screens

Steps:
1. Home screen (HeroCards, PendingStrip, RecentList)
2. Transaction History screen (list, search, filters)
3. Khumus screen
4. Loans screen
5. Pending screen

### Phase 4 — Reports + Polish

Steps:
1. Reports screen with Victory Native line chart
2. PDF export functionality
3. Full Add Transaction form (with inline calculator)
4. Settings screen (currency, categories, backup)
5. Monthly summary notification scheduling
6. Empty states for all screens
7. Animation polish with Reanimated

---

## 13. Component Library

Build these reusable components first in `src/components/ui/`.

### `<TransactionRow />`

```typescript
interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}
```

Layout: category icon box (34px, colored) + name/date column
(flex 1) + amount/badge column (right aligned).

- Category icon: colored square, borderRadius 10, 3-letter abbreviation
- Title: category name, 12px, weight 500, `#1A1040`
- Subtitle: date + method, 10px, `#9080B8`
- Amount: Space Mono 12px, green if IN, red if OUT, amber if loan
- Badge: `<StatusBadge />` component below amount
- Loan transactions: small chain-link icon before the name

### `<StatusBadge />`

```typescript
interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'partial' | 'cancelled';
  flow: 'IN' | 'OUT';
}
```

- completed + IN: "Received" badge, bg `#E8F8F0`, text `#22C87A`
- completed + OUT: "Paid" badge, bg `#FEEDED`, text `#E05C5C`
- pending: "Pending" badge, bg `#EFF6FF`, text `#3B82F6`
- partial: "Partial" badge, bg `#FFF8E0`, text `#F0B429`
- cancelled: "Cancelled" badge, bg `#F5F2FA`, text `#9080B8`

### `<AmountText />`

```typescript
interface AmountTextProps {
  amount: number;
  flow: 'IN' | 'OUT';
  currency: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

Always uses Space Mono font.
Color: `#22C87A` for IN, `#E05C5C` for OUT.
Prefixes: "+" for IN, "−" for OUT.
Format: currency + formatted number.

### `<Card />`

```typescript
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}
```

Standard white card: bg white, borderRadius 18px,
border 0.5px `#EEE8F8`, padding 14px.

---

## 14. Data Flow Examples

### Example: User logs salary of INR 45,000 via overlay

```
1. User triple-taps back of phone
2. useBackTap fires → overlayStore.openOverlay()
3. Overlay opens on Step 1
4. User taps "+" toggle → flow = 'IN'
5. User types 45000 on system keyboard
6. User taps "Next →" → Step 2
7. User taps "Salary" chip (recent) → category selected
8. Salary has khumus_eligible = true
9. App auto-calculates: khumus_share = 45000 / 5 = 9000
10. User taps "Next →" → Step 3
11. User taps "Done" without typing note
12. Transaction saved:
    { flow: 'IN', amount: 45000, currency: 'INR',
      category_id: salary.id, status: 'completed',
      method: 'cash', khumus_share: 9000, ... }
13. Khumus due query reactively updates: +9000
14. Income total reactively updates: +45000
15. Net balance reactively updates: +45000
16. Toast: "Transaction added · + INR 45,000 · Salary"
17. Overlay closes
```

---

## 15. Skills and Design Tools

### Frontend Design Skill
Location: /mnt/skills/public/frontend-design/SKILL.md

INSTRUCTION FOR CLAUDE CODE:
Before building ANY screen component or UI component,
read /mnt/skills/public/frontend-design/SKILL.md first.

Apply it specifically to these files:
- src/components/home/HeroCards.tsx
- src/components/home/RecentList.tsx
- src/components/overlay/QuickEntryOverlay.tsx
- src/components/overlay/StepAmount.tsx
- src/components/overlay/StepCategory.tsx
- src/components/overlay/StepNote.tsx
- src/components/ui/TransactionRow.tsx
- src/components/ui/StatusBadge.tsx
- src/components/ui/Toast.tsx
- app/(tabs)/index.tsx
- app/(tabs)/reports.tsx
- app/add.tsx

The skill must be read BEFORE writing any of these files.
Not after. Not during. BEFORE.

Design direction for this project:
- Tone: refined minimalist with purposeful color
- The ONE thing users remember: the stacked purple cards
  and yellow CTA — bold color used sparingly
- Every number uses Space Mono font — no exceptions
- The overlay feels like frosted glass floating over reality
- Badges and status indicators carry all the color weight
- Everything else is restrained: white cards, lavender bg,
  navy and violet as the only two dominant colors

### Example: User lends Ahmed INR 5,000

```
1. User opens overlay (FAB or back-tap)
2. Default flow = 'OUT' (minus)
3. User types 5000
4. User taps "Next →"
5. User selects "Loan Given" category
6. App detects is_loan_type = true:
   - Direction locks to OUT (already OUT, no change needed)
   - Person name field appears in Step 2
   - Info strip: "Direction set automatically for loans"
7. App shows person name field → user types "Ahmed"
8. khumus_share = null (because is_loan_type = true)
9. Transaction saved:
    { flow: 'OUT', amount: 5000, currency: 'INR',
      category_id: loanGiven.id, khumus_share: null,
      loan_id: newLoan.id, ... }
10. Loan record created:
    { type: 'lent', person_name: 'Ahmed',
      principal: 5000, currency: 'INR', status: 'active' }
11. Net balance decreases by 5000 (money left pocket — correct)
12. Khumus due: unchanged (loan never counts — correct)
13. Loans screen: Ahmed shows as Active, outstanding 5000
```

### Example: Settings currency changed from INR to USD

```
1. User opens Settings
2. Taps currency dropdown
3. Selects USD
4. Warning shows: "This will only affect new transactions.
   All existing records keep their original currency."
5. User confirms
6. settingsStore.defaultCurrency = 'USD'
7. All existing transactions: currency field UNCHANGED (still INR)
8. New transactions going forward: currency = 'USD'
9. Transaction history shows mixed:
   INR 45,000 · Salary
   USD 50 · Grocery
   INR 3,200 · Bills
   (each shows its own currency — no conversion)
```

---

## Final Notes for Claude Code

- **Always use TypeScript.** No `any` types. No `@ts-ignore`.
- **All colors from the theme file.** Never hardcode hex values in components.
- **All amounts display in Space Mono font.** No exceptions.
- **WatermelonDB queries must be reactive** — use `withObservables` HOC
  or `useQuery` hook so UI updates automatically when data changes.
- **Test the data layer in isolation** before building UI.
- **The overlay is a Modal, not a bottom sheet.**
- **System keyboard only for overlays.** No custom numpad.
- **Khumus_share is ALWAYS null for loan categories.** Enforce in code.
- **Currency is NEVER retroactively updated.** Enforce in code.
- **Build in Phase order.** Verify each phase before proceeding.

---

*Document version: 1.0 — Built for Claude Code execution*
*All decisions are final unless explicitly revised by the user.*
