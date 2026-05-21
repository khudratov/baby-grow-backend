import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';

@Module({
  imports: [FamiliesModule],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
