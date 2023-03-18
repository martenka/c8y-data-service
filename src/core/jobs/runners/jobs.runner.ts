import { Injectable } from '@nestjs/common';
import { DefineJob } from 'nestjs-agenda-plus';
import { Job } from '@hokify/agenda';
import { TaskTypes } from '../../messages/types/messages.types';
import { DataFetchJobType } from '../types/types';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { DataFetchJobHandler } from '../handlers/data-fetch.job.handler';

@Injectable()
export class JobsRunner {
  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly dataFetchJobHandler: DataFetchJobHandler,
  ) {}

  @DefineJob(TaskTypes.DATA_FETCH)
  async runDataFetchJob(job: Job<DataFetchJobType>) {
    console.log(
      'Running datafetch job',
      job.attrs._id.toString(),
      new Date().toISOString(),
    );

    await this.dataFetchJobHandler.handle(job);
    console.log('Job completed!');
  }

  @DefineJob(TaskTypes.OBJECT_SYNC)
  async runObjectSyncJob(job: Job) {
    console.log(
      'Running objectsync job',
      job.attrs._id.toString(),
      new Date().toISOString(),
    );
  }
}