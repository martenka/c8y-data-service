import { ItemBucketMetadata, UploadedObjectInfo } from 'minio';

export interface IFileStorageInfoGenerator {
  getPath: (prefix?: string) => string;
  getFileName: (input?: string) => string;
}

export interface SaveFileToBucketOptions {
  fileInfoGenerator: IFileStorageInfoGenerator;
  bucketName: string;
  objectName: string;
  filePath: string;
  metadata?: ItemBucketMetadata;
}

export type SaveFileToBucketResult = UploadedObjectInfo & {
  path: string;
  fileName: string;
};
