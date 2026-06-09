import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, PrismaService],
  exports: [ReportesService],
})
export class ReportesModule {}
