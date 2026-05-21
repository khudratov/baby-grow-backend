import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ServeStaticMiddleware } from './serve-static.middleware';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [ServeStaticMiddleware],
})
export class UploadsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ServeStaticMiddleware)
      .forRoutes({ path: 'uploads/*path', method: RequestMethod.GET });
  }
}
