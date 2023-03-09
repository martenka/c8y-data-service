import { Injectable } from '@nestjs/common';
import {
  MinioConfig,
  MongoConfig,
  RabbitConfig,
  RootConfig,
} from './application-config.definitions';
import { MongooseModuleOptions } from '@nestjs/mongoose';

@Injectable()
export class ApplicationConfigService {
  constructor(
    readonly mainConfig: RootConfig,
    readonly rabbitConfig: RabbitConfig,
    readonly minioConfig: MinioConfig,
    readonly mongoEnvironment: MongoConfig,
  ) {}
  get mongooseModuleOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoEnvironment.USER}:${this.mongoEnvironment.PASS}@localhost:${this.mongoEnvironment.PORT}`,
      dbName: this.mongoEnvironment.DB,
      minPoolSize: 3,
    };
  }
}
