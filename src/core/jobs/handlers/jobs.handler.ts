import { Injectable } from '@nestjs/common';
import { DefineJob } from 'nestjs-agenda-plus';
import { Job } from '@hokify/agenda';
import { TaskTypes } from '../../messages/types/messages.types';
import { DataFetchJobType } from '../types/types';

@Injectable()
export class JobsHandler {
  @DefineJob(TaskTypes.DATA_FETCH)
  async handleDataFetchJobs(job: Job<DataFetchJobType>) {
    console.log(
      'Running datafetch job',
      job.attrs._id.toString(),
      new Date().toISOString(),
    );
  }

  @DefineJob(TaskTypes.OBJECT_SYNC)
  async handleObjectSyncJobs(job: Job) {
    console.log(
      'Running objectsync job',
      job.attrs._id.toString(),
      new Date().toISOString(),
    );
  }
}
