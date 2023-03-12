export interface DataFetchTaskMessagePayload {
  dateFrom?: string;
  dateTo?: string;
  data: {
    fileName?: string;
    sensor: {
      managedObjectId: number;
      fragmentType?: string;
      fragmentSeries?: string;
    };
  }[];
}

export interface DataFetchTaskMessageStatusPayload {
  sensorId: string;
  bucket: string;
  filePath?: string;
  fileURL?: string;
  fileName: string;
}

export interface TaskScheduledMessage<P extends object = object> {
  taskId: string;
  taskType: string;
  taskName: string;
  firstRunAt?: string;
  periodicData?: {
    pattern: string;
    fetchDuration: number;
  };
  payload: P;
}
