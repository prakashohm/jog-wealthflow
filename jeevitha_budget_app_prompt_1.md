# Jeevitha Budget App — Full Build Prompt

## 📊 Context: What the Spreadsheet Does

This is a comprehensive personal finance tracker inspired by Ramit Sethi's *I Will Teach You to Be Rich* methodology. It has 5 tabs:

1. **Dashboard** — Monthly snapshot: net worth, income, liquid savings, retirement, current month's budget spend vs. remaining, annual budget spend, and a historical 7-month spending chart.
2. **Expenses** — Raw expense log (date, vendor, amount) spread across columns representing budget categories: Monthly (Grocery/Household, Car/Gas, Unusual, Restaurant & Entertainment) and Annual (Vacation, Car Insurance, Life Insurance, Tax, etc.).
3. **Balance Sheet** — Monthly time-series (columns = months from Dec 2025 onward) for every asset (bank accounts, 401K, IRA, investments, real estate, stock equity) and liability (mortgages, car loans, credit cards). Computes total assets, liabilities, net worth, income, liquid savings growth, retirement growth, rolling 3-month averages.
4. **Config** — Setup sheet: income breakdown (gross salary, 401K contribution, net salary, extra income), fixed monthly costs, monthly guilt-free budget categories with amounts, annual budget categories with amounts, bank/asset/liability nicknames, setup checklist.
5. **Rentals** — 4 rental properties: interest rate, property value, mortgage balance, P&I, escrow, total mortgage, rent, maintenance, rental income, net balance.

**Core Philosophy (Ramit Sethi):**
- Pay yourself first (auto-save before spending)
- Guilt-free spending within budgeted categories
- Track monthly AND annual irregular expenses separately
- Monitor net worth monthly

---

## 🎯 App Requirements

Build a **mobile-first, web-based personal finance app** that fully replicates and improves upon this spreadsheet. The app should work beautifully on phone and be deployable for free.

---

## 🛠 Recommended Tech Stack

### Frontend
- **Next.js 14** (App Router) — React framework, file-based routing, easy to debug in Cursor
- **TypeScript** — Better autocomplete, AI-friendlier code
- **Tailwind CSS** — Utility-first, mobile-first styling
- **shadcn/ui** — Beautiful pre-built components (cards, modals, tables)
- **Recharts** — Charts (spending history, net worth over time)
- **React Hook Form + Zod** — Form handling and validation

### Backend
- **Next.js API Routes** (built-in) — No separate server needed
- **Prisma ORM** — Type-safe database queries, easy to understand and debug

### Database
- **Supabase (PostgreSQL)** — Free tier, real-time capable, good dashboard for debugging data

### Auth
- **Clerk** (free tier) — Drop-in auth with phone/Google sign-in, extremely easy to set up

### Deployment
- **Vercel** — Free tier, one-click deploy from GitHub, instant previews, perfect with Next.js

### Why this stack for Cursor/AI debugging:
- All TypeScript = AI tools understand the full codebase
- Prisma generates typed queries = no SQL guessing
- Next.js has massive documentation = AI tools know it extremely well
- Shadcn components are copy-paste = easy to iterate
- Vercel logs errors in the dashboard = easy to diagnose prod issues

---

## 📋 Detailed Feature Specification

---

### 1. ONBOARDING / CONFIG (mirrors the Config tab)

**Page: `/setup`**

Users must complete setup before accessing the dashboard.

**Step 1 — Income Setup**
- Input: Gross monthly salary
- Input: Monthly 401K contribution
- Auto-calculate: Net salary (gross − 401K − taxes; allow user to input net directly)
- Input: Average extra monthly income (rental, freelance, etc.)
- Display: Gross Total Income, Net Total Income

**Step 2 — Fixed Monthly Costs**
Create a list of fixed costs with name + amount. Pre-populate suggestions:
- Annual Budget (monthly set-aside)
- IRA Contribution
- Primary Mortgage / HOA
- Other Mortgages
- Phone, Internet, Utilities
- Monthly Subscriptions
- Custom entries

**Step 3 — Guilt-Free Monthly Budget Categories**
Default categories (editable):
- Grocery and Household — default $1,000
- Car/Gas — default $250
- Unusual Expense — default $500
- Restaurant and Entertainment — default $500
- Add custom categories

