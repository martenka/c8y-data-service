import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { BaseMessage, MessagesTypes } from './types/messages.types';
import { ExchangeTypes } from './types/exchanges';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private sendMessage<
    K extends keyof MessagesTypes,
    V extends BaseMessage<MessagesTypes[K]>,
  >(exchange: ExchangeTypes, routingKey: K, message: V) {
    this.amqpConnection.publish(ExchangeTypes[exchange], routingKey, message);
  }

  private getBaseMessage<T extends MessagesTypes[keyof MessagesTypes]>(
    data: T,
    scheduledAt?: string,
  ): BaseMessage<T> {
    return {
      scheduledAt: scheduledAt ?? new Date().toISOString(),
      data,
    };
  }
}
