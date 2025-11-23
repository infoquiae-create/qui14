// updatePlaceholderUsers.js
// Script to update placeholder users (with 'Unknown' name or empty email) to real info
// Usage: npx tsx scripts/updatePlaceholderUsers.js

import prisma from '../lib/prisma.js';

async function main() {
  // List of user updates: fill with real info
  const updates = [
    {
      id: 'user_353x7GuVLoPozgV86e50jMwCdMQ',
      name: 'tester',
      email: 'tester@gmail.com',
    },
    // Add more as needed
  ];

  for (const user of updates) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email,
      },
    });
    console.log(`Updated user ${user.id}:`, updated);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
