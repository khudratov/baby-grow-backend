import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
