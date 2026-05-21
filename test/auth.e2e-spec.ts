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

  it('8. GET /me with valid access token returns the user', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(validUser.email);
    expect(res.body.displayName).toBe(validUser.displayName);
    expect(res.body.id).toBe(registered.body.user.id);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/i);
    expect(Array.isArray(res.body.families)).toBe(true);
    expect(res.body.families).toHaveLength(0); // new user, no families yet
  });

  it('9. GET /me with malformed token returns 401', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('10. POST /auth/refresh rotates: returns new tokens, old token revoked', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);
    const firstRefresh = registered.body.refreshToken as string;

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefresh })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(firstRefresh);
    expect(res.body.refreshToken).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/);

    // The original refresh token row should be revoked in the DB
    const userId = registered.body.user.id as string;
    const rows = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].revokedAt).not.toBeNull();
    expect(rows[0].replacedBy).toBe(rows[1].id);
    expect(rows[1].revokedAt).toBeNull();
  });

  it('11. POST /auth/refresh with already-rotated token: 401 and revokes entire chain', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);
    const firstRefresh = registered.body.refreshToken as string;

    // First refresh succeeds
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefresh })
      .expect(200);

    // Second refresh with the original (now-revoked) token: reuse detected
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefresh })
      .expect(401);
    expect(res.body.message).toBe('Invalid credentials');

    // ALL refresh-token rows for this user should now be revoked
    const userId = registered.body.user.id as string;
    const rows = await prisma.refreshToken.findMany({ where: { userId } });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.revokedAt).not.toBeNull();
    }
  });

  it('12. POST /auth/logout with valid token: 204, refresh token revoked', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .send({ refreshToken: registered.body.refreshToken })
      .expect(204);

    const userId = registered.body.user.id as string;
    const rows = await prisma.refreshToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).not.toBeNull();
  });

  it('13. POST /auth/logout with no body: 204 (no-op, no error)', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .send({})
      .expect(204);

    // The original refresh token is still valid (no body = nothing to revoke)
    const userId = registered.body.user.id as string;
    const rows = await prisma.refreshToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).toBeNull();
  });
});
