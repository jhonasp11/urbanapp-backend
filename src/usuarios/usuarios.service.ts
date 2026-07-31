/// <reference types="multer" />
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { MailService } from '../mail/mail.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';
import { ahoraEcuadorLiteral } from '../common/fecha-ecuador';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private mail: MailService,
  ) {}

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

  private validarNombre(valor: string, campo: string): void {
    const texto = (valor ?? '').trim();
    if (texto.length < 3) {
      throw new BadRequestException(
        `El campo ${campo} debe tener al menos 3 caracteres`,
      );
    }
    // Solo letras (con tildes y ñ) y espacios
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(texto)) {
      throw new BadRequestException(
        `El campo ${campo} solo puede contener letras`,
      );
    }
    // No permitir la misma letra 3 o más veces seguidas (ej. "aaa")
    if (/(.)\1\1/i.test(texto)) {
      throw new BadRequestException(`El campo ${campo} no es válido`);
    }
    // Al menos una vocal
    if (!/[aeiouáéíóúAEIOUÁÉÍÓÚ]/.test(texto)) {
      throw new BadRequestException(`El campo ${campo} no es válido`);
    }
  }

  private validarCedula(cedula: string): void {
    if (!/^\d{10}$/.test(cedula)) {
      throw new BadRequestException(
        'La cedula debe tener exactamente 10 digitos numericos',
      );
    }

    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) {
      throw new BadRequestException('La cedula no es valida');
    }

    const digitoVerificador = parseInt(cedula[9]);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula[i]) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }

    const residuo = suma % 10;
    const digitoCalculado = residuo === 0 ? 0 : 10 - residuo;

    if (digitoCalculado !== digitoVerificador) {
      throw new BadRequestException('La cedula ingresada no es valida');
    }
  }

  //Lógica de creación de usuario
  async crear(dto: CrearUsuarioDto) {
    if (!dto.acepta_terminos || !dto.acepta_privacidad) {
      throw new BadRequestException(
        'Debes aceptar los terminos y condiciones y la politica de privacidad',
      );
    }

    this.validarNombre(dto.nombres, 'nombres');
    this.validarNombre(dto.apellidos, 'apellidos');
    this.validarContrasena(dto.contrasena);
    this.validarCedula(dto.cedula);

    const existenteCedula = await this.prisma.uSUARIOS.findFirst({
      where: { cedula: dto.cedula },
    });
    if (existenteCedula)
      throw new BadRequestException('Ya existe un usuario con esa cédula');

    const existenteCorreo = await this.prisma.uSUARIOS.findFirst({
      where: { correo: dto.correo },
    });
    if (existenteCorreo)
      throw new BadRequestException('Ya existe un usuario con ese correo');

    const existenteTelefono = await this.prisma.uSUARIOS.findFirst({
      where: { telefono: dto.telefono },
    });
    if (existenteTelefono)
      throw new BadRequestException('Ya existe un usuario con ese teléfono');

    const existenteUsuario = await this.prisma.uSUARIOS.findFirst({
      where: { usuario: dto.usuario },
    });
    if (existenteUsuario)
      throw new BadRequestException(
        'Ya existe un usuario con ese nombre de usuario',
      );

    if (dto.rol === 'guardia' && dto.id_guardia) {
      const existenteGuardia = await this.prisma.gUARDIAS.findFirst({
        where: { id_guardia: dto.id_guardia },
      });
      if (existenteGuardia)
        throw new BadRequestException(
          'Ya existe un guardia con ese ID externo',
        );
    }

    if (dto.rol === 'administrador' && dto.id_administrador) {
      const existenteAdmin = await this.prisma.aDMINISTRADORES.findFirst({
        where: { id_administrador: dto.id_administrador },
      });
      if (existenteAdmin)
        throw new BadRequestException(
          'Ya existe un administrador con ese ID externo',
        );
    }

    // Límite de 3 residentes por manzana + villa (cuenta pendientes y aprobados)
    if (dto.rol === 'residente') {
      const residentesEnVivienda = await this.prisma.rESIDENTES.count({
        where: {
          manzana: dto.manzana,
          villa: dto.villa,
          usuario: {
            estado: { in: ['pendiente', 'aprobado'] },
          },
        },
      });
      if (residentesEnVivienda >= 3) {
        throw new BadRequestException(
          'Esta vivienda (Manzana ' +
            dto.manzana +
            ', Villa ' +
            dto.villa +
            ') ya alcanzó el máximo de 3 residentes registrados',
        );
      }
    }

    const contrasena_hash = await bcrypt.hash(dto.contrasena, 10);
    const estado = dto.rol === 'residente' ? 'pendiente' : 'aprobado';

    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.uSUARIOS.create({
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
          creado_por: dto.creado_por ?? null,
          created_at: ahoraEcuadorLiteral(),
        },
      });

      if (dto.rol === 'residente') {
        await tx.rESIDENTES.create({
          data: {
            usuario_id: usuario.id,
            manzana: dto.manzana,
            villa: dto.villa,
            updated_at: ahoraEcuadorLiteral(),
          },
        });
      }

      if (dto.rol === 'administrador') {
        await tx.aDMINISTRADORES.create({
          data: {
            usuario_id: usuario.id,
            id_administrador: dto.id_administrador,
            updated_at: ahoraEcuadorLiteral(),
          },
        });
      }

      if (dto.rol === 'guardia') {
        await tx.gUARDIAS.create({
          data: {
            usuario_id: usuario.id,
            id_guardia: dto.id_guardia,
            turno_id: dto.turno_id,
            updated_at: ahoraEcuadorLiteral(),
          },
        });
      }

      const documentos = await tx.dOCUMENTOS.findMany({
        where: {
          activo: true,
          tipo: { in: ['terminos_condiciones', 'politica_privacidad'] },
        },
      });

      for (const doc of documentos) {
        await tx.aCEPTACION_TERMINOS.create({
          data: {
            usuario_id: usuario.id,
            documento_id: doc.id,
            version_documento: doc.version,
            ip_dispositivo: dto.ip_dispositivo,
            fecha_aceptacion: ahoraEcuadorLiteral(),
          },
        });
      }

      return {
        mensaje: 'Usuario registrado exitosamente',
        id: usuario.id,
        rol: usuario.rol,
        estado: usuario.estado,
      };
    });
    // Correo de bienvenida al guardia (sin contraseña, con datos del admin creador)
    if (dto.rol === 'guardia') {
      try {
        let adminNombre = 'el administrador';
        let adminCorreo = '';
        let adminTelefono = '';
        if (dto.creado_por) {
          const admin = await this.prisma.uSUARIOS.findUnique({
            where: { id: dto.creado_por },
          });
          if (admin) {
            adminNombre = `${admin.nombres} ${admin.apellidos}`;
            adminCorreo = admin.correo;
            adminTelefono = admin.telefono ?? '';
          }
        }
        await this.mail.enviarBienvenidaGuardia(
          dto.correo,
          `${dto.nombres} ${dto.apellidos}`,
          dto.usuario,
          adminNombre,
          adminCorreo,
          adminTelefono,
        );
      } catch (e) {
        console.error('Error enviando correo al guardia:', e);
      }
    }

    // Notificar a los administradores de una nueva solicitud de residente
    if (dto.rol === 'residente') {
      try {
        const admins = await this.prisma.uSUARIOS.findMany({
          where: { rol: 'administrador', estado: 'aprobado' },
          select: { id: true },
        });
        await this.prisma.nOTIFICACIONES.createMany({
          data: admins.map((a) => ({
            usuario_id: a.id,
            tipo: 'sistema',
            titulo: 'Nueva solicitud de residente',
            mensaje: `${dto.nombres} ${dto.apellidos} (Mz ${dto.manzana}, Villa ${dto.villa}) se registró y espera aprobación.`,
            created_at: ahoraEcuadorLiteral(),
          })),
        });
      } catch (e) {
        console.error('Error notificando a administradores:', e);
      }
    }

    return resultado;
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
        guardia: {
          include: {
            turno: true,
          },
        },
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

  async listarTodosUsuarios() {
    return this.prisma.uSUARIOS.findMany({
      include: {
        residente: true,
        guardia: true,
        administrador: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async aprobarRechazarResidente(
    id: string,
    estado: string,
    administrador_id: string,
    motivo?: string,
  ) {
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id },
      include: { residente: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.rol !== 'residente' && usuario.rol !== 'guardia') {
      throw new BadRequestException(
        'Solo se pueden gestionar residentes y guardias',
      );
    }

    const estadosValidos = [
      'aprobado',
      'rechazado',
      'desactivado',
      'pendiente',
    ];
    if (!estadosValidos.includes(estado)) {
      throw new BadRequestException('Estado no válido');
    }

    // Aprobar a alguien fuera del padrón exige justificación del administrador.
    // Solo aplica en la aprobación inicial (viene de 'pendiente'),
    // no en la reactivación de una cuenta desactivada.
    let fueraDePadron = false;
    if (
      estado === 'aprobado' &&
      usuario.estado === 'pendiente' &&
      usuario.residente
    ) {
      const enPadron = await this.prisma.rESIDENTES_REALES.findFirst({
        where: {
          cedula: usuario.cedula,
          manzana: parseInt(usuario.residente.manzana, 10),
          villa: parseInt(usuario.residente.villa, 10),
          activo: true,
        },
      });
      fueraDePadron = !enPadron;
      if (fueraDePadron && (!motivo || motivo.trim() === '')) {
        throw new BadRequestException(
          'Este residente no consta en el padrón. Debes indicar un motivo para aprobarlo.',
        );
      }
    }

    // Si el estado no cambia, no hacer nada (evita registros redundantes y doble-tap)
    if (usuario.estado === estado) {
      return {
        mensaje: `El residente ya se encuentra en estado ${estado}`,
        usuario,
      };
    }

    // El log usa administrador.id; creado_por necesita el usuario_id del admin
    let adminUsuarioId: string | null = null;
    if (estado === 'aprobado' && administrador_id) {
      const admin = await this.prisma.aDMINISTRADORES.findUnique({
        where: { id: administrador_id },
      });
      adminUsuarioId = admin?.usuario_id ?? null;
    }

    const usuarioActualizado = await this.prisma.uSUARIOS.update({
      where: { id },
      data: {
        estado,
        ...(adminUsuarioId && { creado_por: adminUsuarioId }),
      },
    });

    // Asignar titularidad de la villa al aprobar un residente.
    // El primer residente aprobado de una villa se convierte en titular;
    // es el único que podrá subir el pago de la alícuota.
    if (
      estado === 'aprobado' &&
      usuario.rol === 'residente' &&
      usuario.residente
    ) {
      const villaTieneTitular = await this.prisma.rESIDENTES.findFirst({
        where: {
          manzana: usuario.residente.manzana,
          villa: usuario.residente.villa,
          titular: true,
          usuario: { estado: 'aprobado' },
          usuario_id: { not: id },
        },
      });

      // Si la villa aún no tiene titular activo, este residente lo será.
      await this.prisma.rESIDENTES.update({
        where: { usuario_id: id },
        data: { titular: !villaTieneTitular },
      });
    }

    // Reasignar titularidad si se desactiva/rechaza a un residente titular.
    // El siguiente residente aprobado más antiguo de la villa pasa a ser titular.
    if (
      (estado === 'desactivado' || estado === 'rechazado') &&
      usuario.rol === 'residente' &&
      usuario.residente &&
      usuario.residente.titular
    ) {
      // Quitar la titularidad al residente que se desactiva
      await this.prisma.rESIDENTES.update({
        where: { usuario_id: id },
        data: { titular: false },
      });

      // Buscar al siguiente residente aprobado más antiguo de la misma villa
      const siguiente = await this.prisma.rESIDENTES.findFirst({
        where: {
          manzana: usuario.residente.manzana,
          villa: usuario.residente.villa,
          usuario: { estado: 'aprobado' },
          usuario_id: { not: id },
        },
        orderBy: { usuario: { created_at: 'asc' } },
      });

      // Si existe, se convierte en el nuevo titular
      if (siguiente) {
        await this.prisma.rESIDENTES.update({
          where: { id: siguiente.id },
          data: { titular: true },
        });
      }
    }

    const accionLog =
      {
        aprobado: 'aprobar',
        rechazado: 'rechazar',
        desactivado: 'desactivar',
        pendiente: 'reactivar',
      }[estado] ?? 'modificar';

    // Texto legible del cambio según la acción
    const estadosLegibles: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      desactivado: 'Desactivado',
    };
    let detalleLegible =
      `Se cambió el estado de ` +
      `${estadosLegibles[usuario.estado] ?? usuario.estado} a ` +
      `${estadosLegibles[estado] ?? estado}.`;
    if (fueraDePadron && motivo) {
      detalleLegible += ` Aprobado fuera del padrón. Motivo: ${motivo.trim()}`;
    }

    await this.prisma.gESTION_USUARIOS_LOG.create({
      data: {
        administrador_id,
        usuario_afectado_id: id,
        accion: accionLog,
        detalle: detalleLegible,
        created_at: ahoraEcuadorLiteral(),
      },
    });

    // Correo al residente según el resultado
    if (estado === 'aprobado' || estado === 'rechazado') {
      try {
        await this.mail.enviarResultadoSolicitud(
          usuario.correo,
          `${usuario.nombres} ${usuario.apellidos}`,
          estado === 'aprobado',
        );
      } catch (e) {
        console.error('Error enviando correo al residente:', e);
      }
    }

    return {
      mensaje: `Residente ${estado} exitosamente`,
      usuario: usuarioActualizado,
    };
  }

  async cambiarContrasena(
    id: string,
    contrasena_actual: string,
    contrasena_nueva: string,
  ) {
    const usuario = await this.prisma.uSUARIOS.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const valida = await bcrypt.compare(
      contrasena_actual,
      usuario.contrasena_hash,
    );
    if (!valida)
      throw new BadRequestException('La contrasena actual es incorrecta');

    if (contrasena_actual === contrasena_nueva) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    this.validarContrasena(contrasena_nueva);

    const hash = await bcrypt.hash(contrasena_nueva, 10);
    await this.prisma.uSUARIOS.update({
      where: { id },
      data: { contrasena_hash: hash },
    });

    return { mensaje: 'Contrasena actualizada exitosamente' };
  }

  async actualizarDatos(
    id: string,
    correo: string,
    telefono: string,
    manzana?: string,
    villa?: string,
  ) {
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id },
      include: { residente: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Validar correo duplicado (en otro usuario distinto)
    if (correo && correo !== usuario.correo) {
      const existeCorreo = await this.prisma.uSUARIOS.findFirst({
        where: { correo, id: { not: id } },
      });
      if (existeCorreo) {
        throw new BadRequestException(
          'Ese correo ya está en uso por otro usuario',
        );
      }
    }

    // Validar teléfono duplicado (en otro usuario distinto)
    if (telefono && telefono !== usuario.telefono) {
      const existeTelefono = await this.prisma.uSUARIOS.findFirst({
        where: { telefono, id: { not: id } },
      });
      if (existeTelefono) {
        throw new BadRequestException(
          'Ese número de teléfono ya está en uso por otro usuario',
        );
      }
    }

    await this.prisma.uSUARIOS.update({
      where: { id },
      data: {
        ...(correo && { correo }),
        ...(telefono && { telefono }),
      },
    });

    if (usuario.residente && (manzana || villa)) {
      await this.prisma.rESIDENTES.update({
        where: { usuario_id: id },
        data: {
          ...(manzana && { manzana }),
          ...(villa && { villa }),
        },
      });
    }

    return { mensaje: 'Datos actualizados exitosamente' };
  }

  async listarTurnos() {
    return this.prisma.tURNOS.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async verificarPaso1(cedula: string, correo: string, telefono: string) {
    const existenteCedula = await this.prisma.uSUARIOS.findFirst({
      where: { cedula },
    });
    if (existenteCedula)
      throw new BadRequestException('Ya existe un usuario con esa cédula');

    const existenteCorreo = await this.prisma.uSUARIOS.findFirst({
      where: { correo },
    });
    if (existenteCorreo)
      throw new BadRequestException('Ya existe un usuario con ese correo');

    const existenteTelefono = await this.prisma.uSUARIOS.findFirst({
      where: { telefono },
    });
    if (existenteTelefono)
      throw new BadRequestException('Ya existe un usuario con ese teléfono');

    return { disponible: true };
  }

  async verificarPaso2(usuario: string, idExterno: string, rol: string) {
    const existenteUsuario = await this.prisma.uSUARIOS.findFirst({
      where: { usuario },
    });
    if (existenteUsuario)
      throw new BadRequestException(
        'Ya existe un usuario con ese nombre de usuario',
      );

    if (rol === 'guardia' && idExterno) {
      const existenteGuardia = await this.prisma.gUARDIAS.findFirst({
        where: { id_guardia: idExterno },
      });
      if (existenteGuardia)
        throw new BadRequestException(
          'Ya existe un guardia con ese ID externo',
        );
    }

    if (rol === 'administrador' && idExterno) {
      const existenteAdmin = await this.prisma.aDMINISTRADORES.findFirst({
        where: { id_administrador: idExterno },
      });
      if (existenteAdmin)
        throw new BadRequestException(
          'Ya existe un administrador con ese ID externo',
        );
    }

    return { disponible: true };
  }

  async actualizarFcmToken(id: string, fcm_token: string) {
    const usuario = await this.prisma.uSUARIOS.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.uSUARIOS.update({
      where: { id },
      data: { fcm_token },
    });

    return { mensaje: 'Token FCM actualizado' };
  }

  async subirFotoPerfil(id: string, foto: Express.Multer.File) {
    if (!foto) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }

    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id },
      include: { residente: true, administrador: true, guardia: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Subir la imagen a Cloudinary (carpeta separada por tipo)
    const url = await this.cloudinary.subirArchivo(
      foto.buffer,
      'urbanapp/perfiles',
    );

    // Guardar la URL en la tabla correcta según el rol
    if (usuario.rol === 'residente' && usuario.residente) {
      await this.prisma.rESIDENTES.update({
        where: { usuario_id: id },
        data: { foto_url: url, updated_at: ahoraEcuadorLiteral() },
      });
    } else if (usuario.rol === 'administrador' && usuario.administrador) {
      await this.prisma.aDMINISTRADORES.update({
        where: { usuario_id: id },
        data: { foto_url: url, updated_at: ahoraEcuadorLiteral() },
      });
    } else if (usuario.rol === 'guardia' && usuario.guardia) {
      await this.prisma.gUARDIAS.update({
        where: { usuario_id: id },
        data: { foto_url: url, updated_at: ahoraEcuadorLiteral() },
      });
    }

    return { mensaje: 'Foto de perfil actualizada', foto_url: url };
  }

  async eliminarFotoPerfil(id: string) {
    const usuario = await this.prisma.uSUARIOS.findUnique({
      where: { id },
      include: { residente: true, administrador: true, guardia: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Poner foto_url en null según el rol (el archivo permanece en Cloudinary)
    if (usuario.rol === 'residente' && usuario.residente) {
      await this.prisma.rESIDENTES.update({
        where: { usuario_id: id },
        data: { foto_url: null, updated_at: ahoraEcuadorLiteral() },
      });
    } else if (usuario.rol === 'administrador' && usuario.administrador) {
      await this.prisma.aDMINISTRADORES.update({
        where: { usuario_id: id },
        data: { foto_url: null, updated_at: ahoraEcuadorLiteral() },
      });
    } else if (usuario.rol === 'guardia' && usuario.guardia) {
      await this.prisma.gUARDIAS.update({
        where: { usuario_id: id },
        data: { foto_url: null, updated_at: ahoraEcuadorLiteral() },
      });
    }

    return { mensaje: 'Foto de perfil eliminada' };
  }

  // Verifica si una cédula + manzana + villa coinciden con el padrón de residentes reales
  async verificarPadron(cedula: string, manzana: string, villa: string) {
    const enPadron = await this.prisma.rESIDENTES_REALES.findFirst({
      where: {
        cedula,
        manzana: parseInt(manzana, 10),
        villa: parseInt(villa, 10),
        activo: true,
      },
    });
    return { verificado: !!enPadron };
  }

  // Valida el ID de administrador contra el padrón de administradores reales.
  // Devuelve los datos para autocompletar si existe y está activo.
  async validarAdministradorReal(idExt: string) {
    const admin = await this.prisma.aDMINISTRADORES_REALES.findUnique({
      where: { id_administrador_ext: idExt },
    });

    if (!admin || !admin.activo) {
      return {
        valido: false,
        mensaje:
          'El ID de administrador no existe o no está autorizado. Verifica el dato con la administración.',
      };
    }

    // Verificar que este ID no haya sido usado ya en un registro
    const yaRegistrado = await this.prisma.aDMINISTRADORES.findFirst({
      where: { id_administrador: idExt },
    });
    if (yaRegistrado) {
      return {
        valido: false,
        mensaje: 'Este ID de administrador ya tiene una cuenta registrada.',
      };
    }

    return {
      valido: true,
      cedula: admin.cedula,
      nombres: admin.nombres,
      apellidos: admin.apellidos,
    };
  }

  // Lista los residentes reales de una manzana (padrón)
  async listarPadronPorManzana(manzana: string) {
    return this.prisma.rESIDENTES_REALES.findMany({
      where: { manzana: parseInt(manzana, 10) },
      orderBy: [{ villa: 'asc' }, { cedula: 'asc' }],
    });
  }
}
