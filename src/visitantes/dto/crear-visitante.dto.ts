export class CrearVisitanteDto {
  residente_id: string;
  nombre_visitante: string;
  cedula_visitante: string;
  fecha_visita: string;
  hora_estimada_ingreso: string;
  guardado?: boolean;
}
