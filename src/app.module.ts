import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './core/messages/messages.module';
import { dotenvLoader, TypedConfigModule } from 'nest-typed-config/index';
import { RootConfig } from './config/config';

@Module({
  imports: [
    TypedConfigModule.forRoot({
      isGlobal: true,
      schema: RootConfig,
      load: dotenvLoader({
        separator: '__',
      }),
    }),
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
