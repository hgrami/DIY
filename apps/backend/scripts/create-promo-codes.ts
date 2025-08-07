import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPromoCodes() {
  try {
    // AppSumo Lifetime Deal Example
    const lifetimeCode = await prisma.promoCode.create({
      data: {
        code: 'APPSUMO2024',
        subscriptionType: 'Premium Lifetime',
        durationDays: null, // Lifetime
        expiresAt: new Date('2024-12-31'),
        usageLimit: 1000,
        usedCount: 0,
        isActive: true,
      },
    });

    console.log('✅ Created lifetime promo code:', lifetimeCode);

    // 1-Month Free Premium Example
    const monthlyCode = await prisma.promoCode.create({
      data: {
        code: 'PREMIUM30',
        subscriptionType: 'PremiumC',
        durationDays: 30,
        expiresAt: new Date('2024-12-31'),
        usageLimit: 500,
        usedCount: 0,
        isActive: true,
      },
    });

    console.log('✅ Created monthly promo code:', monthlyCode);

    // Holiday Special - 3 months free
    const holidayCode = await prisma.promoCode.create({
      data: {
        code: 'HOLIDAY2024',
        subscriptionType: 'PremiumC',
        durationDays: 90,
        expiresAt: new Date('2025-01-31'),
        usageLimit: 200,
        usedCount: 0,
        isActive: true,
      },
    });

    console.log('✅ Created holiday promo code:', holidayCode);

    // Bulk create codes for AppSumo (example: 100 unique codes)
    const bulkCodes: any[] = [];
    for (let i = 1; i <= 10; i++) { // Creating 10 for demo, change to 100+ for production
      bulkCodes.push({
        code: `APPSUMO24-${i.toString().padStart(3, '0')}`,
        subscriptionType: 'Premium Lifetime',
        durationDays: null,
        expiresAt: new Date('2024-12-31'),
        usageLimit: 1, // Each code can only be used once
        usedCount: 0,
        isActive: true,
      });
    }

    const bulkResult = await prisma.promoCode.createMany({
      data: bulkCodes,
    });

    console.log(`✅ Created ${bulkResult.count} bulk promo codes`);

  } catch (error) {
    console.error('❌ Error creating promo codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Custom function to create a specific promo code
async function createCustomPromoCode(
  code: string,
  subscriptionType: string,
  durationDays: number | null,
  expiresAt: Date,
  usageLimit: number
) {
  try {
    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        subscriptionType,
        durationDays,
        expiresAt,
        usageLimit,
        usedCount: 0,
        isActive: true,
      },
    });

    console.log('✅ Created custom promo code:', promoCode);
    return promoCode;
  } catch (error) {
    console.error('❌ Error creating custom promo code:', error);
    throw error;
  }
}

// Function to generate random codes
function generateRandomCode(prefix: string = 'PROMO', length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix + '-';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to create bulk random codes
async function createBulkRandomCodes(
  count: number,
  subscriptionType: string,
  durationDays: number | null,
  expiresAt: Date,
  prefix: string = 'BULK'
) {
  try {
    const codes: any[] = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        code: generateRandomCode(prefix),
        subscriptionType,
        durationDays,
        expiresAt,
        usageLimit: 1,
        usedCount: 0,
        isActive: true,
      });
    }

    const result = await prisma.promoCode.createMany({
      data: codes,
      skipDuplicates: true, // Skip if code already exists
    });

    console.log(`✅ Created ${result.count} random bulk codes`);
    return result;
  } catch (error) {
    console.error('❌ Error creating bulk random codes:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  createPromoCodes();
}

// Export functions for use in other scripts
export {
  createCustomPromoCode,
  createBulkRandomCodes,
  generateRandomCode,
};