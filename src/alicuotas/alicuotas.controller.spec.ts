import { Test, TestingModule } from '@nestjs/testing';
import { AlicuotasController } from './alicuotas.controller';

describe('AlicuotasController', () => {
  let controller: AlicuotasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlicuotasController],
    }).compile();

    controller = module.get<AlicuotasController>(AlicuotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
