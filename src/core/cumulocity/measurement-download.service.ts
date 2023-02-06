import { Injectable } from '@nestjs/common';
import { C8yQueryParams } from '../../utils/paging/types';
import { Client, IMeasurement, IResultList } from '@c8y/client';
import { DownloadService } from './download.service';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class MeasurementDownloadService extends DownloadService<IMeasurement> {
  async fetchPage(
    client: Client,
    query: C8yQueryParams<IMeasurement>,
    lastPage: IResultList<IMeasurement> | undefined,
  ): Promise<IResultList<IMeasurement>> {
    if (isNil(lastPage)) {
      return await client.measurement.list(query);
    }

    return await lastPage.paging.next();
  }

  pageHandler(page: IResultList<IMeasurement>): object[] {
    return page.data;
  }
}
