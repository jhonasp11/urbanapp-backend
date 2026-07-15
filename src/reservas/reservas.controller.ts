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
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ValidarReservaDto } from './dto/validar-reserva.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Reservas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @ApiOperation({ summary: 'Crear reserva de area social' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Horario o duracion invalida para el area',
  })
  @Roles('residente')
  @Post()
  crear(@Body() dto: CrearReservaDto) {
    return this.reservasService.crear(dto);
  }

  @ApiOperation({
    summary: 'Marcar reserva de salón como pagada (tras subir comprobante)',
  })
  @ApiResponse({ status: 200, description: 'Reserva marcada como pagada' })
  @ApiResponse({ status: 400, description: 'El tiempo de pago expiró' })
  @Roles('residente')
  @Patch(':id/pagada')
  pagada(@Param('id') id: string) {
    return this.reservasService.marcarPagada(id);
  }

  @ApiOperation({ summary: 'Cancelar reserva por residente' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @Roles('residente')
  @Patch(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body('residente_id') residente_id: string,
  ) {
    return this.reservasService.cancelar(id, residente_id);
  }

  @ApiOperation({ summary: 'Listar reservas de un residente' })
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.reservasService.listarPorResidente(residente_id);
  }

  @ApiOperation({ summary: 'Listar todas las reservas' })
  @ApiResponse({ status: 200, description: 'Lista de todas las reservas' })
  @Roles('administrador')
  @Get()
  listarTodas() {
    return this.reservasService.listarTodas();
  }

  @ApiOperation({ summary: 'Aprobar o rechazar una reserva' })
  @ApiResponse({ status: 200, description: 'Reserva validada exitosamente' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  @Roles('administrador')
  @Patch(':id/validar')
  validar(@Param('id') id: string, @Body() dto: ValidarReservaDto) {
    return this.reservasService.validar(id, dto);
  }
}
