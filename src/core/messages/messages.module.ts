import { Module } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';

@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      exchanges: [
        {
          name: ExchangeTypes.FILE,
          type: 'direct',
          createExchangeIfNotExists: true,
        },
      ],
      uri: `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@localhost:5672`,
      prefetchCount: 1,
      enableControllerDiscovery: true,
      connectionInitOptions: {
        wait: true,
      },
    }),
  ],
  providers: [MessagesProducerService],
  exports: [MessagesProducerService],
})
export class MessagesModule {}
