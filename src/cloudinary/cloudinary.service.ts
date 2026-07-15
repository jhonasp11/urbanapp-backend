import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Sube un archivo (buffer) a Cloudinary y devuelve la URL segura
  subirArchivo(
    buffer: Buffer,
    carpeta: string,
    esPdf = false,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: carpeta,
          resource_type: esPdf ? 'raw' : 'image',
          // Para PDFs: conservar la extensión en la URL
          format: esPdf ? 'pdf' : undefined,
          use_filename: esPdf ? true : false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result) return reject(new Error('Sin respuesta de Cloudinary'));
          resolve(result.secure_url);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }
}
