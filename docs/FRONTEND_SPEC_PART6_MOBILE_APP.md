# Bucr Frontend Specification - Part 6: Mobile Application (React Native)

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 1. App Structure & Navigation

### 1.1 Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPO ROUTER STRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  app/                                                            │
│  ├── _layout.tsx              Root layout (providers)            │
│  ├── index.tsx                Splash/redirect                    │
│  │                                                               │
│  ├── (auth)/                  Auth group (no tabs)               │
│  │   ├── _layout.tsx          Stack navigator                    │
│  │   ├── welcome.tsx          Welcome/onboarding                 │
│  │   ├── login.tsx            Login screen                       │
│  │   ├── register.tsx         Registration                       │
│  │   ├── forgot-password.tsx  Password reset                     │
│  │   └── verify.tsx           OTP verification                   │
│  │                                                               │
│  ├── (tabs)/                  Main app (tab navigator)           │
│  │   ├── _layout.tsx          Tab bar layout                     │
│  │   ├── index.tsx            Home/Discover                      │
│  │   ├── search.tsx           Search                             │
│  │   ├── bookings.tsx         My Bookings                        │
│  │   ├── wallet.tsx           Wallet                             │
│  │   └── profile.tsx          Profile                            │
│  │                                                               │
│  ├── venue/                   Venue screens (stack)              │
│  │   ├── [slug].tsx           Venue detail                       │
│  │   ├── [slug]/menu.tsx      Full menu                          │
│  │   ├── [slug]/reviews.tsx   All reviews                        │
│  │   ├── [slug]/gallery.tsx   Photo gallery                      │
│  │   └── [slug]/book.tsx      Booking flow                       │
│  │                                                               │
│  ├── booking/                 Booking screens                    │
│  │   ├── [id].tsx             Booking detail                     │
│  │   ├── [id]/qr.tsx          QR code display                    │
│  │   ├── [id]/modify.tsx      Modify booking                     │
│  │   └── confirm.tsx          Confirmation                       │
│  │                                                               │
│  ├── wallet/                  Wallet screens                     │
│  │   ├── buy.tsx              Buy credits                        │
│  │   └── history.tsx          Transaction history                │
│  │                                                               │
│  ├── order/                   Takeout order screens              │
│  │   ├── [id].tsx             Order detail                       │
│  │   └── checkout.tsx         Checkout                           │
│  │                                                               │
│  └── settings/                Settings screens                   │
│      ├── edit-profile.tsx     Edit profile                       │
│      ├── notifications.tsx    Notification prefs                 │
│      └── help.tsx             Help & support                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Tab Bar

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      [SCREEN CONTENT]                           │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐           │
│  │   🏠    │   🔍    │   📅    │   💳    │   👤    │           │
│  │  Home   │ Search  │Bookings │ Wallet  │ Profile │           │
│  │         │         │   (2)   │         │         │           │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘           │
└─────────────────────────────────────────────────────────────────┘

