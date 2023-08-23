import { Injectable } from '@nestjs/common';
import { C8yQueryParams } from '../../utils/paging/types';
import { Client, IMeasurement, IResultList } from '@c8y/client';
import { DownloadService } from './download.service';
import { notPresent } from '../../utils/validation';

@Injectable()
export class MeasurementDownloadService extends DownloadService<IMeasurement> {
  async fetchPage(
    client: Client,
    query: C8yQueryParams<IMeasurement>,
    lastPage: IResultList<IMeasurement> | undefined,
  ): Promise<IResultList<IMeasurement> | undefined> {
    if (notPresent(lastPage)) {
      return await client.measurement.list(query);
    }

    return await lastPage.paging?.next();
  }

  async pageHandler(
    client: Client,
    page: IResultList<IMeasurement>,
  ): Promise<object[]> {
    return page.data;
  }
}
