import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { CatalogController } from './catalog.controller';
import { DosesController } from './doses.controller';
import { VaccinesService } from './vaccines.service';

@Module({
  imports: [FamiliesModule],
  controllers: [CatalogController, DosesController],
  providers: [VaccinesService],
})
export class VaccinesModule {}
