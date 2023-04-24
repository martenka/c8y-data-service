import { Injectable } from '@nestjs/common';
import {
  CkanConfig,
  MinioConfig,
  MongoConfig,
  RabbitConfig,
  RootConfig,
} from './application-config.definitions';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { AgendaConfig } from 'nestjs-agenda-plus';
import { ICkanConfig, IMinioConfig, UsernamePassword } from './types/types';

@Injectable()
export class ApplicationConfigService {
  constructor(
    readonly mainConfig: RootConfig,
    private readonly rabbitConfig: RabbitConfig,
    readonly minioEnvironment: MinioConfig,
    private readonly mongoEnvironment: MongoConfig,
    private readonly ckanEnvironment: CkanConfig,
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
      publicBucket: this.minioEnvironment.PUBLIC_BUCKET,
      privateBucket: this.minioEnvironment.PRIVATE_BUCKET,
      dataFolder: 'data',
    };
  }

  get ckanConfig(): ICkanConfig {
    return {
      baseURL: this.ckanEnvironment.BASE_URL,
      organisationId: this.ckanEnvironment.ORGANISATION_ID,
      username: this.ckanEnvironment.USERNAME,
      password: this.ckanEnvironment.PASSWORD,
      authToken: this.ckanEnvironment.AUTH_TOKEN,
    };
  }

  get messagesBrokerConfig(): UsernamePassword {
    return {
      username: this.rabbitConfig.RABBITMQ_DEFAULT_USER,
      password: this.rabbitConfig.RABBITMQ_DEFAULT_PASS,
    };
  }
}
