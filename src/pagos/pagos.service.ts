import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { ValidarPagoDto } from './dto/validar-pago.dto';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class PagosService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async crear(dto: CrearPagoDto) {
    if (dto.tipo_pago === 'alicuota' && dto.alicuota_ids) {
      for (const alicuota_id of dto.alicuota_ids) {
        const pagoPendiente = await this.prisma.pAGOS_ALICUOTAS.findFirst({
          where: {
            alicuota_id,
            pago: { estado: 'pendiente' },
          },
          include: { pago: true },
        });
        if (pagoPendiente) {
          throw new BadRequestException(
            'Ya tienes un pago pendiente de validación para una de las alícuotas seleccionadas',
          );
        }
      }
    }
    if (dto.tipo_pago === 'alicuota') {
      if (!dto.alicuota_ids || dto.alicuota_ids.length === 0) {
        throw new BadRequestException(
          'Debe seleccionar al menos una alicuota a pagar',
        );
      }
      if (dto.cantidad_meses !== dto.alicuota_ids.length) {
        throw new BadRequestException(
          'La cantidad de meses debe coincidir con las alicuotas seleccionadas',
        );
      }
    }

    const pago = await this.prisma.pAGOS.create({
      data: {
        residente_id: dto.residente_id,
        reserva_id: dto.reserva_id,
        tipo_pago: dto.tipo_pago,
        monto_pagado: parseFloat(dto.monto_pagado.toString()),
        cantidad_meses: dto.cantidad_meses,
        mes_pago: dto.mes_pago,
        anio_pago: dto.anio_pago,
        metodo_pago: dto.metodo_pago,
        banco: dto.banco,
        comprobante_url: dto.comprobante_url,
        formato_archivo: dto.formato_archivo,
        observacion_residente: dto.observacion_residente,
        fecha_envio: ahoraEcuadorLiteral(),
        estado: 'pendiente',
      },
    });

    if (dto.tipo_pago === 'alicuota' && dto.alicuota_ids) {
      for (const alicuota_id of dto.alicuota_ids) {
        await this.prisma.pAGOS_ALICUOTAS.create({
          data: {
            pago_id: pago.id,
            alicuota_id,
          },
        });
      }
    }

    // Notificar a los administradores que hay un nuevo pago por revisar
    await this.notificarAdmins(
      'pago',
      'Nuevo pago por revisar',
      'Un residente subió un comprobante de pago que requiere tu validación.',
    );

    return pago;
  }

  // Crea una notificación para todos los administradores aprobados
  private async notificarAdmins(tipo: string, titulo: string, mensaje: string) {
    try {
      const admins = await this.prisma.uSUARIOS.findMany({
        where: { rol: 'administrador', estado: 'aprobado' },
        select: { id: true, fcm_token: true },
      });

      for (const admin of admins) {
        await this.notificaciones.crear(
          admin.id,
          tipo,
          titulo,
          mensaje,
          admin.fcm_token ?? undefined,
        );
      }
    } catch (e) {
      // No bloquear el flujo principal si falla la notificación
      console.error('Error notificando a admins:', e);
    }
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.pAGOS.findMany({
      where: { residente_id },
      include: {
        pagos_alicuotas: {
          include: { alicuota: true },
        },
      },
      orderBy: { fecha_envio: 'desc' },
    });
  }

  async listarTodos() {
    return this.prisma.pAGOS.findMany({
      include: {
        residente: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true },
            },
          },
        },
        pagos_alicuotas: {
          include: { alicuota: true },
        },
        reserva: {
          include: { area: true },
        },
      },
      orderBy: { fecha_envio: 'desc' },
    });
  }

  async validar(id: string, dto: ValidarPagoDto) {
    const pago = await this.prisma.pAGOS.findUnique({
      where: { id },
      include: {
        pagos_alicuotas: true,
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const pagoActualizado = await this.prisma.pAGOS.update({
      where: { id },
      data: {
        estado: dto.estado,
        observacion_admin: dto.observacion_admin,
        validado_por: dto.validado_por,
        fecha_validacion: ahoraEcuadorLiteral(),
      },
    });

    // ALÍCUOTAS: aprobar -> pagado, rechazar -> vuelve a pendiente
    if (dto.estado === 'aprobado' && pago.pagos_alicuotas.length > 0) {
      for (const pa of pago.pagos_alicuotas) {
        await this.prisma.aLICUOTAS.update({
          where: { id: pa.alicuota_id },
          data: { estado: 'pagado' },
        });
      }
    }

    if (dto.estado === 'rechazado' && pago.pagos_alicuotas.length > 0) {
      for (const pa of pago.pagos_alicuotas) {
        await this.prisma.aLICUOTAS.update({
          where: { id: pa.alicuota_id },
          data: { estado: 'pendiente' },
        });
      }
    }

    // RESERVA: si el pago es de una reserva, reflejar el resultado en la reserva
    if (pago.reserva_id) {
      if (dto.estado === 'aprobado') {
        await this.prisma.rESERVAS.update({
          where: { id: pago.reserva_id },
          data: {
            estado: 'confirmada',
            observacion_admin: dto.observacion_admin,
            validado_por: dto.validado_por,
            bloqueo_temporal: false,
            bloqueo_hasta: null,
          },
        });
      } else if (dto.estado === 'rechazado') {
        await this.prisma.rESERVAS.update({
          where: { id: pago.reserva_id },
          data: {
            estado: 'denegada',
            observacion_admin: dto.observacion_admin,
            validado_por: dto.validado_por,
            bloqueo_temporal: false,
            bloqueo_hasta: null,
          },
        });
      }
    }

    return pagoActualizado;
  }

  async buscarPorId(id: string) {
    const pago = await this.prisma.pAGOS.findUnique({
      where: { id },
      include: {
        residente: {
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
        pagos_alicuotas: {
          include: { alicuota: true },
        },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }
}
