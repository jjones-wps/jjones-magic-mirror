import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import 'dotenv/config';

// Create Prisma Client with driver adapter
const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const dbPath = dbUrl.replace('file:', '');
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user for testing
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Test Admin',
      role: 'admin',
    },
  });
  console.log(`✅ Created admin user: ${adminEmail}`);

  // Seed widgets
  const widgets = [
    {
      id: 'clock',
      name: 'Clock',
      description: 'Time display with greeting and feast day',
      enabled: true,
      order: 1,
      settings: JSON.stringify({
        showFeastDay: true,
        showGreeting: true,
        format24h: false,
      }),
    },
    {
      id: 'weather',
      name: 'Weather',
      description: 'Current weather and forecast',
      enabled: true,
      order: 2,
      settings: JSON.stringify({
        showForecast: true,
        forecastDays: 5,
        refreshInterval: 900000, // 15 minutes
      }),
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Upcoming events from iCal feeds',
      enabled: true,
      order: 3,
      settings: JSON.stringify({
        daysAhead: 7,
        maxEvents: 8,
        refreshInterval: 300000, // 5 minutes
      }),
    },
    {
      id: 'commute',
      name: 'Commute',
      description: 'Traffic-aware commute times',
      enabled: true,
      order: 4,
      settings: JSON.stringify({
        showOnWeekends: false,
        startHour: 6,
        endHour: 9,
      }),
    },
    {
      id: 'news',
      name: 'News',
      description: 'RSS news headlines',
      enabled: true,
      order: 5,
      settings: JSON.stringify({
        maxHeadlines: 5,
        refreshInterval: 1800000, // 30 minutes
      }),
    },
    {
      id: 'ai-summary',
      name: 'AI Summary',
      description: 'AI-generated daily briefing',
      enabled: true,
      order: 6,
      settings: JSON.stringify({
        refreshInterval: 1800000, // 30 minutes
        model: 'anthropic/claude-3-haiku',
      }),
    },
    {
      id: 'spotify',
      name: 'Spotify',
      description: 'Now playing from Spotify',
      enabled: true,
      order: 7,
      settings: JSON.stringify({
        showAlbumArt: true,
        showProgress: true,
      }),
    },
  ];

  for (const widget of widgets) {
    await prisma.widget.upsert({
      where: { id: widget.id },
      update: widget,
      create: widget,
    });
  }
  console.log(`✅ Created ${widgets.length} widgets`);

  // Seed default settings
  const settings = [
    // Weather settings
    {
      id: 'weather.latitude',
      value: JSON.stringify(41.0793),
      category: 'weather',
      label: 'Latitude',
    },
    {
      id: 'weather.longitude',
      value: JSON.stringify(-85.1394),
      category: 'weather',
      label: 'Longitude',
    },
    {
      id: 'weather.location',
      value: JSON.stringify('Fort Wayne, IN'),
      category: 'weather',
      label: 'Location Name',
    },
    // Display settings
    {
      id: 'display.brightness',
      value: JSON.stringify(100),
      category: 'display',
      label: 'Brightness (%)',
    },
    {
      id: 'display.autoRefresh',
      value: JSON.stringify(true),
      category: 'display',
      label: 'Auto Refresh',
    },
    // Calendar settings
    {
      id: 'calendar.daysAhead',
      value: JSON.stringify(7),
      category: 'calendar',
      label: 'Days Ahead',
    },
    {
      id: 'calendar.maxEvents',
      value: JSON.stringify(8),
      category: 'calendar',
      label: 'Max Events',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { id: setting.id },
      update: setting,
      create: setting,
    });
  }
  console.log(`✅ Created ${settings.length} settings`);

  // Initialize config version
  await prisma.configVersion.upsert({
    where: { id: 'current' },
    update: {},
    create: { id: 'current', version: 1 },
  });
  console.log('✅ Initialized config version');

  // Initialize system state
  await prisma.systemState.upsert({
    where: { id: 'mirror' },
    update: {},
    create: {
      id: 'mirror',
      online: true,
      lastPing: new Date(),
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    },
  });
  console.log('✅ Initialized system state');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