Tab Configuration:
- Active: Primary blue (#3B82F6), filled icon
- Inactive: Gray (#9CA3AF), outlined icon
- Badge: Red dot for notifications/count
- Height: 60px (iOS), 56px (Android)
- Safe area: Respected on all devices
```

---

## 2. Screen Designs

### 2.1 Home/Discover Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│  ← Status bar
├─────────────────────────────────────────┤
│                                         │
│  📍 Victoria Island, Lagos         🔔  │  ← Location + notifications
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔍 Search restaurants, cuisines... ││  ← Search bar (tappable)
│  └─────────────────────────────────────┘│
│                                         │
│  [🍝 Italian] [🍜 Chinese] [🍗 Local]  │  ← Category chips (scroll)
│  [🍕 Pizza] [🍣 Sushi] [☕ Cafe] →      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Near You                    See all → │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ [Image] │ │ [Image] │ │ [Image] │  │  ← Horizontal scroll
│  │ ★4.8    │ │ ★4.7    │ │ ★4.9    │  │
│  │ La Tav  │ │ Dynasty │ │ Azura   │  │
│  │ Italian │ │ Chinese │ │ African │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  Trending This Week          See all → │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ [Image] │ │ [Image] │ │ [Image] │  │
│  │ ★4.6    │ │ ★4.8    │ │ ★4.5    │  │
│  │ Nok     │ │ Craft   │ │ Cafés   │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  Featured Experiences        See all → │
│  ┌─────────────────────────────────────┐│
│  │ [Large Image]                       ││
│  │ 🍷 Wine Tasting at La Taverna      ││
│  │ ₦25,000 per person • Sat, Feb 1    ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅]   [💳]   [👤]     │  ← Tab bar
└─────────────────────────────────────────┘
```

### 2.2 Search Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔍 Italian restaurants          ✕  ││  ← Active search input
│  └─────────────────────────────────────┘│
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │📍Near  │ │⭐ 4.5+ │ │💰 $$  │ [⚙]  │  ← Quick filters
│  └────────┘ └────────┘ └────────┘      │
│                                         │
│  24 results for "Italian"               │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ┌──────┐ La Taverna Italiana       ││
│  │ │[img] │ ★ 4.8 (324) • Italian     ││
│  │ │      │ ₦₦₦ • Victoria Island     ││
│  │ └──────┘ 1.2 km away            ♡  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ┌──────┐ Bella Italia              ││
│  │ │[img] │ ★ 4.5 (187) • Italian     ││
│  │ │      │ ₦₦ • Lekki Phase 1        ││
│  │ └──────┘ 3.5 km away            ♡  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ┌──────┐ Piccolo Mondo             ││
│  │ │[img] │ ★ 4.7 (256) • Italian     ││
│  │ │      │ ₦₦₦₦ • Ikoyi              ││
│  │ └──────┘ 2.1 km away            ♡  ││
│  └─────────────────────────────────────┘│
│                                         │
│                  ↓ Load more            │
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅]   [💳]   [👤]     │
└─────────────────────────────────────────┘
```

### 2.3 Venue Detail Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │           [Gallery Image]           │ │  ← Swipeable gallery
│ │                                     │ │
│ │  ←                          1/8  ♡ │ │  ← Back, count, favorite
│ │                                     │ │
│ │           ●●●○○○○○                  │ │  ← Page indicators
│ └─────────────────────────────────────┘ │
│                                         │
│  La Taverna Italiana                    │
│  ★ 4.8 (324 reviews) • Italian • ₦₦₦   │
│  ✓ Verified  ⭐ Trusted                 │
│                                         │
│  📍 12 Awolowo Road, Ikoyi    [Map →]  │
│  🕐 Open until 11:00 PM                 │
│  📞 +234 801 234 5678                   │
│                                         │
│  [Overview] [Menu] [Reviews] [Photos]   │  ← Tab pills
│  ─────────────────────────────────────  │
│                                         │
│  About                                  │
│  Authentic Italian dining in the heart  │
│  of Ikoyi. Our chef brings 20 years of │
│  experience from Naples...  [Read more] │
│                                         │
│  Highlights                             │
│  🍷 Full bar   🌿 Vegan   🅿️ Parking   │
│  🎵 Live music (Fri-Sat)               │
│                                         │
│  Popular Dishes                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ [Image] │ │ [Image] │ │ [Image] │  │
│  │Margherit│ │Carbonara│ │Tiramisu │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  Reserve a Table                    │ │  ← Sticky bottom CTA
│ │  Deposit: 50 credits • Refundable   │ │
│ │           [Reserve Now]             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.4 Booking Flow (Bottom Sheet)

```
┌─────────────────────────────────────────┐
│                                         │
│        (Dimmed venue screen)            │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  ───────────────                        │  ← Drag handle
│                                         │
│  Reserve a Table                    ✕   │
│                                         │
│  📅 Date                                │
│  ┌─────────────────────────────────────┐│
│  │ Friday, January 24, 2026         ▼ ││
│  └─────────────────────────────────────┘│
│                                         │
│  🕐 Time                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │6:00 │ │6:30 │ │7:00 │ │7:30 │ →    │  ← Horizontal scroll
│  │ PM  │ │ PM  │ │ PM ●│ │ PM  │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  👥 Party Size                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │  1  │ │  2 ●│ │  3  │ │  4  │ →    │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  Special Requests (optional)            │
│  ┌─────────────────────────────────────┐│
│  │ Birthday, dietary needs, etc...    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Deposit        50 credits (₦5,000)     │
│  Your Balance   150 credits             │
│  After Booking  100 credits             │
│                                         │
│  ✓ Refunded on arrival + 5% bonus      │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │         Confirm Reservation         ││  ← Primary button
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 2.5 Booking Confirmation Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                         │
│                  ✓                      │
│                                         │
│         Booking Confirmed!              │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │            [QR CODE]                ││
│  │             150x150                 ││
│  │                                     ││
│  │         Reference: BKR-ABC123       ││
│  │             PIN: 4829               ││
│  │                                     ││
│  │         [Show Full Screen]          ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  🍕 La Taverna Italiana            ││
│  │  📅 Friday, January 24, 2026       ││
│  │  🕐 7:00 PM                        ││
│  │  👥 2 guests                       ││
│  │  📍 12 Awolowo Road, Ikoyi         ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  💳 50 credits deposited           ││
│  │  ✓ Refunded + 5% bonus at check-in ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐        │
│  │ 📅    │ │ 🗺️    │ │ 📤    │        │
│  │Add to │ │ Get   │ │Share  │        │
│  │ Cal   │ │Direct.│ │       │        │
│  └───────┘ └───────┘ └───────┘        │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           View My Bookings          ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅]   [💳]   [👤]     │
└─────────────────────────────────────────┘
```

### 2.6 My Bookings Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                         │
│  My Bookings                            │
│                                         │
│  [Upcoming (2)] [Past] [Cancelled]      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Tomorrow                               │
│  ┌─────────────────────────────────────┐│
│  │ ┌──────┐ La Taverna Italiana       ││
│  │ │[img] │ 📅 Jan 24 • 7:00 PM       ││
│  │ │      │ 👥 2 guests               ││
│  │ └──────┘ BKR-ABC123                ││
│  │                                     ││
│  │ [View QR]  [Directions]  [Modify]  ││
│  └─────────────────────────────────────┘│
│                                         │
│  Saturday                               │
│  ┌─────────────────────────────────────┐│
│  │ ┌──────┐ Dynasty Chinese           ││
│  │ │[img] │ 📅 Jan 25 • 8:30 PM       ││
│  │ │      │ 👥 4 guests               ││
│  │ └──────┘ BKR-DEF456                ││
│  │                                     ││
│  │ [View QR]  [Directions]  [Modify]  ││
│  └─────────────────────────────────────┘│
│                                         │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💡 Tip: Show your QR code when you    │
│     arrive to check in and get your    │
│     credits back + 5% bonus!           │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅●]  [💳]   [👤]     │
└─────────────────────────────────────────┘
```

