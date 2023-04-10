import { CustomAttributes } from '../../../../../models/types/types';

export enum ObjectTypes {
  SENSOR = 'SENSOR',
  GROUP = 'GROUP',
}

export interface DataFetchTaskMessagePayload {
  dateFrom?: string;
  dateTo?: string;
  data: {
    fileName?: string;
    sensor: {
      id: string;
      managedObjectId: number;
      fragmentType?: string;
      fragmentSeries?: string;
    };
  }[];
}

export interface DataFetchTaskResultStatusPayload {
  sensors: {
    sensorId: string;
    bucket: string;
    filePath?: string;
    fileURL?: string;
    fileName: string;
    dateFrom: string;
    dateTo: string;
  }[];
}

export interface BaseManagedObject {
  managedObjectId: string;
  managedObjectName: string;
  objectType: keyof typeof ObjectTypes;
  type?: string;
  owner?: string;
  additionalFragments?: CustomAttributes;
}

export interface Sensor extends BaseManagedObject {
  valueFragmentType?: string;
}

export interface Group extends BaseManagedObject {
  description?: string;
  objects: BaseManagedObject[];
}

export interface ObjectSyncTaskStatusPayload {
  objects: (Sensor | Group)[];
}

export interface ObjectSyncTaskResultPayload {
  objectAmount: number;
}

export interface TaskScheduledMessage<P extends object = object> {
  taskId: string;
  taskType: string;
  taskName: string;
  initiatedByUser: string;
  firstRunAt?: string;
  periodicData?: {
    pattern: string;
    fetchDurationSeconds: number;
  };
  payload: P;
}

export interface TaskFailedMessagePayload {
  reason: string;
}
