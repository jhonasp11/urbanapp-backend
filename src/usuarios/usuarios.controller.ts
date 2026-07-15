/// <reference types="multer" />
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({
    summary: 'Registrar nuevo usuario (residente, admin o guardia)',
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos invalidos o usuario ya existe',
  })
  @Post('registro')
  registro(@Body() dto: CrearUsuarioDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '';
    return this.usuariosService.crear({ ...dto, ip_dispositivo: ip });
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

  @ApiOperation({ summary: 'Verificar residente contra el padrón real' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('padron/verificar/:cedula/:manzana/:villa')
  verificarPadron(
    @Param('cedula') cedula: string,
    @Param('manzana') manzana: string,
    @Param('villa') villa: string,
  ) {
    return this.usuariosService.verificarPadron(cedula, manzana, villa);
  }

  @ApiOperation({ summary: 'Listar padrón de residentes reales por manzana' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('padron/manzana/:manzana')
  listarPadronPorManzana(@Param('manzana') manzana: string) {
    return this.usuariosService.listarPadronPorManzana(manzana);
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

  @ApiOperation({ summary: 'Listar todos los usuarios (todos los roles)' })
  @ApiResponse({ status: 200, description: 'Lista de todos los usuarios' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('todos')
  listarTodosUsuarios() {
    return this.usuariosService.listarTodosUsuarios();
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

  @ApiOperation({ summary: 'Cambiar contrasena de usuario' })
  @ApiResponse({ status: 200, description: 'Contrasena actualizada' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador', 'residente', 'guardia')
  @Patch(':id/contrasena')
  cambiarContrasena(
    @Param('id') id: string,
    @Body('contrasena_actual') contrasena_actual: string,
    @Body('contrasena_nueva') contrasena_nueva: string,
  ) {
    return this.usuariosService.cambiarContrasena(
      id,
      contrasena_actual,
      contrasena_nueva,
    );
  }

  @ApiOperation({ summary: 'Subir foto de perfil del usuario' })
  @ApiResponse({ status: 200, description: 'Foto actualizada' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador', 'residente', 'guardia')
  @Patch(':id/foto')
  @UseInterceptors(FileInterceptor('foto'))
  subirFoto(
    @Param('id') id: string,
    @UploadedFile() foto: Express.Multer.File,
  ) {
    return this.usuariosService.subirFotoPerfil(id, foto);
  }

  @ApiOperation({ summary: 'Buscar usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador', 'residente', 'guardia')
  @ApiOperation({ summary: 'Listar turnos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de turnos' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('turnos/lista')
  listarTurnos() {
    return this.usuariosService.listarTurnos();
  }

  @ApiOperation({ summary: 'Verificar datos únicos paso 1' })
  @Post('verificar/paso1')
  verificarPaso1(
    @Body('cedula') cedula: string,
    @Body('correo') correo: string,
    @Body('telefono') telefono: string,
  ) {
    return this.usuariosService.verificarPaso1(cedula, correo, telefono);
  }

  @ApiOperation({ summary: 'Verificar datos únicos paso 2' })
  @Post('verificar/paso2')
  verificarPaso2(
    @Body('usuario') usuario: string,
    @Body('id_externo') idExterno: string,
    @Body('rol') rol: string,
  ) {
    return this.usuariosService.verificarPaso2(usuario, idExterno, rol);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar datos del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador', 'residente', 'guardia')
  @Patch(':id')
  actualizarDatos(
    @Param('id') id: string,
    @Body('correo') correo: string,
    @Body('telefono') telefono: string,
    @Body('manzana') manzana: string,
    @Body('villa') villa: string,
    @Body('fcm_token') fcm_token: string,
  ) {
    if (fcm_token) {
      return this.usuariosService.actualizarFcmToken(id, fcm_token);
    }
    return this.usuariosService.actualizarDatos(
      id,
      correo,
      telefono,
      manzana,
      villa,
    );
  }
}
