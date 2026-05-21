import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Child, FamilyMembership, FamilyPerms } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TodaySummary = {
  meals: number;
  nappedLabel: string;
  diaperChanges: number;
};

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    familyId: string,
    membership: FamilyMembership,
    data: { name: string; sex?: string; birthday: string; avatarUrl?: string },
  ): Promise<Child> {
    if (
      data.avatarUrl &&
      membership.perms !== FamilyPerms.FULL &&
      membership.perms !== FamilyPerms.TRACKER_PHOTOS
    ) {
      throw new ForbiddenException('Insufficient family permissions');
    }
    return this.prisma.child.create({
      data: {
        familyId,
        name: data.name,
        sex: data.sex,
        birthday: new Date(data.birthday),
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async listForFamily(familyId: string): Promise<Child[]> {
    return this.prisma.child.findMany({
      where: { familyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(
    childId: string,
  ): Promise<Child & { todaySummary: TodaySummary }> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) throw new NotFoundException('Child not found');

    const start = startOfTodayUtc();
    const end = endOfTodayUtc();

    const [meals, diaperChanges, sleepsToday] = await this.prisma.$transaction([
      this.prisma.feeding.count({
        where: { childId, startedAt: { gte: start, lt: end } },
      }),
      this.prisma.diaperChange.count({
        where: { childId, at: { gte: start, lt: end } },
      }),
      this.prisma.sleep.findMany({
        where: { childId, startedAt: { gte: start, lt: end } },
        select: { startedAt: true, endedAt: true },
      }),
    ]);

    const nappedMinutes = sleepsToday.reduce((acc, s) => {
      const endTime = s.endedAt ?? new Date();
      return (
        acc +
        Math.max(
          0,
          Math.floor((endTime.getTime() - s.startedAt.getTime()) / 60_000),
        )
      );
    }, 0);

    return {
      ...child,
      todaySummary: {
        meals,
        diaperChanges,
        nappedLabel: formatMinutes(nappedMinutes),
      },
    };
  }

  async update(
    childId: string,
    membership: FamilyMembership,
    data: Partial<{
      name: string;
      sex: string;
      birthday: string;
      avatarUrl: string;
    }>,
  ): Promise<Child> {
    if (
      'avatarUrl' in data &&
      membership.perms !== FamilyPerms.FULL &&
      membership.perms !== FamilyPerms.TRACKER_PHOTOS
    ) {
      throw new ForbiddenException('Insufficient family permissions');
    }
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.sex !== undefined) patch.sex = data.sex;
    if (data.birthday !== undefined) patch.birthday = new Date(data.birthday);
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
    return this.prisma.child.update({ where: { id: childId }, data: patch });
  }

  async delete(childId: string): Promise<void> {
    await this.prisma.child.delete({ where: { id: childId } });
  }
}

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function endOfTodayUtc(): Date {
  const start = startOfTodayUtc();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
