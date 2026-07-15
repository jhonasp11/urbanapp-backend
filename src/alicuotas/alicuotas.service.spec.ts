import { Test, TestingModule } from '@nestjs/testing';
import { AlicuotasService } from './alicuotas.service';

/**
 * Suite de pruebas unitarias para AlicuotasService.
 * Utiliza Jest y las herramientas de testing de NestJS para verificar 
 * la lógica de negocio de forma aislada.
 */

describe('AlicuotasService', () => {
  let service: AlicuotasService;

  /**
   * Hook de Jest que se ejecuta antes de cada prueba (bloque 'it').
   * Se encarga de levantar un módulo de NestJS virtual para inyectar los servicios.
   */

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
