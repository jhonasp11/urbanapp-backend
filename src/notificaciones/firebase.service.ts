import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      // Leer el archivo como objeto mutable
      const serviceAccount = JSON.parse(
        readFileSync(
          join(process.cwd(), 'firebase-service-account.json'),
          'utf8',
        ),
      );

      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
      });
    }
  }

  async enviarNotificacion(token: string, titulo: string, mensaje: string) {
    try {
      await admin.messaging().send({
        token,
        notification: { title: titulo, body: mensaje },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      return { enviado: true };
    } catch (error: unknown) {
      const codigo = (error as { errorInfo?: { code?: string } })?.errorInfo
        ?.code;
      const tokenInvalido =
        codigo === 'messaging/registration-token-not-registered' ||
        codigo === 'messaging/invalid-registration-token' ||
        codigo === 'messaging/invalid-argument';

      if (tokenInvalido) {
        // Token de un dispositivo desinstalado/reinstalado: no es un error real
        return { enviado: false, tokenInvalido: true };
      }

      console.error('Error enviando notificación FCM:', error);
      return { enviado: false, tokenInvalido: false, error };
    }
  }
}
