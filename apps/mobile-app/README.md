# Bucr Mobile App

React Native (Expo) mobile application for iOS and Android users to discover restaurants, make reservations, and manage their Bucr wallet.

## Features

- **Authentication**: Login, Register, Forgot Password
- **Discovery**: Browse and search restaurants by name, cuisine, or location
- **Venue Details**: View restaurant info, photos, reviews, and credit requirements
- **Reservations**: Book tables, view upcoming/past reservations, cancel bookings
- **Wallet**: View credit balance, purchase credits, transaction history
- **Profile**: Manage account, favorites, and settings

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 (Native Stack + Bottom Tabs)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React Native

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Install dependencies:
   ```bash
   cd apps/mobile-app
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your API URL:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
   ```

4. **Push notifications (optional):** Expo requires a valid EAS project UUID for `getExpoPushTokenAsync` in production builds. Run `eas init` in this app folder, copy the project ID from [expo.dev](https://expo.dev), then set:
   ```
   EXPO_PUBLIC_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
   If this is unset or not a UUID, the app skips remote push registration instead of failing with a 400 from Expo.

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

## Project Structure

```
src/
├── components/
│   └── ui/           # Reusable UI components (Button, Input, etc.)
├── lib/
│   ├── api.ts        # API client with axios
│   ├── config.ts     # App configuration
│   └── utils.ts      # Utility functions
├── navigation/
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   ├── HomeNavigator.tsx
│   ├── RootNavigator.tsx
│   └── types.ts      # Navigation type definitions
├── screens/
│   ├── auth/         # Login, Register, ForgotPassword
│   └── main/         # Home, Search, Reservations, Wallet, Profile, etc.
├── stores/
│   └── auth.store.ts # Zustand auth store
└── styles/
    └── global.css    # Tailwind/NativeWind styles
```

## Credit System

| Party Size | Credits Required |
|------------|-----------------|
| 1-2 guests | 50 credits      |
| 3-6 guests | 100 credits     |
| 7+ guests  | 200 credits     |

- Credits are held when booking
- 100% refund + 5% bonus when you show up
- Credits forfeited for no-shows

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## License

Private - All rights reserved.