Display: Total budget vs. total net income; warn if budget exceeds income.

**Step 4 — Annual Budget Categories**
Categories (editable with name + annual amount):
- Vacation
- Kids' Activities
- Car Insurance
- Amazon/Costco/CC Fees
- House Repairs/Maintenance
- Smart Home Subscriptions
- Car Maintenance
- Life Insurance
- Tax
- Custom entries

**Step 5 — Accounts Setup**
- Checking accounts (primary + others): nickname + type
- Savings accounts: nickname + type
- Retirement accounts: 401K, IRA — nickname + type
- Other assets: investments, 529, real estate, stock equity
- Liabilities: mortgages, car loans, credit cards

**Step 6 — Rental Properties** (optional section)
For each property:
- Address
- Property value
- Mortgage balance
- Interest rate
- P&I payment
- Escrow payment
- Monthly rent
- Monthly maintenance %
- Auto-calculate: Rental income, net balance

---

### 2. EXPENSE ENTRY (mirrors the Expenses tab)

**Page: `/expenses`**

This is the most-used screen on mobile. Design it for speed.

**Quick Add (Primary Action — Floating Button)**
Modal/bottom sheet with:
- Date (default: today)
- Vendor name (text input with autocomplete from past vendors)
- Amount (number input, numeric keyboard on mobile)
- Category selector (horizontal scrollable chips): shows monthly and annual categories
- Submit button

**Expense List View**
- Grouped by month (accordion or tabs)
- Each entry: date | vendor | category chip | amount
- Swipe-to-delete on mobile
- Tap to edit

**Filter/Search**
- Filter by category
- Filter by date range
- Search by vendor name

**Data Model:**
```
Expense {
  id
  userId
  date
  vendor
  amount
  categoryId  (FK → BudgetCategory)
  categoryType  (MONTHLY | ANNUAL)
  createdAt
}
```

---

### 3. DASHBOARD (mirrors the Dashboard tab)

**Page: `/` (home)**

**Section A — Overview Cards (top of page)**
Display as a 2-column card grid:
- Net Checking Balance (sum of all checking accounts from latest balance sheet entry)
- Total Monthly Income
- Total Liquid Savings
- Total Retirement
- Total Net Cash (checking + savings)
- Net Worth (total assets − total liabilities)

Each card shows: current value | previous month value | % growth (with up/down arrow color)

**Section B — This Month's Budget**
Progress bars for each monthly budget category:
- Category name
- Budgeted amount
- Amount spent (sum from Expenses this month)
- Remaining amount
- Progress bar (green → yellow → red as it fills)
- "Expenses last updated X days ago" warning if stale

Show total row: Budgeted | Spent | Remaining
Show total overspent (highlight red if > 0)

**Section C — This Year's Annual Budget**
Same layout as above but for annual categories. Show both $ spent and % of annual budget used.

**Section D — Spending Chart**
Line/bar chart: past 7 months, selectable category (dropdown)
- X-axis: months
- Y-axis: $ spent
- Toggle between: "vs. budget" view (show budget line) and "trend" view

**Section E — Quick Stats**
- Guilt-free spend remaining this month
- Days left in month
- Rental income this month

---

### 4. BALANCE SHEET (mirrors the Balance Sheet tab)

**Page: `/balance-sheet`**

**Monthly Entry Flow**
At the start/end of each month, user updates balances:
- Show all accounts in groups: Checking, Savings, Retirement, Other Assets, Liabilities
- Input fields pre-filled with last month's values
- Submit → saves as a snapshot for that month

**Balance Sheet History View**
- Month selector (dropdown or calendar)
- For selected month, show full balance sheet:
  - Assets (each account with value)
  - Total Assets
  - Liabilities (each account with value)
  - Total Liabilities
  - Net Worth

**Trend Cards** (below balance sheet)
- Liquid Savings: current | growth | growth rate | 3-month rolling average
- Retirement: current | growth | growth rate | 3-month rolling average
- Net Income: current | growth | 3-month rolling average
- Net Cash: current | growth rate | 3-month rolling average

**Monthly Expense Summary** (pulled from Expenses tab)
- Per-category spending for the month
- Net Spend = Monthly Budget − Total Spent

