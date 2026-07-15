import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BitacoraService } from './bitacora.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Bitacora')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacoraService: BitacoraService) {}

  @ApiOperation({ summary: 'Verificar estado del guardia (turno y bitácora)' })
  @Roles('guardia')
  @Get('estado/:guardia_id')
  verificarEstado(@Param('guardia_id') guardia_id: string) {
    return this.bitacoraService.verificarEstado(guardia_id);
  }

  @ApiOperation({ summary: 'Iniciar bitácora del turno' })
  @Roles('guardia')
  @Post('iniciar')
  iniciar(@Body('guardia_id') guardia_id: string) {
    return this.bitacoraService.iniciarBitacora(guardia_id);
  }

  @ApiOperation({ summary: 'Marcar bitácora cerrada como vista' })
  @Roles('guardia')
  @Patch(':id/vista')
  marcarVista(@Param('id') id: string) {
    return this.bitacoraService.marcarVista(id);
  }

  @ApiOperation({ summary: 'Obtener detalle de una bitácora' })
  @Roles('guardia', 'administrador')
  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.bitacoraService.obtenerBitacora(id);
  }

  @ApiOperation({ summary: 'Generar PDF de una bitácora' })
  @Roles('guardia', 'administrador')
  @Get(':id/pdf')
  generarPdf(@Param('id') id: string, @Res() res: Response) {
    return this.bitacoraService.generarPdf(id, res);
  }
}
