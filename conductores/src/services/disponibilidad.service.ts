import { api } from './api';

export interface EstadoDisponibilidad {
  disponible: boolean;
  ultima_latitud?: number | null;
  ultima_longitud?: number | null;
  ultima_actualizacion?: string | null;
}

export async function obtenerDisponibilidad(): Promise<EstadoDisponibilidad> {
  const respuesta = await api.get('/conductores/disponibilidad');

  if (!respuesta.data.success) {
    throw new Error('No se pudo consultar la disponibilidad.');
  }

  return respuesta.data.estado;
}

export async function cambiarDisponibilidad(
  disponible: boolean
): Promise<EstadoDisponibilidad> {
  const respuesta = await api.patch('/conductores/disponibilidad', {
    disponible,
  });

  if (!respuesta.data.success) {
    throw new Error('No se pudo actualizar la disponibilidad.');
  }

  return respuesta.data.estado;
}
