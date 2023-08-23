import {
  C8yData,
  C8yFetcher,
  C8yFetchOptions,
  C8yQueryParams,
  FetchedData,
} from '../../utils/paging/types';
import { Client, IResultList, Paging } from '@c8y/client';
import { FileWriter } from './filewriter/types';
import { notPresent } from '../../utils/validation';
import { Logger } from '@nestjs/common';

export abstract class DownloadService<T extends C8yData, V = unknown>
  implements C8yFetcher<T, V>
{
  private readonly logger = new Logger('DownloadService');

  abstract fetchPage(
    client: Client,
    query: C8yQueryParams<T>,
    lastPage: IResultList<T> | undefined,
  ): Promise<IResultList<T> | undefined>;

  hasNextPage(pageInfo: Paging<T> | undefined): boolean {
    if (notPresent(pageInfo)) {
      return false;
    }
    return pageInfo.currentPage < pageInfo.totalPages;
  }

  async fetchData(
    client: Client,
    query: C8yQueryParams<T>,
    options?: C8yFetchOptions,
    fileWriter?: FileWriter<T>,
    pageResultHandler?: (page: V[]) => Promise<void>,
  ): Promise<FetchedData<V>> {
    const savedData: V[] = [];

    let currentPage: IResultList<T> | undefined = undefined;
    let pageCounter = 0;
    const maxPages = options?.maxPages ?? Number.MAX_SAFE_INTEGER;

    while (
      (notPresent(currentPage) || this.hasNextPage(currentPage?.paging)) &&
      pageCounter < maxPages
    ) {
      currentPage = await this.fetchPage(
        client,
        { ...query, withTotalPages: true },
        currentPage,
      );
      if (notPresent(currentPage)) {
        this.logger.warn(
          `Undefined page received. Stopping fetching on page ${pageCounter}.`,
        );
        break;
      }
      await fileWriter?.write(currentPage);

      const handledPage = await this.pageHandler(client, currentPage);
      await pageResultHandler?.(handledPage);
      if (options?.returnData) {
        savedData.push(...handledPage);
      }

      pageCounter++;
    }

    await fileWriter?.close();
    return {
      ...(fileWriter?.getFileInfo() ?? { fileName: '', localFilePath: '' }),
      data: options?.returnData ? savedData : undefined,
    };
  }

  abstract pageHandler(client: Client, page: IResultList<T>): Promise<V[]>;
}
