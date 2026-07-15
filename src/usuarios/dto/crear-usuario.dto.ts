export class CrearUsuarioDto {
  cedula: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  usuario: string;
  contrasena: string;
  rol: string;
  id_administrador?: string;
  id_guardia?: string;
  manzana?: string;
  villa?: string;
  turno_id?: string;
  creado_por?: string;
  acepta_terminos: boolean;
  acepta_privacidad: boolean;
  ip_dispositivo?: string;
}
