import { DataFetchTaskMessagePayload } from '../../messages/types/message-types/task/types';
import { Job } from '@hokify/agenda';
import { FileVisibilityStateMessage } from '../../messages/types/message-types/file/type';
import { DataUploadTaskMessagePayload } from '../../messages/types/message-types/task/data-upload';
import { Platform } from '../../../global/tokens';

export interface JobHandler<T, R = unknown> {
  handle: (job: Job<T>) => Promise<R>;
}

export interface IBaseJob<P = object> {
  remoteTaskId: string;
  initiatedByUser: string;
  /**
   * Task name
   */
  label: string;
  payload: P;
}

export interface IJobOptions {
  timezone?: string;
  skipImmediate?: boolean;
  firstRunAt?: string;
}

export interface IDataFetchJobPayload extends DataFetchTaskMessagePayload {
  periodicData?: {
    fetchDurationSeconds: number;
  };
}

export interface DataFetchJobResult {
  sensorId: string;
  filePath: string;
  bucket: string;
  isPublicBucket: boolean;
  fileName: string;
  pathSeparator?: string;
  dateFrom: string;
  dateTo: string;
}

export type DataFetchJobType = IBaseJob<IDataFetchJobPayload>;

export type ObjectSyncJobType = IBaseJob<object>;

export type VisibilityStateChangeJobType = FileVisibilityStateMessage;

export type VisibilityStateChangeJobResult = FileVisibilityStateMessage;

export type DataUploadJobData = Pick<DataUploadTaskMessagePayload, 'files'> & {
  platform: Partial<{
    [Platform.CKAN]: {
      organisationId: string;
      username: string;
      password: string;
      authToken: string;
    };
  }>;
};

export type DataUploadJobPlatform = Pick<DataUploadJobData, 'platform'>;
export type DataUploadJobType = IBaseJob<DataUploadJobData>;
