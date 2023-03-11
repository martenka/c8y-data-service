export enum JobTypes {
  DataFetch = 'DATA_FETCH',
  ObjectSync = 'OBJECT_SYNC',
}

export interface IBaseJob {
  label: string;
}
