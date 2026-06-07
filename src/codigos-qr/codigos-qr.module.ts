import { Module } from '@nestjs/common';
import { CodigosQrService } from './codigos-qr.service';
import { CodigosQrController } from './codigos-qr.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CodigosQrController],
  providers: [CodigosQrService, PrismaService],
  exports: [CodigosQrService],
})
export class CodigosQrModule {}
