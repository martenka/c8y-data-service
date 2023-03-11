import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Agenda, Job } from '@hokify/agenda';
import { Types } from 'mongoose';
import { Filter, Sort } from 'mongodb';
import { IJobParameters } from '@hokify/agenda/dist/types/JobParameters';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ensureArray } from '../../utils/validation';
import { IBaseJob } from './types/types';
import { JobNotFoundError } from './errors/job-not-found.error';

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

  async schedulePeriodicJob<T extends IBaseJob>(
    name: string,
    interval: string | number,
    data?: T,
    options?: { timezone?: string; skipImmediate?: boolean },
  ): Promise<Job<T>> {
    const job = this.agenda.create<T>(name, data);

    job.repeatEvery(interval, options);
    await job.save();
    return job;
  }

  async scheduleSingleJob<T extends IBaseJob>(
    name: string,
    runAt: string | Date,
    data?: T,
  ): Promise<Job<T>> {
    const job = this.agenda.create<T>(name, data);
    job.schedule(runAt);
    await job.save();
    return job;
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

  async onModuleDestroy(): Promise<void> {
    await this.agenda.stop();
  }
}
