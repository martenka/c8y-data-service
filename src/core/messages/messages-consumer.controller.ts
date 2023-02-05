import { Controller } from '@nestjs/common';

import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';
import { BaseMessage, MessagesTypes } from './types/messages.types';
import { ConsumeMessage } from 'amqplib';
import { MessagesHandlerService } from './messages-handler.service';

@Controller()
export class MessagesController {
  constructor(
    private readonly messagesHandlerService: MessagesHandlerService,
  ) {}

  @RabbitSubscribe({
    exchange: ExchangeTypes.FILE,
    queue: 'File.DownloadScheduled' as keyof MessagesTypes,
    createQueueIfNotExists: true,
    allowNonJsonMessages: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
      console.log('---------');
      console.error(msg);
      console.log('----------');
      console.error(channel);
    },
  })
  async handleFileDownloadMessage(
    payload: BaseMessage<MessagesTypes['File.DownloadScheduled']>,
    _amqpMsg: ConsumeMessage,
  ) {
    await this.messagesHandlerService.handleFileDownloadScheduledMessage(
      payload,
    );
  }
}
