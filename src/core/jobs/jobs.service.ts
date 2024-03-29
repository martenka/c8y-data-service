import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Agenda, Job } from '@hokify/agenda';
import { Types } from 'mongoose';
import { Filter, Sort } from 'mongodb';
import { IJobParameters } from '@hokify/agenda/dist/types/JobParameters';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ensureArray, isPresent, notPresent } from '../../utils/validation';
import {
  DataFetchJobType,
  IBaseJob,
  IJobOptions,
  ObjectSyncJobType,
  VisibilityStateChangeJobType,
  IDataFetchJobPayload,
  DataUploadJobType,
  DataUploadJobData,
  DataUploadJobPlatform,
  TaskModeChangeResult,
} from './types/types';
import { JobNotFoundError } from './errors/job-not-found.error';
import {
  DataFetchTaskMessagePayload,
  DataUploadTaskScheduledMessage,
  TaskScheduledMessage,
} from '../messages/types/message-types/task/types';
import { TaskTypes } from '../messages/types/messages.types';
import { FileVisibilityStateMessage } from '../messages/types/message-types/file/type';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { Platform } from '../../global/tokens';
import { awaitAllPromises } from '../../utils/helpers';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly agenda: Agenda,
    private readonly configService: ApplicationConfigService,
  ) {}

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

    if (isPresent(options) && isPresent(options.firstRunAt)) {
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
    const job = isPresent(data)
      ? this.agenda.create(type, data)
      : this.agenda.create(type);

    return (await job.schedule(runAt).save()) as Job<T>;
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
    if (notPresent(jobInput.payload.dateFrom)) {
      throw new Error(
        'Cannot schedule DataFetch job without starting date set',
      );
    }

    const jobPayload: IDataFetchJobPayload = {
      originalDateFrom: jobInput.payload.dateFrom,
      originalDateTo: jobInput.payload.dateTo,
      currentDateFrom: jobInput.payload.dateFrom,
      currentDateTo: jobInput.payload.dateTo,
      data: ensureArray(jobInput.payload.data),
    };

    const jobData = this.mapJobData(jobInput, jobPayload);

    if (isPeriodic) {
      if (
        notPresent(jobInput.periodicData) ||
        notPresent(jobInput.periodicData?.windowDurationSeconds)
      ) {
        throw new Error(
          'Cannot schedule periodic DataFetch job without time window duration set',
        );
      }
      jobData.payload.periodicData = {
        windowDurationSeconds: jobInput.periodicData.windowDurationSeconds,
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
    jobInput: FileVisibilityStateMessage,
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

  async scheduleDataUploadJob(
    jobInput: DataUploadTaskScheduledMessage,
  ): Promise<Job<DataUploadJobType>> {
    const ckanCredentials = this.configService.ckanConfig;
    let platform: DataUploadJobPlatform;

    const inCompleteFiles: string[] = [];
    for (const file of jobInput.payload.files) {
      if (
        notPresent(file.metadata.valueFragmentDescription) ||
        file.metadata.valueFragmentDescription === ''
      ) {
        inCompleteFiles.push(file.fileName);
      }
    }

    if (inCompleteFiles.length > 0) {
      throw new Error(
        `Unable to schedule file upload - valueFragmentDescription is missing for filenames: ${inCompleteFiles.join(
          ' , ',
        )}!`,
      );
    }

    switch (jobInput.payload.platform.platformIdentifier) {
      case Platform.CKAN:
        platform = {
          platform: {
            CKAN: {
              authToken: ckanCredentials.authToken,
              organisationId: ckanCredentials.organisationId,
              password: ckanCredentials.password,
              username: ckanCredentials.username,
            },
          },
        };
        break;
      default:
        throw new Error(
          `Unable to schedule job - unknown platform ${jobInput.payload.platform.platformIdentifier}`,
        );
    }

    const jobPayload: DataUploadJobData = {
      ...platform,
      files: jobInput.payload.files,
    };

    const job = this.mapJobData(jobInput, jobPayload);

    return await this.scheduleJob(jobInput, job);
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

  /**
   * Disables (stops from being scheduled again) jobs based on system task ids
   */
  async setDisabledStatus(
    jobs: { taskId: string; disabled: boolean }[],
  ): Promise<TaskModeChangeResult[]> {
    const jobsToDisableTaskIds: string[] = [];
    const jobsToEnableTaskIds: string[] = [];

    jobs.forEach((job) => {
      if (job.disabled) {
        jobsToDisableTaskIds.push(job.taskId);
      } else {
        jobsToEnableTaskIds.push(job.taskId);
      }
    });

    const jobsToDisable = await this.agenda.jobs({
      'data.remoteTaskId': {
        $in: jobsToDisableTaskIds,
      },
    });

    const jobsToEnable = await this.agenda.jobs({
      'data.remoteTaskId': {
        $in: jobsToEnableTaskIds,
      },
    });

    await awaitAllPromises(jobsToDisable.map((job) => job.disable().save()));
    await awaitAllPromises(jobsToEnable.map((job) => job.enable().save()));

    const allJobs = jobsToEnable.concat(jobsToDisable);
    return allJobs
      .map(
        (job): TaskModeChangeResult => ({
          taskId: job.attrs.data?.['remoteTaskId'],
          taskType: job.attrs.name,
        }),
      )
      .filter(isPresent);
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
      if (notPresent(jobInput.periodicData)) {
        throw new Error(
          'Unable to schedule periodic job without periodicData being present',
        );
      }
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
