#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { createCustomPromoCode, createBulkRandomCodes, generateRandomCode } from './create-promo-codes';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'create':
        await handleCreateCommand(args.slice(1));
        break;
      case 'bulk':
        await handleBulkCommand(args.slice(1));
        break;
      case 'list':
        await listPromoCodes();
        break;
      case 'deactivate':
        await deactivatePromoCode(args[1]);
        break;
      case 'stats':
        await showStats();
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function handleCreateCommand(args: string[]) {
  const [code, subscriptionType, duration, expires, limit] = args;

  if (!code || !subscriptionType) {
    console.log('❌ Missing required parameters');
    console.log('Usage: npm run promo-cli create <code> <subscriptionType> [durationDays] [expiresAt] [usageLimit]');
    console.log('Examples:');
    console.log('  npm run promo-cli create APPSUMO2024 "Premium Lifetime" null 2024-12-31 1000');
    console.log('  npm run promo-cli create TRIAL30 "PremiumC" 30 2024-12-31 100');
    return;
  }

  const durationDays = duration === 'null' ? null : parseInt(duration) || 30;
  const expiresAt = new Date(expires || '2024-12-31');
  const usageLimit = parseInt(limit) || 100;

  await createCustomPromoCode(code, subscriptionType, durationDays, expiresAt, usageLimit);
}

async function handleBulkCommand(args: string[]) {
  const [count, subscriptionType, duration, expires, prefix] = args;

  if (!count || !subscriptionType) {
    console.log('❌ Missing required parameters');
    console.log('Usage: npm run promo-cli bulk <count> <subscriptionType> [durationDays] [expiresAt] [prefix]');
    console.log('Examples:');
    console.log('  npm run promo-cli bulk 100 "Premium Lifetime" null 2024-12-31 APPSUMO');
    console.log('  npm run promo-cli bulk 50 "PremiumC" 30 2024-12-31 TRIAL');
    return;
  }

  const codeCount = parseInt(count);
  const durationDays = duration === 'null' ? null : parseInt(duration) || 30;
  const expiresAt = new Date(expires || '2024-12-31');
  const codePrefix = prefix || 'BULK';

  await createBulkRandomCodes(codeCount, subscriptionType, durationDays, expiresAt, codePrefix);
}

async function listPromoCodes() {
  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      _count: {
        select: { redemptions: true }
      }
    }
  });

  console.log('\n📋 Recent Promo Codes:');
  console.log('Code'.padEnd(20), 'Type'.padEnd(20), 'Duration'.padEnd(10), 'Used/Limit'.padEnd(10), 'Active'.padEnd(8), 'Expires');
  console.log('─'.repeat(90));

  codes.forEach(code => {
    const duration = code.durationDays ? `${code.durationDays}d` : 'Lifetime';
    const usage = `${code._count.redemptions}/${code.usageLimit}`;
    const active = code.isActive ? '✅' : '❌';
    const expires = code.expiresAt.toDateString();

    console.log(
      code.code.padEnd(20),
      code.subscriptionType.padEnd(20),
      duration.padEnd(10),
      usage.padEnd(10),
      active.padEnd(8),
      expires
    );
  });
}

async function deactivatePromoCode(code: string) {
  if (!code) {
    console.log('❌ Please provide a promo code to deactivate');
    console.log('Usage: npm run promo-cli deactivate <code>');
    return;
  }

  const updated = await prisma.promoCode.update({
    where: { code: code.toUpperCase() },
    data: { isActive: false }
  });

  console.log(`✅ Deactivated promo code: ${updated.code}`);
}

async function showStats() {
  const totalCodes = await prisma.promoCode.count();
  const activeCodes = await prisma.promoCode.count({ where: { isActive: true } });
  const totalRedemptions = await prisma.promoCodeRedemption.count();
  
  const topCodes = await prisma.promoCode.findMany({
    include: {
      _count: { select: { redemptions: true } }
    },
    orderBy: {
      redemptions: { _count: 'desc' }
    },
    take: 5
  });

  console.log('\n📊 Promo Code Statistics:');
  console.log(`Total codes: ${totalCodes}`);
  console.log(`Active codes: ${activeCodes}`);
  console.log(`Total redemptions: ${totalRedemptions}`);
  
  console.log('\n🔥 Top performing codes:');
  topCodes.forEach((code, index) => {
    console.log(`${index + 1}. ${code.code} - ${code._count.redemptions} redemptions`);
  });
}

function showHelp() {
  console.log('\n🎟️  Promo Code CLI Tool');
  console.log('\nCommands:');
  console.log('  create <code> <type> [duration] [expires] [limit]  Create a single promo code');
  console.log('  bulk <count> <type> [duration] [expires] [prefix]  Create multiple random codes');
  console.log('  list                                               List recent promo codes');
  console.log('  deactivate <code>                                  Deactivate a promo code');
  console.log('  stats                                              Show usage statistics');
  console.log('\nExamples:');
  console.log('  npm run promo-cli create APPSUMO2024 "Premium Lifetime" null 2024-12-31 1000');
  console.log('  npm run promo-cli create TRIAL30 "PremiumC" 30 2024-12-31 100');
  console.log('  npm run promo-cli bulk 100 "Premium Lifetime" null 2024-12-31 APPSUMO');
  console.log('  npm run promo-cli list');
  console.log('  npm run promo-cli stats');
  console.log('\nSubscription Types:');
  console.log('  - "Premium Lifetime" (for lifetime access)');
  console.log('  - "PremiumC" (for temporary premium access)');
  console.log('  - Or any custom subscription type you want');
}

if (require.main === module) {
  main();
}