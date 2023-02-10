import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './core/messages/messages.module';
import { ConfigModule } from './core/config/config.module';

@Module({
  imports: [ConfigModule, MessagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
