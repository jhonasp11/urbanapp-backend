import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
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

  @ApiOperation({ summary: 'Generar reporte de pagos (JSON o PDF)' })
  @ApiQuery({ name: 'administrador_id', required: false })
  @ApiQuery({ name: 'mes', required: false })
  @ApiQuery({ name: 'anio', required: false })
  @ApiQuery({ name: 'formato', required: false, description: 'json o pdf' })
  @Get('pagos')
  generarReportePagos(
    @Query('administrador_id') administrador_id: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReportePagos(
      administrador_id,
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
      formato ?? 'json',
      res,
    );
  }

  @ApiOperation({ summary: 'Generar reporte de accesos (JSON o PDF)' })
  @ApiQuery({ name: 'administrador_id', required: false })
  @ApiQuery({ name: 'fecha_desde', required: false })
  @ApiQuery({ name: 'fecha_hasta', required: false })
  @ApiQuery({ name: 'formato', required: false })
  @Get('accesos')
  generarReporteAccesos(
    @Query('administrador_id') administrador_id: string,
    @Query('fecha_desde') fecha_desde: string,
    @Query('fecha_hasta') fecha_hasta: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReporteAccesos(
      administrador_id,
      fecha_desde,
      fecha_hasta,
      formato ?? 'json',
      res,
    );
  }

  @ApiOperation({ summary: 'Generar reporte de reservas (JSON o PDF)' })
  @ApiQuery({ name: 'administrador_id', required: false })
  @ApiQuery({ name: 'mes', required: false })
  @ApiQuery({ name: 'anio', required: false })
  @ApiQuery({ name: 'formato', required: false })
  @Get('reservas')
  generarReporteReservas(
    @Query('administrador_id') administrador_id: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReporteReservas(
      administrador_id,
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
      formato ?? 'json',
      res,
    );
  }

  @ApiOperation({ summary: 'Generar reporte de usuarios (JSON o PDF)' })
  @ApiQuery({ name: 'administrador_id', required: false })
  @ApiQuery({ name: 'formato', required: false })
  @Get('usuarios')
  generarReporteUsuarios(
    @Query('administrador_id') administrador_id: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    return this.reportesService.generarReporteUsuarios(
      administrador_id,
      formato ?? 'json',
      res,
    );
  }
}
