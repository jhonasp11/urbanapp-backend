import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearVisitanteDto } from './dto/crear-visitante.dto';

@Injectable()
export class VisitantesService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearVisitanteDto) {
    return this.prisma.vISITANTES.create({
      data: {
        residente_id: dto.residente_id,
        nombre_visitante: dto.nombre_visitante,
        cedula_visitante: dto.cedula_visitante,
        placa_vehiculo: dto.placa_vehiculo,
        fecha_visita: new Date(dto.fecha_visita),
        hora_estimada_ingreso: new Date(
          `2026-01-01T${dto.hora_estimada_ingreso}:00Z`,
        ),
        observacion: dto.observacion,
      },
    });
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.vISITANTES.findMany({
      where: { residente_id },
      include: { codigos_qr: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async buscarPorId(id: string) {
    const visitante = await this.prisma.vISITANTES.findUnique({
      where: { id },
      include: { codigos_qr: true },
    });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');
    return visitante;
  }
}
