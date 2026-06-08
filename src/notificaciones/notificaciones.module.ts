import { Module } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { FirebaseService } from './firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, FirebaseService, PrismaService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
