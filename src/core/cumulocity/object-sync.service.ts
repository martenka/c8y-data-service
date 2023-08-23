import { C8yQueryParams } from '../../utils/paging/types';
import { Client, IManagedObject, IResultList } from '@c8y/client';
import { DownloadService } from './download.service';
import { Injectable } from '@nestjs/common';
import { notPresent } from '../../utils/validation';

@Injectable()
export class ObjectSyncService extends DownloadService<
  IManagedObject,
  IManagedObject
> {
  async fetchPage(
    client: Client,
    query: C8yQueryParams<IManagedObject>,
    lastPage: IResultList<IManagedObject> | undefined,
  ): Promise<IResultList<IManagedObject> | undefined> {
    if (notPresent(lastPage)) {
      return await client.inventory.list(query);
    }

    return await lastPage.paging?.next();
  }

  async pageHandler(
    client: Client,
    page: IResultList<IManagedObject>,
  ): Promise<IManagedObject[]> {
    return page.data;
  }
}
