import { DataFetchTaskMessagePayload } from '../../messages/types/message-types/task/types';

export interface IBaseJob<P = object> {
  remoteTaskId: string;
  label: string;
  payload: P;
}

export interface IDataFetchJobPayload extends DataFetchTaskMessagePayload {
  periodicData?: {
    fetchDuration: number;
  };
}

export type DataFetchJobType = IBaseJob<IDataFetchJobPayload>;
export type ObjectSyncJobType = IBaseJob<object>;

export interface IJobOptions {
  timezone?: string;
  skipImmediate?: boolean;
  firstRunAt?: string;
}
