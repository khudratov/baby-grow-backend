import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  applyMigrationsOnce,
  bootstrapTestDatabaseUrl,
  truncateAll,
} from './setup-test-db';

describe('Family members (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    bootstrapTestDatabaseUrl();
    await applyMigrationsOnce();
    const m = await Test.createTestingModule({
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
    return { token: res.body.accessToken, userId: res.body.user.id };
  }

  it('PRIMARY_PARENT can PATCH role; COPARENT trying to PATCH → 403', async () => {
    const primary = await register('primary@example.com');
    const fam = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${primary.token}`)
      .send({ name: 'F' })
      .expect(201);

    // Invite a coparent
    const invite = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/invites`)
      .set('Authorization', `Bearer ${primary.token}`)
      .send({ role: 'COPARENT', perms: 'FULL' })
      .expect(201);
    const cop = await register('cop@example.com');
    await request(app.getHttpServer())
      .post('/families/join')
      .set('Authorization', `Bearer ${cop.token}`)
      .send({ code: invite.body.code })
      .expect(201);

    // Primary patches coparent's perms → 200
    await request(app.getHttpServer())
      .patch(`/families/${fam.body.id}/members/${cop.userId}`)
      .set('Authorization', `Bearer ${primary.token}`)
      .send({ perms: 'TRACKER_PHOTOS' })
      .expect(200);

    // Coparent tries to patch primary's perms → 403
    await request(app.getHttpServer())
      .patch(`/families/${fam.body.id}/members/${primary.userId}`)
      .set('Authorization', `Bearer ${cop.token}`)
      .send({ perms: 'TRACKER_ONLY' })
      .expect(403);
  });
});
