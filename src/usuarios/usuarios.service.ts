import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private validarContrasena(contrasena: string): void {
    if (contrasena.length < 8) {
      throw new BadRequestException(
        'La contrasena debe tener minimo 8 caracteres',
      );
    }
    if (!/\d/.test(contrasena)) {
      throw new BadRequestException(
        'La contrasena debe contener al menos un numero',
      );
    }
    if (!/[!@#$%^&*()_+\-={};"\\|,.<>/?]/.test(contrasena)) {
      throw new BadRequestException(
        'La contrasena debe contener al menos un caracter especial',
      );
    }
  }

  async crear(dto: CrearUsuarioDto) {
    if (!dto.acepta_terminos || !dto.acepta_privacidad) {
      throw new BadRequestException(
        'Debes aceptar los terminos y condiciones y la politica de privacidad',
      );
    }

    this.validarContrasena(dto.contrasena);

    const existente = await this.prisma.uSUARIOS.findFirst({
      where: {
        OR: [
          { cedula: dto.cedula },
          { correo: dto.correo },
          { usuario: dto.usuario },
        ],
      },
    });

    if (existente) {
      throw new BadRequestException('Ya existe un usuario con esos datos');
    }

    const contrasena_hash = await bcrypt.hash(dto.contrasena, 10);
    const estado = dto.rol === 'residente' ? 'pendiente' : 'aprobado';

    const usuario = await this.prisma.uSUARIOS.create({
      data: {
        cedula: dto.cedula,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        correo: dto.correo,
        telefono: dto.telefono,
        usuario: dto.usuario,
        contrasena_hash,
        rol: dto.rol,
        estado,
      },
    });

    if (dto.rol === 'residente') {
      await this.prisma.rESIDENTES.create({
        data: {
          usuario_id: usuario.id,
          manzana: dto.manzana,
          villa: dto.villa,
        },
      });
    }

    if (dto.rol === 'administrador') {
      await this.prisma.aDMINISTRADORES.create({
        data: {
          usuario_id: usuario.id,
          id_administrador: dto.id_administrador,
        },
      });
    }

    if (dto.rol === 'guardia') {
      await this.prisma.gUARDIAS.create({
        data: {
          usuario_id: usuario.id,
          id_guardia: dto.id_guardia,
          turno_id: dto.turno_id,
        },
      });
    }

    const documentos = await this.prisma.dOCUMENTOS.findMany({
      where: {
        activo: true,
        tipo: { in: ['terminos_condiciones', 'politica_privacidad'] },
      },
    });

    for (const doc of documentos) {
      await this.prisma.aCEPTACION_TERMINOS.create({
        data: {
          usuario_id: usuario.id,
          documento_id: doc.id,
          version_documento: doc.version,
          ip_dispositivo: dto.ip_dispositivo,
        },
      });
    }

    return {
      mensaje: 'Usuario registrado exitosamente',
      id: usuario.id,
      rol: usuario.rol,
      estado: usuario.estado,
    };
  }

  async buscarPorUsuario(usuario: string) {
    return this.prisma.uSUARIOS.findUnique({
      where: { usuario },
      include: {
        residente: true,
        administrador: true,
        guardia: true,
      },
    });
  }

  async buscarPorId(id: string) {
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id },
      include: {
        residente: true,
        administrador: true,
        guardia: true,
      },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async listarResidentesPendientes() {
    return this.prisma.uSUARIOS.findMany({
      where: { rol: 'residente', estado: 'pendiente' },
      include: { residente: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async listarTodosResidentes() {
    return this.prisma.uSUARIOS.findMany({
      where: { rol: 'residente' },
      include: { residente: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async aprobarRechazarResidente(
    id: string,
    estado: string,
    administrador_id: string,
  ) {
    const usuario = await this.prisma.uSUARIOS.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.rol !== 'residente') {
      throw new BadRequestException('Solo se pueden aprobar residentes');
    }

    const usuarioActualizado = await this.prisma.uSUARIOS.update({
      where: { id },
      data: { estado },
    });

    await this.prisma.gESTION_USUARIOS_LOG.create({
      data: {
        administrador_id,
        usuario_afectado_id: id,
        accion: estado === 'aprobado' ? 'aprobar' : 'rechazar',
        detalle: JSON.stringify({
          campo: 'estado',
          anterior: usuario.estado,
          nuevo: estado,
        }),
      },
    });

    return {
      mensaje: `Residente ${estado === 'aprobado' ? 'aprobado' : 'rechazado'} exitosamente`,
      usuario: usuarioActualizado,
    };
  }
}
