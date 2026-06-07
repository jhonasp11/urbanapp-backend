import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { ValidarPagoDto } from './dto/validar-pago.dto';

@Injectable()
export class PagosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearPagoDto) {
    const pago = await this.prisma.pAGOS.create({
      data: {
        residente_id: dto.residente_id,
        alicuota_id: dto.alicuota_id,
        reserva_id: dto.reserva_id,
        tipo_pago: dto.tipo_pago,
        mes_pago: dto.mes_pago,
        anio_pago: dto.anio_pago,
        metodo_pago: dto.metodo_pago,
        banco: dto.banco,
        comprobante_url: dto.comprobante_url,
        formato_archivo: dto.formato_archivo,
        observacion_residente: dto.observacion_residente,
        estado: 'pendiente',
      },
    });

    if (dto.alicuota_id) {
      await this.prisma.aLICUOTAS.update({
        where: { id: dto.alicuota_id },
        data: { estado: 'pagado' },
      });
    }

    return pago;
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.pAGOS.findMany({
      where: { residente_id },
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
      },
      orderBy: { fecha_envio: 'desc' },
    });
  }

  async validar(id: string, dto: ValidarPagoDto) {
    const pago = await this.prisma.pAGOS.findUnique({ where: { id } });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const pagoActualizado = await this.prisma.pAGOS.update({
      where: { id },
      data: {
        estado: dto.estado,
        observacion_admin: dto.observacion_admin,
        validado_por: dto.validado_por,
        fecha_validacion: new Date(),
      },
    });

    if (dto.estado === 'rechazado' && pago.alicuota_id) {
      await this.prisma.aLICUOTAS.update({
        where: { id: pago.alicuota_id },
        data: { estado: 'pendiente' },
      });
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
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }
}
