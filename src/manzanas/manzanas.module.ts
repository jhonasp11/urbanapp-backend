import { Module } from '@nestjs/common';
import { ManzanasService } from './manzanas.service';
import { ManzanasController } from './manzanas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManzanasController],
  providers: [ManzanasService],
  exports: [ManzanasService],
})
export class ManzanasModule {}
