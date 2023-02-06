import {
  C8yData,
  C8yFetcher,
  C8yFetchOptions,
  C8yQueryParams,
  FetchedData,
} from '../../utils/paging/types';
import { Client, IResultList, Paging } from '@c8y/client';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { FileWriter } from './filewriter/types';

export abstract class DownloadService<T extends C8yData, V = unknown>
  implements C8yFetcher<T, V>
{
  abstract fetchPage(
    client: Client,
    query: C8yQueryParams<T>,
    lastPage: IResultList<T> | undefined,
  ): Promise<IResultList<T>>;

  hasNextPage(pageInfo: Paging<T>): boolean {
    return pageInfo.currentPage < pageInfo.totalPages;
  }

  async fetchData(
    client: Client,
    fileWriter: FileWriter<T>,
    query: C8yQueryParams<T>,
    options?: C8yFetchOptions,
  ): Promise<FetchedData<V>> {
    const savedData: V[] = [];

    let currentPage: IResultList<T> | undefined = undefined;
    let pageCounter = 0;
    const maxPages = options?.maxPages ?? Number.MAX_SAFE_INTEGER;

    while (
      (isNil(currentPage) || this.hasNextPage(currentPage.paging)) &&
      pageCounter < maxPages
    ) {
      currentPage = await this.fetchPage(
        client,
        { ...query, withTotalPages: true },
        currentPage,
      );
      await fileWriter.write(currentPage);

      const handledPage = this.pageHandler(currentPage);
      if (options?.returnData) {
        savedData.push(...handledPage);
      }

      pageCounter++;
    }

    await fileWriter.close();
    return {
      ...fileWriter.getFileInfo(),
      data: options?.returnData ? savedData : undefined,
    };
  }

  abstract pageHandler(page: IResultList<T>): V[];
}
