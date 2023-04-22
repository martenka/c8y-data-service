import { CustomAttributes } from '../../../../../models/types/types';

export interface DataUploadMessageStorage {
  bucket: string;
  path: string;
}

export interface DataUploadMessageMetadata {
  dateFrom: string;
  dateTo: string;
  managedObjectId: string;
  valueFragmentType: string;
  valueFragmentDescription?: string;
  managedObjectName?: string;
  description?: string;
}

export interface DataUploadMessageFile {
  fileName: string;
  storage: DataUploadMessageStorage;
  metadata: DataUploadMessageMetadata;
  customAttributes?: CustomAttributes;
}

export interface DataUploadMessagePlatform {
  platformIdentifier: string;
}

export interface DataUploadTaskMessagePayload {
  files: DataUploadMessageFile[];
  /**
   * Information about the platform where the files will be pushed
   */
  platform: DataUploadMessagePlatform;
}
