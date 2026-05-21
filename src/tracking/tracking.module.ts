// src/tracking/tracking.module.ts
import { Module } from '@nestjs/common';
import { CurrentSessionService } from './current-session.service';

@Module({
  providers: [CurrentSessionService],
  exports: [CurrentSessionService],
})
export class TrackingModule {}
