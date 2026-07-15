import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class DocumentosService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async crear(dto: CrearDocumentoDto) {
    // Buscar la versión activa actual de este tipo
    const documentoExistente = await this.prisma.dOCUMENTOS.findFirst({
      where: { tipo: dto.tipo, activo: true },
    });

    // Calcular la nueva versión (1.0, 2.0, 3.0...)
    let nuevaVersion = '1.0';
    if (documentoExistente) {
      const versionActual = documentoExistente.version ?? '1.0';
      // Tomar solo la parte entera antes del punto
      const numero = parseInt(versionActual.split('.')[0]) || 1;
      nuevaVersion = `${numero + 1}.0`;

      // Desactivar la versión anterior (queda en el historial)
      await this.prisma.dOCUMENTOS.update({
        where: { id: documentoExistente.id },
        data: { activo: false },
      });
    }

    // Crear la nueva versión activa
    const nuevoDocumento = await this.prisma.dOCUMENTOS.create({
      data: {
        titulo: dto.titulo,
        tipo: dto.tipo,
        archivo_url: dto.archivo_url,
        version: nuevaVersion,
        visible_para: dto.visible_para,
        subido_por: dto.subido_por,
        activo: true,
        created_at: ahoraEcuadorLiteral(),
      },
    });

    // Notificar a todos los residentes aprobados sobre el cambio
    await this.notificarResidentes(dto.titulo, !!documentoExistente);

    return nuevoDocumento;
  }

  private async notificarResidentes(
    tituloDoc: string,
    esActualizacion: boolean,
  ) {
    try {
      const residentes = await this.prisma.uSUARIOS.findMany({
        where: { rol: 'residente', estado: 'aprobado' },
        select: { id: true, fcm_token: true },
      });

      const titulo = esActualizacion
        ? 'Documento actualizado'
        : 'Nuevo documento disponible';
      const mensaje = esActualizacion
        ? `Se actualizó "${tituloDoc}". Revisa la nueva versión en Documentos y Reglamentos.`
        : `Ya está disponible "${tituloDoc}" en Documentos y Reglamentos.`;

      for (const residente of residentes) {
        await this.notificaciones.crear(
          residente.id,
          'documento',
          titulo,
          mensaje,
          residente.fcm_token ?? undefined,
        );
      }
    } catch (e) {
      console.error('Error notificando a residentes:', e);
    }
  }

  async buscarPublicoPorTipo(tipo: string) {
    // Solo permite documentos legales de forma pública
    const tiposPermitidos = ['terminos_condiciones', 'politica_privacidad'];
    if (!tiposPermitidos.includes(tipo)) {
      throw new NotFoundException('Documento no disponible');
    }
    const documento = await this.prisma.dOCUMENTOS.findFirst({
      where: { tipo, activo: true },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado');
    return documento;
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
