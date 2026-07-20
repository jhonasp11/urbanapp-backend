import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearManzanaDto } from './dto/crear-manzana.dto';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class ManzanasService {
  constructor(private prisma: PrismaService) {}

  // Crea una manzana y genera sus villas (1..N) automáticamente
  async crear(dto: CrearManzanaDto) {
    if (!dto.numero || dto.numero < 1) {
      throw new BadRequestException('El número de manzana no es válido');
    }
    if (!dto.cantidad_villas || dto.cantidad_villas < 1) {
      throw new BadRequestException(
        'La cantidad de villas debe ser al menos 1',
      );
    }

    // Verificar que no exista ya esa manzana
    const existente = await this.prisma.mANZANAS.findUnique({
      where: { numero: dto.numero },
    });
    if (existente) {
      throw new BadRequestException(`La manzana ${dto.numero} ya existe`);
    }

    // Crear la manzana
    const manzana = await this.prisma.mANZANAS.create({
      data: {
        numero: dto.numero,
        cantidad_villas: dto.cantidad_villas,
        creado_por: dto.creado_por,
        created_at: ahoraEcuadorLiteral(),
      },
    });

    // Generar las villas 1..N
    const villasData = [];
    for (let i = 1; i <= dto.cantidad_villas; i++) {
      villasData.push({
        manzana_id: manzana.id,
        numero: i,
        created_at: ahoraEcuadorLiteral(),
      });
    }
    await this.prisma.vILLAS.createMany({ data: villasData });

    return {
      mensaje: `Manzana ${dto.numero} creada con ${dto.cantidad_villas} villas`,
      manzana,
    };
  }

  // Lista todas las manzanas con su cantidad de villas
  async listar() {
    return this.prisma.mANZANAS.findMany({
      where: { activa: true },
      orderBy: { numero: 'asc' },
      include: {
        _count: { select: { villas: true } },
      },
    });
  }

  // Obtiene una manzana con todas sus villas
  async obtenerConVillas(id: string) {
    const manzana = await this.prisma.mANZANAS.findUnique({
      where: { id },
      include: {
        villas: { orderBy: { numero: 'asc' } },
      },
    });
    if (!manzana) throw new NotFoundException('Manzana no encontrada');
    return manzana;
  }

  // Detalle de villas de una manzana con sus residentes (padrón cruzado con usuarios)
  async detalleVillasConResidentes(numeroManzana: number) {
    const manzana = await this.prisma.mANZANAS.findUnique({
      where: { numero: numeroManzana },
      include: { villas: { orderBy: { numero: 'asc' } } },
    });
    if (!manzana) throw new NotFoundException('Manzana no encontrada');

    // Padrón de esta manzana
    const padron = await this.prisma.rESIDENTES_REALES.findMany({
      where: { manzana: numeroManzana, activo: true },
    });

    // Usuarios residentes registrados (para saber quién tiene app + teléfono)
    const usuarios = await this.prisma.uSUARIOS.findMany({
      where: { rol: 'residente' },
      select: { cedula: true, telefono: true },
    });
    const mapaUsuarios = new Map(usuarios.map((u) => [u.cedula, u.telefono]));

    // Armar cada villa con sus residentes del padrón
    const villas = manzana.villas.map((v) => {
      const residentes = padron
        .filter((p) => p.villa === v.numero)
        .map((p) => ({
          nombres: p.nombres,
          cedula: p.cedula,
          telefono: mapaUsuarios.get(p.cedula) ?? null,
          tiene_app: mapaUsuarios.has(p.cedula),
        }));
      return { villa: v.numero, residentes };
    });

    return { manzana: numeroManzana, villas };
  }

  // Lista solo los números de manzanas activas (para selects del front)
  async listarNumeros() {
    const manzanas = await this.prisma.mANZANAS.findMany({
      where: { activa: true },
      orderBy: { numero: 'asc' },
      select: { numero: true },
    });
    return manzanas.map((m) => m.numero);
  }

  // Lista las villas de una manzana por su número (para selects del front)
  async listarVillasPorManzana(numeroManzana: number) {
    const manzana = await this.prisma.mANZANAS.findUnique({
      where: { numero: numeroManzana },
      include: { villas: { orderBy: { numero: 'asc' } } },
    });
    if (!manzana) throw new NotFoundException('Manzana no encontrada');
    return manzana.villas.map((v) => v.numero);
  }

  // Agrega más villas a una manzana existente
  async agregarVillas(id: string, cantidad: number) {
    if (!cantidad || cantidad < 1) {
      throw new BadRequestException('La cantidad debe ser al menos 1');
    }
    const manzana = await this.prisma.mANZANAS.findUnique({
      where: { id },
      include: { villas: { orderBy: { numero: 'desc' }, take: 1 } },
    });
    if (!manzana) throw new NotFoundException('Manzana no encontrada');

    // Continuar la numeración desde la última villa
    const ultimoNumero = manzana.villas[0]?.numero ?? 0;
    const villasData = [];
    for (let i = 1; i <= cantidad; i++) {
      villasData.push({
        manzana_id: manzana.id,
        numero: ultimoNumero + i,
        created_at: ahoraEcuadorLiteral(),
      });
    }
    await this.prisma.vILLAS.createMany({ data: villasData });

    // Actualizar el contador de la manzana
    await this.prisma.mANZANAS.update({
      where: { id },
      data: { cantidad_villas: manzana.cantidad_villas + cantidad },
    });

    return {
      mensaje: `Se agregaron ${cantidad} villas a la manzana ${manzana.numero}`,
    };
  }

  // Desactiva una manzana (no la borra por integridad histórica)
  async desactivar(id: string) {
    const manzana = await this.prisma.mANZANAS.findUnique({ where: { id } });
    if (!manzana) throw new NotFoundException('Manzana no encontrada');
    return this.prisma.mANZANAS.update({
      where: { id },
      data: { activa: false },
    });
  }
}
