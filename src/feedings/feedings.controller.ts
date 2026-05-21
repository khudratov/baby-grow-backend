// src/feedings/feedings.controller.ts
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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user';
import { CreateFeedingDto } from './dto/create-feeding.dto';
import { UpdateFeedingDto } from './dto/update-feeding.dto';
import { FeedingsService } from './feedings.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FeedingsController {
  constructor(private readonly svc: FeedingsService) {}

  @Post('children/:childId/feedings')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateFeedingDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/feedings')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(user.id, childId, from, to);
  }

  @Get('children/:childId/feedings/current')
  async current(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    return this.svc.current(user.id, childId);
  }

  @Patch('feedings/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedingDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('feedings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }
}
