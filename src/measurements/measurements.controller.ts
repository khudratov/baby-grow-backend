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
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { MeasurementsService } from './measurements.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MeasurementsController {
  constructor(private readonly svc: MeasurementsService) {}

  @Post('children/:childId/measurements')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/measurements')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(user.id, childId, from, to);
  }

  @Patch('measurements/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeasurementDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('measurements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }

  @Get('measurements/:id/revisions')
  async listRevisions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.listRevisions(user.id, id);
  }
}
