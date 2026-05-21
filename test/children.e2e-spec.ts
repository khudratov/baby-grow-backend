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

describe('Children (e2e)', () => {
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

  async function setupFamily() {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'owner@example.com',
        password: 'supersecret',
        displayName: 'Owner',
      })
      .expect(201);
    const token = reg.body.accessToken as string;
    const fam = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'F' })
      .expect(201);
    return { token, familyId: fam.body.id as string };
  }

  it('POST creates child; GET returns it with todaySummary; outsider GET → 404', async () => {
    const owner = await setupFamily();
    const created = await request(app.getHttpServer())
      .post(`/families/${owner.familyId}/children`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Amir', sex: 'boy', birthday: '2023-03-14' })
      .expect(201);
    expect(created.body.name).toBe('Amir');

    const got = await request(app.getHttpServer())
      .get(`/children/${created.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(got.body.todaySummary).toEqual({
      meals: 0,
      nappedLabel: '0m',
      diaperChanges: 0,
    });

    // outsider
    const outReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'out@example.com',
        password: 'supersecret',
        displayName: 'Out',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/children/${created.body.id}`)
      .set('Authorization', `Bearer ${outReg.body.accessToken}`)
      .expect(404);
  });
});
