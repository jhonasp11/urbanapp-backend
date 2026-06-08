import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ValidarReservaDto } from './dto/validar-reserva.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Roles('residente')
  @Post()
  crear(@Body() dto: CrearReservaDto) {
    return this.reservasService.crear(dto);
  }

  @Roles('residente')
  @Patch(':id/confirmar')
  confirmar(@Param('id') id: string) {
    return this.reservasService.confirmar(id);
  }

  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.reservasService.listarPorResidente(residente_id);
  }

  @Roles('administrador')
  @Get()
  listarTodas() {
    return this.reservasService.listarTodas();
  }

  @Roles('administrador')
  @Patch(':id/validar')
  validar(@Param('id') id: string, @Body() dto: ValidarReservaDto) {
    return this.reservasService.validar(id, dto);
  }
}
