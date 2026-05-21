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

describe('Vaccines (e2e)', () => {
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

  it('GET /catalog/vaccines returns seeded rows; POST + GET child doses', async () => {
    const { token, childId } = await setupChild();
    const catalog = await request(app.getHttpServer())
      .get('/catalog/vaccines')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(catalog.body.length).toBeGreaterThan(0);
    const vaxId = catalog.body[0].id;

    await request(app.getHttpServer())
      .post(`/children/${childId}/vaccines`)
      .set('Authorization', `Bearer ${token}`)
      .send({ catalogVaccineId: vaxId, status: 'DONE', givenAt: '2024-06-15' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/children/${childId}/vaccines`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].catalog.name).toBeDefined();
  });
});
