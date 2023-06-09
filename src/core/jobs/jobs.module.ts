import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { JobsRunner } from './runners/jobs.runner';
import { AgendaModule } from 'nestjs-agenda-plus';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { LOCAL_DATA_DOWNLOAD_FOLDER } from '../../global/tokens';
import { DataFetchJobHandler } from './handlers/data-fetch.job.handler';
import { MessagesModule } from '../messages/messages.module';
import { CumulocityModule } from '../cumulocity/cumulocity.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { UsersModule } from '../users/users.module';
import { ObjectSyncJobHandler } from './handlers/object-sync.job.handler';
import { VisibilityStateChangeJobHandler } from './handlers/visibilitystate-change-job.handler';
import { DataUploadJobHandler } from './handlers/data-upload.job.handler';
import { CkanModule } from '../ckan/ckan.module';

@Module({
  imports: [
    CkanModule,
    CumulocityModule,
    FileStorageModule,
    UsersModule,
    forwardRef(() => MessagesModule),
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
  providers: [
    {
      provide: LOCAL_DATA_DOWNLOAD_FOLDER,
      useFactory: () => {
        const dataPath = join(process.cwd(), 'downloads');
        mkdirSync(dataPath, { recursive: true });
        return dataPath;
      },
    },
    DataFetchJobHandler,
    ObjectSyncJobHandler,
    VisibilityStateChangeJobHandler,
    DataUploadJobHandler,
    JobsRunner,
    JobsService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
