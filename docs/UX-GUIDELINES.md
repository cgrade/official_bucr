# BUCR UX Guidelines & Layout Recommendations

## Brand Identity

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| **Primary (Deep Midnight)** | `#1a1a2e` | Structural, premium dark elements |
| **Secondary (Dark Navy)** | `#16213e` | Trust, authority, backgrounds |
| **Tertiary (Warm Gold)** | `#efc07b` | CTAs, highlights, badges, warmth |
| **Success** | `#10B981` | Confirmations, completed states |
| **Warning** | `#F59E0B` | Alerts, pending states |
| **Error** | `#EF4444` | Errors, destructive actions |

### Typography
- **Display/Headings**: Plus Jakarta Sans (modern, premium feel)
- **Body/UI**: Inter (excellent readability, professional)
- **Monospace**: JetBrains Mono (codes, numbers)

### Design Principles
1. **Glass Morphism**: Semi-transparent cards with backdrop blur for premium feel
2. **Gradient CTAs**: Primary-to-Accent gradient for main action buttons
3. **Rounded Corners**: 12px (xl) for cards, 8px for inputs, 24px for large cards
4. **Subtle Animations**: 200ms transitions, ease-out timing
5. **Dark Mode First**: Design for both light and dark themes

---

## User Mobile App (React Native/Expo)

### Recommended Layout Structure

```
┌─────────────────────────────────┐
│  📍 Location    🔔    👤        │  ← Sticky Header
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │    Featured Restaurant   │   │  ← Hero Card (swipeable)
│  │         Card             │   │
│  └─────────────────────────┘   │
│                                 │
│  Nearby  •  Top Rated  •  New  │  ← Filter Pills
│                                 │
│  ┌─────────────────────────┐   │
│  │  Restaurant Card        │   │  ← Scrollable List
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  Restaurant Card        │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  🏠    🔍    💰    📅    👤    │  ← Bottom Tab Navigation
└─────────────────────────────────┘
```

### Key UX Patterns

#### Bottom Navigation (5 tabs)
| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Discovery feed, featured restaurants |
| Search | 🔍 | Search with filters, map view |
| Wallet | 💰 | Credit balance, transactions, buy credits |
| Bookings | 📅 | Upcoming & past reservations |
| Profile | 👤 | Account, settings, favorites |

#### Restaurant Discovery
- **Card-based listings** with large hero images (16:9 ratio)
- **Quick info**: Name, cuisine, rating, distance, price range
- **Visual badges**: Verified ✅, Trusted ⭐, Premium 🏆
- **Swipe actions**: Swipe right to favorite, left to dismiss

#### Booking Flow (3-step wizard)
```
Step 1: Select Date & Time
Step 2: Choose Party Size & Credit Tier
Step 3: Confirm & Pay with Credits
```
- Progress indicator at top
- Back button to previous step
- Clear credit cost display
- One-tap booking for returning users

#### Credit Wallet
- **Large balance display** at top with gradient background
- **Quick buy buttons**: 50, 100, 200, 500 credits
- **Transaction history** with pull-to-refresh
- **Expiry warning** when credits near expiration

#### Reservation Management
- **QR Code + PIN** prominently displayed
- **Countdown timer** to reservation
- **Quick actions**: Modify, Cancel, Share/Invite
- **Check-in confirmation** with confetti animation

---

## Vendor Portal (Web - Desktop-first)

### Recommended Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  🍽️ BUCR                                    🔔  🌙  👤 Zuma  │  ← Top Header
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Dashboard │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  ─────────│  │ Today's  │ │ Pending  │ │ Revenue  │        │  ← Stat Cards
│  📊 Home   │  │ Bookings │ │ Orders   │ │ This Week│        │
│  📅 Reserve│  └──────────┘ └──────────┘ └──────────┘        │
│  🛍️ Orders │                                                 │
│  📋 Menu   │  ┌─────────────────────────────────────────┐   │
│  📸 Gallery│  │                                         │   │
│  ⭐ Reviews│  │       Today's Reservations              │   │  ← Main Content
│  ⚙️ Settings│  │       (Timeline View)                   │   │
│            │  │                                         │   │
│            │  └─────────────────────────────────────────┘   │
│            │                                                 │
│            │  ┌─────────────────────────────────────────┐   │
│            │  │       Active Orders                     │   │
│            │  │       (Kanban Board)                    │   │
│            │  └─────────────────────────────────────────┘   │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
  ↑ Sidebar (280px, collapsible on mobile)
