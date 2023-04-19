import {
  JobHandler,
  VisibilityStateChangeJobResult,
  VisibilityStateChangeJobType,
} from '../types/types';
import { Job } from '@hokify/agenda';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { Injectable } from '@nestjs/common';
import { getVisibilityStateNewBucket } from '../../../utils/task';

@Injectable()
export class VisibilityStateChangeJobHandler
  implements
    JobHandler<VisibilityStateChangeJobType, VisibilityStateChangeJobResult>
{
  constructor(
    private configService: ApplicationConfigService,
    private readonly fileStorageService: FileStorageService,
  ) {}
  async handle(
    job: Job<VisibilityStateChangeJobType>,
  ): Promise<VisibilityStateChangeJobResult> {
    const jobData = job.attrs.data;

    const newBucketName = getVisibilityStateNewBucket(
      this.configService,
      jobData.newVisibilityState,
    );
    const moveResult = await this.fileStorageService.moveObject(
      jobData.bucket,
      jobData.filePath,
      newBucketName,
    );
    return {
      newVisibilityState: jobData.newVisibilityState,
      bucket: moveResult.bucket,
      filePath: moveResult.objectPath,
      fileId: jobData.fileId,
    };
  }
}
