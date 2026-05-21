import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { DiapersController } from './diapers.controller';
import { DiapersService } from './diapers.service';

@Module({
  imports: [FamiliesModule],
  controllers: [DiapersController],
  providers: [DiapersService],
})
export class DiapersModule {}
