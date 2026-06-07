import { Test, TestingModule } from '@nestjs/testing';
import { VisitantesController } from './visitantes.controller';

describe('VisitantesController', () => {
  let controller: VisitantesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitantesController],
    }).compile();

    controller = module.get<VisitantesController>(VisitantesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
