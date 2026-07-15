import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [NotificacionesModule, CloudinaryModule],
  controllers: [PagosController],
  providers: [PagosService, PrismaService],
  exports: [PagosService],
})
export class PagosModule {}
