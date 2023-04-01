import { Injectable, Logger } from '@nestjs/common';
import { Job } from '@hokify/agenda';
import { ObjectSyncJobType } from '../types/types';
import { ObjectSyncService } from '../../cumulocity/object-sync.service';
import { UsersService } from '../../users/users.service';
import { Types } from 'mongoose';
import { BasicAuth, Client, ICredentials, IManagedObject } from '@c8y/client';
import {
  Group,
  ObjectSyncTaskStatusPayload,
  ObjectTypes,
  Sensor,
} from '../../messages/types/message-types/task/types';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { TaskSteps, TaskTypes } from '../../messages/types/messages.types';

@Injectable()
export class ObjectSyncJobHandler {
  private readonly logger = new Logger(ObjectSyncJobHandler.name);
  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly objectSyncService: ObjectSyncService,
    private readonly usersService: UsersService,
  ) {}
  async handle(job: Job<ObjectSyncJobType>): Promise<number> {
    const credentials = await this.usersService.getUserCredentials(
      new Types.ObjectId(job.attrs.data.initiatedByUser),
    );
    const auth: ICredentials = {
      user: credentials.username,
      password: credentials.password,
      tenant: credentials.tenantID,
    };

    const client = new Client(new BasicAuth(auth), credentials.baseAddress);
    let objectAmount = 0;
    await this.objectSyncService.fetchData(
      client,
      { pageSize: 10 },
      {},
      undefined,
      async (page) => {
        const objectsInPageCount = await this.handlePageResult(
          client,
          page,
          job.attrs.data.remoteTaskId,
        );
        objectAmount += objectsInPageCount;
      },
    );

    return objectAmount;
  }

  async handlePageResult(
    client: Client,
    page: IManagedObject[],
    taskRemoteId: string,
  ): Promise<number> {
    const objects: (Sensor | Group)[] = [];
    for (const item of page) {
      if ('c8y_IsDeviceGroup' in Object.keys(item)) {
        //TODO Implement for groups
      } else {
        const measurementFragments =
          await this.fetchManagedObjectMeasurementFragments(client, item.id);
        if (measurementFragments.length > 0) {
          this.mapSensorData(objects, item, measurementFragments);
        }
      }
    }

    if (objects.length > 0) {
      this.messageProducerService.sendTaskStatusMessage<ObjectSyncTaskStatusPayload>(
        {
          status: TaskSteps.PROCESSING,
          taskType: TaskTypes.OBJECT_SYNC,
          taskId: taskRemoteId,
          payload: {
            objects,
          },
        },
      );
    }

    return objects.length;
  }

  mapSensorData(
    objects: Sensor[],
    managedObject: IManagedObject,
    measurementFragments: string[],
  ) {
    measurementFragments.forEach((fragment) => {
      const sensor = {
        managedObjectId: managedObject.id,
        managedObjectName: managedObject.name ?? 'N/A',
        objectType: ObjectTypes.SENSOR,
        owner: managedObject.owner,
        type: managedObject.type ?? 'N/A',
        valueFragmentType: fragment,
      };
      objects.push(sensor);
    });
  }

  async fetchManagedObjectMeasurementFragments(
    client: Client,
    managedObjectId: string,
  ): Promise<string[]> {
    const result: string[] = [];
    try {
      const baseUrl = client.core.baseUrl;
      if (isNil(baseUrl)) {
        return [];
      }
      const fetchResponse = await client.core.fetch(
        `inventory/managedObjects/${managedObjectId}/supportedMeasurements`,
      );

      const responsePayload: { c8y_SupportedMeasurements: string[] } =
        await fetchResponse.json();

      const fragments = responsePayload?.c8y_SupportedMeasurements;
      if (Array.isArray(fragments)) {
        result.push(...fragments);
      }
    } catch (e) {
      this.logger.error(
        `Error getting measurement fragments for object: ${managedObjectId}`,
        e,
      );
    }

    return result;
  }
}
