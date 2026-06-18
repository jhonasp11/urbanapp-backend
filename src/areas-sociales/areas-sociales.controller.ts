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
import { AreasSocialesService } from './areas-sociales.service';
import { CrearAreaDto } from './dto/crear-area.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Areas Sociales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('areas-sociales')
export class AreasSocialesController {
  constructor(private readonly areasSocialesService: AreasSocialesService) {}

  @ApiOperation({ summary: 'Crear area social' })
  @ApiResponse({ status: 201, description: 'Area creada exitosamente' })
  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearAreaDto) {
    return this.areasSocialesService.crear(dto);
  }

  @ApiOperation({ summary: 'Listar todas las areas sociales' })
  @ApiResponse({ status: 200, description: 'Lista de areas sociales' })
  @Roles('residente', 'administrador')
  @Get()
  listarTodas() {
    return this.areasSocialesService.listarTodas();
  }

  @ApiOperation({ summary: 'Buscar area social por ID' })
  @ApiResponse({ status: 200, description: 'Area encontrada' })
  @ApiResponse({ status: 404, description: 'Area no encontrada' })
  @Roles('residente', 'administrador')
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.areasSocialesService.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar area social' })
  @ApiResponse({ status: 200, description: 'Area actualizada exitosamente' })
  @Roles('administrador')
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CrearAreaDto>) {
    return this.areasSocialesService.actualizar(id, dto);
  }
}
