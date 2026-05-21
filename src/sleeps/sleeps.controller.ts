// src/sleeps/sleeps.controller.ts
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
import { CreateSleepDto } from './dto/create-sleep.dto';
import { UpdateSleepDto } from './dto/update-sleep.dto';
import { SleepsService } from './sleeps.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SleepsController {
  constructor(private readonly svc: SleepsService) {}

  @Post('children/:childId/sleeps')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateSleepDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/sleeps')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(user.id, childId, from, to);
  }

  @Get('children/:childId/sleeps/current')
  async current(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    return this.svc.current(user.id, childId);
  }

  @Patch('sleeps/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSleepDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('sleeps/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }
}
