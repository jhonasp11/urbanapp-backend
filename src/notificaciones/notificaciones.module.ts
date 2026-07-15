import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';

@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, FirebaseService, PrismaService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
