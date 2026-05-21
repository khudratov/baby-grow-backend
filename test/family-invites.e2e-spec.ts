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

describe('Family invites (e2e)', () => {
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

  async function register(email: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'supersecret', displayName: email })
      .expect(201);
    return { token: res.body.accessToken, userId: res.body.user.id };
  }

  it('full flow: create invite → second user joins → both appear in /members', async () => {
    const owner = await register('owner@example.com');
    const fam = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Test Family' })
      .expect(201);

    const inviteRes = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/invites`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'GRANDMA', perms: 'TRACKER_PHOTOS' })
      .expect(201);

    const code = inviteRes.body.code as string;
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(10);

    const grandma = await register('grandma@example.com');
    const joinRes = await request(app.getHttpServer())
      .post('/families/join')
      .set('Authorization', `Bearer ${grandma.token}`)
      .send({ code })
      .expect(201);
    expect(joinRes.body.role).toBe('GRANDMA');
    expect(joinRes.body.perms).toBe('TRACKER_PHOTOS');

    const members = await request(app.getHttpServer())
      .get(`/families/${fam.body.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(members.body).toHaveLength(2);
    const emails = members.body.map((m: any) => m.user.email).sort();
    expect(emails).toEqual(['grandma@example.com', 'owner@example.com']);
  });
});
