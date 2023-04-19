import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Agenda, Job } from '@hokify/agenda';
import { Types } from 'mongoose';
import { Filter, Sort } from 'mongodb';
import { IJobParameters } from '@hokify/agenda/dist/types/JobParameters';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ensureArray, notNil } from '../../utils/validation';
import {
  DataFetchJobType,
  IBaseJob,
  IJobOptions,
  ObjectSyncJobType,
  VisibilityStateChangeJobType,
  IDataFetchJobPayload,
} from './types/types';
import { JobNotFoundError } from './errors/job-not-found.error';
import {
  DataFetchTaskMessagePayload,
  TaskScheduledMessage,
  VisibilityStateChangeTaskMessagePayload,
} from '../messages/types/message-types/task/types';
import { TaskTypes } from '../messages/types/messages.types';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly agenda: Agenda) {}

  async findJobs<T extends IBaseJob>(
    query?: Omit<Filter<IJobParameters<T>>, '_id'> & { _id: Types.ObjectId },
    sort?: Sort,
    limit?: number,
    skip?: number,
  ): Promise<Job[]> {
    return await this.agenda.jobs(
      query as Filter<IJobParameters<T>>,
      sort,
      limit,
      skip,
    );
  }

  /**
   * Schedules job based on given data. If "firstRunAt" is not given then schedules the job to run immediately. <br>
   * Setting "skipImmediate" without "firstRunAt" has no effect
   */
  async schedulePeriodicJob<T extends IBaseJob>(
    type: string,
    interval: string | number,
    data?: T,
    options?: IJobOptions,
  ): Promise<Job<T>> {
    const job = this.agenda.create(type, data);

    if (notNil(options?.firstRunAt)) {
      job.schedule(options.firstRunAt);
      options.skipImmediate = true;
    }

    const numericInterval = Number(interval);

    // Agenda expects milliseconds
    return (await job
      .repeatEvery(
        !isNaN(numericInterval) ? numericInterval * 1000 : interval,
        options,
      )
      .save()) as Job<T>;
  }

  async scheduleSingleJob<T>(
    type: string,
    runAt: string | Date,
    data?: T,
  ): Promise<Job<T>> {
    return (await this.agenda
      .create<T>(type, data)
      .schedule(runAt)
      .save()) as Job<T>;
  }

  /**
   *
   * @throws JobNotFoundError In case given job was not found
   */
  async runNow(jobId: Types.ObjectId): Promise<void> {
    const matchingJobs = await this.findJobs({ _id: jobId });
    if (isEmpty(matchingJobs)) {
      const errMsg = `Cannot run job - job with id: ${jobId?.toString()} not found!`;
      this.logger.error(errMsg);
      throw new JobNotFoundError(errMsg);
    }
    const job = matchingJobs[0];
    return job.run();
  }

  async scheduleDataFetchJob(
    jobInput: TaskScheduledMessage<DataFetchTaskMessagePayload>,
    isPeriodic = false,
  ): Promise<Job<DataFetchJobType>> {
    const jobPayload: IDataFetchJobPayload = {
      dateFrom: jobInput.payload.dateFrom,
      dateTo: jobInput.payload.dateTo,
      data: ensureArray(jobInput.payload.data),
    };

    const jobData = this.mapJobData(jobInput, jobPayload);

    if (isPeriodic) {
      jobData.payload.periodicData = {
        fetchDurationSeconds: jobInput.periodicData.fetchDurationSeconds,
      };
    }

    return await this.scheduleJob(jobInput, jobData, isPeriodic);
  }

  async scheduleObjectSyncJob(
    jobInput: TaskScheduledMessage,
    isPeriodic = false,
  ): Promise<Job<ObjectSyncJobType>> {
    const jobData: ObjectSyncJobType = {
      initiatedByUser: jobInput.initiatedByUser,
      remoteTaskId: jobInput.taskId,
      label: jobInput.taskName,
      payload: {},
    };

    return await this.scheduleJob(jobInput, jobData, isPeriodic);
  }

  async scheduleVisibilityStateChangeJob(
    jobInput: VisibilityStateChangeTaskMessagePayload,
  ): Promise<Job<VisibilityStateChangeJobType>> {
    const jobPayload: VisibilityStateChangeJobType = {
      newVisibilityState: jobInput.newVisibilityState,
      filePath: jobInput.filePath,
      bucket: jobInput.bucket,
      fileId: jobInput.fileId,
    };

    return await this.scheduleSingleJob(
      TaskTypes.VISIBILITY_STATE_CHANGE,
      new Date(),
      jobPayload,
    );
  }

  /**
   * Removes job in OR fashion
   */
  async removeJobs(filter: {
    jobIds?: Types.ObjectId[];
    labels?: string | string[];
  }): Promise<number> {
    return await this.agenda.cancel({
      $or: [
        { _id: { $in: ensureArray(filter.jobIds) } },
        { 'data.label': { $in: ensureArray(filter.labels) } },
      ],
    } as Filter<IJobParameters>);
  }

  private async scheduleJob<T extends TaskScheduledMessage, P extends IBaseJob>(
    jobInput: T,
    jobData: P,
    isPeriodic = false,
    inputOptions?: IJobOptions,
  ): Promise<Job<P>> {
    if (isPeriodic) {
      const options: IJobOptions = {
        firstRunAt: jobInput.firstRunAt,
        ...inputOptions,
      };
      return this.schedulePeriodicJob<P>(
        jobInput.taskType,
        jobInput.periodicData.pattern,
        jobData,
        options,
      );
    }

    return await this.scheduleSingleJob(
      jobInput.taskType,
      jobInput.firstRunAt ?? new Date(),
      jobData,
    );
  }

  private mapJobData<T extends TaskScheduledMessage, P extends object>(
    jobInput: T,
    payload: P,
  ): IBaseJob<P> {
    return {
      label: jobInput.taskName,
      remoteTaskId: jobInput.taskId,
      initiatedByUser: jobInput.initiatedByUser,
      payload: payload,
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Stopping jobs service');
    await this.agenda.stop();
  }
}
