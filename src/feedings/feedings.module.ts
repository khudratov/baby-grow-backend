// src/feedings/feedings.module.ts
import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { TrackingModule } from '../tracking/tracking.module';
import { FeedingsController } from './feedings.controller';
import { FeedingsService } from './feedings.service';

@Module({
  imports: [FamiliesModule, TrackingModule],
  controllers: [FeedingsController],
  providers: [FeedingsService],
})
export class FeedingsModule {}
