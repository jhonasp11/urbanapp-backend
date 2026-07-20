import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ManzanasService } from './manzanas.service';
import { CrearManzanaDto } from './dto/crear-manzana.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Manzanas')
@Controller('manzanas')
export class ManzanasController {
  constructor(private readonly manzanasService: ManzanasService) {}

  @ApiOperation({ summary: 'Crear manzana con sus villas' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearManzanaDto) {
    return this.manzanasService.crear(dto);
  }

  @ApiOperation({ summary: 'Listar todas las manzanas' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get()
  listar() {
    return this.manzanasService.listar();
  }

  @ApiOperation({ summary: 'Listar números de manzanas (para selects)' })
  @Get('numeros')
  listarNumeros() {
    return this.manzanasService.listarNumeros();
  }

  @ApiOperation({ summary: 'Listar villas de una manzana por su número' })
  @Get('numero/:numero/villas')
  listarVillasPorManzana(@Param('numero', ParseIntPipe) numero: number) {
    return this.manzanasService.listarVillasPorManzana(numero);
  }

  @ApiOperation({ summary: 'Detalle de villas de una manzana con residentes' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('numero/:numero/detalle')
  detalleVillasConResidentes(@Param('numero', ParseIntPipe) numero: number) {
    return this.manzanasService.detalleVillasConResidentes(numero);
  }

  @ApiOperation({ summary: 'Obtener manzana con sus villas' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get(':id')
  obtenerConVillas(@Param('id') id: string) {
    return this.manzanasService.obtenerConVillas(id);
  }

  @ApiOperation({ summary: 'Agregar villas a una manzana' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch(':id/villas')
  agregarVillas(
    @Param('id') id: string,
    @Body('cantidad', ParseIntPipe) cantidad: number,
  ) {
    return this.manzanasService.agregarVillas(id, cantidad);
  }

  @ApiOperation({ summary: 'Desactivar manzana' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.manzanasService.desactivar(id);
  }
}
