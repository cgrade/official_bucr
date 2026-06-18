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
      email: 'info@zumagrill.com',
      phone: '+2348098765432',
      website: 'https://zumagrill.com',
      subscriptionTier: 'premium',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verificationStatus: 'approved',
      bankName: 'GTBank',
      bankAccountNumber: '0123456789',
      bankAccountName: 'Zuma Grill Ltd',
      deliveryEnabled: true,
      deliveryFeeType: 'flat',
      deliveryFlatFee: 150000, // ₦1,500 in kobo
      minDeliveryOrder: 500000, // ₦5,000 in kobo
      averageRating: 4.5,
      totalReviews: 127,
      totalBookings: 543,
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

  // Create achievements
  await prisma.achievement.createMany({
    skipDuplicates: true,
    data: [
      {
        vendorId: vendor.id,
        title: 'Verified Business',
        description: 'All business documents verified',
        icon: '✅',
        badgeType: 'verified',
      },
      {
        vendorId: vendor.id,
        title: 'Premium Partner',
        description: 'Premium subscription member',
        icon: '🏆',
        badgeType: 'premium_partner',
      },
      {
        vendorId: vendor.id,
        title: 'Trusted Vendor',
        description: '500+ successful bookings',
        icon: '⭐',
        badgeType: 'trusted',
      },
    ],
  });
  console.log('✅ Achievements created');

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
        creditsRequired: 300,
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
