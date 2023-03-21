import { Controller, Logger } from '@nestjs/common';

import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';
import { MessagesTypes } from './types/messages.types';
import { ConsumeMessage } from 'amqplib';
import { MessagesHandlerService } from './messages-handler.service';

@Controller()
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesHandlerService: MessagesHandlerService,
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
      console.error(error);
    },
  })
  async consumeTaskMessage(payload: object, amqpMsg: ConsumeMessage) {
    switch (amqpMsg.fields.routingKey) {
      case 'task.scheduled':
        return await this.messagesHandlerService.handleTaskScheduledMessage(
          payload as MessagesTypes['task.scheduled'],
        );
      default:
        this.logger.warn(
          `Got unknown routingKey in consumeTaskMessage: ${amqpMsg.fields.routingKey}`,
        );
    }
  }
}
