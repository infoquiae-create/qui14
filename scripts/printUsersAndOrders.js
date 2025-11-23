// Script to print all users with their orders for manual review
// Usage: npx tsx scripts/printUsersAndOrders.js

import prisma from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    include: {
      buyerOrders: true,
      Address: true,
    },
  });

  for (const user of users) {
    console.log('---');
    console.log(`UserId: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Orders: ${user.buyerOrders.length}`);
    for (const order of user.buyerOrders) {
      console.log(`  OrderId: ${order.id}, Total: ${order.total}, Status: ${order.status}`);
    }
    if (user.Address.length > 0) {
      console.log(`Addresses: ${user.Address.map(a => a.street + ', ' + a.city).join(' | ')}`);
    }
  }
  console.log('Done. Review the above output for missing or placeholder users.');
}

main().catch(e => { console.error(e); process.exit(1); });
