import { Test, TestingModule } from '@nestjs/testing';
import { MessagesProducerService } from './messages-producer.service';

describe('MessagesService', () => {
  let service: MessagesProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesProducerService],
    }).compile();

    service = module.get<MessagesProducerService>(MessagesProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
