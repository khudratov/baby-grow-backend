import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user';
import { RequireFamilyAccess } from './decorators/require-family-access.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { FamilyPermsGuard } from './guards/family-perms.guard';
import { InvitesService } from './invites.service';
import { MembersService } from './members.service';

@UseGuards(JwtAuthGuard, FamilyPermsGuard)
@Controller()
export class MembersController {
  constructor(
    private readonly invites: InvitesService,
    private readonly members: MembersService,
  ) {}

  @Post('families/:familyId/invites')
  @RequireFamilyAccess('primary')
  async createInvite(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invites.create(
      familyId,
      dto.role,
      dto.perms,
      dto.expiresInHours ?? 168,
    );
  }

  @Get('families/:familyId/invites')
  @RequireFamilyAccess('read')
  async listInvites(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.invites.listActive(familyId);
  }

  @Delete('families/:familyId/invites/:inviteId')
  @RequireFamilyAccess('primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    await this.invites.revoke(familyId, inviteId);
  }

  @Post('families/join')
  async join(@CurrentUser() user: AuthUser, @Body() dto: JoinFamilyDto) {
    return this.invites.redeem(dto.code, user.id);
  }

  @Get('families/:familyId/members')
  @RequireFamilyAccess('read')
  async listMembers(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.members.list(familyId);
  }

  @Patch('families/:familyId/members/:userId')
  @RequireFamilyAccess('primary')
  async updateMember(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.members.update(familyId, userId, dto);
  }

  @Delete('families/:familyId/members/:userId')
  @RequireFamilyAccess('primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.members.remove(familyId, userId, user.id);
  }
}
