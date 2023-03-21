import { Injectable } from '@nestjs/common';
import {
  MinioConfig,
  MongoConfig,
  RabbitConfig,
  RootConfig,
} from './application-config.definitions';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { AgendaConfig } from 'nestjs-agenda-plus';
import { IMinioConfig } from './types/types';

@Injectable()
export class ApplicationConfigService {
  constructor(
    readonly mainConfig: RootConfig,
    readonly rabbitConfig: RabbitConfig,
    readonly minioEnvironment: MinioConfig,
    readonly mongoEnvironment: MongoConfig,
  ) {}
  get mongooseModuleOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoEnvironment.USER}:${this.mongoEnvironment.PASS}@localhost:${this.mongoEnvironment.PORT}`,
      dbName: this.mongoEnvironment.DB,
      minPoolSize: 3,
    };
  }

  get agendaConfig(): AgendaConfig {
    return {
      defaultLockLifetime: 600000, // 10 minutes in ms
      db: {
        collection: 'jobs',
      },
    };
  }

  get minioConfig(): IMinioConfig {
    return {
      bucket: this.minioEnvironment.BUCKET,
      dataFolder: 'data',
    };
  }
}
