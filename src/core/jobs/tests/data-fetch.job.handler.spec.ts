import { Test, TestingModule } from '@nestjs/testing';
import { fakeTime, initiateAgenda } from '../../../utils/tests';
import { Connection, Types } from 'mongoose';
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
import { DataFetchJobStatus, DataFetchJobType } from '../types/types';
import { CSVWriter } from '../../cumulocity/filewriter/csv-writer';
import { Logger } from '@nestjs/common';

import {
  setupTest,
  WithServiceSetupTestResult,
} from '../../../../test/setup/setup';

interface WithTestOptions {
  fakeNow?: Date;
}

type DataFetchJobHandlerExtension = WithServiceSetupTestResult<{
  services: {
    agenda: Agenda;
    service: DataFetchJobHandler;
  };
}>;

describe('DataFetchJobHandler', () => {
  function withTest(
    callback: (params: DataFetchJobHandlerExtension) => Promise<void>,
    options?: WithTestOptions,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<DataFetchJobHandlerExtension> {
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
        .mockImplementation(<T extends C8yData>() => ({}) as CSVWriter<T>);
      const mockUsersService = createMock<UsersService>();
      mockUsersService.getUserCredentials.mockImplementation(
        async (
          _id: Types.ObjectId,
        ): Promise<C8yCredentialsType | undefined> => {
          return {
            username: 'test-user',
            password: 'test-pass',
            tenantID: 'test-tenant',
            baseAddress: 'http://localhost/',
          };
        },
      );

      const agenda = await initiateAgenda(connection);
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

      const service = module.get<DataFetchJobHandler>(DataFetchJobHandler);

      if (options?.fakeNow) {
        fakeTime({ now: options.fakeNow, fake: ['Date'] });
      }

      return {
        services: {
          agenda,
          service,
        },
      };
    }

    return setupTest<DataFetchJobHandlerExtension>(setupFn, callback);
  }

  afterEach(jest.useRealTimers);

  describe('single job', () => {
    it(
      'does not update next sync dates for single job',
      withTest(async ({ services }) => {
        const job = (await services.agenda
          .create<DataFetchJobType>('test', {
            remoteTaskId: '6457bd33cc892d18243c950b',
            initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
            label: 'Single data-fetch task',
            payload: {
              originalDateTo: '2023-04-20T12:00:00.000Z',
              originalDateFrom: '2023-04-015T12:00:00.000Z',
              currentDateFrom: '2023-04-15T12:00:00.000Z',
              currentDateTo: '2023-04-20T12:00:00.000Z',
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
            },
          })
          .save()) as Job<DataFetchJobType>;

        const jobResult = await services.service.handle(job);
        const jobs = await services.agenda.jobs({ name: 'test' });
        const testJob = jobs[0];

        expect(jobResult.status).toEqual(DataFetchJobStatus.DONE);
        expect(testJob.attrs.disabled).toBe(true);
        expect(testJob.attrs.name).toEqual('test');
        expect(testJob.attrs.repeatInterval).not.toBeDefined();
        expect(testJob.attrs.data).toMatchObject({
          remoteTaskId: '6457bd33cc892d18243c950b',
          label: 'Single data-fetch task',
          payload: {
            originalDateTo: '2023-04-20T12:00:00.000Z',
            originalDateFrom: '2023-04-015T12:00:00.000Z',
            currentDateFrom: '2023-04-15T12:00:00.000Z',
            currentDateTo: '2023-04-20T12:00:00.000Z',
            data: [
              {
                fileName: 'test-filename',
                sensor: {
                  id: '6457bdc89c2e95661e3c8125',
                  fragmentType: 'type1',
                  managedObjectId: 100,
                },
                dataId: null,
              },
            ],
          },
        });
      }),
    );
  });

  describe('periodic job', () => {
    it.concurrent(
      'saves next fetch cycle dates',
      withTest(async ({ services }) => {
        const job = (await services.agenda
          .create<DataFetchJobType>('test', {
            remoteTaskId: '6457bd33cc892d18243c950b',
            initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
            label: 'Test data-fetch task',
            payload: {
              originalDateTo: '2023-05-03T12:00:00.000Z',
              originalDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateFrom: '2023-04-01T12:00:00.000Z',
              currentDateTo: '2023-04-03T12:00:00.000Z',
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
                windowDurationSeconds: 3600 * 24 * 2,
              },
            },
          })
          .repeatEvery('0 */5 * * * *') // Every 5 minutes
          .save()) as Job<DataFetchJobType>;

        await services.service.handle(job);

        const jobs = await services.agenda.jobs({ name: 'test' });
        const testJob = jobs[0];

        expect(testJob.attrs.name).toEqual('test');

        expect(testJob.attrs.repeatInterval).toEqual('0 */5 * * * *');
        expect(testJob.attrs.nextRunAt).toBeInstanceOf(Date);

        expect(testJob.attrs.data).toMatchObject({
          remoteTaskId: '6457bd33cc892d18243c950b',
          label: 'Test data-fetch task',
          payload: expect.objectContaining({
            originalDateTo: '2023-05-03T12:00:00.000Z',
            originalDateFrom: '2023-03-01T12:00:00.000Z',
            currentDateFrom: '2023-04-03T12:00:00.000Z',
            currentDateTo: '2023-04-05T12:00:00.000Z',
            periodicData: {
              windowDurationSeconds: 3600 * 24 * 2,
            },
          }),
        });
      }),
    );

    it.concurrent(
      'disables job when job has reached end of original fetch period',
      withTest(async ({ services }) => {
        const job = (await services.agenda
          .create<DataFetchJobType>('test', {
            remoteTaskId: '6457bd33cc892d18243c950b',
            initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
            label: 'Test data-fetch task',
            payload: {
              originalDateTo: '2023-05-03T12:00:00.000Z',
              originalDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateFrom: '2023-05-02T12:00:00.000Z',
              currentDateTo: '2023-05-04T12:00:00.000Z',
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
                windowDurationSeconds: 3600 * 24 * 2,
              },
            },
          })
          .repeatEvery('0 */5 * * * *') // Every 5 minutes
          .save()) as Job<DataFetchJobType>;

        await services.service.handle(job);

        const jobs = await services.agenda.jobs({ name: 'test' });
        const testJob = jobs[0];

        expect(testJob.attrs.name).toEqual('test');

        expect(testJob.attrs.disabled).toBe(true);
        expect(testJob.attrs.repeatInterval).toEqual('0 */5 * * * *');
        expect(testJob.attrs.nextRunAt).toBeInstanceOf(Date);

        expect(testJob.attrs.data).toMatchObject({
          remoteTaskId: '6457bd33cc892d18243c950b',
          label: 'Test data-fetch task',
          payload: expect.objectContaining({
            originalDateTo: '2023-05-03T12:00:00.000Z',
            originalDateFrom: '2023-03-01T12:00:00.000Z',
            currentDateFrom: '2023-05-04T12:00:00.000Z',
            currentDateTo: '2023-05-06T12:00:00.000Z',
            periodicData: {
              windowDurationSeconds: 3600 * 24 * 2,
            },
          }),
        });
      }),
    );

    it(
      'waits for next sync cycle when trying to fetch from the future',
      withTest(
        async ({ services }) => {
          const job = (await services.agenda
            .create<DataFetchJobType>('test', {
              remoteTaskId: '6457bd33cc892d18243c950b',
              initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
              label: 'Test data-fetch task',
              payload: {
                originalDateTo: '2023-05-03T12:00:00.000Z',
                originalDateFrom: '2023-03-01T12:00:00.000Z',
                currentDateFrom: '2023-03-01T12:00:00.000Z',
                currentDateTo: '2023-03-03T12:00:00.000Z',
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
                  windowDurationSeconds: 3600 * 24 * 2,
                },
              },
            })
            .repeatEvery('0 */5 * * * *') // Every 5 minutes
            .save()) as Job<DataFetchJobType>;

          const jobResult = await services.service.handle(job);

          const jobs = await services.agenda.jobs({ name: 'test' });
          const testJob = jobs[0];

          expect(jobResult.result).toBeUndefined();
          expect(jobResult.status).toBe(
            DataFetchJobStatus.WAITING_NEXT_FETCH_CYCLE,
          );

          expect(testJob.attrs.name).toEqual('test');
          expect(testJob.attrs.repeatInterval).toEqual('0 */5 * * * *');
          expect(testJob.attrs.nextRunAt).toBeInstanceOf(Date);

          expect(testJob.attrs.data).toMatchObject({
            remoteTaskId: '6457bd33cc892d18243c950b',
            label: 'Test data-fetch task',
            payload: expect.objectContaining({
              originalDateTo: '2023-05-03T12:00:00.000Z',
              originalDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateTo: '2023-03-03T12:00:00.000Z',
              periodicData: {
                windowDurationSeconds: 3600 * 24 * 2,
              },
            }),
          });
        },
        { fakeNow: new Date('2023-02-15T12:00:00.000Z') },
      ),
    );

    it(
      'reschedules nextRunAt if the whole fetch period is not in the past',
      withTest(
        async ({ services }) => {
          const job = (await services.agenda
            .create<DataFetchJobType>('pft test', {
              remoteTaskId: '6457bd33cc892d18243c950b',
              initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
              label: 'Periodic future data-fetch task test',
              payload: {
                originalDateTo: '2023-05-03T12:00:00.000Z',
                originalDateFrom: '2023-03-01T12:00:00.000Z',
                currentDateFrom: '2023-03-01T12:00:00.000Z',
                currentDateTo: '2023-03-03T12:00:00.000Z',
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
                  windowDurationSeconds: 3600 * 24 * 2,
                },
              },
            })
            .repeatEvery('0 */5 * * * *') // Every 5 minutes
            .save()) as Job<DataFetchJobType>;

          const jobResult = await services.service.handle(job);

          const jobs = await services.agenda.jobs({
            name: 'pft test',
          });
          const testJob = jobs[0] as Job<DataFetchJobType>;

          expect(jobResult.result).toBeUndefined();
          expect(jobResult.status).toBe(
            DataFetchJobStatus.WAITING_NEXT_FETCH_CYCLE,
          );

          expect(testJob.attrs.data.label).toEqual(
            'Periodic future data-fetch task test',
          );
          expect(testJob.attrs.repeatInterval).toEqual('0 */5 * * * *');
          expect(testJob.attrs.nextRunAt).toEqual(
            new Date('2023-03-03T12:00:00.000Z'),
          );

          expect(testJob.attrs.data).toMatchObject({
            remoteTaskId: '6457bd33cc892d18243c950b',
            label: 'Periodic future data-fetch task test',
            payload: expect.objectContaining({
              originalDateTo: '2023-05-03T12:00:00.000Z',
              originalDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateTo: '2023-03-03T12:00:00.000Z',
              periodicData: {
                windowDurationSeconds: 3600 * 24 * 2,
              },
            }),
          });
        },
        { fakeNow: new Date('2023-03-02T12:00:00.000Z') },
      ),
    );

    it(
      'completes job if last period is shorter than one fetch window length',
      withTest(
        async ({ services }) => {
          const job = (await services.agenda
            .create<DataFetchJobType>('lpt test', {
              remoteTaskId: '6457bd33cc892d18243c950b',
              initiatedByUser: '6457bd3e0c8f5f4e11154b0b',
              label: 'Last period data fetch test',
              payload: {
                originalDateTo: '2023-05-03T12:00:00.000Z',
                originalDateFrom: '2023-03-01T12:00:00.000Z',
                currentDateFrom: '2023-05-01T12:00:00.000Z',
                currentDateTo: '2023-05-05T12:00:00.000Z',
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
                  windowDurationSeconds: 3600 * 24 * 4,
                },
              },
            })
            .repeatEvery('0 */5 * * * *') // Every 5 minutes
            .save()) as Job<DataFetchJobType>;

          const jobResult = await services.service.handle(job);

          const jobs = await services.agenda.jobs({
            name: 'lpt test',
          });
          const testJob = jobs[0] as Job<DataFetchJobType>;

          expect(jobResult.status).toBe(DataFetchJobStatus.DONE);
          expect(testJob.attrs.disabled).toBe(true);
          expect(testJob.attrs.data.label).toEqual(
            'Last period data fetch test',
          );
          expect(testJob.attrs.repeatInterval).toEqual('0 */5 * * * *');
          expect(testJob.attrs.nextRunAt).toEqual(
            new Date('2023-05-02T12:05:00.000Z'),
          );

          expect(testJob.attrs.data).toMatchObject({
            remoteTaskId: '6457bd33cc892d18243c950b',
            label: 'Last period data fetch test',
            payload: expect.objectContaining({
              originalDateTo: '2023-05-03T12:00:00.000Z',
              originalDateFrom: '2023-03-01T12:00:00.000Z',
              currentDateFrom: '2023-05-05T12:00:00.000Z',
              currentDateTo: '2023-05-09T12:00:00.000Z',
              periodicData: {
                windowDurationSeconds: 3600 * 24 * 4,
              },
            }),
          });
        },
        { fakeNow: new Date('2023-05-02T12:00:00.000Z') },
      ),
    );
  });
});
