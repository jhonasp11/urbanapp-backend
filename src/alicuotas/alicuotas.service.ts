import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearAlicuotaDto } from './dto/crear-alicuota.dto';
import { Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';
/**
 * Servicio encargado de gestionar la lógica de negocio relacionada con las alícuotas
 * dentro del sistema de administración de la urbanización.
 * Interactúa con la base de datos a través de Prisma ORM.
 */
@Injectable()
export class AlicuotasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera el registro de una nueva alícuota para un residente específico.
   * Por defecto, toda nueva alícuota se inicializa con el estado 'pendiente'.
   * * @param dto -Contiene los detalles de la alícuota (mes, año, monto, etc.).
   */

  async crear(dto: CrearAlicuotaDto) {
    return this.prisma.aLICUOTAS.create({
      data: {
        residente_id: dto.residente_id,
        mes: dto.mes,
        anio: dto.anio,
        monto: dto.monto,
        fecha_vencimiento: new Date(dto.fecha_vencimiento + 'T00:00:00Z'),
        estado: 'pendiente',
        created_at: ahoraEcuadorLiteral(),
      },
    });
  }

  /**
   * Obtiene el historial de alícuotas asociado a un residente en particular.
   * Los resultados se devuelven ordenados cronológicamente de forma descendente (más recientes primero).
   * * @param residente_id - El identificador único del residente.
   */

  async listarPorResidente(residente_id: string) {
    return this.prisma.aLICUOTAS.findMany({
      where: { residente_id },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
  }

  /**
   * Obtiene el registro completo de todas las alícuotas generadas en el sistema.
   * Realiza un "join" (include) con la tabla de residentes y usuarios para poblar
   * los nombres y apellidos de la persona responsable del pago.
   */

  async listarTodas() {
    return this.prisma.aLICUOTAS.findMany({
      include: {
        residente: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true }, // Se seleccionan únicamente los campos necesarios para optimizar la carga útil (payload)
            },
          },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });
  }

  /**
   * Actualiza el estado de una alícuota específica (por ejemplo, de 'pendiente' a 'pagada').
   * * @param id - El identificador único de la alícuota a modificar.
   * @param estado - El nuevo estado que se le asignará al registro.
   * @throws {NotFoundException} Si no existe ninguna alícuota en la base de datos con el ID proporcionado.
   */

  async actualizarEstado(id: string, estado: string) {
    const alicuota = await this.prisma.aLICUOTAS.findUnique({ where: { id } }); // Verificación de existencia previa para manejar el error de forma controlada
    if (!alicuota) throw new NotFoundException('Alícuota no encontrada');
    return this.prisma.aLICUOTAS.update({
      where: { id },
      data: { estado },
    });
  }

  async crearMasivo(
    mes: number,
    anio: number,
    monto: number,
    fecha_vencimiento: string,
  ) {
    // Obtener todos los residentes aprobados
    const residentes = await this.prisma.uSUARIOS.findMany({
      where: { rol: 'residente', estado: 'aprobado' },
      include: { residente: true },
    });

    const resultados = [];
    const errores = [];
    const creadosNombres: string[] = [];
    const omitidosNombres: string[] = [];

    for (const usuario of residentes) {
      if (!usuario.residente) continue;

      // Verificar si ya existe alícuota para ese mes/año/residente
      const existente = await this.prisma.aLICUOTAS.findFirst({
        where: {
          residente_id: usuario.residente.id,
          mes,
          anio,
        },
      });

      if (existente) {
        const nombre = `${usuario.nombres} ${usuario.apellidos}`;
        errores.push(`${nombre} ya tiene alícuota para ${mes}/${anio}`);
        omitidosNombres.push(nombre);
        continue;
      }

      const alicuota = await this.prisma.aLICUOTAS.create({
        data: {
          residente_id: usuario.residente.id,
          mes,
          anio,
          monto,
          fecha_vencimiento: new Date(fecha_vencimiento + 'T00:00:00Z'),
          estado: 'pendiente',
          created_at: ahoraEcuadorLiteral(),
        },
      });
      resultados.push(alicuota);
      creadosNombres.push(`${usuario.nombres} ${usuario.apellidos}`);
    }

    return {
      creadas: resultados.length,
      omitidas: errores.length,
      errores,
      creados_nombres: creadosNombres,
      omitidos_nombres: omitidosNombres,
      mensaje: `Se crearon ${resultados.length} alícuotas correctamente.${errores.length > 0 ? ` ${errores.length} omitidas por duplicado.` : ''}`,
    };
  }
  // ===== HELPERS DE DISEÑO PDF =====
  private readonly azul = '#185FA5';
  private readonly grisTexto = '#333333';
  private readonly grisSuave = '#F2F5F9';

  private pdfEncabezado(doc: any, titulo: string, subtitulo?: string) {
    doc.rect(0, 0, doc.page.width, 90).fill(this.azul);
    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('UrbanApp', 50, 28);
    doc.fontSize(13).font('Helvetica').text(titulo, 50, 56);
    doc
      .fontSize(9)
      .fillColor('#D6E4F0')
      .text(
        `Generado: ${new Date().toLocaleDateString('es-EC')}${subtitulo ? '  ·  ' + subtitulo : ''}`,
        50,
        74,
      );
    doc.fillColor(this.grisTexto).font('Helvetica');
    doc.y = 110;
  }

  private pdfTarjetas(
    doc: any,
    items: { label: string; valor: string; color?: string }[],
  ) {
    const startX = 50;
    const anchoTotal = doc.page.width - 100;
    const gap = 12;
    const ancho = (anchoTotal - gap) / 2;
    const alto = 54;
    let x = startX;
    let y = doc.y;
    items.forEach((it, i) => {
      if (i % 2 === 0) x = startX;
      else x = startX + ancho + gap;
      doc.roundedRect(x, y, ancho, alto, 6).fill(this.grisSuave);
      doc
        .fillColor('#777777')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(it.label.toUpperCase(), x + 12, y + 10, { width: ancho - 24 });
      doc
        .fillColor(it.color || this.azul)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(it.valor, x + 12, y + 24, { width: ancho - 24 });
      if (i % 2 === 1) y += alto + gap;
    });
    if (items.length % 2 === 1) y += alto + gap;
    doc.y = y + 6;
    doc.fillColor(this.grisTexto).font('Helvetica');
  }

  private pdfSeccion(doc: any, texto: string) {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc
      .fillColor(this.azul)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(texto, 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(doc.page.width - 50, doc.y + 2)
      .strokeColor(this.azul)
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(0.6);
    doc.fillColor(this.grisTexto).font('Helvetica');
  }

  private pdfTabla(
    doc: any,
    columnas: { titulo: string; ancho: number }[],
    filas: string[][],
  ) {
    const startX = 50;
    let y = doc.y;
    const altoFila = 20;
    const dibujarEncabezado = () => {
      let x = startX;
      doc.rect(startX, y, doc.page.width - 100, altoFila).fill(this.azul);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      columnas.forEach((col) => {
        doc.text(col.titulo, x + 5, y + 6, { width: col.ancho - 8 });
        x += col.ancho;
      });
      y += altoFila;
      doc.fillColor(this.grisTexto).font('Helvetica');
    };
    dibujarEncabezado();
    filas.forEach((fila, idx) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
        dibujarEncabezado();
      }
      if (idx % 2 === 0) {
        doc
          .rect(startX, y, doc.page.width - 100, altoFila)
          .fill(this.grisSuave);
      }
      let x = startX;
      doc.fontSize(8).font('Helvetica');
      fila.forEach((celda, i) => {
        doc.fillColor(this.grisTexto).text(celda, x + 5, y + 6, {
          width: columnas[i].ancho - 8,
          ellipsis: true,
        });
        x += columnas[i].ancho;
      });
      y += altoFila;
    });
    doc.y = y + 10;
  }

  // ===== ESTADO DE CUENTA =====
  async generarEstadoCuenta(
    residente_id: string,
    anio: number | undefined,
    formato: string,
    res: Response,
  ) {
    const where: any = { residente_id };
    if (anio) where.anio = anio;

    const alicuotas = await this.prisma.aLICUOTAS.findMany({
      where,
      include: { residente: { include: { usuario: true } } },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });

    const pagadas = alicuotas.filter((a) => a.estado === 'pagado');
    const pendientes = alicuotas.filter((a) => a.estado === 'pendiente');
    const totalPagado = pagadas.reduce((s, a) => s + Number(a.monto), 0);
    const totalPendiente = pendientes.reduce((s, a) => s + Number(a.monto), 0);

    if (formato === 'json') {
      return res.json({
        total: alicuotas.length,
        pagadas: pagadas.length,
        pendientes: pendientes.length,
        total_pagado: totalPagado,
        total_pendiente: totalPendiente,
        alicuotas: alicuotas.map((a) => ({
          mes: a.mes,
          anio: a.anio,
          monto: Number(a.monto),
          estado: a.estado,
          fecha_vencimiento: a.fecha_vencimiento,
        })),
      });
    }

    // PDF
    const nombresMes = [
      '',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const residente = alicuotas[0]?.residente;
    const nombre = residente
      ? `${residente.usuario.nombres} ${residente.usuario.apellidos}`
      : 'Residente';
    const mzVilla = residente
      ? `Mz ${residente.manzana} · Villa ${residente.villa}`
      : '';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=estado_cuenta_${anio ?? 'todos'}.pdf`,
    );
    doc.pipe(res);

    this.pdfEncabezado(
      doc,
      'Estado de Cuenta de Alícuotas',
      anio ? `Año: ${anio}` : 'Todos los años',
    );

    // Datos del residente
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.grisTexto)
      .text(nombre, 50, doc.y);
    doc.fontSize(9).font('Helvetica').fillColor('#777777').text(mzVilla);
    doc.moveDown(0.8);

    // Resumen
    this.pdfTarjetas(doc, [
      {
        label: 'Alícuotas pagadas',
        valor: `${pagadas.length}`,
        color: '#2E9E5B',
      },
      {
        label: 'Alícuotas pendientes',
        valor: `${pendientes.length}`,
        color: '#E8830C',
      },
      {
        label: 'Total pagado',
        valor: `$${totalPagado.toFixed(2)}`,
        color: '#2E9E5B',
      },
      {
        label: 'Total pendiente',
        valor: `$${totalPendiente.toFixed(2)}`,
        color: '#E8830C',
      },
    ]);

    doc.moveDown(0.5);

    // Tabla de alícuotas
    this.pdfSeccion(doc, `Detalle de Alícuotas (${alicuotas.length})`);
    if (alicuotas.length === 0) {
      doc
        .fontSize(9)
        .fillColor('#777777')
        .text('No hay alícuotas registradas para este período.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 30 },
          { titulo: 'Período', ancho: 160 },
          { titulo: 'Vencimiento', ancho: 130 },
          { titulo: 'Monto', ancho: 95 },
          { titulo: 'Estado', ancho: 80 },
        ],
        alicuotas.map((a, i) => [
          `${i + 1}`,
          `${nombresMes[a.mes]} ${a.anio}`,
          `${a.fecha_vencimiento ? new Date(a.fecha_vencimiento).toISOString().substring(0, 10).split('-').reverse().join('/') : '-'}`,
          `$${Number(a.monto).toFixed(2)}`,
          a.estado === 'pagado' ? 'Pagado' : 'Pendiente',
        ]),
      );
    }

    doc.end();
  }
}
