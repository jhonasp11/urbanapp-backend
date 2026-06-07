import { Module } from '@nestjs/common';
import { VisitantesService } from './visitantes.service';
import { VisitantesController } from './visitantes.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [VisitantesController],
  providers: [VisitantesService, PrismaService],
  exports: [VisitantesService],
})
export class VisitantesModule {}
