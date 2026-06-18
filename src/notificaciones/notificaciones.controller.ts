import {
  Controller,
  Get,
  Patch,
  Post,
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
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Notificaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @ApiOperation({ summary: 'Crear y enviar notificacion a un usuario' })
  @ApiResponse({ status: 201, description: 'Notificacion creada y enviada' })
  @Roles('administrador')
  @Post()
  crear(
    @Body('usuario_id') usuario_id: string,
    @Body('tipo') tipo: string,
    @Body('titulo') titulo: string,
    @Body('mensaje') mensaje: string,
    @Body('fcm_token') fcm_token?: string,
  ) {
    return this.notificacionesService.crear(
      usuario_id,
      tipo,
      titulo,
      mensaje,
      fcm_token,
    );
  }

  @ApiOperation({ summary: 'Listar notificaciones de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones' })
  @Roles('residente', 'administrador', 'guardia')
  @Get('usuario/:usuario_id')
  listarPorUsuario(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.listarPorUsuario(usuario_id);
  }

  @ApiOperation({ summary: 'Contar notificaciones no leidas de un usuario' })
  @ApiResponse({ status: 200, description: 'Cantidad de no leidas' })
  @Roles('residente', 'administrador', 'guardia')
  @Get('usuario/:usuario_id/no-leidas')
  contarNoLeidas(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.contarNoLeidas(usuario_id);
  }

  @ApiOperation({ summary: 'Marcar notificacion como leida' })
  @ApiResponse({ status: 200, description: 'Notificacion marcada como leida' })
  @Roles('residente', 'administrador', 'guardia')
  @Patch(':id/leer')
  marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(id);
  }

  @ApiOperation({ summary: 'Marcar todas las notificaciones como leidas' })
  @ApiResponse({ status: 200, description: 'Todas marcadas como leidas' })
  @Roles('residente', 'administrador', 'guardia')
  @Patch('usuario/:usuario_id/leer-todas')
  marcarTodasLeidas(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.marcarTodasLeidas(usuario_id);
  }
}
