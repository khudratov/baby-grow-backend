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
import { CreateMilestoneCompletionDto } from './dto/create-milestone-completion.dto';
import { UpdateMilestoneCompletionDto } from './dto/update-milestone-completion.dto';
import { MilestonesService } from './milestones.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CompletionsController {
  constructor(private readonly svc: MilestonesService) {}

  @Post('children/:childId/milestones')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Body() dto: CreateMilestoneCompletionDto,
  ) {
    return this.svc.create(user.id, childId, dto);
  }

  @Get('children/:childId/milestones')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('childId', ParseUUIDPipe) childId: string,
  ) {
    return this.svc.listForChild(user.id, childId);
  }

  @Patch('milestones/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneCompletionDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.svc.delete(user.id, id);
  }
}
