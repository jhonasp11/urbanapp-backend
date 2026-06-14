import { Module } from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DocumentosController],
  providers: [DocumentosService, PrismaService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
