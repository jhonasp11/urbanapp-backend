import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Roles('administrador')
  @Post()
  crear(
    @Body('usuario_id') usuario_id: string,
    @Body('tipo') tipo: string,
    @Body('titulo') titulo: string,
    @Body('mensaje') mensaje: string,
    @Body('fcm_token') fcm_token?: string,
  ) {
    return this.notificacionesService.crear(usuario_id, tipo, titulo, mensaje, fcm_token);
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get('usuario/:usuario_id')
  listarPorUsuario(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.listarPorUsuario(usuario_id);
  }

  @Roles('residente', 'administrador', 'guardia')
  @Get('usuario/:usuario_id/no-leidas')
  contarNoLeidas(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.contarNoLeidas(usuario_id);
  }

  @Roles('residente', 'administrador', 'guardia')
  @Patch(':id/leer')
  marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(id);
  }

  @Roles('residente', 'administrador', 'guardia')
  @Patch('usuario/:usuario_id/leer-todas')
  marcarTodasLeidas(@Param('usuario_id') usuario_id: string) {
    return this.notificacionesService.marcarTodasLeidas(usuario_id);
  }
}
