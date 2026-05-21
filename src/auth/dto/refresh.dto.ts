import { IsString, Matches } from 'class-validator';

export class RefreshDto {
  @IsString()
  @Matches(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/, {
    message: 'refreshToken must be in the form <uuid>.<base64url>',
  })
  refreshToken!: string;
}
