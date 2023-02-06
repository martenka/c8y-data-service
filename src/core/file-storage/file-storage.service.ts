import { Injectable, OnModuleInit } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ensureArray } from '../../utils/validation';

@Injectable()
export class FileStorageService implements OnModuleInit {
  constructor(private readonly minioService: MinioService) {}

  async saveFile(bucketName: string, objectName: string, filePath: string) {
    await this.minioService.client.fPutObject(bucketName, objectName, filePath);
  }

  async removeFiles(bucketName: string, objectNames: string | string[]) {
    await this.minioService.client.removeObjects(
      bucketName,
      ensureArray(objectNames),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.minioService.client.makeBucket('public', 'eu-central-1');
  }
}
