import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { JobsHandler } from './handlers/jobs.handler';
import { AgendaModule } from 'nestjs-agenda-plus';

@Module({
  imports: [
    AgendaModule.forRootAsync({
      useFactory: (
        configService: ApplicationConfigService,
        connection: Connection,
      ) => {
        const agendaConfig = configService.agendaConfig;
        agendaConfig['mongo'] = connection.db;
        return agendaConfig;
      },
      inject: [ApplicationConfigService, getConnectionToken()],
    }),
  ],
  providers: [JobsHandler, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
