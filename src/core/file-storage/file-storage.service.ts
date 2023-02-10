import { Injectable, OnModuleInit } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ensureArray } from '../../utils/validation';
import { ItemBucketMetadata } from 'minio';

@Injectable()
export class FileStorageService implements OnModuleInit {
  constructor(private readonly minioService: MinioService) {}

  /**
   *
   * @param bucketName - Bucket to save the file to
   * @param objectName - Object name in the bucket. Path included
   * @param filePath - Local path to read the file from
   * @param metadata - Metadata about the file to be saved
   */
  async saveFileToBucket(
    bucketName: string,
    objectName: string,
    filePath: string,
    metadata: ItemBucketMetadata = {},
  ) {
    return await this.minioService.client.fPutObject(
      bucketName,
      objectName,
      filePath,
      metadata,
    );
  }

  async removeFilesFromBucket(
    bucketName: string,
    objectNames: string | string[],
  ) {
    await this.minioService.client.removeObjects(
      bucketName,
      ensureArray(objectNames),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.minioService.client.makeBucket('public', 'eu-central-1');
  }
}
