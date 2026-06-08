import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AreasSocialesService } from './areas-sociales.service';
import { CrearAreaDto } from './dto/crear-area.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('areas-sociales')
export class AreasSocialesController {
  constructor(private readonly areasSocialesService: AreasSocialesService) {}

  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearAreaDto) {
    return this.areasSocialesService.crear(dto);
  }

  @Roles('residente', 'administrador')
  @Get()
  listarTodas() {
    return this.areasSocialesService.listarTodas();
  }

  @Roles('residente', 'administrador')
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.areasSocialesService.buscarPorId(id);
  }

  @Roles('administrador')
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CrearAreaDto>) {
    return this.areasSocialesService.actualizar(id, dto);
  }
}
