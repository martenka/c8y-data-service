import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages-consumer.controller';
import { MessagesProducerService } from './messages-producer.service';

describe('MessagesController', () => {
  let controller: MessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [MessagesProducerService],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
