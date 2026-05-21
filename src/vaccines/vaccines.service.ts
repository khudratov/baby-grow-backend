import { Injectable } from '@nestjs/common';
import { VaccineDose } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVaccineDoseDto } from './dto/create-vaccine-dose.dto';
import { UpdateVaccineDoseDto } from './dto/update-vaccine-dose.dto';

@Injectable()
export class VaccinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateVaccineDoseDto,
  ): Promise<VaccineDose> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    return this.prisma.vaccineDose.create({
      data: {
        childId,
        catalogVaccineId: dto.catalogVaccineId,
        status: dto.status,
        givenAt: dto.givenAt ? new Date(dto.givenAt) : undefined,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        location: dto.location,
      },
    });
  }

  async listForChild(userId: string, childId: string) {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    return this.prisma.vaccineDose.findMany({
      where: { childId },
      include: { catalog: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateVaccineDoseDto,
  ): Promise<VaccineDose> {
    const existing = await this.prisma.vaccineDose.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.givenAt !== undefined) data.givenAt = new Date(dto.givenAt);
    if (dto.scheduledFor !== undefined)
      data.scheduledFor = new Date(dto.scheduledFor);
    if (dto.location !== undefined) data.location = dto.location;
    return this.prisma.vaccineDose.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.vaccineDose.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.vaccineDose.delete({ where: { id } });
  }
}
