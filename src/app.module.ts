import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamiliesModule } from './families/families.module';
import { ChildrenModule } from './children/children.module';
import { FeedingsModule } from './feedings/feedings.module';
import { SleepsModule } from './sleeps/sleeps.module';
import { DiapersModule } from './diapers/diapers.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { MilestonesModule } from './milestones/milestones.module';
import { FirstsModule } from './firsts/firsts.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    ChildrenModule,
    FeedingsModule,
    SleepsModule,
    DiapersModule,
    MeasurementsModule,
    VaccinesModule,
    MilestonesModule,
    FirstsModule,
    GamesModule,
  ],
})
export class AppModule {}