### 2.7 Wallet Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                         │
│  My Wallet                              │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  ╭───────────────────────────────╮  ││
│  │  │                               │  ││  ← Card style
│  │  │  💳 Bucr Credits              │  ││
│  │  │                               │  ││
│  │  │      150 credits              │  ││
│  │  │      ₦15,000 value            │  ││
│  │  │                               │  ││
│  │  │  ⚠️ 30 credits expire in 25d  │  ││
│  │  │                               │  ││
│  │  ╰───────────────────────────────╯  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           Buy More Credits          ││
│  └─────────────────────────────────────┘│
│                                         │
│  Recent Transactions           See all →│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ + Credit Purchase           Jan 20 ││
│  │   +100 credits                     ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ - Reservation Deposit       Jan 20 ││
│  │   -50 credits • La Taverna         ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ + Check-in Refund + Bonus   Jan 19 ││
│  │   +52 credits • Dynasty            ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ + Referral Bonus            Jan 18 ││
│  │   +20 credits                      ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅]   [💳●]  [👤]     │
└─────────────────────────────────────────┘
```

### 2.8 QR Code Full Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                    ✕    │
│                                         │
│                                         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │                                     ││
│  │                                     ││
│  │            [QR CODE]                ││
│  │              250x250                ││  ← Large, scannable
│  │                                     ││
│  │                                     ││
│  │                                     ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│          Reference: BKR-ABC123          │
│                                         │
│              PIN: 4829                  │  ← Large, visible
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  La Taverna Italiana                    │
│  Friday, January 24 • 7:00 PM           │
│  2 guests                               │
│                                         │
│                                         │
│  💡 Show this QR code to the host       │
│     when you arrive                     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🔆 Screen brightness increased         │  ← Auto-brighten
│                                         │
└─────────────────────────────────────────┘
```

### 2.9 Profile Screen

