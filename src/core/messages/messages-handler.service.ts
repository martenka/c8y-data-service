import { Inject, Injectable, Logger } from '@nestjs/common';
import { MessagesTypes, TaskModes, TaskTypes } from './types/messages.types';
import { MessagesProducerService } from './messages-producer.service';

import { idToObjectID } from '../../utils/helpers';

import { FileStorageService } from '../file-storage/file-storage.service';

import { ApplicationConfigService } from '../application-config/application-config.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { notNil } from '../../utils/validation';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';

import {
  DataFetchTaskMessagePayload,
  DataUploadTaskScheduledMessage,
  TaskScheduledMessage,
} from './types/message-types/task/types';
import { isPeriodicWork } from '../../utils/task';
import { JobError } from '../jobs/errors/job.error';

@Injectable()
export class MessagesHandlerService {
  private readonly logger = new Logger(MessagesHandlerService.name);

  constructor(
    private readonly messagesProducerService: MessagesProducerService,
    private readonly filesService: FileStorageService,
    private readonly usersService: UsersService,
    @Inject('TEMP_SENSOR_DATA_FOLDER')
    private readonly sensorFolderPath: string,
    private readonly configService: ApplicationConfigService,
    private readonly jobsService: JobsService,
  ) {}

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
        return await this.jobsService.scheduleDataFetchJob(
          message as TaskScheduledMessage<DataFetchTaskMessagePayload>,
          isPeriodic,
        );
      case TaskTypes.OBJECT_SYNC:
        return await this.jobsService.scheduleObjectSyncJob(
          message,
          isPeriodic,
        );
      case TaskTypes.DATA_UPLOAD:
        return await this.jobsService.scheduleDataUploadJob(
          message as DataUploadTaskScheduledMessage,
        );
      default: {
        this.logger.warn(
          `Skipping handling of unknown task of type: ${message?.taskType}`,
        );
      }
    }
    throw new Error(
      `Skipping handling of unknown task of type: ${message?.taskType}`,
    );
  }

  async handleFileDeletionMessage(
    message: MessagesTypes['file.status.deletion'],
  ): Promise<void> {
    const bucketFilesMap: Map<string, string[]> = new Map();

    message.files.forEach((file) => {
      const bucketFiles: string[] | undefined = bucketFilesMap.get(file.bucket);
      if (isNil(bucketFiles)) {
        bucketFilesMap.set(file.bucket, [file.path]);
      } else {
        bucketFiles.push(file.path);
      }
    });

    for (const [key, value] of bucketFilesMap.entries()) {
      await this.filesService.removeFilesFromBucket(key, value);
    }
  }

  async handleFileVisibilityStateMessage(
    message: MessagesTypes['file.status.visibility.state'],
  ): Promise<void> {
    await this.jobsService.scheduleVisibilityStateChangeJob(message);
  }

  async handleTaskModeMessage(
    message: MessagesTypes['task.mode'],
  ): Promise<void> {
    switch (message.type) {
      case TaskModes.DISABLED:
        const disabledTasks = await this.jobsService.setDisabledStatus(
          message.tasks.map((task) => ({
            taskId: task.taskId,
            disabled: true,
          })),
        );

        this.messagesProducerService.sendTaskModeMessage({
          type: TaskModes.DISABLED,
          tasks: disabledTasks.map((task) => ({ taskId: task.taskId })),
        });

        this.logger.log(
          `Disabled tasks: ${disabledTasks.map((task) => task.taskId)}`,
        );
        break;
      case TaskModes.ENABLED:
        const enabledTasks = await this.jobsService.setDisabledStatus(
          message.tasks.map((task) => ({
            taskId: task.taskId,
            disabled: false,
          })),
        );
        this.messagesProducerService.sendTaskModeMessage({
          type: TaskModes.ENABLED,
          tasks: enabledTasks.map((task) => ({ taskId: task.taskId })),
        });

        this.logger.log(
          `Enabled tasks: ${enabledTasks.map((task) => task.taskId)}`,
        );
        break;
    }
  }
}
