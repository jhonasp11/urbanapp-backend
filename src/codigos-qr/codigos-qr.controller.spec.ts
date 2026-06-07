import { Test, TestingModule } from '@nestjs/testing';
import { CodigosQrController } from './codigos-qr.controller';

describe('CodigosQrController', () => {
  let controller: CodigosQrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodigosQrController],
    }).compile();

    controller = module.get<CodigosQrController>(CodigosQrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
