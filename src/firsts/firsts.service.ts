import { Injectable } from '@nestjs/common';
import { FirstMoment } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateFirstDto } from './dto/create-first.dto';
import { UpdateFirstDto } from './dto/update-first.dto';

@Injectable()
export class FirstsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateFirstDto,
  ): Promise<FirstMoment> {
    const tier = dto.photoUrl ? 'photos' : 'tracker';
    await assertFamilyAccessForChild(this.prisma, userId, childId, tier);
    return this.prisma.firstMoment.create({
      data: {
        childId,
        title: dto.title,
        date: new Date(dto.date),
        photoUrl: dto.photoUrl,
        note: dto.note,
      },
    });
  }

  async list(
    userId: string,
    childId: string,
    from?: string,
    to?: string,
  ): Promise<FirstMoment[]> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const range = parseDateRange(from, to);
    return this.prisma.firstMoment.findMany({
      where: { childId, date: { gte: range.from, lt: range.to } },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFirstDto,
  ): Promise<FirstMoment> {
    const existing = await this.prisma.firstMoment.findUnique({
      where: { id },
      select: { childId: true },
    });
    const tier = 'photoUrl' in dto ? 'photos' : 'tracker';
    await assertFamilyAccessForEntity(this.prisma, userId, existing, tier);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.firstMoment.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.firstMoment.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.firstMoment.delete({ where: { id } });
  }
}