```

### Key UX Patterns

#### Dashboard
- **Today's focus**: Reservations timeline, active orders
- **Quick stats**: Bookings, orders, revenue, ratings
- **Alerts**: New reservations (toast), pending orders (badge)
- **Quick actions**: Accept order, mark arrived, view details

#### Reservation Management
- **Timeline view** for today's bookings
- **Calendar view** for week/month planning
- **QR Scanner** for check-in (camera modal)
- **Status progression**: Confirmed → Arrived → Completed

#### Order Management (Kanban)
```
┌────────────┬────────────┬────────────┬────────────┐
│  New (3)   │ Preparing  │   Ready    │ Completed  │
├────────────┼────────────┼────────────┼────────────┤
│ Order Card │ Order Card │ Order Card │ Order Card │
│ Order Card │            │            │            │
│ Order Card │            │            │            │
└────────────┴────────────┴────────────┴────────────┘
```
- **Drag-and-drop** to change status
- **Sound alert** for new orders
- **Timer** showing order age

#### Menu Management
- **Category tabs** for organization
- **Drag-and-drop** reordering
- **Bulk actions**: Enable/disable items
- **Image upload** with preview

---

## Admin Portal (Web - Desktop-focused)

### Recommended Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  🔧 BUCR Admin            Search...        🔔  🌙  👤 Admin  │
├────────────┬─────────────────────────────────────────────────┤
│            │  Dashboard > Users                              │  ← Breadcrumbs
│  Dashboard │  ─────────────────────────────────────────────  │
│  ─────────│                                                 │
│  👥 Users  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  🏪 Vendors│  │ Total    │ │ Active   │ │ Credits  │        │  ← KPI Cards
│  📅 Reserve│  │ Users    │ │ Today    │ │ Circul.  │        │
│  🛍️ Orders │  └──────────┘ └──────────┘ └──────────┘        │
│  💰 Credits│                                                 │
│  📊 Analytic│  ┌─────────────────────────────────────────┐   │
│  ⚙️ Settings│  │                                         │   │
│  📄 Reports│  │        Data Table                       │   │  ← Main Content
│            │  │        (sortable, filterable)           │   │
│            │  │                                         │   │
│            │  │  Name  Email  Status  Credits  Actions  │   │
│            │  │  ─────────────────────────────────────  │   │
│            │  │  ...                                    │   │
│            │  │                                         │   │
│            │  └─────────────────────────────────────────┘   │
│            │                                                 │
│            │  ← 1 2 3 ... 10 →          Showing 1-20 of 245 │  ← Pagination
└────────────┴─────────────────────────────────────────────────┘
```

### Key UX Patterns

#### Data Tables
- **Sortable columns** with click-to-sort
- **Inline actions**: View, Edit, Suspend, Delete
- **Bulk selection** with checkboxes
- **Quick filters** in sticky position
- **Export to CSV** functionality

#### User/Vendor Management
- **Detail modal** for viewing full profile
- **Action confirmation** for destructive actions
- **Reason required** for suspensions
- **Activity log** in detail view

#### Analytics Dashboard
- **Date range picker** (Today, Week, Month, Custom)
- **Chart types**: Line (trends), Bar (comparisons), Pie (distributions)
- **Export options**: PDF, CSV, Image

---

## Shared Component Patterns

### Buttons
```
Primary:   [gradient blue-cyan, white text, glow shadow]
Secondary: [slate-100 bg, slate-700 text]
Outline:   [transparent bg, slate-200 border]
Ghost:     [transparent bg, hover slate-100]
Danger:    [red-500 bg, white text]
```

### Cards
```
Glass:     [white/80 bg, backdrop-blur, subtle border]
Solid:     [white bg, slate-200 border, shadow-lg]
Stat:      [hover scale effect, gradient overlay on hover]
```

### Status Badges
```
Success:   [green-50 bg, green-700 text, green-200 border]
Warning:   [amber-50 bg, amber-700 text, amber-200 border]  
Error:     [red-50 bg, red-700 text, red-200 border]
Info:      [blue-50 bg, blue-700 text, blue-200 border]
Neutral:   [slate-100 bg, slate-700 text, slate-200 border]
```

### Loading States
- **Skeleton loaders** (not spinners) for content
- **Shimmer effect** for premium feel
- **Optimistic updates** where possible
- **Progress indicators** for multi-step processes

### Empty States
- **Friendly illustration** (not just text)
- **Clear message** explaining what's missing
- **CTA button** to take action
- **Example**: "No reservations yet - Start by booking a table"

### Error Handling
- **Toast notifications** for transient errors
- **Inline errors** for form validation
- **Full-page error** only for critical failures
- **Recovery action** always available

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Mobile Adaptations
- **Sidebar** → Bottom sheet or hamburger menu
- **Data tables** → Card list view
- **Multi-column** → Single column stack
- **Hover states** → Long press or tap

---

## Accessibility (a11y)

- **Focus visible** ring on all interactive elements
- **Color contrast** minimum 4.5:1 for text
- **Touch targets** minimum 44x44px on mobile
- **Screen reader** labels on icon-only buttons
- **Keyboard navigation** for all actions
- **Reduced motion** respect for animations

---

## Performance Guidelines

- **Lazy load** images below the fold
- **Skeleton loading** during data fetch
- **Optimistic updates** for better perceived speed
- **Debounce** search inputs (300ms)
- **Virtualize** long lists (>50 items)
- **Cache** API responses where appropriate
