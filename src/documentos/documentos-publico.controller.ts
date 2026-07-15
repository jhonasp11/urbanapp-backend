import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';

@ApiTags('Documentos Públicos')
@Controller('documentos-publico')
export class DocumentosPublicoController {
  constructor(private readonly documentosService: DocumentosService) {}

  @ApiOperation({ summary: 'Obtener documento legal público (sin login)' })
  @ApiResponse({ status: 200, description: 'Documento encontrado' })
  @Get('tipo/:tipo')
  buscarPublicoPorTipo(@Param('tipo') tipo: string) {
    return this.documentosService.buscarPublicoPorTipo(tipo);
  }
}
