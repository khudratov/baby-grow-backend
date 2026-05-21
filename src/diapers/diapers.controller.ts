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
import { CreateDiaperDto } from './dto/create-diaper.dto';
import { UpdateDiaperDto } from './dto/update-diaper.dto';
import { DiapersService } from './diapers.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DiapersController {
  constructor(private readonly svc: DiapersService) {}

  @Post('children/:childId/diapers')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateDiaperDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/diapers')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(user.id, childId, from, to);
  }

  @Patch('diapers/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiaperDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('diapers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }
}
