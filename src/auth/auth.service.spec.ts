import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; create: jest.Mock; toDto: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let jwt: { signAsync: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      toDto: jest.fn(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        createdAt: u.createdAt.toISOString(),
      })),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        updateMany: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string | number> = {
          BCRYPT_COST: 4, // low cost for fast tests
          REFRESH_TOKEN_EXPIRES_DAYS: 30,
          JWT_ACCESS_SECRET: 'test-secret-with-at-least-32-characters!',
          JWT_ACCESS_EXPIRES: '15m',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('register: rejects duplicate email', async () => {
    users.findByEmail.mockResolvedValueOnce({ id: 'u1', email: 'a@b.c' });
    await expect(
      service.register({
        email: 'a@b.c',
        password: 'pw12345678',
        displayName: 'X',
      }),
    ).rejects.toThrow('Email already in use');
  });

  it('register: hashes password and returns tokens', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    users.create.mockImplementationOnce(async input => ({
      id: 'u1',
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }));

    const result = await service.register({
      email: 'a@b.c',
      password: 'pw12345678',
      displayName: 'X',
    });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toMatch(/^u1\.[A-Za-z0-9_-]+$/);
    expect(result.user.email).toBe('a@b.c');
    expect(result).not.toHaveProperty('refreshTokenId');
    // password hash was actually a bcrypt hash, not the raw password
    const createdHash = (
      users.create.mock.calls[0][0] as { passwordHash: string }
    ).passwordHash;
    expect(await bcrypt.compare('pw12345678', createdHash)).toBe(true);
  });

  it('login: rejects unknown email with generic message', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'nobody@x.com', password: 'pw12345678' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('login: rejects wrong password with generic message', async () => {
    const hash = await bcrypt.hash('the-right-password', 4);
    users.findByEmail.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.c',
      passwordHash: hash,
    });
    await expect(
      service.login({ email: 'a@b.c', password: 'the-wrong-password' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('login: returns tokens on success', async () => {
    const hash = await bcrypt.hash('pw12345678', 4);
    users.findByEmail.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.c',
      passwordHash: hash,
      displayName: 'X',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const result = await service.login({
      email: 'a@b.c',
      password: 'pw12345678',
    });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toMatch(/^u1\.[A-Za-z0-9_-]+$/);
    expect(result).not.toHaveProperty('refreshTokenId');
  });

  describe('refresh', () => {
    it('rotates: revokes old, issues new', async () => {
      const secret = 'real-secret';
      const hash = await bcrypt.hash(secret, 4);
      prisma.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'old-id',
          userId: 'u1',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: null,
          replacedBy: null,
          createdAt: new Date(),
          userAgent: null,
        },
      ]);
      prisma.refreshToken.create.mockResolvedValueOnce({ id: 'new-id' });

      const result = await service.refresh(`u1.${secret}`);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toMatch(/^u1\.[A-Za-z0-9_-]+$/);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'old-id' },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
          replacedBy: 'new-id',
        }),
      });
    });

    it('reuse detection: revokes entire chain when an already-rotated token is replayed', async () => {
      const secret = 'real-secret';
      const hash = await bcrypt.hash(secret, 4);
      prisma.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'old-id',
          userId: 'u1',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: new Date(), // already revoked
          replacedBy: 'some-newer-id', // and rotated
          createdAt: new Date(),
          userAgent: null,
        },
      ]);

      await expect(service.refresh(`u1.${secret}`)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects malformed token', async () => {
      await expect(service.refresh('not-a-valid-token')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('rejects expired/unknown token (no candidates found)', async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([]);
      await expect(service.refresh('u1.some-secret')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('logout', () => {
    it('is idempotent with no token', async () => {
      await expect(service.logout()).resolves.toBeUndefined();
    });

    it('is idempotent with a malformed token', async () => {
      await expect(service.logout('garbage')).resolves.toBeUndefined();
    });

    it('marks the matched token revoked', async () => {
      const secret = 'real-secret';
      const hash = await bcrypt.hash(secret, 4);
      prisma.refreshToken.findMany.mockResolvedValueOnce([
        { id: 'rt-1', userId: 'u1', tokenHash: hash, revokedAt: null },
      ]);

      await service.logout(`u1.${secret}`);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
