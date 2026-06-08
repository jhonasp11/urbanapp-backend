import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearAreaDto } from './dto/crear-area.dto';

@Injectable()
export class AreasSocialesService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearAreaDto) {
    return this.prisma.aREAS_SOCIALES.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        imagen_url: dto.imagen_url,
        capacidad_max: dto.capacidad_max,
        tarifa_reserva: dto.tarifa_reserva,
        anticipacion_min_dias: dto.anticipacion_min_dias ?? 1,
        cancelacion_max_horas: dto.cancelacion_max_horas ?? 24,
        activa: true,
      },
    });
  }

  async listarTodas() {
    return this.prisma.aREAS_SOCIALES.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const area = await this.prisma.aREAS_SOCIALES.findUnique({
      where: { id },
      include: { horarios: true },
    });
    if (!area) throw new NotFoundException('Área social no encontrada');
    return area;
  }

  async actualizar(id: string, dto: Partial<CrearAreaDto>) {
    const area = await this.prisma.aREAS_SOCIALES.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('Área social no encontrada');
    return this.prisma.aREAS_SOCIALES.update({
      where: { id },
      data: dto,
    });
  }
}
