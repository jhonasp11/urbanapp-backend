import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CodigosQrService } from './codigos-qr.service';
import { GenerarQrDto } from './dto/generar-qr.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('codigos-qr')
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

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

  @Roles('guardia')
  @Post('escanear')
  escanearQR(
    @Body('codigo_hash') codigo_hash: string,
    @Body('guardia_id') guardia_id: string,
    @Body('bitacora_id') bitacora_id: string,
    @Body('placa_vehiculo') placa_vehiculo?: string,
  ) {
    return this.codigosQrService.escanearQR(
      codigo_hash,
      guardia_id,
      bitacora_id,
      placa_vehiculo,
    );
  }

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

  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.codigosQrService.listarPorResidente(residente_id);
  }
}
