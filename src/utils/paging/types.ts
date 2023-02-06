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

export interface C8yMeasurementQuery {
  currentPage?: number;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
  revert?: boolean;
  source?: string;
  type?: string;
  valueFragmentSeries?: string;
  valueFragmentType?: string;
  withTotalElements?: boolean;
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
  : object;

export interface FetchedData<V> {
  filePath: string;
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
  pageHandler: (page: IResultList<T>) => V[];
  hasNextPage: (pageInfo: Paging<T>) => boolean;
  fetchData: (
    client: Client,
    fileWriter: FileWriter<T>,
    query: C8yQueryParams<T>,
    fetchOptions?: C8yFetchOptions,
  ) => Promise<FetchedData<V>>;
}

export async function foo() {
  const client = await Client.authenticate({});
  client.measurement.list();
}
