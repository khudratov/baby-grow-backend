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

describe('Sleeps (e2e)', () => {
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

  async function setupChild(): Promise<{ token: string; childId: string }> {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'p@example.com',
        password: 'supersecret',
        displayName: 'P',
      })
      .expect(201);
    const token = reg.body.accessToken as string;
    const fam = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'F' })
      .expect(201);
    const child = await request(app.getHttpServer())
      .post(`/families/${fam.body.id}/children`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Amir', birthday: '2024-01-01' })
      .expect(201);
    return { token, childId: child.body.id as string };
  }

  it('POST live sleep creates row + CurrentSession; GET current returns it; PATCH endedAt clears current', async () => {
    const { token, childId } = await setupChild();

    const created = await request(app.getHttpServer())
      .post(`/children/${childId}/sleeps`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'NAP', startedAt: new Date().toISOString() })
      .expect(201);
    expect(created.body.endedAt).toBeNull();

    const sessions = await prisma.currentSession.findMany({
      where: { childId, kind: 'SLEEP' },
    });
    expect(sessions).toHaveLength(1);

    const current = await request(app.getHttpServer())
      .get(`/children/${childId}/sleeps/current`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(current.body.id).toBe(created.body.id);

    await request(app.getHttpServer())
      .patch(`/sleeps/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endedAt: new Date().toISOString() })
      .expect(200);

    const afterEnd = await prisma.currentSession.findMany({
      where: { childId, kind: 'SLEEP' },
    });
    expect(afterEnd).toHaveLength(0);
  });

  it('a second live Sleep while one is active → 409', async () => {
    const { token, childId } = await setupChild();
    await request(app.getHttpServer())
      .post(`/children/${childId}/sleeps`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'NAP', startedAt: new Date().toISOString() })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/children/${childId}/sleeps`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'NAP', startedAt: new Date().toISOString() })
      .expect(409);
    expect(second.body.message).toMatch(/already active/i);
  });
});
