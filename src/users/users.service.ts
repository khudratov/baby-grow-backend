import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from './dto/user.response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdWithFamilies(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                children: {
                  select: { id: true, name: true, avatarUrl: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });
  }

  toDto(
    user: User & {
      memberships?: Array<{
        role: string;
        perms: string;
        family: {
          id: string;
          name: string;
          children?: Array<{
            id: string;
            name: string;
            avatarUrl: string | null;
          }>;
        };
      }>;
    },
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
      families: (user.memberships ?? []).map(m => ({
        id: m.family.id,
        name: m.family.name,
        role: m.role,
        perms: m.perms,
        children: (m.family.children ?? []).map(c => ({
          id: c.id,
          name: c.name,
          avatarUrl: c.avatarUrl,
        })),
      })),
    };
  }
}
