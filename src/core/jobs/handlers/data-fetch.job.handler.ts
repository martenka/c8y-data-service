import { Injectable } from '@nestjs/common';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { DataFetchJobResult, DataFetchJobType } from '../types/types';
import { Job } from '@hokify/agenda';
import { MeasurementDownloadService } from '../../cumulocity/measurement-download.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { InjectLocalDataDownloadFolder } from '../../../../decorators/injectors';
import { UsersService } from '../../users/users.service';
import { BasicAuth, Client, ICredentials } from '@c8y/client';
import { awaitAllPromises, removeNilProperties } from '../../../utils/helpers';
import { CSVWriter } from '../../cumulocity/filewriter/csv-writer';
import path from 'path';
import { unlink } from 'fs/promises';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { Types } from 'mongoose';
import { notNil } from '../../../utils/validation';
import { isNil, isNumber, isString } from '@nestjs/common/utils/shared.utils';
import { DateTime, Interval } from 'luxon';
import { parseExpression } from 'cron-parser';
import humanInterval from 'human-interval';
import { isValidHumanInterval } from '@hokify/agenda/dist/utils/nextRunAt';
import { GenericFileStorageInfoService } from '../../file-storage/file-storage-info.service';

@Injectable()
export class DataFetchJobHandler {
  constructor(
    private readonly configService: ApplicationConfigService,
    private readonly messageProducerService: MessagesProducerService,
    private readonly measurementDownloadService: MeasurementDownloadService,
    private readonly fileStorageInfoService: GenericFileStorageInfoService,
    private readonly filesService: FileStorageService,
    private readonly usersService: UsersService,
    @InjectLocalDataDownloadFolder()
    private readonly localDownloadsFolderPath: string,
  ) {}

  async handle(job: Job<DataFetchJobType>): Promise<DataFetchJobResult[]> {
    const credentials = await this.usersService.getUserCredentials(
      new Types.ObjectId(job.attrs.data.initiatedByUser),
    );
    const auth: ICredentials = {
      user: credentials.username,
      password: credentials.password,
      tenant: credentials.tenantID,
    };

    const jobData = job.attrs.data;
    const jobPeriodicData = jobData.payload.periodicData;

    let dateFrom = jobData.payload.dateFrom;
    let dateTo = jobData.payload.dateTo;
    let fetchDurationSeconds = jobPeriodicData?.fetchDurationSeconds;
    const shouldSaveDateTimes =
      notNil(fetchDurationSeconds) && notNil(job.attrs.repeatInterval);

    if (notNil(jobPeriodicData)) {
      if (isNil(dateTo)) {
        dateTo = new Date().toISOString();
      }

      if (
        (isNil(fetchDurationSeconds) || fetchDurationSeconds === 0) &&
        notNil(dateTo) &&
        notNil(dateFrom)
      ) {
        fetchDurationSeconds = Interval.fromDateTimes(
          DateTime.fromISO(dateFrom),
          DateTime.fromISO(dateTo),
        ).length('seconds');
      } else {
        const fetchDurationCandidate = this.getDurationSecondsFromPattern(
          job.attrs.repeatInterval,
        );
        if (
          isNil(fetchDurationCandidate) ||
          isNaN(fetchDurationCandidate) ||
          fetchDurationCandidate === 0
        ) {
          throw new Error(
            `Unable to calculate duration from given periodic pattern: ${job.attrs.repeatInterval}`,
          );
        }
        fetchDurationSeconds = fetchDurationCandidate;
      }
    }

    if (isNil(dateFrom)) {
      dateFrom = DateTime.fromISO(dateTo)
        .minus({
          second: fetchDurationSeconds,
        })
        .toUTC()
        .toISO();
    }

    const client = new Client(new BasicAuth(auth), credentials.baseAddress);

    if (isNil(dateFrom) || isNil(dateTo)) {
      throw new Error('Starting and ending date must be defined!');
    }

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
            dateFrom,
            dateTo,
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

    const jobResultData: DataFetchJobResult[] = [];

    for (const fetchedData of fetchedDataForAllSensors.fulfilled) {
      const pathToFile =
        fetchedData.value.localFilePath + path.sep + fetchedData.value.fileName;
      const savedFile = await this.filesService.saveFileToBucket({
        fileInfoGenerator: this.fileStorageInfoService,
        bucketName: this.configService.minioEnvironment.PRIVATE_BUCKET,
        filePath: pathToFile,
        objectName: fetchedData.value.fileName,
      });

      await unlink(pathToFile);

      jobResultData.push({
        sensorId: job.attrs.data.payload.data[fetchedData.index].sensor.id,
        filePath: savedFile.path,
        bucket: this.configService.minioEnvironment.PRIVATE_BUCKET,
        isPublicBucket: false,
        fileName: savedFile.fileName,
        dateFrom,
        dateTo,
      });
    }

    if (shouldSaveDateTimes) {
      job.attrs.data.payload.dateFrom = dateTo;
      job.attrs.data.payload.dateTo = DateTime.fromISO(dateTo)
        .plus({ second: fetchDurationSeconds })
        .toUTC()
        .toISO();
      job.attrs.data.payload.periodicData.fetchDurationSeconds =
        fetchDurationSeconds;
    }
    await job.save();
    return jobResultData;
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
}
