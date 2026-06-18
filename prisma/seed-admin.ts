import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin accounts...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  // Create Super Admin
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@bucr.ng' },
    update: {},
    create: {
      email: 'superadmin@bucr.ng',
      name: 'Super Admin',
      passwordHash,
      role: 'super_admin',
      permissions: ['*'],
    },
  });

  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Regular Admin
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@bucr.ng' },
    update: {},
    create: {
      email: 'admin@bucr.ng',
      name: 'System Admin',
      passwordHash,
      role: 'admin',
      permissions: [
        'users.read',
        'users.update',
        'vendors.read',
        'vendors.update',
        'vendors.verify',
        'credits.read',
        'credits.adjust',
        'reservations.read',
        'orders.read',
        'analytics.read',
      ],
    },
  });

  console.log('✅ Admin created:', admin.email);

  // Create Support Admin
  const support = await prisma.admin.upsert({
    where: { email: 'support@bucr.ng' },
    update: {},
    create: {
      email: 'support@bucr.ng',
      name: 'Support Staff',
      passwordHash,
      role: 'support',
      permissions: [
        'users.read',
        'vendors.read',
        'reservations.read',
        'orders.read',
      ],
    },
  });

  console.log('✅ Support created:', support.email);

  console.log('\n📋 Admin Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin: superadmin@bucr.ng / Admin@123');
  console.log('Admin:       admin@bucr.ng / Admin@123');
  console.log('Support:     support@bucr.ng / Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Change these passwords in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
