import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VisitantesService } from './visitantes.service';
import { CrearVisitanteDto } from './dto/crear-visitante.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Visitantes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitantes')
export class VisitantesController {
  constructor(private readonly visitantesService: VisitantesService) {}

  @ApiOperation({ summary: 'Registrar nuevo visitante con cedula y placa' })
  @ApiResponse({
    status: 201,
    description: 'Visitante registrado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Cedula del visitante no valida' })
  @Roles('residente')
  @Post()
  crear(@Body() dto: CrearVisitanteDto) {
    return this.visitantesService.crear(dto);
  }

  @ApiOperation({ summary: 'Guardar visitante para futuros accesos' })
  @ApiResponse({ status: 201, description: 'Visitante guardado exitosamente' })
  @ApiResponse({ status: 400, description: 'El visitante ya está guardado' })
  @Roles('residente')
  @Post('guardar')
  guardarVisitante(@Body() dto: CrearVisitanteDto) {
    return this.visitantesService.guardarVisitante(dto);
  }

  @ApiOperation({ summary: 'Listar visitantes de un residente' })
  @ApiResponse({ status: 200, description: 'Lista de visitantes' })
  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.visitantesService.listarPorResidente(residente_id);
  }

  @ApiOperation({ summary: 'Eliminar visitante guardado (quita de guardados)' })
  @ApiResponse({ status: 200, description: 'Visitante quitado de guardados' })
  @Roles('residente')
  @Patch(':id/eliminar-guardado')
  eliminarGuardado(@Param('id') id: string) {
    return this.visitantesService.eliminarGuardado(id);
  }

  @ApiOperation({ summary: 'Buscar visitante por ID' })
  @ApiResponse({ status: 200, description: 'Visitante encontrado' })
  @ApiResponse({ status: 404, description: 'Visitante no encontrado' })
  @Roles('residente', 'administrador', 'guardia')
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.visitantesService.buscarPorId(id);
  }
}
