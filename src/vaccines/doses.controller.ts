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
import { CreateVaccineDoseDto } from './dto/create-vaccine-dose.dto';
import { UpdateVaccineDoseDto } from './dto/update-vaccine-dose.dto';
import { VaccinesService } from './vaccines.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DosesController {
  constructor(private readonly svc: VaccinesService) {}

  @Post('children/:childId/vaccines')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateVaccineDoseDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/vaccines')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    return this.svc.listForChild(user.id, childId);
  }

  @Patch('vaccines/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVaccineDoseDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('vaccines/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }
}
