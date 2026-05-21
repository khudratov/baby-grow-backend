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

describe('Firsts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    bootstrapTestDatabaseUrl();
    await applyMigrationsOnce();
    const m: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
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
    return {
      token: res.body.accessToken as string,
      userId: res.body.user.id as string,
    };
  }

  it('POST with photoUrl requires photos tier; TRACKER_ONLY → 403; TRACKER_PHOTOS → 201', async () => {
    const owner = await register('owner@example.com');
    const fam = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'F' })
      .expect(201);
    const child = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/children`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Amir', birthday: '2024-01-01' })
      .expect(201);

    // Invite TRACKER_ONLY nanny
    const inv1 = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/invites`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'NANNY', perms: 'TRACKER_ONLY' })
      .expect(201);
    const nanny = await register('nanny@example.com');
    await request(app.getHttpServer())
      .post('/families/join')
      .set('Authorization', `Bearer ${nanny.token}`)
      .send({ code: inv1.body.code })
      .expect(201);

    // Invite TRACKER_PHOTOS grandma
    const inv2 = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/invites`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'GRANDMA', perms: 'TRACKER_PHOTOS' })
      .expect(201);
    const grandma = await register('grandma@example.com');
    await request(app.getHttpServer())
      .post('/families/join')
      .set('Authorization', `Bearer ${grandma.token}`)
      .send({ code: inv2.body.code })
      .expect(201);

    // Nanny posts with photoUrl → 403
    await request(app.getHttpServer())
      .post(`/children/${child.body.id}/firsts`)
      .set('Authorization', `Bearer ${nanny.token}`)
      .send({
        title: 'First step',
        date: '2024-09-01',
        photoUrl: '/uploads/x.jpg',
      })
      .expect(403);

    // Grandma posts with photoUrl → 201
    await request(app.getHttpServer())
      .post(`/children/${child.body.id}/firsts`)
      .set('Authorization', `Bearer ${grandma.token}`)
      .send({
        title: 'First step',
        date: '2024-09-01',
        photoUrl: '/uploads/x.jpg',
      })
      .expect(201);
  });
});
