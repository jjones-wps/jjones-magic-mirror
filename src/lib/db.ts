import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Prisma Client singleton for Next.js with v7 driver adapter
// Prevents multiple instances during hot reloading in development

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Get database path from env or use default
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const dbPath = dbUrl.replace('file:', '');

  // Resolve relative paths from project root
  const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

  // Create Prisma adapter with URL config
  const adapter = new PrismaBetterSqlite3({ url: absolutePath });

  // Create Prisma Client with adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
