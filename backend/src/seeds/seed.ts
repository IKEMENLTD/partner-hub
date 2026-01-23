import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// This script creates initial demo data
// WARNING: This script should NEVER be run in production
async function seed() {
  // SECURITY: Block execution in production environment
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed script is disabled in production environment');
    console.error(
      'This script creates demo users with known credentials and must not run in production.',
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const userRepository = dataSource.getRepository('User');

  // Check if demo user exists
  const existingUser = await userRepository.findOne({
    where: { email: 'demo@example.com' },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('Demo1234!', 10);

    await userRepository.save({
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    });

    // SECURITY: Do not log credentials even in development
    console.log('Demo user created successfully');
  } else {
    console.log('Demo user already exists');
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

seed().catch(console.error);
