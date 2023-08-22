import { Injectable, Logger } from '@nestjs/common';
import {
  DataFetchJobResult,
  DataFetchJobResultData,
  DataFetchJobStatus,
  DataFetchJobType,
} from '../types/types';
import { Job } from '@hokify/agenda';
import { MeasurementDownloadService } from '../../cumulocity/measurement-download.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { InjectLocalDataDownloadFolder } from '../../../../decorators/injectors';
import { UsersService } from '../../users/users.service';
import { BasicAuth, Client, ICredentials } from '@c8y/client';
import {
  awaitAllPromises,
  exhaustiveCheck,
  nullToUndefined,
  removeNilProperties,
} from '../../../utils/helpers';
import { CSVWriter } from '../../cumulocity/filewriter/csv-writer';
import path from 'path';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { Types } from 'mongoose';
import { notNil } from '../../../utils/validation';
import { isNil, isNumber, isString } from '@nestjs/common/utils/shared.utils';
import { DateTime, Interval } from 'luxon';
import { parseExpression } from 'cron-parser';
import humanInterval from 'human-interval';
import { isValidHumanInterval } from '@hokify/agenda/dist/utils/nextRunAt';
import { GenericFileStorageInfoService } from '../../file-storage/file-storage-info.service';
import { JobError } from '../errors/job.error';
import { TaskSteps } from '../../messages/types/messages.types';

interface DataFetchPeriod {
  currentCycleDateFrom: string;
  currentCycleDateTo: string;
  nextCycleDateFrom?: string;
  nextCycleDateTo?: string;
  /**
   * Indicates if it's possible to fetch data.
   * **false** when starting date is in the future
   */
  canFetch: boolean;
  nextJobRunAt?: Date;
  shouldSaveDates: boolean;
  fetchJobShouldComplete: boolean;
}

interface CanFetch {
  canFetch: boolean;
  nextJobRunAt?: Date;
}

interface CanFetchInput {
  dateFrom: Date;
  dateTo?: Date;
  fetchJobWillComplete?: boolean;
}

@Injectable()
export class DataFetchJobHandler {
  private readonly logger = new Logger(DataFetchJobHandler.name);
  constructor(
    private readonly configService: ApplicationConfigService,
    private readonly measurementDownloadService: MeasurementDownloadService,
    private readonly fileStorageInfoService: GenericFileStorageInfoService,
    private readonly filesService: FileStorageService,
    private readonly usersService: UsersService,
    @InjectLocalDataDownloadFolder()
    private readonly localDownloadsFolderPath: string,
  ) {}

  async handle(job: Job<DataFetchJobType>): Promise<DataFetchJobResult> {
    const credentials = await this.usersService.getUserCredentials(
      new Types.ObjectId(job.attrs.data.initiatedByUser),
    );

    if (isNil(credentials)) {
      throw new JobError(
        `User ${job.attrs.data.initiatedByUser} Cumulocity credentials not found!`,
      );
    }

    const auth: ICredentials = {
      user: credentials.username,
      password: credentials.password,
      tenant: credentials.tenantID,
    };

    const fetchPeriodData = this.getFetchPeriodData(job);

    const jobStatus = fetchPeriodData.fetchJobShouldComplete
      ? DataFetchJobStatus.DONE
      : DataFetchJobStatus.WAITING_NEXT_FETCH_CYCLE;

    if (notNil(fetchPeriodData.nextJobRunAt)) {
      job.attrs.nextRunAt = fetchPeriodData.nextJobRunAt;
    }

    if (!fetchPeriodData.canFetch) {
      await job.save();
      return {
        status: jobStatus,
      };
    }

    const client = new Client(new BasicAuth(auth), credentials.baseAddress);

    const fetchedDataForAllSensors = await awaitAllPromises(
      job.attrs.data.payload.data.map((object) => {
        const fileWriter = new CSVWriter(
          this.localDownloadsFolderPath,
          removeNilProperties({
            fileName: object.fileName,
          }),
        );
        return this.measurementDownloadService.fetchData(
          client,
          removeNilProperties({
            dateFrom: fetchPeriodData.currentCycleDateFrom,
            dateTo: fetchPeriodData.currentCycleDateTo,
            pageSize: 100,
            source: object.sensor.managedObjectId,
            valueFragmentType: object.sensor.fragmentType,
            valueFragmentSeries: object.sensor.fragmentSeries,
          }),
          {},
          fileWriter,
        );
      }),
    );

    const jobResultData: DataFetchJobResultData[] = [];

    for (const fetchedData of fetchedDataForAllSensors.fulfilled) {
      const pathToFile =
        fetchedData.value.localFilePath + path.sep + fetchedData.value.fileName;

      const savedFile = await this.filesService.saveFileToBucket({
        fileInfoGenerator: this.fileStorageInfoService,
        bucketName: this.configService.minioConfig.privateBucket,
        filePath: pathToFile,
        objectName: fetchedData.value.fileName,
      });

      await this.filesService.deleteLocalFile(pathToFile);

      const payloadDataEntity = job.attrs.data.payload.data[fetchedData.index];
      jobResultData.push({
        sensorId: payloadDataEntity.sensor.id,
        dataId: nullToUndefined(payloadDataEntity.dataId),
        filePath: savedFile.path,
        bucket: this.configService.minioConfig.privateBucket,
        isPublicBucket: false,
        fileName: savedFile.fileName,
        dateFrom: fetchPeriodData.currentCycleDateFrom,
        dateTo: fetchPeriodData.currentCycleDateTo,
      });
    }

    if (fetchPeriodData.shouldSaveDates) {
      job.attrs.data.payload.currentDateFrom =
        fetchPeriodData.nextCycleDateFrom;
      job.attrs.data.payload.currentDateTo = fetchPeriodData.nextCycleDateTo;
    }

    job.attrs.data.payload.data.forEach((item) => {
      item.dataId = undefined;
    });

    if (fetchPeriodData.fetchJobShouldComplete) {
      await job.disable().save();
    } else {
      await job.save();
    }

    return {
      result: jobResultData,
      status: jobStatus,
    };
  }

