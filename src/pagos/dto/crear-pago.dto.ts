export class CrearPagoDto {
  residente_id: string;
  alicuota_id?: string;
  reserva_id?: string;
  tipo_pago: string;
  mes_pago: number;
  anio_pago: number;
  metodo_pago: string;
  banco: string;
  comprobante_url: string;
  formato_archivo: string;
  observacion_residente?: string;
}
