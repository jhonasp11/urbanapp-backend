import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ValidarReservaDto } from './dto/validar-reserva.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class ReservasService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  // Construye un Date en UTC con la hora exacta (para campos @db.Time)
  private horaAUtc(hora: string): Date {
    const [h, m] = hora.split(':').map(Number);
    return new Date(Date.UTC(2000, 0, 1, h, m, 0));
  }

  async crear(dto: CrearReservaDto) {
    // Liberar reservas expiradas antes de validar disponibilidad
    await this.librarExpiradas();

    const area = await this.prisma.aREAS_SOCIALES.findUnique({
      where: { id: dto.area_id },
      include: { horarios: true },
    });
    if (!area) throw new NotFoundException('Área social no encontrada');
    if (!area.activa)
      throw new BadRequestException('Esta área social no está disponible');

    const inicio = new Date(`2000-01-01T${dto.hora_inicio}:00`);
    const fin = new Date(`2000-01-01T${dto.hora_fin}:00`);
    const diffHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    // Duración según la configuración del área
    if (
      diffHoras < area.duracion_min_horas ||
      diffHoras > area.duracion_max_horas
    ) {
      throw new BadRequestException(
        `La reserva de "${area.nombre}" debe ser de ${area.duracion_min_horas} a ${area.duracion_max_horas} horas`,
      );
    }

    // Franja horaria y días permitidos
    const horario = area.horarios[0];
    if (!horario)
      throw new BadRequestException(
        'Esta área no tiene un horario configurado',
      );

    const aperturaH = horario.hora_inicio.getUTCHours();
    const cierreH = horario.hora_fin.getUTCHours();
    const horaInicioNum = parseInt(dto.hora_inicio.split(':')[0]);
    const horaFinNum = parseInt(dto.hora_fin.split(':')[0]);

    if (horaInicioNum < aperturaH || horaFinNum > cierreH) {
      throw new BadRequestException(
        `El horario de "${area.nombre}" es de ${aperturaH.toString().padStart(2, '0')}:00 a ${cierreH.toString().padStart(2, '0')}:00`,
      );
    }

    const fechaReserva = new Date(`${dto.fecha_reserva}T00:00:00Z`);

    if (horario.dias_disponibles) {
      const diaSemana =
        fechaReserva.getUTCDay() === 0 ? 7 : fechaReserva.getUTCDay();
      const permitidos = horario.dias_disponibles
        .split(',')
        .map((d) => parseInt(d.trim()));
      if (!permitidos.includes(diaSemana)) {
        throw new BadRequestException(
          `"${area.nombre}" no está disponible el día seleccionado`,
        );
      }
    }

    // Anticipación mínima
    const ahoraEc = ahoraEcuadorLiteral();
    const hoyUtc = new Date(
      Date.UTC(
        ahoraEc.getUTCFullYear(),
        ahoraEc.getUTCMonth(),
        ahoraEc.getUTCDate(),
      ),
    );
    const diasDif = Math.round(
      (fechaReserva.getTime() - hoyUtc.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diasDif < area.anticipacion_min_dias) {
      throw new BadRequestException(
        `Debes reservar con al menos ${area.anticipacion_min_dias} día(s) de anticipación`,
      );
    }

    // Limpiar reservas expiradas o canceladas en el mismo slot (liberan la unicidad)
    const slotOcupadoInactivo = await this.prisma.rESERVAS.findFirst({
      where: {
        area_id: dto.area_id,
        fecha_reserva: new Date(`${dto.fecha_reserva}T00:00:00Z`),
        hora_inicio: this.horaAUtc(dto.hora_inicio),
        estado: { in: ['expirada', 'cancelada', 'denegada'] },
      },
      include: { pagos: true },
    });

    if (slotOcupadoInactivo) {
      // Solo se elimina si no tiene pagos asociados (una expirada nunca pagó)
      if (slotOcupadoInactivo.pagos.length === 0) {
        await this.prisma.rESERVAS.delete({
          where: { id: slotOcupadoInactivo.id },
        });
      } else {
        // Si tuviera pagos, mover el registro fuera del slot único (raro)
        await this.prisma.rESERVAS.update({
          where: { id: slotOcupadoInactivo.id },
          data: { fecha_reserva: new Date('1900-01-01T00:00:00Z') },
        });
      }
    }

    // Verificar si ya existe una reserva activa en esa área, fecha y hora.
    // pendiente_pago también ocupa el slot (bloqueo de 10 min).
    const yaReservada = await this.prisma.rESERVAS.findFirst({
      where: {
        area_id: dto.area_id,
        fecha_reserva: new Date(`${dto.fecha_reserva}T00:00:00Z`),
        hora_inicio: this.horaAUtc(dto.hora_inicio),
        estado: { in: ['pendiente', 'pendiente_pago', 'confirmada'] },
      },
    });

    if (yaReservada) {
      throw new ConflictException(
        'Ya existe una reserva para esta área en la fecha y hora seleccionadas',
      );
    }

    const esPago = Number(area.tarifa_reserva) > 0;

    const bloqueo_hasta = ahoraEcuadorLiteral();
    bloqueo_hasta.setMinutes(bloqueo_hasta.getMinutes() + 10);

    try {
      const reserva = await this.prisma.rESERVAS.create({
        data: {
          residente_id: dto.residente_id,
          area_id: dto.area_id,
          fecha_reserva: new Date(`${dto.fecha_reserva}T00:00:00Z`),
          hora_inicio: this.horaAUtc(dto.hora_inicio),
          hora_fin: this.horaAUtc(dto.hora_fin),
          // Salón: pendiente_pago (con bloqueo). Canchas: pendiente directo.
          estado: esPago ? 'pendiente_pago' : 'pendiente',
          bloqueo_temporal: esPago,
          bloqueo_hasta: esPago ? bloqueo_hasta : null,
          created_at: ahoraEcuadorLiteral(),
        },
      });

      // Solo las canchas (gratis) notifican al admin al crearse.
      // El salón notifica cuando sube el comprobante (marcarPagada).
      if (!esPago) {
        await this.notificarAdmins(
          'reserva',
          'Nueva reserva por revisar',
          `Un residente reservó el área "${area.nombre}" y requiere tu validación.`,
        );
      }

      return reserva;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una reserva para esta área en la fecha y hora seleccionadas',
        );
      }
      throw e;
    }
  }

  // Marca una reserva de salón como pagada: pendiente_pago -> pendiente.
  // Se llama desde el flujo de pago tras subir el comprobante.
  async marcarPagada(id: string) {
    const reserva = await this.prisma.rESERVAS.findUnique({
      where: { id },
      include: { area: true },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    // Si el bloqueo expiró, no se puede pagar
    if (
      reserva.bloqueo_hasta &&
      ahoraEcuadorLiteral() > reserva.bloqueo_hasta
    ) {
      await this.prisma.rESERVAS.update({
        where: { id },
        data: { estado: 'expirada', bloqueo_temporal: false },
      });
      throw new BadRequestException(
        'El tiempo para completar el pago expiró. La reserva fue liberada.',
      );
    }

    if (reserva.estado !== 'pendiente_pago') {
      // Ya fue pagada o está en otro estado; no repetir
      return reserva;
    }

    const actualizada = await this.prisma.rESERVAS.update({
      where: { id },
      data: {
        estado: 'pendiente',
        bloqueo_temporal: false,
        bloqueo_hasta: null,
      },
    });

    // Ahora sí notificar al admin (ya pagó y espera aprobación)
    await this.notificarAdmins(
      'reserva',
      'Nueva reserva por revisar',
      `Un residente reservó y pagó el área "${reserva.area?.nombre ?? 'social'}" y requiere tu validación.`,
    );

    return actualizada;
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
      console.error('Error notificando a admins:', e);
    }
  }

  async cancelar(id: string, residente_id: string) {
    const reserva = await this.prisma.rESERVAS.findUnique({
      where: { id },
      include: { pagos: true },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    if (reserva.pagos.length > 0)
      throw new BadRequestException(
        'No se puede cancelar una reserva que ya fue pagada. Contacta al administrador.',
      );

    if (reserva.residente_id !== residente_id)
      throw new BadRequestException(
        'No tienes permiso para cancelar esta reserva',
      );

    if (reserva.estado === 'cancelada')
      throw new BadRequestException('La reserva ya está cancelada');

    if (reserva.estado === 'completada')
      throw new BadRequestException(
        'No se puede cancelar una reserva completada',
      );

    // Plazo máximo de cancelación (solo aplica a reservas ya confirmadas)
    const area =
      reserva.estado === 'confirmada'
        ? await this.prisma.aREAS_SOCIALES.findUnique({
            where: { id: reserva.area_id },
          })
        : null;
    if (area) {
      const inicioReserva = new Date(
        Date.UTC(
          reserva.fecha_reserva.getUTCFullYear(),
          reserva.fecha_reserva.getUTCMonth(),
          reserva.fecha_reserva.getUTCDate(),
          reserva.hora_inicio.getUTCHours(),
          reserva.hora_inicio.getUTCMinutes(),
        ),
      );
      const horasRestantes =
        (inicioReserva.getTime() - ahoraEcuadorLiteral().getTime()) /
        (1000 * 60 * 60);
      if (horasRestantes < area.cancelacion_max_horas) {
        throw new BadRequestException(
          `Solo puedes cancelar hasta ${area.cancelacion_max_horas} horas antes del inicio de la reserva`,
        );
      }
    }

    return this.prisma.rESERVAS.update({
      where: { id },
      data: {
        estado: 'cancelada',
        bloqueo_temporal: false,
        bloqueo_hasta: null,
      },
    });
  }

  async listarPorResidente(residente_id: string) {
    await this.librarExpiradas();
    return this.prisma.rESERVAS.findMany({
      where: { residente_id },
      include: {
        area: true,
        pagos: {
          orderBy: { fecha_envio: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listarTodas() {
    await this.librarExpiradas();
    return this.prisma.rESERVAS.findMany({
      // El admin solo ve reservas que ya requieren su gestión.
      // Las pendiente_pago (aún sin pagar) y expiradas no le aparecen.
      where: {
        estado: { in: ['pendiente', 'confirmada', 'denegada'] },
      },
      include: {
        area: true,
        residente: {
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
        pagos: {
          orderBy: { fecha_envio: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listarValidadas(q?: string) {
    const busqueda = q?.trim();

    return this.prisma.rESERVAS.findMany({
      where: {
        estado: { in: ['confirmada', 'denegada', 'completada'] },
        validado_por: { not: null },
        ...(busqueda && {
          residente: {
            usuario: {
              OR: [
                { cedula: { contains: busqueda, mode: 'insensitive' } },
                { nombres: { contains: busqueda, mode: 'insensitive' } },
                { apellidos: { contains: busqueda, mode: 'insensitive' } },
              ],
            },
          },
        }),
      },
      include: {
        area: true,
        residente: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, cedula: true },
            },
          },
        },
        administrador: {
          include: {
            usuario: { select: { id: true, nombres: true, apellidos: true } },
          },
        },
        pagos: {
          orderBy: { fecha_envio: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async validar(id: string, dto: ValidarReservaDto) {
    const reserva = await this.prisma.rESERVAS.findUnique({
      where: { id },
      include: {
        area: true,
        residente: {
          include: { usuario: true },
        },
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const reservaActualizada = await this.prisma.rESERVAS.update({
      where: { id },
      data: {
        estado: dto.estado,
        observacion_admin: dto.observacion_admin,
        validado_por: dto.validado_por,
        bloqueo_temporal: false,
        bloqueo_hasta: null,
      },
    });

    // Notificar al residente sobre el resultado de su reserva
    try {
      const usuario = reserva.residente?.usuario;
      if (usuario) {
        const aprobada = dto.estado === 'confirmada';
        const titulo = aprobada ? 'Reserva confirmada' : 'Reserva denegada';
        const nombreArea = reserva.area?.nombre ?? 'el área social';

        let mensaje: string;
        if (aprobada) {
          mensaje = `Tu reserva de "${nombreArea}" ha sido confirmada.`;
        } else {
          mensaje = dto.observacion_admin
            ? `Tu reserva de "${nombreArea}" ha sido denegada. Motivo: ${dto.observacion_admin}`
            : `Tu reserva de "${nombreArea}" ha sido denegada.`;
        }

        await this.notificaciones.crear(
          usuario.id,
          'reserva',
          titulo,
          mensaje,
          usuario.fcm_token ?? undefined,
        );
      }
    } catch (e) {
      console.error('Error notificando al residente:', e);
    }

    return reservaActualizada;
  }

  // Libera las reservas de salón cuyo bloqueo de 10 min ya venció sin pago.
  async librarExpiradas() {
    const ahora = ahoraEcuadorLiteral();
    return this.prisma.rESERVAS.updateMany({
      where: {
        bloqueo_temporal: true,
        bloqueo_hasta: { lt: ahora },
        estado: 'pendiente_pago',
      },
      data: {
        estado: 'expirada',
        bloqueo_temporal: false,
      },
    });
  }

  // Marca como completadas las reservas confirmadas cuya hora de fin ya pasó
  async completarPasadas() {
    const ahora = ahoraEcuadorLiteral();
    const hoy = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
    );

    const candidatas = await this.prisma.rESERVAS.findMany({
      where: { estado: 'confirmada', fecha_reserva: { lte: hoy } },
      select: { id: true, fecha_reserva: true, hora_fin: true },
    });

    const vencidas = candidatas.filter((r) => {
      const fin = new Date(
        Date.UTC(
          r.fecha_reserva.getUTCFullYear(),
          r.fecha_reserva.getUTCMonth(),
          r.fecha_reserva.getUTCDate(),
          r.hora_fin.getUTCHours(),
          r.hora_fin.getUTCMinutes(),
        ),
      );
      return fin < ahora;
    });

    if (vencidas.length === 0) return { count: 0 };

    return this.prisma.rESERVAS.updateMany({
      where: { id: { in: vencidas.map((r) => r.id) } },
      data: { estado: 'completada' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async completarReservasCron() {
    const resultado = await this.completarPasadas();
    if (resultado.count > 0) {
      console.log(
        `[Cron] ${resultado.count} reserva(s) marcada(s) como completada(s).`,
      );
    }
  }

  // Cron: libera automáticamente las reservas de salón cuyo bloqueo venció
  @Cron(CronExpression.EVERY_MINUTE)
  async liberarReservasVencidasCron() {
    const resultado = await this.librarExpiradas();
    await this.completarPasadas();
    if (resultado.count > 0) {
      console.log(
        `[Cron] Se liberaron ${resultado.count} reserva(s) vencida(s).`,
      );
    }
  }
}
