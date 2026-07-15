import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AlicuotasModule } from './alicuotas/alicuotas.module';
import { PagosModule } from './pagos/pagos.module';
import { BitacoraModule } from './bitacora/bitacora.module';
import { VisitantesModule } from './visitantes/visitantes.module';
import { CodigosQrModule } from './codigos-qr/codigos-qr.module';
import { AreasSocialesModule } from './areas-sociales/areas-sociales.module';
import { ReservasModule } from './reservas/reservas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ReportesModule } from './reportes/reportes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ManzanasModule } from './manzanas/manzanas.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsuariosModule,
    AuthModule,
    AlicuotasModule,
    PagosModule,
    BitacoraModule,
    VisitantesModule,
    CodigosQrModule,
    AreasSocialesModule,
    ReservasModule,
    NotificacionesModule,
    ReportesModule,
    DocumentosModule,
    CloudinaryModule,
    ManzanasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
