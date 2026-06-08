import { Module } from '@nestjs/common';
import { AreasSocialesService } from './areas-sociales.service';
import { AreasSocialesController } from './areas-sociales.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AreasSocialesController],
  providers: [AreasSocialesService, PrismaService],
  exports: [AreasSocialesService],
})
export class AreasSocialesModule {}