  /**
   *
   * @param pattern Can be human-interval, cron pattern or seconds.
   * Pattern is tried to be converted in the following order: 1. Seconds 2. cron 3. human-interval
   * @private
   */
  private getDurationSecondsFromPattern(
    pattern: string | number | undefined,
  ): number | undefined {
    let durationInSeconds: number | undefined;
    if (isNumber(pattern)) {
      durationInSeconds = pattern;
    }
    if (isString(pattern)) {
      if (isNil(durationInSeconds)) {
        try {
          const cron = parseExpression(pattern);
          const prevDate = cron.prev().toDate();
          const nextDate = cron.next().toDate();
          durationInSeconds = Interval.fromDateTimes(prevDate, nextDate).length(
            'seconds',
          );
        } catch (e) {}
      }
      if (isNil(durationInSeconds) && isValidHumanInterval(pattern)) {
        durationInSeconds = humanInterval(pattern) / 1000;
      }
    }
    return durationInSeconds;
  }

  private getFetchPeriodData(job: Job<DataFetchJobType>): DataFetchPeriod {
    const jobPayload = job.attrs.data.payload;
    const dateFrom = jobPayload.currentDateFrom;
    const dateTo = jobPayload.currentDateTo;
    const windowDurationSeconds =
      jobPayload.periodicData?.windowDurationSeconds;

    if (isNil(dateFrom)) {
      throw new JobError('Data fetch starting date must be present!');
    }
    if (isNil(windowDurationSeconds) && isNil(dateTo)) {
      throw new JobError(
        'If data fetch is not periodic then both start and end times must be defined!',
      );
    }

    if (notNil(windowDurationSeconds)) {
      const fetchTo = DateTime.fromISO(dateFrom)
        .plus({ second: windowDurationSeconds })
        .toUTC()
        .toISO();

      const nextCycleDateFrom = fetchTo;

      const nextCycleDateTo = DateTime.fromISO(nextCycleDateFrom)
        .plus({
          second: windowDurationSeconds,
        })
        .toUTC()
        .toISO();

      const fetchJobWillComplete =
        notNil(jobPayload.originalDateTo) &&
        new Date(fetchTo) >= new Date(jobPayload.originalDateTo);

      const fetchAvailability = this.getFetchPossibility({
        dateFrom: new Date(dateFrom),
        dateTo: new Date(fetchTo),
        fetchJobWillComplete: fetchJobWillComplete,
      });

      return {
        canFetch: fetchAvailability.canFetch,
        shouldSaveDates: fetchAvailability.canFetch,
        currentCycleDateFrom: dateFrom,
        currentCycleDateTo: fetchTo,
        nextCycleDateFrom,
        nextCycleDateTo,
        fetchJobShouldComplete: fetchJobWillComplete,
        nextJobRunAt: fetchAvailability.nextJobRunAt,
      };
    }

    if (isNil(dateTo) || isNil(dateFrom)) {
      throw new JobError(
        'Beginning and end dates must be present for non periodic fetch!',
      );
    }

    const fetchAvailability = this.getFetchPossibility({
      dateFrom: new Date(dateFrom),
    }).canFetch;
    return {
      canFetch: fetchAvailability,
      shouldSaveDates: fetchAvailability,
      currentCycleDateFrom: dateFrom,
      currentCycleDateTo: dateTo,
      nextCycleDateTo: dateTo,
      nextCycleDateFrom: dateFrom,
      fetchJobShouldComplete: true,
    };
  }

  /**
   *
   * Fetching is not allowed from the future or when the whole fetch window cannot be fetched at once.
   * Exception to this is the last window before job should complete
   */
  private getFetchPossibility(input: CanFetchInput): CanFetch {
    const currentTimestamp = new Date();

    const fetchPeriodAvailable = notNil(input.dateTo)
      ? input.dateTo <= currentTimestamp || input.fetchJobWillComplete
      : true;
    const canFetch = input.dateFrom < currentTimestamp && fetchPeriodAvailable;

    return {
      canFetch,
      nextJobRunAt: !fetchPeriodAvailable ? input.dateTo : undefined,
    };
  }
}

export function dataFetchJobStatusToTaskSteps(
  jobStatus: DataFetchJobStatus,
): TaskSteps {
  switch (jobStatus) {
    case DataFetchJobStatus.DONE:
      return TaskSteps.DONE;
    case DataFetchJobStatus.WAITING_NEXT_FETCH_CYCLE:
      return TaskSteps.WAITING_NEXT_CYCLE;
  }
  exhaustiveCheck(jobStatus, 'DataFetchStatusToTaskSteps');
}
