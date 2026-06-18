import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Registrar nuevo usuario (residente, admin o guardia)' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o usuario ya existe' })
  @Post('registro')
  registro(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @ApiOperation({ summary: 'Listar residentes pendientes de aprobacion' })
  @ApiResponse({ status: 200, description: 'Lista de residentes pendientes' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('residentes/pendientes')
  listarPendientes() {
    return this.usuariosService.listarResidentesPendientes();
  }

  @ApiOperation({ summary: 'Listar todos los residentes' })
  @ApiResponse({ status: 200, description: 'Lista de todos los residentes' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('residentes')
  listarTodos() {
    return this.usuariosService.listarTodosResidentes();
  }

  @ApiOperation({ summary: 'Aprobar o rechazar residente' })
  @ApiResponse({ status: 200, description: 'Estado del residente actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Patch(':id/estado')
  aprobarRechazar(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @Body('administrador_id') administrador_id: string,
  ) {
    return this.usuariosService.aprobarRechazarResidente(
      id,
      estado,
      administrador_id,
    );
  }

  @ApiOperation({ summary: 'Buscar usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id);
  }
}
