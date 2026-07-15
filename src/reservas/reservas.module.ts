import { Module } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { ReservasController } from './reservas.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [ReservasController],
  providers: [ReservasService, PrismaService],
  exports: [ReservasService],
})
export class ReservasModule {}
