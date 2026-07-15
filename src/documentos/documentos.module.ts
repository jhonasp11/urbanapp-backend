import { Module } from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';
import { DocumentosPublicoController } from './documentos-publico.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [CloudinaryModule, NotificacionesModule],
  controllers: [DocumentosController, DocumentosPublicoController],
  providers: [DocumentosService, PrismaService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
