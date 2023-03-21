import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { MinioModule } from 'nestjs-minio-client';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { GenericFileStorageInfoService } from './file-storage-info.service';

@Module({
  imports: [
    MinioModule.registerAsync({
      useFactory: (config: ApplicationConfigService) => ({
        endPoint: config.minioEnvironment.ENDPOINT,
        port: config.minioEnvironment.PORT,
        accessKey: config.minioEnvironment.ACCESS_KEY,
        secretKey: config.minioEnvironment.SECRET_KEY,
        useSSL: config.minioEnvironment.USE_SSL,
      }),
      inject: [ApplicationConfigService],
    }),
  ],
  providers: [GenericFileStorageInfoService, FileStorageService],
  exports: [GenericFileStorageInfoService, FileStorageService],
})
export class FileStorageModule {}
