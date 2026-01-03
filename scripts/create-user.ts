import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = dbUrl.replace('file:', '');
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash('password', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@mirror.local' },
    update: { passwordHash },
    create: {
      email: 'admin@mirror.local',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
    },
  });

  console.log('✅ Created user:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
