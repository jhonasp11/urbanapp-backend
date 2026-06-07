import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from '../usuarios/dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.buscarPorUsuario(dto.usuario);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (usuario.estado === 'pendiente') {
      throw new UnauthorizedException('Tu cuenta está pendiente de aprobación');
    }

    if (usuario.estado === 'rechazado') {
      throw new UnauthorizedException('Tu cuenta ha sido rechazada');
    }

    const contrasenaValida = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasena_hash,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol,
    };

    return {
      access_token: this.jwtService.sign(payload),
      rol: usuario.rol,
      estado: usuario.estado,
      nombres: usuario.nombres,
    };
  }
}
