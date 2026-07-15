import { Module } from '@nestjs/common';
import { AlicuotasService } from './alicuotas.service';
import { AlicuotasController } from './alicuotas.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AlicuotasController],
  providers: [AlicuotasService, PrismaService],
  exports: [AlicuotasService],
})
export class AlicuotasModule {}
