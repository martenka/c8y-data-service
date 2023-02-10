import { Module } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { MeasurementDownloadService } from '../cumulocity/measurement-download.service';
import * as path from 'path';
import * as fs from 'fs';
import { MessagesHandlerService } from './messages-handler.service';
import { MessagesController } from './messages-consumer.controller';
import { CumulocityModule } from '../cumulocity/cumulocity.module';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    FileStorageModule,
    CumulocityModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      useFactory: (config: ConfigService) => ({
        exchanges: [
          {
            name: ExchangeTypes.FILE,
            type: 'direct',
            createExchangeIfNotExists: true,
            options: {
              durable: true,
            },
          },
        ],
        uri: `amqp://${config.rabbitConfig.RABBITMQ_DEFAULT_USER}:${config.rabbitConfig.RABBITMQ_DEFAULT_PASS}@localhost:5672`,
        prefetchCount: 1,
        enableControllerDiscovery: true,
        connectionInitOptions: {
          wait: true,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessagesController],
  providers: [
    {
      provide: 'TEMP_SENSOR_DATA_FOLDER',
      useFactory: () => {
        const dataPath = path.join(process.cwd(), 'downloads', 'sensors');
        fs.mkdirSync(dataPath, { recursive: true });
        return dataPath;
      },
    },
    MessagesProducerService,
    MessagesHandlerService,
    MeasurementDownloadService,
  ],
  exports: [MessagesProducerService],
})
export class MessagesModule {}
