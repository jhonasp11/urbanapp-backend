import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../usuarios/dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Iniciar sesion y obtener token JWT' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso, retorna access_token',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Solicitar código de recuperación de contraseña' })
  @ApiResponse({
    status: 201,
    description: 'Código enviado si los datos son correctos',
  })
  @Post('recuperar')
  recuperar(@Body() body: { cedula: string; correo: string }) {
    return this.authService.recuperar(body?.cedula ?? '', body?.correo ?? '');
  }

  @ApiOperation({ summary: 'Verificar código de recuperación' })
  @ApiResponse({ status: 201, description: 'Código válido' })
  @Post('verificar-codigo')
  verificarCodigo(@Body() body: { correo: string; codigo: string }) {
    return this.authService.verificarCodigo(body.correo, body.codigo);
  }

  @ApiOperation({ summary: 'Restablecer contraseña con código' })
  @ApiResponse({ status: 201, description: 'Contraseña actualizada' })
  @Post('restablecer')
  restablecer(
    @Body() body: { correo: string; codigo: string; nueva_contrasena: string },
  ) {
    return this.authService.restablecer(
      body.correo,
      body.codigo,
      body.nueva_contrasena,
    );
  }
}
