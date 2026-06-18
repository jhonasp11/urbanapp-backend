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
    const area = await this.prisma.aREAS_SOCIALES.findUnique({
      where: { id: dto.area_id },
    });
    if (!area) throw new NotFoundException('Area social no encontrada');

    const inicio = new Date(`2000-01-01T${dto.hora_inicio}:00Z`);
    const fin = new Date(`2000-01-01T${dto.hora_fin}:00Z`);
    const diffHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    const nombreArea = area.nombre.toLowerCase();
    const esFutbolOBasket =
      nombreArea.includes('futbol') ||
      nombreArea.includes('fútbol') ||
      nombreArea.includes('basket');
    const esEventos = nombreArea.includes('evento');

    if (esFutbolOBasket) {
      if (diffHoras < 1 || diffHoras > 2) {
        throw new BadRequestException(
          'Para futbol y basket la reserva debe ser de 1 o 2 horas',
        );
      }
      const horaInicio = parseInt(dto.hora_inicio.split(':')[0]);
      const horaFin = parseInt(dto.hora_fin.split(':')[0]);
      if (horaInicio < 7 || horaFin > 22) {
        throw new BadRequestException(
          'Para futbol y basket el horario es de 7:00 a 22:00',
        );
      }
    }

    if (esEventos) {
      if (diffHoras < 3 || diffHoras > 4) {
        throw new BadRequestException(
          'Para el area de eventos la reserva debe ser de 3 o 4 horas',
        );
      }
      const horaInicio = parseInt(dto.hora_inicio.split(':')[0]);
      const horaFin = parseInt(dto.hora_fin.split(':')[0]);
      if (horaInicio < 9 || horaFin > 20) {
        throw new BadRequestException(
          'Para el area de eventos el horario es de 9:00 a 20:00',
        );
      }
    }

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
        'El horario seleccionado no esta disponible',
      );
    }

    const bloqueo_hasta = new Date();
    bloqueo_hasta.setMinutes(bloqueo_hasta.getMinutes() + 10);

    const esPago = esEventos;

    return this.prisma.rESERVAS.create({
      data: {
        residente_id: dto.residente_id,
        area_id: dto.area_id,
        fecha_reserva: new Date(dto.fecha_reserva),
        hora_inicio: new Date(`2000-01-01T${dto.hora_inicio}:00Z`),
        hora_fin: new Date(`2000-01-01T${dto.hora_fin}:00Z`),
        estado: 'pendiente',
        bloqueo_temporal: esPago,
        bloqueo_hasta: esPago ? bloqueo_hasta : null,
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
        'El tiempo de bloqueo expiro. La reserva fue liberada',
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
