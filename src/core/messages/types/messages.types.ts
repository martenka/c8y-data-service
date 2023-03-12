import { UserMessage } from './message-types/user/types';
import { TaskScheduledMessage } from './message-types/task/types';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum TaskTypes {
  DATA_FETCH = 'DATA_FETCH',
  OBJECT_SYNC = 'OBJECT_SYNC',
}

export type TaskStatus = keyof typeof TaskSteps;

export interface BaseMessage<T> {
  scheduledAt: string;
  content: T;
}

export interface FileDownloadScheduledMessage {
  taskId: string;
  dateFrom: string;
  dateTo: string;
  sensors: {
    id: string;
    managedObjectId: string;
    fragmentType: string;
    fileName?: string;
  }[];
  credentials: {
    username: string;
    password: string;
    tenantID: string;
    tenantURL: string;
  };
}

export interface FileDownloadStatusMessage {
  taskId: string;
  status: TaskStatus;
  data?: {
    sensorId: string;
    bucket: string;
    filePath?: string;
    fileURL?: string;
    fileName: string;
    pathSeparator?: string;
  }[];
}

export interface TaskStatusMessage<P extends object = object> {
  taskId: string;
  taskType: keyof typeof TaskTypes;
  status: TaskStatus;
  payload: P;
}

export interface MessagesTypes {
  'File.DownloadScheduled': FileDownloadScheduledMessage;
  'File.DownloadStatus': FileDownloadStatusMessage;
  'task.scheduled': TaskScheduledMessage;
  'user.user': UserMessage;
}
