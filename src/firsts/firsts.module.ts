import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { FirstsController } from './firsts.controller';
import { FirstsService } from './firsts.service';

@Module({
  imports: [FamiliesModule],
  controllers: [FirstsController],
  providers: [FirstsService],
})
export class FirstsModule {}
