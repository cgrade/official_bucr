# Bucr - Nigerian Restaurant Reservation & Takeout Platform

Bucr is a restaurant reservation and takeout platform designed for the Nigerian market. It solves the 20% no-show problem through a credit-based deposit system where users are rewarded for showing up.

## Features

### For Users
- 🔍 Discover restaurants by location, cuisine, and ratings
- 📅 Book reservations with credit deposits
- 🍔 Order takeout/delivery with direct vendor payment
- 💰 Earn credits for showing up and leaving reviews
- 📱 QR code + PIN for secure check-in

### For Vendors
- 📊 Dashboard with reservations and order management
- 👥 Guest profiles (CRM) for personalized service
- 📸 Gallery and menu management
- ⭐ Reviews and achievements (Hall of Fame)
- 📈 Analytics (Pro/Premium tiers)

### For Admins
- 🛠 Full platform management
- ✅ Vendor verification (CAC, TIN)
- 💳 Credit system control
- 📊 Platform-wide analytics

## Tech Stack

- **Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT
- **Payments**: Paystack
- **Storage**: Cloudinary
- **Email**: Resend
- **SMS**: Termii

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/bucr.git
cd bucr
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Set up the database:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## API Documentation

See [API.md](./docs/API.md) for detailed API documentation.

## Business Model

### Vendor Subscription Tiers (Monthly)
- **Basic**: ₦75,000 - Listings, bookings, credit integration
- **Pro**: ₦145,000 - + Analytics, custom profiles, priority support
- **Premium**: ₦250,000 - + Marketing tools, featured spots, advanced CRM

### Credit System
- 1 credit = ₦100 value
- Purchase price: ₦120/credit (17% margin)
- Expiry: 6 months
- Show-up bonus: 5% of deposit

## License

Proprietary - All rights reserved

## Contact

For inquiries, contact support@bucr.ng
