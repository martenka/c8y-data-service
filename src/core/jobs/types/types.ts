import { DataFetchTaskMessagePayload } from '../../messages/types/message-types/task/types';

export interface IBaseJob<P = object> {
  remoteTaskId: string;
  initiatedByUser: string;
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
  fileName: string;
  pathSeparator?: string;
  dateFrom: string;
  dateTo: string;
}

export type DataFetchJobType = IBaseJob<IDataFetchJobPayload>;

export type ObjectSyncJobType = IBaseJob<object>;
