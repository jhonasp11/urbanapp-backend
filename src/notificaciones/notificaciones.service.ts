import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';

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
    const notificacion = await this.prisma.nOTIFICACIONES.create({
      data: {
        usuario_id,
        tipo,
        titulo,
        mensaje,
        leida: false,
      },
    });

    if (fcm_token) {
      await this.firebase.enviarNotificacion(fcm_token, titulo, mensaje);
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
