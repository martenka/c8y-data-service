import { Test, TestingModule } from '@nestjs/testing';
import { closeDB, fakeTime } from '../../../utils/tests';
import { Types } from 'mongoose';
import {
  getTestDB,
  initiateAgenda,
  TestDB,
} from '../../../../test/global/test-db';
import { Agenda, Job } from '@hokify/agenda';
import { DataFetchJobHandler } from '../handlers/data-fetch.job.handler';
import { Client } from '@c8y/client';

import {
  C8yData,
  C8yFetcher,
  C8yFetchOptions,
  C8yQueryParams,
  FetchedData,
} from '../../../utils/paging/types';
import { FileWriter } from '../../cumulocity/filewriter/types';
import { createMock } from '@golevelup/ts-jest';
import { FileStorageService } from '../../file-storage/file-storage.service';
import {
  SaveFileToBucketOptions,
  SaveFileToBucketResult,
} from '../../file-storage/types/types';
import * as Writer from '../../cumulocity/filewriter/csv-writer';
import { UsersService } from '../../users/users.service';
import { C8yCredentialsType } from '../../../models/User';
import { GenericFileStorageInfoService } from '../../file-storage/file-storage-info.service';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { MeasurementDownloadService } from '../../cumulocity/measurement-download.service';
import { LOCAL_DATA_DOWNLOAD_FOLDER } from '../../../global/tokens';
import { DataFetchJobType } from '../types/types';
import { CSVWriter } from '../../cumulocity/filewriter/csv-writer';
import { Logger } from '@nestjs/common';
import { DateTime, Duration } from 'luxon';
describe('DataFetchJobHandler', () => {
  let service: DataFetchJobHandler;
  let db: TestDB;
  let agenda: Agenda;

  const mockConfigService = {
    minioConfig: {
      privateBucket: 'test-private-bucket',
      publicBucket: 'test-public-bucket',
      dataFolder: 'test-data',
    },
  };
  const mockMeasurementDownloadService =
    createMock<C8yFetcher<C8yData, unknown>>();
  mockMeasurementDownloadService.fetchData.mockImplementation(
    async <T extends C8yData, V = unknown>(
      _client: Client,
      _query: C8yQueryParams<T>,
      _options?: C8yFetchOptions,
      _fileWriter?: FileWriter<T>,
      _pageResultHandler?: (page: V[]) => Promise<void>,
    ): Promise<FetchedData<V>> => {
      return {
        data: [],
        localFilePath: 'testPath',
        fileName: 'testFilename',
      };
    },
  );

  const mockFileService = createMock<FileStorageService>();
  mockFileService.saveFileToBucket.mockImplementation(
    async (
      options: SaveFileToBucketOptions,
    ): Promise<SaveFileToBucketResult> => {
      return {
        fileName: options.objectName,
        path: options.filePath,
        etag: '123',
        versionId: '1',
      };
    },
  );
  mockFileService.deleteLocalFile.mockImplementation((_path: string) =>
    Promise.resolve(),
  );
  jest
    .spyOn(Writer, 'CSVWriter')
    .mockImplementation(<T extends C8yData>() => ({} as CSVWriter<T>));
  const mockUsersService = createMock<UsersService>();
  mockUsersService.getUserCredentials.mockImplementation(
    async (_id: Types.ObjectId): Promise<C8yCredentialsType | undefined> => {
      return {
        username: 'test-user',
        password: 'test-pass',
        tenantID: 'test-tenant',
        baseAddress: 'http://localhost/',
      };
    },
  );

  beforeAll(async () => {
    db = await getTestDB();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ApplicationConfigService, useValue: mockConfigService },
        {
          provide: GenericFileStorageInfoService,
          useClass: GenericFileStorageInfoService,
        },
        {
          provide: MeasurementDownloadService,
          useValue: mockMeasurementDownloadService,
        },
        { provide: FileStorageService, useValue: mockFileService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: LOCAL_DATA_DOWNLOAD_FOLDER, useValue: 'downloads' },
        DataFetchJobHandler,
      ],
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<DataFetchJobHandler>(DataFetchJobHandler);
  });

  beforeEach(async () => {
    agenda = await initiateAgenda(db.connection);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await agenda.db.removeJobs({});
    await agenda.stop();
  });

  afterAll(closeDB(db));

  describe('calculates new dates for periodic job', () => {
    it('when from and to are present', async () => {
      const now = new Date('2023-05-02T12:00:00.000Z');
      fakeTime({ now, fake: ['Date'] });

      const job = (await agenda
        .create<DataFetchJobType>('test', {
          remoteTaskId: '6457bd33cc892d18243c950b',
          initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
          label: 'Test data-fetch task',
          payload: {
            dateTo: '2023-04-03T12:00:00.000Z',
            dateFrom: '2023-04-01T12:00:00.000Z',
            data: [
              {
                fileName: 'test-filename',
                sensor: {
                  id: '6457bdc89c2e95661e3c8125',
                  fragmentType: 'type1',
                  managedObjectId: 100,
                },
              },
            ],
            periodicData: {
              fetchDurationSeconds: 0,
            },
          },
        })
        .repeatEvery('0 */5 * * * *') // Every 5 minutes
        .save()) as Job<DataFetchJobType>;

      await service.handle(job);

      const jobs = await agenda.jobs({ name: 'test' });
      const testJob = jobs[0];

      expect(testJob.attrs.name).toEqual('test');
      expect(testJob.attrs.nextRunAt).toEqual(
        DateTime.fromJSDate(now)
          .plus(Duration.fromMillis(5000 * 60))
          .toJSDate(),
      );
      expect(testJob.attrs.data).toMatchObject({
        remoteTaskId: new Types.ObjectId('6457bd33cc892d18243c950b'),
        label: 'Test data-fetch task',
        payload: expect.objectContaining({
          dateTo: '2023-04-05T12:00:00.000Z',
          dateFrom: '2023-04-03T12:00:00.000Z',
          periodicData: {
            fetchDurationSeconds: 172800,
          },
        }),
      });
    });
  });
});