**Data Model:**
```
BalanceSheetEntry {
  id
  userId
  month  (Date, first of month)
  accountId  (FK → Account)
  value  (Decimal)
}

Account {
  id
  userId
  nickname
  type  (CHECKING | SAVINGS | RETIREMENT_PRETAX | RETIREMENT_AFTERTAX | ASSET | LIABILITY_MORTGAGE | LIABILITY_CAR | LIABILITY_CC)
  isActive
}
```

---

### 5. RENTALS PAGE (mirrors the Rentals tab)

**Page: `/rentals`**

**Property Cards**
Each rental property card shows:
- Address
- Property value
- Mortgage balance
- Interest rate
- Monthly: P&I | Escrow | Total Mortgage
- Monthly: Rent | Maintenance | Rental Income | Net Balance
- Color-coded balance: green if positive, red if negative

**Totals Row**
- Totals across all properties for each field

**Add/Edit Property**
Form with all fields. Maintenance can be input as $ or % of rent (auto-calculate).

**Summary Stats**
- Total monthly rental income
- Total monthly cash flow (net across all properties)
- Total equity across properties (property value − mortgage balance)

---

### 6. NET WORTH CHART PAGE

**Page: `/net-worth`**

- Line chart: net worth over time (all months entered)
- Stacked area chart: Assets vs. Liabilities over time
- Bar chart: asset composition by type (savings, retirement, real estate, investments)
- Summary: CAGR since first entry

---

### 7. SETTINGS PAGE

**Page: `/settings`**

- Edit all Config data (income, budgets, accounts)
- Edit rental properties
- Manage categories (add/rename/archive)
- Export data as CSV
- Account management (via Clerk)

---

## 🗃 Full Database Schema (Prisma)

```prisma
model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique
  email       String
  createdAt   DateTime @default(now())
  
  config      Config?
  accounts    Account[]
  categories  BudgetCategory[]
  expenses    Expense[]
  balanceEntries BalanceSheetEntry[]
  properties  RentalProperty[]
}

model Config {
  id                    String  @id @default(cuid())
  userId                String  @unique
  user                  User    @relation(fields: [userId], references: [id])
  grossMonthlySalary    Decimal
  monthlyRetirementContrib Decimal
  netMonthlySalary      Decimal
  avgExtraMonthlyIncome Decimal
  setupComplete         Boolean @default(false)
}

model Account {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  nickname   String
  type       AccountType
  isActive   Boolean     @default(true)
  sortOrder  Int
  
  balanceEntries BalanceSheetEntry[]
}

enum AccountType {
  PRIMARY_CHECKING
  OTHER_CHECKING
  SAVINGS
  RETIREMENT_PRETAX
  RETIREMENT_AFTERTAX
  INVESTMENT
  REAL_ESTATE
  OTHER_ASSET
  MORTGAGE
  CAR_LOAN
  CREDIT_CARD
  OTHER_LIABILITY
}

model BudgetCategory {
  id         String       @id @default(cuid())
  userId     String
  user       User         @relation(fields: [userId], references: [id])
  name       String
  type       CategoryType // MONTHLY | ANNUAL | FIXED
  budgetAmount Decimal
  sortOrder  Int
  isActive   Boolean      @default(true)
  
  expenses   Expense[]
}

enum CategoryType {
  MONTHLY
  ANNUAL
  FIXED_COST
}

model Expense {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  date       DateTime
  vendor     String
  amount     Decimal
  categoryId String
  category   BudgetCategory @relation(fields: [categoryId], references: [id])
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model BalanceSheetEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  month     DateTime // Always first of month
  accountId String
  account   Account  @relation(fields: [accountId], references: [id])
  value     Decimal
  
  @@unique([userId, month, accountId])
}

model RentalProperty {
  id              String  @id @default(cuid())
  userId          String
  user            User    @relation(fields: [userId], references: [id])
  address         String
  propertyValue   Decimal
  mortgageBalance Decimal
  interestRate    Decimal
  principalInterest Decimal
  escrow          Decimal
  monthlyRent     Decimal
  maintenancePct  Decimal @default(0.10) // 10% of rent
  isActive        Boolean @default(true)
}
```

---

## 📱 Mobile UX Requirements

