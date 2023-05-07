import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ensureArray } from '../../utils/validation';
import { BucketItemCopy } from 'minio';
import { SaveFileToBucketOptions, SaveFileToBucketResult } from './types/types';
import { ApplicationConfigService } from '../application-config/application-config.service';
import * as buffer from 'buffer';
import { unlink } from 'fs/promises';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  constructor(
    private readonly configService: ApplicationConfigService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Saves the file to the path given by fileInfoGenerator.
   * In case file with the same name already exists, generates a new filename
   * using fileInfoGenerator
   *
   * @param options.fileInfoGenerator - Generates the path and filename in case file with the same name already exists
   * @param options.bucketName - Bucket to save the file to
   * @param options.objectName - Object name in the bucket. Path included
   * @param options.filePath - Local path to read the file from
   * @param options.metadata - Metadata about the file to be saved
   */
  async saveFileToBucket(
    options: SaveFileToBucketOptions,
  ): Promise<SaveFileToBucketResult> {
    const { fileInfoGenerator, objectName, filePath, bucketName, metadata } =
      options;
    const folderPath = fileInfoGenerator.getPath(
      this.configService.minioConfig.dataFolder,
    );
    let fileName = objectName;
    let objectWithPath = `${folderPath}/${fileName}`;
    let isObjectExisting = await this.isObjectExisting(
      bucketName,
      objectWithPath,
    );
    let triesLeft = 20;
    while (isObjectExisting) {
      fileName = fileInfoGenerator.getFileName(objectName);
      objectWithPath = `${folderPath}/${fileName}`;
      isObjectExisting = await this.isObjectExisting(
        bucketName,
        objectWithPath,
      );
      triesLeft -= 1;
      if (triesLeft <= 0) {
        throw new Error(
          'Could not generate a name for downloaded data file after 20 tries!',
        );
      }
    }
    const savedObject = await this.minioService.client.fPutObject(
      bucketName,
      objectWithPath,
      filePath,
      metadata ?? {},
    );

    return {
      ...savedObject,
      path: objectWithPath,
      fileName,
    };
  }

  async removeFilesFromBucket(
    bucketName: string,
    objectNames: string | string[],
  ) {
    await this.minioService.client.removeObjects(
      bucketName,
      ensureArray(objectNames),
    );
    this.logger.log(
      `Deleted file(s) from bucket ${bucketName} from paths ${objectNames}`,
    );
  }

  async isObjectExisting(
    bucketName: string,
    objectName: string,
  ): Promise<boolean> {
    try {
      await this.minioService.client.statObject(bucketName, objectName);
    } catch (e) {
      return false;
    }
    return true;
  }

  async moveObject(
    existingObjectBucket: string,
    existingObjectPathInBucket: string,
    newBucket: string,
    newPathInBucket?: string,
  ): Promise<BucketItemCopy & { bucket: string; objectPath: string }> {
    const copyConditions = this.minioService.copyConditions;
    const copiedObjectPath = newPathInBucket ?? existingObjectPathInBucket;

    const isObjectPresent = await this.isObjectExisting(
      existingObjectBucket,
      existingObjectPathInBucket,
    );

    if (!isObjectPresent) {
      throw new Error(
        `Object of ${existingObjectBucket}/${existingObjectPathInBucket} is not present in min.io`,
      );
    }

    const copyResult = await this.minioService.client.copyObject(
      newBucket,
      copiedObjectPath,
      `${existingObjectBucket}/${existingObjectPathInBucket}`,
      copyConditions,
    );

    await this.removeFilesFromBucket(
      existingObjectBucket,
      existingObjectPathInBucket,
    );

    return {
      ...copyResult,
      bucket: newBucket,
      objectPath: copiedObjectPath,
    };
  }

  async getObject(bucket: string, path: string): Promise<buffer.Buffer> {
    const chunks = [];
    const stream = await this.minioService.client.getObject(bucket, path);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async streamFromBucket(bucket: string, path: string) {
    return await this.minioService.client.getObject(bucket, path);
  }

  async saveObjectToFile(
    bucket: string,
    pathInBucket: string,
    pathToSave: string,
  ) {
    await this.minioService.client.fGetObject(bucket, pathInBucket, pathToSave);
  }

  async deleteLocalFile(path: string) {
    await unlink(path);
  }

  async onModuleInit(): Promise<void> {
    await this.minioService.client.makeBucket(
      this.configService.minioConfig.publicBucket,
      'eu-central-1',
    );

    await this.minioService.client.makeBucket(
      this.configService.minioConfig.privateBucket,
      'eu-central-1',
    );
  }
}
