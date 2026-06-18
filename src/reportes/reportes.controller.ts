import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@ApiTags('Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @ApiOperation({ summary: 'Generar reporte PDF de pagos' })
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiQuery({ name: 'administrador_id', required: true })
  @ApiQuery({ name: 'mes', required: false })
  @ApiQuery({ name: 'anio', required: false })
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

  @ApiOperation({ summary: 'Generar reporte PDF de accesos de visitantes' })
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiQuery({ name: 'administrador_id', required: true })
  @ApiQuery({ name: 'fecha_desde', required: false })
  @ApiQuery({ name: 'fecha_hasta', required: false })
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

  @ApiOperation({ summary: 'Generar reporte PDF de reservas' })
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiQuery({ name: 'administrador_id', required: true })
  @ApiQuery({ name: 'mes', required: false })
  @ApiQuery({ name: 'anio', required: false })
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
