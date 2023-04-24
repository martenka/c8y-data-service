import { DataUploadJobType, JobHandler } from '../types/types';
import { Job } from '@hokify/agenda';
import { InjectModel } from '@nestjs/mongoose';
import { CkanGroup, CkanGroupModel } from '../../../models/CkanGroup';
import { CkanService } from '../../ckan/ckan.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Injectable, Logger } from '@nestjs/common';
import { CkanExtra } from '../../ckan/types/client';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import {
  addCustomAttributesToExtras,
  tryStringify,
} from '../../../utils/helpers';
import { FileStorageService } from '../../file-storage/file-storage.service';

@Injectable()
export class DataUploadJobHandler
  implements JobHandler<DataUploadJobType, unknown>
{
  private readonly logger = new Logger(DataUploadJobHandler.name);

  constructor(
    @InjectModel(CkanGroup.name)
    private readonly ckanGroupModel: CkanGroupModel,
    private readonly ckanClient: CkanService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ApplicationConfigService,
  ) {}

  async handle(job: Job<DataUploadJobType>) {
    const jobData = job.attrs.data;
    const jobPayload = jobData.payload;
    const ownerOrg = this.configService.ckanConfig.organisationId;
    for (const file of jobPayload.files) {
      const lowerCaseFragmentType =
        file.metadata.valueFragmentType.toLowerCase();
      await this.createGroupIfNeeded(
        lowerCaseFragmentType,
        file.metadata.valueFragmentDescription,
      );

      const fileMetadata = file.metadata;
      const packageExtras: CkanExtra[] = [
        { key: 'ObjectID', value: fileMetadata.managedObjectId },
        { key: 'ObjectName', value: fileMetadata.managedObjectName },
        { key: 'DateFrom', value: fileMetadata.dateFrom },
        { key: 'DateTo', value: fileMetadata.dateTo },
        { key: 'Value type', value: fileMetadata.valueFragmentType },
        {
          key: 'Value identifier',
          value: fileMetadata.valueFragmentDescription,
        },
      ];

      addCustomAttributesToExtras(file.customAttributes, packageExtras);
      const ckanPackageResponse = await this.ckanClient.createPackage({
        name: file.fileName,
        groups: [{ name: lowerCaseFragmentType }],
        notes: file.metadata.description,
        owner_org: ownerOrg,
        extras: packageExtras,
      });
      if (!ckanPackageResponse.success) {
        throw new Error(
          `Unable to create dataset in CKAN. Error: ${tryStringify(
            ckanPackageResponse.error,
          )}`,
        );
      }

      const storedFileStream = await this.fileStorageService.streamFromBucket(
        file.storage.bucket,
        file.storage.path,
      );

      console.dir(ckanPackageResponse, { depth: 10 });
      const ckanResourceResponse = await this.ckanClient.createResource({
        name: file.fileName,
        package_id: ckanPackageResponse.result.id,
        upload: storedFileStream,
      });

      if (!ckanResourceResponse.success) {
        throw new Error(
          `Unable to add file ${file.fileName} as a resource to dataset: ${
            ckanPackageResponse.result.name
          }, ${ckanPackageResponse.result.id}. Error: ${tryStringify(
            ckanResourceResponse.error,
          )}`,
        );
      }
      this.logger.log(
        `Uploaded file: ${file.fileName} - ${ckanResourceResponse.result.name} to CKAN using group: ${lowerCaseFragmentType}`,
      );
    }
  }

  /**
   * Creates a group into CKAN with the given name if it doesn't exist
   * @return 'GROUP_CREATED' if group was created, 'CREATION_NOT_NEEDED' otherwise
   */
  private async createGroupIfNeeded(
    groupName: string,
    groupDescription?: string,
  ): Promise<'GROUP_CREATED' | 'CREATION_NOT_NEEDED'> {
    const existingGroup = await this.ckanClient.findGroup(groupName);
    if (isNil(existingGroup)) {
      const createdGroup = await this.ckanClient.createGroup({
        name: groupName,
        description: groupDescription,
      });
      if (!createdGroup.success) {
        throw new Error(`Unable to create group: ${groupName} to CKAN`);
      }
      this.logger.log(
        `Created new group in CKAN - ${createdGroup.result.name}, ${
          createdGroup.result.description
        }. Error: ${tryStringify(createdGroup.error)}`,
      );
      return 'GROUP_CREATED';
    }
    return 'CREATION_NOT_NEEDED';
  }
}