- **Bottom navigation bar** with 5 icons: Dashboard | Expenses | Balance Sheet | Rentals | Settings
- **FAB (Floating Action Button)** on Dashboard and Expenses pages → quick add expense
- Touch targets minimum 44px
- Numbers formatted with commas and 2 decimal places
- Currency always shows $ prefix
- Negative numbers in red, positive in green
- Swipe gestures on expense list items (swipe left = delete, swipe right = edit)
- Pull-to-refresh on dashboard
- Offline-first: cache last state, sync when reconnected (use React Query)
- Bottom sheets instead of modals for forms on mobile

---

## 🚀 Deployment & Free Hosting Plan

| Service | Free Tier |
|---|---|
| Vercel | 100GB bandwidth, unlimited deploys |
| Supabase | 500MB DB, 2GB bandwidth, 50MB file storage |
| Clerk | 10,000 MAU free |
| GitHub | Free repo (private) |

**Deploy steps:**
1. Push code to GitHub
2. Connect Vercel to GitHub repo → auto-deploys on push
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` (Supabase connection string)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Run `npx prisma migrate deploy` via Vercel build command
5. Done — app lives at `yourapp.vercel.app`

---

## 📁 Recommended Folder Structure

```
/app
  /layout.tsx                  — Root layout with Clerk provider
  /page.tsx                    — Dashboard
  /expenses/page.tsx
  /balance-sheet/page.tsx
  /rentals/page.tsx
  /net-worth/page.tsx
  /settings/page.tsx
  /setup/page.tsx
  /api
    /expenses/route.ts
    /balance-sheet/route.ts
    /rentals/route.ts
    /config/route.ts
/components
  /dashboard
    /OverviewCards.tsx
    /BudgetProgress.tsx
    /SpendingChart.tsx
  /expenses
    /ExpenseList.tsx
    /AddExpenseModal.tsx
    /ExpenseItem.tsx
  /balance-sheet
    /BalanceInput.tsx
    /TrendCard.tsx
  /rentals
    /PropertyCard.tsx
  /ui                          — shadcn components
  /layout
    /BottomNav.tsx
    /FAB.tsx
/lib
  /prisma.ts                   — Prisma client singleton
  /calculations.ts             — Net worth, budget, growth rate logic
  /formatters.ts               — Currency, percent, date formatters
/prisma
  /schema.prisma
  /migrations/
```

---

## 🧮 Key Calculations to Implement

```typescript
// Net Worth
netWorth = totalAssets - totalLiabilities

// Liquid Savings Growth Rate
growthRate = (currentMonth - previousMonth) / previousMonth

// 3-Month Rolling Average
rollingAvg = (month1 + month2 + month3) / 3

// Monthly Budget Remaining
remaining = budgetAmount - sumOfExpensesThisMonth(categoryId)

// Annual Budget Remaining
annualRemaining = annualBudget - sumOfExpensesThisYear(categoryId)

// Rental Net Balance
netBalance = monthlyRent - totalMortgage - (monthlyRent * maintenancePct)

// Guilt-Free Budget
guiltFreeBudget = netMonthlySalary + avgExtraMonthlyIncome - totalFixedCosts

// Total Income
totalNetIncome = netSalary + rentalIncome + otherIncome
```

---

## 🌟 Improvements Over the Spreadsheet

1. **Mobile-native**: Add expenses in seconds from your phone instead of opening Excel
2. **Vendor autocomplete**: Learns your vendors over time
3. **Stale data warnings**: Automatic alerts when expenses or balance sheet haven't been updated
4. **Push notifications** (future): "You've spent 80% of your grocery budget"
5. **Multi-user**: Potentially share with spouse (different Clerk users, same data)
6. **Charts**: Interactive, zoomable, not static Excel charts
7. **No formula errors**: All calculations in code, not fragile spreadsheet formulas
8. **Audit log**: Every change is timestamped

---

## ⚡ Suggested Build Order

1. Set up Next.js + Clerk + Supabase + Prisma + shadcn
2. Build Setup/Config flow (income, budgets, accounts)
3. Build Expense entry and list
4. Build Dashboard with budget progress bars
5. Build Balance Sheet monthly entry
6. Build Balance Sheet history + trend cards
7. Build Rentals page
8. Build charts (spending history, net worth over time)
9. Polish mobile UX (bottom nav, FAB, swipe gestures)
10. Deploy to Vercel
