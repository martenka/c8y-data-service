import { Injectable } from '@nestjs/common';
import { MinioConfig, RabbitConfig, RootConfig } from './config.definitions';

@Injectable()
export class ConfigService {
  constructor(
    readonly mainConfig: RootConfig,
    readonly rabbitConfig: RabbitConfig,
    readonly minioConfig: MinioConfig,
  ) {}
}
