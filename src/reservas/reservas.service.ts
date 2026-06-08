import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ValidarReservaDto } from './dto/validar-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearReservaDto) {
    const conflicto = await this.prisma.rESERVAS.findFirst({
      where: {
        area_id: dto.area_id,
        fecha_reserva: new Date(dto.fecha_reserva),
        hora_inicio: new Date(`2000-01-01T${dto.hora_inicio}:00Z`),
        estado: { in: ['pendiente', 'confirmada'] },
        bloqueo_temporal: true,
      },
    });

    if (conflicto) {
      throw new BadRequestException(
        'El horario seleccionado no está disponible',
      );
    }

    const bloqueo_hasta = new Date();
    bloqueo_hasta.setMinutes(bloqueo_hasta.getMinutes() + 10);

    return this.prisma.rESERVAS.create({
      data: {
        residente_id: dto.residente_id,
        area_id: dto.area_id,
        fecha_reserva: new Date(dto.fecha_reserva),
        hora_inicio: new Date(`2000-01-01T${dto.hora_inicio}:00Z`),
        hora_fin: new Date(`2000-01-01T${dto.hora_fin}:00Z`),
        estado: 'pendiente',
        bloqueo_temporal: true,
        bloqueo_hasta,
      },
    });
  }

  async confirmar(id: string) {
    const reserva = await this.prisma.rESERVAS.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    if (reserva.bloqueo_hasta && new Date() > reserva.bloqueo_hasta) {
      await this.prisma.rESERVAS.update({
        where: { id },
        data: { estado: 'expirada', bloqueo_temporal: false },
      });
      throw new BadRequestException(
        'El tiempo de bloqueo expiró. La reserva fue liberada',
      );
    }

    return this.prisma.rESERVAS.update({
      where: { id },
      data: { estado: 'pendiente', bloqueo_temporal: true },
    });
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.rESERVAS.findMany({
      where: { residente_id },
      include: { area: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async listarTodas() {
    return this.prisma.rESERVAS.findMany({
      include: {
        area: true,
        residente: {
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async validar(id: string, dto: ValidarReservaDto) {
    const reserva = await this.prisma.rESERVAS.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    return this.prisma.rESERVAS.update({
      where: { id },
      data: {
        estado: dto.estado,
        observacion_admin: dto.observacion_admin,
        validado_por: dto.validado_por,
        bloqueo_temporal: false,
        bloqueo_hasta: null,
      },
    });
  }

  async librarExpiradas() {
    const ahora = new Date();
    return this.prisma.rESERVAS.updateMany({
      where: {
        bloqueo_temporal: true,
        bloqueo_hasta: { lt: ahora },
        estado: 'pendiente',
      },
      data: {
        estado: 'expirada',
        bloqueo_temporal: false,
      },
    });
  }
}
