# 💰 Budget Tracker — Expo Mobile App

A full-featured personal finance mobile app built with Expo and React Native, ported from the web Budget Tracker.

---

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Balance overview, income vs expenses, category stats, budget summary, recent transactions |
| **Budget** | Collapsible budget tables for Income, Expenses, Bills, Savings, Debts, Subscriptions |
| **Transactions** | Log, edit, delete transactions with filtering, search, and category badges |
| **Analytics** | Budget vs Real bar chart, utilization bars, category breakdown, top spending |
| **Settings** | Month/year picker, multi-currency with live rates, initial balance editor, reset |

---

## 🚀 Setup Instructions

### 1. Prerequisites

- **Node.js 18+**: Download from https://nodejs.org
- **Expo CLI**: Installed automatically with npx
- **Expo Go app** on your phone (for instant testing without a Mac/Xcode):
  - iOS: https://apps.apple.com/app/expo-go/id982107779
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### 2. Install dependencies

```bash
cd BudgetApp
npm install
```

### 3. Start the development server

```bash
npx expo start
```

This opens the Expo Dev Tools in your browser.

### 4. Run on your device

**Option A — Expo Go (easiest, no build needed):**
1. Open Expo Go on your phone
2. Scan the QR code shown in the terminal
3. App loads instantly ✅

**Option B — iOS Simulator (Mac only):**
```bash
npx expo start --ios
```
Requires Xcode installed.

**Option C — Android Emulator:**
```bash
npx expo start --android
```
Requires Android Studio + AVD set up.

---

## 🏗️ Project Structure

```
BudgetApp/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Tab navigation layout
│   ├── index.tsx           # Dashboard screen
│   ├── budget.tsx          # Budget tables screen
│   ├── transactions.tsx    # Transaction tracker screen
│   ├── analytics.tsx       # Charts & analytics screen
│   └── settings.tsx        # Settings screen
│
├── components/             # (Reserved for shared components)
│
├── constants/
│   ├── theme.ts            # Colors, categories, currencies
│   └── seed.ts             # Initial seed data (same as web app)
│
├── store/
│   └── useStore.ts         # Zustand state management + AsyncStorage
│
├── utils/
│   └── format.ts           # Currency formatting, date helpers
│
├── app.json                # Expo config
├── babel.config.js
├── package.json
└── tsconfig.json
```

---

## ✨ Features

- 📊 **Dashboard** — Live balance, income vs expenses comparison, budget summary table
- 📋 **Budget tables** — Collapsible cards per category, tap to edit, swipe-style delete
- 💸 **Transactions** — Full CRUD, category/sub-category filtering, search, month view
- 📈 **Analytics** — Pure React Native charts (no extra chart library needed), breakdown by sub-category
- 🌍 **Multi-currency** — 7 currencies with live exchange rates from open.er-api.com
- 💾 **Persistent storage** — AsyncStorage keeps your data between sessions
- 🌑 **Dark theme** — Matches the web app's aesthetic exactly

---

## 🔧 Building for Production

### Android APK (no account needed for testing):
```bash
npx expo build:android
# or with EAS (recommended):
npx eas build --platform android --profile preview
```

### iOS IPA:
```bash
npx eas build --platform ios
```
> Note: iOS builds require an Apple Developer account ($99/year).

### EAS Build setup:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `zustand` | Lightweight state management |
| `@react-native-async-storage/async-storage` | Persistent local storage |
| `react-native-safe-area-context` | Safe area handling |
| `@expo/vector-icons` | Ionicons icon set |

---

## 🎨 Customisation

- **Colors**: Edit `constants/theme.ts` → `Colors` object
- **Seed data**: Edit `constants/seed.ts` to change default budget rows
- **Categories**: Edit `CATEGORY_LIST` in `constants/theme.ts`
- **Currency**: Add more in `CURRENCIES` array in `constants/theme.ts`

---

## 🐛 Troubleshooting

**"Metro bundler" errors:**
```bash
npx expo start --clear
```

**Module not found errors:**
```bash
rm -rf node_modules
npm install
```

**AsyncStorage warnings:**
These are harmless — the app still works correctly.

**Network request failed (exchange rates):**
The app uses fallback rates if the API is unavailable. No action needed.