```
┌─────────────────────────────────────────┐
│ ▣ 9:41                            🔋 ▮▮▮│
├─────────────────────────────────────────┤
│                                         │
│           ┌───────┐                     │
│           │       │                     │
│           │ [Avi] │                     │  ← Avatar
│           │       │                     │
│           └───────┘                     │
│        Chidera Okonkwo                  │
│      chidera@email.com                  │
│           [Edit Profile]                │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 💳 My Credits                    → ││
│  │    150 credits (₦15,000)           ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ❤️ Favorites                     → ││
│  │    8 saved restaurants             ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ⭐ My Reviews                    → ││
│  │    12 reviews written              ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 👥 Refer Friends                 → ││
│  │    Earn 20 credits per referral    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔔 Notifications                 → ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ❓ Help & Support                → ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 🚪 Log Out                         ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│  [🏠]   [🔍]   [📅]   [💳]   [👤●]    │
└─────────────────────────────────────────┘
```

---

## 3. Mobile-Specific Components

### 3.1 Bottom Sheet

```typescript
// Powered by @gorhom/bottom-sheet
<BottomSheet
  snapPoints={['25%', '50%', '90%']}
  enablePanDownToClose
  backdropComponent={CustomBackdrop}
>
  <BottomSheetScrollView>
    {/* Content */}
  </BottomSheetScrollView>
</BottomSheet>
```

### 3.2 Pull to Refresh

```typescript
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor="#3B82F6"
      colors={['#3B82F6']}
    />
  }
/>
```

### 3.3 Haptic Feedback

```typescript
import * as Haptics from 'expo-haptics';

// Success feedback (check-in confirmed)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Selection feedback (tab change)
Haptics.selectionAsync();

// Impact feedback (button press)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

### 3.4 Animations (Reanimated + Moti)

```typescript
import { MotiView } from 'moti';

// Fade in animation
<MotiView
  from={{ opacity: 0, translateY: 20 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: 'timing', duration: 300 }}
>
  <VenueCard />
</MotiView>

// Skeleton loader
<MotiView
  from={{ opacity: 0.5 }}
  animate={{ opacity: 1 }}
  transition={{ loop: true, type: 'timing', duration: 1000 }}
  style={{ backgroundColor: '#E5E7EB', borderRadius: 8 }}
/>
```

---

## 4. Offline Support

### 4.1 Offline-First Data

| Data | Offline Storage | Sync Strategy |
|------|-----------------|---------------|
| User profile | SecureStore | Sync on app open |
| Upcoming bookings | AsyncStorage | Sync every 5 min |
| QR codes | AsyncStorage | Pre-generated, always available |
| Favorites | AsyncStorage | Sync on change |
| Recent searches | AsyncStorage | Local only |

### 4.2 Offline UI States

```
┌─────────────────────────────────────────┐
│                                         │
│  ⚠️ You're offline                      │
│  Some features may be limited           │
│                                         │
│  [Retry Connection]                     │
│                                         │
└─────────────────────────────────────────┘

- QR codes: Always available offline
- Booking list: Cached version shown
- Search: Disabled with message
- Wallet: Cached balance shown
```

---

## 5. Push Notifications

### 5.1 Notification Types

| Type | Trigger | Content |
|------|---------|---------|
| **Booking Reminder** | 2 hours before | "Your reservation at {venue} is in 2 hours!" |
| **Check-in Confirmed** | On check-in | "You're checked in! 52 credits returned 🎉" |
| **Credits Expiring** | 7 days before | "30 credits expiring in 7 days. Book now!" |
| **New Review Response** | Vendor replies | "{venue} replied to your review" |
| **Promotional** | Marketing | "20% bonus credits this weekend!" |

### 5.2 Deep Links

```
bucr://venue/{slug}           → Venue detail
bucr://booking/{id}           → Booking detail
bucr://booking/{id}/qr        → QR code screen
bucr://wallet                 → Wallet screen
bucr://wallet/buy             → Buy credits
```

---

## 6. Performance Optimizations

### 6.1 List Virtualization

```typescript
<FlashList
  data={venues}
  renderItem={renderVenueCard}
  estimatedItemSize={200}
  drawDistance={500}
/>
```

### 6.2 Image Optimization

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={{ blurhash }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 6.3 Bundle Size Targets

| Metric | Target |
|--------|--------|
| Initial bundle | < 2MB |
| OTA update | < 500KB |
| App size (iOS) | < 50MB |
| App size (Android) | < 40MB |
