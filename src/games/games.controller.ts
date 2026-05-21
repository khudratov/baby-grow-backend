import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('catalog/games')
export class GamesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
  ) {
    const where: any = {};
    if (ageMin !== undefined) where.ageMin = { gte: parseInt(ageMin, 10) };
    if (ageMax !== undefined) where.ageMax = { lte: parseInt(ageMax, 10) };
    return this.prisma.gameCatalog.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }
}
