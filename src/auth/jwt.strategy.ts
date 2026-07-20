import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  usuario: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'urbanapp_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar en cada petición que el usuario siga activo.
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id: payload.sub },
      select: { id: true, estado: true },
    });

    if (!usuario || usuario.estado !== 'aprobado') {
      throw new UnauthorizedException('Cuenta no activa');
    }

    return {
      id: payload.sub,
      usuario: payload.usuario,
      rol: payload.rol,
    };
  }
}
