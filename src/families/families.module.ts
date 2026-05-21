import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { FamilyPermsGuard } from './guards/family-perms.guard';
import { InvitesService } from './invites.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  controllers: [FamiliesController, MembersController],
  providers: [
    FamiliesService,
    MembersService,
    InvitesService,
    FamilyPermsGuard,
  ],
  exports: [FamiliesService, FamilyPermsGuard],
})
export class FamiliesModule {}
