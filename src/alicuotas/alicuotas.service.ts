import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearAlicuotaDto } from './dto/crear-alicuota.dto';

@Injectable()
export class AlicuotasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearAlicuotaDto) {
    return this.prisma.aLICUOTAS.create({
      data: {
        residente_id: dto.residente_id,
        mes: dto.mes,
        anio: dto.anio,
        monto: dto.monto,
        fecha_vencimiento: new Date(dto.fecha_vencimiento),
        estado: 'pendiente',
      },
    });
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.aLICUOTAS.findMany({
      where: { residente_id },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
  }

  async listarTodas() {
    return this.prisma.aLICUOTAS.findMany({
      include: {
        residente: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true },
            },
          },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
  }

  async actualizarEstado(id: string, estado: string) {
    const alicuota = await this.prisma.aLICUOTAS.findUnique({ where: { id } });
    if (!alicuota) throw new NotFoundException('Alícuota no encontrada');
    return this.prisma.aLICUOTAS.update({
      where: { id },
      data: { estado },
    });
  }
}
