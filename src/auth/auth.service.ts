import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user.response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = TokenPair & {
  user: UserResponseDto;
};

const GENERIC_AUTH_ERROR = 'Invalid credentials';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const cost = this.config.get<number>('BCRYPT_COST')!;
    const passwordHash = await bcrypt.hash(dto.password, cost);

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    const tokens = await this.issueTokens(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.users.toDto(user),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException(GENERIC_AUTH_ERROR);

    const tokens = await this.issueTokens(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.users.toDto(user),
    };
  }

  /**
   * Generates a new refresh token, persists its hash, signs an access token.
   * Returns the raw (unhashed) refresh token and the JWT to the caller.
   */
  async issueTokens(
    userId: string,
  ): Promise<TokenPair & { refreshTokenId: string }> {
    const cost = this.config.get<number>('BCRYPT_COST')!;
    const expiresDays = this.config.get<number>('REFRESH_TOKEN_EXPIRES_DAYS')!;
    const secret = randomBytes(64).toString('base64url');
    const tokenHash = await bcrypt.hash(secret, cost);

    const row = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    return {
      accessToken,
      refreshToken: `${userId}.${secret}`,
      refreshTokenId: row.id,
    };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const [userId, secret] = rawToken.split('.');
    if (!userId || !secret) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const candidates = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    let matched: RefreshToken | null = null;
    for (const row of candidates) {
      if (await bcrypt.compare(secret, row.tokenHash)) {
        matched = row;
        break;
      }
    }
    if (!matched) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Reuse detection: this token was already rotated. Revoke EVERY refresh
    // token for this user — the legitimate user moved past it, so this request
    // can only be from someone who stole the old token.
    if (matched.revokedAt && matched.replacedBy) {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Normal rotation: revoke old, issue new, link them.
    const newPair = await this.issueTokens(userId);
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date(), replacedBy: newPair.refreshTokenId },
    });

    return {
      accessToken: newPair.accessToken,
      refreshToken: newPair.refreshToken,
    };
  }

  /**
   * Idempotent. Always succeeds. If a valid-looking refresh token is provided,
   * mark that one row as revoked. Errors are swallowed.
   */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const [userId, secret] = rawToken.split('.');
    if (!userId || !secret) return;

    try {
      const candidates = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });
      for (const row of candidates) {
        if (await bcrypt.compare(secret, row.tokenHash)) {
          await this.prisma.refreshToken.update({
            where: { id: row.id },
            data: { revokedAt: new Date() },
          });
          return;
        }
      }
    } catch {
      // swallow — logout must be idempotent and never leak info
    }
  }
}
