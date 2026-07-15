import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CodigosQrService } from './codigos-qr.service';
import { GenerarQrDto } from './dto/generar-qr.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Codigos QR')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('codigos-qr')
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

  @ApiOperation({ summary: 'Generar codigo QR para visitante' })
  @ApiResponse({ status: 201, description: 'QR generado exitosamente' })
  @ApiResponse({ status: 400, description: 'Rango de fechas invalido' })
  @Roles('residente')
  @Post('generar')
  generarQR(@Body() dto: GenerarQrDto) {
    return this.codigosQrService.generarQR(
      dto.visitante_id,
      dto.residente_id,
      dto.fecha_inicio,
      dto.fecha_fin,
    );
  }

  @ApiOperation({ summary: 'Validar codigo QR (paso 1, no crea ingreso)' })
  @ApiResponse({ status: 201, description: 'QR valido' })
  @ApiResponse({
    status: 400,
    description: 'QR invalido, expirado o bloqueado',
  })
  @Roles('guardia')
  @Post('validar')
  validarQR(@Body('codigo_hash') codigo_hash: string) {
    return this.codigosQrService.validarQR(codigo_hash);
  }

  @ApiOperation({ summary: 'Confirmar ingreso automatico (paso 2, con placa)' })
  @ApiResponse({ status: 201, description: 'Acceso permitido' })
  @Roles('guardia')
  @Post('confirmar-ingreso')
  confirmarIngresoAutomatico(
    @Body('codigo_qr_id') codigo_qr_id: string,
    @Body('guardia_id') guardia_id: string,
    @Body('bitacora_id') bitacora_id: string,
    @Body('placa_vehiculo') placa_vehiculo: string,
  ) {
    return this.codigosQrService.confirmarIngresoAutomatico(
      codigo_qr_id,
      guardia_id,
      bitacora_id,
      placa_vehiculo,
    );
  }

  @ApiOperation({
    summary: 'Registrar ingreso manual - autorizado por residente via llamada',
  })
  @ApiResponse({
    status: 201,
    description: 'Ingreso manual registrado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Residente no encontrado en esa ubicacion',
  })
  @Roles('guardia')
  @Post('ingreso-manual')
  registrarIngresoManual(
    @Body('guardia_id') guardia_id: string,
    @Body('bitacora_id') bitacora_id: string,
    @Body('nombre_visitante') nombre_visitante: string,
    @Body('cedula_visitante') cedula_visitante: string,
    @Body('placa_vehiculo') placa_vehiculo: string,
    @Body('nombre_residente') nombre_residente: string,
    @Body('manzana_destino') manzana_destino: string,
    @Body('villa_destino') villa_destino: string,
  ) {
    return this.codigosQrService.registrarIngresoManual(
      guardia_id,
      bitacora_id,
      nombre_visitante,
      cedula_visitante,
      placa_vehiculo,
      nombre_residente,
      manzana_destino,
      villa_destino,
    );
  }

  @ApiOperation({ summary: 'Listar ingresos por fecha' })
  @ApiResponse({ status: 200, description: 'Lista de ingresos' })
  @Roles('guardia', 'administrador')
  @Get('ingresos')
  listarIngresos(
    @Query('fecha') fecha?: string,
    @Query('guardia_id') guardia_id?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    return this.codigosQrService.listarIngresos(fecha, guardia_id, fecha_hasta);
  }

  @ApiOperation({ summary: 'Listar codigos QR de un residente' })
  @ApiResponse({ status: 200, description: 'Lista de codigos QR' })
  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.codigosQrService.listarPorResidente(residente_id);
  }

  @ApiOperation({ summary: 'Registrar reporte de incidencia' })
  @ApiResponse({ status: 201, description: 'Reporte registrado' })
  @Roles('guardia')
  @Post('reporte-incidencia')
  registrarReporteIncidencia(
    @Body('guardia_id') guardia_id: string,
    @Body('observacion_incidencia') observacion_incidencia: string,
    @Body('hora_ingreso') hora_ingreso: string,
    @Body('bitacora_id') bitacora_id: string,
  ) {
    return this.codigosQrService.registrarReporteIncidencia(
      guardia_id,
      observacion_incidencia,
      hora_ingreso,
      bitacora_id,
    );
  }

  @ApiOperation({ summary: 'Anular codigo QR' })
  @ApiResponse({ status: 200, description: 'Codigo QR anulado' })
  @Roles('residente')
  @Patch(':id/anular')
  anularQR(
    @Param('id') id: string,
    @Body('residente_id') residente_id: string,
  ) {
    return this.codigosQrService.anularQR(id, residente_id);
  }
}
