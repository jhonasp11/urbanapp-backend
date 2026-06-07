import { Module } from '@nestjs/common';
import { AlicuotasService } from './alicuotas.service';
import { AlicuotasController } from './alicuotas.controller';

@Module({
  providers: [AlicuotasService],
  controllers: [AlicuotasController]
})
export class AlicuotasModule {}
