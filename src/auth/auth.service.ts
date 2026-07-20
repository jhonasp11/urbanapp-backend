import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from '../usuarios/dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mail: MailService,
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
      throw new UnauthorizedException('Tu cuenta ha sido rechazada.');
    }

    if (usuario.estado === 'desactivado') {
      throw new UnauthorizedException(
        'Tu cuenta ha sido desactivada. Contacta al administrador.',
      );
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

  // 1. Solicitar recuperación: valida cédula + correo, genera código y lo envía
  async recuperar(cedula: string, correo: string) {
    // Buscar usuario donde coincidan AMBOS datos
    const usuario = await this.prisma.uSUARIOS.findFirst({
      where: { cedula, correo },
    });

    // Respuesta genérica por seguridad (no revelar qué datos existen)
    const respuestaGenerica = {
      mensaje:
        'Si los datos son correctos, recibirás un código de recuperación en tu correo.',
    };

    if (!usuario) return respuestaGenerica;

    // No permitir recuperar contraseña si la cuenta no está activa
    if (usuario.estado === 'pendiente') {
      throw new BadRequestException(
        'Tu cuenta está pendiente de aprobación. No puedes recuperar la contraseña hasta ser aprobado.',
      );
    }
    if (usuario.estado === 'rechazado') {
      throw new BadRequestException(
        'Tu cuenta ha sido rechazada. No puedes recuperar la contraseña.',
      );
    }
    if (usuario.estado === 'desactivado') {
      throw new BadRequestException(
        'Tu cuenta está desactivada. Contacta al administrador.',
      );
    }

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = ahoraEcuadorLiteral();
    expira.setMinutes(expira.getMinutes() + 5);
    // Invalidar códigos anteriores no usados de este usuario
    await this.prisma.cODIGOS_RECUPERACION.updateMany({
      where: { usuario_id: usuario.id, usado: false },
      data: { usado: true },
    });

    // Guardar el nuevo código
    await this.prisma.cODIGOS_RECUPERACION.create({
      data: {
        usuario_id: usuario.id,
        codigo,
        expira_en: expira,
        created_at: ahoraEcuadorLiteral(),
      },
    });

    // Enviar el correo
    try {
      await this.mail.enviarCodigoRecuperacion(correo, usuario.nombres, codigo);
    } catch (e) {
      console.error('Error enviando correo de recuperación:', e);
      throw new BadRequestException(
        'No se pudo enviar el correo. Intenta más tarde.',
      );
    }

    return respuestaGenerica;
  }

  // 2. Verificar que el código sea válido
  async verificarCodigo(correo: string, codigo: string) {
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { correo },
    });
    if (!usuario) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const registro = await this.prisma.cODIGOS_RECUPERACION.findFirst({
      where: {
        usuario_id: usuario.id,
        codigo,
        usado: false,
        expira_en: { gt: ahoraEcuadorLiteral() },
      },
    });

    if (!registro) {
      throw new BadRequestException('Código inválido o expirado');
    }

    return { valido: true, mensaje: 'Código verificado' };
  }

  // 3. Restablecer la contraseña
  async restablecer(correo: string, codigo: string, nuevaContrasena: string) {
    // Validar formato de la nueva contraseña (igual que en el registro)
    const regex = /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!regex.test(nuevaContrasena)) {
      throw new BadRequestException(
        'La contraseña debe tener mínimo 8 caracteres, un número y un carácter especial',
      );
    }

    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { correo },
    });
    if (!usuario) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const registro = await this.prisma.cODIGOS_RECUPERACION.findFirst({
      where: {
        usuario_id: usuario.id,
        codigo,
        usado: false,
        expira_en: { gt: ahoraEcuadorLiteral() },
      },
    });

    if (!registro) {
      throw new BadRequestException('Código inválido o expirado');
    }

    // La nueva contraseña no puede ser igual a la actual
    const esIgual = await bcrypt.compare(
      nuevaContrasena,
      usuario.contrasena_hash,
    );
    if (esIgual) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    // Actualizar la contraseña
    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);
    await this.prisma.uSUARIOS.update({
      where: { id: usuario.id },
      data: { contrasena_hash: nuevoHash },
    });

    // Marcar el código como usado
    await this.prisma.cODIGOS_RECUPERACION.update({
      where: { id: registro.id },
      data: { usado: true },
    });

    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}
