import { Test, TestingModule } from '@nestjs/testing';
import { AreasSocialesController } from './areas-sociales.controller';

describe('AreasSocialesController', () => {
  let controller: AreasSocialesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasSocialesController],
    }).compile();

    controller = module.get<AreasSocialesController>(AreasSocialesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
