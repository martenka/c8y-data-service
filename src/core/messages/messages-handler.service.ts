import { Inject, Injectable } from '@nestjs/common';
import { BaseMessage, MessagesTypes, TaskSteps } from './types/messages.types';
import { MeasurementDownloadService } from '../cumulocity/measurement-download.service';
import { MessagesProducerService } from './messages-producer.service';
import { BasicAuth, Client, ICredentials } from '@c8y/client';
import { CSVWriter } from '../cumulocity/filewriter/csv-writer';
import { awaitAllPromises, removeNilProperties } from '../../utils/helpers';
import * as path from 'path';
import { FileStorageService } from '../file-storage/file-storage.service';

@Injectable()
export class MessagesHandlerService {
  private readonly sensorDataFolder: string;
  constructor(
    private readonly measurementDownloadService: MeasurementDownloadService,
    private readonly messagesProducerService: MessagesProducerService,
    private readonly filesService: FileStorageService,
    @Inject('TEMP_SENSOR_DATA_FOLDER') sensorFolderPath: string,
  ) {
    this.sensorDataFolder = sensorFolderPath;
  }

  async handleFileDownloadScheduledMessage(
    message: BaseMessage<MessagesTypes['File.DownloadScheduled']>,
  ): Promise<void> {
    this.messagesProducerService.sendFileDownloadStatusMesssage({
      taskId: message.content.taskId,
      status: TaskSteps.PROCESSING,
    });

    const { tenantURL, ...credentials } = message.content.credentials;
    const auth: ICredentials = {
      user: credentials.username,
      password: credentials.password,
      tenant: credentials.tenantID,
    };
    const client = new Client(new BasicAuth(auth), tenantURL);

    const fetchedDataForAllSensors = await awaitAllPromises(
      message.content.sensors.map((sensor) =>
        this.measurementDownloadService.fetchData(
          client,
          new CSVWriter(
            this.sensorDataFolder,
            removeNilProperties({
              fileName: sensor.fileName,
            }),
          ),
          removeNilProperties({
            dateFrom: message.content.dateFrom,
            dateTo: message.content.dateTo,
            source: sensor.managedObjectId,
            valueFragmentType: sensor.fragmentType,
          }),
        ),
      ),
    );

    const messageData = fetchedDataForAllSensors.fulfilled.map(
      (fetchedData) => ({
        sensorId: message.content.sensors[fetchedData.index].id,
        filePath: fetchedData.value.filePath,
        fileName: fetchedData.value.fileName,
        pathSeparator: path.sep,
      }),
    );

    for (const file of messageData) {
      await this.filesService.saveFile(
        'public',
        'public/' + file.fileName,
        file.filePath + file.pathSeparator + file.fileName,
      );
    }

    this.messagesProducerService.sendFileDownloadStatusMesssage({
      taskId: message.content.taskId,
      status: TaskSteps.DONE,
      data: messageData,
    });
  }
}
