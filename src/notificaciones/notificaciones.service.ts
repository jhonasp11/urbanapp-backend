import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class NotificacionesService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  async crear(
    usuario_id: string,
    tipo: string,
    titulo: string,
    mensaje: string,
    fcm_token?: string,
  ) {
    if (!usuario_id || usuario_id.trim() === '') {
      console.warn('Notificación omitida: usuario_id vacío');
      return null;
    }

    const notificacion = await this.prisma.nOTIFICACIONES.create({
      data: {
        usuario_id,
        tipo,
        titulo,
        mensaje,
        leida: false,
        created_at: ahoraEcuadorLiteral(),
      },
    });

    if (fcm_token) {
      const res = await this.firebase.enviarNotificacion(
        fcm_token,
        titulo,
        mensaje,
      );
      // Si el token ya no existe (app desinstalada), se limpia de la BD
      if (res?.tokenInvalido) {
        try {
          await this.prisma.uSUARIOS.updateMany({
            where: { id: usuario_id, fcm_token },
            data: { fcm_token: null },
          });
        } catch (e) {
          console.error('Error limpiando fcm_token:', e);
        }
      }
    }

    return notificacion;
  }

  async listarPorUsuario(usuario_id: string) {
    return this.prisma.nOTIFICACIONES.findMany({
      where: { usuario_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async marcarLeida(id: string) {
    return this.prisma.nOTIFICACIONES.update({
      where: { id },
      data: { leida: true },
    });
  }

  async marcarTodasLeidas(usuario_id: string) {
    return this.prisma.nOTIFICACIONES.updateMany({
      where: { usuario_id, leida: false },
      data: { leida: true },
    });
  }

  async contarNoLeidas(usuario_id: string) {
    const total = await this.prisma.nOTIFICACIONES.count({
      where: { usuario_id, leida: false },
    });
    return { total };
  }
}
