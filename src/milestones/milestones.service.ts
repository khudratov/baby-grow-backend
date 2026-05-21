import { Injectable } from '@nestjs/common';
import { MilestoneCompletion } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneCompletionDto } from './dto/create-milestone-completion.dto';
import { UpdateMilestoneCompletionDto } from './dto/update-milestone-completion.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateMilestoneCompletionDto,
  ): Promise<MilestoneCompletion> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    const data = {
      status: dto.status,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      note: dto.note,
    };
    return this.prisma.milestoneCompletion.upsert({
      where: {
        childId_catalogMilestoneId: {
          childId,
          catalogMilestoneId: dto.catalogMilestoneId,
        },
      },
      create: { childId, catalogMilestoneId: dto.catalogMilestoneId, ...data },
      update: data,
    });
  }

  async listForChild(userId: string, childId: string) {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    return this.prisma.milestoneCompletion.findMany({
      where: { childId },
      include: { catalog: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMilestoneCompletionDto,
  ): Promise<MilestoneCompletion> {
    const existing = await this.prisma.milestoneCompletion.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.completedAt !== undefined)
      data.completedAt = new Date(dto.completedAt);
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.milestoneCompletion.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.milestoneCompletion.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.milestoneCompletion.delete({ where: { id } });
  }
}
