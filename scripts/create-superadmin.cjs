const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const { DATABASE_URL, ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !ADMIN_PHONE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('DATABASE_URL, ADMIN_PHONE, ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone: ADMIN_PHONE }, { email: ADMIN_EMAIL }] },
    });
    if (existing) throw new Error('An admin with this phone or email already exists');

    await prisma.user.create({
      data: {
        first_name: process.env.ADMIN_FIRST_NAME || 'Admin',
        last_name: process.env.ADMIN_LAST_NAME || 'User',
        phone: ADMIN_PHONE,
        email: ADMIN_EMAIL,
        password: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: Role.SUPERADMIN,
      },
    });
    console.log('Superadmin created');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
