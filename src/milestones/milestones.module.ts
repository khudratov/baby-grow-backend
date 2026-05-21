import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { CatalogController } from './catalog.controller';
import { CompletionsController } from './completions.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [FamiliesModule],
  controllers: [CatalogController, CompletionsController],
  providers: [MilestonesService],
})
export class MilestonesModule {}
