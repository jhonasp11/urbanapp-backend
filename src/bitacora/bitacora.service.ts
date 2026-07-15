import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BitacoraService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // Hora actual de Ecuador como "UTC literal" (evita el desfase de Prisma)
  private ahoraEcuadorLiteral(): Date {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const p = f.formatToParts(new Date());
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
    let hour = g('hour');
    if (hour === '24') hour = '00';
    return new Date(
      `${g('year')}-${g('month')}-${g('day')}T${hour}:${g('minute')}:${g('second')}Z`,
    );
  }

  // Devuelve minutos desde medianoche de la hora actual de Ecuador
  private minutosActuales(): number {
    const ahora = this.ahoraEcuadorLiteral();
    return ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
  }

  // Convierte "HH:MM:SS" a minutos desde medianoche
  private horaAMinutos(hora: Date): number {
    return hora.getUTCHours() * 60 + hora.getUTCMinutes();
  }

  // ¿La hora actual está dentro del rango del turno? (maneja cruce de medianoche)
  private dentroDelTurno(
    inicioMin: number,
    finMin: number,
    ahoraMin: number,
  ): boolean {
    if (inicioMin < finMin) {
      // Turno normal (ej. 06:00-14:00)
      return ahoraMin >= inicioMin && ahoraMin < finMin;
    } else {
      // Turno que cruza medianoche (ej. 22:00-06:00)
      return ahoraMin >= inicioMin || ahoraMin < finMin;
    }
  }

  // Fecha del turno (YYYY-MM-DD) considerando cruce de medianoche.
  // Para nocturno de madrugada, la bitácora pertenece al día anterior.
  private fechaTurno(
    inicioMin: number,
    finMin: number,
    ahoraMin: number,
  ): Date {
    const ahora = this.ahoraEcuadorLiteral();
    // Si el turno cruza medianoche y estamos en la madrugada (antes del fin), es del día anterior
    if (inicioMin > finMin && ahoraMin < finMin) {
      ahora.setUTCDate(ahora.getUTCDate() - 1);
    }
    return new Date(`${ahora.toISOString().substring(0, 10)}T00:00:00Z`);
  }

  // Verifica el estado del guardia: en turno, bitácora activa, o bitácora cerrada por ver
  async verificarEstado(guardia_id: string) {
    const guardia = await this.prisma.gUARDIAS.findUnique({
      where: { id: guardia_id },
      include: { turno: true },
    });
    if (!guardia || !guardia.turno) {
      throw new NotFoundException('Guardia o turno no encontrado');
    }

    const inicioMin = this.horaAMinutos(guardia.turno.hora_inicio);
    const finMin = this.horaAMinutos(guardia.turno.hora_fin);
    const ahoraMin = this.minutosActuales();
    const enTurno = this.dentroDelTurno(inicioMin, finMin, ahoraMin);

    // ¿Hay una bitácora cerrada recientemente que el guardia no ha visto?
    const bitacoraCerrada = await this.prisma.bITACORA_TURNOS.findFirst({
      where: { guardia_id, estado: 'cerrado' },
      orderBy: { hora_cierre: 'desc' },
      include: { turno: true },
    });

    let bitacoraActiva: any = null;
    if (enTurno) {
      const fecha = this.fechaTurno(inicioMin, finMin, ahoraMin);
      bitacoraActiva = await this.prisma.bITACORA_TURNOS.findUnique({
        where: {
          uq_bitacora_turno_dia: {
            guardia_id,
            fecha_turno: fecha,
            turno_id: guardia.turno.id,
          },
        },
      });

      // Solo cuenta como activa si su estado es 'activo'
      if (bitacoraActiva && bitacoraActiva.estado !== 'activo') {
        bitacoraActiva = null;
      }

      // Desglose de ingresos de la bitácora activa
      if (bitacoraActiva) {
        const ingresos = await this.prisma.iNGRESOS.findMany({
          where: { bitacora_id: bitacoraActiva.id },
          select: { tipo_ingreso: true, estado: true },
        });
        const automaticos = ingresos.filter(
          (i) => i.tipo_ingreso === 'automatico' && i.estado === 'valido',
        ).length;
        const manuales = ingresos.filter(
          (i) => i.tipo_ingreso === 'manual' && i.estado === 'valido',
        ).length;
        const incidencias = ingresos.filter(
          (i) => i.estado === 'denegado',
        ).length;
        bitacoraActiva = {
          ...bitacoraActiva,
          resumen: {
            total: automaticos + manuales,
            automaticos,
            manuales,
            incidencias,
          },
        };
      }
    }

    // Última bitácora finalizada (para poder descargar su PDF desde el bloqueo)
    const ultimaFinalizada = await this.prisma.bITACORA_TURNOS.findFirst({
      where: { guardia_id, estado: 'finalizado' },
      orderBy: { hora_cierre: 'desc' },
    });

    return {
      en_turno: enTurno,
      turno: {
        nombre: guardia.turno.nombre,
        hora_inicio: guardia.turno.hora_inicio.toISOString().substring(11, 16),
        hora_fin: guardia.turno.hora_fin.toISOString().substring(11, 16),
      },
      bitacora_activa: bitacoraActiva,
      bitacora_cerrada_por_ver: bitacoraCerrada,
      ultima_finalizada: ultimaFinalizada,
    };
  }

  // Inicia la bitácora (solo si está en turno y no existe una activa)
  async iniciarBitacora(guardia_id: string) {
    const guardia = await this.prisma.gUARDIAS.findUnique({
      where: { id: guardia_id },
      include: { turno: true },
    });
    if (!guardia || !guardia.turno) {
      throw new NotFoundException('Guardia o turno no encontrado');
    }

    const inicioMin = this.horaAMinutos(guardia.turno.hora_inicio);
    const finMin = this.horaAMinutos(guardia.turno.hora_fin);
    const ahoraMin = this.minutosActuales();

    if (!this.dentroDelTurno(inicioMin, finMin, ahoraMin)) {
      throw new BadRequestException('No estás dentro de tu horario de turno');
    }

    const fecha = this.fechaTurno(inicioMin, finMin, ahoraMin);

    // Si ya existe, la devuelve (no duplica)
    const existente = await this.prisma.bITACORA_TURNOS.findUnique({
      where: {
        uq_bitacora_turno_dia: {
          guardia_id,
          fecha_turno: fecha,
          turno_id: guardia.turno.id,
        },
      },
    });
    if (existente) {
      if (existente.estado === 'cerrado') {
        throw new BadRequestException('El turno de hoy ya fue cerrado');
      }
      return existente;
    }

    return this.prisma.bITACORA_TURNOS.create({
      data: {
        guardia_id,
        turno_id: guardia.turno.id,
        fecha_turno: fecha,
        hora_apertura: this.ahoraEcuadorLiteral(),
        created_at: this.ahoraEcuadorLiteral(),
        estado: 'activo',
      },
    });
  }

  // Marca la bitácora cerrada como "vista" (para no volver a mostrar la pantalla)
  async marcarVista(bitacora_id: string) {
    return this.prisma.bITACORA_TURNOS.update({
      where: { id: bitacora_id },
      data: { estado: 'finalizado' },
    });
  }

  async obtenerBitacora(id: string) {
    const bitacora = await this.prisma.bITACORA_TURNOS.findUnique({
      where: { id },
      include: {
        guardia: { include: { usuario: true } },
        turno: true,
        ingresos: true,
      },
    });
    if (!bitacora) throw new NotFoundException('Bitácora no encontrada');
    return bitacora;
  }

  // Cron: cierra bitácoras cuyo turno ya terminó
  @Cron(CronExpression.EVERY_MINUTE)
  async cerrarBitacorasVencidas() {
    const activas = await this.prisma.bITACORA_TURNOS.findMany({
      where: { estado: 'activo' },
      include: { turno: true },
    });

    const ahoraMin = this.minutosActuales();
    const ahora = this.ahoraEcuadorLiteral();

    for (const b of activas) {
      const inicioMin = this.horaAMinutos(b.turno.hora_inicio);
      const finMin = this.horaAMinutos(b.turno.hora_fin);
      // Si ya NO está dentro del turno, se cierra
      if (!this.dentroDelTurno(inicioMin, finMin, ahoraMin)) {
        await this.prisma.bITACORA_TURNOS.update({
          where: { id: b.id },
          data: {
            estado: 'cerrado',
            hora_cierre: ahora,
          },
        });
        console.log(`[Cron] Bitácora ${b.id} cerrada automáticamente.`);
      }
    }
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

  // ===== PDF DE BITÁCORA =====
  async generarPdf(id: string, res: Response) {
    const bitacora = await this.prisma.bITACORA_TURNOS.findUnique({
      where: { id },
      include: {
        guardia: { include: { usuario: true } },
        turno: true,
        ingresos: { orderBy: { hora_ingreso: 'asc' } },
      },
    });
    if (!bitacora) throw new NotFoundException('Bitácora no encontrada');

    const nombreGuardia =
      `${bitacora.guardia.usuario?.nombres ?? ''} ${bitacora.guardia.usuario?.apellidos ?? ''}`.trim();
    const ingresos = bitacora.ingresos;
    const automaticos = ingresos.filter(
      (i) => i.tipo_ingreso === 'automatico' && i.estado === 'valido',
    ).length;
    const manuales = ingresos.filter(
      (i) => i.tipo_ingreso === 'manual' && i.estado === 'valido',
    ).length;
    const incidencias = ingresos.filter((i) => i.estado === 'denegado').length;

    const fmtHora = (d: Date | null) =>
      d ? new Date(d).toISOString().substring(11, 16) : '-';
    const fmtFecha = (d: Date | null) =>
      d ? new Date(d).toISOString().substring(0, 10) : '-';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bitacora_${fmtFecha(bitacora.fecha_turno)}.pdf`,
    );

    // Capturar el PDF en un buffer para subirlo a Cloudinary y enviarlo al cliente
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.end(pdfBuffer);

      // Subir a Cloudinary solo si aún no tiene URL (primera vez)
      if (!bitacora.reporte_pdf_url) {
        this.cloudinary
          .subirArchivo(pdfBuffer, 'urbanapp/bitacoras', true)
          .then((url) =>
            this.prisma.bITACORA_TURNOS.update({
              where: { id },
              data: { reporte_pdf_url: url },
            }),
          )
          .catch((e) =>
            console.error('Error subiendo bitácora a Cloudinary:', e),
          );
      }
    });

    this.pdfEncabezado(
      doc,
      'Bitácora de Turno',
      `Turno: ${bitacora.turno.nombre}`,
    );

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.grisTexto)
      .text(nombreGuardia, 50, doc.y);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#777777')
      .text(
        `Fecha: ${fmtFecha(bitacora.fecha_turno)}  ·  Apertura: ${fmtHora(bitacora.hora_apertura)}  ·  Cierre: ${fmtHora(bitacora.hora_cierre)}`,
      );
    doc.moveDown(0.8);

    this.pdfTarjetas(doc, [
      {
        label: 'Total ingresos',
        valor: `${automaticos + manuales}`,
        color: '#185FA5',
      },
      { label: 'Incidencias', valor: `${incidencias}`, color: '#D64545' },
      { label: 'Automáticos', valor: `${automaticos}`, color: '#2E9E5B' },
      { label: 'Manuales', valor: `${manuales}`, color: '#E8830C' },
    ]);

    doc.moveDown(0.5);
    this.pdfSeccion(doc, `Detalle de Registros (${ingresos.length})`);
    if (ingresos.length === 0) {
      doc
        .fontSize(9)
        .fillColor('#777777')
        .text('No hay registros en esta bitácora.');
    } else {
      this.pdfTabla(
        doc,
        [
          { titulo: 'Hora', ancho: 50 },
          { titulo: 'Visitante', ancho: 130 },
          { titulo: 'Destino', ancho: 110 },
          { titulo: 'Tipo', ancho: 70 },
          { titulo: 'Estado', ancho: 135 },
        ],
        ingresos.map((i) => [
          fmtHora(i.hora_ingreso),
          i.nombre_visitante ?? '-',
          i.estado === 'denegado'
            ? '-'
            : `Mz ${i.manzana_destino ?? ''} V ${i.villa_destino ?? ''}`,
          i.tipo_ingreso === 'automatico' ? 'Automático' : 'Manual',
          i.estado === 'denegado' ? 'Incidencia' : 'Válido',
        ]),
      );
    }

    // Sección de incidencias con observaciones completas
    const incidenciasList = ingresos.filter((i) => i.estado === 'denegado');
    if (incidenciasList.length > 0) {
      doc.moveDown(1);
      this.pdfSeccion(
        doc,
        `Detalle de Incidencias (${incidenciasList.length})`,
      );
      incidenciasList.forEach((i, idx) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const hora = i.hora_ingreso
          ? new Date(i.hora_ingreso).toISOString().substring(11, 16)
          : '-';
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(this.azul)
          .text(`${idx + 1}. ${hora}`, 50, doc.y);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.grisTexto)
          .text(i.observacion_incidencia ?? 'Sin descripción', 50, doc.y, {
            width: doc.page.width - 100,
          });
        doc.moveDown(0.6);
      });
    }

    doc.end();
  }
}
