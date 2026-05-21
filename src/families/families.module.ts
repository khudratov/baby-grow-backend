import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { FamilyPermsGuard } from './guards/family-perms.guard';

@Module({
  controllers: [FamiliesController],
  providers: [FamiliesService, FamilyPermsGuard],
  exports: [FamiliesService, FamilyPermsGuard],
})
export class FamiliesModule {}
