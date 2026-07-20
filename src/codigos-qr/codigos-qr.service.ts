import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

@Injectable()
export class CodigosQrService {
  constructor(private prisma: PrismaService) {}

  // Devuelve la hora actual de Ecuador como "UTC Literal" para engañar a Prisma
  private ahoraEcuadorLiteral(): Date {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const p = f.formatToParts(new Date());
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
    let hour = g('hour');
    if (hour === '24') hour = '00';
    return new Date(
      `${g('year')}-${g('month')}-${g('day')}T${hour}:${g('minute')}:${g('second')}Z`,
    );
  }

  // Método automático que se ejecuta cada minuto
  @Cron(CronExpression.EVERY_MINUTE)
  async expirarCodigosAutomaticamente() {
    // Usamos tu helper para obtener la hora exacta local
    const ahoraEcuador = this.ahoraEcuadorLiteral();

    // Actualizamos masivamente todos los activos cuya fecha ya pasó
    const resultado = await this.prisma.cODIGOS_QR.updateMany({
      where: {
        estado: 'activo',
        fecha_fin: {
          lt: ahoraEcuador, // lt = less than (menor que) la hora actual
        },
      },
      data: {
        estado: 'expirado',
      },
    });

    if (resultado.count > 0) {
      console.log(
        `[Cron] Se expiraron automáticamente ${resultado.count} códigos QR.`,
      );
    }
  }

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

    // Tratar la hora local como literal para que Prisma no sume horas
    const inicio = new Date(fecha_inicio + 'Z');
    const fin = new Date(fecha_fin + 'Z');
    const diffHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    // La fecha/hora de inicio debe ser posterior a la hora actual
    const ahora = this.ahoraEcuadorLiteral();
    if (inicio < ahora) {
      throw new BadRequestException(
        'La fecha y hora de inicio debe ser posterior a la hora actual',
      );
    }

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

    // Verificar por cédula del visitante (no por visitante_id), porque un
    // visitante no guardado se crea como registro nuevo en cada QR.
    const codigoExistente = await this.prisma.cODIGOS_QR.findFirst({
      where: {
        estado: 'activo',
        residente_id,
        visitante: { cedula_visitante: visitante.cedula_visitante },
      },
    });

