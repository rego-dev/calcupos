/**
 * Seeds the standard set of roles used by the app.
 * Idempotent: safe to run multiple times — existing roles are left untouched.
 *
 *   node scripts/seed-roles.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLES = ['Super Admin', 'Admin', 'Cashier', 'Staff'];

(async () => {
  try {
    for (const name of ROLES) {
      // Match case-insensitively so we don't create a duplicate of an existing
      // role that only differs by capitalisation (e.g. "super admin").
      const existing = await prisma.role.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) {
        console.log(`= kept existing role: ${existing.name}`);
      } else {
        const created = await prisma.role.create({ data: { name } });
        console.log(`+ created role: ${created.name}`);
      }
    }
    const all = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    console.log('\nRoles now:', all.map((r) => r.name).join(', '));
  } catch (e) {
    console.error('Failed to seed roles:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
