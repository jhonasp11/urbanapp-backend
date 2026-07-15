/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

const PDFDocument = require('pdfkit');

@Injectable()
export class ReportesService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ===== HELPERS DE DISEÑO PDF =====
  private readonly azul = '#185FA5';
  private readonly grisTexto = '#333333';
  private readonly grisSuave = '#F2F5F9';
  private readonly grisBorde = '#DDDDDD';

  // Encabezado con banda de color
  private pdfEncabezado(doc: any, titulo: string, subtitulo?: string) {
    doc.rect(0, 0, doc.page.width, 90).fill(this.azul);
    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('UrbanApp', 50, 28);
    doc
      .fontSize(13)
      .font('Helvetica')
      .text(titulo, 50, 56);
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

  // Tarjetas de resumen (2 por fila)
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

  // Título de sección
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

  // Tabla con encabezado y filas zebra
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
        doc.rect(startX, y, doc.page.width - 100, altoFila).fill(this.grisSuave);
        doc.fillColor(this.grisTexto);
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

  async generarReportePagos(
    administrador_id: string,
    mes?: number,
    anio?: number,
    formato: string = 'json',
    res?: Response,
  ) {
    // Alícuotas del periodo (para calcular al día / en deuda / recaudado / pendiente)
    const whereAlic: any = {};
    if (mes) whereAlic.mes = mes;
    if (anio) whereAlic.anio = anio;

    const alicuotas = await this.prisma.aLICUOTAS.findMany({
      where: whereAlic,
      include: {
        residente: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, cedula: true },
            },
          },
        },
      },
    });

    const alicuotasPagadas = alicuotas.filter((a) => a.estado === 'pagado');
    const alicuotasPendientes = alicuotas.filter(
      (a) => a.estado === 'pendiente',
    );

    const totalRecaudado = alicuotasPagadas.reduce(
      (sum, a) => sum + Number(a.monto),
      0,
    );
    const totalPendiente = alicuotasPendientes.reduce(
      (sum, a) => sum + Number(a.monto),
      0,
    );

    const residentesConDeuda = new Set(
      alicuotasPendientes.map((a) => a.residente_id),
    );
    const residentesConAlic = new Set(alicuotas.map((a) => a.residente_id));
    const residentesAlDia = [...residentesConAlic].filter(
      (id) => !residentesConDeuda.has(id),
    ).length;
    const residentesEnDeuda = residentesConDeuda.size;

    let reporteId: string | null = null;
    try {
      if (administrador_id && formato === 'pdf') {
        const desde =
          mes && anio
            ? `${anio}-${mes.toString().padStart(2, '0')}-01`
            : null;
        const hasta =
          mes && anio
            ? `${anio}-${mes.toString().padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`
            : null;
        const reporteCreado = await this.prisma.rEPORTES.create({
          data: {
            administrador_id,
            tipo: 'pagos',
            mes: mes ?? null,
            anio: anio ?? null,
            fecha_desde: desde ? new Date(desde + 'T00:00:00Z') : null,
            fecha_hasta: hasta ? new Date(hasta + 'T00:00:00Z') : null,
            total_registros: alicuotas.length,
            created_at: ahoraEcuadorLiteral(),
          },
        });
        reporteId = reporteCreado.id;
      }
    } catch (_) {}

    if (formato === 'json') {
      return res.json({
        residentes_al_dia: residentesAlDia,
        residentes_en_deuda: residentesEnDeuda,
        alicuotas_recaudadas: alicuotasPagadas.length,
        recaudado: totalRecaudado.toFixed(2),
        alicuotas_pendientes: alicuotasPendientes.length,
        pendiente: totalPendiente.toFixed(2),
      });
    }

    // PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_pagos_${mes ?? 'todos'}_${anio ?? 'todos'}.pdf`,
    );

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.end(pdfBuffer);
      if (reporteId) {
        this.cloudinary
          .subirArchivo(pdfBuffer, 'urbanapp/reportes', true)
          .then((url) =>
            this.prisma.rEPORTES.update({
              where: { id: reporteId! },
              data: { archivo_pdf_url: url },
            }),
          )
          .catch((e) => console.error('Error subiendo reporte a Cloudinary:', e));
      }
    });

    this.pdfEncabezado(
      doc,
      'Reporte de Pagos de Alícuotas',
      mes && anio ? `Periodo: ${mes}/${anio}` : 'Todos los periodos',
    );

    this.pdfTarjetas(doc, [
      { label: 'Residentes al día', valor: `${residentesAlDia}`, color: '#2E9E5B' },
      { label: 'Residentes en deuda', valor: `${residentesEnDeuda}`, color: '#D64545' },
      {
        label: 'Alícuotas recaudadas',
        valor: `$${totalRecaudado.toFixed(2)}`,
        color: this.azul,
      },
      {
        label: 'Alícuotas pendientes',
        valor: `$${totalPendiente.toFixed(2)}`,
        color: '#E8830C',
      },
    ]);

    doc.moveDown(0.5);

    this.pdfSeccion(doc, `Alícuotas Recaudadas (${alicuotasPagadas.length})`);
    if (alicuotasPagadas.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Sin alícuotas recaudadas en este periodo.');
      doc.moveDown();
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 25 },
          { titulo: 'Residente', ancho: 170 },
          { titulo: 'Cédula', ancho: 90 },
          { titulo: 'Periodo', ancho: 90 },
          { titulo: 'Monto', ancho: 120 },
        ],
        alicuotasPagadas.map((a, i) => [
          `${i + 1}`,
          `${a.residente.usuario.nombres} ${a.residente.usuario.apellidos}`,
          `${a.residente.usuario.cedula}`,
          `${a.mes}/${a.anio}`,
          `$${Number(a.monto).toFixed(2)}`,
        ]),
      );
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.azul)
        .text(`Total recaudado: $${totalRecaudado.toFixed(2)}`, { align: 'right' });
      doc.font('Helvetica').fillColor(this.grisTexto);
      doc.moveDown();
    }

    this.pdfSeccion(doc, `Alícuotas Pendientes (${alicuotasPendientes.length})`);
    if (alicuotasPendientes.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Sin alícuotas pendientes en este periodo.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 25 },
          { titulo: 'Residente', ancho: 170 },
          { titulo: 'Cédula', ancho: 90 },
          { titulo: 'Periodo', ancho: 90 },
          { titulo: 'Monto', ancho: 120 },
        ],
        alicuotasPendientes.map((a, i) => [
          `${i + 1}`,
          `${a.residente.usuario.nombres} ${a.residente.usuario.apellidos}`,
          `${a.residente.usuario.cedula}`,
          `${a.mes}/${a.anio}`,
          `$${Number(a.monto).toFixed(2)}`,
        ]),
      );
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#E8830C')
        .text(`Total pendiente: $${totalPendiente.toFixed(2)}`, { align: 'right' });
      doc.font('Helvetica').fillColor(this.grisTexto);
    }

    doc.end();
  }

  async generarReporteAccesos(
    administrador_id: string,
    fecha_desde?: string,
    fecha_hasta?: string,
    formato: string = 'json',
    res?: Response,
  ) {
    const where: any = {};
    if (fecha_desde && fecha_hasta) {
      where.hora_ingreso = {
        gte: new Date(fecha_desde),
        lte: new Date(fecha_hasta),
      };
    }

    const ingresos = await this.prisma.iNGRESOS.findMany({
      where,
      include: {
        guardia: {
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
      },
      orderBy: { hora_ingreso: 'desc' },
    });

    const ingresosValidos = ingresos.filter((i) => i.estado === 'valido');
    const ingresosDenegados = ingresos.filter((i) => i.estado === 'denegado');
    const ingresosAutomaticos = ingresosValidos.filter(
      (i) => i.tipo_ingreso === 'automatico',
    );
    const ingresosManuales = ingresosValidos.filter(
      (i) => i.tipo_ingreso === 'manual',
    );
    // Todo vehículo autorizado ingresó (la placa es obligatoria)
    const totalVehiculos = ingresosValidos.length;

    let reporteId: string | null = null;
    try {
      if (administrador_id && formato === 'pdf') {
        const mesRango = fecha_desde ? parseInt(fecha_desde.split('-')[1]) : null;
        const anioRango = fecha_desde ? parseInt(fecha_desde.split('-')[0]) : null;
        const reporteCreado = await this.prisma.rEPORTES.create({
          data: {
            administrador_id,
            tipo: 'accesos_visitantes',
            mes: mesRango,
            anio: anioRango,
            fecha_desde: fecha_desde ? new Date(fecha_desde + 'T00:00:00Z') : null,
            fecha_hasta: fecha_hasta ? new Date(fecha_hasta + 'T00:00:00Z') : null,
            total_registros: ingresos.length,
            created_at: ahoraEcuadorLiteral(),
          },
        });
        reporteId = reporteCreado.id;
      }
    } catch (_) {}

    if (formato === 'json') {
      return res.json({
        total: ingresos.length,
        total_vehiculos: totalVehiculos,
        ingresos_automaticos: ingresosAutomaticos.length,
        ingresos_manuales: ingresosManuales.length,
        ingresos_denegados: ingresosDenegados.length,
      });
    }

    // PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_accesos.pdf`,
    );

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.end(pdfBuffer);
      if (reporteId) {
        this.cloudinary
          .subirArchivo(pdfBuffer, 'urbanapp/reportes', true)
          .then((url) =>
            this.prisma.rEPORTES.update({
              where: { id: reporteId! },
              data: { archivo_pdf_url: url },
            }),
          )
          .catch((e) => console.error('Error subiendo reporte a Cloudinary:', e));
      }
    });

    this.pdfEncabezado(
      doc,
      'Reporte de Acceso de Visitantes',
      fecha_desde && fecha_hasta ? `Del ${fecha_desde} al ${fecha_hasta}` : 'Todos los registros',
    );

    // Resumen en tarjetas
    this.pdfTarjetas(doc, [
      { label: 'Vehículos ingresados', valor: `${totalVehiculos}`, color: this.azul },
      { label: 'Ingresos automáticos (QR)', valor: `${ingresosAutomaticos.length}`, color: '#2E9E5B' },
      { label: 'Ingresos manuales', valor: `${ingresosManuales.length}`, color: '#E8830C' },
      { label: 'Ingresos denegados', valor: `${ingresosDenegados.length}`, color: '#D64545' },
    ]);

    doc.moveDown(0.5);

    // Tabla de ingresos
    this.pdfSeccion(doc, `Detalle de Ingresos (${ingresos.length})`);
    if (ingresos.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Sin ingresos registrados en este periodo.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 22 },
          { titulo: 'Visitante', ancho: 105 },
          { titulo: 'Placa', ancho: 60 },
          { titulo: 'Destino', ancho: 90 },
          { titulo: 'Fecha/Hora', ancho: 100 },
          { titulo: 'Tipo', ancho: 68 },
        ],
        ingresos.map((ing, i) => [
          `${i + 1}`,
          `${ing.nombre_visitante ?? 'N/A'}`,
          `${ing.placa_vehiculo ?? 'N/A'}`,
          `Mz ${ing.manzana_destino} V ${ing.villa_destino}`,
          `${new Date(ing.hora_ingreso).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          `${ing.estado === 'denegado' ? 'Denegado' : ing.tipo_ingreso === 'automatico' ? 'Automático' : 'Manual'}`,
        ]),
      );
    }

    doc.end();
  }

  async generarReporteReservas(
    administrador_id: string,
    mes?: number,
    anio?: number,
    formato: string = 'json',
    res?: Response,
  ) {
    const where: any = {};
    if (mes && anio) {
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0);
      where.fecha_reserva = { gte: fechaInicio, lte: fechaFin };
    }
    where.estado = { in: ['confirmada', 'completada'] };

    const reservas = await this.prisma.rESERVAS.findMany({
      where,
      include: {
        area: true,
        residente: {
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
          },
        },
      },
      orderBy: { fecha_reserva: 'desc' },
    });

    const futbol = reservas.filter(
      (r) =>
        r.area.nombre.toLowerCase().includes('futbol') ||
        r.area.nombre.toLowerCase().includes('fútbol'),
    ).length;
    const basket = reservas.filter(
      (r) =>
        r.area.nombre.toLowerCase().includes('basket') ||
        r.area.nombre.toLowerCase().includes('básquet'),
    ).length;
    const eventos = reservas.filter((r) =>
      r.area.nombre.toLowerCase().includes('evento'),
    ).length;

    let reporteId: string | null = null;
    try {
      if (administrador_id && formato === 'pdf') {
        const desde =
          mes && anio
            ? `${anio}-${mes.toString().padStart(2, '0')}-01`
            : null;
        const hasta =
          mes && anio
            ? `${anio}-${mes.toString().padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`
            : null;
        const reporteCreado = await this.prisma.rEPORTES.create({
          data: {
            administrador_id,
            tipo: 'reservas_areas',
            mes: mes ?? null,
            anio: anio ?? null,
            fecha_desde: desde ? new Date(desde + 'T00:00:00Z') : null,
            fecha_hasta: hasta ? new Date(hasta + 'T00:00:00Z') : null,
            total_registros: reservas.length,
            created_at: ahoraEcuadorLiteral(),
          },
        });
        reporteId = reporteCreado.id;
      }
    } catch (_) {}

    if (formato === 'json') {
      return res.json({
        total: reservas.length,
        futbol,
        basket,
        eventos,
      });
    }

    // PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_reservas_${mes ?? 'todos'}_${anio ?? 'todos'}.pdf`,
    );

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.end(pdfBuffer);
      if (reporteId) {
        this.cloudinary
          .subirArchivo(pdfBuffer, 'urbanapp/reportes', true)
          .then((url) =>
            this.prisma.rEPORTES.update({
              where: { id: reporteId! },
              data: { archivo_pdf_url: url },
            }),
          )
          .catch((e) => console.error('Error subiendo reporte a Cloudinary:', e));
      }
    });

    this.pdfEncabezado(
      doc,
      'Reporte de Reservas de Áreas Sociales',
      mes && anio ? `Periodo: ${mes}/${anio}` : 'Todos los periodos',
    );

    // Resumen en tarjetas
    this.pdfTarjetas(doc, [
      { label: 'Total reservas', valor: `${reservas.length}`, color: this.azul },
      { label: 'Cancha de Fútbol', valor: `${futbol}`, color: '#2E9E5B' },
      { label: 'Cancha de Básquet', valor: `${basket}`, color: '#E8830C' },
      { label: 'Salón de Eventos', valor: `${eventos}`, color: '#8E44AD' },
    ]);

    doc.moveDown(0.5);

    // Tabla de reservas
    this.pdfSeccion(doc, `Reservas Aprobadas y Completadas (${reservas.length})`);
    if (reservas.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Sin reservas confirmadas en este periodo.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 25 },
          { titulo: 'Residente', ancho: 180 },
          { titulo: 'Área', ancho: 140 },
          { titulo: 'Fecha', ancho: 90 },
          { titulo: 'Estado', ancho: 60 },
        ],
        reservas.map((r, i) => [
          `${i + 1}`,
          `${r.residente.usuario.nombres} ${r.residente.usuario.apellidos}`,
          `${r.area.nombre}`,
          `${new Date(r.fecha_reserva).toLocaleDateString('es-EC')}`,
          r.estado === 'completada' ? 'Completada' : 'Aprobada',
        ]),
      );
    }

    doc.end();
  }

  async generarReporteUsuarios(
    administrador_id: string,
    formato: string = 'json',
    res?: Response,
  ) {
    // Padrón oficial de residentes reales (activos)
    const padron = await this.prisma.rESIDENTES_REALES.findMany({
      where: { activo: true },
      orderBy: [{ manzana: 'asc' }, { villa: 'asc' }],
    });

    // Usuarios residentes registrados en la app (con su cédula)
    const usuariosResidentes = await this.prisma.uSUARIOS.findMany({
      where: { rol: 'residente' },
      include: { residente: true },
    });

    // Set de cédulas registradas para cruce rápido
    const cedulasRegistradas = new Set(
      usuariosResidentes.map((u) => u.cedula),
    );

    // Clasificar el padrón: con app / sin app
    const conApp = padron.filter((p) => cedulasRegistradas.has(p.cedula));
    const sinApp = padron.filter((p) => !cedulasRegistradas.has(p.cedula));

    // Guardias y administradores (se mantienen)
    const guardias = await this.prisma.uSUARIOS.findMany({
      where: { rol: 'guardia' },
      include: { guardia: { include: { turno: true } } },
    });
    const administradores = await this.prisma.uSUARIOS.findMany({
      where: { rol: 'administrador' },
      include: { administrador: true },
    });

    let reporteId: string | null = null;
    try {
      if (administrador_id && formato === 'pdf') {
        const reporteCreado = await this.prisma.rEPORTES.create({
          data: {
            administrador_id,
            tipo: 'usuarios',
            total_registros: padron.length,
            created_at: ahoraEcuadorLiteral(),
          },
        });
        reporteId = reporteCreado.id;
      }
    } catch (_) {}

    if (formato === 'json') {
      return res.json({
        total_padron: padron.length,
        con_app: conApp.length,
        sin_app: sinApp.length,
        total_guardias: guardias.length,
        total_administradores: administradores.length,
      });
    }

    // PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte_usuarios.pdf',
    );

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.end(pdfBuffer);
      if (reporteId) {
        this.cloudinary
          .subirArchivo(pdfBuffer, 'urbanapp/reportes', true)
          .then((url) =>
            this.prisma.rEPORTES.update({
              where: { id: reporteId! },
              data: { archivo_pdf_url: url },
            }),
          )
          .catch((e) =>
            console.error('Error subiendo reporte a Cloudinary:', e),
          );
      }
    });

    this.pdfEncabezado(
      doc,
      'Reporte de Residentes',
      'Padrón oficial vs. registro en la aplicación',
    );

    // Resumen en tarjetas
    this.pdfTarjetas(doc, [
      { label: 'Total en padrón', valor: `${padron.length}`, color: this.azul },
      { label: 'Residentes con app', valor: `${conApp.length}`, color: '#2E9E5B' },
      { label: 'Residentes sin app', valor: `${sinApp.length}`, color: '#D64545' },
      { label: 'Guardias / Admins', valor: `${guardias.length} / ${administradores.length}`, color: '#8E44AD' },
    ]);

    doc.moveDown(0.5);

    // CON APP
    this.pdfSeccion(doc, `Residentes con la app instalada (${conApp.length})`);
    if (conApp.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Ningún residente del padrón se ha registrado en la app.');
      doc.moveDown();
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 25 },
          { titulo: 'Nombre', ancho: 200 },
          { titulo: 'Cédula', ancho: 110 },
          { titulo: 'Mz/Villa', ancho: 160 },
        ],
        conApp.map((p, i) => [
          `${i + 1}`,
          `${p.nombres}`,
          `${p.cedula}`,
          `Mz ${p.manzana} - Villa ${p.villa}`,
        ]),
      );
      doc.moveDown();
    }

    // SIN APP
    this.pdfSeccion(doc, `Residentes sin la app instalada (${sinApp.length})`);
    if (sinApp.length === 0) {
      doc.fontSize(9).fillColor('#777777').text('Todos los residentes del padrón están registrados en la app.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: '#', ancho: 25 },
          { titulo: 'Nombre', ancho: 200 },
          { titulo: 'Cédula', ancho: 110 },
          { titulo: 'Mz/Villa', ancho: 160 },
        ],
        sinApp.map((p, i) => [
          `${i + 1}`,
          `${p.nombres}`,
          `${p.cedula}`,
          `Mz ${p.manzana} - Villa ${p.villa}`,
        ]),
      );
    }

    doc.end();
  }
}
