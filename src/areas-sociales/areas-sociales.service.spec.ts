import { Test, TestingModule } from '@nestjs/testing';
import { AreasSocialesService } from './areas-sociales.service';

describe('AreasSocialesService', () => {
  let service: AreasSocialesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AreasSocialesService],
    }).compile();

    service = module.get<AreasSocialesService>(AreasSocialesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
