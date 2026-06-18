# Bucr Frontend Specification - Complete Index

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 📚 Documentation Structure

| Part | File | Description |
|------|------|-------------|
| **Part 1** | `FRONTEND_SPEC_PART1_DESIGN_SYSTEM.md` | Colors, typography, spacing, icons |
| **Part 2** | `FRONTEND_SPEC_PART2_ARCHITECTURE.md` | Tech stack, caching, state management |
| **Part 3** | `FRONTEND_SPEC_PART3_USER_WEB_APP.md` | User web application screens |
| **Part 4** | `FRONTEND_SPEC_PART4_VENDOR_PORTAL.md` | Vendor portal & QR scanner |
| **Part 5** | `FRONTEND_SPEC_PART5_ADMIN_PORTAL.md` | Admin dashboard & management |
| **Part 6** | `FRONTEND_SPEC_PART6_MOBILE_APP.md` | React Native mobile app |

---

## 🎨 Brand Summary

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Ocean Blue** | `#3B82F6` | Primary, CTAs, links |
| **Sky Blue** | `#60A5FA` | Hover states, accents |
| **Oak Brown** | `#A67C52` | Secondary, warmth |
| **Tan** | `#D4A574` | Backgrounds, highlights |
| **Charcoal** | `#1F2937` | Primary text |
| **White** | `#FFFFFF` | Backgrounds |
| **Success** | `#10B981` | Confirmations |
| **Warning** | `#F59E0B` | Alerts |
| **Error** | `#EF4444` | Errors |

### Typography

| Font | Usage |
|------|-------|
| **Inter** | Body text, UI elements |
| **Plus Jakarta Sans** | Display headlines |
| **JetBrains Mono** | Codes, PINs, prices |

---

## 🏗️ Platform Summary

### Applications

| Platform | Technology | Screens |
|----------|------------|---------|
| **User Web** | Next.js 14+ | ~15 pages |
| **Vendor Portal** | Next.js 14+ | ~20 pages |
| **Admin Portal** | Next.js 14+ | ~15 pages |
| **Mobile App** | React Native (Expo) | ~25 screens |

### Shared Packages

```
packages/
├── ui/           → Shared UI components
├── api-client/   → API services & hooks
├── utils/        → Formatters, validators
└── config/       → Tailwind, TypeScript configs
```

---

## 🔑 Key Features by Platform

### User App (Web + Mobile)

| Feature | Description |
|---------|-------------|
| Discovery | Browse, search, filter restaurants |
| Venue Details | Gallery, menu, reviews, info |
| Booking | Date/time selection, credit deposit |
| QR Check-in | QR code + PIN for arrival |
| Wallet | Buy credits, view balance/history |
| Favorites | Save restaurants |
| Reviews | Write verified reviews |

### Vendor Portal

| Feature | Description |
|---------|-------------|
| Dashboard | Today's bookings, stats |
| **QR Scanner** | Camera scan or PIN entry for check-in |
| Reservations | Manage upcoming/past bookings |
| Orders | Takeout order management |
| Menu | Add/edit items with prices |
| Gallery | Upload photos |
| Guest CRM | Guest profiles, preferences, notes |
| Analytics | Performance metrics (Pro/Premium) |

### Admin Portal

| Feature | Description |
|---------|-------------|
| Dashboard | Platform overview, pending actions |
| Users | User management, credit adjustments |
| Vendors | Vendor approval, subscription management |
| Documents | CAC/TIN verification workflow |
| Credits | Transaction monitoring, manual adjustments |
| Analytics | Platform-wide metrics |

---

## 📱 QR Code Check-in Flow

