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
import { DocumentosService } from './documentos.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Documentos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @ApiOperation({ summary: 'Subir nuevo documento o reglamento' })
  @ApiResponse({ status: 201, description: 'Documento creado exitosamente' })
  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearDocumentoDto) {
    return this.documentosService.crear(dto);
  }

  @ApiOperation({ summary: 'Listar todos los documentos activos' })
  @ApiResponse({ status: 200, description: 'Lista de documentos' })
  @Roles('administrador')
  @Get()
  listarTodos() {
    return this.documentosService.listarTodos();
  }

  @ApiOperation({ summary: 'Listar documentos visibles para residentes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos para residente',
  })
  @Roles('residente', 'administrador', 'guardia')
  @Get('para-residente')
  listarParaResidente() {
    return this.documentosService.listarParaResidente();
  }

  @ApiOperation({
    summary: 'Obtener terminos y condiciones y politica de privacidad',
  })
  @ApiResponse({ status: 200, description: 'Documentos legales activos' })
  @Roles('residente', 'administrador', 'guardia')
  @Get('terminos-privacidad')
  listarTerminosYPrivacidad() {
    return this.documentosService.listarTerminosYPrivacidad();
  }

  @ApiOperation({ summary: 'Buscar documento por tipo' })
  @ApiResponse({ status: 200, description: 'Documento encontrado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  @Roles('residente', 'administrador', 'guardia')
  @Get('tipo/:tipo')
  buscarPorTipo(@Param('tipo') tipo: string) {
    return this.documentosService.buscarPorTipo(tipo);
  }

  @ApiOperation({ summary: 'Desactivar documento' })
  @ApiResponse({ status: 200, description: 'Documento desactivado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.documentosService.desactivar(id);
  }
}
