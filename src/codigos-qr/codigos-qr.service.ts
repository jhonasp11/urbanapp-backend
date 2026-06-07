import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

@Injectable()
export class CodigosQrService {
  constructor(private prisma: PrismaService) {}

  async generarQR(visitante_id: string, residente_id: string) {
    const visitante = await this.prisma.vISITANTES.findUnique({
      where: { id: visitante_id },
    });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');

    const codigoExistente = await this.prisma.cODIGOS_QR.findFirst({
      where: {
        visitante_id,
        estado: 'activo',
      },
    });

    if (codigoExistente) {
      const qrImage = await QRCode.toDataURL(codigoExistente.codigo_hash);
      return { ...codigoExistente, qr_image: qrImage };
    }

    const codigo_hash = randomBytes(32).toString('hex');
    const fecha_expiracion = new Date();
    fecha_expiracion.setHours(fecha_expiracion.getHours() + 24);

    const codigoQR = await this.prisma.cODIGOS_QR.create({
      data: {
        visitante_id,
        residente_id,
        codigo_hash,
        estado: 'activo',
        fecha_expiracion,
      },
    });

    const qrImage = await QRCode.toDataURL(codigo_hash);
    return { ...codigoQR, qr_image: qrImage };
  }

  async escanearQR(codigo_hash: string, guardia_id: string, bitacora_id: string) {
    const codigoQR = await this.prisma.cODIGOS_QR.findUnique({
      where: { codigo_hash },
      include: { visitante: true, residente: true },
    });

    if (!codigoQR) {
      throw new NotFoundException('Código QR no encontrado');
    }

    if (codigoQR.estado === 'bloqueado') {
      throw new BadRequestException('Código QR bloqueado por intentos fallidos');
    }

    if (codigoQR.estado === 'usado') {
      throw new BadRequestException('Código QR ya fue utilizado');
    }

    if (codigoQR.estado === 'expirado' || new Date() > codigoQR.fecha_expiracion) {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { estado: 'expirado' },
      });
      throw new BadRequestException('Código QR expirado');
    }

    await this.prisma.cODIGOS_QR.update({
      where: { id: codigoQR.id },
      data: { estado: 'usado' },
    });

    const ingreso = await this.prisma.iNGRESOS.create({
      data: {
        codigo_qr_id: codigoQR.id,
        visitante_id: codigoQR.visitante_id,
        residente_id: codigoQR.residente_id,
        guardia_id,
        bitacora_id,
        nombre_visitante: codigoQR.visitante.nombre_visitante,
        manzana_destino: codigoQR.residente.manzana,
        villa_destino: codigoQR.residente.villa,
        hora_ingreso: new Date(),
        estado: 'valido',
      },
    });

    await this.prisma.bITACORA_TURNOS.update({
      where: { id: bitacora_id },
      data: { total_ingresos: { increment: 1 } },
    });

    return {
      mensaje: 'Acceso permitido',
      ingreso,
      visitante: codigoQR.visitante.nombre_visitante,
      residente: `${codigoQR.residente.manzana}-${codigoQR.residente.villa}`,
    };
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.cODIGOS_QR.findMany({
      where: { residente_id },
      include: { visitante: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
