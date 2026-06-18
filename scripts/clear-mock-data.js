const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearMockData() {
  console.log('🧹 Clearing mock data...\n');

  try {
    // Clear menu items (soft delete)
    const menuResult = await prisma.menu.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });
    console.log(`✅ Soft deleted ${menuResult.count} menu items`);

    // Clear menu categories
    const categoryResult = await prisma.menuCategory.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    console.log(`✅ Deactivated ${categoryResult.count} menu categories`);

    // Clear experiences (soft delete)
    const experienceResult = await prisma.experience.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });
    console.log(`✅ Soft deleted ${experienceResult.count} experiences`);

    // Clear achievements
    const achievementResult = await prisma.achievement.deleteMany({});
    console.log(`✅ Deleted ${achievementResult.count} achievements`);

    // Clear gallery images
    const galleryResult = await prisma.galleryImage.deleteMany({});
    console.log(`✅ Deleted ${galleryResult.count} gallery images`);

    console.log('\n✨ Mock data cleared successfully!');
    console.log('Note: Data was soft-deleted where possible for safety.');
    console.log('To permanently delete, run with --hard flag.');
  } catch (error) {
    console.error('❌ Error clearing mock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check for --hard flag for permanent deletion
const hardDelete = process.argv.includes('--hard');

if (hardDelete) {
  console.log('⚠️  Running HARD DELETE - this is permanent!\n');
  
  async function hardClearMockData() {
    try {
      // Hard delete in order (respecting foreign keys)
      await prisma.menu.deleteMany({});
      console.log('✅ Permanently deleted all menu items');
      
      await prisma.menuCategory.deleteMany({});
      console.log('✅ Permanently deleted all menu categories');
      
      await prisma.experience.deleteMany({});
      console.log('✅ Permanently deleted all experiences');
      
      await prisma.achievement.deleteMany({});
      console.log('✅ Permanently deleted all achievements');
      
      await prisma.galleryImage.deleteMany({});
      console.log('✅ Permanently deleted all gallery images');
      
      console.log('\n✨ All mock data permanently deleted!');
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  hardClearMockData();
} else {
  clearMockData();
}
