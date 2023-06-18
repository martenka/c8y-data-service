import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessagesTypes, TaskStatusMessage } from './types/messages.types';
import { ExchangeTypes } from './types/exchanges';
import { Options } from 'amqplib';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private sendMessage<
    K extends keyof MessagesTypes,
    V extends MessagesTypes[K],
  >(
    exchange: ExchangeTypes,
    routingKey: K,
    message: V,
    options?: Options.Publish,
  ) {
    const amqpOptions: Options.Publish = {
      timestamp: new Date().getTime(),
      ...options,
    };
    this.amqpConnection.publish(exchange, routingKey, message, amqpOptions);
  }

  sendTaskStatusMessage<T extends object>(message: TaskStatusMessage<T>) {
    this.sendMessage(ExchangeTypes.GENERAL, 'task.status', message);
  }

  sendTaskFailedMessage(message: MessagesTypes['task.status.failed']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'task.status.failed', message);
  }

  sendTaskModeMessage(message: MessagesTypes['task.mode.changed']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'task.mode.changed', message);
  }

  sendFileVisibilityResultMessage(
    message: MessagesTypes['file.result.visibility.state'],
  ) {
    this.sendMessage(
      ExchangeTypes.GENERAL,
      'file.result.visibility.state',
      message,
    );
  }
}
