import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { MinioModule } from 'nestjs-minio-client';
import { MinioConfig } from '../../config/config';

@Module({
  imports: [
    MinioModule.registerAsync({
      useFactory: (config: MinioConfig) => ({
        endPoint: config.ENDPOINT,
        port: config.PORT,
        accessKey: config.ACCESS_KEY,
        secretKey: config.SECRET_KEY,
        useSSL: config.USE_SSL,
      }),
      inject: [MinioConfig],
    }),
  ],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
