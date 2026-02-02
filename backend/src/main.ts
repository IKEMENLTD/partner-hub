import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppDataSource } from './config/data-source';

async function runMigrations() {
  const logger = new Logger('Migrations');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    logger.log('Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length > 0) {
      logger.log(
        `Executed ${migrations.length} migration(s): ${migrations.map((m) => m.name).join(', ')}`,
      );
    } else {
      logger.log('No pending migrations');
    }
    await AppDataSource.destroy();
  } catch (error) {
    logger.error('Migration failed:', error.message);
    // Don't throw - allow app to start even if migrations fail
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Run migrations before starting the app
  await runMigrations();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // Set global prefix
  app.setGlobalPrefix(apiPrefix);

  // SECURITY FIX: Add security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable CORS
  const corsOrigin = configService.get<string>('app.corsOrigin');
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? corsOrigin
          ? corsOrigin.split(',').map((origin) => origin.trim())
          : []
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Partner Collaboration Platform API')
      .setDescription(
        `API documentation for the Partner Collaboration Platform.

## Features
- **Authentication**: JWT-based authentication with role-based access control
- **Project Management**: Create and manage projects with partners
- **Task Management**: Assign and track tasks across projects
- **Partner Management**: Manage partner relationships and performance
- **Reminders**: Automated reminder system for deadlines and tasks
- **Dashboard**: Real-time statistics and analytics

## Authentication
All endpoints except login and register require a valid JWT token.
Include the token in the Authorization header: \`Bearer <token>\`
      `,
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication and user management')
      .addTag('Partners', 'Partner management')
      .addTag('Projects', 'Project management')
      .addTag('Tasks', 'Task management')
      .addTag('Reminders', 'Reminder management')
      .addTag('Dashboard', 'Dashboard and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
  }

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${nodeEnv}`);

  // SECURITY: Production environment checks
  if (nodeEnv === 'production') {
    logger.log('Running in PRODUCTION mode - security features enabled');
  } else {
    logger.warn('WARNING: Running in development mode - NOT suitable for production!');
    logger.warn('Make sure to set NODE_ENV=production in production environment');
  }
}

bootstrap();