    if (codigoExistente) {
      throw new BadRequestException(
        'Este visitante ya tiene un código QR activo. Revísalo en el historial de accesos para compartirlo, o anúlalo para generar uno nuevo.',
      );
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
        created_at: this.ahoraEcuadorLiteral(),
      },
    });

    const qrImage = await QRCode.toDataURL(codigo_hash);
    return { ...codigoQR, qr_image: qrImage };
  }

  // PASO 1: Solo valida el QR (no crea ingreso todavía)
  async validarQR(codigo_hash: string) {
    const codigoQR = await this.prisma.cODIGOS_QR.findUnique({
      where: { codigo_hash },
      include: {
        visitante: true,
        residente: {
          include: { usuario: true },
        },
      },
    });

    if (!codigoQR) {
      throw new NotFoundException('Codigo QR no encontrado');
    }

    if (codigoQR.estado === 'bloqueado') {
      throw new BadRequestException(
        'Codigo QR bloqueado por intentos fallidos',
      );
    }

    if (codigoQR.estado === 'usado') {
      throw new BadRequestException('Codigo QR ya fue utilizado');
    }

    const ahora = this.ahoraEcuadorLiteral();
    if (
      codigoQR.estado === 'expirado' ||
      ahora > new Date(codigoQR.fecha_fin.getTime()) ||
      ahora < new Date(codigoQR.fecha_inicio.getTime())
    ) {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { estado: 'expirado' },
      });
      throw new BadRequestException('Codigo QR expirado o aun no vigente');
    }

    if (codigoQR.intentos_fallidos >= 3) {
      await this.prisma.cODIGOS_QR.update({
        where: { id: codigoQR.id },
        data: { estado: 'bloqueado' },
      });
      throw new BadRequestException(
        'Codigo QR bloqueado por demasiados intentos fallidos',
      );
    }

    // QR válido: devolver los datos para que el guardia confirme con la placa
    return {
      mensaje: 'Codigo QR valido',
      codigo_qr_id: codigoQR.id,
      visitante: codigoQR.visitante,
      residente: {
        nombres: codigoQR.residente.usuario?.nombres ?? '',
        apellidos: codigoQR.residente.usuario?.apellidos ?? '',
        manzana: codigoQR.residente.manzana,
        villa: codigoQR.residente.villa,
      },
    };
  }

  // PASO 2: Confirma el ingreso (ya con la placa) y lo crea
  async confirmarIngresoAutomatico(
    codigo_qr_id: string,
    guardia_id: string,
    bitacora_id: string | null,
    placa_vehiculo: string,
  ) {
    const codigoQR = await this.prisma.cODIGOS_QR.findUnique({
      where: { id: codigo_qr_id },
      include: {
        visitante: true,
        residente: {
          include: { usuario: true },
        },
      },
    });

    if (!codigoQR) {
      throw new NotFoundException('Codigo QR no encontrado');
    }

    if (codigoQR.estado === 'usado') {
      throw new BadRequestException('Codigo QR ya fue utilizado');
    }

    // Marcar el QR como usado
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
        ...(bitacora_id && { bitacora_id }),
        nombre_visitante: codigoQR.visitante.nombre_visitante,
        cedula_visitante: codigoQR.visitante.cedula_visitante,
        nombre_residente:
          `${codigoQR.residente.usuario?.nombres ?? ''} ${codigoQR.residente.usuario?.apellidos ?? ''}`.trim(),
        placa_vehiculo: placa_vehiculo,
        manzana_destino: codigoQR.residente.manzana,
        villa_destino: codigoQR.residente.villa,
        hora_ingreso: this.ahoraEcuadorLiteral(),
        tipo_ingreso: 'automatico',
        estado: 'valido',
      },
    });

    if (bitacora_id) {
      await this.prisma.bITACORA_TURNOS.update({
        where: { id: bitacora_id },
        data: { total_ingresos: { increment: 1 } },
      });
    }

    return {
      mensaje: 'Acceso permitido',
      ingreso,
    };
  }

  async registrarIngresoManual(
    guardia_id: string,
    bitacora_id: string | null,
    nombre_visitante: string,
    cedula_visitante: string,
    placa_vehiculo: string,
    nombre_residente: string,
    manzana_destino: string,
    villa_destino: string,
  ) {
    if ((nombre_visitante ?? '').trim().length < 8) {
      throw new BadRequestException(
        'El nombre del visitante debe tener al menos 8 caracteres',
      );
    }
    if ((nombre_residente ?? '').trim().length < 8) {
      throw new BadRequestException(
        'El nombre del residente debe tener al menos 8 caracteres',
      );
    }

    const residenteId = await this.obtenerResidenteIdPorUbicacion(
      manzana_destino,
      villa_destino,
    );

    const ingreso = await this.prisma.iNGRESOS.create({
      data: {
        residente_id: residenteId,
        guardia_id,
        ...(bitacora_id && { bitacora_id }),
        nombre_visitante,
        cedula_visitante,
        nombre_residente,
        placa_vehiculo,
        manzana_destino,
        villa_destino,
        hora_ingreso: this.ahoraEcuadorLiteral(),
        tipo_ingreso: 'manual',
        estado: 'valido',
      },
    });

    if (bitacora_id) {
      await this.prisma.bITACORA_TURNOS.update({
        where: { id: bitacora_id },
        data: { total_ingresos: { increment: 1 } },
      });
    }

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

  async anularQR(id: string, residente_id: string) {
    const codigo = await this.prisma.cODIGOS_QR.findUnique({
      where: { id },
    });

    if (!codigo) {
      throw new NotFoundException('Codigo QR no encontrado');
    }

    if (codigo.residente_id !== residente_id) {
      throw new BadRequestException(
        'No tienes permiso para anular este codigo',
      );
    }

    if (codigo.estado === 'usado') {
      throw new BadRequestException(
        'No se puede anular un codigo ya utilizado',
      );
    }

    return this.prisma.cODIGOS_QR.update({
      where: { id },
      data: { estado: 'anulado' },
    });
  }

  async registrarReporteIncidencia(
    guardia_id: string,
    observacion_incidencia: string,
    hora_ingreso: string,
    bitacora_id: string | null,
  ) {
    if ((observacion_incidencia ?? '').trim().length < 20) {
      throw new BadRequestException(
        'El reporte de incidencia debe tener al menos 20 caracteres',
      );
    }

    const incidencia = await this.prisma.iNGRESOS.create({
      data: {
        guardia: { connect: { id: guardia_id } },
        ...(bitacora_id && { bitacora: { connect: { id: bitacora_id } } }),
        observacion_incidencia,
        hora_ingreso: this.ahoraEcuadorLiteral(),
        nombre_visitante: 'INCIDENCIA',
        manzana_destino: 'N/A',
        villa_destino: 'N/A',
        tipo_ingreso: 'manual',
        estado: 'denegado',
      },
    });

    if (bitacora_id) {
      await this.prisma.bITACORA_TURNOS.update({
        where: { id: bitacora_id },
        data: { total_incidencias: { increment: 1 } },
      });
    }

    return incidencia;
  }

  async listarIngresos(
    fecha?: string,
    guardia_id?: string,
    fecha_hasta?: string,
  ) {
    const where: any = {};
    if (fecha) {
      const inicio = new Date(fecha + 'T00:00:00.000Z');
      const finStr = fecha_hasta ?? fecha;
      const fin = new Date(finStr + 'T23:59:59.999Z');
      where.hora_ingreso = { gte: inicio, lte: fin };
    }
    if (guardia_id) {
      where.guardia_id = guardia_id;
    }
    return this.prisma.iNGRESOS.findMany({
      where,
      orderBy: { hora_ingreso: 'desc' },
    });
  }
}
