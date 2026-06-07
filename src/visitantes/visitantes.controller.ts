import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { VisitantesService } from './visitantes.service';
import { CrearVisitanteDto } from './dto/crear-visitante.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitantes')
export class VisitantesController {
  constructor(private readonly visitantesService: VisitantesService) {}

  @Roles('residente')
  @Post()
  crear(@Body() dto: CrearVisitanteDto) {
    return this.visitantesService.crear(dto);
  }

  @Roles('residente', 'administrador')
  @Get('residente/:residente_id')
  listarPorResidente(@Param('residente_id') residente_id: string) {
    return this.visitantesService.listarPorResidente(residente_id);
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.visitantesService.buscarPorId(id);
  }
}
