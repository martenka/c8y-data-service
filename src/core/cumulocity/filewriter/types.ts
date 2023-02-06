import { IResultList } from '@c8y/client';
import { C8yData, FetchedData } from '../../../utils/paging/types';
import { WriteStream } from 'fs';

export interface FileWriter<T extends C8yData> {
  write: (resultList: IResultList<T>) => Promise<void>;
  close: () => Promise<void>;
  getStream: () => WriteStream;
  getFileInfo: () => Omit<FetchedData<T>, 'data'>;
}
