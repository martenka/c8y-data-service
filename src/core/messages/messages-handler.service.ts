import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BaseMessage,
  MessagesTypes,
  TaskSteps,
  TaskTypes,
} from './types/messages.types';
import { MeasurementDownloadService } from '../cumulocity/measurement-download.service';
import { MessagesProducerService } from './messages-producer.service';
import { BasicAuth, Client, ICredentials } from '@c8y/client';
import { CSVWriter } from '../cumulocity/filewriter/csv-writer';
import {
  awaitAllPromises,
  idToObjectID,
  removeNilProperties,
} from '../../utils/helpers';
import * as path from 'path';
import { FileStorageService } from '../file-storage/file-storage.service';
import { unlink } from 'fs/promises';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { notNil } from '../../utils/validation';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';

import {
  DataFetchTaskMessagePayload,
  TaskScheduledMessage,
} from './types/message-types/task/types';
import { isPeriodicWork } from '../../utils/task';
import { JobError } from '../jobs/errors/job.error';

@Injectable()
export class MessagesHandlerService {
  private readonly logger = new Logger(MessagesHandlerService.name);

  constructor(
    private readonly measurementDownloadService: MeasurementDownloadService,
    private readonly messagesProducerService: MessagesProducerService,
    private readonly filesService: FileStorageService,
    private readonly usersService: UsersService,
    @Inject('TEMP_SENSOR_DATA_FOLDER')
    private readonly sensorFolderPath: string,
    private readonly configService: ApplicationConfigService,
    private readonly jobsService: JobsService,
  ) {}

  async handleFileDownloadScheduledMessage(
    message: BaseMessage<MessagesTypes['File.DownloadScheduled']>,
  ): Promise<void> {
    this.messagesProducerService.sendFileDownloadStatusMesssage({
      taskId: message.content.taskId,
      status: TaskSteps.PROCESSING,
    });

    const { tenantURL, ...credentials } = message.content.credentials;
    const auth: ICredentials = {
      user: credentials.username,
      password: credentials.password,
      tenant: credentials.tenantID,
    };
    const client = new Client(new BasicAuth(auth), tenantURL);

    const fetchedDataForAllSensors = await awaitAllPromises(
      message.content.sensors.map((sensor) =>
        this.measurementDownloadService.fetchData(
          client,
          new CSVWriter(
            this.sensorFolderPath,
            removeNilProperties({
              fileName: sensor.fileName,
            }),
          ),
          removeNilProperties({
            dateFrom: message.content.dateFrom,
            dateTo: message.content.dateTo,
            source: sensor.managedObjectId,
            valueFragmentType: sensor.fragmentType,
          }),
        ),
      ),
    );

    const messageData = fetchedDataForAllSensors.fulfilled.map(
      (fetchedData) => ({
        sensorId: message.content.sensors[fetchedData.index].id,
        filePath: fetchedData.value.filePath,
        bucket: this.configService.minioConfig.BUCKET,
        fileName: fetchedData.value.fileName,
        pathSeparator: path.sep,
      }),
    );

    for (const file of messageData) {
      const pathToFile = file.filePath + file.pathSeparator + file.fileName;
      await this.filesService.saveFileToBucket(
        this.configService.minioConfig.BUCKET,
        file.fileName,
        pathToFile,
      );

      await unlink(pathToFile);
    }

    this.messagesProducerService.sendFileDownloadStatusMesssage({
      taskId: message.content.taskId,
      status: TaskSteps.DONE,
      data: messageData,
    });
  }

  async handleUserMessage(message: MessagesTypes['user.user']) {
    const id = idToObjectID(message.id);
    if (isNil(id)) {
      this.logger.warn(
        `Given user id of ${message.id} is not convertable to ObjectID!`,
      );
      return;
    }
    if (notNil(message.deletedAt)) {
      await this.usersService.deleteUser(id);
      return;
    }

    await this.usersService.upsertUser({ ...message, id });
  }

  async handleTaskScheduledMessage(message: MessagesTypes['task.scheduled']) {
    const isPeriodic = isPeriodicWork(message);
    if (isPeriodic && isNil(message.periodicData.fetchDurationSeconds)) {
      throw new JobError(
        'Unable to schedule periodic job without fetchDuration set',
      );
    }

    switch (message.taskType) {
      case TaskTypes.DATA_FETCH:
        await this.jobsService.scheduleDataFetchJob(
          message as TaskScheduledMessage<DataFetchTaskMessagePayload>,
          isPeriodic,
        );
        break;
      case TaskTypes.OBJECT_SYNC:
        await this.jobsService.scheduleObjectSyncJob(message, isPeriodic);
        break;
      default:
        this.logger.warn(
          `Skipping handling of unknown task of type: ${message?.taskType}`,
        );
    }
  }
}
