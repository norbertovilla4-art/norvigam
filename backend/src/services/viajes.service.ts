 
import { api } from './api';

export interface SolicitudViaje {
  id: string;
  pasajero_id: string;
  origen_latitud: number;
  origen_longitud: number;
  destino_latitud: number;
  destino_longitud: number;
  tipo_vehiculo: 'Moto' | 'Carro' | 'Taxi';
  distancia_km: number | string | null;
  duracion_minutos: number | null;
  tarifa: number | string;
  fecha_creacion: string;
  fecha_actualizacion?: string;
  estado?: string;
}

interface RespuestaSolicitudes {
  success: boolean;
  solicitudes: SolicitudViaje[];
}

interface RespuestaAceptar {
  success: boolean;
  message?: string;
  viaje?: SolicitudViaje;
}

interface RespuestaEstado {
  success: boolean;
  message?: string;
  viaje?: SolicitudViaje;
}

export interface ResumenGanancias {
  total_viajes: number;
  ingresos_brutos: number | string;
  comision: number | string;
  ganancias_netas: number | string;
}

export interface ResumenPeriodo {
  viajes_hoy: number;
  ingresos_hoy: number | string;
  comision_hoy: number | string;
  ganancias_hoy: number | string;
  viajes_semana: number;
  ingresos_semana: number | string;
  comision_semana: number | string;
  ganancias_semana: number | string;
  viajes_mes: number;
  ingresos_mes: number | string;
  comision_mes: number | string;
  ganancias_mes: number | string;
}

export interface ViajeCompletado extends SolicitudViaje {
  fecha_actualizacion: string;
}

export interface RespuestaHistorial {
  success: boolean;
  resumen: ResumenGanancias;
  periodos: ResumenPeriodo;
  viajes: ViajeCompletado[];
}

export async function obtenerSolicitudesPendientes(): Promise<SolicitudViaje[]> {
  const respuesta = await api.get<RespuestaSolicitudes>('/viajes/pendientes');
  return respuesta.data.solicitudes || [];
}

export async function aceptarViaje(viajeId: string): Promise<RespuestaAceptar> {
  const respuesta = await api.patch<RespuestaAceptar>(
    `/viajes/${viajeId}/aceptar`
  );
  return respuesta.data;
}

export async function cambiarEstadoViaje(
  viajeId: string,
  estado: 'en_camino' | 'en_curso' | 'completado'
): Promise<RespuestaEstado> {
  const respuesta = await api.patch<RespuestaEstado>(
    `/viajes/${viajeId}/estado`,
    { estado }
  );
  return respuesta.data;
}

export async function obtenerHistorialGanancias(): Promise<RespuestaHistorial> {
  const respuesta = await api.get<RespuestaHistorial>(
    '/viajes/historial-ganancias'
  );
  return respuesta.data;
}
