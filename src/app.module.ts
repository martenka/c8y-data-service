import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './core/messages/messages.module';
import { ApplicationConfigModule } from './core/application-config/application-config.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationConfigService } from './core/application-config/application-config.service';

@Module({
  imports: [
    ApplicationConfigModule,
    MongooseModule.forRootAsync({
      useFactory: async (config: ApplicationConfigService) => {
        return config.mongooseModuleOptions;
      },
      inject: [ApplicationConfigService],
    }),
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
