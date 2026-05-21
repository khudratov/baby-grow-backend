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
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamiliesService } from './families.service';
import { FamilyPermsGuard } from './guards/family-perms.guard';

@UseGuards(JwtAuthGuard, FamilyPermsGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly families: FamiliesService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyDto) {
    return this.families.createForUser(user.id, dto.name);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.families.listForUser(user.id);
  }

  @Get(':familyId')
  @RequireFamilyAccess('read')
  async getOne(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.families.findByIdOrThrow(familyId);
  }

  @Patch(':familyId')
  @RequireFamilyAccess('primary')
  async update(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.families.update(familyId, dto.name!);
  }

  @Delete(':familyId')
  @RequireFamilyAccess('primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('familyId', ParseUUIDPipe) familyId: string) {
    await this.families.delete(familyId);
  }
}
