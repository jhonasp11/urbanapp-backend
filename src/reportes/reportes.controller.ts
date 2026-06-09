import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('pagos')
  generarReportePagos(
    @Query('administrador_id') administrador_id: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReportePagos(
      administrador_id,
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
      res,
    );
  }

  @Get('accesos')
  generarReporteAccesos(
    @Query('administrador_id') administrador_id: string,
    @Query('fecha_desde') fecha_desde: string,
    @Query('fecha_hasta') fecha_hasta: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReporteAccesos(
      administrador_id,
      fecha_desde,
      fecha_hasta,
      res,
    );
  }

  @Get('reservas')
  generarReporteReservas(
    @Query('administrador_id') administrador_id: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReporteReservas(
      administrador_id,
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
      res,
    );
  }
}
