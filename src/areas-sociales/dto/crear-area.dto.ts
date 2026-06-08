export class CrearAreaDto {
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  capacidad_max: number;
  tarifa_reserva: number;
  anticipacion_min_dias?: number;
  cancelacion_max_horas?: number;
}
