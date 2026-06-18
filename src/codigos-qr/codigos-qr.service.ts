import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

@Injectable()
export class CodigosQrService {
  constructor(private prisma: PrismaService) {}

  async generarQR(
    visitante_id: string,
    residente_id: string,
    fecha_inicio: string,
    fecha_fin: string,
  ) {
    const visitante = await this.prisma.vISITANTES.findUnique({
      where: { id: visitante_id },
    });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    const diffHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    if (diffHoras > 24) {
      throw new BadRequestException(
        'El codigo QR no puede tener mas de 24 horas de duracion',
      );
    }

    if (diffHoras <= 0) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    const codigoExistente = await this.prisma.cODIGOS_QR.findFirst({
      where: { visitante_id, estado: 'activo' },
    });

    if (codigoExistente) {
      const qrImage = await QRCode.toDataURL(codigoExistente.codigo_hash);
      return { ...codigoExistente, qr_image: qrImage };
    }

    const codigo_hash = randomBytes(32).toString('hex');

    const codigoQR = await this.prisma.cODIGOS_QR.create({
      data: {
        visitante_id,
        residente_id,
        codigo_hash,
        estado: 'activo',
        fecha_inicio: inicio,
        fecha_fin: fin,
      },
    });

    const qrImage = await QRCode.toDataURL(codigo_hash);
    return { ...codigoQR, qr_image: qrImage };
  }

  async escanearQR(
    codigo_hash: string,
    guardia_id: string,
    bitacora_id: string,
    placa_vehiculo?: string,
  ) {
    const codigoQR = await this.prisma.cODIGOS_QR.findUnique({
      where: { codigo_hash },
      include: { visitante: true, residente: true },
    });

    if (!codigoQR) {
      throw new NotFoundException('Codigo QR no encontrado');
    }

    if (codigoQR.estado === 'bloqueado') {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { intentos_fallidos: { increment: 1 } },
      });
      throw new BadRequestException(
        'Codigo QR bloqueado por intentos fallidos',
      );
    }

    if (codigoQR.estado === 'usado') {
      throw new BadRequestException('Codigo QR ya fue utilizado');
    }

    if (
      codigoQR.estado === 'expirado' ||
      new Date() > codigoQR.fecha_fin ||
      new Date() < codigoQR.fecha_inicio
    ) {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { estado: 'expirado' },
      });
      throw new BadRequestException('Codigo QR expirado o aun no vigente');
    }

    const intentos = codigoQR.intentos_fallidos;
    if (intentos >= 3) {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { estado: 'bloqueado' },
      });
      throw new BadRequestException(
        'Codigo QR bloqueado por demasiados intentos fallidos',
      );
    }

    await this.prisma.cODIGOS_QR.update({
      where: { id: codigoQR.id },
      data: { estado: 'usado', intentos_fallidos: 0 },
    });

    const ingreso = await this.prisma.iNGRESOS.create({
      data: {
        codigo_qr_id: codigoQR.id,
        visitante_id: codigoQR.visitante_id,
        residente_id: codigoQR.residente_id,
        guardia_id,
        bitacora_id,
        nombre_visitante: codigoQR.visitante.nombre_visitante,
        cedula_visitante: codigoQR.visitante.cedula_visitante,
        placa_vehiculo: placa_vehiculo ?? null,
        manzana_destino: codigoQR.residente.manzana,
        villa_destino: codigoQR.residente.villa,
        hora_ingreso: new Date(),
        tipo_ingreso: 'automatico',
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

  async registrarIngresoManual(
    guardia_id: string,
    bitacora_id: string,
    nombre_visitante: string,
    cedula_visitante: string,
    placa_vehiculo: string,
    nombre_residente: string,
    manzana_destino: string,
    villa_destino: string,
  ) {
    const ingreso = await this.prisma.iNGRESOS.create({
      data: {
        residente_id: await this.obtenerResidenteIdPorUbicacion(
          manzana_destino,
          villa_destino,
        ),
        guardia_id,
        bitacora_id,
        nombre_visitante,
        cedula_visitante,
        placa_vehiculo,
        manzana_destino,
        villa_destino,
        hora_ingreso: new Date(),
        tipo_ingreso: 'manual',
        estado: 'valido',
      },
    });

    await this.prisma.bITACORA_TURNOS.update({
      where: { id: bitacora_id },
      data: { total_ingresos: { increment: 1 } },
    });

    return {
      mensaje: 'Ingreso manual registrado exitosamente',
      ingreso,
    };
  }

  private async obtenerResidenteIdPorUbicacion(manzana: string, villa: string) {
    const residente = await this.prisma.rESIDENTES.findFirst({
      where: { manzana, villa },
    });
    if (!residente) {
      throw new NotFoundException(
        `No se encontro residente en Mz. ${manzana} Villa ${villa}`,
      );
    }
    return residente.id;
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.cODIGOS_QR.findMany({
      where: { residente_id },
      include: { visitante: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
