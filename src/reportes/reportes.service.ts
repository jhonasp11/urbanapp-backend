/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

const PDFDocument = require('pdfkit');

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

async generarReportePagos(
  administrador_id: string,
  mes?: number,
  anio?: number,
  res?: Response,
) {
  const where: any = {};
  if (mes) where.mes_pago = mes;
  if (anio) where.anio_pago = anio;

  const pagos = await this.prisma.pAGOS.findMany({
    where,
    include: {
      residente: {
        include: {
          usuario: { select: { nombres: true, apellidos: true, cedula: true } },
        },
      },
      alicuota: true,
    },
    orderBy: { fecha_envio: 'desc' },
  });

  const pagosAprobados = pagos.filter((p) => p.estado === 'aprobado');
  const pagosPendientes = pagos.filter((p) => p.estado === 'pendiente');
  const pagosRechazados = pagos.filter((p) => p.estado === 'rechazado');

  const totalRecaudado = pagosAprobados.reduce(
    (sum, p) => sum + (p.alicuota ? Number(p.alicuota.monto) : 0),
    0,
  );
  const totalPendiente = pagosPendientes.reduce(
    (sum, p) => sum + (p.alicuota ? Number(p.alicuota.monto) : 0),
    0,
  );

  await this.prisma.rEPORTES.create({
    data: {
      administrador_id,
      tipo: 'pagos',
      mes: mes ?? null,
      anio: anio ?? null,
      total_registros: pagos.length,
    },
  });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=reporte_pagos_${mes ?? 'todos'}_${anio ?? 'todos'}.pdf`,
  );
  doc.pipe(res);

  doc.fontSize(20).text('UrbanApp - Reporte de Pagos', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generado: ${new Date().toLocaleDateString('es-EC')}`);
  if (mes && anio) doc.text(`Periodo: ${mes}/${anio}`);
  doc.text(`Total registros: ${pagos.length}`);
  doc.moveDown();

  doc.fontSize(14).text('PAGOS RECIBIDOS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  if (pagosAprobados.length === 0) {
    doc.text('Sin pagos aprobados en este periodo.');
  } else {
    pagosAprobados.forEach((pago, index) => {
      const monto = pago.alicuota ? Number(pago.alicuota.monto).toFixed(2) : '0.00';
      doc.text(
        `${index + 1}. ${pago.residente.usuario.nombres} ${pago.residente.usuario.apellidos} | ` +
        `Cedula: ${pago.residente.usuario.cedula} | ` +
        `Monto: $${monto} | ` +
        `Fecha: ${new Date(pago.fecha_envio).toLocaleDateString('es-EC')}`,
      );
      doc.moveDown(0.3);
    });
  }
  doc.moveDown(0.3);
  doc.fontSize(11).text(`Total recaudado: $${totalRecaudado.toFixed(2)}`, { bold: true });
  doc.moveDown();

  doc.fontSize(14).text('PAGOS PENDIENTES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  if (pagosPendientes.length === 0) {
    doc.text('Sin pagos pendientes en este periodo.');
  } else {
    pagosPendientes.forEach((pago, index) => {
      const monto = pago.alicuota ? Number(pago.alicuota.monto).toFixed(2) : '0.00';
      doc.text(
        `${index + 1}. ${pago.residente.usuario.nombres} ${pago.residente.usuario.apellidos} | ` +
        `Cedula: ${pago.residente.usuario.cedula} | ` +
        `Monto: $${monto} - pendiente | ` +
        `Fecha: ${new Date(pago.fecha_envio).toLocaleDateString('es-EC')}`,
      );
      doc.moveDown(0.3);
    });
  }
  doc.moveDown(0.3);
  doc.fontSize(11).text(`Total pendiente: $${totalPendiente.toFixed(2)}`, { bold: true });

  if (pagosRechazados.length > 0) {
    doc.moveDown();
    doc.fontSize(14).text('PAGOS RECHAZADOS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    pagosRechazados.forEach((pago, index) => {
      doc.text(
        `${index + 1}. ${pago.residente.usuario.nombres} ${pago.residente.usuario.apellidos} | ` +
        `Cedula: ${pago.residente.usuario.cedula} | ` +
        `Motivo: ${pago.observacion_admin ?? 'Sin observacion'}`,
      );
      doc.moveDown(0.3);
    });
  }

  doc.end();
}

  async generarReporteAccesos(
    administrador_id: string,
    fecha_desde?: string,
    fecha_hasta?: string,
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

    await this.prisma.rEPORTES.create({
      data: {
        administrador_id,
        tipo: 'accesos_visitantes',
        fecha_desde: fecha_desde ? new Date(fecha_desde) : null,
        fecha_hasta: fecha_hasta ? new Date(fecha_hasta) : null,
        total_registros: ingresos.length,
      },
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_accesos.pdf`,
    );

    doc.pipe(res);

    doc.fontSize(20).text('UrbanApp - Reporte de Accesos', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Generado: ${new Date().toLocaleDateString('es-EC')}`);
    if (fecha_desde && fecha_hasta) {
      doc.text(`Periodo: ${fecha_desde} al ${fecha_hasta}`);
    }
    doc.text(`Total ingresos: ${ingresos.length}`);
    doc.moveDown();

    doc.fontSize(10);
    ingresos.forEach((ingreso, index) => {
      doc.text(
        `${index + 1}. Visitante: ${ingreso.nombre_visitante} | ` +
          `Destino: Mz. ${ingreso.manzana_destino} Villa ${ingreso.villa_destino} | ` +
          `Hora: ${new Date(ingreso.hora_ingreso).toLocaleString('es-EC')} | ` +
          `Estado: ${ingreso.estado} | ` +
          `Guardia: ${ingreso.guardia.usuario.nombres}`,
      );
      doc.moveDown(0.3);
    });

    doc.end();
  }

  async generarReporteReservas(
  administrador_id: string,
  mes?: number,
  anio?: number,
  res?: Response,
  ) {
  const where: any = {};
  if (mes && anio) {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);
    where.fecha_reserva = { gte: fechaInicio, lte: fechaFin };
  }
  where.estado = 'confirmada';

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

  await this.prisma.rEPORTES.create({
    data: {
      administrador_id,
      tipo: 'reservas_areas',
      mes: mes ?? null,
      anio: anio ?? null,
      total_registros: reservas.length,
    },
  });

  const reservasPorArea: Record<string, { nombre: string; reservas: typeof reservas; total: number }> = {};
  reservas.forEach((reserva) => {
    const areaId = reserva.area_id;
    if (!reservasPorArea[areaId]) {
      reservasPorArea[areaId] = {
        nombre: reserva.area.nombre,
        reservas: [],
        total: 0,
      };
    }
    reservasPorArea[areaId].reservas.push(reserva);
    reservasPorArea[areaId].total += Number(reserva.area.tarifa_reserva);
  });

  const totalGeneral = reservas.reduce(
    (sum, r) => sum + Number(r.area.tarifa_reserva),
    0,
  );

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=reporte_reservas_${mes ?? 'todos'}_${anio ?? 'todos'}.pdf`,
  );
  doc.pipe(res);

  doc.fontSize(20).text('UrbanApp - Reporte de Reservas', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generado: ${new Date().toLocaleDateString('es-EC')}`);
  if (mes && anio) doc.text(`Periodo: ${mes}/${anio}`);
  doc.text(`Total reservas confirmadas: ${reservas.length}`);
  doc.text(`Total recaudado general: $${totalGeneral.toFixed(2)}`);
  doc.moveDown();

  if (Object.keys(reservasPorArea).length === 0) {
    doc.fontSize(12).text('Sin reservas confirmadas en este periodo.');
  } else {
    Object.values(reservasPorArea).forEach((grupo) => {
      doc.fontSize(14).text(`AREA: ${grupo.nombre.toUpperCase()}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      grupo.reservas.forEach((reserva, index) => {
        doc.text(
          `${index + 1}. ${reserva.residente.usuario.nombres} ${reserva.residente.usuario.apellidos} | ` +
          `Fecha: ${new Date(reserva.fecha_reserva).toLocaleDateString('es-EC')} | ` +
          `Tarifa: $${Number(reserva.area.tarifa_reserva).toFixed(2)}`,
        );
        doc.moveDown(0.3);
      });
      doc.moveDown(0.3);
      doc.fontSize(11).text(`Total recaudado ${grupo.nombre}: $${grupo.total.toFixed(2)}`, { bold: true });
      doc.moveDown();
    });
  }

  doc.end();
}
  
}
