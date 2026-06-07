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

@Module({
  imports: [PrismaModule, UsuariosModule, AuthModule, AlicuotasModule, PagosModule, VisitantesModule, CodigosQrModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
