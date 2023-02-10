import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { MinioModule } from 'nestjs-minio-client';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    MinioModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        endPoint: config.minioConfig.ENDPOINT,
        port: config.minioConfig.PORT,
        accessKey: config.minioConfig.ACCESS_KEY,
        secretKey: config.minioConfig.SECRET_KEY,
        useSSL: config.minioConfig.USE_SSL,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
