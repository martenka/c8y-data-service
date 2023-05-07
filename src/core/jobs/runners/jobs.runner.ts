import { Injectable, Logger } from '@nestjs/common';
import { DefineJob } from 'nestjs-agenda-plus';
import { Job } from '@hokify/agenda';
import { TaskSteps, TaskTypes } from '../../messages/types/messages.types';
import {
  DataFetchJobType,
  DataUploadJobType,
  IBaseJob,
  ObjectSyncJobType,
  VisibilityStateChangeJobType,
} from '../types/types';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { DataFetchJobHandler } from '../handlers/data-fetch.job.handler';
import {
  DataFetchTaskResultStatusPayload,
  ObjectSyncTaskResultPayload,
} from '../../messages/types/message-types/task/types';
import { ObjectSyncJobHandler } from '../handlers/object-sync.job.handler';
import { VisibilityStateChangeJobHandler } from '../handlers/visibilitystate-change-job.handler';
import { DataUploadJobHandler } from '../handlers/data-upload.job.handler';

@Injectable()
export class JobsRunner {
  private readonly logger = new Logger(JobsRunner.name);

  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly dataFetchJobHandler: DataFetchJobHandler,
    private readonly objectSyncJobHandler: ObjectSyncJobHandler,
    private readonly visibilityStateChangeJobHandler: VisibilityStateChangeJobHandler,
    private readonly dataUploadJobHandler: DataUploadJobHandler,
  ) {}

  @DefineJob(TaskTypes.DATA_FETCH)
  async runDataFetchJob(job: Job<DataFetchJobType>) {
    const result = await this.withTaskStatusHandler(job, () =>
      this.dataFetchJobHandler.handle(job),
    );

    const messagePayload: DataFetchTaskResultStatusPayload = {
      sensors: result,
      completedAt: new Date().toISOString(),
    };

    this.messageProducerService.sendTaskStatusMessage({
      taskId: job.attrs.data.remoteTaskId,
      status: TaskSteps.DONE,
      taskType: job.attrs.name,
      payload: messagePayload,
    });
    this.logger.log(
      `Job ${job.attrs.name} ${job.attrs._id?.toString()} finished`,
    );
  }

  @DefineJob(TaskTypes.OBJECT_SYNC)
  async runObjectSyncJob(job: Job<ObjectSyncJobType>) {
    const result = await this.withTaskStatusHandler(job, () =>
      this.objectSyncJobHandler.handle(job),
    );
    this.messageProducerService.sendTaskStatusMessage<ObjectSyncTaskResultPayload>(
      {
        taskId: job.attrs.data.remoteTaskId,
        status: TaskSteps.DONE,
        taskType: job.attrs.name,
        payload: { objectAmount: result },
      },
    );

    this.logger.log(
      `Job ${
        job.attrs.name
      } ${job.attrs._id?.toString()} finished with ${result} synced objects`,
    );
  }

  @DefineJob(TaskTypes.VISIBILITY_STATE_CHANGE)
  async runVisibilityStateChangeJob(job: Job<VisibilityStateChangeJobType>) {
    try {
      const result = await this.visibilityStateChangeJobHandler.handle(job);
      this.messageProducerService.sendFileVisibilityResultMessage({
        newVisibilityState: result.newVisibilityState,
        fileId: result.fileId,
        filePath: result.filePath,
        bucket: result.bucket,
      });
    } catch (e) {
      let errorMsg: string | undefined;
      if (e instanceof Error) {
        errorMsg = e.message;
      }
      const jobData = job.attrs.data;
      this.messageProducerService.sendFileVisibilityResultMessage({
        newVisibilityState: jobData.newVisibilityState,
        fileId: jobData.fileId,
        filePath: jobData.filePath,
        bucket: jobData.bucket,
        errorMessage: errorMsg ?? 'Unknown error',
      });
    } finally {
      this.logger.log(
        `Job ${job.attrs.name} ${job.attrs._id?.toString()} finished`,
      );
    }
  }

  @DefineJob(TaskTypes.DATA_UPLOAD)
  async runDataUploadJob(job: Job<DataUploadJobType>) {
    await this.withTaskStatusHandler(job, () =>
      this.dataUploadJobHandler.handle(job),
    );
    this.messageProducerService.sendTaskStatusMessage({
      taskId: job.attrs.data.remoteTaskId,
      status: TaskSteps.DONE,
      taskType: job.attrs.name,
      payload: {},
    });

    this.logger.log(
      `Job ${
        job.attrs.name
      } ${job.attrs._id?.toString()} finished uploading data`,
    );
  }

  private async withTaskStatusHandler<T>(
    job: Job<IBaseJob>,
    handler: () => Promise<T>,
  ): Promise<T> {
    try {
      this.logger.log(
        `Running ${job.attrs.name} job with id ${job.attrs._id?.toString()}`,
      );
      this.messageProducerService.sendTaskStatusMessage({
        status: TaskSteps.PROCESSING,
        taskId: job.attrs.data.remoteTaskId,
        taskType: job.attrs.name,
        payload: {},
      });
      return await handler();
    } catch (e) {
      let reason: string | undefined;
      if (e instanceof Error) {
        reason = e.message;
      }

      this.messageProducerService.sendTaskFailedMessage({
        status: TaskSteps.FAILED,
        taskId: job.attrs.data.remoteTaskId,
        taskType: job.attrs.name,
        payload: {
          reason: reason || 'Reason was not present on error object',
        },
      });

      throw e;
    }
  }
}
