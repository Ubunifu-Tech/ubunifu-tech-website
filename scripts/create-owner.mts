/**
 * Creates (or restores) an owner who can sign in to the console.
 *
 *   npm run owner:create -- info@ubunifutech.com "Richard Pallangyo"
 *
 * Uses DATABASE_URL from the environment, or from .env when it is not set,
 * so it can be pointed at production on purpose:
 *
 *   DATABASE_URL="postgres://…production…" npm run owner:create -- you@ubunifutech.com "Your Name"
 *
 * Only the person row is written. No demo clients, projects or templates.
 * The address must also be allowed by CONSOLE_STAFF_EMAILS on the server.
 */

if (!process.env.DATABASE_URL) process.loadEnvFile('.env');

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) {
  console.error('Usage: npm run owner:create -- email@ubunifutech.com "Full Name"');
  process.exit(1);
}

const { PrismaPg } = await import('@prisma/adapter-pg');
const { PrismaClient } = await import('../src/generated/prisma/client');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const owner = await db.staffUser.upsert({
  where: { email: email.toLowerCase() },
  update: { role: 'owner', isActive: true },
  create: { email: email.toLowerCase(), name, role: 'owner' },
  select: { email: true, name: true, role: true },
});
await db.$disconnect();

console.log(`${owner.name} <${owner.email}> is an owner and can sign in.`);
