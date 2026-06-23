import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@bucr.ng' },
    update: {},
    create: {
      email: 'admin@bucr.ng',
      passwordHash: adminPassword,
      name: 'Super Admin',
      role: 'super_admin',
      permissions: ['all'],
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('User@123456', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      phone: '+2348012345678',
      passwordHash: userPassword,
      name: 'John Doe',
      creditsBalance: 200,
      referralCode: 'REF-JOHN123',
      dietaryRestrictions: ['halal'],
      specialOccasions: {
        birthday: '1990-05-15',
      },
    },
  });
  console.log('✅ Test user created:', testUser.email);

  // Create vendor owner user
  const vendorOwnerPassword = await bcrypt.hash('Vendor@123456', 12);
  const vendorOwner = await prisma.user.upsert({
    where: { email: 'vendor@zumagrill.com' },
    update: {},
    create: {
      email: 'vendor@zumagrill.com',
      phone: '+2348098765432',
      passwordHash: vendorOwnerPassword,
      name: 'Zuma Owner',
    },
  });

  // Create test vendor
  const vendor = await prisma.vendor.upsert({
    where: { slug: 'zuma-grill' },
    update: {
      isFeatured: true,
      featuredAt: new Date(),
    },
    create: {
      ownerId: vendorOwner.id,
      businessName: 'Zuma Grill',
      slug: 'zuma-grill',
      description: 'Premium Nigerian cuisine with a modern twist. Experience the best of Lagos dining.',
      cuisineTypes: ['Nigerian', 'African', 'Continental'],
      priceLevel: 3, // ₦₦₦ upscale
      email: 'info@zumagrill.com',
      phone: '+2348098765432',
      website: 'https://zumagrill.com',
      subscriptionTier: 'elite',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verificationStatus: 'approved',
      bankName: 'GTBank',
      bankAccountNumber: '0123456789',
      bankAccountName: 'Zuma Grill Ltd',
      deliveryEnabled: true,
      deliveryFeeType: 'flat',
      deliveryFlatFee: 150000, // ₦1,500 in kobo
      minDeliveryOrder: 500000, // ₦5,000 in kobo
      // averageRating and totalReviews are computed live from the reviews table — never seed these
      isFeatured: true,
      featuredAt: new Date(),
    },
  });
  console.log('✅ Vendor created:', vendor.businessName);

  // Create main branch
  const mainBranch = await prisma.vendorBranch.upsert({
    where: { id: 'main-branch-zuma' },
    update: {},
    create: {
      id: 'main-branch-zuma',
      vendorId: vendor.id,
      name: 'Victoria Island',
      address: '15 Adeola Odeku Street, Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      phone: '+2348098765432',
      email: 'vi@zumagrill.com',
      latitude: 6.4281,
      longitude: 3.4219,
      isMainBranch: true,
      isActive: true,
      operatingHours: [
        { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isClosed: false },
        { dayOfWeek: 1, openTime: '11:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 2, openTime: '11:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 3, openTime: '11:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 4, openTime: '11:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 5, openTime: '11:00', closeTime: '00:00', isClosed: false },
        { dayOfWeek: 6, openTime: '11:00', closeTime: '00:00', isClosed: false },
      ],
    },
  });
  console.log('✅ Branch created:', mainBranch.name);

  // Create menu categories
  const startersCategory = await prisma.menuCategory.create({
    data: {
      vendorId: vendor.id,
      name: 'Starters',
      description: 'Begin your culinary journey',
      sortOrder: 1,
    },
  });

  const mainCategory = await prisma.menuCategory.create({
    data: {
      vendorId: vendor.id,
      name: 'Main Courses',
      description: 'Signature dishes',
      sortOrder: 2,
    },
  });

  const drinksCategory = await prisma.menuCategory.create({
    data: {
      vendorId: vendor.id,
      name: 'Drinks',
      description: 'Refreshing beverages',
      sortOrder: 3,
    },
  });

  // Create menu items
  await prisma.menu.createMany({
    skipDuplicates: true,
    data: [
      {
        vendorId: vendor.id,
        categoryId: startersCategory.id,
        name: 'Suya Skewers',
        description: 'Grilled beef skewers with signature suya spice',
        price: 450000, // ₦4,500
        sortOrder: 1,
      },
      {
        vendorId: vendor.id,
        categoryId: startersCategory.id,
        name: 'Pepper Soup',
        description: 'Traditional Nigerian pepper soup with goat meat',
        price: 350000,
        sortOrder: 2,
      },
      {
        vendorId: vendor.id,
        categoryId: mainCategory.id,
        name: 'Jollof Rice Special',
        description: 'Our signature jollof rice with grilled chicken',
        price: 650000,
        sortOrder: 1,
      },
      {
        vendorId: vendor.id,
        categoryId: mainCategory.id,
        name: 'Egusi Soup & Pounded Yam',
        description: 'Rich melon seed soup with assorted meat',
        price: 750000,
        sortOrder: 2,
      },
      {
        vendorId: vendor.id,
        categoryId: mainCategory.id,
        name: 'Grilled Tilapia',
        description: 'Whole grilled tilapia with special sauce',
        price: 850000,
        sortOrder: 3,
      },
      {
        vendorId: vendor.id,
        categoryId: drinksCategory.id,
        name: 'Chapman',
        description: 'Nigerian signature cocktail (non-alcoholic)',
        price: 150000,
        sortOrder: 1,
      },
      {
        vendorId: vendor.id,
        categoryId: drinksCategory.id,
        name: 'Zobo',
        description: 'Traditional hibiscus drink',
        price: 80000,
        sortOrder: 2,
      },
    ],
  });
  console.log('✅ Menu items created');

  // Create gallery images
  await prisma.galleryImage.createMany({
    skipDuplicates: true,
    data: [
      {
        vendorId: vendor.id,
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        caption: 'Our elegant dining room',
        category: 'venue',
        sortOrder: 1,
      },
      {
        vendorId: vendor.id,
        url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
        caption: 'Jollof Rice Special',
        category: 'food',
        sortOrder: 2,
      },
      {
        vendorId: vendor.id,
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
        caption: 'Evening ambiance',
        category: 'ambiance',
        sortOrder: 3,
      },
    ],
  });
  console.log('✅ Gallery images created');

  // Create vendor documents
  await prisma.vendorDocument.createMany({
    skipDuplicates: true,
    data: [
      {
        vendorId: vendor.id,
        type: 'cac',
        fileUrl: 'https://example.com/documents/cac.pdf',
        fileName: 'CAC_Certificate.pdf',
        status: 'approved',
        isRequired: true,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      {
        vendorId: vendor.id,
        type: 'tin',
        fileUrl: 'https://example.com/documents/tin.pdf',
        fileName: 'TIN_Certificate.pdf',
        status: 'approved',
        isRequired: true,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    ],
  });
  console.log('✅ Vendor documents created');

  // Achievements are NOT seeded manually — they are auto-earned via syncVendorAchievements()
  // which is called after document approval, subscription changes, and booking milestones.
  // (see src/services/achievement.service.ts)
  console.log('ℹ️  Achievements: auto-earned — not seeded');

  // Create experience (skip if already exists)
  const existingExperience = await prisma.experience.findFirst({
    where: { vendorId: vendor.id, title: 'Chef\'s Table Experience' },
  });
  if (!existingExperience) {
    await prisma.experience.create({
      data: {
        vendorId: vendor.id,
        title: 'Chef\'s Table Experience',
        description: 'An exclusive 7-course tasting menu prepared tableside by our head chef',
        type: 'tasting_menu',
        creditsRequired: 5000, // ₦50,000 — premium chef's table
        capacity: 8,
        duration: 180,
        availableDays: [4, 5, 6], // Thu, Fri, Sat
        startTime: '19:00',
        endTime: '22:00',
        isActive: true,
      },
    });
  }
  console.log('✅ Experience created');

  // Create credit transaction for test user (skip if already exists)
  const existingTransaction = await prisma.creditTransaction.findFirst({
    where: { userId: testUser.id, paystackReference: 'test_ref_123' },
  });
  if (!existingTransaction) {
    await prisma.creditTransaction.create({
      data: {
        userId: testUser.id,
        type: 'purchase',
        amount: 200,
        balanceAfter: 200,
        description: 'Initial credit purchase',
        paystackReference: 'test_ref_123',
        amountPaidKobo: 2400000, // ₦24,000
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      },
    });
  }
  console.log('✅ Credit transaction created');

  // ── Featured (ad) packages — admins manage these; these are sensible defaults.
  // Priced as premium ad inventory (1 credit = ₦10), with a volume discount on
  // longer durations. Covers all three placement types.
  const featuredPackages = [
    { id: 'pkg-spotlight-3d',  name: 'Spotlight',          type: 'restaurant' as const, durationDays: 3,  creditsCost: 800,  sortOrder: 1, description: 'A quick visibility boost — featured on the home carousel and lifted in search for 3 days.' },
    { id: 'pkg-prime-7d',      name: 'Prime',              type: 'restaurant' as const, durationDays: 7,  creditsCost: 1500, sortOrder: 2, description: 'Our most popular — a full week on the home carousel and top of search.' },
    { id: 'pkg-headline-30d',  name: 'Headline',           type: 'restaurant' as const, durationDays: 30, creditsCost: 5000, sortOrder: 3, description: 'Maximum exposure — a month on the home carousel and top of search. Best value per day.' },
    { id: 'pkg-experience-7d', name: 'Experience Feature', type: 'experience' as const, durationDays: 7,  creditsCost: 1000, sortOrder: 4, description: 'Put one of your experiences in front of every diner for a week.' },
    { id: 'pkg-offer-7d',      name: 'Offer Boost',        type: 'offer' as const,      durationDays: 7,  creditsCost: 750,  sortOrder: 5, description: 'Promote a special offer on the home screen for a week.' },
  ];
  for (const p of featuredPackages) {
    await prisma.featuredPackage.upsert({
      where: { id: p.id },
      update: { name: p.name, type: p.type, durationDays: p.durationDays, creditsCost: p.creditsCost, sortOrder: p.sortOrder, description: p.description, isActive: true },
      create: { ...p, isActive: true },
    });
  }
  console.log('✅ Featured packages seeded');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('-------------------');
  console.log('Admin: admin@bucr.ng / Admin@123456');
  console.log('User: john@example.com / User@123456');
  console.log('Vendor: vendor@zumagrill.com / Vendor@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
