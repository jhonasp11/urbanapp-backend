import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CodigosQrService } from './codigos-qr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('codigos-qr')
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

  @Roles('residente')
  @Post('generar')
  generarQR(
    @Body('visitante_id') visitante_id: string,
    @Body('residente_id') residente_id: string,
  ) {
    return this.codigosQrService.generarQR(visitante_id, residente_id);
  }

  @Roles('guardia')
  @Post('escanear')
  escanearQR(
    @Body('codigo_hash') codigo_hash: string,
    @Body('guardia_id') guardia_id: string,
    @Body('bitacora_id') bitacora_id: string,
  ) {
    return this.codigosQrService.escanearQR(codigo_hash, guardia_id, bitacora_id);
  }

  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.codigosQrService.listarPorResidente(residente_id);
  }
}
