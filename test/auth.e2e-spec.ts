import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  applyMigrationsOnce,
  bootstrapTestDatabaseUrl,
  truncateAll,
} from './setup-test-db';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    bootstrapTestDatabaseUrl();
    await applyMigrationsOnce();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const validUser = {
    email: 'amir@example.com',
    password: 'supersecret',
    displayName: 'Amir',
  };

  it('1. POST /auth/register: success returns user + tokens, no password fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    expect(res.body.user.email).toBe('amir@example.com');
    expect(res.body.user.displayName).toBe('Amir');
    expect(typeof res.body.user.id).toBe('string');
    expect(res.body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(20);
    expect(res.body.refreshToken).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('2. POST /auth/register: duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(409);

    expect(res.body.message).toBe('Email already in use');
  });

  it('3. POST /auth/register: validation rejects bad input with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short', displayName: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.c', password: 'goodlongpassword' })
      .expect(400);
  });

  it('4. POST /auth/login: success returns tokens', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(200);

    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.refreshToken).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/);
  });

  it('5. POST /auth/login: wrong password returns 401 with generic message', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('6. POST /auth/login: unknown email returns 401 with same generic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('7. GET /me: unauthenticated returns 401', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });
});
