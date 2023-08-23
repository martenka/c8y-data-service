import { DataUploadJobType, JobHandler } from '../types/types';
import { Job } from '@hokify/agenda';
import { CkanService } from '../../ckan/ckan.service';
import { Injectable, Logger } from '@nestjs/common';
import { CkanExtra } from '../../ckan/types/client';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import {
  addCustomAttributesToExtras,
  tryStringify,
} from '../../../utils/helpers';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { isPresent, notPresent } from '../../../utils/validation';

@Injectable()
export class DataUploadJobHandler
  implements JobHandler<DataUploadJobType, unknown>
{
  private readonly logger = new Logger(DataUploadJobHandler.name);

  constructor(
    private readonly ckanClient: CkanService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ApplicationConfigService,
  ) {}

  async handle(job: Job<DataUploadJobType>) {
    const jobData = job.attrs.data;
    const jobPayload = jobData.payload;
    const ownerOrg = this.configService.ckanConfig.organisationId;
    for (const file of jobPayload.files) {
      const lowerCaseFragmentDescription =
        file.metadata.valueFragmentDescription.toLowerCase();
      await this.createGroupIfNeeded(
        lowerCaseFragmentDescription,
        file.metadata.valueFragmentType,
      );

      const fileMetadata = file.metadata;
      let packageExtras: CkanExtra[] = [
        { key: 'ObjectID', value: fileMetadata.managedObjectId },
        { key: 'ObjectName', value: fileMetadata.managedObjectName ?? 'N/A' },
        { key: 'DateFrom', value: fileMetadata.dateFrom },
        { key: 'DateTo', value: fileMetadata.dateTo },
        { key: 'Value Type', value: fileMetadata.valueFragmentType },
        {
          key: 'Value Description',
          value: fileMetadata.valueFragmentDescription,
        },
      ];

      addCustomAttributesToExtras(file.customAttributes, packageExtras);
      packageExtras = packageExtras.filter((extra) => isPresent(extra.value));

      const ckanPackageResponse = await this.ckanClient.createPackage({
        name: file.fileName,
        groups: [{ name: lowerCaseFragmentDescription }],
        notes: file.metadata.fileDescription ?? file.metadata.sensorDescription,
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

      const ckanResourceResponse = await this.ckanClient.createResource({
        name: file.fileName,
        description: file.metadata.sensorDescription,
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
        `Uploaded file: ${file.fileName} - ${ckanResourceResponse.result.name} to CKAN using group: ${lowerCaseFragmentDescription}`,
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

    if (notPresent(existingGroup?.result)) {
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
