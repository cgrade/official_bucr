# Bucr API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### User Registration
```http
POST /auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "+2348012345678",
  "referralCode": "REF-XXXXX" // optional
}
```

### User Login
```http
POST /auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Vendor Registration
```http
POST /auth/vendor/register
```
**Body:**
```json
{
  "ownerName": "John Doe",
  "ownerEmail": "owner@restaurant.com",
  "ownerPhone": "+2348012345678",
  "password": "SecurePass123",
  "businessName": "My Restaurant",
  "description": "A great place to dine",
  "cuisineTypes": ["Nigerian", "Continental"],
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos"
}
```

### Vendor Login
```http
POST /auth/vendor/login
```

### Admin Login
```http
POST /auth/admin/login
```

### Refresh Token
```http
POST /auth/refresh
```
**Body:**
```json
{
  "refreshToken": "<refresh_token>"
}
```

### Get Current User
```http
GET /auth/me
```

---

## User Endpoints

### Get Profile
```http
GET /users/profile
```

### Update Profile
```http
PATCH /users/profile
```
**Body:**
```json
{
  "name": "John Updated",
  "phone": "+2348012345678",
  "dietaryRestrictions": ["vegetarian"],
  "seatingPreferences": "window",
  "specialOccasions": {
    "birthday": "1990-05-15"
  }
}
```

### Get Credits Balance & History
```http
GET /users/credits?page=1&limit=20
```

### Purchase Credits
```http
POST /users/credits/purchase
```
**Body:**
```json
{
  "credits": 100,
  "paystackReference": "ref_xxxxx"
}
```

### Get User Reservations
```http
GET /users/reservations?status=confirmed&upcoming=true
```

### Get User Orders
```http
GET /users/orders?status=completed&orderType=delivery
```

### Get Favorites
```http
GET /users/favorites
```

### Add Favorite
```http
POST /users/favorites
```
**Body:**
```json
{
  "vendorId": "uuid"
}
```

### Remove Favorite
```http
DELETE /users/favorites?vendorId=uuid
```

---

## Vendor Discovery Endpoints

### List Vendors
```http
GET /vendors?page=1&limit=20&search=grill&city=Lagos&cuisine=Nigerian&minRating=4
```

### Get Vendor Details
```http
GET /vendors/{slug}
```

---

## Reservation Endpoints

### Create Reservation
```http
POST /reservations
```
**Body:**
```json
{
  "vendorId": "uuid",
  "branchId": "uuid",
  "date": "2024-12-25",
  "time": "19:00",
  "partySize": 4,
  "specialRequests": "Birthday celebration",
  "occasion": "birthday"
}
```

### Get Reservation
```http
GET /reservations/{id}
```

### Modify Reservation
```http
PATCH /reservations/{id}
```
**Body:**
```json
{
  "date": "2024-12-26",
  "time": "20:00",
  "partySize": 6
}
```

### Cancel Reservation
```http
DELETE /reservations/{id}?reason=Changed plans
```

---

## Order Endpoints

### Create Order
```http
POST /orders
```
**Body:**
```json
{
  "vendorId": "uuid",
  "orderType": "delivery",
  "items": [
    {
      "menuItemId": "uuid",
      "name": "Jollof Rice",
      "quantity": 2,
      "price": 650000
    }
  ],
  "deliveryAddress": "123 Main Street, Victoria Island",
  "deliveryCity": "Lagos"
}
```

### Get Order
```http
GET /orders/{id}
```

### Confirm Payment
```http
POST /orders/{id}/confirm-payment
```

### Cancel Order
```http
DELETE /orders/{id}?reason=Changed mind
```

---

## Review Endpoints

### Create Review
```http
POST /reviews
```
**Body:**
```json
{
  "vendorId": "uuid",
  "reservationId": "uuid",
  "rating": 5,
  "text": "Amazing experience!"
}
```

### Get Vendor Reviews
```http
GET /reviews?vendorId=uuid&page=1&limit=20
```

---

## Waitlist Endpoints

### Join Waitlist
```http
POST /waitlist
```
**Body:**
```json
{
  "vendorId": "uuid",
  "desiredDate": "2024-12-25",
  "desiredTime": "19:00",
  "partySize": 4
}
```

### Get My Waitlist Entries
```http
GET /waitlist
```

### Leave Waitlist
```http
DELETE /waitlist?entryId=uuid
```

---

## Vendor Portal Endpoints

### Get Vendor Profile
```http
GET /vendor/profile
```

### Update Vendor Profile
```http
PATCH /vendor/profile
```

### Branches
```http
GET /vendor/branches
POST /vendor/branches
PATCH /vendor/branches/{branchId}
DELETE /vendor/branches/{branchId}
```

### Menu
```http
GET /vendor/menu
POST /vendor/menu
```

### Gallery
```http
GET /vendor/gallery
POST /vendor/gallery
DELETE /vendor/gallery?imageId=uuid
```

### Documents
```http
GET /vendor/documents
POST /vendor/documents
```

### Reservations
```http
GET /vendor/reservations?date=2024-12-25&status=confirmed
```

### Check-in Guest
```http
POST /vendor/reservations/{id}/check-in
```
**Body:**
```json
{
  "pin": "1234"
}
```

### Mark No-Show
```http
POST /vendor/reservations/{id}/no-show
```

### Orders
```http
GET /vendor/orders?today=true&status=pending
```

### Update Order Status
```http
PATCH /vendor/orders/{id}/status
```
**Body:**
```json
{
  "status": "preparing"
}
```

### Reviews
```http
GET /vendor/reviews
```

### Respond to Review
```http
POST /vendor/reviews/{id}/respond
```
**Body:**
```json
{
  "response": "Thank you for your feedback!"
}
```

### Guest Profiles
```http
GET /vendor/guest-profiles
GET /vendor/guest-profiles/{userId}
PATCH /vendor/guest-profiles/{userId}
```

### Experiences
```http
GET /vendor/experiences
POST /vendor/experiences
```

---

## Admin Endpoints

### Dashboard
```http
GET /admin/dashboard
```

### Users
```http
GET /admin/users?search=john&page=1
GET /admin/users/{id}
PATCH /admin/users/{id}
```

### Vendors
```http
GET /admin/vendors?status=pending&tier=premium
GET /admin/vendors/{id}
PATCH /admin/vendors/{id}
DELETE /admin/vendors/{id}
```

### Documents
```http
GET /admin/documents?status=pending
```

### Verify Document
```http
POST /admin/documents/{id}/verify
```
**Body:**
```json
{
  "status": "approved"
}
```

### Analytics
```http
GET /admin/analytics?period=30
```

---

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Credit System

### Tiers
- Standard (1-2 guests): 50 credits
- Group (3-6 guests): 100 credits
- Large Party (7+): 200 credits

### Economics
- 1 credit = ₦100 value
- Purchase price: ₦120/credit
- Show-up bonus: 5% of deposit
- Review bonus: 5-10 credits
- Referral bonus: 20 credits

### Cancellation Policy
- 24+ hours: 100% refund
- 12-24 hours: 50% refund
- <12 hours: Forfeit

### Expiry
- Credits expire after 6 months
- Reminder sent 30 days before
