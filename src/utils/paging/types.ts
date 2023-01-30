import { Client, ICredentials, IResultList, Paging } from '@c8y/client';

export interface CumuFetcherOptions {
  saveData: boolean;
  maxPages: number;
  sleepBetweenRequestsMs: number;
}

export type CumuCredentials = ICredentials & { baseURL: string };

export interface CumuFetcher<T, V> {
  fetchFn: (lastPage: IResultList<T>) => Promise<IResultList<T>>;
  pageHandler: (page: IResultList<T>) => V;
  hasNextPage: (pageInfo: Paging<T>) => boolean;
  resultTransformer: (result: T[]) => Promise<V[] | undefined>;
}

export async function foo() {
  const client = await Client.authenticate({});
  client.measurement.list();
}
