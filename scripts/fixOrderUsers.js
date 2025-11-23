// Script to check and fix missing user info for existing orders
// Run with: npx tsx scripts/fixOrderUsers.js

import prisma from '../lib/prisma.js';

async function main() {
  // Find all orders with a userId but missing user relation
  const orders = await prisma.order.findMany({
    where: {
      userId: { not: null },
    },
    include: {
      user: true,
    },
  });

  let fixed = 0;
  for (const order of orders) {
    if (!order.user) {
      // Try to find user by userId
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      if (user) {
        // User exists, nothing to do
        continue;
      } else {
        // User missing, create a placeholder user
        await prisma.user.create({
          data: {
            id: order.userId,
            name: 'Unknown User',
            email: `unknown-${order.userId}@example.com`,
            image: '',
          },
        });
        fixed++;
        console.log(`Created placeholder user for order ${order.id}`);
      }
    }
  }
  console.log(`Done. Fixed ${fixed} orders.`);
}

main().catch(e => { console.error(e); process.exit(1); });
