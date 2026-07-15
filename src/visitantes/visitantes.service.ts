import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearVisitanteDto } from './dto/crear-visitante.dto';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class VisitantesService {
  constructor(private prisma: PrismaService) {}

  private validarCedula(cedula: string): void {
    if (!/^\d{10}$/.test(cedula)) {
      throw new BadRequestException(
        'La cedula debe tener exactamente 10 digitos numericos',
      );
    }

    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) {
      throw new BadRequestException('La cedula no es valida');
    }

    const digitoVerificador = parseInt(cedula[9]);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula[i]) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }

    const residuo = suma % 10;
    const digitoCalculado = residuo === 0 ? 0 : 10 - residuo;

    if (digitoCalculado !== digitoVerificador) {
      throw new BadRequestException('La cedula del visitante no es valida');
    }
  }

  async crear(dto: CrearVisitanteDto) {
    this.validarCedula(dto.cedula_visitante);
    return this.prisma.vISITANTES.create({
      data: {
        residente_id: dto.residente_id,
        nombre_visitante: dto.nombre_visitante,
        cedula_visitante: dto.cedula_visitante,
        fecha_visita: new Date(
          dto.fecha_visita.substring(0, 10) + 'T00:00:00Z',
        ),
        hora_estimada_ingreso: new Date(
          `2000-01-01T${dto.hora_estimada_ingreso}:00Z`,
        ),
        guardado: dto.guardado ?? false,
        created_at: ahoraEcuadorLiteral(),
      },
    });
  }

  async listarPorResidente(residente_id: string) {
    return this.prisma.vISITANTES.findMany({
      where: { residente_id, guardado: true },
      include: { codigos_qr: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async eliminarGuardado(id: string) {
    const visitante = await this.prisma.vISITANTES.findUnique({
      where: { id },
    });
    if (!visitante) throw new NotFoundException('Visitante no encontrado');
    // Solo desmarca como guardado (no borra el registro por historial de QR)
    return this.prisma.vISITANTES.update({
      where: { id },
      data: { guardado: false },
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
