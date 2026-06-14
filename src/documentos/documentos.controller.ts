import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Roles('administrador')
  @Post()
  crear(@Body() dto: CrearDocumentoDto) {
    return this.documentosService.crear(dto);
  }

  @Roles('administrador')
  @Get()
  listarTodos() {
    return this.documentosService.listarTodos();
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get('para-residente')
  listarParaResidente() {
    return this.documentosService.listarParaResidente();
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get('terminos-privacidad')
  listarTerminosYPrivacidad() {
    return this.documentosService.listarTerminosYPrivacidad();
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get('tipo/:tipo')
  buscarPorTipo(@Param('tipo') tipo: string) {
    return this.documentosService.buscarPorTipo(tipo);
  }

  @Roles('administrador')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.documentosService.desactivar(id);
  }
}
