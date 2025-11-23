// Script to update placeholder users with real info
// Usage: npx tsx scripts/updateUserPlaceholders.js

import prisma from '../lib/prisma.js';

async function main() {
  // Find all users with name 'Unknown' or empty email
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: 'Unknown' },
        { email: '' },
        { email: { contains: 'unknown-' } },
      ],
    },
  });

  if (users.length === 0) {
    console.log('No placeholder users found.');
    return;
  }

  for (const user of users) {
    // TODO: Update with real info. For now, just print them.
    console.log(`UserId: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    // Example update (uncomment and edit as needed):
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { name: 'Real Name', email: 'real@email.com' },
    // });
  }

  console.log('Review the above users and update them with real info as needed.');
}

main().catch(e => { console.error(e); process.exit(1); });
