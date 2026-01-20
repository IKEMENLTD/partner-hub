import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// This script creates initial demo data
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'partner',
    password: process.env.DB_PASSWORD || 'partner123',
    database: process.env.DB_DATABASE || 'partner_hub',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
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

    console.log('Demo user created: demo@example.com / Demo1234!');
  } else {
    console.log('Demo user already exists');
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

seed().catch(console.error);
