import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { MinioModule } from 'nestjs-minio-client';
import { ApplicationConfigService } from '../application-config/application-config.service';

@Module({
  imports: [
    MinioModule.registerAsync({
      useFactory: (config: ApplicationConfigService) => ({
        endPoint: config.minioConfig.ENDPOINT,
        port: config.minioConfig.PORT,
        accessKey: config.minioConfig.ACCESS_KEY,
        secretKey: config.minioConfig.SECRET_KEY,
        useSSL: config.minioConfig.USE_SSL,
      }),
      inject: [ApplicationConfigService],
    }),
  ],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
