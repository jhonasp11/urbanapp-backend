export class CrearAreaDto {
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  capacidad_max: number;
  tarifa_reserva: number;
  duracion_min_horas?: number;
  duracion_max_horas?: number;
  anticipacion_min_dias?: number;
  cancelacion_max_horas?: number;
  hora_inicio: string;
  hora_fin: string;
  dias_disponibles?: string;
}
