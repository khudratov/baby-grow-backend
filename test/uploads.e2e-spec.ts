import * as fs from 'fs';
import * as path from 'path';
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

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAarVyFEAAAAASUVORK5CYII=',
  'base64',
);

describe('Uploads (e2e)', () => {
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

  async function getToken() {
    const r = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'u@example.com',
        password: 'supersecret',
        displayName: 'U',
      })
      .expect(201);
    return r.body.accessToken as string;
  }

  it('POST multipart PNG returns URL; GET that URL serves the bytes', async () => {
    const token = await getToken();
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1X1, {
        filename: 'pixel.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const fetchRes = await request(app.getHttpServer())
      .get(res.body.url)
      .expect(200);
    expect(fetchRes.body).toBeInstanceOf(Buffer);
    expect(fetchRes.body.length).toBe(PNG_1X1.length);

    // Cleanup: remove file written during the test
    const filePath = path.join(process.cwd(), res.body.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('POST non-image → 400', async () => {
    const token = await getToken();
    await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'x.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });
});
