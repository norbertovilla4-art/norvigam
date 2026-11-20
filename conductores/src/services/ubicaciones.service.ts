
import { api } from './api';

export interface UbicacionGPS {
  latitud: number;
  longitud: number;
  precision_metros?: number;
}

export async function actualizarUbicacion(
  ubicacion: UbicacionGPS
) {
  const respuesta = await api.post(
    '/ubicaciones/actualizar',
    ubicacion
  );

  return respuesta.data;
}