```
                    GUEST                              VENDOR
                      │                                   │
         ┌────────────┴────────────┐                      │
         │                         │                      │
    [Mobile App]             [Web Booking]                │
         │                         │                      │
         └────────────┬────────────┘                      │
                      │                                   │
                      ▼                                   │
              ┌──────────────┐                            │
              │  QR Code +   │                            │
              │  4-digit PIN │                            │
              └──────────────┘                            │
                      │                                   │
                      │         Guest shows QR            │
                      │◀────────────────────────────────▶│
                      │                                   │
                      │                           ┌───────┴───────┐
                      │                           │               │
                      │                      [QR Scan]      [PIN Entry]
                      │                           │               │
                      │                           └───────┬───────┘
                      │                                   │
                      │                                   ▼
                      │                           ┌──────────────┐
                      │                           │   Verify &   │
                      │                           │   Check-in   │
                      │                           └──────────────┘
                      │                                   │
                      │                                   ▼
                      │                           ┌──────────────┐
                      │                           │   Credits    │
              ┌───────┴───────┐                   │   Refunded   │
              │   Push Notif  │◀──────────────────│   + 5% Bonus │
              │   "Checked In"│                   └──────────────┘
              └───────────────┘
```

---

## ⚡ Performance Targets

| Metric | Web Target | Mobile Target |
|--------|------------|---------------|
| LCP | < 2.5s | - |
| FID | < 100ms | - |
| CLS | < 0.1 | - |
| App Launch | - | < 2s |
| Bundle (initial) | < 100KB | < 2MB |
| TTI | < 3.8s | < 3s |

---

## 🔄 Caching Strategy Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **CDN** | Vercel Edge | Static assets, ISR pages |
| **Service Worker** | Workbox | Offline support (PWA) |
| **Query Cache** | TanStack Query | API response caching |
| **Local Storage** | localStorage/AsyncStorage | User preferences |

---

## 🚀 Implementation Priority

### Phase 1: Foundation (Week 1-2)
- [ ] Monorepo setup (Turborepo + pnpm)
- [ ] Shared packages (ui, api-client, utils)
- [ ] Design system implementation
- [ ] Authentication flows

### Phase 2: User Web App (Week 3-4)
- [ ] Landing page
- [ ] Discovery/search
- [ ] Venue detail
- [ ] Booking flow
- [ ] User dashboard
- [ ] Wallet

### Phase 3: Vendor Portal (Week 5-6)
- [ ] Dashboard
- [ ] **QR Scanner (critical)**
- [ ] Reservations management
- [ ] Menu management
- [ ] Settings

### Phase 4: Admin Portal (Week 7)
- [ ] Dashboard
- [ ] User management
- [ ] Vendor management
- [ ] Document verification

### Phase 5: Mobile App (Week 8-10)
- [ ] Navigation setup
- [ ] Home/discovery
- [ ] Venue detail
- [ ] Booking flow
- [ ] QR code display
- [ ] Wallet
- [ ] Push notifications

### Phase 6: Polish & Launch (Week 11-12)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Testing
- [ ] App store submission

---

## 📦 Key Dependencies

### Web (All Portals)

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "latest",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.0.0",
  "react-hook-form": "^7.0.0",
  "zod": "^3.0.0",
  "framer-motion": "^10.0.0",
  "recharts": "^2.0.0",
  "lucide-react": "latest",
  "date-fns": "^3.0.0"
}
```

### Mobile

```json
{
  "expo": "~50.0.0",
  "react-native": "0.73.0",
  "expo-router": "~3.0.0",
  "nativewind": "^4.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.0.0",
  "expo-camera": "latest",
  "expo-barcode-scanner": "latest",
  "react-native-reanimated": "^3.0.0",
  "moti": "^0.27.0",
  "@gorhom/bottom-sheet": "^4.0.0",
  "expo-secure-store": "latest",
  "expo-notifications": "latest"
}
```

---

## 📝 Notes for Development

1. **QR Scanner Priority**: The vendor QR scanner is critical for the business model. Implement early and test thoroughly.

2. **Offline Support**: Mobile app must work offline for viewing bookings and displaying QR codes.

3. **Real-time Updates**: Consider WebSockets or polling for:
   - Vendor: New bookings, check-ins
   - User: Booking status changes

4. **Accessibility**: Ensure WCAG 2.1 AA compliance, especially for:
   - Color contrast
   - Screen reader support
   - Touch targets (48x48 minimum)

5. **Localization Ready**: Structure for future i18n support (English first, then local languages).

6. **Error Boundaries**: Implement graceful error handling to prevent app crashes.

7. **Analytics Events**: Track key events:
   - Search queries
   - Booking attempts/completions
   - Check-in success/failure
   - Credit purchases
