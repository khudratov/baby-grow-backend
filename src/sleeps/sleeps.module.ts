// src/sleeps/sleeps.module.ts
import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SleepsController } from './sleeps.controller';
import { SleepsService } from './sleeps.service';

@Module({
  imports: [FamiliesModule, TrackingModule],
  controllers: [SleepsController],
  providers: [SleepsService],
})
export class SleepsModule {}
