import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearDocumentoDto) {
    const documentoExistente = await this.prisma.dOCUMENTOS.findFirst({
      where: { tipo: dto.tipo, activo: true },
    });

    if (documentoExistente) {
      await this.prisma.dOCUMENTOS.update({
        where: { id: documentoExistente.id },
        data: { activo: false },
      });
    }

    return this.prisma.dOCUMENTOS.create({
      data: {
        titulo: dto.titulo,
        tipo: dto.tipo,
        archivo_url: dto.archivo_url,
        version: dto.version,
        visible_para: dto.visible_para,
        subido_por: dto.subido_por,
        activo: true,
      },
    });
  }

  async listarTodos() {
    return this.prisma.dOCUMENTOS.findMany({
      where: { activo: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async listarParaResidente() {
    return this.prisma.dOCUMENTOS.findMany({
      where: {
        activo: true,
        visible_para: { in: ['todos', 'residente'] },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async buscarPorTipo(tipo: string) {
    const documento = await this.prisma.dOCUMENTOS.findFirst({
      where: { tipo, activo: true },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado');
    return documento;
  }

  async listarTerminosYPrivacidad() {
    return this.prisma.dOCUMENTOS.findMany({
      where: {
        activo: true,
        tipo: { in: ['terminos_condiciones', 'politica_privacidad'] },
      },
    });
  }

  async desactivar(id: string) {
    const documento = await this.prisma.dOCUMENTOS.findUnique({
      where: { id },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado');
    return this.prisma.dOCUMENTOS.update({
      where: { id },
      data: { activo: false },
    });
  }
}
