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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FamilyMembership } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireFamilyAccess } from '../families/decorators/require-family-access.decorator';
import { FamilyPermsGuard } from '../families/guards/family-perms.guard';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@UseGuards(JwtAuthGuard, FamilyPermsGuard)
@Controller()
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Post('families/:familyId/children')
  @RequireFamilyAccess('read')
  async create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateChildDto,
    @Req() req: Request & { familyMembership: FamilyMembership },
  ) {
    return this.children.create(familyId, req.familyMembership, dto);
  }

  @Get('families/:familyId/children')
  @RequireFamilyAccess('read')
  async list(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.children.listForFamily(familyId);
  }

  @Get('children/:childId')
  @RequireFamilyAccess('read')
  async one(@Param('childId', ParseUUIDPipe) childId: string) {
    return this.children.findById(childId);
  }

  @Patch('children/:childId')
  @RequireFamilyAccess('read')
  async update(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: UpdateChildDto,
    @Req() req: Request & { familyMembership: FamilyMembership },
  ) {
    return this.children.update(childId, req.familyMembership, dto);
  }

  @Delete('children/:childId')
  @RequireFamilyAccess('primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('childId', ParseUUIDPipe) childId: string) {
    await this.children.delete(childId);
  }
}
