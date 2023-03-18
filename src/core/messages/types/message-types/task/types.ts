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
  }[];
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
