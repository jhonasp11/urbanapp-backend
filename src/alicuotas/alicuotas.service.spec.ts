import { Test, TestingModule } from '@nestjs/testing';
import { AlicuotasService } from './alicuotas.service';

describe('AlicuotasService', () => {
  let service: AlicuotasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlicuotasService],
    }).compile();

    service = module.get<AlicuotasService>(AlicuotasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
