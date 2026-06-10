import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import sharp from 'sharp';
import { AppModule } from './app.module';

// sharp/libvips defaults are tuned for big multi-core boxes and balloon memory
// on small containers (the prod box was OOM-killed). Constrain it process-wide,
// once, before any request runs:
//  - concurrency(1): serialize the native threadpool so two uploads can't
//    multiply peak RAM and OOM the container.
//  - cache(false): don't hold decoded images / file handles in memory between
//    operations — we process each upload once and never re-read it.
sharp.concurrency(1);
sharp.cache(false);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigins = config.get<string>('CORS_ORIGINS');
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : true,
    credentials: true,
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`BabyGrow backend listening on port ${port}`);
}

void bootstrap();
