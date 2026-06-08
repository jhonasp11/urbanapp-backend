import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../../firebase-service-account.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
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
      console.error('Error enviando notificación FCM:', error);
      return { enviado: false, error };
    }
  }
}
