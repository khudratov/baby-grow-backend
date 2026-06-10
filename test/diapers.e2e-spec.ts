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

describe('Diapers (e2e)', () => {
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

  async function setStock(token: string, childId: string, stock: number) {
    await request(app.getHttpServer())
      .patch(`/children/${childId}/diaper-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock })
      .expect(200);
  }

  async function getStock(token: string, childId: string): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/children/${childId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.diaperStock as number;
  }

  it('POST diaper + GET range returns it', async () => {
    const { token, childId } = await setupChild();
    const at = new Date();
    const atIso = at.toISOString();
    const toDate = new Date(at.getTime() + 1000).toISOString();
    await request(app.getHttpServer())
      .post(`/children/${childId}/diapers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'WET', at: atIso })
      .expect(201);
    const list = await request(app.getHttpServer())
      .get(
        `/children/${childId}/diapers?from=${atIso.slice(0, 10)}&to=${toDate}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('a DIAPER change decrements stock by 1', async () => {
    const { token, childId } = await setupChild();
    await setStock(token, childId, 10);
    await request(app.getHttpServer())
      .post(`/children/${childId}/diapers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'WET', at: new Date().toISOString() }) // via omitted → DIAPER
      .expect(201);
    expect(await getStock(token, childId)).toBe(9);
  });

  it('a POTTY use does NOT decrement stock', async () => {
    const { token, childId } = await setupChild();
    await setStock(token, childId, 10);
    const res = await request(app.getHttpServer())
      .post(`/children/${childId}/diapers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'WET', via: 'POTTY', at: new Date().toISOString() })
      .expect(201);
    expect(res.body.via).toBe('POTTY');
    expect(await getStock(token, childId)).toBe(10);
  });
});
