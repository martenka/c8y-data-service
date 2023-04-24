import { Test, TestingModule } from '@nestjs/testing';
import { CkanService } from './ckan.service';

describe('CkanService', () => {
  let service: CkanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CkanService],
    }).compile();

    service = module.get<CkanService>(CkanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
