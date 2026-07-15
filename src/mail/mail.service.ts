import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);
  private remitente =
    process.env.MAIL_FROM ?? 'UrbanApp <onboarding@resend.dev>';

  private async enviar(destino: string, asunto: string, html: string) {
    const { error } = await this.resend.emails.send({
      from: this.remitente,
      to: destino,
      subject: asunto,
      html,
    });
    if (error) {
      throw new Error(`Error enviando correo: ${JSON.stringify(error)}`);
    }
  }

  async enviarCodigoRecuperacion(
    destino: string,
    nombre: string,
    codigo: string,
  ) {
    await this.enviar(
      destino,
      'Código de recuperación de contraseña',
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #185FA5;">Recuperación de contraseña</h2>
          <p>Hola ${nombre},</p>
          <p>Tu código para restablecer la contraseña es:</p>
          <div style="background:#f0f4f8; padding:16px; text-align:center; border-radius:8px; margin:16px 0;">
            <span style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#185FA5;">${codigo}</span>
          </div>
          <p>Este código expira en <strong>5 minutos</strong>.</p>
          <p style="color:#888; font-size:12px;">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    );
  }

  async enviarResultadoSolicitud(
    destino: string,
    nombre: string,
    aprobado: boolean,
    motivo?: string,
  ) {
    await this.enviar(
      destino,
      aprobado
        ? 'Tu cuenta ha sido aprobada'
        : 'Tu solicitud ha sido rechazada',
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #185FA5;">UrbanApp</h2>
          <p>Hola ${nombre},</p>
          ${
            aprobado
              ? `<p>Tu cuenta de residente ha sido <strong style="color:#2E9E5B;">aprobada</strong>. Ya puedes iniciar sesión en la aplicación con tus credenciales.</p>`
              : `<p>Tu solicitud de registro ha sido <strong style="color:#D64545;">rechazada</strong>.</p>
                 ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
                 <p>Si crees que es un error, contacta al administrador de tu urbanización.</p>`
          }
          <p style="color:#888; font-size:12px;">Este es un correo automático, por favor no respondas.</p>
        </div>
      `,
    );
  }

  async enviarBienvenidaGuardia(
    destino: string,
    nombre: string,
    usuario: string,
    adminNombre: string,
    adminCorreo: string,
    adminTelefono: string,
  ) {
    await this.enviar(
      destino,
      'Tu cuenta de guardia ha sido creada',
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #185FA5;">UrbanApp</h2>
          <p>Hola ${nombre},</p>
          <p>El administrador ha creado tu cuenta de guardia en UrbanApp.</p>
          <div style="background:#f0f4f8; padding:16px; border-radius:8px; margin:16px 0;">
            <p style="margin:0;"><strong>Usuario:</strong> ${usuario}</p>
          </div>
          <p>Por seguridad, tu contraseña no se envía por este medio. Contacta al administrador que creó tu cuenta para obtener tu contraseña de acceso:</p>
          <div style="background:#f0f4f8; padding:16px; border-radius:8px; margin:16px 0;">
            <p style="margin:0 0 6px 0;"><strong>Administrador:</strong> ${adminNombre}</p>
            <p style="margin:0 0 6px 0;"><strong>Correo:</strong> ${adminCorreo}</p>
            <p style="margin:0;"><strong>Teléfono:</strong> ${adminTelefono}</p>
          </div>
          <p style="color:#888; font-size:12px;">Este es un correo automático, por favor no respondas.</p>
        </div>
      `,
    );
  }
}
