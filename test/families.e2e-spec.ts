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

describe('Families (e2e)', () => {
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

  async function register(
    email: string,
  ): Promise<{ token: string; userId: string }> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'supersecret', displayName: 'Test' })
      .expect(201);
    return { token: res.body.accessToken, userId: res.body.user.id };
  }

  it('POST /families creates family with caller as PRIMARY_PARENT/FULL membership', async () => {
    const { token, userId } = await register('owner@example.com');
    const res = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Qudratov family' })
      .expect(201);

    expect(res.body.name).toBe('Qudratov family');
    expect(typeof res.body.id).toBe('string');

    const memberships = await prisma.familyMembership.findMany({
      where: { familyId: res.body.id },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      userId,
      role: 'PRIMARY_PARENT',
      perms: 'FULL',
    });
  });

  it('GET /families lists families the caller is a member of', async () => {
    const { token } = await register('owner@example.com');
    await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/families')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body).toHaveLength(2);
    expect(list.body.map((f: any) => f.name).sort()).toEqual(['A', 'B']);
  });
});
