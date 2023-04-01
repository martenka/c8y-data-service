import { C8yQueryParams } from '../../utils/paging/types';
import { Client, IManagedObject, IResultList } from '@c8y/client';
import { DownloadService } from './download.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectSyncService extends DownloadService<
  IManagedObject,
  IManagedObject
> {
  async fetchPage(
    client: Client,
    query: C8yQueryParams<IManagedObject>,
    lastPage: IResultList<IManagedObject> | undefined,
  ): Promise<IResultList<IManagedObject>> {
    if (isNil(lastPage)) {
      return await client.inventory.list(query);
    }

    return await lastPage.paging.next();
  }

  async pageHandler(
    client: Client,
    page: IResultList<IManagedObject>,
  ): Promise<IManagedObject[]> {
    return page.data;
  }
}
