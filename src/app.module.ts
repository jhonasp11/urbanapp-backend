import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AlicuotasModule } from './alicuotas/alicuotas.module';
import { PagosModule } from './pagos/pagos.module';
import { VisitantesModule } from './visitantes/visitantes.module';
import { CodigosQrModule } from './codigos-qr/codigos-qr.module';
import { AreasSocialesModule } from './areas-sociales/areas-sociales.module';
import { ReservasModule } from './reservas/reservas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [PrismaModule, UsuariosModule, AuthModule, AlicuotasModule, PagosModule, VisitantesModule, CodigosQrModule, AreasSocialesModule, ReservasModule, NotificacionesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
