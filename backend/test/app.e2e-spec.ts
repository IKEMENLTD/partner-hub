import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Auth Module', () => {
    it('/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('tokens');
        });
    });

    it('/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('/dashboard/overview (GET) - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .expect(401);
    });

    it('/projects (GET) - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/projects')
        .expect(401);
    });

    it('/tasks (GET) - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tasks')
        .expect(401);
    });

    it('/partners (GET) - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/partners')
        .expect(401);
    });
  });
});
