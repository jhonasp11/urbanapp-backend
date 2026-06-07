import { Test, TestingModule } from '@nestjs/testing';
import { CodigosQrService } from './codigos-qr.service';

describe('CodigosQrService', () => {
  let service: CodigosQrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodigosQrService],
    }).compile();

    service = module.get<CodigosQrService>(CodigosQrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
