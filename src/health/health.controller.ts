import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthResponse = {
  status: 'ok';
  db: 'ok' | 'down';
  uptime: number;
  timestamp: string;
};

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    let db: 'ok' | 'down' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }

    return {
      status: 'ok',
      db,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
