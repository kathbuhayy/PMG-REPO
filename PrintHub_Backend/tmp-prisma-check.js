require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('connected');
    const count = await prisma.product.count();
    console.log('product count', count);
  } catch (e) {
    console.error('connect-error', e.message);
    if (e.code) console.error('code', e.code);
    if (e.meta) console.error('meta', JSON.stringify(e.meta));
  } finally {
    await prisma.$disconnect();
  }
}

main();
