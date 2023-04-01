import {
  Client,
  ICredentials,
  IManagedObject,
  IMeasurement,
  IResultList,
  Paging,
} from '@c8y/client';
import { FileWriter } from '../../core/cumulocity/filewriter/types';

export type C8yCredentials = ICredentials & { baseURL: string };

export interface C8yPagingQuery {
  pageSize?: number;
  currentPage?: number;
  withTotalElements?: boolean;
  withTotalPages?: boolean;
}

export interface C8yMeasurementQuery extends C8yPagingQuery {
  dateFrom?: string;
  dateTo?: string;
  revert?: boolean;
  source?: string | number;
  type?: string;
  valueFragmentSeries?: string;
  valueFragmentType?: string;
}

export type C8yQuery = C8yMeasurementQuery;

export interface C8yFetchOptions {
  /**
   * Saving and returning fetched data can be discarded after handling page data to conserve memory
   */
  returnData?: boolean;
  /**
   * Maximum amount of pages to fetch. <br>
   * Leaving this empty will fetch all available pages
   */
  maxPages?: number;
}

export interface FileSaveOptions {
  fileName?: string;
}
export type C8yQueryParams<T> = T extends IMeasurement
  ? C8yMeasurementQuery
  : T extends IManagedObject
  ? C8yPagingQuery
  : object;

export interface FetchedData<V> {
  localFilePath: string;
  fileName: string;
  data: V[] | undefined;
}

/**
 * Types of data able to be fetched from Cumulocity
 */
export type C8yData = IMeasurement | IManagedObject;

export interface C8yFetcher<T extends C8yData, V> {
  fetchPage: (
    client: Client,
    query: C8yQueryParams<T>,
    lastPage: IResultList<T> | undefined,
  ) => Promise<IResultList<T>>;
  pageHandler: (client: Client, page: IResultList<T>) => Promise<V[]>;
  hasNextPage: (pageInfo: Paging<T>) => boolean;
  fetchData: (
    client: Client,
    query: C8yQueryParams<T>,
    fetchOptions?: C8yFetchOptions,
    fileWriter?: FileWriter<T>,
    pageResultHandler?: (page: V[]) => Promise<void>,
  ) => Promise<FetchedData<V>>;
}
