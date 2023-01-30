export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export type TaskStatus = keyof typeof TaskSteps;

export interface BaseMessage<T> {
  scheduledAt: string;
  data: T;
}

export interface FileDownloadScheduledMessage {
  taskId: string;
  dateFrom: string;
  dateTo: string;
  sensors: {
    managedObjectId: number;
    sensorFragmentType: string;
    filename?: string;
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
  filePath?: string;
}

export interface MessagesTypes {
  'File.DownloadScheduled': FileDownloadScheduledMessage;
  'File.DownloadStatus': FileDownloadStatusMessage;
}
