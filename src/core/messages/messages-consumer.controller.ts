import { Controller, Logger } from '@nestjs/common';

import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';
import { MessagesTypes } from './types/messages.types';
import { ConsumeMessage } from 'amqplib';
import { MessagesHandlerService } from './messages-handler.service';
import { FileVisibilityStateMessage } from './types/message-types/file/type';
import { MessagesProducerService } from './messages-producer.service';
import { withTaskSchedulingErrorHandler } from '../../utils/helpers';

@Controller()
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesHandlerService: MessagesHandlerService,
    private readonly messagesProducerService: MessagesProducerService,
  ) {}

  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'dataservice.user',
    routingKey: 'user.#',
    createQueueIfNotExists: true,
    allowNonJsonMessages: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
    },
  })
  async consumeUserMessage(payload: object, amqpMsg: ConsumeMessage) {
    switch (amqpMsg.fields.routingKey) {
      case 'user.user':
        return await this.messagesHandlerService.handleUserMessage(
          payload as MessagesTypes['user.user'],
        );
      default:
        this.logger.warn(
          `Got unknown routingKey in consumeUserMessage: ${amqpMsg.fields.routingKey}`,
        );
    }
  }

  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'dataservice.tasks.scheduling',
    routingKey: 'task.scheduled',
    createQueueIfNotExists: true,
    allowNonJsonMessages: true,
    errorHandler: (channel, msg, error) => {
      console.log('RabbitSubscribe error handler');
      console.error(error);
    },
  })
  async consumeTaskMessage(
    payload: MessagesTypes['task.scheduled'],
    amqpMsg: ConsumeMessage,
  ) {
    switch (amqpMsg.fields.routingKey) {
      case 'task.scheduled':
        await withTaskSchedulingErrorHandler(
          () => this.messagesHandlerService.handleTaskScheduledMessage(payload),
          this.messagesProducerService,
          payload,
        );
        return;
      default:
        this.logger.warn(
          `Got unknown routingKey in consumeTaskMessage: ${amqpMsg.fields.routingKey}`,
        );
        return;
    }
  }

  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'dataservice.files.status',
    routingKey: 'file.status.#',
    createQueueIfNotExists: true,
    allowNonJsonMessages: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
    },
  })
  async consumeFileStatusMessage(payload: object, amqpMsg: ConsumeMessage) {
    switch (amqpMsg.fields.routingKey) {
      case 'file.status.deletion':
        return this.messagesHandlerService.handleFileDeletionMessage(
          payload as MessagesTypes['file.status.deletion'],
        );
      case 'file.status.visibility.state':
        return this.messagesHandlerService.handleFileVisibilityStateMessage(
          payload as FileVisibilityStateMessage,
        );
      default:
        this.logger.warn(
          `Got unknown routingKey in consumeFileStatusMessage: ${amqpMsg.fields.routingKey}`,
        );
    }
  }
}
