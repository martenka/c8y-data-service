import { Injectable, Logger } from '@nestjs/common';
import { DefineJob } from 'nestjs-agenda-plus';
import { Job } from '@hokify/agenda';
import { TaskSteps, TaskTypes } from '../../messages/types/messages.types';
import { DataFetchJobType, IBaseJob } from '../types/types';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { DataFetchJobHandler } from '../handlers/data-fetch.job.handler';
import { DataFetchTaskResultStatusPayload } from '../../messages/types/message-types/task/types';

@Injectable()
export class JobsRunner {
  private readonly logger = new Logger(JobsRunner.name);

  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly dataFetchJobHandler: DataFetchJobHandler,
  ) {}

  @DefineJob(TaskTypes.DATA_FETCH)
  async runDataFetchJob(job: Job<DataFetchJobType>) {
    const result = await this.withJobStatusHandler(job, () =>
      this.dataFetchJobHandler.handle(job),
    );

    const messagePayload: DataFetchTaskResultStatusPayload = {
      sensors: result,
    };

    this.messageProducerService.sendTaskStatusMessage({
      taskId: job.attrs.data.remoteTaskId,
      status: TaskSteps.DONE,
      taskType: job.attrs.name,
      payload: messagePayload,
    });
    this.logger.log(`Job ${job.attrs._id?.toString()} finished`);
  }

  @DefineJob(TaskTypes.OBJECT_SYNC)
  async runObjectSyncJob(job: Job) {
    console.log(
      'Running objectsync job',
      job.attrs._id.toString(),
      new Date().toISOString(),
    );
  }

  private async withJobStatusHandler<T>(
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
